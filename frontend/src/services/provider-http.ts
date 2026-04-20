import type { APIConfig } from '@/types/api-config'
import { getAdapterOrDefault } from './providers/registry'

export const DEFAULT_PROVIDER_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_PROVIDER_MODEL = 'gpt-4o-mini'
export const DEFAULT_SPEECH_MODEL = 'gpt-4o-mini-tts'
export const DEFAULT_SPEECH_VOICE = 'alloy'
export const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'

export function resolveProviderBaseURL(baseURL?: string): string {
  const candidate = (baseURL || DEFAULT_PROVIDER_BASE_URL).trim()
  if (!candidate) return DEFAULT_PROVIDER_BASE_URL

  try {
    const url = new URL(candidate)
    const pathname = url.pathname.replace(/\/+$/, '')
    if (!pathname) url.pathname = '/v1'
    return url.toString().replace(/\/+$/, '')
  } catch {
    return candidate.replace(/\/+$/, '')
  }
}

export function buildProviderURL(baseURL: string | undefined, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveProviderBaseURL(baseURL)}${normalizedPath}`
}

export function resolveProviderModel(config?: Pick<APIConfig, 'model'> | null): string {
  return config?.model?.trim() || DEFAULT_PROVIDER_MODEL
}

export function resolveSpeechModel(
  config?: Pick<APIConfig, 'model' | 'speechModel'> | null
): string {
  const speechModel = config?.speechModel?.trim()
  if (speechModel) return speechModel
  const model = config?.model?.trim() || ''
  if (/tts|speech/i.test(model)) return model
  return DEFAULT_SPEECH_MODEL
}

export function resolveSpeechVoice(
  config?: Pick<APIConfig, 'speechVoice'> | null
): string {
  return config?.speechVoice?.trim() || DEFAULT_SPEECH_VOICE
}

export function resolveTranscriptionModel(
  config?: Pick<APIConfig, 'model' | 'transcriptionModel'> | null
): string {
  const transModel = config?.transcriptionModel?.trim()
  if (transModel) return transModel
  const model = config?.model?.trim() || ''
  if (/transcribe|whisper/i.test(model)) return model
  return DEFAULT_TRANSCRIPTION_MODEL
}

export function requireAPIKey(config?: Pick<APIConfig, 'apiKey'> | null): string {
  const apiKey = config?.apiKey?.trim()
  if (!apiKey) throw new Error('请先在设置中配置 API Key')
  return apiKey
}

export function buildProviderAuthHeaders(config: Pick<APIConfig, 'apiKey' | 'provider'>): Record<string, string> {
  const adapter = getAdapterOrDefault(config.provider)
  return adapter.buildAuthHeaders(config.apiKey)
}

export function parseProviderErrorPayload(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const errorMsg = (obj.error as Record<string, unknown>)?.message
    if (typeof errorMsg === 'string' && errorMsg.trim()) return errorMsg
    if (typeof obj.detail === 'string' && (obj.detail as string).trim()) return obj.detail as string
    if (typeof obj.message === 'string' && (obj.message as string).trim()) return obj.message as string
  }
  return `HTTP ${status}`
}

export async function parseProviderError(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    return parseProviderErrorPayload(payload, response.status)
  } catch {
    const text = await response.text().catch(() => '')
    if (text.trim()) return text
  }
  return `HTTP ${response.status}`
}
