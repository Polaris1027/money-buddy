/**
 * 社区服务层 - 理财搭子模块
 *
 * 当前为本地模拟版：好友与房间数据通过 localStorage 持久化（store 层处理），
 * 并通过定时器模拟好友行为（打卡、消费、加油等）。
 *
 * 数据结构与函数签名预留了后端接口对接位置：
 *   - listRecommendedFriends -> GET /community/friends/recommend
 *   - simulateFriendActivity 在接入真实后端后会被 WebSocket 推送替代
 */
import type { Category, Friend, Room, RoomEvent, RoomType, Transaction } from '@/types';
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '@/types';
import dayjs from 'dayjs';

/* ----------------------- 内置模拟好友 ----------------------- */

export const RECOMMENDED_FRIENDS: Omit<Friend, 'friendId' | 'addedAt'>[] = [
  {
    nickname: '小张学霸',
    gender: 'boy',
    avatar: '🤓',
    persona: 'thrifty',
  },
  {
    nickname: '阿美',
    gender: 'girl',
    avatar: '💁‍♀️',
    persona: 'spender',
  },
  {
    nickname: '阿杰',
    gender: 'boy',
    avatar: '🧑',
    persona: 'lazy',
  },
  {
    nickname: '晓晓',
    gender: 'girl',
    avatar: '👩‍🎓',
    persona: 'expert',
  },
  {
    nickname: '大伟',
    gender: 'boy',
    avatar: '🧔',
    persona: 'casual',
  },
  {
    nickname: '糖糖',
    gender: 'girl',
    avatar: '🥰',
    persona: 'casual',
  },
];

export function listRecommendedFriends(existing: Friend[]): typeof RECOMMENDED_FRIENDS {
  const taken = new Set(existing.map((f) => f.nickname));
  return RECOMMENDED_FRIENDS.filter((f) => !taken.has(f.nickname));
}

/* ----------------------- 房间类型元信息 ----------------------- */

export interface RoomTypeMeta {
  type: RoomType;
  label: string;
  emoji: string;
  desc: string;
  /** 主色（tailwind class 前缀，便于卡片着色） */
  color: 'pink' | 'amber' | 'sky';
}

export const ROOM_TYPE_META: Record<RoomType, RoomTypeMeta> = {
  save_together: {
    type: 'save_together',
    label: '一起攒钱',
    emoji: '💰',
    desc: '邀请好友共同冲刺一个攒钱目标',
    color: 'pink',
  },
  pk_checkin: {
    type: 'pk_checkin',
    label: '记账PK',
    emoji: '🏆',
    desc: '比拼连续记账天数，最强自律王是谁',
    color: 'amber',
  },
  supervise_spend: {
    type: 'supervise_spend',
    label: '监督消费',
    emoji: '👀',
    desc: '为不同消费分类设定每日上限，超支立刻提醒',
    color: 'sky',
  },
};

/* ----------------------- 房间数据计算 ----------------------- */

/**
 * 计算"一起攒钱"房间总进度（包括我和好友贡献之和）
 */
export function calcSaveTogetherProgress(
  room: Room,
  events: RoomEvent[],
): {
  total: number;
  percent: number;
  byUser: Record<string, number>;
} {
  const evs = events.filter((e) => e.roomId === room.roomId && e.type === 'checkin');
  const byUser: Record<string, number> = {};
  let total = 0;
  for (const ev of evs) {
    const a = ev.amount ?? 0;
    byUser[ev.userId] = (byUser[ev.userId] ?? 0) + a;
    total += a;
  }
  const target = room.targetAmount ?? 0;
  const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  return { total, percent, byUser };
}

/**
 * 计算"记账PK"房间排行榜（连续天数）
 *  - 我自己的连续天数：根据 transactions 计算
 *  - 好友连续天数：根据房间事件 checkin（每天最多 1 条）累计连续天数
 */
