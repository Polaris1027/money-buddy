import dayjs from 'dayjs';
import type { Milestone, PlanType, SavingGoal } from '@/types';

/* =====================================================================
 * 里程碑（与 PRD 完全一致）
 * ===================================================================== */
export const MILESTONES: Milestone[] = [
  { threshold: 0.1, name: '初见成效', emoji: '🌱', message: '万事开头难，你已经迈出第一步啦！' },
  { threshold: 0.25, name: '茁壮成长', emoji: '🌿', message: '四分之一了！保持这个节奏！' },
  { threshold: 0.5, name: '半程达成', emoji: '🌳', message: '太棒了！已经完成一半，胜利在望！' },
  { threshold: 0.75, name: '即将绽放', emoji: '🌸', message: '冲刺阶段！再坚持一下！' },
  { threshold: 1.0, name: '目标达成', emoji: '🏆', message: '恭喜你！你做到了！给自己一个大大的拥抱！' },
];

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
