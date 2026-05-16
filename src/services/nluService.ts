import type { Category, Intent, ParsedIntent, IncomeSource } from '@/types';
import { extractChineseNumber, parseChineseNumber } from '@/utils/chineseNumber';

/**
 * 分类匹配优先级（更具体的在前面）。
 * 仅用于 inferCategory，保证"蔬菜/水果/零食"先于宽泛的"餐饮"被命中。
 */
const CATEGORY_PRIORITY: Category[] = [
  'vegetable',
  'fruit',
  'snack',
  'food',
  'sport',
  'communication',
  'housing',
  'travel',
  'pet',
  'gift',
  'clothing',
  'medical',
  'transport',
  'shopping',
  'entertainment',
  'study',
  'other',
];

/* =====================================================================
 * 分类关键词映射（基于 PRD 规则）
 *
 * 顺序很重要：先匹配更具体的分类（蔬菜/水果/零食），再匹配宽泛的（餐饮/购物）。
 * ===================================================================== */
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  // 更具体的食物子类放前面
  vegetable: ['蔬菜', '青菜', '白菜', '土豆', '番茄', '黄瓜', '茄子', '萝卜', '芹菜', '菠菜', '生菜'],
  fruit: ['水果', '苹果', '香蕉', '草莓', '西瓜', '葡萄', '橙子', '橘子', '梨', '桃', '芒果', '蓝莓', '车厘子', '榴莲'],
  snack: ['零食', '薯片', '巧克力', '糖果', '饼干', '辣条', '坚果', '瓜子', '面包', '蛋糕', '甜品', '冰淇淋'],
  food: [
    '午饭', '早饭', '早餐', '午餐', '晚饭', '晚餐', '夜宵', '外卖',
    '奶茶', '咖啡', '食堂', '吃饭', '聚餐', '火锅', '烧烤', '麦当劳', '肯德基',
    '星巴克', '瑞幸', '蜜雪', '喜茶', '点餐', '炸鸡', '披萨', '米饭', '面条', '饺子', '包子',
  ],
  sport: ['健身', '健身房', '跑步', '瑜伽', '游泳', '羽毛球', '篮球', '足球', '乒乓球', '运动', '球鞋', '私教', '球场'],
  communication: ['话费', '流量', '电话费', '宽带', '网费', 'wifi', '手机费', '充话费', '通讯', '电信', '移动', '联通'],
  housing: ['房租', '租房', '水电', '水费', '电费', '物业', '物业费', '燃气', '煤气', '住宿', '住房', '宿舍'],
  travel: ['机票', '高铁', '火车票', '酒店', '住宿', '旅游', '旅行', '景点', '门票', '出差', '度假', '民宿'],
  pet: ['宠物', '猫粮', '狗粮', '猫砂', '宠物医院', '疫苗', '驱虫', '猫', '狗', '仓鼠', '兔子'],
  gift: ['礼物', '生日礼物', '红包', '送礼', '伴手礼', '鲜花', '贺卡'],
  clothing: ['衣服', '裤子', '裙子', '鞋子', '外套', '内衣', '袜子', '帽子', '围巾', '服饰', '搭配', '配饰'],
  medical: ['医院', '看病', '药', '药品', '挂号', '体检', '检查', '医疗', '感冒', '发烧', '诊所', '牙医'],
  transport: ['打车', '地铁', '公交', '滴滴', '加油', '油费', '停车', '共享单车', '哈啰', '出租车', '路费'],
  shopping: ['淘宝', '京东', '拼多多', '购物', '化妆品', '护肤', '快递', '日用', '生活用品', '电器', '数码'],
  entertainment: ['电影', '游戏', 'KTV', '演唱会', '剧本杀', '密室', '游乐园', '酒吧', '蹦迪', '会员', 'b站', '腾讯视频', '爱奇艺', '网飞', '充值'],
  study: ['书', '课程', '文具', '打印', '复印', '笔记本', '教材', '考试', '报名', 'kindle', '辅导', '网课', '培训'],
  other: [],
};

/* =====================================================================
 * 风险关键词
 * ===================================================================== */
