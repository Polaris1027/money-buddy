import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/PageHeader';
import RoomCard from '@/components/RoomCard';
import CreateRoomModal from '@/components/CreateRoomModal';
import InviteFriendModal from '@/components/InviteFriendModal';
import CategoryBudgetEditor from '@/components/CategoryBudgetEditor';
import {
  ROOM_TYPE_META,
  generateMockEvent,
  describeEvent,
  calcSaveTogetherProgress,
  calcPkRanking,
  calcSuperviseByCategory,
  getRoomCategoryBudgets,
} from '@/services/communityService';
import type { Category, Room, RoomType } from '@/types';
import { fmtCurrency, relativeTime } from '@/utils/date';
import dayjs from 'dayjs';

interface Props {
  onBack: () => void;
}

type FilterTab = 'all' | RoomType;

export default function CommunityPage({ onBack }: Props) {
  const friends = useAppStore((s) => s.friends);
  const rooms = useAppStore((s) => s.rooms);
  const roomEvents = useAppStore((s) => s.roomEvents);
  const transactions = useAppStore((s) => s.transactions);
  const addFriend = useAppStore((s) => s.addFriend);
  const removeFriend = useAppStore((s) => s.removeFriend);
  const createRoom = useAppStore((s) => s.createRoom);
  const removeRoom = useAppStore((s) => s.removeRoom);
  const addRoomEvent = useAppStore((s) => s.addRoomEvent);

  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [createDefaultType, setCreateDefaultType] = useState<RoomType>('save_together');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const list = filter === 'all' ? rooms : rooms.filter((r) => r.type === filter);
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [rooms, filter]);

  /* ---------------- 模拟好友自动行为 ---------------- */
  useEffect(() => {
    if (rooms.length === 0 || friends.length === 0) return;
    const timer = setInterval(() => {
      // 从所有 active 房间里挑一个，再从其成员里挑一个 friend，触发模拟事件
      const activeRooms = rooms.filter((r) => r.active && r.memberIds.length > 1);
      if (activeRooms.length === 0) return;
      const room = activeRooms[Math.floor(Math.random() * activeRooms.length)]!;
      const friendIds = room.memberIds.filter((id) => id !== 'me');
      if (friendIds.length === 0) return;
      const fid = friendIds[Math.floor(Math.random() * friendIds.length)]!;
      const friend = friends.find((f) => f.friendId === fid);
      if (!friend) return;

      const ev = generateMockEvent(room, friend);
      if (ev) {
        addRoomEvent(ev);
      }
    }, 30000); // 30s 一次
    return () => clearInterval(timer);
  }, [rooms, friends, addRoomEvent]);

  // 进入页面时先触发一次轻量模拟（避免空白）
  useEffect(() => {
    if (rooms.length === 0 || friends.length === 0) return;
    const recentEvents = roomEvents.filter(
      (e) => Date.now() - e.createdAt < 1000 * 60 * 60 * 6 && e.type !== 'join',
    );
    if (recentEvents.length >= 3) return;
    // 给每个房间补 1 条最近动态
    rooms.forEach((room) => {
      if (!room.active) return;
      const friendIds = room.memberIds.filter((id) => id !== 'me');
      if (friendIds.length === 0) return;
      const fid = friendIds[Math.floor(Math.random() * friendIds.length)]!;
      const friend = friends.find((f) => f.friendId === fid);
      if (!friend) return;
      const ev = generateMockEvent(room, friend);
      if (ev) addRoomEvent(ev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRoom = rooms.find((r) => r.roomId === activeRoomId) ?? null;

  return (
    <div className="h-full flex flex-col bg-bg">
      <PageHeader
        title="搭子社区 👥"
        onBack={onBack}
        right={
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            👥 好友
          </button>
        }
      />

      {/* 分类 Tab */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto scroll-thin shrink-0">
        <FilterChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="全部"
          emoji="✨"
        />
        {(Object.keys(ROOM_TYPE_META) as RoomType[]).map((t) => (
          <FilterChip
            key={t}
            active={filter === t}
            onClick={() => setFilter(t)}
            label={ROOM_TYPE_META[t].label}
            emoji={ROOM_TYPE_META[t].emoji}
          />
        ))}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3 pb-24">
        {filteredRooms.length === 0 ? (
          <EmptyState
            friendsCount={friends.length}
            onCreate={(t) => {
              setCreateDefaultType(t);
              setShowCreate(true);
            }}
            onInvite={() => setShowInvite(true)}
          />
        ) : (
          filteredRooms.map((r) => (
            <RoomCard
              key={r.roomId}
              room={r}
              events={roomEvents}
              friends={friends}
              myTransactions={transactions}
              onOpen={() => setActiveRoomId(r.roomId)}
            />
          ))
        )}
      </div>

      {/* 底部悬浮按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            setCreateDefaultType(filter === 'all' ? 'save_together' : (filter as RoomType));
            setShowCreate(true);
          }}
          className="px-4 py-3 rounded-full bg-brand-500 text-white text-sm font-semibold shadow-lg active:scale-95 hover:bg-brand-600 flex items-center gap-1.5"
        >
          <span>+</span>
          <span>创建房间</span>
        </button>
      </div>

      {/* 弹窗 */}
      {showCreate && (
        <CreateRoomModal
          friends={friends}
          defaultType={createDefaultType}
          onClose={() => setShowCreate(false)}
          onCreate={(data) => {
            createRoom(data);
            setShowCreate(false);
          }}
          onInviteFriends={() => {
            setShowCreate(false);
            setShowInvite(true);
          }}
        />
      )}

      {showInvite && (
        <InviteFriendModal
          friends={friends}
          onClose={() => setShowInvite(false)}
          onAdd={addFriend}
          onRemove={removeFriend}
        />
      )}

      {activeRoom && (
        <RoomDetailModal
          room={activeRoom}
          onClose={() => setActiveRoomId(null)}
          onDelete={() => {
            if (confirm(`确定解散「${activeRoom.name}」吗？`)) {
              removeRoom(activeRoom.roomId);
              setActiveRoomId(null);
            }
          }}
        />
      )}
    </div>
  );
}

/* ----------------------- 子组件 ----------------------- */

function FilterChip({
  active,
  onClick,
  label,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition active:scale-95 ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {emoji} {label}
    </button>
  );
}

function EmptyState({
  friendsCount,
  onCreate,
  onInvite,
}: {
  friendsCount: number;
  onCreate: (t: RoomType) => void;
  onInvite: () => void;
}) {
  return (
    <div className="space-y-3 pt-2">
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <div className="text-4xl mb-2">👥</div>
        <div className="text-sm text-gray-700 mb-1">还没加入任何房间</div>
        <div className="text-xs text-gray-400">
          {friendsCount === 0
            ? '先添加几个搭子，再开启第一个房间吧～'
            : '选个玩法开启第一个房间吧～'}
        </div>
        {friendsCount === 0 && (
          <button
            onClick={onInvite}
            className="mt-4 px-4 py-2 bg-brand-500 text-white text-sm rounded-xl font-medium active:scale-95"
          >
            👥 添加搭子
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 px-1 mt-3 mb-1">推荐玩法</div>
      {(Object.keys(ROOM_TYPE_META) as RoomType[]).map((t) => {
        const meta = ROOM_TYPE_META[t];
        return (
          <button
            key={t}
            onClick={() => onCreate(t)}
            className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-2xl shrink-0">
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800">{meta.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{meta.desc}</div>
            </div>
            <span className="text-brand-500 text-sm">+</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------- 房间详情弹窗 ----------------------- */

function RoomDetailModal({
  room,
  onClose,
  onDelete,
}: {
  room: Room;
  onClose: () => void;
  onDelete: () => void;
}) {
  const friends = useAppStore((s) => s.friends);
  const roomEvents = useAppStore((s) => s.roomEvents);
  const transactions = useAppStore((s) => s.transactions);
  const addRoomEvent = useAppStore((s) => s.addRoomEvent);
  const updateRoom = useAppStore((s) => s.updateRoom);
  const addRoomMember = useAppStore((s) => s.addRoomMember);
  const removeRoomMember = useAppStore((s) => s.removeRoomMember);

  const [actionInput, setActionInput] = useState('');
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const events = useMemo(
    () =>
      [...roomEvents]
        .filter((e) => e.roomId === room.roomId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [roomEvents, room.roomId],
  );

  const meta = ROOM_TYPE_META[room.type];

  function handleAction() {
    if (room.type === 'save_together') {
      const amt = parseFloat(actionInput);
      if (!amt || amt <= 0) {
        alert('请输入要打卡的金额');
        return;
      }
      addRoomEvent({
        roomId: room.roomId,
        userId: 'me',
        type: 'checkin',
        amount: amt,
        note: '我也来打卡',
      });
      // 进度达成里程碑判定
      const { percent } = calcSaveTogetherProgress(
        room,
        // 把当前这条也算上
        [
          ...roomEvents,
          {
            eventId: 'tmp',
            roomId: room.roomId,
            userId: 'me',
            type: 'checkin',
            amount: amt,
            createdAt: Date.now(),
          },
        ],
      );
      if (percent >= 50 && percent < 60) {
        addRoomEvent({
          roomId: room.roomId,
          userId: 'me',
          type: 'milestone',
          note: '已完成一半啦！',
        });
      }
      setActionInput('');
    } else if (room.type === 'pk_checkin') {
      addRoomEvent({
        roomId: room.roomId,
        userId: 'me',
        type: 'checkin',
        note: '今日打卡完成 ✅',
      });
    } else {
      // 监督消费 - 给好友发加油
      addRoomEvent({
        roomId: room.roomId,
        userId: 'me',
        type: 'cheer',
        note: actionInput.trim() || '今天我也省着点～',
      });
      setActionInput('');
    }
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
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">{room.emoji}</span>
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-800 truncate">
                  {room.name}
                </div>
                <div className="text-[11px] text-gray-500">
                  {meta.emoji} {meta.label} · {room.memberIds.length} 人
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4 space-y-4">
          {/* 概要 */}
          <RoomSummary
            room={room}
            events={events}
            transactions={transactions}
            friends={friends}
            onEditBudget={() => setShowBudgetEdit(true)}
          />

          {/* 成员 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">
                成员 · {room.memberIds.length} 人
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="text-[11px] text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-full px-2.5 py-0.5 active:scale-95 font-medium"
              >
                + 邀请
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <MemberAvatar avatar="🙋" name="我（房主）" />
              {room.memberIds
                .filter((id) => id !== 'me')
                .map((id) => {
                  const f = friends.find((x) => x.friendId === id);
                  if (!f) return null;
                  return (
                    <MemberAvatar
                      key={id}
                      avatar={f.avatar}
                      name={f.nickname}
                      onRemove={() => {
                        if (confirm(`将「${f.nickname}」移出房间？`)) {
                          removeRoomMember(room.roomId, id);
                        }
                      }}
                    />
                  );
                })}
            </div>
          </div>

          {/* 动态时间线 */}
          <div>
            <div className="text-xs text-gray-500 mb-2">动态</div>
            {events.length === 0 ? (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center">
                还没有动态
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 30).map((ev) => {
                  const f =
                    ev.userId === 'me'
                      ? null
                      : friends.find((x) => x.friendId === ev.userId);
                  const avatar = ev.userId === 'me' ? '🙋' : f?.avatar ?? '👤';
                  return (
                    <div
                      key={ev.eventId}
                      className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2"
                    >
                      <span className="text-lg leading-none mt-0.5">{avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700">
                          {describeEvent(ev, f ?? undefined)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {relativeTime(ev.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-5 py-3 border-t border-gray-100 space-y-2">
          {room.type === 'save_together' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  ¥
                </span>
                <input
                  type="number"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder="今天攒了多少？"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
                />
              </div>
              <button
                onClick={handleAction}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium active:scale-95 hover:bg-brand-600"
              >
                💰 我也打卡
              </button>
            </div>
          )}
          {room.type === 'pk_checkin' && (
            <button
              onClick={handleAction}
              className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold active:scale-95 hover:bg-brand-600"
            >
              🔥 今日打卡（记账即打卡）
            </button>
          )}
          {room.type === 'supervise_spend' && (
            <div className="flex gap-2">
              <input
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder="给搭子加油..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
              <button
                onClick={handleAction}
                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium active:scale-95 hover:bg-brand-600"
              >
                📣 加油
              </button>
            </div>
          )}
          <button
            onClick={onDelete}
            className="w-full py-2 text-xs text-red-500 hover:text-red-600"
          >
            解散房间
          </button>
        </div>
      </div>

      {/* 编辑分类预算 */}
      {showBudgetEdit && room.type === 'supervise_spend' && (
        <BudgetEditModal
          room={room}
          onClose={() => setShowBudgetEdit(false)}
          onSave={(budgets) => {
            updateRoom(room.roomId, {
              categoryBudgets: budgets,
              // 同步清掉旧字段，避免与新结构冲突
              dailyBudget: undefined,
            });
            setShowBudgetEdit(false);
          }}
        />
      )}

      {/* 添加成员 */}
      {showAddMember && (
        <AddMemberModal
          room={room}
          friends={friends}
          onClose={() => setShowAddMember(false)}
          onAdd={(fid) => addRoomMember(room.roomId, fid)}
        />
      )}
    </div>
  );
}

function MemberAvatar({
  avatar,
  name,
  onRemove,
}: {
  avatar: string;
  name: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-2.5 pr-1.5 py-1 text-xs">
      <span className="text-base leading-none">{avatar}</span>
      <span className="text-gray-700">{name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 w-4 h-4 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-500 leading-none flex items-center justify-center text-[11px] active:scale-90"
          title="移除成员"
        >
          ×
        </button>
      )}
    </div>
  );
}

function RoomSummary({
  room,
  events,
  transactions,
  friends,
  onEditBudget,
}: {
  room: Room;
  events: import('@/types').RoomEvent[];
  transactions: import('@/types').Transaction[];
  friends: import('@/types').Friend[];
  onEditBudget?: () => void;
}) {
  if (room.type === 'save_together') {
    const { total, percent } = calcSaveTogetherProgress(room, events);
    return (
      <div className="bg-rose-50 rounded-2xl p-4">
        <div className="text-xs text-rose-700 mb-1">💰 攒钱进度</div>
        <div className="flex items-end justify-between mb-2">
          <div className="text-2xl font-bold text-rose-600">{percent}%</div>
          <div className="text-sm text-gray-600">
            {fmtCurrency(total)} / {fmtCurrency(room.targetAmount ?? 0)}
          </div>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        {room.deadline && (
          <div className="text-[11px] text-gray-500 mt-2">
            截止 {dayjs(room.deadline).format('YYYY年M月D日')} · 还有{' '}
            {Math.max(0, dayjs(room.deadline).diff(dayjs(), 'day'))} 天
          </div>
        )}
      </div>
    );
  }
  if (room.type === 'pk_checkin') {
    const ranking = calcPkRanking(room, events, transactions, friends);
    return (
      <div className="bg-amber-50 rounded-2xl p-4">
        <div className="text-xs text-amber-700 mb-2">🏆 连续天数排行</div>
        <div className="space-y-1.5">
          {ranking.map((r, idx) => (
            <div
              key={r.userId}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                r.isMe ? 'bg-white' : 'bg-white/60'
              }`}
            >
              <span className="text-xs w-5 text-gray-500">#{idx + 1}</span>
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
              <span className="text-sm font-bold text-amber-600">🔥 {r.days}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // supervise_spend
  const result = calcSuperviseByCategory(room, transactions);
  const { categories, totalBudget, totalSpent, totalRemain, anyOver, overCategories, empty } =
    result;
  const totalPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  return (
    <div className={`rounded-2xl p-4 ${anyOver ? 'bg-red-50' : 'bg-sky-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs ${anyOver ? 'text-red-700' : 'text-sky-700'}`}>
          👀 今日分类预算
        </div>
        {onEditBudget && (
          <button
            onClick={onEditBudget}
            className="text-[11px] text-sky-700 hover:text-sky-800 bg-white/70 rounded-full px-2 py-0.5 active:scale-95"
          >
            ✏️ 修改预算
          </button>
        )}
      </div>

      {empty ? (
        <div className="text-xs text-gray-500 bg-white/70 rounded-xl px-3 py-3 text-center">
          还没设置任何分类预算
          {onEditBudget && (
            <button
              onClick={onEditBudget}
              className="block mx-auto mt-1.5 text-sky-600 underline-offset-2 hover:underline"
            >
              立即设置
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 总计行 */}
          <div className="flex items-end justify-between mb-1.5">
            <div className={`text-xl font-bold ${anyOver ? 'text-red-600' : 'text-sky-600'}`}>
              {anyOver ? '有分类超支' : `余 ${fmtCurrency(Math.max(0, totalRemain))}`}
            </div>
            <div className="text-xs text-gray-600">
              {fmtCurrency(totalSpent)} / {fmtCurrency(totalBudget)}
            </div>
          </div>
          <div className="w-full h-1.5 bg-white rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all ${anyOver ? 'bg-red-400' : 'bg-sky-400'}`}
              style={{ width: `${totalPercent}%` }}
            />
          </div>

          {/* 分类列表 */}
          <div className="space-y-2">
            {categories.map((c) => {
              const w = Math.min(100, c.percent);
              return (
                <div key={c.category} className="bg-white/80 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="text-xs text-gray-700 flex-1">{c.label}</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        c.over ? 'text-red-500' : 'text-gray-700'
                      }`}
                    >
                      ¥{c.spent} / ¥{c.budget}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        c.over
                          ? 'bg-red-400'
                          : c.percent >= 80
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                      }`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {anyOver && (
            <div className="text-[11px] text-red-500 mt-2.5 leading-relaxed">
              ⚠️ {overCategories.map((c) => `${c.emoji}${c.label}`).join('、')} 已超支，搭子收到提醒
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ----------------------- 编辑分类预算弹窗 ----------------------- */

function BudgetEditModal({
  room,
  onClose,
  onSave,
}: {
  room: Room;
  onClose: () => void;
  onSave: (budgets: Partial<Record<Category, number>>) => void;
}) {
  const [budgets, setBudgets] = useState<Partial<Record<Category, number>>>(() =>
    getRoomCategoryBudgets(room),
  );

  function save() {
    const cleaned: Partial<Record<Category, number>> = {};
    for (const [k, v] of Object.entries(budgets) as [Category, number | undefined][]) {
      if (typeof v === 'number' && v > 0) cleaned[k] = Math.round(v);
    }
    if (Object.keys(cleaned).length === 0) {
      alert('请至少为一个分类设置预算');
      return;
    }
    onSave(cleaned);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">修改分类预算</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          <CategoryBudgetEditor value={budgets} onChange={setBudgets} />
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:scale-95"
          >
            取消
          </button>
          <button
            onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium active:scale-95 hover:bg-brand-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- 添加成员弹窗 ----------------------- */

function AddMemberModal({
  room,
  friends,
  onClose,
  onAdd,
}: {
  room: Room;
  friends: import('@/types').Friend[];
  onClose: () => void;
  onAdd: (friendId: string) => void;
}) {
  const candidates = friends.filter((f) => !room.memberIds.includes(f.friendId));

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">邀请成员加入</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
          {friends.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              <div className="text-3xl mb-2">👥</div>
              还没添加任何好友
              <div className="text-xs text-gray-400 mt-1">
                先去顶部「👥 好友」按钮添加搭子吧～
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              <div className="text-3xl mb-2">✅</div>
              所有好友已经都在房间里啦
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((f) => (
                <div
                  key={f.friendId}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <span className="text-2xl leading-none">{f.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">{f.nickname}</div>
                  </div>
                  <button
                    onClick={() => onAdd(f.friendId)}
                    className="px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-medium active:scale-95 hover:bg-brand-600"
                  >
                    + 加入
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:scale-95"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
