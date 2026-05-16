import { fmtCurrency } from '@/utils/date';
import dayjs from 'dayjs';

interface Props {
  data: {
    name: string;
    amount: number;
    deadline: string;
    plan: {
      daysRemaining: number;
      weeksRemaining: number;
      dailyAmount: number;
      weeklyAmount: number;
      baseAmount?: number;
      increment?: number;
    };
  };
}

export default function GoalCreateCard({ data }: Props) {
  const { plan } = data;
  return (
    <div className="bg-gradient-to-br from-brand-50 to-white rounded-2xl shadow-bubble p-4 border border-brand-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-brand-700 font-medium">📋 储蓄计划</span>
        <span className="text-xs text-gray-400">
          截止 {dayjs(data.deadline).format('M月D日')}
        </span>
      </div>
      <div className="text-lg font-semibold text-gray-800 mb-1">{data.name}</div>
      <div className="text-xl font-bold text-brand-600 mb-3">
        {fmtCurrency(data.amount)}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white rounded-lg p-2">
          <div className="text-xs text-gray-500">每周需攒</div>
          <div className="font-semibold text-gray-800">
            {fmtCurrency(plan.weeklyAmount)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-2">
          <div className="text-xs text-gray-500">每天需攒</div>
          <div className="font-semibold text-gray-800">
            {fmtCurrency(plan.dailyAmount)}
          </div>
        </div>
      </div>
      {plan.baseAmount && plan.increment && (
        <div className="mt-3 text-xs text-gray-500 bg-white rounded-lg p-2">
          💡 推荐 52 周变体：第 1 周 {fmtCurrency(plan.baseAmount)}，每周递增{' '}
          {fmtCurrency(plan.increment)}
        </div>
      )}
    </div>
  );
}
