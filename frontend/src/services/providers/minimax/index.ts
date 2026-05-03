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
import { extractMessageText, normalizeUsage, parseOpenAIStreamLine } from '../openai/stream-parser'

const DEFAULT_BASE_URL = 'https://api.minimax.chat/v1'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const minimaxCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  videoGeneration: true,
  modelListing: false,
}

export const minimaxAdapter: ProviderAdapter = {
  providerId: 'minimax',
  capabilities: minimaxCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/text/chatcompletion_v2`
      case 'tts': return `${base}/t2a_v2`
      case 'stt': return `${base}/asr`
      case 'image': return `${base}/image_generation`
      case 'video': return `${base}/video_generation`
      case 'models': throw new Error('MiniMax does not support model listing')
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

  buildTTSBody(request: AdapterTTSRequest): Record<string, unknown> {
    return {
      model: request.model || 'speech-2.8-hd',
      text: request.input,
      voice_setting: {
        voice_id: request.voice || 'Wise_Woman',
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
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
      model: request.model || 'image-01',
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || '1024x1024',
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
      model: request.model || 'video-01',
      prompt: request.prompt,
    }
  },

  async submitAsyncTask(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult> {
    const url = this.resolveEndpoint(baseURL, 'video')
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
    const taskId = String(data.task_id || data.id || '')
    if (!taskId) {
      return { taskId: '', status: 'succeeded', resultUrls: [] }
    }
    return { taskId, status: 'pending', resultUrls: [] }
  },

  async pollAsyncTask(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult> {
    const url = `${resolveBaseURL(baseURL)}/video_generation/${taskId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildAuthHeaders(apiKey),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(this.parseErrorPayload(errorData, response.status))
    }
    const data = await response.json()
    const status = String(data.status || 'pending')
    const resultUrls: string[] = []
    if (status === 'succeeded' && data.result) {
      if (Array.isArray(data.result.videos)) {
        resultUrls.push(...data.result.videos.map((v: any) => String(v.url || '')).filter(Boolean))
      }
    }
    return {
      taskId,
      status: status === 'succeeded' ? 'succeeded' : status === 'failed' ? 'failed' : 'running',
      resultUrls,
      error: data.error?.message || undefined,
    }
  },

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    return {
      url: this.resolveEndpoint(config.baseURL, 'chat'),
      method: 'POST',
      headers: {
        ...this.buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: {
        model: config.model || 'abab6.5s',
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
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
    }
    return `HTTP ${status}`
  },
}
