import type { APIConfig, TestResult } from '@/types/api-config'
import type {
  AdapterChatRequest,
  AdapterSTTRequest,
  AdapterTTSRequest,
  ChatCompletionResult,
  ProviderAdapter,
  ProviderCapabilities,
  StreamChunkResult,
} from '../types'
import { parseAnthropicStreamLine } from './stream-parser'

const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_BASE_URL = 'https://api.anthropic.com'

export const anthropicCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: false,
  stt: false,
  imageGeneration: false,
  imageUnderstanding: false,
  videoGeneration: false,
  modelListing: true,
}

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const anthropicAdapter: ProviderAdapter = {
  providerId: 'anthropic',
  capabilities: anthropicCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/v1/messages`
      case 'models': return `${base}/v1/models`
      default: throw new Error(`Anthropic does not support ${service}`)
    }
  },

  buildChatBody(request: AdapterChatRequest): Record<string, unknown> {
    const messages = request.messages.filter(m => m.role !== 'system')
    const body: Record<string, unknown> = {
      model: request.model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      max_tokens: 8192,
      stream: request.stream,
    }

    if (request.systemPrompt.trim()) {
      body.system = request.systemPrompt
    }

    return body
  },

  parseChatResponse(raw: unknown): ChatCompletionResult {
    const data = raw as Record<string, unknown>
    const content = data.content as Array<Record<string, unknown>> | undefined
    const text = Array.isArray(content)
      ? content
          .filter(block => block.type === 'text')
          .map(block => String(block.text || ''))
          .join('')
      : ''

    const usage = data.usage as Record<string, unknown> | undefined
    const inputTokens = Number(usage?.input_tokens ?? 0)
    const outputTokens = Number(usage?.output_tokens ?? 0)

    return {
      content: text,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      finishReason: (data.stop_reason as string) || undefined,
      model: (data.model as string) || undefined,
    }
  },

  parseStreamChunk(line: string): StreamChunkResult | null {
    return parseAnthropicStreamLine(line)
  },

  buildTTSBody(_request: AdapterTTSRequest): Record<string, unknown> {
    throw new Error('Anthropic does not support text-to-speech')
  },

  buildSTTFormData(_request: AdapterSTTRequest): FormData {
    throw new Error('Anthropic does not support speech-to-text')
  },

  parseModelsResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const models = data.data as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(models)) return []
    return models
      .map(item => String(item.id || '').trim())
      .filter(Boolean)
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
      return { success: true, message: '连接成功' }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },

  parseErrorPayload(payload: unknown, status: number): string {
    if (typeof payload === 'string' && payload.trim()) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const error = obj.error as Record<string, unknown> | undefined
      if (typeof error?.message === 'string') return error.message
      if (typeof obj.message === 'string') return obj.message
    }
    return `HTTP ${status}`
  },
}
