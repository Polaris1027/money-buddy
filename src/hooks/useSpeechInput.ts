import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Speech API 语音输入 Hook
 * - 浏览器原生 SpeechRecognition（Chrome/Edge/部分国产浏览器支持，Safari/Firefox 桌面端不支持）
 * - 中文识别 lang='zh-CN'
 * - 支持中间态实时回调（边说边出字）
 */

type SpeechStatus = 'idle' | 'listening';

interface Options {
  /** 中间识别结果（实时变化），可用于实时显示在输入框 */
  onInterim?: (text: string) => void;
  /** 最终识别结果（说完一句后） */
  onFinal?: (text: string) => void;
  /** 出错回调 */
  onError?: (msg: string) => void;
  /** 语言，默认 zh-CN */
  lang?: string;
}

export function useSpeechInput(options: Options = {}) {
  const { onInterim, onFinal, onError, lang = 'zh-CN' } = options;

  // 用 ref 保存最新回调，避免依赖变化导致 recognition 重建
  const cbRef = useRef({ onInterim, onFinal, onError });
  cbRef.current = { onInterim, onFinal, onError };

  // feature detect
  const SR =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supported = !!SR;

  const [status, setStatus] = useState<SpeechStatus>('idle');
  const recognitionRef = useRef<any>(null);
  // 记录是否是用户主动 stop（用于区分自然结束与手动结束）
  const manualStopRef = useRef(false);

  const start = useCallback(() => {
    if (!supported) {
      cbRef.current.onError?.('当前浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }
    if (recognitionRef.current) return; // 已在监听

    try {
      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = false; // 一句话模式，说完自动结束
      recognition.interimResults = true; // 实时返回中间结果
      recognition.maxAlternatives = 1;

      let finalText = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }
        if (interim) cbRef.current.onInterim?.(finalText + interim);
        if (finalText) cbRef.current.onInterim?.(finalText);
      };

      recognition.onerror = (event: any) => {
        const code = event?.error || 'unknown';
        const msg =
          code === 'not-allowed' || code === 'service-not-allowed'
            ? '麦克风权限被拒绝，请在浏览器地址栏允许后重试'
            : code === 'no-speech'
            ? '没听到声音，再试一次？'
            : code === 'audio-capture'
            ? '没找到麦克风设备'
            : code === 'network'
            ? '网络异常，语音服务暂不可用'
            : `语音识别出错：${code}`;
        cbRef.current.onError?.(msg);
      };

      recognition.onend = () => {
        // 自然结束 -> 把最终文字回调出去
        if (finalText.trim()) {
          cbRef.current.onFinal?.(finalText.trim());
        }
        recognitionRef.current = null;
        manualStopRef.current = false;
        setStatus('idle');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setStatus('listening');
    } catch (e: any) {
      cbRef.current.onError?.(e?.message || '启动语音识别失败');
      setStatus('idle');
    }
  }, [SR, lang, supported]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    manualStopRef.current = true;
    try {
      r.stop();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  // 卸载时确保停止
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    supported,
    status,
    listening: status === 'listening',
    start,
    stop,
    toggle,
  };
}
