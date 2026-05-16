import { useState } from 'react';
import type { Friend } from '@/types';
import { listRecommendedFriends } from '@/services/communityService';
import FriendCard from './FriendCard';

interface Props {
  friends: Friend[];
  onClose: () => void;
  onAdd: (data: Omit<Friend, 'friendId' | 'addedAt'>) => void;
  onRemove: (friendId: string) => void;
}

const AVATARS = ['🙂', '😎', '🤓', '🥰', '🧐', '😇', '🦄', '🐱', '🐶', '🐰', '🦊', '🐼'];

export default function InviteFriendModal({
  friends,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const [tab, setTab] = useState<'mine' | 'recommend' | 'create'>(
    friends.length === 0 ? 'recommend' : 'mine',
  );
  const [customName, setCustomName] = useState('');
  const [customAvatar, setCustomAvatar] = useState('🙂');

  const recommendList = listRecommendedFriends(friends);

  function addFromRecommend(f: Omit<Friend, 'friendId' | 'addedAt'>) {
    onAdd(f);
  }

  function createCustom() {
    const n = customName.trim();
    if (!n) {
      alert('给好友起个名字吧～');
      return;
    }
    onAdd({
      nickname: n,
      gender: 'neutral',
      avatar: customAvatar,
      persona: 'casual',
    });
    setCustomName('');
    setCustomAvatar('🙂');
    setTab('mine');
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
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">👥 我的搭子</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Tab */}
        <div className="px-5 pt-3 flex gap-2">
          {(
            [
              { v: 'mine', label: `我的好友 (${friends.length})` },
              { v: 'recommend', label: '推荐搭子' },
              { v: 'create', label: '自定义' },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                tab === t.v
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-3 space-y-2">
          {tab === 'mine' && (
            <>
              {friends.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  还没有添加好友，去「推荐搭子」看看吧 →
                </div>
              ) : (
                friends.map((f) => (
                  <FriendCard
                    key={f.friendId}
                    friend={f}
                    onRemove={() => {
                      if (confirm(`确定移除 ${f.nickname} 吗？`)) {
                        onRemove(f.friendId);
                      }
                    }}
                  />
                ))
              )}
            </>
          )}

          {tab === 'recommend' && (
            <>
              <div className="text-[11px] text-gray-400 mb-2">
                精选 6 位 AI 模拟搭子，性格各异，加入房间后会有自动互动
              </div>
              {recommendList.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  推荐搭子已全部加入啦～
                </div>
              ) : (
                recommendList.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 border border-gray-100"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-2xl shrink-0">
                      {f.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {f.nickname}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {personaLabel(f.persona)}
                      </div>
                    </div>
                    <button
                      onClick={() => addFromRecommend(f)}
                      className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-full font-medium active:scale-95"
                    >
                      + 添加
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'create' && (
            <div className="space-y-4 pt-2">
              <div>
                <div className="text-xs text-gray-500 mb-2">头像</div>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setCustomAvatar(a)}
                      className={`aspect-square rounded-xl border-2 text-2xl active:scale-95 ${
                        customAvatar === a
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">昵称</div>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={12}
                  placeholder="给搭子起个昵称"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
                />
              </div>
              <button
                onClick={createCustom}
                className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium active:scale-95 hover:bg-brand-600"
              >
                + 添加为我的搭子
              </button>
              <div className="text-[11px] text-gray-400 text-center">
                自定义搭子加入房间后也会有自动互动哦
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function personaLabel(p?: Friend['persona']): string {
  switch (p) {
    case 'thrifty':
      return '勤俭学霸 · 每日打卡';
    case 'spender':
      return '精致消费 · 偶尔超支';
    case 'lazy':
      return '三分钟热度 · 经常断签';
    case 'expert':
      return '理财达人 · 稳定输出';
    case 'casual':
      return '佛系记账 · 随性派';
    default:
      return '佛系记账';
  }
}
