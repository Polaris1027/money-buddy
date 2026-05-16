import { fmtCurrency } from '@/utils/date';
import type { SavingGoal } from '@/types';

interface Props {
  data: {
    goal: SavingGoal;
    amount: number;
    progressPercent: number;
  };
}

export default function GoalProgressCard({ data }: Props) {
  const { goal, amount, progressPercent } = data;
  return (
    <div className="bg-white rounded-2xl shadow-bubble p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">
          {goal.emoji} {goal.name}
        </div>
        <div className="text-xs text-brand-600 font-medium">+{fmtCurrency(amount)}</div>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          已攒 {fmtCurrency(goal.currentAmount)} / {fmtCurrency(goal.targetAmount)}
        </span>
        <span className="font-semibold text-brand-600">{progressPercent}%</span>
      </div>
    </div>
  );
}