export function calcPkRanking(
  room: Room,
  events: RoomEvent[],
  myTransactions: Transaction[],
  friends: Friend[],
): { userId: string; nickname: string; avatar: string; days: number; isMe: boolean }[] {
  // 我的连续天数
  const myDays = calcMyStreak(myTransactions);

  // 好友的连续天数：从最近一天往回数，连续出现 checkin 的天数
  function friendStreak(friendId: string): number {
    const days = new Set(
      events
        .filter(
          (e) => e.roomId === room.roomId && e.userId === friendId && e.type === 'checkin',
        )
        .map((e) => dayjs(e.createdAt).format('YYYY-MM-DD')),
    );
    let streak = 0;
    let cursor = dayjs();
    // 允许"今天还没打卡但昨天打了"也算连续
    if (!days.has(cursor.format('YYYY-MM-DD'))) {
      cursor = cursor.subtract(1, 'day');
    }
    while (days.has(cursor.format('YYYY-MM-DD'))) {
      streak += 1;
      cursor = cursor.subtract(1, 'day');
    }
    return streak;
  }

  const list: { userId: string; nickname: string; avatar: string; days: number; isMe: boolean }[] = [
    {
      userId: 'me',
      nickname: '我',
      avatar: '🙋',
      days: myDays,
      isMe: true,
    },
  ];

  for (const fid of room.memberIds) {
    if (fid === 'me') continue;
    const f = friends.find((x) => x.friendId === fid);
    if (!f) continue;
    list.push({
      userId: f.friendId,
      nickname: f.nickname,
      avatar: f.avatar,
      days: friendStreak(f.friendId),
      isMe: false,
    });
  }

  list.sort((a, b) => b.days - a.days);
  return list;
}

/**
 * 我自己的最近连续记账天数（根据 transactions）
 */
export function calcMyStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  const days = new Set(transactions.map((t) => t.transactionDate));
  let streak = 0;
  let cursor = dayjs();
  if (!days.has(cursor.format('YYYY-MM-DD'))) {
    cursor = cursor.subtract(1, 'day');
  }
  while (days.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'day');
  }
  return streak;
}

/**
 * 计算"监督消费"房间今日数据（兼容旧字段）
 */
export function calcSuperviseToday(
  room: Room,
  myTransactions: Transaction[],
): { spent: number; budget: number; remain: number; over: boolean } {
  const today = dayjs().format('YYYY-MM-DD');
  const spent = myTransactions
    .filter((t) => t.transactionDate === today)
    .reduce((s, t) => s + t.amount, 0);
  const budget = room.dailyBudget ?? 0;
  const remain = budget - spent;
  return { spent, budget, remain, over: spent > budget && budget > 0 };
}

/* ----------------------- 监督消费：分类预算 ----------------------- */

export interface CategoryBudgetStatus {
  category: Category;
  label: string;
  emoji: string;
  budget: number;
  spent: number;
  remain: number;
  /** 0~100+；budget 为 0 时返回 0 */
  percent: number;
  over: boolean;
}

export interface SuperviseByCategoryResult {
  categories: CategoryBudgetStatus[];
  totalBudget: number;
  totalSpent: number;
  totalRemain: number;
  /** 任一分类超支 */
  anyOver: boolean;
  /** 超支分类列表 */
  overCategories: CategoryBudgetStatus[];
  /** 是否未设置任何分类预算 */
  empty: boolean;
}

/**
 * 数据迁移：若房间使用旧的 dailyBudget 但未设置 categoryBudgets，
 * 自动按 餐饮:50% / 购物:30% / 零食:20% 拆分为分类预算。
 * 不修改原对象，返回新的 categoryBudgets 视图。
 */
export function getRoomCategoryBudgets(
  room: Room,
): Partial<Record<Category, number>> {
  const cb = room.categoryBudgets;
  if (cb && Object.keys(cb).length > 0) return cb;
  if (room.dailyBudget && room.dailyBudget > 0) {
    const b = room.dailyBudget;
    return {
      food: Math.round(b * 0.5),
      shopping: Math.round(b * 0.3),
      snack: Math.max(1, b - Math.round(b * 0.5) - Math.round(b * 0.3)),
    };
  }
  return {};
}

/**
 * 计算"监督消费"房间今日各分类预算状态
 */
