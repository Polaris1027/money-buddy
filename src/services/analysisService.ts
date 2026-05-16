import dayjs from 'dayjs';
import type { Transaction, Category } from '@/types';
import { CATEGORY_LABEL } from '@/types';

export interface PeriodAnalysis {
  total: number;
  count: number;
  average: number;
  byCategory: Array<{ category: Category; label: string; amount: number; percentage: number }>;
  trend: Array<{ date: string; amount: number }>;
  comparison: { previous: number; changeRate: number };
}

export type Period = 'day' | 'week' | 'month' | 'year';

function rangeOf(period: Period, anchor = dayjs()) {
  if (period === 'day') {
    return { start: anchor.startOf('day'), end: anchor.endOf('day') };
  }
  if (period === 'week') {
    return {
      start: anchor.startOf('week').add(1, 'day'), // 周一
      end: anchor.endOf('week').add(1, 'day'),
    };
  }
  if (period === 'year') {
    return { start: anchor.startOf('year'), end: anchor.endOf('year') };
  }
  return { start: anchor.startOf('month'), end: anchor.endOf('month') };
}

export function getPeriodAnalysis(
  transactions: Transaction[],
  period: Period,
): PeriodAnalysis {
  const { start, end } = rangeOf(period);
  const list = transactions.filter((t) => {
    const d = dayjs(t.transactionDate);
    return d.isAfter(start.subtract(1, 'second')) && d.isBefore(end.add(1, 'second'));
  });

  const total = list.reduce((s, t) => s + t.amount, 0);
  const count = list.length;
  const average = count ? total / count : 0;

  const catMap = new Map<Category, number>();
  for (const t of list) {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, amount]) => ({
      category,
      label: CATEGORY_LABEL[category],
      amount,
      percentage: total ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 趋势
  const trend: Array<{ date: string; amount: number }> = [];
  if (period === 'year') {
    // 按 12 个月聚合
    for (let m = 0; m < 12; m++) {
      const monthStart = start.add(m, 'month');
      const label = monthStart.format('M月');
      const amt = list
        .filter((t) => dayjs(t.transactionDate).isSame(monthStart, 'month'))
        .reduce((s, t) => s + t.amount, 0);
      trend.push({ date: label, amount: Math.round(amt * 100) / 100 });
    }
  } else {
    const days =
      period === 'day' ? 1 : period === 'week' ? 7 : end.diff(start, 'day') + 1;
    for (let i = 0; i < days; i++) {
      const d = start.add(i, 'day');
      const dayStr = d.format('MM-DD');
      const amt = list
        .filter((t) => dayjs(t.transactionDate).isSame(d, 'day'))
        .reduce((s, t) => s + t.amount, 0);
      trend.push({ date: dayStr, amount: Math.round(amt * 100) / 100 });
    }
  }

  // 环比上一周期
  const prevAnchor =
    period === 'day' ? dayjs().subtract(1, 'day') :
    period === 'week' ? dayjs().subtract(1, 'week') :
    period === 'year' ? dayjs().subtract(1, 'year') :
    dayjs().subtract(1, 'month');
  const { start: pStart, end: pEnd } = rangeOf(period, prevAnchor);
  const prevList = transactions.filter((t) => {
    const d = dayjs(t.transactionDate);
    return d.isAfter(pStart.subtract(1, 'second')) && d.isBefore(pEnd.add(1, 'second'));
  });
  const previous = prevList.reduce((s, t) => s + t.amount, 0);
  const changeRate = previous ? ((total - previous) / previous) * 100 : 0;

  return {
    total,
    count,
    average,
    byCategory,
    trend,
    comparison: { previous, changeRate },
  };
}

export interface Insight {
  type: 'top_category' | 'high_frequency' | 'anomaly' | 'milestone';
  text: string;
}

export function getInsights(transactions: Transaction[], period: Period = 'month'): Insight[] {
  const a = getPeriodAnalysis(transactions, period);
  const insights: Insight[] = [];

  const periodLabel =
    period === 'day' ? '今日' :
    period === 'week' ? '本周' :
    period === 'year' ? '本年' :
    '本月';

  if (a.byCategory.length > 0) {
    const top = a.byCategory[0];
    insights.push({
      type: 'top_category',
      text: `${periodLabel}${top.label}支出占比最高（${top.percentage.toFixed(0)}%）`,
    });
  }

  // 高频项目（备注命中"奶茶/咖啡"）
  const drinkList = transactions.filter(
    (t) =>
      /奶茶|咖啡|星巴克|瑞幸|喜茶|蜜雪/.test(t.note) ||
      (t.category === 'food' && /奶茶|咖啡/.test(t.note)),
  );
  if (drinkList.length >= 3) {
    const sum = drinkList.reduce((s, t) => s + t.amount, 0);
    insights.push({
      type: 'high_frequency',
      text: `奶茶/咖啡消费共 ${drinkList.length} 笔，合计 ¥${sum.toFixed(0)}`,
    });
  }

  // 异常检测：环比 +50% 以上
  if (a.comparison.changeRate > 50 && a.comparison.previous > 0) {
    insights.push({
      type: 'anomaly',
      text: `${periodLabel}消费比上期增加 ${a.comparison.changeRate.toFixed(0)}%`,
    });
  }

  // 年度专属洞察：月均
  if (period === 'year' && a.total > 0) {
    const monthsPassed = dayjs().month() + 1; // 1-12
    const monthlyAvg = a.total / monthsPassed;
    insights.push({
      type: 'milestone',
      text: `本年度月均支出 ¥${monthlyAvg.toFixed(0)}`,
    });
  }

  return insights;
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  alert: boolean;
}

export function checkBudgetStatus(
  transactions: Transaction[],
  monthlyBudget: number,
): BudgetStatus {
  const a = getPeriodAnalysis(transactions, 'month');
  const remaining = Math.max(0, monthlyBudget - a.total);
  const percentage = monthlyBudget ? (a.total / monthlyBudget) * 100 : 0;
  return {
    budget: monthlyBudget,
    spent: a.total,
    remaining,
    percentage,
    alert: percentage >= 80,
  };
}

/**
 * 年度预算状态
 *  - 若用户未设置 yearlyBudget（0 / undefined），默认 = monthlyBudget × 12
 */
export function checkYearlyBudgetStatus(
  transactions: Transaction[],
  monthlyBudget: number,
  yearlyBudget?: number,
): BudgetStatus {
  const effective = yearlyBudget && yearlyBudget > 0 ? yearlyBudget : monthlyBudget * 12;
  const a = getPeriodAnalysis(transactions, 'year');
  const remaining = Math.max(0, effective - a.total);
  const percentage = effective ? (a.total / effective) * 100 : 0;
  return {
    budget: effective,
    spent: a.total,
    remaining,
    percentage,
    alert: percentage >= 80,
  };
}
