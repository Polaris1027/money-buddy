import { fmtCurrency } from '@/utils/date';

interface Props {
  data: {
    amount: number;
    source: string;
    sourceLabel: string;
    sourceEmoji: string;
    note: string;
    monthIncome: number;
    monthBalance: number;
    savingRate?: number | null;
  };
}

/**
 * 收入卡片：与消费卡区分，使用绿色系主色
 */
export default function IncomeCard({ data }: Props) {
  const positive = data.monthBalance >= 0;
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-bubble p-4 border border-emerald-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{data.sourceEmoji}</span>
          <div className="min-w-0">
            <div className="text-xs text-emerald-700">
              收入 · {data.sourceLabel}
              {data.note && data.note !== data.sourceLabel ? ` · ${data.note}` : ''}
            </div>
            <div className="text-xl font-semibold text-emerald-700">
              +{fmtCurrency(data.amount)}
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">
          已记入收入
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-emerald-700/70">本月总收入</div>
          <div className="text-sm font-semibold text-emerald-700 mt-0.5">
            +{fmtCurrency(data.monthIncome)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">本月结余</div>
          <div
            className={`text-sm font-semibold mt-0.5 ${
              positive ? 'text-gray-800' : 'text-red-500'
            }`}
          >
            {positive ? '' : '-'}
            {fmtCurrency(Math.abs(data.monthBalance))}
            {typeof data.savingRate === 'number' && (
              <span className="ml-1 text-[10px] text-gray-400 font-normal">
                储蓄率 {data.savingRate}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
