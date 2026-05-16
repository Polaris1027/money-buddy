import dayjs from 'dayjs';
import { parseIntent, detectRisk, INTENT_LABEL } from './nluService';
import { searchKnowledge } from './knowledgeService';
import {
  EMPATHY_OPENERS,
  ENCOURAGEMENT,
  GREETING_REPLIES,
  applyStyleRules,
  checkBoundary,
} from './personaService';
import { getPeriodAnalysis, getInsights, checkBudgetStatus } from './analysisService';
import { getIncomeAnalysis, getBalance } from './incomeService';
import { calculatePlan, checkMilestone, getGoalStatus } from './goalService';
import { callLLM, isLLMAvailable } from './llmService';
import { planAction, speak, type AgentPlan } from './agentService';
import { fmtCurrency } from '@/utils/date';
import { pickRandom } from '@/utils/id';
import {
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  INCOME_SOURCE_LABEL,
  INCOME_SOURCE_EMOJI,
} from '@/types';
import type {
  ChatMessage,
  Transaction,
  SavingGoal,
  UserProfile,
  Category,
  MessageCard,
  OptionItem,
  Income,
  IncomeSource,
} from '@/types';

export interface ChatContext {
  user: UserProfile;
  transactions: Transaction[];
  goals: SavingGoal[];
  history: ChatMessage[];
  incomes?: Income[];
  /** 待创建目标的暂存 */
  pendingGoal?: { name?: string; amount?: number; deadline?: string } | null;
}

export interface ChatActions {
  addTransaction: (data: { amount: number; category: Category; note?: string }) => Transaction;
  updateTransaction: (transactionId: string, patch: Partial<Transaction>) => void;
  removeTransaction: (transactionId: string) => void;
  addGoal: (data: {
    name: string;
    emoji?: string;
    targetAmount: number;
    deadline: string;
  }) => SavingGoal;
  addCheckin: (goalId: string, amount: number) => void;
  setPendingGoal: (g: ChatContext['pendingGoal']) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  /** 新增：记一笔收入 */
  addIncome?: (data: {
    amount: number;
    source: IncomeSource;
    note?: string;
    incomeDate?: string;
  }) => Income;
}

export interface ChatReply {
  content: string;
  card?: MessageCard;
  options?: OptionItem[];
  intent: string;
  entities: Record<string, any>;
  /** 内部标识：是 agent 还是 rules 模式 */
  source?: 'agent' | 'rules';
}

/* =====================================================================
 * 核心入口：处理用户消息
 *
 * 策略：
 *   LLM 可用 → 走 Agent 工作流（Planner + Executor + Speaker）
 *   LLM 不可用或失败 → 降级到规则引擎
 * ===================================================================== */
export async function handleUserMessage(
  text: string,
  ctx: ChatContext,
  actions: ChatActions,
): Promise<ChatReply> {
  // Onboarding 阶段保留确定性流程（按钮交互需要稳定的 options）
  if (!ctx.user.preferences.onboarded) {
    return handleOnboarding(text, ctx, actions);
  }

  // 优先尝试 Agent 模式
  if (isLLMAvailable()) {
    try {
      const reply = await runAgent(text, ctx, actions);
      if (reply) return reply;
    } catch (e) {
      console.warn('[Agent] failed, falling back to rules:', e);
    }
  }

  // 降级：规则引擎
  return runRulesEngine(text, ctx, actions);
}

/* =====================================================================
 * Agent 工作流主流程
 * ===================================================================== */
async function runAgent(
  text: string,
  ctx: ChatContext,
  actions: ChatActions,
): Promise<ChatReply | null> {
  // Stage 1：意图识别
  const plan = await planAction(text, ctx);
  if (!plan) return null;

  // Stage 2：执行动作 + 让学姐汇报
  return await executePlan(text, plan, ctx, actions);
}

/**
 * 根据 LLM 输出的 Plan 执行对应动作；
 * 然后把结构化结果交给 Speaker 用学姐口吻讲出来。
 */
