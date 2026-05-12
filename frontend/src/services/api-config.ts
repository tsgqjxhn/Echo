import type { APIConfig, APIConfigType, TestResult } from '@/types/api-config'
import { generateUUID } from '@/utils/uuid'
import { storageDriver } from './storage'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'
import { runtimeRequest } from './runtime-http'

const STT_PATTERN = /(whisper|transcrib|paraformer|sensevoice|asr|sambert.*(stt|asr)|qwen.*audio.*asr)/i
const TTS_PATTERN = /(\btts\b|\bspeech\b|cosyvoice|sambert|qwen.*tts|chat.?tts)/i
const IMAGE_PATTERN = /(dall.?e|imagen|stable.?diffusion|\bsd[-_]|\bsdxl\b|flux|midjourney|seedream|wanx|cogview|kolors)/i
const VISION_PATTERN = /(vision|gpt-4o|claude-3|gemini|grok|glm-4v|qwen-vl|yi-vl)/i
const VIDEO_PATTERN = /(sora|veo|kling|cogvideo|seedance|wan2|runway|pika|hailuo|mochi)/i
const CHAT_EXCLUDE_PATTERN = /(embedding|moderation|reranker|guard)/i

function isVoiceModel(id: string): boolean {
  return STT_PATTERN.test(id) || TTS_PATTERN.test(id)
}

function isMediaModel(id: string): boolean {
  return IMAGE_PATTERN.test(id) || VIDEO_PATTERN.test(id)
}

function filterModelsByType(models: string[], configType: APIConfigType): string[] {
  switch (configType) {
    case 'stt':
      return models.filter(id => STT_PATTERN.test(id))
    case 'tts':
      return models.filter(id => TTS_PATTERN.test(id))
    case 'voice':
      return models.filter(id => isVoiceModel(id))
    case 'image-gen':
    case 'image':
      return models.filter(id => IMAGE_PATTERN.test(id))
    case 'image-understanding':
      return models.filter(id => VISION_PATTERN.test(id))
    case 'video':
      return models.filter(id => VIDEO_PATTERN.test(id))
    case 'text':
    default:
      return models.filter(id => !isVoiceModel(id) && !isMediaModel(id) && !CHAT_EXCLUDE_PATTERN.test(id))
  }
}

function normalizeModels(config: APIConfig): APIConfig {
  const modelItems = [
    ...(Array.isArray(config.models) ? config.models : []),
    config.model,
  ]
    .map(model => String(model || '').trim())
    .filter(Boolean)
  const models = Array.from(new Set(modelItems))

  return {
    ...config,
    model: config.model?.trim() || models[0] || '',
    models,
  }
}

class APIConfigService {
  async save(config: APIConfig): Promise<void> {
    await storageDriver.saveAPIConfig(normalizeModels(config))
  }

  async create(config: Omit<APIConfig, 'id'>): Promise<string> {
    const id = generateUUID()
    await this.save({ ...config, id, source: 'storage' })
    return id
  }

  async getConfig(id: string): Promise<APIConfig | null> {
    const config = await storageDriver.getAPIConfig(id)
    return config ? normalizeModels(config) : null
  }

  async getAll(): Promise<APIConfig[]> {
    return (await storageDriver.getAllAPIConfigs()).map(normalizeModels)
  }

  async getDefaultConfig(configType: APIConfigType = 'text'): Promise<APIConfig | null> {
    const configs = await this.getAll()
    const filtered = configs.filter(config => (config.configType || 'text') === configType)
    return filtered.find(config => config.isDefault) || filtered[0] || null
  }

  async setAsDefault(id: string): Promise<void> {
    const configs = await this.getAll()
    const target = configs.find(config => config.id === id)
    if (!target) throw new Error('Config was not found.')

    for (const config of configs) {
      await this.save({
        ...config,
        isDefault:
          (config.configType || 'text') === (target.configType || 'text')
            ? config.id === id
            : config.isDefault,
      })
    }
  }

  async testConnection(config: APIConfig): Promise<TestResult> {
    const adapter = getAdapterOrDefault(config.provider)
    const testReq = adapter.buildTestRequest(config)
    let lastError: Error | null = null

    try {
      const response = await runtimeRequest<unknown>({
        url: testReq.url,
        method: testReq.method,
        headers: testReq.headers,
        body: testReq.body as BodyInit | Record<string, unknown> | null | undefined,
        responseType: 'json',
        connectTimeout: 30_000,
        readTimeout: 30_000,
      })

      const result = adapter.parseTestResponse(response.status, response.data)
      if (result.success) {
        return { ...result, model: config.model || result.model }
      }
      lastError = new Error(result.message)
    } catch (error) {
      lastError = error as Error
    }

    if (adapter.capabilities.chat && config.model?.trim()) {
      try {
        const apiKey = requireAPIKey(config)
        const chatUrl = adapter.resolveEndpoint(config.baseURL, 'chat')
        const chatBody = adapter.buildChatBody({
          model: config.model,
          messages: [],
          systemPrompt: '',
          stream: false,
        })

        const response = await runtimeRequest<unknown>({
          url: chatUrl,
          method: 'POST',
          headers: {
            ...adapter.buildAuthHeaders(apiKey),
            'Content-Type': 'application/json',
          },
          body: { ...chatBody, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
          responseType: 'json',
          connectTimeout: 30_000,
          readTimeout: 60_000,
        })

        if (response.ok) {
          return { success: true, message: '连接成功，模型列表接口未开放', model: config.model }
        }
      } catch {
        // fall through to error
      }
    }

    return {
      success: false,
      message: lastError?.message || '连接失败',
      model: config.model || undefined,
    }
  }

  async delete(id: string): Promise<void> {
    await storageDriver.deleteAPIConfig(id)
  }

  async hasConfig(): Promise<boolean> {
    return (await this.getAll()).length > 0
  }

  async fetchModels(baseURL: string | undefined, apiKey: string, configType: APIConfigType, provider?: string): Promise<string[]> {
    const adapter = getAdapterOrDefault(provider)
    if (!adapter.capabilities.modelListing) return []

    try {
      const url = adapter.resolveEndpoint(baseURL, 'models')
      const response = await runtimeRequest<Record<string, unknown>>({
        url,
        method: 'GET',
        headers: adapter.buildAuthHeaders(apiKey),
        responseType: 'json',
        connectTimeout: 30_000,
        readTimeout: 30_000,
      })

      if (!response.ok) return []
      const all = adapter.parseModelsResponse(response.data)
      return filterModelsByType(all, configType)
    } catch {
      return []
    }
  }
}

export const apiConfigService = new APIConfigService()
export { APIConfigService }
