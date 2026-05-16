// 用户相关
export type Grade = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate';

/**
 * 用户性别 / 头像形象
 *  - girl    女生款（双马尾、粉色发饰）
 *  - boy     男生款（短发、蓝色卫衣）
 *  - neutral 中性款（默认，圆脸表情包风格）
 */
export type Gender = 'girl' | 'boy' | 'neutral';

export interface UserProfile {
  userId: string;
  nickname: string;
  grade: Grade | null;
  /** 性别 / 头像风格，影响聊天气泡里的拟人头像 */
  gender: Gender;
  monthlyBudget: number;
  /** 年度预算；为 0 或未设置时默认 = monthlyBudget × 12 */
  yearlyBudget?: number;
  preferences: {
    primaryConcern?: 'overspend' | 'noMotivation' | 'noIdea' | 'other';
    onboarded: boolean;
  };
  createdAt: number;
}

// 消费记录
export type Category =
  | 'food'
  | 'shopping'
  | 'transport'
  | 'vegetable'
  | 'fruit'
  | 'snack'
  | 'sport'
  | 'entertainment'
  | 'communication'
  | 'housing'
  | 'travel'
  | 'study'
  | 'pet'
  | 'gift'
  | 'clothing'
  | 'medical'
  | 'other';

export const CATEGORY_LABEL: Record<Category, string> = {
  food: '餐饮',
  shopping: '购物',
  transport: '交通',
  vegetable: '蔬菜',
  fruit: '水果',
  snack: '零食',
  sport: '运动',
  entertainment: '娱乐',
  communication: '通讯',
  housing: '住房',
  travel: '旅行',
  study: '学习',
  pet: '宠物',
  gift: '礼物',
  clothing: '服饰',
  medical: '医疗',
  other: '其他',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  food: '🍚',
  shopping: '🛍️',
  transport: '🚌',
  vegetable: '🥬',
  fruit: '🍎',
  snack: '🍿',
  sport: '⚽',
  entertainment: '🎮',
  communication: '📱',
  housing: '🏠',
  travel: '✈️',
  study: '📚',
  pet: '🐾',
  gift: '🎁',
  clothing: '👗',
  medical: '💊',
  other: '💡',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  food: '#FF8A65',
  shopping: '#BA68C8',
  transport: '#4FC3F7',
  vegetable: '#81C784',
  fruit: '#E57373',
  snack: '#FFD54F',
  sport: '#4DB6AC',
  entertainment: '#FFB74D',
  communication: '#7E57C2',
  housing: '#8D6E63',
  travel: '#26A69A',
  study: '#7986CB',
  pet: '#A1887F',
  gift: '#F06292',
  clothing: '#9575CD',
  medical: '#EF5350',
  other: '#90A4AE',
};

/** 所有分类有序列表（用于 UI 渲染） */
export const ALL_CATEGORIES: Category[] = [
  'food',
  'shopping',
  'transport',
  'vegetable',
  'fruit',
  'snack',
  'sport',
  'entertainment',
  'communication',
  'housing',
  'travel',
  'study',
  'pet',
  'gift',
  'clothing',
  'medical',
  'other',
];

export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  category: Category;
  note: string;
  source: 'manual' | 'screenshot' | 'notification';
  transactionDate: string; // YYYY-MM-DD
  createdAt: number;
}

/* ============================================================
 * 收入相关
 * ============================================================ */

/** 收入来源分类 */
export type IncomeSource =
  | 'allowance'    // 生活费 / 父母转账
  | 'parttime'     // 兼职 / 实习
  | 'scholarship'  // 奖学金 / 助学金
  | 'redpacket'    // 红包 / 礼金
  | 'investment'   // 理财收益
  | 'refund'       // 报销 / 退款
  | 'other';       // 其他

export const INCOME_SOURCE_LABEL: Record<IncomeSource, string> = {
  allowance: '生活费',
  parttime: '兼职',
  scholarship: '奖学金',
  redpacket: '红包',
  investment: '理财收益',
  refund: '报销退款',
  other: '其他',
};

export const INCOME_SOURCE_EMOJI: Record<IncomeSource, string> = {
  allowance: '💵',
  parttime: '💼',
  scholarship: '🏆',
  redpacket: '🧧',
  investment: '📈',
  refund: '↩️',
  other: '✨',
};

export const INCOME_SOURCE_COLOR: Record<IncomeSource, string> = {
  allowance: '#66BB6A',
  parttime: '#26A69A',
  scholarship: '#FFCA28',
  redpacket: '#EF5350',
  investment: '#42A5F5',
  refund: '#AB47BC',
  other: '#90A4AE',
};

