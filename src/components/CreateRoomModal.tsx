import { useState } from 'react';
import type { Category, Friend, RoomType } from '@/types';
import { ROOM_TYPE_META } from '@/services/communityService';
import CategoryBudgetEditor from './CategoryBudgetEditor';
import dayjs from 'dayjs';

interface Props {
  friends: Friend[];
  defaultType?: RoomType;
  onClose: () => void;
  onCreate: (data: {
    type: RoomType;
    name: string;
    emoji: string;
    memberIds: string[];
    targetAmount?: number;
    deadline?: string;
    dailyBudget?: number;
    categoryBudgets?: Partial<Record<Category, number>>;
    challengeDays?: number;
  }) => void;
  onInviteFriends: () => void;
}

const EMOJI_PRESETS = ['🎯', '✈️', '💻', '🎁', '📱', '🎒', '🧋', '🏠', '💰', '🏆', '👀', '🎮'];

export default function CreateRoomModal({
  friends,
  defaultType = 'save_together',
  onClose,
  onCreate,
  onInviteFriends,
}: Props) {
  const [type, setType] = useState<RoomType>(defaultType);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [categoryBudgets, setCategoryBudgets] = useState<Partial<Record<Category, number>>>({
    food: 30,
    snack: 10,
    shopping: 20,
  });
  const [challengeDays, setChallengeDays] = useState('7');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  function toggleFriend(id: string) {
    setSelectedFriends((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );
  }

  function submit() {
    if (!name.trim()) {
      alert('给房间起个名字吧～');
      return;
    }
    if (type === 'save_together') {
      const amt = parseFloat(targetAmount);
      if (!amt || amt <= 0) {
        alert('请输入攒钱目标金额');
        return;
      }
      onCreate({
        type,
        name: name.trim(),
        emoji,
        memberIds: selectedFriends,
        targetAmount: amt,
        deadline,
      });
    } else if (type === 'pk_checkin') {
      const days = parseInt(challengeDays, 10);
      if (!days || days <= 0) {
        alert('请输入挑战天数');
        return;
      }
      onCreate({
        type,
        name: name.trim(),
        emoji,
        memberIds: selectedFriends,
        challengeDays: days,
        deadline: dayjs().add(days, 'day').format('YYYY-MM-DD'),
      });
    } else {
      // supervise_spend
      const validEntries = (Object.entries(categoryBudgets) as [Category, number | undefined][])
        .filter(([, v]) => typeof v === 'number' && (v as number) > 0);
      if (validEntries.length === 0) {
        alert('请至少为一个分类设置预算');
        return;
      }
      const cleaned: Partial<Record<Category, number>> = {};
      for (const [k, v] of validEntries) cleaned[k] = v;
      onCreate({
        type,
        name: name.trim(),
        emoji,
        memberIds: selectedFriends,
        categoryBudgets: cleaned,
      });
    }
  }

  const types: RoomType[] = ['save_together', 'pk_checkin', 'supervise_spend'];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">创建搭子房间</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4 space-y-4">
          {/* 类型选择 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">玩法类型</div>
            <div className="grid grid-cols-3 gap-2">
              {types.map((t) => {
                const meta = ROOM_TYPE_META[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs transition active:scale-95 ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}
                  >
                    <span className="text-2xl leading-none">{meta.emoji}</span>
                    <span className="font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-gray-400 mt-1.5">
              {ROOM_TYPE_META[type].desc}
            </div>
          </div>

          {/* 名字 + emoji */}
          <div>
            <div className="text-xs text-gray-500 mb-2">房间名称</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const idx = EMOJI_PRESETS.indexOf(emoji);
                  setEmoji(EMOJI_PRESETS[(idx + 1) % EMOJI_PRESETS.length]!);
                }}
                className="w-12 h-11 rounded-xl border border-gray-200 bg-gray-50 text-2xl active:scale-95"
                aria-label="切换图标"
              >
                {emoji}
              </button>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder={
                  type === 'save_together'
                    ? '比如：暑假旅行基金'
                    : type === 'pk_checkin'
                      ? '比如：暑假记账PK'
                      : '比如：奶茶限制小队'
                }
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 类型相关字段 */}
          {type === 'save_together' && (
            <>
              <div>
                <div className="text-xs text-gray-500 mb-2">目标金额</div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="3000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">截止日期</div>
                <input
                  type="date"
                  value={deadline}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
                />
              </div>
            </>
          )}

          {type === 'pk_checkin' && (
            <div>
              <div className="text-xs text-gray-500 mb-2">挑战天数</div>
              <div className="flex gap-2">
                {['7', '14', '21', '30'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setChallengeDays(d)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      challengeDays === d
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}
                  >
                    {d} 天
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'supervise_spend' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">分类预算设置</div>
                <div className="text-[11px] text-gray-400">
                  超过任一分类，监督人会收到提醒
                </div>
              </div>
              <CategoryBudgetEditor
                value={categoryBudgets}
                onChange={setCategoryBudgets}
              />
            </div>
          )}

          {/* 邀请好友 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">邀请好友</div>
              <button
                onClick={onInviteFriends}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                + 添加新好友
              </button>
            </div>
            {friends.length === 0 ? (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center">
                还没有好友，点上方「添加新好友」
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => {
                  const active = selectedFriends.includes(f.friendId);
                  return (
                    <button
                      key={f.friendId}
                      onClick={() => toggleFriend(f.friendId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-sm transition active:scale-95 ${
                        active
                          ? 'bg-brand-50 border-brand-400 text-brand-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
                      }`}
                    >
                      <span className="text-base leading-none">{f.avatar}</span>
                      <span>{f.nickname}</span>
                      {active && <span className="text-brand-500 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="text-[11px] text-gray-400 mt-1.5">
              已选 {selectedFriends.length} 人 · 不选也可以创建
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
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
            创建房间
          </button>
        </div>
      </div>
    </div>
  );
}
