import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { fmtCurrency } from '@/utils/date';
import type { PlanType } from '@/types';

interface Props {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    emoji: string;
    targetAmount: number;
    deadline: string;
    planType: PlanType;
  }) => void;
}

const EMOJI_OPTIONS = [
  '🎯', '✈️', '📱', '💻', '👟', '🆘', '📚', '🎁',
  '🏠', '🚗', '💍', '🎮', '🎵', '📷', '⌚', '🎒',
  '🐾', '🏋️', '✏️', '🌟',
];

const QUICK_TEMPLATES: { name: string; emoji: string; amount: number; days: number }[] = [
  { name: '换新手机', emoji: '📱', amount: 4000, days: 180 },
  { name: '寒假旅行', emoji: '✈️', amount: 3000, days: 90 },
  { name: '考研报班', emoji: '📚', amount: 2000, days: 120 },
  { name: '应急储备金', emoji: '🆘', amount: 1500, days: 90 },
  { name: '生日礼物', emoji: '🎁', amount: 500, days: 60 },
  { name: '游戏装备', emoji: '🎮', amount: 800, days: 60 },
];

const QUICK_DEADLINES: { label: string; days: number }[] = [
  { label: '1 个月', days: 30 },
  { label: '3 个月', days: 90 },
  { label: '6 个月', days: 180 },
  { label: '1 年', days: 365 },
];

/**
 * 手动新建储蓄目标弹窗
 *  - 不依赖对话框识别，可直接从『储蓄目标』页右上角『+』进入
 *  - 提供热门模板一键填充
 *  - 校验规则与 GoalEditModal 保持一致
 */
export default function GoalCreateModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState(dayjs().add(90, 'day').format('YYYY-MM-DD'));
  const [planType, setPlanType] = useState<PlanType>('incremental');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const targetNum = parseFloat(targetAmount);
  const validName = name.trim().length > 0 && name.trim().length <= 30;
  const validTarget = !Number.isNaN(targetNum) && targetNum > 0 && targetNum <= 10_000_000;
  const validDeadline =
    dayjs(deadline).isValid() && dayjs(deadline).isAfter(dayjs().subtract(1, 'day'));
  const valid = validName && validTarget && validDeadline;

  function applyTemplate(t: (typeof QUICK_TEMPLATES)[number]) {
    setName(t.name);
    setEmoji(t.emoji);
    setTargetAmount(String(t.amount));
    setDeadline(dayjs().add(t.days, 'day').format('YYYY-MM-DD'));
  }

  function handleCreate() {
    if (!valid) return;
    onCreate({
      name: name.trim(),
      emoji,
      targetAmount: targetNum,
      deadline,
      planType,
    });
    onClose();
  }

  // 实时计算每日 / 每周需攒
  const days = validDeadline ? Math.max(1, dayjs(deadline).diff(dayjs(), 'day')) : 0;
  const weeklyAmount = validTarget && days > 0 ? Math.ceil(targetNum / Math.max(1, days / 7)) : 0;
  const dailyAmount = validTarget && days > 0 ? Math.ceil(targetNum / days) : 0;

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
          <h2 className="text-lg font-semibold text-gray-800">新建储蓄目标 🎯</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none w-8 h-8"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* 热门模板 */}
        <label className="block text-sm text-gray-600 mb-2">热门模板（一键填充）</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="bg-gray-50 hover:bg-brand-50 border border-gray-100 rounded-lg p-2 text-center transition active:scale-95"
            >
              <div className="text-xl">{t.emoji}</div>
              <div className="text-xs text-gray-700 mt-0.5">{t.name}</div>
              <div className="text-[10px] text-gray-400">¥{t.amount}</div>
            </button>
          ))}
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
        <div className="mb-4" />

        {/* 目标金额 */}
        <label className="block text-sm text-gray-600 mb-1">目标金额</label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
          <input
            type="number"
            inputMode="decimal"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="例如 3000"
            className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold outline-none focus:border-brand-400 focus:bg-white"
          />
        </div>
        {!validTarget && targetAmount && (
          <div className="text-xs text-red-500 mb-2">请输入合理金额（0 ~ 10,000,000）</div>
        )}
        <div className="mb-4" />

        {/* 截止日期 */}
        <label className="block text-sm text-gray-600 mb-1">截止日期</label>
        <input
          type="date"
          value={deadline}
          min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 focus:bg-white mb-2"
        />
        <div className="flex gap-1.5 mb-4">
          {QUICK_DEADLINES.map((d) => (
            <button
              key={d.days}
              onClick={() => setDeadline(dayjs().add(d.days, 'day').format('YYYY-MM-DD'))}
              className="flex-1 py-1 text-xs bg-gray-50 text-gray-600 rounded-md hover:bg-brand-50 hover:text-brand-700 active:scale-95"
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* 储蓄方案 */}
        <label className="block text-sm text-gray-600 mb-1">储蓄方案</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setPlanType('average')}
            className={`p-3 rounded-lg border text-left transition ${
              planType === 'average'
                ? 'border-brand-400 bg-brand-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-800">📐 平均储蓄</div>
            <div className="text-[11px] text-gray-500 mt-0.5">每天/每周固定金额</div>
          </button>
          <button
            onClick={() => setPlanType('incremental')}
            className={`p-3 rounded-lg border text-left transition ${
              planType === 'incremental'
                ? 'border-brand-400 bg-brand-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="text-sm font-medium text-gray-800">📈 递增储蓄</div>
            <div className="text-[11px] text-gray-500 mt-0.5">每周递增，前少后多</div>
          </button>
        </div>

        {/* 实时预览 */}
        {valid && (
          <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-xl p-3 mb-5">
            <div className="text-xs text-brand-700 font-medium mb-1.5">📋 储蓄计划预览</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-gray-500">距截止</div>
                <div className="text-sm font-semibold text-gray-800">{days} 天</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">每周需攒</div>
                <div className="text-sm font-semibold text-gray-800">
                  {fmtCurrency(weeklyAmount)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">每天需攒</div>
                <div className="text-sm font-semibold text-gray-800">
                  {fmtCurrency(dailyAmount)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!valid}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400"
          >
            创建目标
          </button>
        </div>
      </div>
    </div>
  );
}