async function executePlan(
  userMessage: string,
  plan: AgentPlan,
  ctx: ChatContext,
  actions: ChatActions,
): Promise<ChatReply> {
  const { action, entities, reasoning } = plan;

  // ===== 数据操作类：先执行，再让 LLM 讲 =====
  switch (action) {
    case 'add_transaction': {
      const amount = entities.amount;
      if (!amount || amount <= 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_amount', hint: '需要金额' },
          ctx.history,
          reasoning,
          '咦，没看清金额呢～可以告诉我具体多少钱吗？比如"奶茶12" 😊',
        );
      }
      const category = (entities.category as Category) || 'other';
      const note = entities.note || CATEGORY_LABEL[category];
      const tx = actions.addTransaction({ amount, category, note });
      const updated = [...ctx.transactions, tx];
      const todaySum = getPeriodAnalysis(updated, 'day');
      const monthBudget = checkBudgetStatus(updated, ctx.user.monthlyBudget);
      const catEmoji = CATEGORY_EMOJI[category] || '💰';

      const result = {
        action: '已记账',
        amount,
        category: CATEGORY_LABEL[category],
        note,
        emoji: catEmoji,
        todayCategoryTotal:
          todaySum.byCategory.find((c) => c.category === category)?.amount || amount,
        monthBudgetUsedPercent: Math.round(monthBudget.percentage),
        monthBudgetRemaining: monthBudget.remaining,
        budgetAlert:
          monthBudget.percentage >= 100
            ? 'over'
            : monthBudget.percentage >= 80
              ? 'warn'
              : 'ok',
      };

      return await speakWithCard(
        userMessage,
        action,
        result,
        ctx.history,
        reasoning,
        {
          type: 'transaction',
          data: {
            amount,
            category,
            categoryLabel: CATEGORY_LABEL[category],
            categoryEmoji: catEmoji,
            note,
            todayTotal: todaySum.total,
            budgetUsed: monthBudget.percentage,
          },
        },
        // 兜底文案
        `好嘞，${note} ${fmtCurrency(amount)} 已记下啦${catEmoji}`,
      );
    }

    case 'add_income': {
      const amount = entities.amount;
      if (!amount || amount <= 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_amount' },
          ctx.history,
          reasoning,
          '咦，没看清收入金额呢～可以告诉我多少钱吗？比如"工资5000到账" 💰',
        );
      }
      if (!actions.addIncome) {
        // 兜底：实际不会走到，因为 ChatPage 已经传入
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'unsupported' },
          ctx.history,
          reasoning,
          '收入功能还没接入呢～',
        );
      }
      const source = (entities.incomeSource as IncomeSource) || 'other';
      const note = entities.note || INCOME_SOURCE_LABEL[source];
      const inc = actions.addIncome({ amount, source, note });
      const incomes = [...(ctx.incomes ?? []), inc];
      const monthAnalysis = getIncomeAnalysis(incomes, 'month');
      const balance = getBalance(incomes, ctx.transactions, 'month');
      const srcEmoji = INCOME_SOURCE_EMOJI[source] || '💰';

      const result = {
        action: '已记入收入',
        amount,
        source: INCOME_SOURCE_LABEL[source],
        note,
        emoji: srcEmoji,
        monthIncome: monthAnalysis.total,
        monthIncomeCount: monthAnalysis.count,
        monthBalance: balance.balance,
        savingRate:
          balance.income > 0 ? Math.round(balance.savingRate * 100) : null,
        hint: '不要把这笔当作消费，提示用户可以去「收入分析」页面查看趋势',
      };

      return await speakWithCard(
        userMessage,
        action,
        result,
        ctx.history,
        reasoning,
        {
          type: 'income',
          data: {
            amount,
            source,
            sourceLabel: INCOME_SOURCE_LABEL[source],
            sourceEmoji: srcEmoji,
            note,
            monthIncome: monthAnalysis.total,
            monthBalance: balance.balance,
            savingRate:
              balance.income > 0 ? Math.round(balance.savingRate * 100) : null,
          },
        },
        `叮~ ${INCOME_SOURCE_LABEL[source]} ${fmtCurrency(amount)} 已记入收入啦 ${srcEmoji}\n本月收入累计 ${fmtCurrency(monthAnalysis.total)}，结余 ${balance.balance >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(balance.balance))}`,
      );
    }

    case 'query_income': {
      const period =
        (entities.period as 'week' | 'month' | 'year') || 'month';
      const incomes = ctx.incomes ?? [];
      const a = getIncomeAnalysis(incomes, period);
      const periodLabel =
        period === 'week' ? '本周' : period === 'year' ? '本年' : '本月';
      if (a.count === 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_data', period: periodLabel },
          ctx.history,
          reasoning,
          `${periodLabel}还没有收入记录哦～发"工资5000到账"就能记一笔啦 ✨`,
        );
      }
      return await speakOrFallback(
        userMessage,
        action,
        {
          period: periodLabel,
          total: a.total,
          count: a.count,
          topSources: a.bySource.slice(0, 3).map((c) => ({
            label: c.label,
            amount: c.amount,
            percent: Math.round(c.percentage),
          })),
        },
        ctx.history,
        reasoning,
        `${periodLabel}收入合计 ${fmtCurrency(a.total)}（${a.count}笔），主要来自${a.bySource[0]?.label} 💰`,
      );
    }

    case 'modify_transaction': {
      const last = [...ctx.transactions].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!last) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_transaction' },
          ctx.history,
          reasoning,
          '咦，目前还没有记账记录可以修改呢～',
        );
      }
      const elapsed = Date.now() - last.createdAt;
      if (elapsed > 30 * 60 * 1000) {
        return await speakOrFallback(
          userMessage,
          action,
          {
            ok: false,
            error: 'too_old',
            lastTx: {
              note: last.note,
              amount: last.amount,
              time: dayjs(last.createdAt).format('M月D日 HH:mm'),
            },
          },
          ctx.history,
          reasoning,
          `最近一笔是${dayjs(last.createdAt).format('M月D日 HH:mm')}的，时间有点久了，请到「消费分析」页面长按修改 🛠️`,
        );
      }
      const newAmount = entities.amount;
      if (!newAmount || newAmount <= 0) {
        return await speakOrFallback(
          userMessage,
          action,
          {
            ok: false,
            error: 'need_amount',
            lastTx: { note: last.note, amount: last.amount },
          },
          ctx.history,
          reasoning,
          `要改最近这笔"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"对吗？告诉学姐正确的金额就行 😊`,
        );
      }
      const finalCategory: Category =
        entities.category && entities.category !== 'other'
          ? (entities.category as Category)
          : last.category;
      const finalNote = entities.note?.trim() || last.note;
      actions.updateTransaction(last.transactionId, {
        amount: newAmount,
        category: finalCategory,
        note: finalNote,
      });

      const updated = ctx.transactions.map((t) =>
        t.transactionId === last.transactionId
          ? { ...t, amount: newAmount, category: finalCategory, note: finalNote }
          : t,
      );
      const todaySum = getPeriodAnalysis(updated, 'day');
      const monthBudget = checkBudgetStatus(updated, ctx.user.monthlyBudget);

      return await speakWithCard(
        userMessage,
        action,
        {
          action: '已修改',
          before: { note: last.note, amount: last.amount, category: CATEGORY_LABEL[last.category] },
          after: { note: finalNote, amount: newAmount, category: CATEGORY_LABEL[finalCategory] },
          todayCategoryTotal:
            todaySum.byCategory.find((c) => c.category === finalCategory)?.amount || newAmount,
          monthBudgetUsedPercent: Math.round(monthBudget.percentage),
        },
        ctx.history,
        reasoning,
        {
          type: 'transaction',
          data: {
            amount: newAmount,
            category: finalCategory,
            categoryLabel: CATEGORY_LABEL[finalCategory],
            categoryEmoji: CATEGORY_EMOJI[finalCategory] || '💰',
            note: finalNote,
            todayTotal: todaySum.total,
            budgetUsed: monthBudget.percentage,
          },
        },
        `好嘞已经帮你改过来啦～原 ${fmtCurrency(last.amount)} → 现 ${fmtCurrency(newAmount)} ✏️`,
      );
    }

    case 'undo_last': {
      // 用户在否定上一轮 AI 把消息误判为消费记账。撤销最近一笔。
      const last = [...ctx.transactions].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!last) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_transaction' },
          ctx.history,
          reasoning,
          '咦，目前还没有记账记录可以撤销呢～你刚才是想做什么？',
        );
      }
      actions.removeTransaction(last.transactionId);
      return await speakOrFallback(
        userMessage,
        action,
        {
          action: '已撤销误记',
          reason: '用户指出上一笔不该被记成消费',
          removed: {
            note: last.note,
            amount: last.amount,
            category: CATEGORY_LABEL[last.category],
          },
          hint: '若用户是想做储蓄/理财/投资目标，可顺势引导创建目标',
        },
        ctx.history,
        reasoning,
        `啊抱歉～是学姐理解错啦，已经把刚才那笔"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"删掉了 🙇‍♀️ 你是想拿这笔钱做点别的对吧？`,
      );
    }

    case 'undo_transaction': {
      const last = [...ctx.transactions].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!last) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_transaction' },
          ctx.history,
          reasoning,
          '目前还没有记账记录可以撤销呢～',
        );
      }
      if (Date.now() - last.createdAt > 30 * 60 * 1000) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'too_old' },
          ctx.history,
          reasoning,
          '最近一笔时间有点久了，请到「消费分析」页面操作 🛠️',
        );
      }
      actions.removeTransaction(last.transactionId);
      return await speakOrFallback(
        userMessage,
        action,
        {
          action: '已撤销',
          removed: {
            note: last.note,
            amount: last.amount,
            category: CATEGORY_LABEL[last.category],
          },
        },
        ctx.history,
        reasoning,
        `好的，已经撤销刚才那笔"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"啦～🗑️`,
      );
    }

    case 'query_transaction': {
      const period = (entities.period as 'day' | 'week' | 'month') || 'week';
      const a = getPeriodAnalysis(ctx.transactions, period);
      const insights = getInsights(ctx.transactions, period);
      const periodLabel = period === 'day' ? '今天' : period === 'week' ? '本周' : '本月';

      if (a.count === 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_data', period: periodLabel },
          ctx.history,
          reasoning,
          `${periodLabel}还没有记账记录哦～发"奶茶12"就能记一笔啦 ✨`,
        );
      }

      return await speakWithCard(
        userMessage,
        action,
        {
          period: periodLabel,
          total: a.total,
          count: a.count,
          topCategories: a.byCategory.slice(0, 4).map((c) => ({
            label: c.label,
            amount: c.amount,
            percent: Math.round(c.percentage),
          })),
          insight: insights[0]?.text || null,
        },
        ctx.history,
        reasoning,
        {
          type: 'summary',
          data: { period, ...a, insights },
        },
        `${periodLabel}总支出 ${fmtCurrency(a.total)}，共 ${a.count} 笔～详情看下面卡片 📊`,
      );
    }

    case 'create_goal': {
      const targetAmount = entities.targetAmount || entities.amount;
      const goalName = entities.goalName || entities.note || '我的攒钱目标';
      const deadline = entities.deadline;

      // 🛡️ 意图校验：用户说"我想拿X理财/投资"不是创建攒钱目标，应走理财建议
      const rawText = userMessage || '';
      const INVEST_INTENT_RE =
        /(理财|投资|基金|定期|余额宝|股票|放.{0,3}(里|进))/;
      const SAVE_VERB_RE = /(攒|存|存够|攒够|攒到|存到|攒钱|存钱|目标)/;
      if (
        INVEST_INTENT_RE.test(rawText) &&
        !SAVE_VERB_RE.test(rawText)
      ) {
        // 这是理财咨询，不是攒钱目标 → 不设 pending，直接给理财建议
        actions.setPendingGoal(null);
        return await speakOrFallback(
          userMessage,
          action,
          {
            topic: 'investment_advice',
            amount: targetAmount,
            userIntent: '想做理财/投资',
          },
          ctx.history,
          reasoning,
          `想拿${targetAmount ? fmtCurrency(targetAmount) : '这笔钱'}做理财呀～学姐给几个适合学生党的建议哈 ✨\n\n` +
            `💰 **稳健派**（保本为主）：\n` +
            `• 货币基金（余额宝/零钱通）：年化 1.5%-2%，随存随取\n` +
            `• 银行定期：3个月-1年，年化 1.5%-2.5%\n\n` +
            `📈 **进阶派**（能接受小波动）：\n` +
            `• 债券基金：年化 3%-5%，风险较低\n` +
            `• 指数基金定投：每月固定投入，长期年化 6%-10%\n\n` +
            `🎓 学姐建议：先留 3-6 个月生活费做应急金，其余的可以一半放货币基金、一半定投指数基金，稳中求进 💪\n\n` +
            `想了解哪种？或者要不要先设个攒钱目标？`,
        );
      }

      if (targetAmount && deadline) {
        // 信息齐全，直接进入"等确认"状态
        actions.setPendingGoal({ name: goalName, amount: targetAmount, deadline });
        const plan = calculatePlan(targetAmount, deadline, 'incremental');
        return {
          source: 'agent',
          intent: 'create_goal',
          entities,
          content: await speakOrText(
            userMessage,
            action,
            {
              goalName,
              targetAmount,
              deadline,
              daysRemaining: plan.daysRemaining,
              weeklyAmount: plan.weeklyAmount,
              dailyAmount: plan.dailyAmount,
              suggestion: plan.baseAmount
                ? `推荐52周变体：第1周${plan.baseAmount}元，每周递增${plan.increment}元`
                : null,
              awaiting: 'confirmation',
            },
            ctx.history,
            reasoning,
            `好的！${plan.daysRemaining}天攒${fmtCurrency(targetAmount)}\n• 平均每周 ${fmtCurrency(plan.weeklyAmount)}\n• 平均每天 ${fmtCurrency(plan.dailyAmount)}\n要按这个方式来吗？`,
          ),
          card: {
            type: 'goal_create',
            data: { name: goalName, amount: targetAmount, deadline, plan },
          },
          options: [
            { label: '好，创建目标', value: '好' },
            { label: '我再想想', value: '取消' },
          ],
        };
      }

      // 信息不全 → 进入多轮收集
      actions.setPendingGoal({
        name: goalName,
        amount: targetAmount,
        deadline,
      });
      const missing = !targetAmount ? '金额' : '截止日期';
      return await speakOrFallback(
        userMessage,
        action,
        { goalName, missing, hint: missing === '金额' ? '想攒多少？' : '什么时候攒到？' },
        ctx.history,
        reasoning,
        missing === '金额'
          ? '好呀，咱们一起攒钱✨ 想攒多少呢？告诉学姐金额就行～'
          : `好的！${fmtCurrency(targetAmount!)}的目标～打算什么时候攒到呢？`,
      );
    }

    case 'continue_goal': {
      const pending = ctx.pendingGoal!;
      const newAmount = entities.amount || entities.targetAmount;
      const newDeadline = entities.deadline;

      // 🛡️ 守卫：用户在 continue_goal 阶段说取消/想换话题
      const _raw = (userMessage || '').trim();
      const _cancel =
        /^(取消|算了|不要了|不攒了|退出|结束|不弄了|不创建了|先不|cancel|quit|exit|no)$|^(取消|结束|退出).{0,6}(对话|流程|目标|创建)$/i;
      const _switch = /(理财|投资|基金|股票|定期|余额宝|记一笔|记账|花了|买了|账单|余额|建议|推荐)/;
      const _isPureAmount = /^\s*\d+(\.\d+)?\s*(元|块|w|万|k|千)?\s*$/i.test(_raw);
      if (_cancel.test(_raw)) {
        actions.setPendingGoal(null);
        return {
          source: 'agent',
          intent: 'cancel_goal',
          entities: {},
          content:
            '好哒，先不创建目标啦～\n想记账、问理财知识、或重新设目标都可以随时找学姐 💛',
        };
      }
      if (!_isPureAmount && _switch.test(_raw) && !newAmount && !newDeadline) {
        actions.setPendingGoal(null);
        return await speakOrFallback(
          userMessage,
          action,
          { switched: true, userMessage },
          ctx.history,
          reasoning,
          '好的～学姐先把刚才的目标暂存起来，来听听你这个新问题 👀\n（如果还想继续设目标，随时说"我要攒X元"重新开始就行）',
        );
      }

      // 补充金额
      if (!pending.amount && newAmount) {
        actions.setPendingGoal({ ...pending, amount: newAmount });
        return await speakOrFallback(
          userMessage,
          action,
          { goalName: pending.name, targetAmount: newAmount, missing: '截止日期' },
          ctx.history,
          reasoning,
          `好的！${fmtCurrency(newAmount)} 的目标～打算什么时候攒到呢？✨`,
        );
      }
      // 补充日期
      if (!pending.deadline && newDeadline) {
        const finalAmount = pending.amount!;
        const goalName = pending.name || '我的攒钱目标';
        actions.setPendingGoal({ ...pending, deadline: newDeadline });
        const plan = calculatePlan(finalAmount, newDeadline, 'incremental');
        return {
          source: 'agent',
          intent: 'create_goal',
          entities,
          content: await speakOrText(
            userMessage,
            action,
            {
              goalName,
              targetAmount: finalAmount,
              deadline: newDeadline,
              daysRemaining: plan.daysRemaining,
              weeklyAmount: plan.weeklyAmount,
              dailyAmount: plan.dailyAmount,
              awaiting: 'confirmation',
            },
            ctx.history,
            reasoning,
            `好的！${plan.daysRemaining}天攒${fmtCurrency(finalAmount)}\n• 平均每周 ${fmtCurrency(plan.weeklyAmount)}\n要按这个方式来吗？`,
          ),
          card: {
            type: 'goal_create',
            data: { name: goalName, amount: finalAmount, deadline: newDeadline, plan },
          },
          options: [
            { label: '好，创建目标', value: '好' },
            { label: '我再想想', value: '取消' },
          ],
        };
      }
      return await speakOrFallback(
        userMessage,
        action,
        { pending, hint: '需要补充信息' },
        ctx.history,
        reasoning,
        '咱们继续呀～还差一点信息哦',
      );
    }

    case 'confirm_goal': {
      const pending = ctx.pendingGoal;
      if (!pending?.amount || !pending?.deadline) {
        actions.setPendingGoal(null);
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'incomplete' },
          ctx.history,
          reasoning,
          '哎呀信息还不全，咱们重新来一遍吧～',
        );
      }
      const goal = actions.addGoal({
        name: pending.name || '我的攒钱目标',
        emoji: pickGoalEmoji(pending.name || ''),
        targetAmount: pending.amount,
        deadline: pending.deadline,
      });
      actions.setPendingGoal(null);
      return await speakOrFallback(
        userMessage,
        action,
        {
          action: '目标创建成功',
          name: goal.name,
          emoji: goal.emoji,
          target: goal.targetAmount,
          deadline: dayjs(goal.deadline).format('M月D日'),
          tip: '说"今天存30"就能打卡',
        },
        ctx.history,
        reasoning,
        `目标创建成功！🎯【${goal.emoji} ${goal.name}】\n目标 ${fmtCurrency(goal.targetAmount)} | 截止 ${dayjs(goal.deadline).format('M月D日')}\n现在就存一笔试试？说"今天存30"就行 ✨`,
      );
    }

    case 'cancel_goal': {
      actions.setPendingGoal(null);
      return await speakOrFallback(
        userMessage,
        action,
        { action: '已取消' },
        ctx.history,
        reasoning,
        '好的呀，随时可以再来找学姐～想清楚了直接说"我想攒XXX"就行💛',
      );
    }

    case 'checkin': {
      const amount = entities.amount;
      if (!amount || amount <= 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_amount' },
          ctx.history,
          reasoning,
          '咦，金额没看清呢～告诉学姐今天存了多少？比如"今天存50"',
        );
      }
      const activeGoals = ctx.goals.filter((g) => g.status === 'active');
      if (activeGoals.length === 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_goal' },
          ctx.history,
          reasoning,
          '咦，你还没有储蓄目标呢～先创建一个吧！比如说"我想攒2000块" 🎯',
        );
      }
      const goal = activeGoals.sort((a, b) => b.createdAt - a.createdAt)[0];
      const prevAmount = goal.currentAmount;
      actions.addCheckin(goal.goalId, amount);
      const newAmount = Math.min(prevAmount + amount, goal.targetAmount);
      const milestone = checkMilestone(prevAmount, newAmount, goal.targetAmount);
      const status = getGoalStatus({ ...goal, currentAmount: newAmount });

      return await speakWithCard(
        userMessage,
        action,
        {
          action: '打卡成功',
          checkinAmount: amount,
          goalName: goal.name,
          goalEmoji: goal.emoji,
          currentAmount: newAmount,
          targetAmount: goal.targetAmount,
          progressPercent: status.progressPercent,
          remainingAmount: status.remainingAmount,
          milestone: milestone
            ? { name: milestone.name, emoji: milestone.emoji, message: milestone.message }
            : null,
          encouragement: !milestone ? pickRandom(ENCOURAGEMENT) : null,
        },
        ctx.history,
        reasoning,
        {
          type: milestone ? 'milestone' : 'goal_progress',
          data: {
            goal: { ...goal, currentAmount: newAmount },
            amount,
            progressPercent: status.progressPercent,
            milestone,
          },
        },
        `打卡成功！+${fmtCurrency(amount)} 🎉\n累计 ${fmtCurrency(newAmount)} / ${fmtCurrency(goal.targetAmount)}（${status.progressPercent}%）`,
      );
    }

    case 'query_goal': {
      const active = ctx.goals.filter((g) => g.status === 'active');
      if (active.length === 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_goal' },
          ctx.history,
          reasoning,
          '你还没有正在进行的储蓄目标哦～来设一个吧！比如"我想攒3000块去旅游" ✈️',
        );
      }
      const goalsInfo = active.map((g) => {
        const s = getGoalStatus(g);
        return {
          emoji: g.emoji,
          name: g.name,
          current: g.currentAmount,
          target: g.targetAmount,
          progressPercent: s.progressPercent,
          estimatedCompletion: s.estimatedCompletion,
          onTrack: s.onTrack,
        };
      });
      return await speakOrFallback(
        userMessage,
        action,
        { goals: goalsInfo },
        ctx.history,
        reasoning,
        goalsInfo
          .map(
            (g) =>
              `${g.emoji} ${g.name}：${fmtCurrency(g.current)}/${fmtCurrency(g.target)}（${g.progressPercent}%）`,
          )
          .join('\n'),
      );
    }

    case 'update_budget': {
      const newBudget = entities.newBudget || entities.amount;
      if (!newBudget || newBudget <= 0) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'no_budget', currentBudget: ctx.user.monthlyBudget },
          ctx.history,
          reasoning,
          `你想把月预算改成多少呢？现在是 ${fmtCurrency(ctx.user.monthlyBudget)} 哦~`,
        );
      }
      // 合理性检查
      if (newBudget < 100 || newBudget > 100000) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'unreasonable', proposed: newBudget },
          ctx.history,
          reasoning,
          `${fmtCurrency(newBudget)} 这个数字有点不太对劲哎🤔 学姐再确认一下，你想把月预算改成多少？`,
        );
      }
      const oldBudget = ctx.user.monthlyBudget;
      actions.updateUser({ monthlyBudget: newBudget });
      const monthSpent = getPeriodAnalysis(ctx.transactions, 'month').total;
      const newPercent = Math.round((monthSpent / newBudget) * 100);
      return await speakOrFallback(
        userMessage,
        action,
        {
          action: '已修改月预算',
          oldBudget,
          newBudget,
          monthSpent,
          newUsedPercent: newPercent,
          remaining: Math.max(0, newBudget - monthSpent),
        },
        ctx.history,
        reasoning,
        `好的，月预算已经从 ${fmtCurrency(oldBudget)} 改成 ${fmtCurrency(newBudget)} 啦💰\n本月已花 ${fmtCurrency(monthSpent)}（${newPercent}%），剩 ${fmtCurrency(Math.max(0, newBudget - monthSpent))}~`,
      );
    }

    case 'update_profile': {
      const field = entities.profileField;
      const value = entities.profileValue;
      if (!field || value === undefined) {
        return await speakOrFallback(
          userMessage,
          action,
          { ok: false, error: 'incomplete' },
          ctx.history,
          reasoning,
          '你想改哪一项呢？昵称还是年级？告诉学姐就行～',
        );
      }
      const patch: Partial<UserProfile> = {};
      if (field === 'nickname' && typeof value === 'string') patch.nickname = value;
      if (field === 'monthlyBudget' && typeof value === 'number') patch.monthlyBudget = value;
      if (field === 'grade' && typeof value === 'string') {
        patch.grade = value as any;
      }
      actions.updateUser(patch);
      return await speakOrFallback(
        userMessage,
        action,
        { action: '已修改', field, value },
        ctx.history,
        reasoning,
        `好啦，已经帮你改过来了～✨`,
      );
    }

    case 'risk_warning': {
      const found = searchKnowledge(userMessage, 1);
      // 风险场景必须明确警示，让 LLM 基于本地知识生成
      const result = {
        riskType: entities.riskType || '理财风险',
        level: entities.riskLevel || 'high',
        knowledge: found[0]?.answer || null,
      };
      const llmText = await speak({
        userMessage,
        action,
        result,
        history: ctx.history,
        planReasoning: reasoning,
      });
      const finalText =
        llmText ||
        (found[0]?.answer
          ? found[0].answer
          : `学姐认真提醒一下⚠️ 这看起来涉及"${result.riskType}"，对学生党来说风险很大～如果想搞钱，可以从兼职、记账、设储蓄目标开始`);
      return {
        source: 'agent',
        intent: 'risk_warning',
        entities,
        content: postProcess(finalText),
        card: {
          type: 'risk_warning',
          data: { riskType: result.riskType, level: result.level, message: finalText },
        },
      };
    }

    case 'knowledge_qa': {
      const found = searchKnowledge(userMessage, 2);
      const result = {
        question: userMessage,
        knowledgeRefs: found.map((k) => ({ q: k.question, a: k.answer })),
        relatedTopics: found[0]?.related || [],
      };
      const llmText = await speak({
        userMessage,
        action,
        result,
        history: ctx.history,
        planReasoning: reasoning,
      });
      return {
        source: 'agent',
        intent: 'knowledge_qa',
        entities: { knowledgeId: found[0]?.id },
        content: postProcess(
          llmText ||
            found[0]?.answer ||
            '这个问题学姐还没研究过呢🤔 不过你可以问我：什么是基金、复利、定投～',
        ),
      };
    }

    case 'emotion': {
      const monthBudget = checkBudgetStatus(ctx.transactions, ctx.user.monthlyBudget);
      const result = {
        emotion: entities.emotion || '低落',
        monthBudgetUsedPercent: Math.round(monthBudget.percentage),
        hint: '请先共情，再轻量给建议',
      };
      const llmText = await speak({
        userMessage,
        action,
        result,
        history: ctx.history,
        planReasoning: reasoning,
      });
      return {
        source: 'agent',
        intent: 'emotion',
        entities,
        content: postProcess(llmText || pickRandom(EMPATHY_OPENERS) + '有学姐在呢💛'),
      };
    }

    case 'greeting':
    case 'chitchat':
    default: {
      const llmText = await speak({
        userMessage,
        action,
        result: {
          hint: action === 'greeting' ? '用户在打招呼' : '用户在闲聊或不明意图',
          tip: '若与理财无关，温柔把话题带回记账/攒钱/学理财',
          recentActivity: {
            txCount: ctx.transactions.length,
            goalCount: ctx.goals.filter((g) => g.status === 'active').length,
          },
        },
        history: ctx.history,
        planReasoning: reasoning,
      });
      return {
        source: 'agent',
        intent: action === 'greeting' ? 'greeting' : 'other',
        entities,
        content: postProcess(llmText || pickRandom(GREETING_REPLIES)),
      };
    }
  }
}

