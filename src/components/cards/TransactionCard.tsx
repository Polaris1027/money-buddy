import { fmtCurrency } from '@/utils/date';

interface Props {
  data: {
    amount: number;
    category: string;
    categoryLabel: string;
    categoryEmoji: string;
    note: string;
    todayTotal: number;
    budgetUsed: number;
  };
}

export default function TransactionCard({ data }: Props) {
  const overBudget = data.budgetUsed >= 100;
  const warnBudget = data.budgetUsed >= 80;
  const barColor = overBudget ? 'bg-red-500' : warnBudget ? 'bg-yellow-500' : 'bg-brand-500';
  return (
    <div className="bg-white rounded-2xl shadow-bubble p-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.categoryEmoji}</span>
          <div>
            <div className="text-sm text-gray-500">{data.categoryLabel} · {data.note}</div>
            <div className="text-xl font-semibold text-gray-800">{fmtCurrency(data.amount)}</div>
          </div>
        </div>
        <span className="text-xs text-gray-400">已记录</span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>本月预算</span>
          <span>{data.budgetUsed.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, data.budgetUsed)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
