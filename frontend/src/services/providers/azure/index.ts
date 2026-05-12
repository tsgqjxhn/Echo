import type { APIConfig, TestResult } from '@/types/api-config'
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
import { extractMessageText, normalizeUsage, parseOpenAIStreamLine } from '../openai/stream-parser'

const DEFAULT_BASE_URL = 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const azureCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  imageUnderstanding: true,
  videoGeneration: false,
  modelListing: false,
}

export const azureAdapter: ProviderAdapter = {
  providerId: 'azure',
  capabilities: azureCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/chat/completions?api-version=2024-10-01-preview`
      case 'image': return `${base}/images/generations?api-version=2024-02-01`
      case 'tts': return base.replace('/openai/deployments/', '/cognitiveservices/') + '/audio/speech?api-version=2025-03-01-preview'
      case 'stt': throw new Error('Azure STT uses a separate endpoint; configure STT baseURL manually to https://{region}.stt.speech.microsoft.com')
      case 'models': throw new Error('Azure OpenAI does not support model listing via this adapter')
      default: throw new Error(`Azure adapter does not support service: ${service}`)
    }
  },

  buildChatBody(request: AdapterChatRequest): Record<string, unknown> {
    const messages = [...request.messages]
    const firstMessage = messages[0]
    if (
      request.systemPrompt.trim() &&
      !(firstMessage?.role === 'system' && firstMessage.content === request.systemPrompt.trim())
    ) {
      messages.unshift({ role: 'system', content: request.systemPrompt.trim() })
    }
    return { messages, stream: request.stream }
  },

  parseChatResponse(raw: unknown): ChatCompletionResult {
    const data = raw as Record<string, unknown>
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const message = choices?.[0]?.message as Record<string, unknown> | undefined
    const content = extractMessageText(message?.content)
    return {
      content,
      usage: normalizeUsage(data.usage),
      finishReason: (choices?.[0]?.finish_reason as string) || undefined,
      model: (data.model as string) || undefined,
    }
  },

  parseStreamChunk(line: string): StreamChunkResult | null {
    return parseOpenAIStreamLine(line)
  },

  buildTTSBody(request: AdapterTTSRequest): Record<string, unknown> {
    return {
      model: request.model || 'tts-1',
      voice: request.voice || 'zh-CN-XiaoxiaoNeural',
      input: request.input,
    }
  },

  buildSTTFormData(_request: AdapterSTTRequest): FormData {
    throw new Error('Azure STT requires Speech SDK or a separate REST endpoint. Please configure STT baseURL to https://{region}.stt.speech.microsoft.com and use a custom integration.')
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model || 'dall-e-3',
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
      url: this.resolveEndpoint(config.baseURL, 'chat'),
      method: 'POST',
      headers: this.buildAuthHeaders(config.apiKey),
      body: {
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      },
    }
  },

  parseTestResponse(status: number, data: unknown): TestResult {
    if (status >= 200 && status < 300) {
      const choices = (data as Record<string, unknown>)?.choices as Array<Record<string, unknown>> | undefined
      if (choices && choices.length > 0) return { success: true, message: '连接成功' }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },

  parseErrorPayload(payload: unknown, status: number): string {
    if (typeof payload === 'string' && payload.trim()) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const message = obj.message as string | undefined
      if (message?.trim()) return message
      const error = obj.error as Record<string, unknown> | undefined
      if (typeof error?.message === 'string') return error.message
      const innerError = obj.error as Record<string, unknown> | undefined
      if (innerError && typeof innerError.code === 'string') {
        return `${innerError.code}: ${innerError.message || '未知错误'}`
      }
    }
    return `HTTP ${status}`
  },
}