export const RISK_KEYWORDS: Record<string, { type: string; level: 'high' | 'mid' }> = {
  校园贷: { type: '非法借贷', level: 'high' },
  借贷: { type: '非法借贷', level: 'high' },
  网贷: { type: '非法借贷', level: 'high' },
  套现: { type: '非法借贷', level: 'high' },
  稳赚: { type: '投资骗局', level: 'high' },
  保本: { type: '投资骗局', level: 'high' },
  高收益: { type: '投资骗局', level: 'high' },
  内幕: { type: '投资骗局', level: 'high' },
  大V: { type: '荐股陷阱', level: 'mid' },
  跟单: { type: '荐股陷阱', level: 'mid' },
  带飞: { type: '荐股陷阱', level: 'mid' },
  荐股: { type: '荐股陷阱', level: 'mid' },
  炒股: { type: '高风险投资', level: 'mid' },
  炒币: { type: '高风险投资', level: 'high' },
  杠杆: { type: '高风险投资', level: 'high' },
  借钱投资: { type: '风险放大', level: 'high' },
  借钱炒股: { type: '风险放大', level: 'high' },
};

/* =====================================================================
 * 收入关键词
 *
 * - INCOME_TRIGGER：触发"这是一笔收入"判定的关键词
 * - INCOME_SOURCE_KEYWORDS：把文本映射到具体的来源分类
 * ===================================================================== */

/** 强收入信号词（命中则一定是收入） */
const INCOME_STRONG_VERBS = [
  '到账', '入账', '收到', '收入', '进账', '到手', '发了', '发下来',
  '打过来', '转给我', '转过来', '给我转', '到了',
];

/** 收入名词（命中后还需要有金额或动词） */
const INCOME_NOUNS = [
  '工资', '薪水', '薪资', '月薪', '日薪', '时薪',
  '兼职', '兼职费', '实习费', '实习工资',
  '奖学金', '助学金', '补助', '补贴',
  '生活费', '零花钱', '压岁钱',
  '红包', '礼金',
  '稿费', '稿酬', '版税', '提成', '佣金', '奖金',
  '分红', '利息', '收益', '理财收益', '基金收益',
  '退款', '报销', '返现', '返利',
];

/** "把工资记入收入" / "记一笔收入" 这种显式声明 */
const INCOME_EXPLICIT = [
  '记入收入', '计入收入', '收入账', '记一笔收入', '记一条收入', '录入收入',
];

/** 来源关键词映射（顺序很重要：先具体后宽泛） */
const INCOME_SOURCE_KEYWORDS: Array<[IncomeSource, string[]]> = [
  ['parttime', ['兼职', '实习', '家教', '外快', '打工', '零工', '日结', '稿费', '稿酬', '版税', '提成', '佣金']],
  ['scholarship', ['奖学金', '助学金', '补助', '补贴', '奖金']],
  ['allowance', ['工资', '薪水', '薪资', '月薪', '日薪', '时薪', '生活费', '零花钱']],
  ['redpacket', ['红包', '压岁钱', '礼金']],
  ['investment', ['理财收益', '基金收益', '分红', '利息', '收益']],
  ['refund', ['退款', '报销', '返现', '返利']],
  ['other', []],
];

export function inferIncomeSource(text: string): IncomeSource {
  for (const [src, kws] of INCOME_SOURCE_KEYWORDS) {
    if (kws.some((k) => text.includes(k))) return src;
  }
  return 'other';
}

/**
 * 判断是否是"收入"语义
 * 规则：
 *  - 命中 INCOME_EXPLICIT（显式声明）→ true
 *  - 命中 INCOME_STRONG_VERBS（如"到账/收到"）→ true
 *  - 命中 INCOME_NOUNS（如"工资/兼职"）且不含明显消费动词 → true
 */
