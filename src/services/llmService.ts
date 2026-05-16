/**
 * LLM 服务（DeepSeek，OpenAI 兼容协议）
 *
 * 设计原则：
 *  - LLM 仅作为"知识问答 / 情绪共情 / 兜底"的兜底大脑，不接管记账/打卡等强结构化任务
 *  - 所有 LLM 输出仍要走 `personaService.applyStyleRules` + `checkBoundary` 后处理
 *  - Key 不存在时降级回规则引擎；网络错误同样降级
 *
 * 接口规范：DeepSeek 完全兼容 OpenAI Chat Completions
 *  - Endpoint: POST {baseURL}/chat/completions
 *  - Header: Authorization: Bearer sk-xxx
 *  - Body: { model, messages: [{role, content}], temperature, max_tokens, response_format? }
 */

import { SYSTEM_PROMPT } from './personaService';
import type { ChatMessage } from '@/types';
import { storage } from '@/utils/storage';

const ENV_KEY = (import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined) || '';
const ENV_BASE_URL =
  (import.meta.env.VITE_DEEPSEEK_BASE_URL as string | undefined) || '';
const ENV_MODEL =
  (import.meta.env.VITE_DEEPSEEK_MODEL as string | undefined) || '';

const STORAGE_KEY = 'deepseek_api_key';
const MODEL_KEY = 'deepseek_model';
const BASE_URL_KEY = 'deepseek_base_url';

// 默认走「阿里云百练」的 OpenAI 兼容接口：
//   - Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
//   - 模型名：deepseek-v3（V3 通用）/ deepseek-r1（R1 深度推理）
// 若想切回 DeepSeek 官方，把 Base URL 改成 https://api.deepseek.com，
// 模型名改成 deepseek-chat / deepseek-reasoner 即可。
const DEFAULT_MODEL = 'deepseek-v3';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// 旧版 localStorage 里残留的 DeepSeek 官方配置，需要一次性迁移到百练默认值
const LEGACY_BASE_URLS = ['https://api.deepseek.com', 'https://api.deepseek.com/v1'];
const LEGACY_MODELS: Record<string, string> = {
  'deepseek-chat': 'deepseek-v3',
  'deepseek-reasoner': 'deepseek-r1',
};

export interface LLMSettings {
  apiKey: string;
  model: string;
  baseURL: string;
  enabled: boolean;
}

export function getLLMSettings(): LLMSettings {
  const userKey = storage.get<string>(STORAGE_KEY, '');
  let userModel = storage.get<string>(MODEL_KEY, '');
  let userBase = storage.get<string>(BASE_URL_KEY, '');

  // 自动迁移：把旧的 DeepSeek 官方配置升级成百练
  if (userBase && LEGACY_BASE_URLS.includes(userBase.replace(/\/+$/, ''))) {
    userBase = '';
    storage.set(BASE_URL_KEY, '');
  }
  if (userModel && LEGACY_MODELS[userModel]) {
    userModel = LEGACY_MODELS[userModel];
    storage.set(MODEL_KEY, userModel);
  }

  const apiKey = userKey || ENV_KEY;
  const baseURL = (userBase || ENV_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = userModel || ENV_MODEL || DEFAULT_MODEL;
  return {
    apiKey,
    model,
    baseURL,
    enabled: Boolean(apiKey),
  };
}

export function setLLMSettings(patch: Partial<LLMSettings>) {
  if (patch.apiKey !== undefined) storage.set(STORAGE_KEY, patch.apiKey);
  if (patch.model !== undefined) storage.set(MODEL_KEY, patch.model);
  if (patch.baseURL !== undefined) storage.set(BASE_URL_KEY, patch.baseURL);
}

export function isLLMAvailable(): boolean {
  return getLLMSettings().enabled;
}

/* =====================================================================
 * OpenAI 兼容协议类型
 * ===================================================================== */
interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMsg[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: false;
  response_format?: { type: 'text' | 'json_object' };
}

interface ChatResponse {
  id?: string;
  choices?: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string; type?: string; code?: string };
}

/**
 * 把站内消息历史转为 OpenAI 兼容的 messages 数组。
 * 仅取最近 N 轮，且过滤掉只含选项的消息。
 */
function buildMessages(
  systemText: string,
  history: ChatMessage[],
  userMessage: string,
  maxTurns = 8,
): ChatMsg[] {
  const recent = history.slice(-maxTurns * 2);
  const messages: ChatMsg[] = [{ role: 'system', content: systemText }];
  for (const m of recent) {
    if (!m.content || !m.content.trim()) continue;
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

export interface CallLLMOptions {
  /** 额外追加在 system 之后的指令（如"用 100 字以内回答"） */
  extraInstruction?: string;
  /** 历史 */
  history?: ChatMessage[];
  /** 温度 */
  temperature?: number;
  /** 最大输出 tokens */
  maxOutputTokens?: number;
  /** 超时（毫秒） */
  timeoutMs?: number;
  /** 是否要求返回 JSON（启用 response_format=json_object） */
  jsonMode?: boolean;
  /** 自定义 system，覆盖默认人设 prompt（用于意图分类等内部任务） */
  systemOverride?: string;
}

export interface CallLLMResult {
  ok: boolean;
  text: string;
  error?: string;
}

/**
 * 调用 DeepSeek（OpenAI 兼容），返回纯文本回复。
 * 调用失败/Key 缺失时，ok = false，调用方应降级到规则引擎。
 */
export async function callLLM(
  userMessage: string,
  options: CallLLMOptions = {},
): Promise<CallLLMResult> {
  const { apiKey, model, baseURL, enabled } = getLLMSettings();
  if (!enabled) {
    return { ok: false, text: '', error: 'LLM_NOT_CONFIGURED' };
  }

  const url = `${baseURL}/chat/completions`;

  const systemBase = options.systemOverride ?? SYSTEM_PROMPT;
  let systemText = options.extraInstruction
    ? `${systemBase}\n\n【本次额外要求】\n${options.extraInstruction}`
    : systemBase;

  // DeepSeek 的 json_object 模式要求 prompt 里必须出现 "json" 字样，否则会报错
  if (options.jsonMode && !/json/i.test(systemText)) {
    systemText += '\n\n请用合法的 JSON 格式输出。';
  }

  const body: ChatRequest = {
    model,
    messages: buildMessages(systemText, options.history || [], userMessage),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxOutputTokens ?? 400,
    top_p: 0.9,
    stream: false,
    ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    let data: ChatResponse;
    try {
      data = (await resp.json()) as ChatResponse;
    } catch {
      return { ok: false, text: '', error: `HTTP ${resp.status} (invalid JSON)` };
    }

    if (!resp.ok || data.error) {
      const msg = data.error?.message || `HTTP ${resp.status}`;
      console.warn('[LLM] error:', msg);
      return { ok: false, text: '', error: msg };
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text.trim()) {
      return { ok: false, text: '', error: 'EMPTY_RESPONSE' };
    }
    return { ok: true, text: text.trim() };
  } catch (e: any) {
    clearTimeout(timer);
    const msg = e?.name === 'AbortError' ? 'TIMEOUT' : e?.message || String(e);
    console.warn('[LLM] exception:', msg);
    return { ok: false, text: '', error: msg };
  }
}

/**
 * 健康检查：调用一个轻量请求验证 Key 有效。
 */
export async function pingLLM(): Promise<{ ok: boolean; error?: string }> {
  const r = await callLLM('你好，请回复"在的"两个字', {
    temperature: 0,
    maxOutputTokens: 16,
    timeoutMs: 8000,
  });
  return { ok: r.ok, error: r.error };
}
