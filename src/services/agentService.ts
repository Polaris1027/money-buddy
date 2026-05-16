/**
 * Agent 服务：双阶段 LLM 工作流
 *
 * Stage 1（意图识别 / Planner）：
 *   LLM 分析用户消息，输出结构化 JSON：要执行什么动作 + 参数 + 推理过程
 *
 * Stage 2（回复生成 / Speaker）：
 *   代码执行动作后，LLM 用学姐口吻把结果讲给用户
 *
 * 优点：
 *   - 用户语言任意自然（不靠关键词）
 *   - 数据操作仍然由代码执行，安全可控
 *   - 学姐回复 100% LLM 生成，自然度极高
 *   - 阶段失败可降级（JSON 解析失败 → 规则引擎；Stage2 失败 → 模板）
 */

import { callLLM, isLLMAvailable } from './llmService';
import { extractAmount } from './nluService';
import type {
  ChatMessage,
  Transaction,
  SavingGoal,
  UserProfile,
  Category,
} from '@/types';
import { CATEGORY_LABEL } from '@/types';
import dayjs from 'dayjs';

/* =====================================================================
 * 类型定义
 * ===================================================================== */

export type AgentAction =
  | 'add_transaction'
  | 'modify_transaction'
  | 'undo_transaction'
  | 'undo_last'
  | 'query_transaction'
  | 'add_income'
  | 'query_income'
  | 'create_goal'
  | 'continue_goal'
  | 'confirm_goal'
  | 'cancel_goal'
  | 'checkin'
  | 'query_goal'
  | 'update_budget'
  | 'update_profile'
  | 'knowledge_qa'
  | 'risk_warning'
  | 'greeting'
  | 'emotion'
  | 'onboarding_answer'
  | 'chitchat';

export interface AgentPlan {
  action: AgentAction;
  /** 0-1，LLM 自评信心 */
  confidence: number;
  /** 提取出的实体 */
  entities: {
    amount?: number;
    category?: Category;
    note?: string;
    /** 收入来源 */
    incomeSource?:
      | 'allowance'
      | 'parttime'
      | 'scholarship'
      | 'redpacket'
      | 'investment'
      | 'refund'
      | 'other';
    /** 储蓄目标名 */
    goalName?: string;
    /** 储蓄目标金额 */
    targetAmount?: number;
    /** 截止日期 YYYY-MM-DD */
    deadline?: string;
    /** 查询周期 */
    period?: 'day' | 'week' | 'month' | 'year';
    /** 风险类型 */
    riskType?: string;
    /** 风险等级 */
    riskLevel?: 'high' | 'mid';
    /** onboarding 答案 */
    onboardingValue?: string;
    /** onboarding 步骤 */
    onboardingStep?: 'grade' | 'budget' | 'concern';
    /** 用户情绪 */
    emotion?: string;
    /** 修改预算的新值 */
    newBudget?: number;
    /** 修改 profile 的字段 */
    profileField?: 'nickname' | 'grade' | 'monthlyBudget';
    profileValue?: string | number;
  };
  /** LLM 的推理（用于调试与回复生成） */
  reasoning: string;
}

export interface AgentContext {
  user: UserProfile;
  transactions: Transaction[];
  goals: SavingGoal[];
  history: ChatMessage[];
  pendingGoal?: { name?: string; amount?: number; deadline?: string } | null;
}

/* =====================================================================
 * Stage 1: Planner Prompt
 * ===================================================================== */

