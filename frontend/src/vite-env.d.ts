/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_LLM_NAME?: string
  readonly VITE_LLM_PROVIDER?:
    | 'openai'
    | 'openai-compatible'
    | 'anthropic'
    | 'gemini'
    | 'grok'
    | 'azure'
    | 'bedrock'
    | 'dashscope'
    | 'volcengine'
    | 'zhipu'
    | 'baidu'
    | 'minimax'
    | 'ollama'
  readonly VITE_LLM_BASE_URL?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_LLM_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
