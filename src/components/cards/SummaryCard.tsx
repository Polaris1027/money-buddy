import { fmtCurrency } from '@/utils/date';
import { CATEGORY_COLOR, type Category } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  data: {
    period: 'day' | 'week' | 'month';
    total: number;
    count: number;
    byCategory: Array<{ category: Category; label: string; amount: number; percentage: number }>;
    insights: Array<{ text: string }>;
  };
}

export default function SummaryCard({ data }: Props) {
  const periodLabel =
    data.period === 'day' ? '今日' : data.period === 'week' ? '本周' : '本月';
  return (
    <div className="bg-white rounded-2xl shadow-bubble p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">{periodLabel}消费总览</div>
        <div className="text-xs text-gray-400">{data.count} 笔</div>
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-3">
        {fmtCurrency(data.total)}
      </div>
      {data.byCategory.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="amount"
                  innerRadius={28}
                  outerRadius={45}
                  paddingAngle={2}
                >
                  {data.byCategory.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLOR[c.category]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, p: any) => [fmtCurrency(v), p.payload.label]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1 text-xs">
            {data.byCategory.slice(0, 4).map((c) => (
              <div key={c.category} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: CATEGORY_COLOR[c.category] }}
                />
                <span className="text-gray-600">{c.label}</span>
                <span className="text-gray-400 ml-auto">{c.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.insights.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-brand-700">
          💡 {data.insights[0].text}
        </div>
      )}
    </div>
  );
}
