import dayjs from 'dayjs';
import type { Milestone, PlanType, SavingGoal } from '@/types';

/* =====================================================================
 * 里程碑（与 PRD 完全一致）
 * ===================================================================== */
export const MILESTONES: Milestone[] = [
  { threshold: 0.1, name: '种子萌芽', emoji: '🌱', message: '万事开头难，你已经迈出第一步啦！' },
  { threshold: 0.25, name: '新叶成长', emoji: '🌿', message: '四分之一了！新叶舒展，保持这个节奏！' },
  { threshold: 0.5, name: '枝繁叶茂', emoji: '🌳', message: '太棒了！已经完成一半，胜利在望！' },
  { threshold: 0.75, name: '花苞绽放', emoji: '🌸', message: '冲刺阶段！花苞已经探出头，再坚持一下！' },
  { threshold: 1.0, name: '梦想达成', emoji: '🏆', message: '恭喜你！你做到了！给自己一个大大的拥抱！' },
];

/* =====================================================================
 * 储蓄等级（情感陪伴成长路径）
 * 五档：🌱 种子萌芽 → 🌿 新叶成长 → 🌳 枝繁叶茂 → 🌸 花苞绽放 → 🏆 梦想达成
 * ===================================================================== */
export interface SavingStage {
  /** 等级序号 0-4 */
  level: number;
  /** 进入该等级的下限（含），上限为下一档的 minProgress */
  minProgress: number;
  name: string;
  emoji: string;
  /** 该阶段的陪伴文案（短语，用于卡片副标题） */
  tagline: string;
  /** 主色（用于进度条 / 等级徽章） */
  color: string;
  /** 浅色背景（用于卡片底色） */
  bgColor: string;
}

export const SAVING_STAGES: SavingStage[] = [
  {
    level: 0,
    minProgress: 0,
    name: '蓄势待发',
    emoji: '🪴',
    tagline: '播下种子，静待发芽',
    color: '#9E9E9E',
    bgColor: '#F5F5F5',
  },
  {
    level: 1,
    minProgress: 0.1,
    name: '种子萌芽',
    emoji: '🌱',
    tagline: '小芽冒头啦，继续加油',
    color: '#8BC34A',
    bgColor: '#F1F8E9',
  },
  {
    level: 2,
    minProgress: 0.25,
    name: '新叶成长',
    emoji: '🌿',
    tagline: '舒展新叶，节奏正好',
    color: '#66BB6A',
    bgColor: '#E8F5E9',
  },
  {
    level: 3,
    minProgress: 0.5,
    name: '枝繁叶茂',
    emoji: '🌳',
    tagline: '半程达成，茁壮成长',
    color: '#43A047',
    bgColor: '#DCEDC8',
  },
  {
    level: 4,
    minProgress: 0.75,
    name: '花苞绽放',
    emoji: '🌸',
    tagline: '冲刺阶段，即将盛开',
    color: '#EC407A',
    bgColor: '#FCE4EC',
  },
  {
    level: 5,
    minProgress: 1.0,
    name: '梦想达成',
    emoji: '🏆',
    tagline: '恭喜你，梦想已达成！',
    color: '#F9A825',
    bgColor: '#FFF8E1',
  },
];

/**
 * 根据进度（0-1）取出当前所在的储蓄等级
 */
export function getSavingStage(progress: number): SavingStage {
  const p = Math.max(0, Math.min(1, progress));
  let cur = SAVING_STAGES[0];
  for (const s of SAVING_STAGES) {
    if (p >= s.minProgress) cur = s;
  }
  return cur;
}

/**
 * 取下一个待解锁等级（已是最高级则返回 null）
 */
export function getNextSavingStage(progress: number): SavingStage | null {
  const cur = getSavingStage(progress);
  const next = SAVING_STAGES.find((s) => s.level === cur.level + 1);
  return next || null;
}

/**
 * 检查打卡后是否触发新里程碑
 */
export function checkMilestone(
  prevAmount: number,
  newAmount: number,
  target: number,
): Milestone | null {
  if (target <= 0) return null;
  const prevP = prevAmount / target;
  const newP = newAmount / target;
  for (const m of MILESTONES) {
    if (prevP < m.threshold && newP >= m.threshold) {
      return m;
    }
  }
  return null;
}

