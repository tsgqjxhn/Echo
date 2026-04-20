import { apiConfigService } from './api-config'
import { NetworkError } from './errors'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'

export class VideoGenService {
  async generate(prompt: string, model?: string): Promise<string[]> {
    const config = await apiConfigService.getDefaultConfig('video')
    if (!config) throw new Error('请先在设置中配置视频生成模型')

    const adapter = getAdapterOrDefault(config.provider)

    if (!adapter.capabilities.videoGeneration) {
      throw new Error(`${adapter.providerId} 不支持视频生成，请配置支持视频生成的提供商（如 DashScope）`)
    }

    if (!adapter.buildVideoBody) {
      throw new Error('当前适配器未实现视频生成')
    }

    const apiKey = requireAPIKey(config)
    const body = adapter.buildVideoBody({
      model: model || config.model,
      prompt,
    })

    if (adapter.submitAsyncTask && adapter.pollAsyncTask) {
      return this.handleAsyncGeneration(config.baseURL, apiKey, body, adapter)
    }

    throw new Error('视频生成仅支持异步任务模式')
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
      throw new NetworkError(finalResult.error || '视频生成任务失败')
    }
    return finalResult.resultUrls
  }
}

export const videoGenService = new VideoGenService()
