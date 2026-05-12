export type APIProvider =
  | 'local'
  | 'ollama'
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

export const LOCAL_PROVIDERS: APIProvider[] = ['local']

export function isLocalProvider(provider: string | undefined | null): boolean {
  return !!provider && (LOCAL_PROVIDERS as string[]).includes(provider)
}

export type APIConfigSource = 'storage' | 'env'

export type APIConfigType = 'text' | 'voice' | 'stt' | 'tts' | 'image-gen' | 'image-understanding' | 'video' | 'image'

export interface APIConfig {
  id: string
  name: string
  provider: APIProvider
  apiKey: string
  baseURL?: string
  model: string
  models?: string[]
  speechModel?: string
  speechVoice?: string
  transcriptionModel?: string
  isDefault: boolean
  source?: APIConfigSource
  configType: APIConfigType
}

export interface TestResult {
  success: boolean
  message: string
  model?: string
}

export const PROVIDER_DISPLAY_NAMES: Record<APIProvider, string> = {
  local: '内置/系统模型',
  ollama: '本地/Ollama',
  openai: 'OpenAI/ChatGPT',
  'openai-compatible': 'OpenAI/兼容协议',
  anthropic: 'Anthropic/Claude',
  gemini: 'Google/Gemini',
  grok: 'xAI/Grok',
  azure: 'Microsoft/Azure OpenAI',
  bedrock: 'AWS/Bedrock',
  dashscope: '阿里/通义千问',
  volcengine: '字节/豆包',
  zhipu: '智谱/GLM',
  baidu: '百度/文心',
  minimax: 'MiniMax/海螺',
}

export const DEFAULT_OPENAI_CONFIG: Partial<APIConfig> = {
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}