const PLANNER_SYSTEM = `你是"攒钱搭子"AI 智能体内部的【意图理解器】。

你的职责：深度理解用户消息的语义，判断用户真正想做什么，输出一个 JSON 对象。
**严格只输出 JSON，不要任何解释、代码块或其他文字。**

【核心理解原则——比任何动作定义都重要】
1. 先理解用户"想达到什么目的"，再映射到 action——不要逐字匹配关键词
2. **"理财/投资/存钱/储蓄/定投/买基金/做投资"是把钱拿去增值或存起来的意图，不是消费支出**——绝不能误判为 add_transaction
3. **"工资/兼职/奖学金/生活费/红包/稿费/分红/利息/退款/报销"等是收入来源，配合"到账/收到/发了/进账/记入收入/计入收入"等动词都是 add_income——绝不能误判为 add_transaction**
   - 反例提示：用户说"工资5000到账"、"收到生活费2000"、"把5000记入收入"，这都是 add_income，不是 add_transaction
4. 用户否定上一轮 AI 的操作时，要分清三种情况：
   - 想改具体数值/分类（记账本身没错，只是写错了）→ modify_transaction
   - 想说上一笔根本不该被记成消费（记账行为本身就是误解，比如该记成收入却记成了消费）→ undo_last
   - 主动要求撤销/删除某条记录 → undo_transaction
5. 结合【最近对话】和【最近记账】理解上下文：用户可能在纠正上一轮 AI 的错误判断，而不是发起新需求
6. 不确定时，宁可选 chitchat，也不要随便选 add_transaction

【可用动作及其语义定义】

—— 消费记账类 ——
"add_transaction"
  含义：用户花了一笔钱想记下来。**只有真实的消费/购买/支付行为**才属于这里。
  语义边界：必须是"钱已经花掉了"。"想拿2000去理财/存起来/做投资"都不是消费；"工资到账5000"也不是消费而是收入。

"modify_transaction"
  含义：最近一笔记账的内容写错了，要修改金额/分类/备注。记账行为本身是对的。
  典型："不对，是2500"、"改成50"、"是奶茶不是咖啡"、"备注写错了"

"undo_last"
  含义：上一笔记账根本【不该被记】——AI 上一轮误把用户的话当成了消费。
  典型："不是，这2000是要拿去理财的"、"我说的不是花钱"、"这笔不该记成消费"、"我是说工资到账，不是花钱"
  关键判断：当【最近记账】中确实存在金额匹配的一笔，且用户当前消息在【否定该笔的消费属性】时（比如指出那是收入/理财），选这个。

"undo_transaction"
  含义：用户主动要求撤销/删除最近一笔。
  典型："撤销刚才"、"删掉那条"、"取消上一笔"

"query_transaction"
  含义：用户想看自己的消费情况。
  典型："这周花了多少"、"本月账单"、"今年花了多少"（period 可为 day/week/month/year）

—— 收入记账类（新） ——
"add_income"
  含义：用户收到了一笔钱想记下来。所有"钱进来"的场景都属于这里。
  典型："工资5000到账"、"收到生活费2000"、"兼职300"、"发了奖学金1500"、"红包200"、"把5000记入收入"、"我需要你将收入5000计入收入账上"
  实体提取：
    - amount：金额
    - incomeSource：收入来源，必须从以下 7 个值中选一个：
      • allowance（生活费/工资/月薪/零花钱）
      • parttime（兼职/实习/家教/外快/稿费/提成/佣金）
      • scholarship（奖学金/助学金/补助/补贴/奖金）
      • redpacket（红包/压岁钱/礼金）
      • investment（理财收益/分红/利息/基金收益）
      • refund（退款/报销/返现/返利）
      • other（其他）
    - note：来源的简短描述（如"5月工资"、"家教兼职"）

"query_income"
  含义：用户想看自己的收入情况。
  典型："本月收入多少"、"这周赚了多少"、"今年收入"

—— 储蓄/理财目标类 ——
"create_goal"
  含义：用户想把一笔钱存起来或拿去理财——做资产增值/储蓄，而非花掉。
  语义边界："拿钱去做增值/储蓄/投资/理财"都属于这里，不论用户用的是"攒/存/理财/投资"哪个词。
  典型："我想攒3000去旅游"、"拿2000用于理财"、"想存5000买基金"、"打算投2000"

"continue_goal"：用户在【正在创建目标】的多轮中补充金额或日期（pendingGoal 不为空时）

"confirm_goal"：用户确认创建目标（pendingGoal 已齐全时的"好/确定/可以"）

"cancel_goal"：用户取消创建（pendingGoal 存在时的"算了/不要了"）

"checkin"
  含义：向已有的储蓄目标打卡存钱。
  典型："今天存50"、"打卡30块"

"query_goal"
  含义：查看储蓄目标进度。
  典型："我的目标"、"攒了多少了"

—— 设置类 ——
"update_budget"
  含义：用户想修改月预算。
  典型："把预算改成3000"、"月预算调到5000"、"我每月可支配是2500"

"update_profile"
  含义：用户想修改昵称、年级等个人信息。

—— 知识/安全 ——
"knowledge_qa"
  含义：用户在询问理财相关概念/知识。
  典型："什么是基金"、"复利怎么算"、"定投是什么意思"

"risk_warning"
  含义：用户提到高风险/可疑话题（校园贷、稳赚不赔、跟单大V、炒币、杠杆、刷单返利等）。

—— 社交 ——
"greeting"：打招呼

"emotion"：表达焦虑、月光、难过、压力大等情绪

"onboarding_answer"：用户在 onboarding 流程中回答（仅当 onboarded=false 时）

"chitchat"：闲聊或意图不明确时的兜底

【实体提取】
- amount：金额数字（中文也要转：两千五=2500，一万二=12000，三百五=350）
- category：必须从以下 17 个值中选——food / shopping / transport / vegetable / fruit / snack / sport / entertainment / communication / housing / travel / study / pet / gift / clothing / medical / other
  食堂/外卖/奶茶/咖啡=food；淘宝/快递/化妆品=shopping；打车/地铁/加油=transport；
  青菜/番茄=vegetable；苹果/葡萄=fruit；薯片/糖果/面包/甜品=snack；
  健身/球类=sport；电影/游戏/会员=entertainment；话费/流量=communication；
  房租/水电=housing；机票/酒店=travel；书/课程=study；
  猫粮/狗粮=pet；生日礼物/红包=gift；衣服/鞋子=clothing；医院/药品=medical
- note：消费内容或目标内容的简短描述
- targetAmount：储蓄目标金额（同 amount 规则）
- goalName：储蓄目标名称（如"旅游基金"、"理财"）
- deadline：YYYY-MM-DD 格式（"3个月后"/"暑假"/"7月15号"都要转成日期，今天是 \${TODAY}）
- period："day" / "week" / "month" / "year"
- newBudget：新月预算金额（仅 update_budget 时填）
- incomeSource：收入来源（仅 add_income 时填，必须是 allowance/parttime/scholarship/redpacket/investment/refund/other 之一）
- profileField/profileValue：仅 update_profile 时填
- riskType / riskLevel：仅 risk_warning 时填
- emotion：仅 emotion 时填

【多轮对话提示】
- 如果【上下文快照】中 pendingGoal 不为空，说明用户正在创建目标的过程中：
  此时金额→continue_goal、日期→continue_goal、确认词→confirm_goal、取消词→cancel_goal
- 如果【上下文快照】中 onboarded=false，用户的回答应判为 onboarding_answer

【输出格式】
{
  "action": "<上面定义的动作名>",
  "confidence": 0.0~1.0,
  "entities": { "amount": 数字或省略, "category": "food/...", "note": "...", "targetAmount": 数字, "goalName": "...", "deadline": "YYYY-MM-DD", "newBudget": 数字, ... },
  "reasoning": "用一句话说明你理解到用户想做什么，以及为何选这个 action"
}`;