export function calcSuperviseByCategory(
  room: Room,
  myTransactions: Transaction[],
): SuperviseByCategoryResult {
  const today = dayjs().format('YYYY-MM-DD');
  const todayTxs = myTransactions.filter((t) => t.transactionDate === today);
  const budgets = getRoomCategoryBudgets(room);

  const entries = (Object.entries(budgets) as [Category, number | undefined][])
    .filter(([, v]) => typeof v === 'number');

  const categories: CategoryBudgetStatus[] = entries.map(([cat, budget]) => {
    const b = budget ?? 0;
    const spent = todayTxs
      .filter((t) => t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
    const remain = b - spent;
    const percent = b > 0 ? Math.min(999, Math.round((spent / b) * 100)) : 0;
    return {
      category: cat,
      label: CATEGORY_LABEL[cat],
      emoji: CATEGORY_EMOJI[cat],
      budget: b,
      spent,
      remain,
      percent,
      over: b > 0 && spent > b,
    };
  });

  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const overCategories = categories.filter((c) => c.over);

  return {
    categories,
    totalBudget,
    totalSpent,
    totalRemain: totalBudget - totalSpent,
    anyOver: overCategories.length > 0,
    overCategories,
    empty: categories.length === 0,
  };
}

/* ----------------------- 模拟好友行为 ----------------------- */

/**
 * 根据房间类型和好友性格，生成一条模拟事件（不写库，由调用方决定是否写入）
 * 返回 null 表示这次"无动静"
 */
export function generateMockEvent(
  room: Room,
  friend: Friend,
): Omit<RoomEvent, 'eventId' | 'createdAt'> | null {
  // 不同性格的活跃度
  const activity: Record<NonNullable<Friend['persona']>, number> = {
    thrifty: 0.7,
    expert: 0.65,
    spender: 0.55,
    casual: 0.4,
    lazy: 0.2,
  };
  const p = activity[friend.persona ?? 'casual'];
  if (Math.random() > p) return null;

  if (room.type === 'save_together') {
    // 攒钱：随机金额 5-50 之间
    const amount = pickRandom([5, 8, 10, 15, 20, 30, 50]);
    return {
      roomId: room.roomId,
      userId: friend.friendId,
      type: 'checkin',
      amount,
      note: pickRandom([
        '今天少喝一杯奶茶',
        '步行回家省下的车费',
        '抢到了优惠券',
        '今日存款打卡',
        '省下早餐钱',
      ]),
    };
  }

  if (room.type === 'pk_checkin') {
    // 记账 PK：打卡（不带金额，只表示今天记了账）
    if (friend.persona === 'lazy' && Math.random() < 0.6) {
      return null; // 三分钟热度，经常断签
    }
    return {
      roomId: room.roomId,
      userId: friend.friendId,
      type: 'checkin',
      note: pickRandom([
        '今日已记账 ✅',
        '又是自律的一天',
        '坚持就是胜利',
        '记账打卡',
      ]),
    };
  }

  if (room.type === 'supervise_spend') {
    // 监督消费：好友给我打气 / 提醒。可根据房间设置的分类生成更具体的文案
    const budgets = getRoomCategoryBudgets(room);
    const setCats = (Object.keys(budgets) as Category[]);
    const focusCat = setCats.length > 0 ? pickRandom(setCats) : null;
    const r = Math.random();
    if (r < 0.5) {
      return {
        roomId: room.roomId,
        userId: friend.friendId,
        type: 'cheer',
        note: focusCat
          ? pickRandom([
              `${CATEGORY_EMOJI[focusCat]} 今天${CATEGORY_LABEL[focusCat]}省着点！`,
              `一起守住${CATEGORY_LABEL[focusCat]}预算 💪`,
              '看到你今天花得不多，棒！',
              '坚持住，别冲动消费！',
            ])
          : pickRandom([
              '一起加油控制预算！',
              '看到你今天花得不多，棒！',
              '记得早点记账哦～',
              '坚持住，别冲动消费！',
            ]),
      };
    }
    return {
      roomId: room.roomId,
      userId: friend.friendId,
      type: 'chat',
      note: focusCat
        ? pickRandom([
            `今天${CATEGORY_LABEL[focusCat]}我也克制住了～`,
            `${CATEGORY_LABEL[focusCat]}的钱真不经花😂`,
            '一起加油呀！',
          ])
        : pickRandom([
            '今天我也省了一笔～',
            '一起加油呀！',
            '别熬夜点外卖啦😂',
          ]),
    };
  }
  return null;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/* ----------------------- 文案 ----------------------- */

export function describeEvent(ev: RoomEvent, friend?: Friend): string {
  const who = friend ? friend.nickname : '我';
  switch (ev.type) {
    case 'join':
      return `${who} 加入了房间`;
    case 'checkin':
      return ev.amount
        ? `${who} 攒了 ¥${ev.amount}${ev.note ? ` · ${ev.note}` : ''}`
        : `${who} 完成了今日打卡 ✅`;
    case 'spend':
      return `${who} 花了 ¥${ev.amount ?? 0}${ev.note ? ` · ${ev.note}` : ''}`;
    case 'milestone':
      return `🎉 ${who} 达成里程碑！${ev.note ?? ''}`;
    case 'warning':
      return `⚠️ ${who} 今日预算超支了`;
    case 'cheer':
      return `${who}：${ev.note ?? '加油！'}`;
    case 'chat':
      return `${who}：${ev.note ?? ''}`;
    default:
      return who;
  }
}
