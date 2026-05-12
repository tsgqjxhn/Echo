import type { APIConfig, TestResult } from '@/types/api-config'
import type { ChatMessage, TokenUsage } from '@/types/chat'
import type {
  AdapterChatRequest,
  AdapterImageRequest,
  AdapterSTTRequest,
  AdapterTTSRequest,
  ChatCompletionResult,
  ProviderAdapter,
  ProviderCapabilities,
  StreamChunkResult,
} from '../types'
import { extractMessageText, normalizeUsage, parseOpenAIStreamLine } from './stream-parser'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_SPEECH_MODEL = 'gpt-4o-mini-tts'
const DEFAULT_SPEECH_VOICE = 'alloy'
const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'

function resolveBaseURL(baseURL?: string): string {
  const candidate = (baseURL || DEFAULT_BASE_URL).trim()
  if (!candidate) return DEFAULT_BASE_URL

  try {
    const url = new URL(candidate)
    const pathname = url.pathname.replace(/\/+$/, '')
    if (!pathname) url.pathname = '/v1'
    return url.toString().replace(/\/+$/, '')
  } catch {
    return candidate.replace(/\/+$/, '')
  }
}

const ENDPOINT_MAP: Record<string, string> = {
  chat: '/chat/completions',
  tts: '/audio/speech',
  stt: '/audio/transcriptions',
  image: '/images/generations',
  models: '/models',
}

export const openaiCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  imageUnderstanding: true,
  videoGeneration: false,
  modelListing: true,
}

export const openaiAdapter: ProviderAdapter = {
  providerId: 'openai',
  capabilities: openaiCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const path = ENDPOINT_MAP[service]
    if (!path) throw new Error(`OpenAI adapter does not support service: ${service}`)
    return `${resolveBaseURL(baseURL)}${path}`
  },

  buildChatBody(request: AdapterChatRequest): Record<string, unknown> {
    const messages: ChatMessage[] = [...request.messages]
    const firstMessage = messages[0]
    if (
      request.systemPrompt.trim() &&
      !(firstMessage?.role === 'system' && firstMessage.content === request.systemPrompt.trim())
    ) {
      messages.unshift({ role: 'system', content: request.systemPrompt.trim() })
    }
    return { model: request.model, messages, stream: request.stream }
  },

  parseChatResponse(raw: unknown): ChatCompletionResult {
    const data = raw as Record<string, unknown>
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const message = choices?.[0]?.message as Record<string, unknown> | undefined
    const content = extractMessageText(message?.content)
    const usage = normalizeUsage(data.usage) as TokenUsage | undefined

    return {
      content,
      usage,
      finishReason: (choices?.[0]?.finish_reason as string) || undefined,
      model: (data.model as string) || undefined,
    }
  },

  parseStreamChunk(line: string): StreamChunkResult | null {
    return parseOpenAIStreamLine(line)
  },

  buildTTSBody(request: AdapterTTSRequest): Record<string, unknown> {
    return {
      model: request.model || DEFAULT_SPEECH_MODEL,
      voice: request.voice || DEFAULT_SPEECH_VOICE,
      input: request.input,
    }
  },

  buildSTTFormData(request: AdapterSTTRequest): FormData {
    const fd = new FormData()
    fd.append('file', request.file, request.filename)
    fd.append('model', request.model || DEFAULT_TRANSCRIPTION_MODEL)
    if (request.language?.trim()) {
      fd.append('language', request.language.trim())
    }
    return fd
  },

  parseModelsResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const models = Array.isArray(data.data)
      ? data.data
          .map((item: Record<string, unknown>) => String(item?.id || '').trim())
          .filter(Boolean)
      : []
    return Array.from(new Set(models))
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
      size: request.size || '1024x1024',
      n: request.n || 1,
    }
  },

  parseImageResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const items = data.data as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(items)) return []
    return items.map(item => String(item.url || item.b64_json || '')).filter(Boolean)
  },

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    return {
      url: this.resolveEndpoint(config.baseURL, 'models'),
      method: 'GET',
      headers: this.buildAuthHeaders(config.apiKey),
    }
  },

  parseTestResponse(status: number, data: unknown): TestResult {
    if (status >= 200 && status < 300) {
      const models = this.parseModelsResponse(data)
      return {
        success: true,
        message: models.length > 0 ? '连接成功' : '连接成功，但接口未返回模型列表',
      }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },

  parseErrorPayload(payload: unknown, status: number): string {
    if (typeof payload === 'string' && payload.trim()) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const errorMsg = (obj.error as Record<string, unknown>)?.message
      if (typeof errorMsg === 'string' && errorMsg.trim()) return errorMsg
      if (typeof obj.detail === 'string' && (obj.detail as string).trim()) return obj.detail as string
      if (typeof obj.message === 'string' && (obj.message as string).trim()) return obj.message as string
    }
    return `HTTP ${status}`
  },
}

export const openaiCompatibleAdapter: ProviderAdapter = {
  ...openaiAdapter,
  providerId: 'openai-compatible',
}
