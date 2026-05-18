import { openaiAdapter } from '../openai'
import type { AdapterSTTRequest, ProviderAdapter } from '../types'

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
const DEFAULT_STT_MODEL = 'glm-asr-2512'

const ENDPOINT_MAP: Record<string, string> = {
  chat: '/chat/completions',
  tts: '/audio/speech',
  stt: '/audio/transcriptions',
  image: '/images/generations',
  models: '/models',
}

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
}

export const zhipuAdapter: ProviderAdapter = {
  ...openaiAdapter,
  providerId: 'zhipu' as const,

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const path = ENDPOINT_MAP[service]
    if (!path) throw new Error(`Zhipu adapter does not support service: ${service}`)
    return `${resolveBaseURL(baseURL)}${path}`
  },

  buildSTTFormData(request: AdapterSTTRequest): FormData {
    const fd = new FormData()
    fd.append('file', request.file, request.filename)
    fd.append('model', request.model || DEFAULT_STT_MODEL)
    fd.append('stream', 'false')
    if (request.language?.trim() && request.language !== 'auto') {
      fd.append('language', request.language.trim())
    }
    return fd
  },

  parseModelsResponse(raw: unknown): string[] {
    return Array.from(new Set([...openaiAdapter.parseModelsResponse(raw), DEFAULT_STT_MODEL]))
  },
}