/* =====================================================================
 * Speaker 辅助：让 LLM 用学姐口吻汇报；失败用 fallback 文本
 * ===================================================================== */

async function speakOrText(
  userMessage: string,
  action: any,
  result: Record<string, any>,
  history: ChatMessage[],
  reasoning: string | undefined,
  fallback: string,
): Promise<string> {
  const llmText = await speak({ userMessage, action, result, history, planReasoning: reasoning });
  return postProcess(llmText || fallback);
}

async function speakOrFallback(
  userMessage: string,
  action: any,
  result: Record<string, any>,
  history: ChatMessage[],
  reasoning: string | undefined,
  fallback: string,
): Promise<ChatReply> {
  const text = await speakOrText(userMessage, action, result, history, reasoning, fallback);
  return {
    source: 'agent',
    intent: action,
    entities: result,
    content: text,
  };
}

async function speakWithCard(
  userMessage: string,
  action: any,
  result: Record<string, any>,
  history: ChatMessage[],
  reasoning: string | undefined,
  card: MessageCard,
  fallback: string,
): Promise<ChatReply> {
  const text = await speakOrText(userMessage, action, result, history, reasoning, fallback);
  return {
    source: 'agent',
    intent: action,
    entities: result,
    content: text,
    card,
  };
}

/* =====================================================================
 * 规则引擎（Agent 不可用时降级）
 * ===================================================================== */
