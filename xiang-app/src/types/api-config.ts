export type APIProvider = 'openai' | 'openai-compatible'

export type APIConfigSource = 'storage' | 'env'

export interface APIConfig {
  id: string
  name: string
  provider: APIProvider
  apiKey: string
  baseURL?: string
  model: string
  isDefault: boolean
  source?: APIConfigSource
}

export interface TestResult {
  success: boolean
  message: string
  model?: string
}

export const PROVIDER_DISPLAY_NAMES: Record<APIProvider, string> = {
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI Compatible'
}

export const DEFAULT_OPENAI_CONFIG: Partial<APIConfig> = {
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}