function buildPlannerPrompt(text: string, ctx: AgentContext): string {
  const today = dayjs().format('YYYY-MM-DD');
  const recentTxs = [...ctx.transactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .map((t) => ({
      time: dayjs(t.createdAt).format('MM-DD HH:mm'),
      amount: t.amount,
      category: CATEGORY_LABEL[t.category],
      note: t.note,
      ageMinutes: Math.round((Date.now() - t.createdAt) / 60000),
    }));

  const activeGoals = ctx.goals
    .filter((g) => g.status === 'active')
    .map((g) => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      deadline: g.deadline,
    }));

  const ctxSnapshot = {
    today,
    onboarded: ctx.user.preferences.onboarded,
    grade: ctx.user.grade,
    monthlyBudget: ctx.user.monthlyBudget,
    pendingGoal: ctx.pendingGoal || null,
    recentTransactions: recentTxs,
    activeGoals,
  };

  // 仅保留最近 6 轮历史，节省 tokens
  const recentHistory = ctx.history.slice(-12).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 200),
  }));

  return [
    `【上下文快照】\n${JSON.stringify(ctxSnapshot, null, 2)}`,
    `【最近对话】\n${JSON.stringify(recentHistory, null, 2)}`,
    `【用户当前消息】\n${text}`,
    `\n请输出 JSON：`,
  ].join('\n\n');
}

/* =====================================================================
 * Stage 1: 意图识别（带降级）
 * ===================================================================== */

