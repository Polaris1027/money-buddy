import { useMemo, useState } from 'react';
import {
  ALL_CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type Category,
} from '@/types';

interface Props {
  value: Partial<Record<Category, number>>;
  onChange: (next: Partial<Record<Category, number>>) => void;
}

/** 快捷预设方案 */
const PRESETS: { key: string; label: string; emoji: string; budgets: Partial<Record<Category, number>> }[] = [
  {
    key: 'thrifty',
    label: '省吃俭用',
    emoji: '🌱',
    budgets: { food: 20, snack: 5, transport: 5 },
  },
  {
    key: 'balanced',
    label: '均衡型',
    emoji: '⚖️',
    budgets: { food: 30, shopping: 20, snack: 10, transport: 10, entertainment: 10 },
  },
  {
    key: 'foodie',
    label: '吃货专享',
    emoji: '🍱',
    budgets: { food: 40, snack: 15, fruit: 10 },
  },
];

export default function CategoryBudgetEditor({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const enabledList = useMemo(
    () =>
      ALL_CATEGORIES.filter((c) => typeof value[c] === 'number'),
    [value],
  );

  const remainCats = useMemo(
    () => ALL_CATEGORIES.filter((c) => typeof value[c] !== 'number'),
    [value],
  );

  const total = useMemo(
    () =>
      Object.values(value).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0),
    [value],
  );

  function setBudget(cat: Category, amount: number) {
    const next = { ...value, [cat]: Math.max(0, Math.round(amount)) };
    onChange(next);
  }

  function removeBudget(cat: Category) {
    const next = { ...value };
    delete next[cat];
    onChange(next);
  }

  function addBudget(cat: Category) {
    setShowPicker(false);
    onChange({ ...value, [cat]: 20 });
  }

  function applyPreset(presetBudgets: Partial<Record<Category, number>>) {
    onChange({ ...presetBudgets });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="space-y-3">
      {/* 快捷预设 */}
      <div>
        <div className="text-[11px] text-gray-400 mb-1.5">快捷预设</div>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.budgets)}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] text-gray-700 hover:border-brand-300 hover:bg-brand-50 active:scale-95"
            >
              {p.emoji} {p.label}
            </button>
          ))}
          {enabledList.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] text-gray-400 hover:border-red-300 hover:text-red-500 active:scale-95"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 已启用的分类预算 */}
      <div className="space-y-2">
        {enabledList.length === 0 ? (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center border border-dashed border-gray-200">
            还没设置任何分类预算
            <div className="text-[11px] text-gray-400 mt-1">
              点击下方「添加分类」或选择上方预设
            </div>
          </div>
        ) : (
          enabledList.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"
            >
              <span className="text-xl shrink-0">{CATEGORY_EMOJI[cat]}</span>
              <span className="text-sm text-gray-700 w-14 shrink-0">
                {CATEGORY_LABEL[cat]}
              </span>
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  ¥
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={value[cat] ?? 0}
                  onChange={(e) => setBudget(cat, parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <button
                type="button"
                onClick={() => removeBudget(cat)}
                aria-label={`删除${CATEGORY_LABEL[cat]}预算`}
                className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 active:scale-95 text-base leading-none flex items-center justify-center shrink-0"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* 添加分类 */}
      <div>
        {showPicker ? (
          <div className="bg-white border border-gray-200 rounded-xl p-2.5 max-h-52 overflow-y-auto scroll-thin">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500">选择要监督的分类</span>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                取消
              </button>
            </div>
            {remainCats.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">
                所有分类都已添加 🎉
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {remainCats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addBudget(c)}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-lg border border-gray-100 bg-gray-50 hover:bg-brand-50 hover:border-brand-200 active:scale-95"
                  >
                    <span className="text-lg leading-none">{CATEGORY_EMOJI[c]}</span>
                    <span className="text-[11px] text-gray-700">
                      {CATEGORY_LABEL[c]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            disabled={remainCats.length === 0}
            className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600 active:scale-[0.99] disabled:opacity-50"
          >
            + 添加分类
          </button>
        )}
      </div>

      {/* 合计 */}
      {enabledList.length > 0 && (
        <div className="text-[11px] text-gray-500 bg-brand-50 rounded-xl px-3 py-2 flex items-center justify-between">
          <span>💡 每日预算合计</span>
          <span className="text-brand-700 font-semibold">¥{total}</span>
        </div>
      )}
    </div>
  );
}