async function runRulesEngine(
  text: string,
  ctx: ChatContext,
  actions: ChatActions,
): Promise<ChatReply> {
  // 1. 待创建目标的多轮对话
  if (ctx.pendingGoal) {
    return handleGoalCreationFlow(text, ctx, actions);
  }

  // 2. 风险词优先检测
  const risk = detectRisk(text);
  if (risk.hasRisk && risk.level === 'high' && !/午饭|早饭|晚饭/.test(text)) {
    return handleRiskWarning(text, risk);
  }

  // 3. 意图分发
  const parsed = parseIntent(text);
  switch (parsed.intent) {
    case 'greeting':
      return {
        source: 'rules',
        content: pickRandom(GREETING_REPLIES),
        intent: parsed.intent,
        entities: parsed.entities,
      };
    case 'emotion':
      return await handleEmotion(text, ctx);
    case 'add_transaction':
      return handleAddTransaction(parsed.entities, ctx, actions);
    case 'add_income':
      return handleAddIncome(parsed.entities, ctx, actions);
    case 'modify_transaction':
      return handleModifyTransaction(parsed.entities, ctx, actions);
    case 'undo_transaction':
      return handleUndoTransaction(ctx, actions);
    case 'update_budget':
      return handleUpdateBudget(parsed.entities, ctx, actions);
    case 'query_transaction':
      return handleQueryTransaction(parsed.entities.period, ctx);
    case 'create_goal':
      return handleCreateGoalIntent(parsed.entities, ctx, actions);
    case 'checkin':
      return handleCheckin(parsed.entities.amount, ctx, actions);
    case 'query_goal':
      return handleQueryGoal(ctx);
    case 'risk_warning':
      return handleRiskWarning(text, {
        hasRisk: true,
        riskType: parsed.entities.riskType,
        level: parsed.entities.level,
      });
    case 'knowledge_qa':
      return await handleKnowledgeQA(text, ctx);
    default:
      return await handleFallback(text, ctx);
  }
}

/* =====================================================================
 * Onboarding（首次使用 3 步引导）
 * ===================================================================== */
