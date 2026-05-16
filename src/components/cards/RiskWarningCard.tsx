interface Props {
  data: {
    riskType: string;
    level: 'high' | 'mid' | string;
  };
}

export default function RiskWarningCard({ data }: Props) {
  const isHigh = data.level === 'high';
  return (
    <div
      className={`rounded-2xl shadow-bubble p-4 border-2 ${
        isHigh
          ? 'bg-red-50 border-red-200'
          : 'bg-orange-50 border-orange-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className={`text-sm font-semibold ${isHigh ? 'text-red-700' : 'text-orange-700'}`}>
            风险类型：{data.riskType}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {isHigh ? '高风险，请务必谨慎' : '中等风险，需要警惕'}
          </div>
        </div>
      </div>
    </div>
  );
}
