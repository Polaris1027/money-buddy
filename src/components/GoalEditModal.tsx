import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { SavingGoal } from '@/types';
import { fmtCurrency } from '@/utils/date';

interface Props {
  goal: SavingGoal;
  onClose: () => void;
  onSave: (patch: Partial<SavingGoal>) => void;
  onDelete: () => void;
}

const EMOJI_OPTIONS = [
  '🎯', '✈️', '📱', '💻', '👟', '🆘', '📚', '🎁',
  '🏠', '🚗', '💍', '🎮', '🎵', '📷', '⌚', '🎒',
  '🐾', '🏋️', '✏️', '🌟',
];

export default function GoalEditModal({ goal, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(goal.name);
  const [emoji, setEmoji] = useState(goal.emoji);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [currentAmount, setCurrentAmount] = useState(String(goal.currentAmount));
  const [deadline, setDeadline] = useState(goal.deadline);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const targetNum = parseFloat(targetAmount);
  const currentNum = parseFloat(currentAmount);
  const validName = name.trim().length > 0 && name.trim().length <= 30;
  const validTarget = !Number.isNaN(targetNum) && targetNum > 0 && targetNum <= 10000000;
  const validCurrent =
    !Number.isNaN(currentNum) && currentNum >= 0 && currentNum <= (validTarget ? targetNum : Infinity);
  const validDeadline = dayjs(deadline).isValid();
  const valid = validName && validTarget && validCurrent && validDeadline;

  const changed =
    name.trim() !== goal.name ||
    emoji !== goal.emoji ||
    targetNum !== goal.targetAmount ||
    currentNum !== goal.currentAmount ||
    deadline !== goal.deadline;

  function handleSave() {
    if (!valid || !changed) return;
    // 若已攒金额达到/超过新目标 → 标记为完成
    const newStatus = currentNum >= targetNum ? 'completed' : 'active';
    onSave({
      name: name.trim(),
      emoji,
      targetAmount: targetNum,
      currentAmount: Math.min(currentNum, targetNum),
      deadline,
      status: newStatus,
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
        className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5 max-h-[92vh] overflow-y-auto scroll-thin animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">编辑目标</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none w-8 h-8"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* Emoji + 名称 */}
        <label className="block text-sm text-gray-600 mb-1">图标 & 名称</label>
        <div className="flex gap-2 mb-1">
          <button
            onClick={() => setEmojiPickerOpen((v) => !v)}
            className="w-14 h-12 bg-gray-50 border border-gray-200 rounded-lg text-2xl hover:bg-gray-100"
          >
            {emoji}
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="目标名称（最多 30 字）"
            maxLength={30}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
        </div>
        {emojiPickerOpen && (
          <div className="grid grid-cols-10 gap-1 p-2 bg-gray-50 rounded-lg mb-2 animate-fade-in">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setEmoji(e);
                  setEmojiPickerOpen(false);
                }}
                className={`text-xl py-1 rounded hover:bg-white ${
                  emoji === e ? 'bg-white ring-2 ring-brand-400' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        {!validName && name && (
          <div className="text-xs text-red-500 mb-2">名称不能为空</div>
        )}
        <div className="mb-4" />

        {/* 目标金额 */}
        <label className="block text-sm text-gray-600 mb-1">目标金额</label>
        <div className="relative mb-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="decimal"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold outline-none focus:border-brand-400 focus:bg-white"
          />
        </div>
        {!validTarget && targetAmount && (
          <div className="text-xs text-red-500 mb-2">请输入合理金额（0 ~ 10,000,000）</div>
        )}
        <div className="mb-4" />

        {/* 已攒金额 */}
        <label className="block text-sm text-gray-600 mb-1">
          已攒金额{' '}
          {validTarget && (
            <span className="text-xs text-gray-400 ml-1">
              （进度 {validCurrent ? Math.round((currentNum / targetNum) * 100) : 0}%）
            </span>
          )}
        </label>
        <div className="relative mb-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="decimal"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
        </div>
        {!validCurrent && (
          <div className="text-xs text-red-500 mb-2">
            已攒金额需 ≥ 0 且不超过目标金额（{fmtCurrency(validTarget ? targetNum : 0)}）
          </div>
        )}
        <div className="mb-4" />

        {/* 截止日期 */}
        <label className="block text-sm text-gray-600 mb-1">截止日期</label>
        <input
          type="date"
          value={deadline}
          min={dayjs().format('YYYY-MM-DD')}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white mb-5"
        />

        {/* 操作 */}
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
            删除目标会同时清除该目标下的所有打卡记录
          </div>
        )}
      </div>
    </div>
  );
}