function handleOnboarding(text: string, ctx: ChatContext, actions: ChatActions): ChatReply {
  const lastBot = [...ctx.history].reverse().find((m) => m.role === 'assistant');
  const t = text.trim();

  // 第一步：询问年级（若 grade 未设置）
  if (!ctx.user.grade) {
    let grade: UserProfile['grade'] = null;
    if (/大一|freshman/i.test(t)) grade = 'freshman';
    else if (/大二|sophomore/i.test(t)) grade = 'sophomore';
    else if (/大三|junior/i.test(t)) grade = 'junior';
    else if (/大四|senior/i.test(t)) grade = 'senior';
    else if (/研|graduate/i.test(t)) grade = 'graduate';

    if (grade) {
      actions.updateUser({ grade });
      return {
        content: '好的！那你每个月大概有多少可支配的钱呢？💰',
        options: [
          { label: '1500以下', value: '1500' },
          { label: '1500-2000', value: '1800' },
          { label: '2000-2500', value: '2200' },
          { label: '2500以上', value: '2800' },
        ],
        intent: 'onboarding_answer',
        entities: { step: 'grade', grade },
      };
    }
    return {
      content:
        'Hi！我是攒钱搭子，你的理财小学姐～🙋‍♀️ 先简单认识一下吧，你现在是？',
      options: [
        { label: '大一', value: '大一' },
        { label: '大二', value: '大二' },
        { label: '大三', value: '大三' },
        { label: '大四', value: '大四' },
        { label: '研究生', value: '研究生' },
      ],
      intent: 'onboarding_answer',
      entities: { step: 'grade' },
    };
  }

  // 第二步：询问预算
  const budgetMatch = t.match(/\d+/);
  if (
    ctx.user.monthlyBudget === 2000 &&
    lastBot &&
    /可支配|每个月.*多少|预算/.test(lastBot.content)
  ) {
    if (budgetMatch) {
      const budget = parseInt(budgetMatch[0], 10);
      if (budget >= 100 && budget <= 50000) {
        actions.updateUser({ monthlyBudget: budget });
        return {
          content: '最后一个问题～你最想解决的理财问题是？✨',
          options: [
            { label: '总是月光，想学记账', value: 'overspend' },
            { label: '想攒钱但没动力', value: 'noMotivation' },
            { label: '想学理财但不知从何开始', value: 'noIdea' },
          ],
          intent: 'onboarding_answer',
          entities: { step: 'budget', budget },
        };
      }
    }
  }

  // 第三步：核心需求
  let concern: 'overspend' | 'noMotivation' | 'noIdea' | 'other' = 'other';
  if (/月光|记账/.test(t) || t === 'overspend') concern = 'overspend';
  else if (/没动力|攒钱/.test(t) || t === 'noMotivation') concern = 'noMotivation';
  else if (/不知从何|理财/.test(t) || t === 'noIdea') concern = 'noIdea';

  if (concern !== 'other' || /了解|清楚|知道/.test(t)) {
    actions.updateUser({
      preferences: { ...ctx.user.preferences, primaryConcern: concern, onboarded: true },
    });

    let advice = '';
    if (concern === 'overspend') {
      advice =
        '了解啦！学姐当年也是月光族，后来靠记账慢慢改变的～ 建议你先从记账开始，每天花 1 分钟记录支出，很快就能发现钱都花哪儿了！现在就开始第一笔记账吧？说"午饭15"试试看 🍚';
    } else if (concern === 'noMotivation') {
      advice =
        '懂了～没有目标就没有动力，对吧？😉 学姐建议先设个小目标，比如"暑假旅游基金"或者"应急储蓄金"。直接说"我想攒2000块"试试看？✨';
    } else if (concern === 'noIdea') {
      advice =
        '理解！理财听起来好高深对吧～ 其实没那么难！咱们先从记账起步，了解钱的流向，再慢慢学。问我"什么是基金"或者直接记一笔账都行！📚';
    } else {
      advice =
        '好滴～随时在这里等你！想记账就直接说"奶茶15"，想攒钱就说"我想攒XXX"，想学理财就直接问～💛';
    }

    return {
      content: advice,
      intent: 'onboarding_answer',
      entities: { step: 'done', concern },
    };
  }

  return {
    content: '没问题，咱们慢慢来～你先选一个最想解决的问题吧？',
    options: [
      { label: '总是月光，想学记账', value: 'overspend' },
      { label: '想攒钱但没动力', value: 'noMotivation' },
      { label: '想学理财但不知从何开始', value: 'noIdea' },
    ],
    intent: 'onboarding_answer',
    entities: { step: 'concern' },
  };
}

/* =====================================================================
 * 记账
 * ===================================================================== */
function handleAddTransaction(
  entities: any,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  const { amount, category, note } = entities;
  if (!amount || amount <= 0) {
    return {
      content: '咦，没看清金额呢～可以告诉我具体多少钱吗？比如"奶茶12"或"打车花了20元" 😊',
      intent: 'add_transaction',
      entities: {},
    };
  }

  const tx = actions.addTransaction({ amount, category, note });
  const todaySum = getPeriodAnalysis(
    [...ctx.transactions, tx],
    'day',
  );
  const monthBudget = checkBudgetStatus([...ctx.transactions, tx], ctx.user.monthlyBudget);

  const catEmoji = CATEGORY_EMOJI[category as Category] || '💰';
  const catLabel = CATEGORY_LABEL[category as Category];

  const lines: string[] = [];
  lines.push(`好嘞，记下了～${note || catLabel}${fmtCurrency(amount)}${catEmoji}`);
  lines.push(
    `今天${catLabel}已经${fmtCurrency(todaySum.byCategory.find((c) => c.category === category)?.amount || amount)}了～`,
  );

  // 预算提醒
  if (monthBudget.percentage >= 100) {
    lines.push(
      `⚠️ 本月预算已用 ${monthBudget.percentage.toFixed(0)}%，超出 ${fmtCurrency(monthBudget.spent - monthBudget.budget)}，明天稍微缓一缓哦~`,
    );
  } else if (monthBudget.percentage >= 80) {
    lines.push(
      `🟡 本月预算用了 ${monthBudget.percentage.toFixed(0)}%，还剩 ${fmtCurrency(monthBudget.remaining)}，可以哦~`,
    );
  } else {
    lines.push('继续保持记录，月底学姐帮你做个总结💛');
  }

  return {
    content: lines.join('\n'),
    card: {
      type: 'transaction',
      data: {
        amount,
        category,
        categoryLabel: catLabel,
        categoryEmoji: catEmoji,
        note: note || catLabel,
        todayTotal: todaySum.total,
        budgetUsed: monthBudget.percentage,
      },
    },
    intent: 'add_transaction',
    entities,
  };
}

/* =====================================================================
 * 记一笔收入（规则引擎）
 * ===================================================================== */
function handleAddIncome(
  entities: any,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  const { amount, source: rawSource, note } = entities;
  if (!amount || amount <= 0) {
    return {
      source: 'rules',
      content:
        '咦，没看清收入金额呢～可以告诉我多少钱吗？比如"工资5000到账"或"兼职300" 💰',
      intent: 'add_income',
      entities: {},
    };
  }
  if (!actions.addIncome) {
    return {
      source: 'rules',
      content: '收入记账还没准备好哦～',
      intent: 'add_income',
      entities: {},
    };
  }
  const source = (rawSource as IncomeSource) || 'other';
  const finalNote = (note && String(note).trim()) || INCOME_SOURCE_LABEL[source];
  const inc = actions.addIncome({ amount, source, note: finalNote });

  const incomes = [...(ctx.incomes ?? []), inc];
  const monthA = getIncomeAnalysis(incomes, 'month');
  const balance = getBalance(incomes, ctx.transactions, 'month');
  const srcEmoji = INCOME_SOURCE_EMOJI[source] || '💰';

  const lines: string[] = [];
  lines.push(
    `叮~ ${INCOME_SOURCE_LABEL[source]} ${fmtCurrency(amount)} 已记入收入啦${srcEmoji}`,
  );
  lines.push(
    `本月收入累计 ${fmtCurrency(monthA.total)}（${monthA.count}笔），结余 ${
      balance.balance >= 0 ? '+' : '-'
    }${fmtCurrency(Math.abs(balance.balance))}`,
  );
  if (balance.income > 0 && balance.savingRate >= 0.3) {
    lines.push(
      `储蓄率 ${(balance.savingRate * 100).toFixed(0)}%，可以考虑把结余放进储蓄目标 🎯`,
    );
  } else if (balance.income > 0 && balance.balance < 0) {
    lines.push('本月入不敷出，要看看消费里能不能砍点开支哦~');
  } else {
    lines.push('继续保持记录，月底学姐帮你做个总结💛');
  }

  return {
    source: 'rules',
    content: lines.join('\n'),
    card: {
      type: 'income',
      data: {
        amount,
        source,
        sourceLabel: INCOME_SOURCE_LABEL[source],
        sourceEmoji: srcEmoji,
        note: finalNote,
        monthIncome: monthA.total,
        monthBalance: balance.balance,
        savingRate:
          balance.income > 0 ? Math.round(balance.savingRate * 100) : null,
      },
    },
    intent: 'add_income',
    entities: { amount, source, note: finalNote },
  };
}

/* =====================================================================
 * 修改最近一笔记账
 * ===================================================================== */
