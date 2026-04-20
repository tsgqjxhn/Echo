import type { APIConfig, APIConfigType, TestResult } from '@/types/api-config'
import { generateUUID } from '@/utils/uuid'
import { storageDriver } from './storage'
import {
  buildProviderAuthHeaders,
  buildProviderURL,
  parseProviderErrorPayload,
  requireAPIKey,
  resolveProviderModel,
} from './provider-http'
import { runtimeRequest } from './runtime-http'

interface ModelsResponse {
  data?: Array<{ id?: string }>
}

async function fetchModelList(baseURL: string | undefined, apiKey: string): Promise<string[]> {
  if (!apiKey.trim()) {
    throw new Error('请先输入 API Key')
  }

  const response = await runtimeRequest<ModelsResponse>({
    url: buildProviderURL(baseURL, '/models'),
    method: 'GET',
    headers: buildProviderAuthHeaders(apiKey),
    responseType: 'json',
    connectTimeout: 30_000,
    readTimeout: 30_000,
  })

  if (!response.ok) {
    if ([404, 405, 501].includes(response.status)) {
      return []
    }

    throw new Error(parseProviderErrorPayload(response.data, response.status))
  }

  const payload = response.data || {}
  const models = Array.isArray(payload.data)
    ? payload.data
        .map(item => String(item?.id || '').trim())
        .filter(Boolean)
    : []

  return Array.from(new Set(models))
}

async function pingChatCompletion(config: APIConfig): Promise<void> {
  const response = await runtimeRequest<Record<string, unknown>>({
    url: buildProviderURL(config.baseURL, '/chat/completions'),
    method: 'POST',
    headers: {
      ...buildProviderAuthHeaders(requireAPIKey(config)),
      'Content-Type': 'application/json',
    },
    body: {
      model: resolveProviderModel(config),
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    },
    responseType: 'json',
    connectTimeout: 30_000,
    readTimeout: 60_000,
  })

  if (!response.ok) {
    throw new Error(parseProviderErrorPayload(response.data, response.status))
  }
}

class APIConfigService {
  async save(config: APIConfig): Promise<void> {
    await storageDriver.saveAPIConfig(config)
  }

  async create(config: Omit<APIConfig, 'id'>): Promise<string> {
    const id = generateUUID()
    await this.save({
      ...config,
      id,
      source: 'storage',
    })
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
    if (!target) {
      throw new Error('Config was not found.')
    }

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
    let models: string[] = []
    let lastError: Error | null = null

    try {
      models = await fetchModelList(config.baseURL, requireAPIKey(config))
      if (models.length > 0) {
        return {
          success: true,
          message: '连接成功',
          model: config.model || models[0],
        }
      }
    } catch (error) {
      lastError = error as Error
    }

    try {
      if ((config.configType || 'text') !== 'voice' && config.model?.trim()) {
        await pingChatCompletion(config)
        return {
          success: true,
          message: '连接成功，模型列表接口未开放',
          model: config.model,
        }
      }

      return {
        success: true,
        message: '连接成功，但接口未返回模型列表，请手动填写模型名称',
        model: config.model || undefined,
      }
    } catch (error) {
      const resolvedError = error as Error
      return {
        success: false,
        message: resolvedError.message || lastError?.message || '连接失败',
        model: config.model || undefined,
      }
    }
  }

  async delete(id: string): Promise<void> {
    await storageDriver.deleteAPIConfig(id)
  }

  async hasConfig(): Promise<boolean> {
    return (await this.getAll()).length > 0
  }

  async fetchModels(baseURL: string | undefined, apiKey: string, configType: APIConfigType): Promise<string[]> {
    void configType
    return fetchModelList(baseURL, apiKey.trim())
  }
}

export const apiConfigService = new APIConfigService()

export { APIConfigService }