export async function planAction(
  text: string,
  ctx: AgentContext,
): Promise<AgentPlan | null> {
  if (!isLLMAvailable()) {
    console.log('[Agent.planner] LLM not configured, skip');
    return null;
  }

  const prompt = buildPlannerPrompt(text, ctx);
  console.log('[Agent.planner] →', text);
  const r = await callLLM(prompt, {
    systemOverride: PLANNER_SYSTEM.replace('${TODAY}', dayjs().format('YYYY-MM-DD')),
    jsonMode: true,
    temperature: 0.2, // 意图识别要稳定
    maxOutputTokens: 500,
    timeoutMs: 12000,
  });

  if (!r.ok) {
    console.warn('[Agent.planner] ✗ LLM call failed:', r.error);
    return null;
  }

  const parsed = parsePlanJson(r.text);
  if (!parsed) {
    console.warn('[Agent.planner] ✗ JSON parse failed, raw:', r.text.slice(0, 300));
    return null;
  }

  console.log(
    `[Agent.planner] ✓ action=${parsed.action} conf=${parsed.confidence} → ${parsed.reasoning}`,
    parsed.entities,
  );

  // 后处理：把可能的中文金额再 normalize 一下
  if (parsed.entities) {
    if (typeof parsed.entities.amount === 'string') {
      const v = extractAmount(parsed.entities.amount);
      parsed.entities.amount = v > 0 ? v : undefined;
    }
    if (typeof parsed.entities.targetAmount === 'string') {
      const v = extractAmount(parsed.entities.targetAmount);
      parsed.entities.targetAmount = v > 0 ? v : undefined;
    }
    if (typeof parsed.entities.newBudget === 'string') {
      const v = extractAmount(parsed.entities.newBudget);
      parsed.entities.newBudget = v > 0 ? v : undefined;
    }
  }

  return parsed;
}

function parsePlanJson(raw: string): AgentPlan | null {
  let text = raw.trim();
  // 兼容 ```json ... ``` 或 ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  // 兼容前后多余文字：截取第一个 {...} 块
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonStr = text.slice(start, end + 1);

  try {
    const obj = JSON.parse(jsonStr);
    if (!obj || typeof obj !== 'object') return null;
    if (!obj.action || typeof obj.action !== 'string') return null;
    return {
      action: obj.action as AgentAction,
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.7,
      entities: obj.entities && typeof obj.entities === 'object' ? obj.entities : {},
      reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    };
  } catch {
    return null;
  }
}

/* =====================================================================
 * Stage 2: Speaker —— 让学姐口吻汇报
 *
 * 输入：原始用户消息 + 已执行动作 + 操作结果（结构化）
 * 输出：学姐口吻的自然回复
 * ===================================================================== */

export interface SpeakerInput {
  userMessage: string;
  /** 本次执行的动作 */
  action: AgentAction;
  /** 操作结果摘要（结构化） */
  result: Record<string, any>;
  /** 历史 */
  history: ChatMessage[];
  /** 推理（来自 planner） */
  planReasoning?: string;
}

export async function speak(input: SpeakerInput): Promise<string | null> {
  if (!isLLMAvailable()) return null;

  const extra = [
    `本次为"${actionLabel(input.action)}"场景，代码已完成相关操作。`,
    `请你用小钱学姐的口吻，把【操作结果】自然地讲给用户听。`,
    `要求：`,
    `1) 200字以内、1-3个emoji、口语化（用"啦/呢/哦/呀"等语气词）`,
    `2) 不要重复用户原话，不要解释技术细节，不要说"系统已经..."`,
    `3) 不要推荐具体理财产品/平台、不要给具体投资建议`,
    `4) 用"学姐当年也"、"我懂你"等共情，不批评不说教`,
    `5) 若操作中包含金额、笔数、进度，可自然带出来`,
    ``,
    `【操作结果（JSON）】`,
    JSON.stringify(input.result, null, 2),
    input.planReasoning ? `\n【内部判断】${input.planReasoning}` : '',
  ].join('\n');

  const r = await callLLM(input.userMessage, {
    history: input.history,
    extraInstruction: extra,
    temperature: 0.85,
    maxOutputTokens: 350,
    timeoutMs: 12000,
  });
  return r.ok ? r.text : null;
}

function actionLabel(a: AgentAction): string {
  const map: Record<AgentAction, string> = {
    add_transaction: '记账',
    modify_transaction: '修改记账',
    undo_transaction: '撤销记账',
    undo_last: '撤销误记',
    query_transaction: '查询消费',
    add_income: '记一笔收入',
    query_income: '查询收入',
    create_goal: '创建储蓄目标',
    continue_goal: '继续创建目标',
    confirm_goal: '确认创建目标',
    cancel_goal: '取消创建目标',
    checkin: '储蓄打卡',
    query_goal: '查看目标进度',
    update_budget: '修改月预算',
    update_profile: '修改个人资料',
    knowledge_qa: '理财知识问答',
    risk_warning: '风险警示',
    greeting: '问候',
    emotion: '情绪共情',
    onboarding_answer: '引导回答',
    chitchat: '闲聊',
  };
  return map[a] || '通用';
}
