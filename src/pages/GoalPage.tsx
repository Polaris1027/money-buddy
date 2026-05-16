import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtCurrency } from '@/utils/date';
import { getGoalStatus, getSavingStage } from '@/services/goalService';
import PageHeader from '@/components/PageHeader';
import GoalEditModal from '@/components/GoalEditModal';
import GoalCreateModal from '@/components/GoalCreateModal';
import GrowthTree from '@/components/GrowthTree';
import type { SavingGoal } from '@/types';
import dayjs from 'dayjs';

interface Props {
  onBack: () => void;
}

export default function GoalPage({ onBack }: Props) {
  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const addCheckin = useAppStore((s) => s.addCheckin);
  const removeGoal = useAppStore((s) => s.removeGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [checkinAmount, setCheckinAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [creating, setCreating] = useState(false);
  /** 当前展开成长路径的目标 id（点击卡片右上角"成长路径"按钮可展开/收起） */
  const [expandedTreeId, setExpandedTreeId] = useState<string | null>(null);

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');

  function doCheckin(goalId: string) {
    const amt = parseFloat(checkinAmount);
    if (!amt || amt <= 0) return;
    addCheckin(goalId, amt);
    setCheckinAmount('');
    setActiveGoalId(null);
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      <PageHeader
        title="储蓄目标 🎯"
        onBack={onBack}
        right={
          <button
            onClick={() => setCreating(true)}
            className="w-9 h-9 flex items-center justify-center text-brand-600 hover:text-brand-700 active:scale-95"
            aria-label="新建储蓄目标"
            title="新建储蓄目标"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4">
        {goals.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-sm text-gray-700 mb-1">还没有储蓄目标哦~</div>
              <div className="text-xs text-gray-400 mb-4">
                设个小目标，让小钱学姐陪你一起攒 ✨
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setCreating(true)}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 active:scale-95"
                >
                  + 新建目标
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100 active:scale-95"
                >
                  和学姐聊聊
                </button>
              </div>
            </div>

            {/* 成长路径预览（即使没目标也展示一下，让用户了解会经历哪些阶段） */}
            <div>
              <div className="text-xs text-gray-500 mb-2 px-1">你的成长路径将会是 ✨</div>
              <GrowthTree progress={0} />
            </div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 px-1">进行中</div>
                <div className="space-y-3">
                  {active.map((g) => {
                    const s = getGoalStatus(g);
                    const stage = getSavingStage(s.progress);
                    const treeOpen = expandedTreeId === g.goalId;
                    return (
                      <div
                        key={g.goalId}
                        className="bg-white rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-base font-semibold text-gray-800">
                              {g.emoji} {g.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              目标 {fmtCurrency(g.targetAmount)} · 截止{' '}
                              {dayjs(g.deadline).format('M月D日')}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingGoal(g)}
                            className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
                            aria-label="编辑目标"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            编辑
                          </button>
                        </div>

                        {/* 当前等级徽章（紧凑模式） */}
                        <div className="mb-2">
                          <GrowthTree progress={s.progress} compact />
                        </div>

                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full transition-all duration-700"
                            style={{
                              width: `${s.progressPercent}%`,
                              background: `linear-gradient(90deg, ${stage.color}aa, ${stage.color})`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <span>
                            已攒 {fmtCurrency(g.currentAmount)} / 还差{' '}
                            {fmtCurrency(s.remainingAmount)}
                          </span>
                          <span className="font-semibold" style={{ color: stage.color }}>
                            {s.progressPercent}%
                          </span>
                        </div>

                        {s.estimatedCompletion && (
                          <div className="text-xs text-gray-400 mb-3">
                            预计 {dayjs(s.estimatedCompletion).format('M月D日')} 完成
                            {s.onTrack ? (
                              <span className="text-brand-600 ml-1">✓ 进度正常</span>
                            ) : (
                              <span className="text-orange-500 ml-1">⏳ 需要加快</span>
                            )}
                          </div>
                        )}

                        {/* 展开/收起完整成长路径 */}
                        <button
                          onClick={() =>
                            setExpandedTreeId(treeOpen ? null : g.goalId)
                          }
                          className="text-xs text-brand-600 hover:text-brand-700 mb-2 flex items-center gap-1"
                        >
                          {treeOpen ? '收起' : '查看'}成长路径
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className={`transition-transform ${treeOpen ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        {treeOpen && (
                          <div className="mb-3 animate-fade-in">
                            <GrowthTree progress={s.progress} />
                          </div>
                        )}

                        {/* 打卡区 */}
                        {activeGoalId === g.goalId ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              autoFocus
                              value={checkinAmount}
                              onChange={(e) => setCheckinAmount(e.target.value)}
                              placeholder="本次存入金额"
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                            />
                            <button
                              onClick={() => doCheckin(g.goalId)}
                              className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm active:scale-95"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setActiveGoalId(null)}
                              className="px-3 py-2 text-gray-500 text-sm"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {[10, 30, 50, 100].map((v) => (
                              <button
                                key={v}
                                onClick={() => addCheckin(g.goalId, v)}
                                className="flex-1 py-1.5 text-sm bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 active:scale-95"
                              >
                                +{v}
                              </button>
                            ))}
                            <button
                              onClick={() => setActiveGoalId(g.goalId)}
                              className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg active:scale-95"
                            >
                              自定义
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 px-1 mt-2">已达成 🏆</div>
                <div className="space-y-2">
                  {completed.map((g) => (
                    <button
                      key={g.goalId}
                      onClick={() => setEditingGoal(g)}
                      className="w-full text-left bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-3 hover:from-yellow-100 hover:to-orange-100 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {g.emoji} {g.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {fmtCurrency(g.targetAmount)} · 已完成 · 轻点编辑
                          </div>
                        </div>
                        <span className="text-2xl">🏆</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingGoal && (
        <GoalEditModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={(patch) => updateGoal(editingGoal.goalId, patch)}
          onDelete={() => removeGoal(editingGoal.goalId)}
        />
      )}

      {creating && (
        <GoalCreateModal
          onClose={() => setCreating(false)}
          onCreate={(data) => addGoal(data)}
        />
      )}
    </div>
  );
}
