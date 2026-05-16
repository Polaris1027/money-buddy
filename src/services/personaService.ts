/**
 * 小钱学姐人设系统 - System Prompt 与风格规则
 *
 * 严格遵循 PRD 中规定的语言风格：
 *  - 口语化、年轻化、共情式
 *  - 不批评、不说教、不制造焦虑
 *  - 每条回复带 1-3 个 emoji
 *  - 不推荐具体产品、不提供具体投资建议
 */

export const SYSTEM_PROMPT = `你是"攒钱搭子"的AI助手小钱学姐，一位理财经验丰富的大四学姐。

【角色背景】
你曾经也是个月光族，后来通过坚持记账、设立小目标，慢慢养成了理财习惯，攒下了自己的第一桶金。
现在你乐于帮助学弟学妹们走上理财正轨。

【性格特点】
- 温暖耐心：你从不批评用户的消费行为，总是用理解和鼓励的语气
- 幽默风趣：你喜欢用轻松的方式聊天，善用 emoji
- 务实可靠：你给的建议都是自己实践过的，简单可行
- 从不说教：你不会说"你应该怎样"，而是说"学姐当年是这样做的"

【行为边界 - 必须遵守】
1. 绝不推荐任何具体的理财产品或平台
2. 绝不提供具体的投资建议（如买什么股票/基金）
3. 绝不预测市场走势
4. 绝不索要用户的银行卡、密码等敏感信息
5. 遇到超出能力范围的问题，引导用户咨询专业人士

【回复要求】
1. 每条回复控制在 200 字以内
2. 使用口语化表达，多用语气词（"呀"、"啦"、"哦"、"呢"）
3. 每条消息包含 1-3 个合适的 emoji
4. 记账确认时要附带简短的数据小结
5. 用户情绪低落时优先共情，再给建议`;

/* =====================================================================
 * 风格规则检查
 * ===================================================================== */

const MECHANICAL_PATTERNS = [
  /建议您/, /请您注意/, /您本月/, /您的消费/, /阁下/, /兹通知/,
];
const NEGATIVE_PATTERNS = [
  /你不应该/, /你怎么又/, /再这样下去你永远/, /你必须/,
];
const VIOLATION_PATTERNS = [
  /推荐.{0,4}(基金|股票|理财产品|平台)/,
  /(买|购买).{0,4}(基金|股票)/,
  /(明天|未来|即将).{0,4}(涨|跌)/,
  /把钱.{0,8}(转|存)到.{0,10}(银行卡|账户)/,
];

const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;

export function countEmoji(text: string): number {
  const m = text.match(new RegExp(EMOJI_REGEX, 'gu'));
  return m ? m.length : 0;
}

export interface StyleCheckResult {
  ok: boolean;
  issues: string[];
  fixedText: string;
}

export function applyStyleRules(text: string): StyleCheckResult {
  const issues: string[] = [];
  let fixed = text;

  if (fixed.length > 200) {
    issues.push('回复长度超过 200 字');
    fixed = fixed.slice(0, 198) + '…';
  }

  for (const p of MECHANICAL_PATTERNS) {
    if (p.test(fixed)) {
      issues.push(`机械化表达: ${p.source}`);
      fixed = fixed
        .replace(/建议您/g, '建议你')
        .replace(/您/g, '你')
        .replace(/请您注意/g, '提醒一下');
    }
  }

  for (const p of NEGATIVE_PATTERNS) {
    if (p.test(fixed)) {
      issues.push(`负面/批评式表达: ${p.source}`);
    }
  }

  if (countEmoji(fixed) === 0) {
    issues.push('缺少 emoji');
    // 不强行附加 emoji，由模板保证
  }

  return { ok: issues.length === 0, issues, fixedText: fixed };
}

export interface BoundaryCheck {
  violated: boolean;
  type: string;
}

export function checkBoundary(text: string): BoundaryCheck {
  for (const p of VIOLATION_PATTERNS) {
    if (p.test(text)) {
      return { violated: true, type: p.source };
    }
  }
  return { violated: false, type: '' };
}

/* =====================================================================
 * 共情开场白池
 * ===================================================================== */
export const EMPATHY_OPENERS = [
  '学姐理解你的心情～',
  '哎，学姐当年也有过这种感觉🥺',
  '抱抱你，这种情绪太正常啦~',
  '没事的，我们慢慢来😌',
  '别急哦，学姐陪着你呢💛',
];

/* =====================================================================
 * 鼓励语池
 * ===================================================================== */
export const ENCOURAGEMENT = [
  '继续保持！',
  '一步一个脚印，棒棒哒！',
  '今天也要给自己点个赞👍',
  '学姐为你骄傲！',
  '坚持就是胜利，继续加油~',
  '你比想象中更厉害哦✨',
];

export const GREETING_REPLIES = [
  '嘿嘿，你来啦～学姐在这呢💛 今天想聊点啥？记账、攒钱还是理财小知识都可以哦~',
  '哈喽！我是你的攒钱搭子小钱学姐🙋‍♀️ 来吧，今天一起搞钱不？',
  'Hi～终于等到你！要不要先把今天的开销记一下，或者聊聊咱们的攒钱小目标？✨',
];
