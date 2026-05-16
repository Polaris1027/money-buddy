import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  CATEGORY_COLOR,
  ALL_CATEGORIES,
  type Category,
  type Transaction,
} from '@/types';

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSave: (patch: Partial<Transaction>) => void;
  onDelete: () => void;
}

const CATEGORIES: Category[] = ALL_CATEGORIES;

export default function TransactionEditModal({ transaction, onClose, onSave, onDelete }: Props) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState<Category>(transaction.category);
  const [note, setNote] = useState(transaction.note);
  const [date, setDate] = useState(transaction.transactionDate);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const amountNum = parseFloat(amount);
  const valid = !Number.isNaN(amountNum) && amountNum > 0 && amountNum < 1000000;
  const changed =
    amountNum !== transaction.amount ||
    category !== transaction.category ||
    note !== transaction.note ||
    date !== transaction.transactionDate;

  function handleSave() {
    if (!valid || !changed) return;
    onSave({
      amount: amountNum,
      category,
      note: note.trim(),
      transactionDate: date,
    });
    onClose();
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">编辑账单</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none w-8 h-8"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* 金额 */}
        <label className="block text-sm text-gray-600 mb-1">金额</label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold outline-none focus:border-brand-400 focus:bg-white"
          />
          {!valid && amount && (
            <div className="text-xs text-red-500 mt-1">请输入合理金额（0 ~ 1,000,000）</div>
          )}
        </div>

        {/* 分类 */}
        <label className="block text-sm text-gray-600 mb-2">分类</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4 max-h-48 overflow-y-auto scroll-thin pr-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`py-2 px-1 rounded-lg border text-xs transition flex flex-col items-center gap-0.5 ${
                category === c
                  ? 'border-2 bg-brand-50 font-medium'
                  : 'border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={
                category === c
                  ? {
                      borderColor: CATEGORY_COLOR[c],
                      background: CATEGORY_COLOR[c] + '15',
                      color: CATEGORY_COLOR[c],
                    }
                  : undefined
              }
            >
              <span className="text-lg leading-none">{CATEGORY_EMOJI[c]}</span>
              <span className="leading-none mt-0.5">{CATEGORY_LABEL[c]}</span>
            </button>
          ))}
        </div>

        {/* 备注 */}
        <label className="block text-sm text-gray-600 mb-1">备注</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="比如：午饭、奶茶、打车..."
          maxLength={50}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white mb-4"
        />

        {/* 日期 */}
        <label className="block text-sm text-gray-600 mb-1">日期</label>
        <input
          type="date"
          value={date}
          max={dayjs().format('YYYY-MM-DD')}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white mb-5"
        />

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              confirmDelete
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {confirmDelete ? '确认删除' : '删除'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || !changed}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400"
          >
            保存
          </button>
        </div>

        {confirmDelete && (
          <div className="text-xs text-red-500 text-center mt-3">
            再点一次"确认删除"将永久移除这笔记录
          </div>
        )}
      </div>
    </div>
  );
}
