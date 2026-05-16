import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  getPeriodAnalysis,
  getInsights,
  checkBudgetStatus,
  checkYearlyBudgetStatus,
} from '@/services/analysisService';
import { CATEGORY_COLOR, CATEGORY_LABEL, CATEGORY_EMOJI, type Category, type Transaction } from '@/types';
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
import TransactionEditModal from '@/components/TransactionEditModal';
import dayjs from 'dayjs';

interface Props {
  onBack: () => void;
}

type Period = 'week' | 'month' | 'year';

export default function AnalysisPage({ onBack }: Props) {
  const transactions = useAppStore((s) => s.transactions);
  const monthlyBudget = useAppStore((s) => s.user.monthlyBudget);
  const yearlyBudget = useAppStore((s) => s.user.yearlyBudget);
  const updateUser = useAppStore((s) => s.updateUser);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const [period, setPeriod] = useState<Period>('month');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);

  const analysis = getPeriodAnalysis(transactions, period);
  const insights = getInsights(transactions, period);
  const budget = checkBudgetStatus(transactions, monthlyBudget);
  const yearBudget = checkYearlyBudgetStatus(transactions, monthlyBudget, yearlyBudget);

  return (
    <div className="h-full flex flex-col bg-bg">
      <PageHeader title="消费分析 📊" onBack={onBack} />

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4">
        {/* 周期切换 */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
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

        {/* 预算总览（月度 / 年度） */}
        {period === 'month' && (
          <BudgetCard
            title="本月支出 / 预算"
            data={budget}
            onEdit={() => setShowBudgetEdit(true)}
          />
        )}
        {period === 'year' && (
          <BudgetCard
            title="本年支出 / 预算"
            data={yearBudget}
            onEdit={() => setShowBudgetEdit(true)}
            sub={
              yearlyBudget && yearlyBudget > 0
                ? `自定义年度预算`
                : `默认 = 月度预算 × 12`
            }
          />
        )}

        {/* 总览卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="总支出" value={fmtCurrency(analysis.total)} />
          <StatCard label="笔数" value={`${analysis.count}笔`} />
          <StatCard
            label={period === 'year' ? '月均' : '均单'}
            value={fmtCurrency(
              Math.round(
                period === 'year'
                  ? analysis.total / Math.max(1, dayjs().month() + 1)
                  : analysis.average,
              ),
            )}
          />
        </div>

        {/* 分类饼图 */}
        {analysis.byCategory.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-800 mb-3">消费分类</div>
            <div className="flex items-center gap-3">
              <div className="w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.byCategory}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {analysis.byCategory.map((c) => (
                        <Cell key={c.category} fill={CATEGORY_COLOR[c.category]} />
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
                {analysis.byCategory.slice(0, 6).map((c) => (
                  <div key={c.category} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: CATEGORY_COLOR[c.category] }}
                    />
                    <span className="text-gray-700">
                      {CATEGORY_EMOJI[c.category]} {c.label}
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
          <EmptyHint
            icon="📭"
            text={`${period === 'week' ? '本周' : period === 'month' ? '本月' : '本年'}还没有消费记录哦~`}
            sub='去对话页发 "奶茶15" 记一笔吧 ✨'
          />
        )}

        {/* 趋势图：年度用柱状（按月），其它用折线 */}
        {analysis.trend.length > 1 && analysis.total > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-800 mb-3">
              {period === 'year' ? '月度消费趋势' : '消费趋势'}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                {period === 'year' ? (
                  <BarChart data={analysis.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Bar dataKey="amount" fill="#4CAF50" radius={[6, 6, 0, 0]} />
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
                      stroke="#4CAF50"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#4CAF50' }}
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
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-800">最近账单</div>
              <div className="text-xs text-gray-400">点击修改/删除</div>
            </div>
            {(() => {
              const sorted = [...transactions].sort(
                (a, b) =>
                  dayjs(b.transactionDate).valueOf() -
                    dayjs(a.transactionDate).valueOf() ||
                  b.createdAt - a.createdAt,
              );
              // 按天分组，最多展示最近 7 天
              const groupsMap = new Map<string, Transaction[]>();
              for (const t of sorted) {
                const d = t.transactionDate;
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
                              <span className="text-gray-700 font-medium">
                                -{fmtCurrency(dayTotal)}
                              </span>
                            </span>
                          </div>
                          <ul className="divide-y divide-gray-50 bg-gray-50/50 rounded-xl px-2">
                            {list.map((t) => (
                              <li key={t.transactionId}>
                                <button
                                  onClick={() => setEditingTx(t)}
                                  className="w-full flex items-center gap-3 py-2.5 text-sm hover:bg-white active:bg-gray-100 px-2 rounded-lg transition"
                                >
                                  <span
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                                    style={{
                                      background:
                                        CATEGORY_COLOR[t.category as Category] + '20',
                                    }}
                                  >
                                    {CATEGORY_EMOJI[t.category as Category]}
                                  </span>
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="truncate text-gray-800">
                                      {t.note || CATEGORY_LABEL[t.category as Category]}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {CATEGORY_LABEL[t.category as Category]}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-700">
                                      -{fmtCurrency(t.amount)}
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
                  {transactions.length > shownCount && (
                    <div className="text-xs text-gray-400 text-center mt-3">
                      共 {transactions.length} 笔，显示最近 {groups.length} 天 / {shownCount} 笔
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {editingTx && (
        <TransactionEditModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(patch) => updateTransaction(editingTx.transactionId, patch)}
          onDelete={() => removeTransaction(editingTx.transactionId)}
        />
      )}

      {showBudgetEdit && (
        <BudgetEditModal
          monthlyBudget={monthlyBudget}
          yearlyBudget={yearlyBudget ?? 0}
          onClose={() => setShowBudgetEdit(false)}
          onSave={(m, y) => {
            updateUser({ monthlyBudget: m, yearlyBudget: y });
            setShowBudgetEdit(false);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

function EmptyHint({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm text-gray-700">{text}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
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

/* ----------------------- 预算卡片 ----------------------- */
function BudgetCard({
  title,
  data,
  onEdit,
  sub,
}: {
  title: string;
  data: { spent: number; budget: number; remaining: number; percentage: number };
  onEdit: () => void;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-500">{title}</span>
        <button
          onClick={onEdit}
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          ⚙️ 调整
        </button>
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-2">
        {fmtCurrency(data.spent)}{' '}
        <span className="text-base text-gray-400 font-normal">
          / {fmtCurrency(data.budget)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${
            data.percentage >= 100
              ? 'bg-red-500'
              : data.percentage >= 80
                ? 'bg-yellow-500'
                : 'bg-brand-500'
          }`}
          style={{ width: `${Math.min(100, data.percentage)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-400">
          {sub ?? `剩余 ${fmtCurrency(data.remaining)}`}
        </span>
        <span className="text-xs text-gray-400">
          {data.percentage.toFixed(0)}% 已使用
        </span>
      </div>
    </div>
  );
}

/* ----------------------- 预算编辑弹窗 ----------------------- */
function BudgetEditModal({
  monthlyBudget,
  yearlyBudget,
  onClose,
  onSave,
}: {
  monthlyBudget: number;
  yearlyBudget: number;
  onClose: () => void;
  onSave: (m: number, y: number) => void;
}) {
  const [m, setM] = useState(String(monthlyBudget || ''));
  const [y, setY] = useState(String(yearlyBudget || ''));
  const [autoYear, setAutoYear] = useState(!yearlyBudget || yearlyBudget <= 0);

  function submit() {
    const mv = parseFloat(m);
    if (!mv || mv <= 0) {
      alert('请输入正确的月度预算');
      return;
    }
    const yv = autoYear ? 0 : parseFloat(y);
    if (!autoYear && (!yv || yv <= 0)) {
      alert('请输入正确的年度预算，或勾选自动按月度计算');
      return;
    }
    onSave(mv, yv);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">⚙️ 预算设置</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">月度预算</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
              <input
                type="number"
                value={m}
                onChange={(e) => setM(e.target.value)}
                placeholder="2000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={autoYear}
                onChange={(e) => setAutoYear(e.target.checked)}
                className="accent-brand-500"
              />
              <span className="text-xs text-gray-600">
                年度预算自动按月度 × 12 计算
              </span>
            </label>
            {!autoYear && (
              <>
                <div className="text-xs text-gray-500 mb-2">年度预算</div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                  <input
                    type="number"
                    value={y}
                    onChange={(e) => setY(e.target.value)}
                    placeholder="24000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2">
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
    </div>
  );
}