export function isIncomeIntent(text: string): boolean {
  const t = text;

  // 显式声明
  if (INCOME_EXPLICIT.some((k) => t.includes(k))) return true;

  // 强动词
  if (INCOME_STRONG_VERBS.some((k) => t.includes(k))) {
    return true;
  }

  // 收入名词 + 金额（且没有明显消费动词）
  const hasIncomeNoun = INCOME_NOUNS.some((k) => t.includes(k));
  if (hasIncomeNoun) {
    // 排除消费动词，避免"给爸妈的礼金500"被误判
    const SPEND_VERBS = /(花|买|付|交|送|给).{0,3}(\d|[¥￥两一二三四五六七八九十百千万])|花了|付了|交了|送了/;
    if (!SPEND_VERBS.test(t)) {
      return true;
    }
  }
  return false;
}

/* =====================================================================
 * 实体提取
 * ===================================================================== */

/**
 * 从文本中提取金额。
 * 支持：
 *   - 阿拉伯数字："15"、"15块"、"15.5元"、"￥18"、"¥18"、"15块5"
 *   - 中文数字："两千"、"一千五"、"三千八百"、"一万二"、"十万"、"五十块"
 * 返回 -1 表示未识别。
 */
export function extractAmount(text: string): number {
  // 1. "15块5"、"15元5" → 15.5
  const cnFraction = text.match(/(\d+)\s*[块元]\s*(\d)\b/);
  if (cnFraction) {
    return parseFloat(`${cnFraction[1]}.${cnFraction[2]}`);
  }
  // 2. 纯数字+单位 / 货币符号
  const m = text.match(
    /(?:[¥￥$])\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:元|块|RMB|rmb|人民币)/,
  );
  if (m) {
    const v = m[1] || m[2];
    if (v) return parseFloat(v);
  }
  // 3. 中文数字（支持 两千 / 一千五 / 三千八百 / 一万二 / 十万 等）
  //    必须含中文数字字符且通常带单位（元/块/万）或上下文动词
  const cnMatch = text.match(
    /([零〇一壹二贰两俩三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万萬亿億]+)\s*(?:元|块|万|w)?/,
  );
  if (cnMatch) {
    // 先尝试直接解析整个中文片段（含"万"等单位）
    const directVal = parseChineseNumber(cnMatch[1]);
    if (!Number.isNaN(directVal) && directVal > 0) {
      // "X万" 单独处理（如"两万" 已在 parseChineseNumber 处理）
      // 兼容"两万w"这种乱写
      const tail = cnMatch[0].slice(cnMatch[1].length).trim();
      if (tail === '万' || tail === 'w' || tail === 'W') {
        return directVal * 10000;
      }
      return directVal;
    }
    // 兜底：抽取中文数字
    const cnVal = extractChineseNumber(text);
    if (!Number.isNaN(cnVal) && cnVal > 0) return cnVal;
  }
  // 4. 中文/上下文 + 数字（如 "午饭15"、"存了50"、"花了18"）
  const m2 = text.match(/(?:[\u4e00-\u9fa5a-zA-Z\s]|^)(\d+(?:\.\d+)?)(?=\D|$)/);
  if (m2 && /\D/.test(text)) {
    return parseFloat(m2[1]);
  }
  // 5. 纯数字本身视为金额（短文本）
  if (/^\d+(\.\d+)?$/.test(text.trim())) {
    return parseFloat(text.trim());
  }
  return -1;
}

/**
 * 根据文本推断分类
 */
export function inferCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const cat of CATEGORY_PRIORITY) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return 'other';
}

/**
 * 提取备注（去掉金额和单位）
 */
