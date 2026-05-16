/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY?: string;
  /** 可选：自定义 baseURL，留空走官方 https://api.deepseek.com */
  readonly VITE_DEEPSEEK_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
