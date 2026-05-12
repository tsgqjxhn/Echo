import type { APIConfig, TestResult } from '@/types/api-config'
import type {
  AdapterChatRequest,
  AdapterImageRequest,
  AdapterVideoRequest,
  ChatCompletionResult,
  ProviderAdapter,
  ProviderCapabilities,
  StreamChunkResult,
} from '../types'
import { openaiAdapter, openaiCapabilities } from '../openai'

const DEFAULT_BASE_URL = 'https://api.x.ai/v1'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const grokCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: false,
  stt: false,
  imageGeneration: true,
  imageUnderstanding: true,
  videoGeneration: true,
  modelListing: true,
}

export const grokAdapter: ProviderAdapter = {
  ...openaiAdapter,
  providerId: 'grok',
  capabilities: grokCapabilities,

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/chat/completions`
      case 'image': return `${base}/images/generations`
      case 'video': return `${base}/videos/generations`
      case 'models': return `${base}/models`
      default: throw new Error(`Grok adapter does not support service: ${service}`)
    }
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
      n: request.n || 1,
    }
  },

  buildVideoBody(request: AdapterVideoRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
    }
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
}
