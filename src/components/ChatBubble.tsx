import clsx from 'clsx';
import type { ChatMessage } from '@/types';
import TransactionCard from './cards/TransactionCard';
import IncomeCard from './cards/IncomeCard';
import SummaryCard from './cards/SummaryCard';
import GoalProgressCard from './cards/GoalProgressCard';
import GoalCreateCard from './cards/GoalCreateCard';
import RiskWarningCard from './cards/RiskWarningCard';
import MilestoneCard from './cards/MilestoneCard';
import { AssistantAvatar, UserAvatar } from './Avatars';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  message: ChatMessage;
  onOptionClick?: (value: string, label: string) => void;
}

export default function ChatBubble({ message, onOptionClick }: Props) {
  const isUser = message.role === 'user';
  const gender = useAppStore((s) => s.user.gender);

  return (
    <div
      className={clsx(
        'w-full flex animate-slide-up',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser && <AssistantAvatar size={36} className="mr-2 mt-5" />}
      <div
        className={clsx(
          'max-w-[78%] flex flex-col gap-2',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {!isUser && (
          <div className="text-xs text-gray-500 px-1 flex items-center gap-1.5">
            <span>小钱学姐</span>
            {message.source === 'agent' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded-full">
                🧠 Agent
              </span>
            )}
            {message.source === 'rules' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                规则
              </span>
            )}
          </div>
        )}
        <div
          className={clsx(
            'px-4 py-3 rounded-2xl shadow-bubble whitespace-pre-wrap break-words text-[15px] leading-relaxed',
            isUser
              ? 'bg-brand-500 text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-tl-md',
          )}
        >
          {message.content}
        </div>

        {/* 内嵌卡片 */}
        {message.card && (
          <div className="w-full max-w-md">
            {message.card.type === 'transaction' && (
              <TransactionCard data={message.card.data as any} />
            )}
            {message.card.type === 'income' && (
              <IncomeCard data={message.card.data as any} />
            )}
            {message.card.type === 'summary' && <SummaryCard data={message.card.data as any} />}
            {message.card.type === 'goal_create' && (
              <GoalCreateCard data={message.card.data as any} />
            )}
            {message.card.type === 'goal_progress' && (
              <GoalProgressCard data={message.card.data as any} />
            )}
            {message.card.type === 'milestone' && (
              <MilestoneCard data={message.card.data as any} />
            )}
            {message.card.type === 'risk_warning' && (
              <RiskWarningCard data={message.card.data as any} />
            )}
          </div>
        )}

        {/* 选项 */}
        {!isUser && message.options && message.options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onOptionClick?.(opt.value, opt.label)}
                className="px-3 py-1.5 text-sm bg-white border border-brand-200 text-brand-700 rounded-full hover:bg-brand-50 active:scale-95 transition"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isUser && <UserAvatar gender={gender} size={36} className="ml-2 mt-5" />}
    </div>
  );
}
