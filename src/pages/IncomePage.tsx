import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  getIncomeAnalysis,
  getBalance,
  getIncomeInsights,
  type IncomePeriod,
} from '@/services/incomeService';
import {
  ALL_INCOME_SOURCES,
  INCOME_SOURCE_COLOR,
  INCOME_SOURCE_EMOJI,
  INCOME_SOURCE_LABEL,
  type Income,
  type IncomeSource,
} from '@/types';
import { fmtCurrency } from '@/utils/date';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import dayjs from 'dayjs';

interface Props {
  onBack: () => void;
}

export default function IncomePage({ onBack }: Props) {
  const incomes = useAppStore((s) => s.incomes);
  const transactions = useAppStore((s) => s.transactions);
  const addIncome = useAppStore((s) => s.addIncome);
  const updateIncome = useAppStore((s) => s.updateIncome);
  const removeIncome = useAppStore((s) => s.removeIncome);

  const [period, setPeriod] = useState<IncomePeriod>('month');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);

  const analysis = getIncomeAnalysis(incomes, period);
  const balance = getBalance(incomes, transactions, period);
  const insights = getIncomeInsights(incomes, transactions, period);

  const periodLabel = period === 'week' ? '本周' : period === 'month' ? '本月' : '本年';

  return (
    <div className="h-full flex flex-col bg-bg">
      <PageHeader
        title="收入分析 💰"
        onBack={onBack}
        right={
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            + 记一笔
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4 pb-24">
        {/* 周期切换 */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {(['week', 'month', 'year'] as IncomePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-sm transition ${
                period === p ? 'bg-brand-500 text-white' : 'text-gray-600'
              }`}
            >
              {p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
            </button>
          ))}
        </div>

        {/* 收入总览卡 */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-emerald-700 mb-1">{periodLabel}总收入</div>
          <div className="text-3xl font-bold text-emerald-700 mb-3">
            +{fmtCurrency(analysis.total)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <SummaryItem
              label="笔数"
              value={`${analysis.count}笔`}
              tone="emerald"
            />
            <SummaryItem
              label={period === 'year' ? '月均' : '均笔'}
              value={fmtCurrency(
                Math.round(
                  period === 'year'
                    ? analysis.total / Math.max(1, dayjs().month() + 1)
                    : analysis.average,
                ),
              )}
              tone="emerald"
            />
            <SummaryItem
              label="环比"
              value={
                analysis.comparison.previous > 0
                  ? `${analysis.comparison.changeRate >= 0 ? '+' : ''}${analysis.comparison.changeRate.toFixed(0)}%`
                  : '—'
              }
              tone={
                analysis.comparison.changeRate >= 0 ? 'emerald' : 'rose'
              }
            />
          </div>
        </div>

        {/* 收支结余 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-800 mb-3">{periodLabel}收支</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[11px] text-gray-400">收入</div>
              <div className="text-base font-semibold text-emerald-600 mt-0.5">
                +{fmtCurrency(balance.income)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400">支出</div>
              <div className="text-base font-semibold text-rose-500 mt-0.5">
                -{fmtCurrency(balance.expense)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400">结余</div>
              <div
                className={`text-base font-semibold mt-0.5 ${
                  balance.balance >= 0 ? 'text-gray-800' : 'text-red-500'
                }`}
              >
                {balance.balance >= 0 ? '' : '-'}
                {fmtCurrency(Math.abs(balance.balance))}
              </div>
            </div>
          </div>
          {balance.income > 0 && (
            <>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-rose-300"
                  style={{
                    width: `${Math.min(100, (balance.expense / balance.income) * 100)}%`,
                  }}
                />
                {balance.balance > 0 && (
                  <div
                    className="h-full bg-emerald-400"
                    style={{
                      width: `${Math.min(100, (balance.balance / balance.income) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <div className="text-[11px] text-gray-400 mt-1.5 flex justify-between">
                <span>支出占 {((balance.expense / balance.income) * 100).toFixed(0)}%</span>
                <span>
                  储蓄率 {(balance.savingRate * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* 来源饼图 */}
        {analysis.bySource.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-800 mb-3">收入来源</div>
            <div className="flex items-center gap-3">
              <div className="w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.bySource}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {analysis.bySource.map((c) => (
                        <Cell key={c.source} fill={INCOME_SOURCE_COLOR[c.source]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _n, p: any) => [
                        fmtCurrency(v),
                        p.payload.label,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {analysis.bySource.map((c) => (
                  <div key={c.source} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: INCOME_SOURCE_COLOR[c.source] }}
                    />
                    <span className="text-gray-700">
                      {INCOME_SOURCE_EMOJI[c.source]} {c.label}
                    </span>
                    <span className="ml-auto text-gray-500">
                      {fmtCurrency(c.amount)}
                    </span>
                    <span className="text-gray-400 text-xs w-9 text-right">
                      {c.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-sm text-gray-700 mb-1">
              {periodLabel}还没有收入记录
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 px-4 py-2 bg-brand-500 text-white text-sm rounded-xl font-medium active:scale-95"
            >
              + 记一笔收入
            </button>
          </div>
        )}

        {/* 趋势图 */}
        {analysis.trend.length > 1 && analysis.total > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-800 mb-3">
              {period === 'year' ? '月度收入趋势' : '收入趋势'}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                {period === 'year' ? (
                  <BarChart data={analysis.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Bar dataKey="amount" fill="#26A69A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={analysis.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#26A69A"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#26A69A' }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 智能洞察 */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-800 mb-2">💡 学姐洞察</div>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {insights.map((i, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-brand-500">•</span>
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 最近记录（按天分组） */}
        {incomes.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-800">最近收入</div>
              <div className="text-xs text-gray-400">点击修改/删除</div>
            </div>
            {(() => {
              const sorted = [...incomes].sort(
                (a, b) =>
                  dayjs(b.incomeDate).valueOf() - dayjs(a.incomeDate).valueOf() ||
                  b.createdAt - a.createdAt,
              );
              const groupsMap = new Map<string, Income[]>();
              for (const t of sorted) {
                const d = t.incomeDate;
                if (!groupsMap.has(d)) groupsMap.set(d, []);
                groupsMap.get(d)!.push(t);
              }
              const groups = Array.from(groupsMap.entries()).slice(0, 7);
              const shownCount = groups.reduce((s, [, list]) => s + list.length, 0);
              return (
                <>
                  <div className="space-y-3">
                    {groups.map(([date, list]) => {
                      const dayTotal = list.reduce((s, t) => s + t.amount, 0);
                      return (
                        <div key={date}>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 px-0.5">
                            <span>
                              {formatDayLabel(date)}
                              <span className="text-gray-300 ml-1.5">
                                {dayjs(date).format('M月D日 ddd')}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              共 {list.length} 笔 ·{' '}
                              <span className="text-emerald-600 font-medium">
                                +{fmtCurrency(dayTotal)}
                              </span>
                            </span>
                          </div>
                          <ul className="divide-y divide-gray-50 bg-gray-50/50 rounded-xl px-2">
                            {list.map((t) => (
                              <li key={t.incomeId}>
                                <button
                                  onClick={() => setEditing(t)}
                                  className="w-full flex items-center gap-3 py-2.5 text-sm hover:bg-white active:bg-gray-100 px-2 rounded-lg transition"
                                >
                                  <span
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                                    style={{
                                      background: INCOME_SOURCE_COLOR[t.source] + '20',
                                    }}
                                  >
                                    {INCOME_SOURCE_EMOJI[t.source]}
                                  </span>
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="truncate text-gray-800">
                                      {t.note || INCOME_SOURCE_LABEL[t.source]}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {INCOME_SOURCE_LABEL[t.source]}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-emerald-600">
                                      +{fmtCurrency(t.amount)}
                                    </div>
                                    <div className="text-[10px] text-gray-300 mt-0.5">
                                      轻点编辑
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  {incomes.length > shownCount && (
                    <div className="text-xs text-gray-400 text-center mt-3">
                      共 {incomes.length} 笔，显示最近 {groups.length} 天 / {shownCount} 笔
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => setShowAdd(true)}
        className="absolute bottom-4 right-4 px-4 py-3 rounded-full bg-brand-500 text-white text-sm font-semibold shadow-lg active:scale-95 hover:bg-brand-600 flex items-center gap-1.5 z-10"
      >
        <span>+</span>
        <span>记一笔收入</span>
      </button>

      {showAdd && (
        <IncomeEditModal
          onClose={() => setShowAdd(false)}
          onSave={(data) => {
            addIncome(data);
            setShowAdd(false);
          }}
        />
      )}

      {editing && (
        <IncomeEditModal
          income={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateIncome(editing.incomeId, patch);
            setEditing(null);
          }}
          onDelete={() => {
            removeIncome(editing.incomeId);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose';
}) {
  const colorMap = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-500',
  };
  return (
    <div className="bg-white/60 rounded-xl py-2 px-1">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${colorMap[tone]}`}>{value}</div>
    </div>
  );
}

/** 把日期字符串渲染为 今天 / 昨天 / 前天 等友好标签 */
function formatDayLabel(date: string): string {
  const today = dayjs().startOf('day');
  const d = dayjs(date).startOf('day');
  const diff = today.diff(d, 'day');
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  if (diff < 7) return `${diff} 天前`;
  return d.format('YYYY-MM-DD');
}

/* ----------------------- 收入编辑弹窗 ----------------------- */
function IncomeEditModal({
  income,
  onClose,
  onSave,
  onDelete,
}: {
  income?: Income;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    source: IncomeSource;
    note?: string;
    incomeDate?: string;
  }) => void;
  onDelete?: () => void;
}) {
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [source, setSource] = useState<IncomeSource>(income?.source ?? 'allowance');
  const [note, setNote] = useState(income?.note ?? '');
  const [incomeDate, setIncomeDate] = useState(
    income?.incomeDate ?? dayjs().format('YYYY-MM-DD'),
  );

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('请输入正确的金额');
      return;
    }
    onSave({
      amount: amt,
      source,
      note: note.trim(),
      incomeDate,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {income ? '编辑收入' : '记一笔收入 💰'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4 space-y-4">
          {/* 金额 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">金额</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-3 text-lg font-semibold outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 来源 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">来源</div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_INCOME_SOURCES.map((s) => {
                const active = source === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs transition active:scale-95 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}
                  >
                    <span className="text-xl leading-none">
                      {INCOME_SOURCE_EMOJI[s]}
                    </span>
                    <span>{INCOME_SOURCE_LABEL[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">备注（可选）</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如：5月生活费"
              maxLength={30}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>

          {/* 日期 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">日期</div>
            <input
              type="date"
              value={incomeDate}
              max={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => setIncomeDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('确定删除这笔收入吗？')) onDelete();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 text-sm font-medium active:scale-95"
            >
              删除
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:scale-95"
          >
            取消
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium active:scale-95 hover:bg-brand-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