export const ALL_INCOME_SOURCES: IncomeSource[] = [
  'allowance',
  'parttime',
  'scholarship',
  'redpacket',
  'investment',
  'refund',
  'other',
];

export interface Income {
  incomeId: string;
  userId: string;
  amount: number;
  source: IncomeSource;
  note: string;
  /** YYYY-MM-DD */
  incomeDate: string;
  createdAt: number;
}

// 储蓄目标
export type GoalStatus = 'active' | 'completed' | 'abandoned';
export type PlanType = 'average' | 'incremental' | 'custom';

export interface SavingGoal {
  goalId: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  status: GoalStatus;
  planType: PlanType;
  createdAt: number;
}

export interface CheckIn {
  checkinId: string;
  goalId: string;
  userId: string;
  amount: number;
  createdAt: number;
}

// 对话
export type MessageRole = 'user' | 'assistant';

export type CardType =
  | 'transaction'
  | 'income'
  | 'summary'
  | 'goal_progress'
  | 'goal_create'
  | 'risk_warning'
  | 'milestone'
  | 'onboarding'
  | 'options';

export interface OptionItem {
  label: string;
  value: string;
}

export interface MessageCard {
  type: CardType;
  data: Record<string, any>;
}

export interface ChatMessage {
  messageId: string;
  role: MessageRole;
  content: string;
  intent?: Intent;
  entities?: Record<string, any>;
  card?: MessageCard;
  options?: OptionItem[]; // 快捷选项
  /** 该回复的来源：agent（LLM工作流）/ rules（规则引擎） */
  source?: 'agent' | 'rules';
  createdAt: number;
}

// 意图
export type Intent =
  | 'add_transaction'
  | 'modify_transaction'
  | 'undo_transaction'
  | 'undo_last'
  | 'query_transaction'
  | 'add_income'
  | 'query_income'
  | 'create_goal'
  | 'checkin'
  | 'query_goal'
  | 'update_budget'
  | 'update_profile'
  | 'knowledge_qa'
  | 'risk_warning'
  | 'greeting'
  | 'emotion'
  | 'onboarding_answer'
  | 'other';

export interface ParsedIntent {
  intent: Intent;
  confidence: number;
  entities: Record<string, any>;
}

// 里程碑
export interface Milestone {
  threshold: number;
  name: string;
  emoji: string;
  message: string;
}

/* ============================================================
 * 模块7：理财搭子社区
 * ============================================================ */

/** 好友（本地模拟，预留后端对接结构） */
export interface Friend {
  friendId: string;
  nickname: string;
  gender: Gender;
  /** emoji 头像 */
  avatar: string;
  /** AI 模拟性格标签，仅本地版使用 */
  persona?: 'thrifty' | 'spender' | 'lazy' | 'expert' | 'casual';
  addedAt: number;
}

/** 房间类型：一起攒钱 / 记账 PK / 监督消费 */
export type RoomType = 'save_together' | 'pk_checkin' | 'supervise_spend';

export interface Room {
  roomId: string;
  type: RoomType;
  name: string;
  emoji: string;
  /** 创建者 userId（自己时存真实 userId） */
  creatorId: string;
  /** 成员 id 列表，第一个为创建者；本人 id 用 'me' 占位 */
  memberIds: string[];
  /** save_together: 共同目标金额 */
  targetAmount?: number;
  /** YYYY-MM-DD：截止日期（save_together / pk_checkin） */
  deadline?: string;
  /** supervise_spend: 每日预算（旧字段，保留以兼容历史数据，新逻辑使用 categoryBudgets） */
  dailyBudget?: number;
  /** supervise_spend: 各消费分类的每日预算（仅包含已设置的分类） */
  categoryBudgets?: Partial<Record<Category, number>>;
  /** pk_checkin: 挑战的连续天数目标 */
  challengeDays?: number;
  active: boolean;
  createdAt: number;
}

export type RoomEventType =
  | 'join'
  | 'checkin' // 记账打卡 / 攒钱打卡
  | 'spend'   // 监督消费中的消费记录
  | 'milestone'
  | 'warning' // 超支警告
  | 'cheer'   // 加油打气
  | 'chat';

export interface RoomEvent {
  eventId: string;
  roomId: string;
  /** 触发者：'me' 或 friendId */
  userId: string;
  type: RoomEventType;
  amount?: number;
  note?: string;
  createdAt: number;
}
