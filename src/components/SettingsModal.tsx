import { useEffect, useState } from 'react';
import { getLLMSettings, setLLMSettings, pingLLM } from '@/services/llmService';

interface Props {
  onClose: () => void;
}

const DEFAULT_MODEL = 'deepseek-v3';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export default function SettingsModal({ onClose }: Props) {
  const initial = getLLMSettings();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [baseURL, setBaseURL] = useState(initial.baseURL);
  const [showKey, setShowKey] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  function persist() {
    setLLMSettings({
      apiKey: apiKey.trim(),
      model: model.trim() || DEFAULT_MODEL,
      baseURL: baseURL.trim(),
    });
  }

  function save() {
    persist();
    onClose();
  }

  async function testConnection() {
    persist();
    setPinging(true);
    setPingResult(null);
    const r = await pingLLM();
    setPinging(false);
    setPingResult({
      ok: r.ok,
      msg: r.ok ? '连接成功！学姐已升级 🚀' : `失败：${r.error || '未知错误'}`,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">⚙️ 大模型设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-4 leading-relaxed">
          配置 API Key 后，"知识问答 / 情绪共情 / 兜底回复"将由真实大模型生成；
          记账、目标、风险检测等结构化任务仍由本地规则保证稳定。
          <br />
          <span className="text-gray-400">
            Key 仅保存在浏览器本地，不会上传任何服务器。当前默认走「阿里云百练」OpenAI 兼容接口。
          </span>
        </div>

        <label className="block text-sm text-gray-700 mb-1">API Key</label>
        <div className="flex gap-2 mb-3">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>

        <label className="block text-sm text-gray-700 mb-1">模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 mb-3"
        >
          <optgroup label="阿里云百练 · DeepSeek">
            <option value="deepseek-v3">deepseek-v3（推荐：快、便宜、通用）</option>
            <option value="deepseek-v3.1">deepseek-v3.1（更强，价格略高）</option>
            <option value="deepseek-r1">deepseek-r1（深度推理，较慢）</option>
          </optgroup>
          <optgroup label="阿里云百练 · 通义千问">
            <option value="qwen-plus">qwen-plus（通义千问 Plus）</option>
            <option value="qwen-turbo">qwen-turbo（通义千问 Turbo，最快）</option>
          </optgroup>
          <optgroup label="DeepSeek 官方">
            <option value="deepseek-chat">deepseek-chat（官方 V3）</option>
            <option value="deepseek-reasoner">deepseek-reasoner（官方 R1）</option>
          </optgroup>
        </select>

        <label className="block text-sm text-gray-700 mb-1">
          Base URL <span className="text-gray-400">（留空走百练默认）</span>
        </label>
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder={DEFAULT_BASE_URL}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 mb-1"
        />
        <div className="text-[11px] text-gray-400 mb-4 leading-relaxed">
          · 阿里云百练：<code className="text-gray-500">https://dashscope.aliyuncs.com/compatible-mode/v1</code>
          <br />
          · DeepSeek 官方：<code className="text-gray-500">https://api.deepseek.com</code>
        </div>

        {pingResult && (
          <div
            className={`text-xs px-3 py-2 rounded-lg mb-3 ${
              pingResult.ok ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {pingResult.msg}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={testConnection}
            disabled={pinging || !apiKey.trim()}
            className="flex-1 py-2 text-sm border border-brand-300 text-brand-700 rounded-lg hover:bg-brand-50 disabled:opacity-50"
          >
            {pinging ? '测试中…' : '测试连接'}
          </button>
          <button
            onClick={save}
            className="flex-1 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            保存
          </button>
        </div>

        <div className="text-[11px] text-gray-400 mt-3 text-center">
          没 Key？前往{' '}
          <a
            href="https://bailian.console.aliyun.com/"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            阿里云百练
          </a>{' '}
          或{' '}
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            DeepSeek 官方
          </a>{' '}
          申请
        </div>
      </div>
    </div>
  );
}
