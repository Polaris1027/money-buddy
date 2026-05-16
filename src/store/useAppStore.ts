import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { genId } from '@/utils/id';
import { now, today } from '@/utils/date';
import type {
  ChatMessage,
  Transaction,
  SavingGoal,
  CheckIn,
  UserProfile,
  Category,
  PlanType,
  Friend,
  Room,
  RoomEvent,
  RoomType,
  Income,
  IncomeSource,
} from '@/types';

interface AppState {
  user: UserProfile;
  messages: ChatMessage[];
  transactions: Transaction[];
  goals: SavingGoal[];
  checkins: CheckIn[];
  friends: Friend[];
  rooms: Room[];
  roomEvents: RoomEvent[];
  incomes: Income[];

  // user actions
  initUser: () => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  resetAll: () => void;

  // chat
  appendMessage: (msg: Omit<ChatMessage, 'messageId' | 'createdAt'>) => ChatMessage;
  clearChat: () => void;

  // transactions
  addTransaction: (data: {
    amount: number;
    category: Category;
    note?: string;
    transactionDate?: string;
  }) => Transaction;
  updateTransaction: (transactionId: string, patch: Partial<Transaction>) => void;
  removeTransaction: (transactionId: string) => void;

  // goals
  addGoal: (data: {
    name: string;
    emoji?: string;
    targetAmount: number;
    deadline: string;
    planType?: PlanType;
  }) => SavingGoal;
  updateGoal: (goalId: string, patch: Partial<SavingGoal>) => void;
  removeGoal: (goalId: string) => void;
  addCheckin: (goalId: string, amount: number) => CheckIn | null;

  // 社区 - 好友
  addFriend: (data: Omit<Friend, 'friendId' | 'addedAt'>) => Friend;
  removeFriend: (friendId: string) => void;

