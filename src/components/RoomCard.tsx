import type { Friend, Room, RoomEvent, Transaction } from '@/types';
import {
  ROOM_TYPE_META,
  calcSaveTogetherProgress,
  calcPkRanking,
  calcSuperviseByCategory,
  describeEvent,
} from '@/services/communityService';
import { fmtCurrency, relativeTime } from '@/utils/date';
import dayjs from 'dayjs';

interface Props {
  room: Room;
  events: RoomEvent[];
  friends: Friend[];
  myTransactions: Transaction[];
  onOpen?: () => void;
}

const COLOR_BG: Record<string, string> = {
  pink: 'from-pink-50 to-rose-100',
  amber: 'from-amber-50 to-orange-100',
  sky: 'from-sky-50 to-blue-100',
};

const COLOR_BAR: Record<string, string> = {
  pink: 'bg-rose-400',
  amber: 'bg-amber-400',
  sky: 'bg-sky-400',
};

const COLOR_TEXT: Record<string, string> = {
  pink: 'text-rose-600',
  amber: 'text-amber-700',
  sky: 'text-sky-700',
};

export default function RoomCard({
  room,
  events,
  friends,
  myTransactions,
  onOpen,
}: Props) {
  const meta = ROOM_TYPE_META[room.type];
  const memberFriends = room.memberIds
    .filter((id) => id !== 'me')
    .map((id) => friends.find((f) => f.friendId === id))
    .filter(Boolean) as Friend[];

  const latestEvent = [...events]
    .filter((e) => e.roomId === room.roomId && e.type !== 'join')
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const latestFriend = latestEvent
    ? friends.find((f) => f.friendId === latestEvent.userId)
    : undefined;

  return (
    <div
      onClick={onOpen}
      className={`bg-gradient-to-br ${COLOR_BG[meta.color]} rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition`}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{room.emoji}</span>
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-800 truncate">
              {room.name}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {meta.emoji} {meta.label} · {room.memberIds.length} 人
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.();
          }}
          className={`text-xs ${COLOR_TEXT[meta.color]} font-medium px-2.5 py-1 bg-white/70 rounded-full hover:bg-white`}
        >
          查看 →
        </button>
      </div>

      {/* 按类型渲染主体 */}
      {room.type === 'save_together' && (
        <SaveTogetherBody room={room} events={events} friends={friends} />
      )}
      {room.type === 'pk_checkin' && (
        <PkBody
          room={room}
          events={events}
          friends={friends}
          myTransactions={myTransactions}
        />
      )}
      {room.type === 'supervise_spend' && (
        <SuperviseBody
          room={room}
          friends={memberFriends}
          myTransactions={myTransactions}
        />
      )}

      {/* 最新动态 */}
      {latestEvent && (
        <div className="mt-3 pt-3 border-t border-white/60 text-xs text-gray-600 flex items-center justify-between">
          <span className="truncate flex-1">
            {describeEvent(latestEvent, latestFriend)}
          </span>
          <span className="text-gray-400 ml-2 shrink-0">
            {relativeTime(latestEvent.createdAt)}
          </span>
        </div>
      )}
    </div>
  );

  /* ----------- inline subcomponents ----------- */
  function SaveTogetherBody({
    room,
    events,
    friends,
  }: {
    room: Room;
    events: RoomEvent[];
    friends: Friend[];
  }) {
    const { total, percent, byUser } = calcSaveTogetherProgress(room, events);
    return (
      <div>
        <div className="flex items-end justify-between mb-1">
          <div className="text-xs text-gray-600">
            已攒 <span className="font-semibold text-gray-800">{fmtCurrency(total)}</span>{' '}
            / {fmtCurrency(room.targetAmount ?? 0)}
          </div>
          <div className={`text-sm font-bold ${COLOR_TEXT[meta.color]}`}>{percent}%</div>
        </div>
        <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${COLOR_BAR[meta.color]} transition-all`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* 成员贡献 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {room.memberIds.map((uid) => {
            const f = uid === 'me' ? null : friends.find((x) => x.friendId === uid);
            const avatar = uid === 'me' ? '🙋' : f?.avatar ?? '👤';
            const name = uid === 'me' ? '我' : f?.nickname ?? '好友';
            const amt = byUser[uid] ?? 0;
            return (
              <div
                key={uid}
                className="flex items-center gap-1 bg-white/70 rounded-full px-2 py-0.5 text-[11px]"
              >
                <span className="text-base leading-none">{avatar}</span>
                <span className="text-gray-700">{name}</span>
                <span className="text-gray-400">¥{amt}</span>
              </div>
            );
          })}
        </div>
        {room.deadline && (
          <div className="text-[11px] text-gray-500 mt-2">
            截止 {dayjs(room.deadline).format('M月D日')}
          </div>
        )}
      </div>
    );
  }

  function PkBody({
    room,
    events,
    friends,
    myTransactions,
  }: {
    room: Room;
    events: RoomEvent[];
    friends: Friend[];
    myTransactions: Transaction[];
  }) {
    const ranking = calcPkRanking(room, events, myTransactions, friends);
    const top3 = ranking.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div>
        <div className="text-xs text-gray-600 mb-2">
          连续记账PK · 挑战 {room.challengeDays ?? 7} 天
        </div>
        <div className="space-y-1.5">
          {top3.map((r, idx) => (
            <div
              key={r.userId}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                r.isMe ? 'bg-white/90' : 'bg-white/50'
              }`}
            >
              <span className="text-base w-5">{medals[idx]}</span>
              <span className="text-base">{r.avatar}</span>
              <span
                className={`flex-1 text-sm ${
                  r.isMe ? 'font-semibold text-gray-800' : 'text-gray-700'
                }`}
              >
                {r.nickname}
                {r.isMe && (
                  <span className="ml-1 text-[10px] text-brand-600">(我)</span>
                )}
              </span>
              <span className={`text-sm font-bold ${COLOR_TEXT[meta.color]}`}>
                🔥 {r.days} 天
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function SuperviseBody({
    room,
    friends,
    myTransactions,
  }: {
    room: Room;
    friends: Friend[];
    myTransactions: Transaction[];
  }) {
    const { categories, totalBudget, totalSpent, totalRemain, anyOver, empty } =
      calcSuperviseByCategory(room, myTransactions);
    const totalPercent =
      totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
    // 卡片只展示前 3 个分类，优先显示已超支或快超支的
    const displayCats = [...categories]
      .sort((a, b) => Number(b.over) - Number(a.over) || b.percent - a.percent)
      .slice(0, 3);

    if (empty) {
      return (
        <div>
          <div className="text-xs text-gray-600 mb-2">
            还没设置分类预算，点击查看进入设置
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-500 mr-1">监督人：</span>
            {friends.length === 0 ? (
              <span className="text-[11px] text-gray-400">暂无</span>
            ) : (
              friends.slice(0, 5).map((f) => (
                <span key={f.friendId} className="text-base" title={f.nickname}>
                  {f.avatar}
                </span>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-end justify-between mb-1">
          <div className="text-xs text-gray-600">
            今日已花{' '}
            <span className="font-semibold text-gray-800">{fmtCurrency(totalSpent)}</span>{' '}
            / {fmtCurrency(totalBudget)}
          </div>
          <div
            className={`text-sm font-bold ${
              anyOver ? 'text-red-500' : COLOR_TEXT[meta.color]
            }`}
          >
            {anyOver ? '有分类超支' : `余 ${fmtCurrency(Math.max(0, totalRemain))}`}
          </div>
        </div>
        <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              anyOver ? 'bg-red-400' : COLOR_BAR[meta.color]
            }`}
            style={{ width: `${totalPercent}%` }}
          />
        </div>

        {/* 分类 mini 行 */}
        <div className="space-y-1 mt-2">
          {displayCats.map((c) => {
            const w = Math.min(100, c.percent);
            return (
              <div key={c.category} className="flex items-center gap-1.5">
                <span className="text-sm w-5 text-center">{c.emoji}</span>
                <span className="text-[11px] text-gray-600 w-10 truncate">
                  {c.label}
                </span>
                <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      c.over
                        ? 'bg-red-400'
                        : c.percent >= 80
                          ? 'bg-amber-400'
                          : COLOR_BAR[meta.color]
                    }`}
                    style={{ width: `${w}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] w-14 text-right shrink-0 ${
                    c.over ? 'text-red-500 font-semibold' : 'text-gray-500'
                  }`}
                >
                  ¥{c.spent}/¥{c.budget}
                </span>
              </div>
            );
          })}
          {categories.length > displayCats.length && (
            <div className="text-[10px] text-gray-400 text-center pt-0.5">
              还有 {categories.length - displayCats.length} 个分类，点击查看
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-3">
          <span className="text-[11px] text-gray-500 mr-1">监督人：</span>
          {friends.length === 0 ? (
            <span className="text-[11px] text-gray-400">暂无</span>
          ) : (
            friends.slice(0, 5).map((f) => (
              <span key={f.friendId} className="text-base" title={f.nickname}>
                {f.avatar}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }
}
