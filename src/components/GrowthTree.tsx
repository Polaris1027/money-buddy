import { SAVING_STAGES, getSavingStage } from '@/services/goalService';

interface Props {
  /** 当前进度 0-1 */
  progress: number;
  /** 紧凑模式：嵌入卡片时使用，仅展示横向徽章带 */
  compact?: boolean;
}

/**
 * 成长路径可视化
 *  - 默认模式：横向 5 节点路径，节点之间用渐变连接线，已解锁高亮
 *  - compact 模式：仅徽章 + 文案 + 进度，嵌入目标卡片
 *
 * 五档等级（对应 PRD）：
 *   10% 🌱 种子萌芽 · 25% 🌿 新叶成长 · 50% 🌳 枝繁叶茂 · 75% 🌸 花苞绽放 · 100% 🏆 梦想达成
 */
export default function GrowthTree({ progress, compact = false }: Props) {
  const cur = getSavingStage(progress);
  // 路径展示只取 5 档（去掉 level 0 "蓄势待发"，因为它代表"还没开始"的兜底状态）
  const stages = SAVING_STAGES.filter((s) => s.level > 0);
  const percent = Math.round(progress * 100);

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
        style={{ backgroundColor: cur.bgColor }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm"
          style={{ backgroundColor: 'white', boxShadow: `0 0 0 2px ${cur.color}33` }}
        >
          {cur.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: cur.color }}>
              {cur.name}
            </span>
            <span className="text-[10px] text-gray-400">Lv.{cur.level}</span>
          </div>
          <div className="text-[11px] text-gray-500 truncate">{cur.tagline}</div>
        </div>
        <div className="text-sm font-bold tabular-nums" style={{ color: cur.color }}>
          {percent}%
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">🌳 成长路径</div>
        <div className="text-xs text-gray-400">
          当前 <span className="font-semibold" style={{ color: cur.color }}>{cur.name}</span>
        </div>
      </div>

      {/* 横向 5 节点路径 */}
      <div className="relative pt-1 pb-1">
        {/* 底色连接线 */}
        <div className="absolute left-[10%] right-[10%] top-[26px] h-1 bg-gray-100 rounded-full" />
        {/* 已完成连接线（按当前等级高亮到对应节点） */}
        <div
          className="absolute left-[10%] top-[26px] h-1 rounded-full transition-all duration-700"
          style={{
            width: `${
              cur.level === 0
                ? 0
                : ((cur.level - 1) / (stages.length - 1)) * 80
            }%`,
            background: 'linear-gradient(90deg, #8BC34A, #43A047, #EC407A, #F9A825)',
          }}
        />

        <div className="flex justify-between relative">
          {stages.map((s) => {
            const reached = cur.level >= s.level;
            const isCurrent = cur.level === s.level;
            return (
              <div key={s.level} className="flex flex-col items-center w-12">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    reached ? 'shadow-md' : 'opacity-40'
                  } ${isCurrent ? 'scale-110 animate-bounce-slow' : ''}`}
                  style={{
                    backgroundColor: reached ? s.bgColor : '#F5F5F5',
                    boxShadow: isCurrent ? `0 0 0 3px ${s.color}55` : undefined,
                  }}
                >
                  {s.emoji}
                </div>
                <div
                  className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${
                    reached ? '' : 'text-gray-400'
                  }`}
                  style={{ color: reached ? s.color : undefined }}
                >
                  {s.name}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {Math.round(s.minProgress * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 当前等级文案 */}
      <div
        className="mt-3 rounded-xl p-3 text-xs flex items-start gap-2"
        style={{ backgroundColor: cur.bgColor }}
      >
        <span className="text-base leading-none mt-0.5">{cur.emoji}</span>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: cur.color }}>
            {cur.name} · {cur.tagline}
          </div>
          {cur.level < stages[stages.length - 1].level && (
            <div className="text-gray-500 mt-0.5">
              再攒 <span className="font-semibold text-gray-700">
                {Math.max(0, Math.round((stages[cur.level]?.minProgress ?? 1) * 100) - percent)}%
              </span>{' '}
              即可解锁{' '}
              <span style={{ color: stages[cur.level]?.color }}>
                {stages[cur.level]?.emoji} {stages[cur.level]?.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
