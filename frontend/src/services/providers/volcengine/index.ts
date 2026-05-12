import type { APIConfig, TestResult } from '@/types/api-config'
import type {
  AdapterChatRequest,
  AdapterImageRequest,
  AdapterSTTRequest,
  AdapterTTSRequest,
  AdapterVideoRequest,
  AsyncTaskResult,
  ChatCompletionResult,
  ProviderAdapter,
  ProviderCapabilities,
  StreamChunkResult,
} from '../types'
import { pollVolcengineTask, submitVolcengineTask } from './async-task'
import { extractMessageText, normalizeUsage, parseOpenAIStreamLine } from '../openai/stream-parser'

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

export const volcengineCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: false,
  stt: false,
  imageGeneration: true,
  imageUnderstanding: true,
  videoGeneration: true,
  modelListing: false,
}

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const volcengineAdapter: ProviderAdapter = {
  providerId: 'volcengine',
  capabilities: volcengineCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'image': return `${base}/images/generations`
      case 'chat': return `${base}/chat/completions`
      case 'video': return `${base}/video/generation/tasks`
      default: throw new Error(`火山方舟不支持 ${service} 服务`)
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
    return { model: request.model, messages, stream: request.stream }
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

  buildTTSBody(_request: AdapterTTSRequest): Record<string, unknown> {
    throw new Error('火山方舟不支持文本转语音')
  },

  buildSTTFormData(_request: AdapterSTTRequest): FormData {
    throw new Error('火山方舟不支持语音转文本')
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
      size: request.size || '1024x1024',
      n: request.n || 1,
      response_format: 'url',
    }
  },

  parseImageResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const items = data.data as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(items)) return []
    return items.map(item => String(item.url || item.b64_json || '')).filter(Boolean)
  },

  buildVideoBody(request: AdapterVideoRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
      _service: 'video',
    }
  },

  async submitAsyncTask(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult> {
    const base = resolveBaseURL(baseURL)

    if (body._service === 'video') {
      const { _service, ...videoBody } = body
      const endpoint = this.resolveEndpoint(baseURL, 'video')
      return submitVolcengineTask(base, apiKey, endpoint.replace(base, ''), videoBody)
    }

    // Image sync: POST directly and return completed result
    const url = this.resolveEndpoint(baseURL, 'image')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.buildAuthHeaders(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(this.parseErrorPayload(errorData, response.status))
    }

    const data = await response.json()
    const urls = this.parseImageResponse!(data)
    return { taskId: '', status: 'succeeded', resultUrls: urls }
  },

  async pollAsyncTask(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult> {
    return pollVolcengineTask(resolveBaseURL(baseURL), apiKey, taskId)
  },

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    return {
      url: this.resolveEndpoint(config.baseURL, 'image'),
      method: 'POST',
      headers: {
        ...this.buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: {
        model: config.model || 'doubao-seedream-3.0-t2i',
        prompt: 'test',
        size: '1024x1024',
        n: 1,
        response_format: 'url',
      },
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
