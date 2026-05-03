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

const DEFAULT_BASE_URL = 'https://qianfan.baidubce.com/v2'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const baiduCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  videoGeneration: false,
  modelListing: false,
}

export const baiduAdapter: ProviderAdapter = {
  providerId: 'baidu',
  capabilities: baiduCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/chat/completions`
      case 'image': return `${base}/ernie-image/images/generations`
      case 'tts': return 'https://tsn.baidu.com/text2audio'
      case 'stt': return 'https://vop.baidu.com/server_api'
      case 'models': throw new Error('Baidu does not support model listing')
      default: throw new Error(`Baidu adapter does not support service: ${service}`)
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
      tex: request.input,
      tok: '',
      cuid: 'echo-app',
      ctp: 1,
      lan: 'zh',
      spd: 5,
      pit: 5,
      vol: 5,
      per: 0,
      aue: 3,
    }
  },

  buildSTTFormData(request: AdapterSTTRequest): FormData {
    const fd = new FormData()
    fd.append('speech', request.file, request.filename)
    fd.append('format', 'pcm')
    fd.append('rate', '16000')
    fd.append('channel', '1')
    fd.append('cuid', 'echo-app')
    fd.append('token', '')
    fd.append('len', String(request.file.size))
    return fd
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model || 'ernie-image-turbo',
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
      headers: {
        ...this.buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: {
        model: config.model || 'ernie-4.0-turbo-8k',
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
      const errorMsg = obj.error_msg as string | undefined
      if (errorMsg?.trim()) return errorMsg
    }
    return `HTTP ${status}`
  },
}