function handleModifyTransaction(
  entities: any,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  // 找最近一笔记账（按 createdAt 倒序）
  const last = [...ctx.transactions].sort((a, b) => b.createdAt - a.createdAt)[0];

  if (!last) {
    return {
      content: '咦，目前还没有记账记录可以修改呢～想记一笔的话，直接告诉学姐就行啦，比如"奶茶12" 😊',
      intent: 'modify_transaction',
      entities: {},
    };
  }

  // 时间窗口校验：超过 30 分钟的记录不直接修改，避免误改
  const elapsed = Date.now() - last.createdAt;
  if (elapsed > 30 * 60 * 1000) {
    return {
      content: `最近一笔记账是${dayjs(last.createdAt).format('M月D日 HH:mm')}的"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"，时间有点久了哎～\n如果确实要改，请到「消费分析」页面长按那条记录修改 🛠️`,
      intent: 'modify_transaction',
      entities: { lastTxId: last.transactionId },
    };
  }

  const newAmount = entities.amount;
  const newCategory = entities.category;
  const newNote = entities.note;

  // 必须至少有金额变化（否则不知道改什么）
  if (!newAmount || newAmount <= 0) {
    return {
      content: `要改最近这笔"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"对吗？\n告诉学姐正确的金额就行啦，比如"改成25" 或 "其实是2500" 😊`,
      intent: 'modify_transaction',
      entities: { lastTxId: last.transactionId },
    };
  }

  // 推断新分类：若用户提到具体分类词就用新的，否则保留原分类
  const finalCategory: Category = newCategory && newCategory !== 'other'
    ? newCategory
    : last.category;

  // 备注：若新备注非空且与原始不同，用新的；否则保留原备注
  const cleanNote = (newNote || '').trim();
  const finalNote = cleanNote && cleanNote.length > 0 && !/不对|不是|改成|应该是|其实是/.test(cleanNote)
    ? cleanNote
    : last.note;

  actions.updateTransaction(last.transactionId, {
    amount: newAmount,
    category: finalCategory,
    note: finalNote,
  });

  // 用更新后的列表重算汇总
  const updatedTx = { ...last, amount: newAmount, category: finalCategory, note: finalNote };
  const updatedList = ctx.transactions.map((t) =>
    t.transactionId === last.transactionId ? updatedTx : t,
  );
  const todaySum = getPeriodAnalysis(updatedList, 'day');
  const monthBudget = checkBudgetStatus(updatedList, ctx.user.monthlyBudget);

  const catEmoji = CATEGORY_EMOJI[finalCategory] || '💰';
  const catLabel = CATEGORY_LABEL[finalCategory];

  const lines: string[] = [];
  lines.push(
    `好嘞，已经帮你改过来啦～${catEmoji}\n原：${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}\n现：${finalNote || catLabel} ${fmtCurrency(newAmount)}`,
  );
  lines.push(`今日${catLabel}合计 ${fmtCurrency(todaySum.byCategory.find((c) => c.category === finalCategory)?.amount || newAmount)}~`);
  if (monthBudget.percentage >= 100) {
    lines.push(`⚠️ 本月预算已用 ${monthBudget.percentage.toFixed(0)}%，注意控制哦~`);
  }

  return {
    content: lines.join('\n'),
    card: {
      type: 'transaction',
      data: {
        amount: newAmount,
        category: finalCategory,
        categoryLabel: catLabel,
        categoryEmoji: catEmoji,
        note: finalNote || catLabel,
        todayTotal: todaySum.total,
        budgetUsed: monthBudget.percentage,
      },
    },
    intent: 'modify_transaction',
    entities: { transactionId: last.transactionId, oldAmount: last.amount, newAmount },
  };
}

/* =====================================================================
 * 撤销最近一笔记账
 * ===================================================================== */
function handleUndoTransaction(ctx: ChatContext, actions: ChatActions): ChatReply {
  const last = [...ctx.transactions].sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!last) {
    return {
      source: 'rules',
      content: '目前还没有记账记录可以撤销呢～',
      intent: 'undo_transaction',
      entities: {},
    };
  }
  // 仅允许撤销 30 分钟内的
  if (Date.now() - last.createdAt > 30 * 60 * 1000) {
    return {
      source: 'rules',
      content: `最近一笔是${dayjs(last.createdAt).format('M月D日 HH:mm')}的，时间有点久咯～\n要删的话请到「消费分析」页面操作 🛠️`,
      intent: 'undo_transaction',
      entities: {},
    };
  }
  actions.removeTransaction(last.transactionId);
  return {
    source: 'rules',
    content: `好的，已经撤销刚才那笔"${last.note || CATEGORY_LABEL[last.category]} ${fmtCurrency(last.amount)}"啦～🗑️`,
    intent: 'undo_transaction',
    entities: { transactionId: last.transactionId },
  };
}

/* =====================================================================
 * 修改月预算（规则模式）
 * ===================================================================== */
function handleUpdateBudget(
  entities: any,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  const newBudget = entities.newBudget;
  if (!newBudget || newBudget <= 0) {
    return {
      source: 'rules',
      intent: 'update_budget',
      entities: {},
      content: `你想把月预算改成多少呢？现在是 ${fmtCurrency(ctx.user.monthlyBudget)} 哦~ 直接告诉学姐金额就行💰`,
    };
  }
  if (newBudget < 100 || newBudget > 100000) {
    return {
      source: 'rules',
      intent: 'update_budget',
      entities: {},
      content: `${fmtCurrency(newBudget)} 这个数字有点不太对劲哎🤔 学姐再确认一下，你想把月预算改成多少？`,
    };
  }
  const oldBudget = ctx.user.monthlyBudget;
  actions.updateUser({ monthlyBudget: newBudget });
  const monthSpent = getPeriodAnalysis(ctx.transactions, 'month').total;
  const newPercent = Math.round((monthSpent / newBudget) * 100);
  return {
    source: 'rules',
    intent: 'update_budget',
    entities: { oldBudget, newBudget },
    content: `好的，月预算从 ${fmtCurrency(oldBudget)} 改成 ${fmtCurrency(newBudget)} 啦💰\n本月已花 ${fmtCurrency(monthSpent)}（${newPercent}%），剩 ${fmtCurrency(Math.max(0, newBudget - monthSpent))}~`,
  };
}

/* =====================================================================
 * 查询消费
 * ===================================================================== */
function handleQueryTransaction(period: 'day' | 'week' | 'month' = 'week', ctx: ChatContext): ChatReply {
  const a = getPeriodAnalysis(ctx.transactions, period);
  const insights = getInsights(ctx.transactions, period);
  const periodLabel = period === 'day' ? '今天' : period === 'week' ? '本周' : '本月';

  if (a.count === 0) {
    return {
      content: `${periodLabel}还没有记账记录哦～发"奶茶12"这样的话就能记一笔啦 ✨`,
      intent: 'query_transaction',
      entities: { period },
    };
  }

  const lines: string[] = [];
  lines.push(`来啦！${periodLabel}消费小结 📊`);
  lines.push(`- 总支出：${fmtCurrency(a.total)}（${a.count}笔）`);
  for (const c of a.byCategory.slice(0, 4)) {
    lines.push(`- ${CATEGORY_LABEL[c.category]}：${fmtCurrency(c.amount)}（${c.percentage.toFixed(0)}%）`);
  }
  if (insights.length > 0) {
    lines.push('');
    lines.push('💡 ' + insights[0].text);
  }

  return {
    content: lines.join('\n'),
    card: {
      type: 'summary',
      data: { period, ...a, insights },
    },
    intent: 'query_transaction',
    entities: { period },
  };
}

/* =====================================================================
 * 创建目标（多轮对话）
 * ===================================================================== */
function handleCreateGoalIntent(
  entities: any,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  const amount = entities.amount;
  const note = entities.note || '';

  if (amount && amount > 0) {
    actions.setPendingGoal({ amount, name: note || '我的攒钱目标' });
    return {
      content: `太棒了！想攒 ${fmtCurrency(amount)}～\n打算什么时候攒到呢？✨\n（直接告诉我日期，比如"7月15日"或"3个月后"）`,
      intent: 'create_goal',
      entities: { amount, name: note },
    };
  }

  // 没有金额：询问
  actions.setPendingGoal({ name: note || undefined });
  return {
    content: '好呀，咱们一起攒钱✨\n想攒多少呢？直接告诉学姐金额就行～',
    intent: 'create_goal',
    entities: {},
  };
}