/* =====================================================================
 * 储蓄计划计算
 * ===================================================================== */
export interface SavingPlan {
  planType: PlanType;
  daysRemaining: number;
  weeksRemaining: number;
  dailyAmount: number;
  weeklyAmount: number;
  /** 递增方案：每周金额数组 */
  incrementalWeeks?: number[];
  baseAmount?: number;
  increment?: number;
}

export function calculatePlan(
  targetAmount: number,
  deadline: string,
  planType: PlanType = 'incremental',
): SavingPlan {
  const days = Math.max(1, dayjs(deadline).diff(dayjs(), 'day'));
  const weeks = Math.max(1, Math.ceil(days / 7));

  if (planType === 'average') {
    return {
      planType,
      daysRemaining: days,
      weeksRemaining: weeks,
      dailyAmount: Math.ceil(targetAmount / days),
      weeklyAmount: Math.ceil(targetAmount / weeks),
    };
  }

  // 递增（52 周变体）：等差数列求和 = N * base + N*(N-1)/2 * d = target
  // 选取一个温柔的 d（5-10），反推 base
  // 选 d 让首周不至于太低
  const N = weeks;
  let increment = 5;
  let base = (targetAmount - (N * (N - 1) / 2) * increment) / N;
  // 若 base 过小或为负，调整 increment
  if (base < 5 || base > 200) {
    increment = Math.max(2, Math.floor((targetAmount * 2) / (N * (N + 1))));
    base = (targetAmount - (N * (N - 1) / 2) * increment) / N;
    base = Math.max(5, Math.round(base));
  } else {
    base = Math.max(5, Math.round(base));
  }

  const incrementalWeeks: number[] = [];
  let actualSum = 0;
  for (let i = 0; i < N; i++) {
    const w = base + i * increment;
    incrementalWeeks.push(w);
    actualSum += w;
  }
  // 微调最后一周以贴近目标
  if (actualSum !== targetAmount && incrementalWeeks.length > 0) {
    incrementalWeeks[incrementalWeeks.length - 1] += targetAmount - actualSum;
  }

  return {
    planType,
    daysRemaining: days,
    weeksRemaining: weeks,
    dailyAmount: Math.ceil(targetAmount / days),
    weeklyAmount: Math.ceil(targetAmount / N),
    incrementalWeeks,
    baseAmount: base,
    increment,
  };
}

/* =====================================================================
 * 进度信息
 * ===================================================================== */
export interface GoalStatus {
  progress: number; // 0-1
  progressPercent: number; // 0-100
  remainingAmount: number;
  daysRemaining: number;
  estimatedCompletion: string | null; // YYYY-MM-DD or null
  onTrack: boolean;
}

export function getGoalStatus(goal: SavingGoal, totalDays?: number): GoalStatus {
  const progress = goal.targetAmount ? goal.currentAmount / goal.targetAmount : 0;
  const daysRemaining = Math.max(0, dayjs(goal.deadline).diff(dayjs(), 'day'));
  const elapsed = totalDays
    ? totalDays - daysRemaining
    : dayjs().diff(dayjs(goal.createdAt), 'day') || 1;
  const dailyRate = elapsed > 0 ? goal.currentAmount / elapsed : 0;
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  let estimatedCompletion: string | null = null;
  if (dailyRate > 0 && remainingAmount > 0) {
    const daysNeeded = Math.ceil(remainingAmount / dailyRate);
    estimatedCompletion = dayjs().add(daysNeeded, 'day').format('YYYY-MM-DD');
  } else if (remainingAmount === 0) {
    estimatedCompletion = dayjs().format('YYYY-MM-DD');
  }

  // 判断是否走在正轨上：当前进度 >= 时间进度
  const totalSpan = dayjs(goal.deadline).diff(dayjs(goal.createdAt), 'day') || 1;
  const expectedProgress = (totalSpan - daysRemaining) / totalSpan;
  const onTrack = progress >= expectedProgress * 0.9;

  return {
    progress,
    progressPercent: Math.round(progress * 100),
    remainingAmount,
    daysRemaining,
    estimatedCompletion,
    onTrack,
  };
}
