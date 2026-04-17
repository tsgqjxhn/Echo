import type { APIConfig, TestResult } from '@/types/api-config'
import { requestJSON, requestOptionalJSON } from './http'
import { generateUUID } from '@/utils/uuid'

class APIConfigService {
  async save(config: APIConfig): Promise<void> {
    await requestJSON('/api/api-configs', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async create(config: Omit<APIConfig, 'id'>): Promise<string> {
    const id = generateUUID()
    await this.save({
      ...config,
      id,
      source: 'storage'
    })
    return id
  }

  async getConfig(id: string): Promise<APIConfig | null> {
    return requestOptionalJSON<APIConfig>(`/api/api-configs/${encodeURIComponent(id)}`)
  }

  async getAll(): Promise<APIConfig[]> {
    return requestJSON<APIConfig[]>('/api/api-configs')
  }

  async getDefaultConfig(): Promise<APIConfig | null> {
    const configs = await this.getAll()
    return configs.find(config => config.isDefault) || configs[0] || null
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
        isDefault: config.id === id
      })
    }
  }

  async testConnection(config: APIConfig): Promise<TestResult> {
    return requestJSON<TestResult>('/api/api-configs/test', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async delete(id: string): Promise<void> {
    await requestJSON(`/api/api-configs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  async hasConfig(): Promise<boolean> {
    return (await this.getAll()).length > 0
  }
}

export const apiConfigService = new APIConfigService()

export { APIConfigService }