function handleGoalCreationFlow(
  text: string,
  ctx: ChatContext,
  actions: ChatActions,
): ChatReply {
  const pending = ctx.pendingGoal!;
  const amountMatch = text.match(/(\d+(\.\d+)?)/);
  const t = text.trim();

  // 🛡️ 守卫1：取消/退出/重置词 —— 用户想跳出当前多轮收集
  const CANCEL_RE =
    /^(取消|算了|不要了|不攒了|不要这个|退出|结束|不弄了|不创建了|先不|算了吧|cancel|quit|exit|no)$|^(取消|结束|退出).{0,6}(对话|流程|目标|创建)$/i;
  if (CANCEL_RE.test(t)) {
    actions.setPendingGoal(null);
    return {
      content:
        '好哒，先不创建目标啦～\n想记账、问理财知识、或重新设目标都可以随时找学姐 💛',
      intent: 'cancel_goal',
      entities: {},
    };
  }

  // 🛡️ 守卫2：用户切换话题（说出明显非"创建目标"的意图）—— 清掉 pending 让上层重新路由
  // 例如："我想拿2000理财"、"帮我记一笔"、"查一下余额"、"理财建议" 等
  const TOPIC_SWITCH_RE =
    /(理财|投资|基金|股票|定期|余额宝|记一笔|记账|花了|买了|花销|账单|消费|余额|有多少钱|查询|建议|推荐|怎么办|为什么|是什么|怎么用|如何)/;
  // 但要排除：用户只是在描述目标名称（如 "我想攒钱买相机"），所以只有在【非纯金额数字】且【匹配切换词】时才触发
  const isPureAmount = /^\s*\d+(\.\d+)?\s*(元|块|块钱|w|万|k|千)?\s*$/i.test(t);
  if (!isPureAmount && TOPIC_SWITCH_RE.test(t)) {
    actions.setPendingGoal(null);
    // 不直接回复，返回 null 让外层重新路由本次消息
    // 但当前函数签名要求返回 ChatReply，所以用一个标记位 + 友好提示
    return {
      content:
        '好的～学姐先把刚才的目标暂存起来，来听听你这个新问题 👀\n（如果还想继续设目标，随时说"我要攒X元"重新开始就行）',
      intent: 'switch_topic',
      entities: { switched: true },
      // 让前端/上层知道这是一次"软中断"
    };
  }

  // 步骤1：补充金额
  if (!pending.amount) {
    if (amountMatch) {
      const amt = parseFloat(amountMatch[1]);
      actions.setPendingGoal({ ...pending, amount: amt });
      return {
        content: `好的！${fmtCurrency(amt)}的目标～\n打算什么时候攒到呢？✨\n（也可以说"取消"先不创建）`,
        intent: 'create_goal',
        entities: { amount: amt },
      };
    }
    return {
      content:
        '咦，金额没看清呢～告诉学姐具体多少钱呀？比如"3000"\n（不想创建可以说"取消"哦）',
      intent: 'create_goal',
      entities: {},
    };
  }

  // 步骤2：解析日期
  if (!pending.deadline) {
    const deadline = parseDeadline(t);
    if (!deadline) {
      return {
        content:
          '日期没看明白哎～可以这样说：\n• "3个月后"\n• "7月15号"\n• "到暑假"\n• "明年6月"\n\n或者回复"取消"先不创建这个目标～',
        options: [
          { label: '3个月后', value: '3个月后' },
          { label: '6个月后', value: '6个月后' },
          { label: '取消创建', value: 'cancel_goal' },
        ],
        intent: 'create_goal',
        entities: {},
      };
    }

    const finalName = pending.name || '我的攒钱目标';
    const plan = calculatePlan(pending.amount, deadline, 'incremental');

    // 询问确认
    actions.setPendingGoal({ ...pending, deadline });

    const lines: string[] = [];
    lines.push(`好的！${plan.daysRemaining}天攒${fmtCurrency(pending.amount)}~`);
    lines.push('');
    lines.push('学姐帮你算了一下：');
    lines.push(`• 平均每周攒 ${fmtCurrency(plan.weeklyAmount)}`);
    lines.push(`• 或者每天攒 ${fmtCurrency(plan.dailyAmount)}`);
    if (plan.incrementalWeeks && plan.incrementalWeeks.length > 0) {
      lines.push('');
      lines.push(
        `推荐用「52周攒钱法」：第1周${fmtCurrency(plan.baseAmount!)}，每周递增${fmtCurrency(plan.increment!)}，前期压力小 💪`,
      );
    }
    lines.push('');
    lines.push('要按这个方式来吗？回复"好"创建目标 ✨');

    return {
      content: lines.join('\n'),
      card: { type: 'goal_create', data: { ...pending, deadline, plan } },
      options: [
        { label: '好，创建目标', value: 'confirm_goal' },
        { label: '我再想想', value: 'cancel_goal' },
      ],
      intent: 'create_goal',
      entities: { ...pending, deadline },
    };
  }

  // 步骤3：确认创建
  if (/^(好|好的|确定|确认|嗯|可以|对|ok|yes|是|create_goal|confirm_goal)/i.test(t)) {
    const goal = actions.addGoal({
      name: pending.name || '我的攒钱目标',
      emoji: pickGoalEmoji(pending.name || ''),
      targetAmount: pending.amount,
      deadline: pending.deadline,
    });
    actions.setPendingGoal(null);

    return {
      content: `目标创建成功！🎯\n【${goal.emoji} ${goal.name}】\n目标：${fmtCurrency(goal.targetAmount)} | 截止：${dayjs(goal.deadline).format('M月D日')}\n\n我会每天晚上 8 点提醒你打卡的～现在就存一笔试试？说"今天存30"就行 ✨`,
      intent: 'create_goal',
      entities: { goalId: goal.goalId },
    };
  }

  if (/不|算了|取消|再想/.test(t) || t === 'cancel_goal') {
    actions.setPendingGoal(null);
    return {
      content: '好的呀，随时可以再来找学姐～ 想清楚了直接说"我想攒XXX"就行💛',
      intent: 'create_goal',
      entities: {},
    };
  }

  // 默认：再次询问确认
  return {
    content: '要创建这个目标吗？回复"好"开始打卡，或"取消"重新想想～',
    options: [
      { label: '好，创建目标', value: 'confirm_goal' },
      { label: '取消', value: 'cancel_goal' },
    ],
    intent: 'create_goal',
    entities: {},
  };
}

function parseDeadline(text: string): string | null {
  const t = text.trim();
  // "3个月后"
  let m = t.match(/(\d+)\s*个?月后?/);
  if (m) return dayjs().add(parseInt(m[1], 10), 'month').format('YYYY-MM-DD');
  // "X天后"
  m = t.match(/(\d+)\s*天后/);
  if (m) return dayjs().add(parseInt(m[1], 10), 'day').format('YYYY-MM-DD');
  // "X周后"
  m = t.match(/(\d+)\s*周后/);
  if (m) return dayjs().add(parseInt(m[1], 10), 'week').format('YYYY-MM-DD');
  // 暑假/寒假/年底/明年
  if (/暑假/.test(t)) {
    const y = dayjs().month() >= 6 ? dayjs().year() + 1 : dayjs().year();
    return `${y}-07-01`;
  }
  if (/寒假/.test(t)) {
    const y = dayjs().month() >= 11 ? dayjs().year() + 1 : dayjs().year();
    return `${y}-01-15`;
  }
  if (/年底|过年|年末/.test(t)) {
    return `${dayjs().year()}-12-31`;
  }
  if (/明年/.test(t)) {
    const m2 = t.match(/明年(\d+)月/);
    if (m2) return dayjs().add(1, 'year').month(parseInt(m2[1], 10) - 1).date(1).format('YYYY-MM-DD');
    return dayjs().add(1, 'year').format('YYYY-MM-DD');
  }
  // "X月X日/号"
  m = t.match(/(\d{1,2})\s*月\s*(\d{1,2})/);
  if (m) {
    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    let target = dayjs().month(month - 1).date(day);
    if (target.isBefore(dayjs())) target = target.add(1, 'year');
    return target.format('YYYY-MM-DD');
  }
  // ISO 日期
  m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return dayjs(`${m[1]}-${m[2]}-${m[3]}`).format('YYYY-MM-DD');
  return null;
}

function pickGoalEmoji(name: string): string {
  if (/旅游|旅行|出去玩|度假/.test(name)) return '✈️';
  if (/手机|苹果|ipad|相机/.test(name)) return '📱';
  if (/电脑|笔记本|mac/.test(name)) return '💻';
  if (/球鞋|衣服|包|鞋|穿/.test(name)) return '👟';
  if (/应急|备用/.test(name)) return '🆘';
  if (/学费|考试|考研|留学/.test(name)) return '📚';
  if (/礼物|生日/.test(name)) return '🎁';
  return '🎯';
}

/* =====================================================================
 * 打卡
 * ===================================================================== */
