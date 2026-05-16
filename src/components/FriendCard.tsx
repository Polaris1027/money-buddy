import type { Friend } from '@/types';

interface Props {
  friend: Friend;
  /** 是否被选中（用于多选场景） */
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  /** 紧凑模式（仅头像 + 名字一行） */
  compact?: boolean;
  rightSlot?: React.ReactNode;
}

const PERSONA_LABEL: Record<NonNullable<Friend['persona']>, string> = {
  thrifty: '勤俭学霸',
  spender: '精致消费',
  lazy: '三分钟热度',
  expert: '理财达人',
  casual: '佛系记账',
};

export default function FriendCard({
  friend,
  selected,
  onClick,
  onRemove,
  compact,
  rightSlot,
}: Props) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-sm transition active:scale-95 ${
          selected
            ? 'bg-brand-50 border-brand-400 text-brand-700'
            : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300'
        }`}
      >
        <span className="text-base leading-none">{friend.avatar}</span>
        <span>{friend.nickname}</span>
        {selected && <span className="text-brand-500 text-xs">✓</span>}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 transition ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${selected ? 'ring-2 ring-brand-400' : ''}`}
    >
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-2xl shrink-0">
        {friend.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">
          {friend.nickname}
        </div>
        {friend.persona && (
          <div className="text-[11px] text-gray-400 mt-0.5">
            {PERSONA_LABEL[friend.persona]}
          </div>
        )}
      </div>
      {rightSlot}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-300 hover:text-red-500 text-xs px-2"
          aria-label="移除"
        >
          移除
        </button>
      )}
    </div>
  );
}
