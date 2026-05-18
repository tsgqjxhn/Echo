export type APIProvider =
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
  | 'local'

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

export interface BalanceInfo {
  provider: string
  configName: string
  balance?: number
  used?: number
  total?: number
  currency?: string
  status: 'success' | 'unsupported' | 'error'
  message?: string
}

export const PROVIDER_DISPLAY_NAMES: Record<APIProvider, string> = {
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
  ollama: 'Ollama/本地模型',
  local: '本地语音',
}

export const DEFAULT_OPENAI_CONFIG: Partial<APIConfig> = {
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}