export function extractNote(text: string): string {
  return text
    .replace(/[¥￥$]\s*\d+(\.\d+)?/g, '')
    .replace(/\d+(\.\d+)?\s*(?:元|块)\s*\d?/g, '')
    .replace(/\d+(\.\d+)?/g, '')
    // 去除中文数字片段及紧随单位
    .replace(/[零〇一壹二贰两俩三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万萬亿億]+\s*(?:元|块|万|w|W)?/g, '')
    .replace(/花了|付了|花费|用了|消费|想攒|要攒|攒|存了|今天存|存/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

/* =====================================================================
 * 意图识别
 * ===================================================================== */

const GREETING_KEYWORDS = ['你好', 'hi', 'hello', '在吗', '在么', '嗨', '哈喽'];
const QUERY_KEYWORDS = [
  '花了多少', '花多少', '消费', '账单', '支出', '本周花', '这周花', '本月花',
  '这个月花', '今天花', '今日花', '统计', '看看花',
];
const GOAL_CREATE_KEYWORDS = [
  '想攒', '我要攒', '攒钱', '存钱', '存够', '想存', '攒够', '目标',
];
const CHECKIN_KEYWORDS = ['存了', '今天存', '今日存', '打卡', '存入'];
const KNOWLEDGE_PATTERNS = [
  /什么是/, /怎么样/, /安全吗/, /可靠吗/, /如何/, /怎么/, /^.{0,8}是什么$/,
  /区别/, /推荐/, /好不好/, /值得/,
];
const EMOTION_KEYWORDS = [
  '难过', '焦虑', '烦', '崩溃', '月光', '没钱', '心疼', '后悔', '伤心',
  '压力', '丧', '麻了', '抑郁',
];
const GOAL_QUERY_KEYWORDS = ['进度', '攒了多少', '存了多少', '我的目标', '看目标'];

/** 撤销最近一笔 */
const UNDO_KEYWORDS = [
  '撤销', '撤回', '删掉刚才', '删了刚才', '删除刚才', '删了那条', '删除上一笔',
  '取消上一笔', '取消刚才', '撤销上一笔', '删除最后一笔', '不要刚才那条',
];

/** 修改最近一笔（纠错信号） */
const MODIFY_KEYWORDS = [
  '不对', '不是', '错了', '搞错了', '说错了', '记错了', '弄错了', '搞错',
  '改正', '改成', '应该是', '其实是', '修改', '更正', '纠正', '重新记',
];

/** 修改预算 */
const BUDGET_KEYWORDS = ['预算', '月预算', '可支配'];

export function detectRisk(
  text: string,
): { hasRisk: boolean; riskType: string; level: 'high' | 'mid' | 'none' } {
  for (const [kw, info] of Object.entries(RISK_KEYWORDS)) {
    if (text.includes(kw)) {
      return { hasRisk: true, riskType: info.type, level: info.level };
    }
  }
  return { hasRisk: false, riskType: '', level: 'none' };
}

export function parseIntent(text: string): ParsedIntent {
  const t = text.trim();
  const lower = t.toLowerCase();

  // 1. 风险检测优先
  const risk = detectRisk(t);

  // 1.5 撤销最近一笔（强信号）
  if (UNDO_KEYWORDS.some((k) => t.includes(k))) {
    return { intent: 'undo_transaction', confidence: 0.95, entities: {} };
  }

  // 1.55 修改预算（信号：含"预算/月预算/可支配" + 修改/数字）
  const hasBudgetWord = BUDGET_KEYWORDS.some((k) => t.includes(k));
  if (hasBudgetWord) {
    const amt = extractAmount(t);
    return {
      intent: 'update_budget',
      confidence: 0.92,
      entities: { newBudget: amt > 0 ? amt : undefined },
    };
  }

  // 1.6 修改最近一笔（纠错信号）
  //     "不对 租房是两千五" / "改成2500" / "其实是50元" / "我说错了，是奶茶12"
  const hasModifySignal = MODIFY_KEYWORDS.some((k) => t.includes(k));
  if (hasModifySignal) {
    const amt = extractAmount(t);
    return {
      intent: 'modify_transaction',
      confidence: 0.9,
      entities: {
        amount: amt > 0 ? amt : undefined,
        category: inferCategory(t),
        note: extractNote(t),
        rawText: t,
      },
    };
  }

  // 2. 问候
  if (GREETING_KEYWORDS.some((k) => lower.includes(k.toLowerCase())) && t.length <= 8) {
    return { intent: 'greeting', confidence: 0.9, entities: {} };
  }

  // 3. 情绪
  if (EMOTION_KEYWORDS.some((k) => t.includes(k))) {
    return { intent: 'emotion', confidence: 0.85, entities: {} };
  }

  // 4. 储蓄目标查询
  if (GOAL_QUERY_KEYWORDS.some((k) => t.includes(k))) {
    return { intent: 'query_goal', confidence: 0.85, entities: {} };
  }

  // 5. 储蓄目标创建
  if (GOAL_CREATE_KEYWORDS.some((k) => t.includes(k)) && extractAmount(t) > 0) {
    return {
      intent: 'create_goal',
      confidence: 0.9,
      entities: { amount: extractAmount(t), note: extractNote(t) },
    };
  }
  if (GOAL_CREATE_KEYWORDS.some((k) => t.includes(k))) {
    return { intent: 'create_goal', confidence: 0.7, entities: {} };
  }

  // 6. 打卡
  if (CHECKIN_KEYWORDS.some((k) => t.includes(k)) && extractAmount(t) > 0) {
    return {
      intent: 'checkin',
      confidence: 0.9,
      entities: { amount: extractAmount(t) },
    };
  }

  // 7. 查询消费
  if (QUERY_KEYWORDS.some((k) => t.includes(k))) {
    let period: 'day' | 'week' | 'month' = 'day';
    if (t.includes('周')) period = 'week';
    else if (t.includes('月')) period = 'month';
    else if (t.includes('今天') || t.includes('今日')) period = 'day';
    return { intent: 'query_transaction', confidence: 0.85, entities: { period } };
  }

  // 7.5 收入识别（必须在消费记账之前判定）
  //     "工资5000到账"、"收到生活费2000"、"兼职300"、"把5000记入收入" 等
  if (isIncomeIntent(t)) {
    const amt = extractAmount(t);
    if (amt > 0) {
      return {
        intent: 'add_income',
        confidence: 0.92,
        entities: {
          amount: amt,
          source: inferIncomeSource(t),
          note: extractIncomeNote(t),
        },
      };
    }
    // 没金额时也判定为收入意图（让上层追问），避免落到 add_transaction
    return {
      intent: 'add_income',
      confidence: 0.7,
      entities: { source: inferIncomeSource(t) },
    };
  }

  // 8. 记账（含金额，但不是查询/目标/打卡/收入）
  const amount = extractAmount(t);
  if (amount > 0 && t.length <= 50) {
    return {
      intent: 'add_transaction',
      confidence: 0.8,
      entities: {
        amount,
        category: inferCategory(t),
        note: extractNote(t),
      },
    };
  }

  // 9. 风险问题
  if (risk.hasRisk) {
    return {
      intent: 'risk_warning',
      confidence: 0.95,
      entities: { riskType: risk.riskType, level: risk.level },
    };
  }

  // 10. 知识问答
  if (KNOWLEDGE_PATTERNS.some((p) => p.test(t)) || t.length > 6) {
    return { intent: 'knowledge_qa', confidence: 0.6, entities: { question: t } };
  }

  return { intent: 'other', confidence: 0.3, entities: {} };
}

/**
 * 提取收入备注：去掉金额、单位与"到账/收到/记入收入"等动词
 */
export function extractIncomeNote(text: string): string {
  return text
    .replace(/[¥￥$]\s*\d+(\.\d+)?/g, '')
    .replace(/\d+(\.\d+)?\s*(?:元|块)\s*\d?/g, '')
    .replace(/\d+(\.\d+)?/g, '')
    .replace(/[零〇一壹二贰两俩三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万萬亿億]+\s*(?:元|块|万|w|W)?/g, '')
    .replace(
      /到账|入账|收到|进账|到手|发了|发下来|打过来|转给我|转过来|给我转|到了|记入收入|计入收入|收入账|记一笔收入|记一条收入|录入收入|收入/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

/**
 * 简化的意图标签映射（用于UI展示和测试）
 */
export const INTENT_LABEL: Record<Intent, string> = {
  add_transaction: '记账',
  modify_transaction: '修改记账',
  undo_transaction: '撤销记账',
  undo_last: '撤销误记',
  query_transaction: '查询消费',
  add_income: '记一笔收入',
  query_income: '查询收入',
  create_goal: '创建目标',
  checkin: '打卡存钱',
  query_goal: '查看目标',
  update_budget: '修改预算',
  update_profile: '修改资料',
  knowledge_qa: '理财问答',
  risk_warning: '风险警示',
  greeting: '问候',
  emotion: '情绪共情',
  onboarding_answer: '引导回答',
  other: '其他',
};
