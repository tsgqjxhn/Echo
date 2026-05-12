import type { APIConfig, TestResult } from '@/types/api-config'
import type { ProviderAdapter } from '../types'
import { openaiAdapter, openaiCapabilities } from '../openai'

const DEFAULT_BASE_URL = 'http://localhost:11434/v1'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const ollamaCapabilities = {
  ...openaiCapabilities,
  tts: false,
  stt: false,
  imageGeneration: false,
  imageUnderstanding: true,
  videoGeneration: false,
}

export const ollamaAdapter: ProviderAdapter = {
  ...openaiAdapter,
  providerId: 'ollama',
  capabilities: ollamaCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {}
    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    return headers
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/chat/completions`
      case 'models': return `${base}/models`
      default: throw new Error(`Ollama adapter does not support service: ${service}`)
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
        message: models.length > 0 ? '本地 Ollama 连接成功' : '连接成功，但未发现本地模型',
      }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },
}
