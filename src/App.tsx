import { useEffect, useState } from 'react';
import ChatPage from './pages/ChatPage';
import AnalysisPage from './pages/AnalysisPage';
import IncomePage from './pages/IncomePage';
import GoalPage from './pages/GoalPage';
import LearnPage from './pages/LearnPage';
import CommunityPage from './pages/CommunityPage';
import { useAppStore } from './store/useAppStore';

export type TabKey = 'chat' | 'analysis' | 'income' | 'goal' | 'learn' | 'community';

export default function App() {
  const [tab, setTab] = useState<TabKey>('chat');
  const initUser = useAppStore((s) => s.initUser);
  const messages = useAppStore((s) => s.messages);
  const appendMessage = useAppStore((s) => s.appendMessage);
  const onboarded = useAppStore((s) => s.user.preferences.onboarded);

  useEffect(() => {
    initUser();
  }, [initUser]);

  // 首次访问：自动发送引导问候
  useEffect(() => {
    if (messages.length === 0 && !onboarded) {
      appendMessage({
        role: 'assistant',
        content: 'Hi！我是攒钱搭子，你的理财小学姐～🙋‍♀️\n先简单认识一下吧，你现在是？',
        options: [
          { label: '大一', value: '大一' },
          { label: '大二', value: '大二' },
          { label: '大三', value: '大三' },
          { label: '大四', value: '大四' },
          { label: '研究生', value: '研究生' },
        ],
      });
    }
  }, [messages.length, onboarded, appendMessage]);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg overflow-hidden">
      <main className="flex-1 overflow-hidden">
        {tab === 'chat' && <ChatPage onSwitchTab={setTab} />}
        {tab === 'analysis' && <AnalysisPage onBack={() => setTab('chat')} />}
        {tab === 'income' && <IncomePage onBack={() => setTab('chat')} />}
        {tab === 'goal' && <GoalPage onBack={() => setTab('chat')} />}
        {tab === 'learn' && <LearnPage onBack={() => setTab('chat')} />}
        {tab === 'community' && <CommunityPage onBack={() => setTab('chat')} />}
      </main>
    </div>
  );
}
