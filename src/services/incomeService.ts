import dayjs from 'dayjs';
import type { Income, IncomeSource, Transaction } from '@/types';
import { INCOME_SOURCE_LABEL } from '@/types';

export type IncomePeriod = 'week' | 'month' | 'year';

export interface IncomePeriodAnalysis {
  total: number;
  count: number;
  average: number;
  bySource: Array<{
    source: IncomeSource;
    label: string;
    amount: number;
    percentage: number;
  }>;
  trend: Array<{ date: string; amount: number }>;
  /** 上一周期数据 */
  comparison: { previous: number; changeRate: number };
  /** 主收入来源 */
  topSource?: IncomeSource;
}

function rangeOf(period: IncomePeriod, anchor = dayjs()) {
  if (period === 'week') {
    return {
      start: anchor.startOf('week').add(1, 'day'),
      end: anchor.endOf('week').add(1, 'day'),
    };
  }
  if (period === 'year') {
    return { start: anchor.startOf('year'), end: anchor.endOf('year') };
  }
  return { start: anchor.startOf('month'), end: anchor.endOf('month') };
}

export function getIncomeAnalysis(
  incomes: Income[],
  period: IncomePeriod,
): IncomePeriodAnalysis {
  const { start, end } = rangeOf(period);
  const list = incomes.filter((it) => {
    const d = dayjs(it.incomeDate);
    return d.isAfter(start.subtract(1, 'second')) && d.isBefore(end.add(1, 'second'));
  });

  const total = list.reduce((s, t) => s + t.amount, 0);
  const count = list.length;
  const average = count ? total / count : 0;

  const srcMap = new Map<IncomeSource, number>();
  for (const t of list) {
    srcMap.set(t.source, (srcMap.get(t.source) || 0) + t.amount);
  }
  const bySource = Array.from(srcMap.entries())
    .map(([source, amount]) => ({
      source,
      label: INCOME_SOURCE_LABEL[source],
      amount,
      percentage: total ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 趋势
  const trend: Array<{ date: string; amount: number }> = [];
  if (period === 'year') {
    for (let m = 0; m < 12; m++) {
      const monthStart = start.add(m, 'month');
      const label = monthStart.format('M月');
      const amt = list
        .filter((t) => dayjs(t.incomeDate).isSame(monthStart, 'month'))
        .reduce((s, t) => s + t.amount, 0);
      trend.push({ date: label, amount: Math.round(amt * 100) / 100 });
    }
  } else {
    const days = period === 'week' ? 7 : end.diff(start, 'day') + 1;
    for (let i = 0; i < days; i++) {
      const d = start.add(i, 'day');
      const label = d.format('MM-DD');
      const amt = list
        .filter((t) => dayjs(t.incomeDate).isSame(d, 'day'))
        .reduce((s, t) => s + t.amount, 0);
      trend.push({ date: label, amount: Math.round(amt * 100) / 100 });
    }
  }

  // 环比
  const prevAnchor =
    period === 'week' ? dayjs().subtract(1, 'week') :
    period === 'year' ? dayjs().subtract(1, 'year') :
    dayjs().subtract(1, 'month');
  const { start: pStart, end: pEnd } = rangeOf(period, prevAnchor);
  const prevList = incomes.filter((t) => {
    const d = dayjs(t.incomeDate);
    return d.isAfter(pStart.subtract(1, 'second')) && d.isBefore(pEnd.add(1, 'second'));
  });
  const previous = prevList.reduce((s, t) => s + t.amount, 0);
  const changeRate = previous ? ((total - previous) / previous) * 100 : 0;

  return {
    total,
    count,
    average,
    bySource,
    trend,
    comparison: { previous, changeRate },
    topSource: bySource[0]?.source,
  };
}

/**
 * 同期收支结余对比
 */
export interface BalanceSummary {
  income: number;
  expense: number;
  balance: number;
  /** 储蓄率 = balance / income，无收入时为 0 */
  savingRate: number;
}

export function getBalance(
  incomes: Income[],
  transactions: Transaction[],
  period: IncomePeriod,
): BalanceSummary {
  const { start, end } = rangeOf(period);
  const incomeTotal = incomes
    .filter((i) => {
      const d = dayjs(i.incomeDate);
      return d.isAfter(start.subtract(1, 'second')) && d.isBefore(end.add(1, 'second'));
    })
    .reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions
    .filter((tx) => {
      const d = dayjs(tx.transactionDate);
      return d.isAfter(start.subtract(1, 'second')) && d.isBefore(end.add(1, 'second'));
    })
    .reduce((s, t) => s + t.amount, 0);
  const balance = incomeTotal - expenseTotal;
  const savingRate = incomeTotal > 0 ? balance / incomeTotal : 0;
  return {
    income: incomeTotal,
    expense: expenseTotal,
    balance,
    savingRate,
  };
}

export interface IncomeInsight {
  type: 'top_source' | 'growth' | 'balance' | 'tip';
  text: string;
}

export function getIncomeInsights(
  incomes: Income[],
  transactions: Transaction[],
  period: IncomePeriod = 'month',
): IncomeInsight[] {
  const a = getIncomeAnalysis(incomes, period);
  const b = getBalance(incomes, transactions, period);
  const out: IncomeInsight[] = [];
  const periodLabel = period === 'week' ? '本周' : period === 'year' ? '本年' : '本月';

  if (a.bySource.length > 0) {
    const top = a.bySource[0];
    out.push({
      type: 'top_source',
      text: `${periodLabel}主要收入来自${top.label}（${top.percentage.toFixed(0)}%）`,
    });
  }

  if (a.comparison.previous > 0 && a.comparison.changeRate >= 20) {
    out.push({
      type: 'growth',
      text: `${periodLabel}收入比上期增加 ${a.comparison.changeRate.toFixed(0)}%，不错哦~`,
    });
  } else if (a.comparison.previous > 0 && a.comparison.changeRate <= -20) {
    out.push({
      type: 'growth',
      text: `${periodLabel}收入比上期减少 ${Math.abs(a.comparison.changeRate).toFixed(0)}%，记得节流哦`,
    });
  }

  if (b.income > 0) {
    if (b.balance >= 0) {
      out.push({
        type: 'balance',
        text: `${periodLabel}结余 ¥${b.balance.toFixed(0)}，储蓄率 ${(b.savingRate * 100).toFixed(0)}%`,
      });
      if (b.savingRate >= 0.3) {
        out.push({
          type: 'tip',
          text: '储蓄率超过 30%，可以考虑把结余放进储蓄目标 🎯',
        });
      } else if (b.savingRate < 0.1) {
        out.push({
          type: 'tip',
          text: '储蓄率偏低，看看消费分类里能不能砍点开支～',
        });
      }
    } else {
      out.push({
        type: 'balance',
        text: `${periodLabel}入不敷出，超支 ¥${Math.abs(b.balance).toFixed(0)} ⚠️`,
      });
    }
  }

  return out;
}
