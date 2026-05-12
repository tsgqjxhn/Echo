import { apiConfigService } from './api-config'
import { NetworkError } from './errors'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'

export interface ImageGenOptions {
  size?: string
  n?: number
}

export class ImageGenService {
  async generate(prompt: string, options?: ImageGenOptions): Promise<string[]> {
    const config = await apiConfigService.getDefaultConfig('image-gen')
    if (!config) throw new Error('请先在设置中配置图片生成模型')

    const adapter = getAdapterOrDefault(config.provider)

    if (!adapter.capabilities.imageGeneration) {
      throw new Error(`${adapter.providerId} 不支持图片生成，请配置支持图片生成的提供商（如 OpenAI 或 DashScope）`)
    }

    if (!adapter.buildImageBody || !adapter.parseImageResponse) {
      throw new Error('当前适配器未实现图片生成')
    }

    const body = adapter.buildImageBody({
      model: config.model,
      prompt,
      size: options?.size,
      n: options?.n,
    })

    const apiKey = requireAPIKey(config)

    if (adapter.submitAsyncTask && adapter.pollAsyncTask) {
      return this.handleAsyncGeneration(config.baseURL, apiKey, body, adapter)
    }

    return this.handleSyncGeneration(config.baseURL, apiKey, body, adapter)
  }

  private async handleSyncGeneration(
    baseURL: string | undefined,
    apiKey: string,
    body: Record<string, unknown>,
    adapter: ReturnType<typeof getAdapterOrDefault>
  ): Promise<string[]> {
    const url = adapter.resolveEndpoint(baseURL, 'image')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...adapter.buildAuthHeaders(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new NetworkError(adapter.parseErrorPayload(errorData, response.status))
    }

    const data = await response.json()
    return adapter.parseImageResponse!(data)
  }

  private async handleAsyncGeneration(
    baseURL: string | undefined,
    apiKey: string,
    body: Record<string, unknown>,
    adapter: ReturnType<typeof getAdapterOrDefault>
  ): Promise<string[]> {
    const taskResult = await adapter.submitAsyncTask!(baseURL, apiKey, body)
    if (taskResult.status === 'succeeded') return taskResult.resultUrls

    const finalResult = await adapter.pollAsyncTask!(baseURL, apiKey, taskResult.taskId)
    if (finalResult.status === 'failed') {
      throw new NetworkError(finalResult.error || '图片生成任务失败')
    }
    return finalResult.resultUrls
  }
}

export const imageGenService = new ImageGenService()