function handleCheckin(amount: number, ctx: ChatContext, actions: ChatActions): ChatReply {
  if (!amount || amount <= 0) {
    return {
      content: '咦，金额没看清呢～告诉学姐今天存了多少？比如"今天存50"',
      intent: 'checkin',
      entities: {},
    };
  }
  const activeGoals = ctx.goals.filter((g) => g.status === 'active');
  if (activeGoals.length === 0) {
    return {
      content:
        '咦，你还没有储蓄目标呢～先创建一个吧！比如说"我想攒2000块买个新键盘" 🎯',
      intent: 'checkin',
      entities: {},
    };
  }
  // 选择最近创建的活跃目标
  const goal = activeGoals.sort((a, b) => b.createdAt - a.createdAt)[0];
  const prevAmount = goal.currentAmount;
  actions.addCheckin(goal.goalId, amount);

  const newAmount = Math.min(prevAmount + amount, goal.targetAmount);
  const milestone = checkMilestone(prevAmount, newAmount, goal.targetAmount);
  const status = getGoalStatus({ ...goal, currentAmount: newAmount });

  const lines: string[] = [];
  lines.push(`打卡成功！🎉 今日 +${fmtCurrency(amount)}`);
  lines.push(
    `[${'█'.repeat(Math.floor(status.progressPercent / 5))}${'░'.repeat(20 - Math.floor(status.progressPercent / 5))}] ${status.progressPercent}%`,
  );
  lines.push(
    `累计已攒：${fmtCurrency(newAmount)} | 还差：${fmtCurrency(status.remainingAmount)}`,
  );
  if (milestone) {
    lines.push('');
    lines.push(`${milestone.emoji} ${milestone.name}！${milestone.message}`);
  } else {
    lines.push(pickRandom(ENCOURAGEMENT));
  }

  return {
    content: lines.join('\n'),
    card: {
      type: milestone ? 'milestone' : 'goal_progress',
      data: {
        goal: { ...goal, currentAmount: newAmount },
        amount,
        progressPercent: status.progressPercent,
        milestone,
      },
    },
    intent: 'checkin',
    entities: { amount, goalId: goal.goalId },
  };
}

/* =====================================================================
 * 查目标
 * ===================================================================== */
function handleQueryGoal(ctx: ChatContext): ChatReply {
  const active = ctx.goals.filter((g) => g.status === 'active');
  if (active.length === 0) {
    return {
      content:
        '你还没有正在进行的储蓄目标哦～来设一个吧！比如"我想攒3000块去旅游" ✈️',
      intent: 'query_goal',
      entities: {},
    };
  }
  const lines: string[] = ['你的储蓄目标进度 🎯'];
  for (const g of active) {
    const s = getGoalStatus(g);
    lines.push(
      `${g.emoji} ${g.name}：${fmtCurrency(g.currentAmount)} / ${fmtCurrency(g.targetAmount)}（${s.progressPercent}%）`,
    );
    if (s.estimatedCompletion) {
      lines.push(`  预计 ${dayjs(s.estimatedCompletion).format('M月D日')} 完成${s.onTrack ? ' ✓' : ' ⏳'}`);
    }
  }
  return {
    content: lines.join('\n'),
    intent: 'query_goal',
    entities: {},
  };
}

/* =====================================================================
 * 风险警示
 * ===================================================================== */
function handleRiskWarning(
  text: string,
  risk: { hasRisk: boolean; riskType: string; level: string },
): ChatReply {
  const found = searchKnowledge(text, 1);
  const knowledge = found[0];

  let body: string;
  if (knowledge) {
    body = knowledge.answer;
  } else {
    body =
      `学姐要认真提醒你了⚠️\n\n这看起来涉及"${risk.riskType}"，对学生党来说风险很大：\n• 容易血本无归\n• 影响正常生活和学习\n\n如果想搞钱，可以从兼职、记账、设储蓄目标开始～千万不要冒险！`;
  }

  return {
    content: postProcess(body),
    card: {
      type: 'risk_warning',
      data: { riskType: risk.riskType, level: risk.level, message: body },
    },
    intent: 'risk_warning',
    entities: { risk },
  };
}

/* =====================================================================
 * 知识问答（优先 LLM + RAG，降级本地）
 * ===================================================================== */
async function handleKnowledgeQA(text: string, ctx: ChatContext): Promise<ChatReply> {
  const result = searchKnowledge(text, 2);

  // LLM 可用：用本地知识库作为 RAG 上下文
  if (isLLMAvailable()) {
    const refs = result
      .map((k, i) => `【参考${i + 1}】${k.question}\n${k.answer}`)
      .join('\n\n');
    const extra = [
      '本次为"理财知识问答"场景。',
      '请用小钱学姐口吻、200字以内、1-3个emoji，回答用户的问题。',
      '严禁推荐具体理财产品或平台、严禁给出具体投资建议或预测涨跌。',
      refs ? `下面是站内知识库的相关参考资料，优先基于这些资料回答：\n\n${refs}` : '若问题超出理财范围，可委婉引导回理财话题。',
    ].join('\n');

    const r = await callLLM(text, {
      history: ctx.history,
      extraInstruction: extra,
      temperature: 0.6,
      maxOutputTokens: 400,
    });
    if (r.ok) {
      return {
        content: postProcess(r.text),
        intent: 'knowledge_qa',
        entities: {
          knowledgeId: result[0]?.id,
          related: result[0]?.related,
          source: 'llm',
        },
      };
    }
  }

  // 降级：本地知识库
  if (result.length === 0) {
    return {
      content:
        '这个问题学姐还没研究过呢🤔 不过你可以试试问我：\n• "什么是基金/复利/定投"\n• "校园贷的危害"\n• "怎么开始记账"\n• "什么是52周攒钱法"',
      intent: 'knowledge_qa',
      entities: { source: 'fallback' },
    };
  }
  const entry = result[0];
  return {
    content: postProcess(entry.answer),
    intent: 'knowledge_qa',
    entities: { knowledgeId: entry.id, related: entry.related, source: 'local' },
  };
}

/* =====================================================================
 * 情绪共情（优先 LLM）
 * ===================================================================== */
async function handleEmotion(text: string, ctx: ChatContext): Promise<ChatReply> {
  const monthBudget = checkBudgetStatus(ctx.transactions, ctx.user.monthlyBudget);

  if (isLLMAvailable()) {
    const extra = [
      '本次为"情绪共情"场景，用户心情不太好。',
      '请先共情、再轻量给建议；语气温暖，不说教、不批评、不制造焦虑。',
      '200字以内，1-3个emoji，多用"学姐当年也"、"我懂你"等共情开场。',
      `用户本月预算使用率：${monthBudget.percentage.toFixed(0)}%（仅作参考，不要直接报数字）。`,
    ].join('\n');

    const r = await callLLM(text, {
      history: ctx.history,
      extraInstruction: extra,
      temperature: 0.85,
      maxOutputTokens: 350,
    });
    if (r.ok) {
      return {
        content: postProcess(r.text),
        intent: 'emotion',
        entities: { budgetUsed: monthBudget.percentage, source: 'llm' },
      };
    }
  }

  // 降级：模板共情
  const opener = pickRandom(EMPATHY_OPENERS);
  let body = '';
  if (/月光|没钱/.test(text)) {
    body = `${opener}月光确实让人焦虑😔 其实学姐当年也是这样，每到月底就紧巴巴的。\n\n不过没关系，意识到问题就是改变的开始！要不要一起看看这个月钱都花哪儿了？说"这个月消费"我帮你分析一下📊`;
  } else if (/压力|焦虑/.test(text)) {
    body = `${opener}压力大的时候，深呼吸一下～💛\n\n咱们一步一步来，先记下今天的小开销，或者看看离储蓄目标还有多远？小事情更容易完成哦~`;
  } else {
    body = `${opener}有学姐在呢💛 心情不好的时候，别想着花钱治愈自己（虽然真的很有效😂）。要不要聊聊？或者一起看看这个月的攒钱进度？`;
  }
  return {
    content: body,
    intent: 'emotion',
    entities: { budgetUsed: monthBudget.percentage, source: 'fallback' },
  };
}

/* =====================================================================
 * Fallback（优先 LLM 兜底）
 * ===================================================================== */
async function handleFallback(text: string, ctx: ChatContext): Promise<ChatReply> {
  if (isLLMAvailable()) {
    const extra = [
      '本次是"兜底场景"——用户的话学姐没识别出明确意图。',
      '请猜测用户意图并给出回应；如果与理财无关，温柔地把话题带回记账/攒钱/理财学习。',
      '200字以内，1-3个emoji。如果用户在闲聊，可以简短回应再引导。',
    ].join('\n');
    const r = await callLLM(text, {
      history: ctx.history,
      extraInstruction: extra,
      temperature: 0.8,
      maxOutputTokens: 300,
    });
    if (r.ok) {
      return {
        content: postProcess(r.text),
        intent: 'other',
        entities: { source: 'llm' },
      };
    }
  }
  return {
    content:
      '嗯～学姐没太听懂哎🤔 你可以试试这样：\n• 记账：发"奶茶15"\n• 查消费：说"本周花了多少"\n• 攒钱：说"我想攒3000块"\n• 学知识：问"什么是基金"',
    intent: 'other',
    entities: { source: 'fallback' },
  };
}

/* =====================================================================
 * 后处理：人设风格 + 边界检查
 * ===================================================================== */
function postProcess(text: string): string {
  const styled = applyStyleRules(text);
  const boundary = checkBoundary(styled.fixedText);
  if (boundary.violated) {
    return '这个问题超出了学姐能给的建议范围哦～建议咨询专业的理财师或老师～💛';
  }
  return styled.fixedText;
}

/* =====================================================================
 * 测试辅助：暴露意图标签
 * ===================================================================== */
export { INTENT_LABEL };
