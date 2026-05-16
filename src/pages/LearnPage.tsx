import { useState } from 'react';
import { KNOWLEDGE_BASE, type KnowledgeEntry } from '@/services/knowledgeService';
import PageHeader from '@/components/PageHeader';

interface Props {
  onBack: () => void;
}

const CATEGORY_TABS: { key: KnowledgeEntry['category'] | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: '全部', emoji: '✨' },
  { key: 'concept', label: '基础概念', emoji: '📘' },
  { key: 'product', label: '产品认知', emoji: '💡' },
  { key: 'risk', label: '风险警示', emoji: '⚠️' },
  { key: 'practice', label: '实操技巧', emoji: '🛠️' },
];

export default function LearnPage({ onBack }: Props) {
  const [tab, setTab] = useState<(typeof CATEGORY_TABS)[number]['key']>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = tab === 'all' ? KNOWLEDGE_BASE : KNOWLEDGE_BASE.filter((k) => k.category === tab);

  return (
    <div className="h-full flex flex-col bg-bg">
      <PageHeader title="理财学习 💡" onBack={onBack} />

      {/* 分类 */}
      <div className="bg-white px-3 py-2 border-b border-gray-100 overflow-x-auto scroll-thin shrink-0">
        <div className="flex gap-2 w-max">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                tab === t.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3">
        {list.map((k) => (
          <div
            key={k.id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setOpenId((id) => (id === k.id ? null : k.id))}
              className="w-full text-left px-4 py-3 flex items-start justify-between gap-2 hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <div className="text-[15px] font-medium text-gray-800">{k.question}</div>
                {openId !== k.id && (
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {k.answer.replace(/[\n📌💡⚠️🌱🌿🌳🌸🏆💰📊🎯🛒]/g, '').slice(0, 60)}…
                  </div>
                )}
              </div>
              <span
                className={`text-gray-400 transition-transform ${
                  openId === k.id ? 'rotate-180' : ''
                }`}
              >
                ▾
              </span>
            </button>
            {openId === k.id && (
              <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-50">
                <div className="pt-3">{k.answer}</div>
                {k.related && k.related.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.related.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded"
                      >
                        # {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
