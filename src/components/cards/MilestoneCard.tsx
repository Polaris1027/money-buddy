import type { Milestone, SavingGoal } from '@/types';

interface Props {
  data: {
    goal: SavingGoal;
    milestone: Milestone;
    progressPercent: number;
  };
}

export default function MilestoneCard({ data }: Props) {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-bubble p-4 border-2 border-yellow-200 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-4xl">{data.milestone.emoji}</div>
        <div>
          <div className="text-base font-bold text-orange-700">
            达成 {data.milestone.name}！
          </div>
          <div className="text-xs text-gray-500">
            {data.goal.name} 进度 {data.progressPercent}%
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{data.milestone.message}</div>
    </div>
  );
}
