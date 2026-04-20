import type { APIConfig, APIConfigType, TestResult } from '@/types/api-config'
import { generateUUID } from '@/utils/uuid'
import { storageDriver } from './storage'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'
import { runtimeRequest } from './runtime-http'

class APIConfigService {
  async save(config: APIConfig): Promise<void> {
    await storageDriver.saveAPIConfig(config)
  }

  async create(config: Omit<APIConfig, 'id'>): Promise<string> {
    const id = generateUUID()
    await this.save({ ...config, id, source: 'storage' })
    return id
  }

  async getConfig(id: string): Promise<APIConfig | null> {
    return storageDriver.getAPIConfig(id)
  }

  async getAll(): Promise<APIConfig[]> {
    return storageDriver.getAllAPIConfigs()
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
        body: testReq.body,
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
      return adapter.parseModelsResponse(response.data)
    } catch {
      return []
    }
  }
}

export const apiConfigService = new APIConfigService()
export { APIConfigService }
