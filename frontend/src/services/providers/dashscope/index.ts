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
import { parseDashScopeStreamLine } from './stream-parser'
import { pollDashScopeTask, submitDashScopeTask } from './async-task'

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com'

export const dashscopeCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  imageUnderstanding: true,
  videoGeneration: true,
  modelListing: false,
}

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const dashscopeAdapter: ProviderAdapter = {
  providerId: 'dashscope',
  capabilities: dashscopeCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/api/v1/services/aigc/text-generation/generation`
      case 'tts': return `${base}/api/v1/services/aigc/text2audio/generation`
      case 'stt': return `${base}/api/v1/services/aigc/audio/asr/transcription`
      case 'image': return `${base}/api/v1/services/aigc/text2image/image-synthesis`
      case 'video': return `${base}/api/v1/services/aigc/video-generation/video-synthesis`
      case 'models': throw new Error('DashScope does not support model listing')
    }
  },

  buildChatBody(request: AdapterChatRequest): Record<string, unknown> {
    const messages = request.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }))

    const body: Record<string, unknown> = {
      model: request.model,
      input: { messages },
      parameters: {
        result_format: 'message',
        ...(request.stream ? { incremental_output: true } : {}),
      },
    }

    return body
  },

  parseChatResponse(raw: unknown): ChatCompletionResult {
    const data = raw as Record<string, unknown>
    const output = data.output as Record<string, unknown> | undefined
    const choices = (output?.choices || data.choices) as Array<Record<string, unknown>> | undefined
    const message = choices?.[0]?.message as Record<string, unknown> | undefined
    const content = typeof message?.content === 'string' ? message.content : ''

    const usage = data.usage as Record<string, unknown> | undefined
    const inputTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0)
    const outputTokens = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0)

    return {
      content,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: Number(usage?.total_tokens ?? inputTokens + outputTokens),
      },
      finishReason: (choices?.[0]?.finish_reason as string) || (output?.finish_reason as string) || undefined,
    }
  },

  parseStreamChunk(line: string): StreamChunkResult | null {
    return parseDashScopeStreamLine(line)
  },

  buildTTSBody(request: AdapterTTSRequest): Record<string, unknown> {
    return {
      model: request.model,
      input: { text: request.input },
      parameters: {
        voice: request.voice || 'longxiaochun',
        format: 'mp3',
      },
    }
  },

  buildSTTFormData(request: AdapterSTTRequest): FormData {
    const fd = new FormData()
    fd.append('file', request.file, request.filename)
    fd.append('model', request.model)
    if (request.language) fd.append('language', request.language)
    return fd
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model,
      input: { prompt: request.prompt },
      parameters: {
        size: request.size || '1024*1024',
        n: request.n || 1,
      },
    }
  },

  parseImageResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const output = data.output as Record<string, unknown> | undefined
    const results = output?.results as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(results)) return []
    return results.map(r => String(r.url || '')).filter(Boolean)
  },

  buildVideoBody(request: AdapterVideoRequest): Record<string, unknown> {
    return {
      model: request.model,
      input: { prompt: request.prompt },
    }
  },

  async submitAsyncTask(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult> {
    const base = resolveBaseURL(baseURL)
    const url = this.resolveEndpoint(baseURL, body._service as any || 'image')
    return submitDashScopeTask(base, apiKey, url.replace(base, ''), body)
  },

  async pollAsyncTask(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult> {
    return pollDashScopeTask(resolveBaseURL(baseURL), apiKey, taskId)
  },

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    const adapter = this
    return {
      url: adapter.resolveEndpoint(config.baseURL, 'chat'),
      method: 'POST',
      headers: {
        ...adapter.buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: {
        model: config.model || 'qwen-turbo',
        input: { messages: [{ role: 'user', content: 'ping' }] },
        parameters: { result_format: 'message' },
      },
    }
  },

  parseTestResponse(status: number, data: unknown): TestResult {
    if (status >= 200 && status < 300) {
      const output = (data as Record<string, unknown>)?.output as Record<string, unknown> | undefined
      if (output) return { success: true, message: '连接成功' }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },

  parseErrorPayload(payload: unknown, status: number): string {
    if (typeof payload === 'string' && payload.trim()) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const message = obj.message as string | undefined
      if (message?.trim()) return message
      const output = obj.output as Record<string, unknown> | undefined
      if (typeof output?.message === 'string') return output.message
      const code = obj.code as string | undefined
      if (code) return `${code}: ${obj.message || '未知错误'}`
    }
    return `HTTP ${status}`
  },
}
