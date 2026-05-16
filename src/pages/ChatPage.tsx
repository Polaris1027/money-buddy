import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ChatBubble from '@/components/ChatBubble';
import SettingsModal from '@/components/SettingsModal';
import { AssistantAvatar, UserAvatar } from '@/components/Avatars';
import { handleUserMessage } from '@/services/chatService';
import { getLLMSettings } from '@/services/llmService';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import type { Gender } from '@/types';
import type { TabKey } from '@/App';

interface Props {
  onSwitchTab: (tab: TabKey) => void;
}

export default function ChatPage({ onSwitchTab }: Props) {
  const messages = useAppStore((s) => s.messages);
  const user = useAppStore((s) => s.user);
  const transactions = useAppStore((s) => s.transactions);
  const goals = useAppStore((s) => s.goals);
  const incomes = useAppStore((s) => s.incomes);
  const appendMessage = useAppStore((s) => s.appendMessage);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const addGoal = useAppStore((s) => s.addGoal);
  const addCheckin = useAppStore((s) => s.addCheckin);
  const addIncome = useAppStore((s) => s.addIncome);
  const updateUser = useAppStore((s) => s.updateUser);
  const resetAll = useAppStore((s) => s.resetAll);
  const clearChat = useAppStore((s) => s.clearChat);

  const [pendingGoal, setPendingGoalState] = useState<
    { name?: string; amount?: number; deadline?: string } | null
  >(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(getLLMSettings().enabled);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 录音前保存原输入，用于实时预览拼接（避免覆盖用户已经打的字）
  const inputBeforeListenRef = useRef('');

  // 语音输入
  const speech = useSpeechInput({
    onInterim: (text) => {
      // 在已有输入后面追加识别中的文本
      const base = inputBeforeListenRef.current;
      setInput(base ? `${base} ${text}` : text);
    },
    onFinal: (text) => {
      const base = inputBeforeListenRef.current;
      const merged = (base ? `${base} ${text}` : text).trim();
      setInput(merged);
      inputBeforeListenRef.current = '';
    },
    onError: (msg) => {
      setVoiceError(msg);
      // 3 秒后自动清除
      setTimeout(() => setVoiceError(null), 3000);
    },
  });

  function handleMicClick() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    setVoiceError(null);
    inputBeforeListenRef.current = input.trim();
    speech.start();
  }

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    appendMessage({ role: 'user', content: trimmed });
    setLoading(true);

    // 模拟"思考"延迟，让交互更自然
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));

    try {
      const reply = await handleUserMessage(
        trimmed,
        {
          user,
          transactions,
          goals,
          incomes,
          history: messages,
          pendingGoal,
        },
        {
          addTransaction,
          updateTransaction,
          removeTransaction,
          addGoal,
          addCheckin,
          addIncome,
          setPendingGoal: (g) => setPendingGoalState(g ?? null),
          updateUser,
        },
      );
      appendMessage({
        role: 'assistant',
        content: reply.content,
        card: reply.card,
        options: reply.options,
        intent: reply.intent as any,
        entities: reply.entities,
        source: reply.source,
      });
    } catch (e) {
      console.error(e);
      appendMessage({
        role: 'assistant',
        content: '哎呀学姐刚才走神了，再说一次好吗？😅',
      });
    } finally {
      setLoading(false);
    }
  }

  function onOptionClick(value: string, label: string) {
    void send(label);
    void value;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function handleReset() {
    if (confirm('确定要清空所有数据并重新开始吗？')) {
      resetAll();
      location.reload();
    }
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0 relative">
        <div className="w-9" />
        <div className="flex items-center gap-2">
          <AssistantAvatar size={36} />
          <div>
            <div className="text-base font-semibold text-gray-800">攒钱搭子 🎓</div>
            <div className="text-[10px] text-gray-400 leading-none">
              小钱学姐 ·{' '}
              {llmEnabled ? (
                <span className="text-brand-600 font-medium">🧠 Agent 模式</span>
              ) : (
                <span>本地规则模式</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800"
          aria-label="菜单"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="4" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="16" cy="10" r="1.6" />
          </svg>
        </button>
        {showMenu && (
          <div className="absolute right-2 top-14 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[160px] z-30">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowAvatarPicker(true);
              }}
              className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              🎨 切换我的头像
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowSettings(true);
              }}
              className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              ⚙️ 大模型设置
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                clearChat();
              }}
              className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              🧹 清空对话
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                handleReset();
              }}
              className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 text-red-600"
            >
              🔄 重置所有数据
            </button>
          </div>
        )}
      </header>

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-4"
      >
        {messages.map((m) => (
          <ChatBubble key={m.messageId} message={m} onOptionClick={onOptionClick} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 ml-12">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
            <span>学姐正在打字...</span>
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 flex gap-2 shrink-0 overflow-x-auto scroll-thin">
        <QuickBtn icon="📊" label="消费分析" onClick={() => onSwitchTab('analysis')} />
        <QuickBtn icon="💰" label="收入分析" onClick={() => onSwitchTab('income')} />
        <QuickBtn icon="🎯" label="储蓄目标" onClick={() => onSwitchTab('goal')} />
        <QuickBtn icon="💡" label="理财学习" onClick={() => onSwitchTab('learn')} />
        <QuickBtn icon="👥" label="搭子社区" onClick={() => onSwitchTab('community')} />
      </div>

      {/* 输入区 */}
      <div className="bg-white border-t border-gray-100 p-3 shrink-0">
        {voiceError && (
          <div className="mb-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            {voiceError}
          </div>
        )}
        <div className="flex items-end gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading}
              aria-label={speech.listening ? '停止录音' : '语音输入'}
              className={`relative shrink-0 w-10 h-10 flex items-center justify-center rounded-full border transition active:scale-95 ${
                speech.listening
                  ? 'bg-red-500 border-red-500 text-white mic-pulse'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
              } disabled:opacity-50`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              speech.listening
                ? '正在听你说话...'
                : '发"奶茶15"记账，或问"什么是基金"...'
            }
            rows={1}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-[15px] outline-none focus:border-brand-400 focus:bg-white max-h-32 scroll-thin"
          />
          <button
            disabled={!input.trim() || loading}
            onClick={() => void send(input)}
            className="px-4 py-2 rounded-2xl bg-brand-500 text-white text-sm font-medium disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 transition"
          >
            发送
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false);
            setLlmEnabled(getLLMSettings().enabled);
          }}
        />
      )}

      {showAvatarPicker && (
        <AvatarPickerModal
          current={user.gender}
          onClose={() => setShowAvatarPicker(false)}
          onPick={(g) => {
            updateUser({ gender: g });
            setShowAvatarPicker(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
 * 头像选择弹窗
 * ============================================================ */
function AvatarPickerModal({
  current,
  onClose,
  onPick,
}: {
  current: Gender;
  onClose: () => void;
  onPick: (g: Gender) => void;
}) {
  const options: { value: Gender; label: string; desc: string }[] = [
    { value: 'girl', label: '女生款', desc: '双马尾少女' },
    { value: 'boy', label: '男生款', desc: '阳光卫衣' },
    { value: 'neutral', label: '中性款', desc: '可爱表情包' },
  ];
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">🎨 选个你的头像</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          头像会出现在聊天气泡里，随时可以再来这里换
        </div>
        <div className="grid grid-cols-3 gap-3">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => onPick(o.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition active:scale-95 ${
                current === o.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-300'
              }`}
            >
              <UserAvatar gender={o.value} size={56} />
              <div className="text-sm font-medium text-gray-800">{o.label}</div>
              <div className="text-[11px] text-gray-400 -mt-1">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickBtn({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 active:scale-95 rounded-xl text-sm text-brand-700 font-medium transition whitespace-nowrap"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
