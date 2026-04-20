export type APIProvider = 'openai' | 'openai-compatible' | 'anthropic' | 'dashscope' | 'volcengine' | 'gemini'

export type APIConfigSource = 'storage' | 'env'

export type APIConfigType = 'text' | 'voice' | 'stt' | 'tts' | 'image' | 'video'

export interface APIConfig {
  id: string
  name: string
  provider: APIProvider
  apiKey: string
  baseURL?: string
  model: string
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
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI Compatible',
  anthropic: 'Anthropic',
  dashscope: 'DashScope',
  volcengine: '火山方舟 (Volcengine)',
  gemini: 'Gemini',
}

export const DEFAULT_OPENAI_CONFIG: Partial<APIConfig> = {
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}
