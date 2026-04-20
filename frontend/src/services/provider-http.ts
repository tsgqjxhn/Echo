import type { APIConfig } from '@/types/api-config'

export const DEFAULT_PROVIDER_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_PROVIDER_MODEL = 'gpt-4o-mini'
export const DEFAULT_SPEECH_MODEL = 'gpt-4o-mini-tts'
export const DEFAULT_SPEECH_VOICE = 'alloy'
export const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'

export function resolveProviderBaseURL(baseURL?: string): string {
  const candidate = (baseURL || DEFAULT_PROVIDER_BASE_URL).trim()
  if (!candidate) {
    return DEFAULT_PROVIDER_BASE_URL
  }

  try {
    const url = new URL(candidate)
    const pathname = url.pathname.replace(/\/+$/, '')

    if (!pathname) {
      url.pathname = '/v1'
    }

    return url.toString().replace(/\/+$/, '')
  } catch {
    return candidate.replace(/\/+$/, '')
  }
}

export function buildProviderURL(baseURL: string | undefined, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveProviderBaseURL(baseURL)}${normalizedPath}`
}

function getOptionalConfigValue(value?: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

export function resolveProviderModel(config?: Pick<APIConfig, 'model'> | null): string {
  return config?.model?.trim() || DEFAULT_PROVIDER_MODEL
}

export function resolveSpeechModel(
  config?: Pick<APIConfig, 'model' | 'speechModel'> | null
): string {
  return (
    getOptionalConfigValue(config?.speechModel) ||
    (/tts|speech/i.test(config?.model || '') ? getOptionalConfigValue(config?.model) : undefined) ||
    DEFAULT_SPEECH_MODEL
  )
}

export function resolveSpeechVoice(
  config?: Pick<APIConfig, 'speechVoice'> | null
): string {
  return getOptionalConfigValue(config?.speechVoice) || DEFAULT_SPEECH_VOICE
}

export function resolveTranscriptionModel(
  config?: Pick<APIConfig, 'model' | 'transcriptionModel'> | null
): string {
  return (
    getOptionalConfigValue(config?.transcriptionModel) ||
    (/transcribe|whisper/i.test(config?.model || '') ? getOptionalConfigValue(config?.model) : undefined) ||
    DEFAULT_TRANSCRIPTION_MODEL
  )
}

export function requireAPIKey(config?: Pick<APIConfig, 'apiKey'> | null): string {
  const apiKey = config?.apiKey?.trim()
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }

  return apiKey
}

export function buildProviderAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  }
}

export function parseProviderErrorPayload(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const errorMessage = (payload as any)?.error?.message
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage
    }

    const detail = (payload as any)?.detail
    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    const message = (payload as any)?.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return `HTTP ${status}`
}

export async function parseProviderError(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    return parseProviderErrorPayload(payload, response.status)
  } catch {
    const text = await response.text().catch(() => '')
    if (text.trim()) {
      return text
    }
  }

  return `HTTP ${response.status}`
}