  // 社区 - 房间
  createRoom: (data: {
    type: RoomType;
    name: string;
    emoji?: string;
    memberIds: string[];
    targetAmount?: number;
    deadline?: string;
    dailyBudget?: number;
    categoryBudgets?: Partial<Record<Category, number>>;
    challengeDays?: number;
  }) => Room;
  updateRoom: (roomId: string, patch: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  addRoomMember: (roomId: string, friendId: string) => void;
  removeRoomMember: (roomId: string, friendId: string) => void;

  // 社区 - 房间事件
  addRoomEvent: (e: Omit<RoomEvent, 'eventId' | 'createdAt'>) => RoomEvent;

  // 收入
  addIncome: (data: {
    amount: number;
    source: IncomeSource;
    note?: string;
    incomeDate?: string;
  }) => Income;
  updateIncome: (incomeId: string, patch: Partial<Income>) => void;
  removeIncome: (incomeId: string) => void;
}

const KEY = {
  user: 'user',
  messages: 'messages',
  transactions: 'transactions',
  goals: 'goals',
  checkins: 'checkins',
  friends: 'friends',
  rooms: 'rooms',
  roomEvents: 'roomEvents',
  incomes: 'incomes',
};

function defaultUser(): UserProfile {
  return {
    userId: genId('u'),
    nickname: '同学',
    grade: null,
    gender: 'neutral',
    monthlyBudget: 2000,
    preferences: { onboarded: false },
    createdAt: now(),
  };
}

/**
 * 旧版本 user 数据可能没有 gender 字段，做一次性向后兼容补齐
 */
function migrateUser(u: UserProfile): UserProfile {
  if (!u.gender) {
    return { ...u, gender: 'neutral' };
  }
  return u;
}

function persist<T>(key: string, value: T) {
  storage.set(key, value);
}

export const useAppStore = create<AppState>((set, get) => ({
  user: migrateUser(storage.get<UserProfile>(KEY.user, defaultUser())),
  messages: storage.get<ChatMessage[]>(KEY.messages, []),
  transactions: storage.get<Transaction[]>(KEY.transactions, []),
  goals: storage.get<SavingGoal[]>(KEY.goals, []),
  checkins: storage.get<CheckIn[]>(KEY.checkins, []),
  friends: storage.get<Friend[]>(KEY.friends, []),
  rooms: storage.get<Room[]>(KEY.rooms, []),
  roomEvents: storage.get<RoomEvent[]>(KEY.roomEvents, []),
  incomes: storage.get<Income[]>(KEY.incomes, []),

  initUser: () => {
    const existing = storage.get<UserProfile | null>(KEY.user, null);
    if (!existing) {
      const u = defaultUser();
      persist(KEY.user, u);
      set({ user: u });
    } else {
      // 兼容旧数据：没有 gender 字段时补齐
      const migrated = migrateUser(existing);
      if (migrated !== existing) {
        persist(KEY.user, migrated);
        set({ user: migrated });
      }
    }
  },

  updateUser: (patch) => {
    const u = { ...get().user, ...patch };
    persist(KEY.user, u);
    set({ user: u });
  },

  resetAll: () => {
    storage.clearAll();
    const u = defaultUser();
    persist(KEY.user, u);
    set({
      user: u,
      messages: [],
      transactions: [],
      goals: [],
      checkins: [],
      friends: [],
      rooms: [],
      roomEvents: [],
      incomes: [],
    });
  },

  appendMessage: (msg) => {
    const full: ChatMessage = {
      ...msg,
      messageId: genId('m'),
      createdAt: now(),
    };
    const messages = [...get().messages, full];
    persist(KEY.messages, messages);
    set({ messages });
    return full;
  },

  clearChat: () => {
    persist(KEY.messages, []);
    set({ messages: [] });
  },

  addTransaction: ({ amount, category, note = '', transactionDate }) => {
    const userId = get().user.userId;
    const tx: Transaction = {
      transactionId: genId('t'),
      userId,
      amount,
      category,
      note,
      source: 'manual',
      transactionDate: transactionDate || today(),
      createdAt: now(),
    };
    const transactions = [...get().transactions, tx];
    persist(KEY.transactions, transactions);
    set({ transactions });
    return tx;
  },

  removeTransaction: (transactionId) => {
    const transactions = get().transactions.filter((t) => t.transactionId !== transactionId);
    persist(KEY.transactions, transactions);
    set({ transactions });
  },

  updateTransaction: (transactionId, patch) => {
    const transactions = get().transactions.map((t) =>
      t.transactionId === transactionId ? { ...t, ...patch } : t,
    );
    persist(KEY.transactions, transactions);
    set({ transactions });
  },

  addGoal: ({ name, emoji = '🎯', targetAmount, deadline, planType = 'incremental' }) => {
    const userId = get().user.userId;
    const goal: SavingGoal = {
      goalId: genId('g'),
      userId,
      name,
      emoji,
      targetAmount,
      currentAmount: 0,
      deadline,
      status: 'active',
      planType,
      createdAt: now(),
    };
    const goals = [...get().goals, goal];
    persist(KEY.goals, goals);
    set({ goals });
    return goal;
  },

  updateGoal: (goalId, patch) => {
    const goals = get().goals.map((g) => (g.goalId === goalId ? { ...g, ...patch } : g));
    persist(KEY.goals, goals);
    set({ goals });
  },

  removeGoal: (goalId) => {
    const goals = get().goals.filter((g) => g.goalId !== goalId);
    const checkins = get().checkins.filter((c) => c.goalId !== goalId);
    persist(KEY.goals, goals);
    persist(KEY.checkins, checkins);
    set({ goals, checkins });
  },

  addCheckin: (goalId, amount) => {
    const goal = get().goals.find((g) => g.goalId === goalId);
    if (!goal) return null;

    const userId = get().user.userId;
    const checkin: CheckIn = {
      checkinId: genId('c'),
      goalId,
      userId,
      amount,
      createdAt: now(),
    };
    const checkins = [...get().checkins, checkin];
    persist(KEY.checkins, checkins);

    const newCurrent = Math.min(goal.currentAmount + amount, goal.targetAmount);
    const completed = newCurrent >= goal.targetAmount;
    const goals = get().goals.map((g) =>
      g.goalId === goalId
        ? {
            ...g,
            currentAmount: newCurrent,
            status: completed ? ('completed' as const) : g.status,
          }
        : g,
    );
    persist(KEY.goals, goals);
    set({ checkins, goals });
    return checkin;
  },

  /* ---------------- 社区 - 好友 ---------------- */
  addFriend: (data) => {
    const f: Friend = {
      ...data,
      friendId: genId('f'),
      addedAt: now(),
    };
    const friends = [...get().friends, f];
    persist(KEY.friends, friends);
    set({ friends });
    return f;
  },

  removeFriend: (friendId) => {
    const friends = get().friends.filter((f) => f.friendId !== friendId);
    // 从所有房间成员中移除该好友
    const rooms = get().rooms.map((r) => ({
      ...r,
      memberIds: r.memberIds.filter((id) => id !== friendId),
    }));
    persist(KEY.friends, friends);
    persist(KEY.rooms, rooms);
    set({ friends, rooms });
  },

  /* ---------------- 社区 - 房间 ---------------- */
  createRoom: (data) => {
    const room: Room = {
      roomId: genId('r'),
      type: data.type,
      name: data.name,
      emoji: data.emoji ?? '🏠',
      creatorId: 'me',
      memberIds: ['me', ...data.memberIds.filter((id) => id !== 'me')],
      targetAmount: data.targetAmount,
      deadline: data.deadline,
      dailyBudget: data.dailyBudget,
      categoryBudgets: data.categoryBudgets,
      challengeDays: data.challengeDays,
      active: true,
      createdAt: now(),
    };
    const rooms = [...get().rooms, room];
    persist(KEY.rooms, rooms);

    // 同步插入"加入"事件
    const joinEvents: RoomEvent[] = room.memberIds.map((uid, idx) => ({
      eventId: genId('re'),
      roomId: room.roomId,
      userId: uid,
      type: 'join',
      createdAt: now() + idx, // 保持顺序
    }));
    const roomEvents = [...get().roomEvents, ...joinEvents];
    persist(KEY.roomEvents, roomEvents);

    set({ rooms, roomEvents });
    return room;
  },

  updateRoom: (roomId, patch) => {
    const rooms = get().rooms.map((r) => (r.roomId === roomId ? { ...r, ...patch } : r));
    persist(KEY.rooms, rooms);
    set({ rooms });
  },

  removeRoom: (roomId) => {
    const rooms = get().rooms.filter((r) => r.roomId !== roomId);
    const roomEvents = get().roomEvents.filter((e) => e.roomId !== roomId);
    persist(KEY.rooms, rooms);
    persist(KEY.roomEvents, roomEvents);
    set({ rooms, roomEvents });
  },

  addRoomMember: (roomId, friendId) => {
    const room = get().rooms.find((r) => r.roomId === roomId);
    if (!room) return;
    if (room.memberIds.includes(friendId)) return;
    const rooms = get().rooms.map((r) =>
      r.roomId === roomId ? { ...r, memberIds: [...r.memberIds, friendId] } : r,
    );
    const joinEvent: RoomEvent = {
      eventId: genId('re'),
      roomId,
      userId: friendId,
      type: 'join',
      createdAt: now(),
    };
    const roomEvents = [...get().roomEvents, joinEvent];
    persist(KEY.rooms, rooms);
    persist(KEY.roomEvents, roomEvents);
    set({ rooms, roomEvents });
  },

  removeRoomMember: (roomId, friendId) => {
    const room = get().rooms.find((r) => r.roomId === roomId);
    if (!room) return;
    // 房主不可被移除
    if (friendId === room.creatorId) return;
    const rooms = get().rooms.map((r) =>
      r.roomId === roomId
        ? { ...r, memberIds: r.memberIds.filter((id) => id !== friendId) }
        : r,
    );
    persist(KEY.rooms, rooms);
    set({ rooms });
  },

  /* ---------------- 社区 - 事件 ---------------- */
  addRoomEvent: (e) => {
    const ev: RoomEvent = {
      ...e,
      eventId: genId('re'),
      createdAt: now(),
    };
    const roomEvents = [...get().roomEvents, ev];
    persist(KEY.roomEvents, roomEvents);
    set({ roomEvents });
    return ev;
  },

  /* ---------------- 收入 ---------------- */
  addIncome: ({ amount, source, note = '', incomeDate }) => {
    const userId = get().user.userId;
    const income: Income = {
      incomeId: genId('in'),
      userId,
      amount,
      source,
      note,
      incomeDate: incomeDate || today(),
      createdAt: now(),
    };
    const incomes = [...get().incomes, income];
    persist(KEY.incomes, incomes);
    set({ incomes });
    return income;
  },

  updateIncome: (incomeId, patch) => {
    const incomes = get().incomes.map((i) =>
      i.incomeId === incomeId ? { ...i, ...patch } : i,
    );
    persist(KEY.incomes, incomes);
    set({ incomes });
  },

  removeIncome: (incomeId) => {
    const incomes = get().incomes.filter((i) => i.incomeId !== incomeId);
    persist(KEY.incomes, incomes);
    set({ incomes });
  },
}));
