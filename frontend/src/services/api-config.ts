import type { APIConfig, APIConfigType, APIProvider, BalanceInfo, TestResult } from '@/types/api-config'
import { generateUUID } from '@/utils/uuid'
import { storageDriver } from './storage'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'
import { runtimeRequest } from './runtime-http'
import { encryptApiKey, decryptApiKey, isEncryptedApiKey } from './crypto'

const STT_PATTERN = /(whisper|transcrib|glm-asr|paraformer|sensevoice|\basr\b|sambert.*(stt|asr)|qwen.*audio.*asr)/i
const TTS_PATTERN = /(\btts\b|\bspeech\b|cosyvoice|sambert|qwen.*tts|chat.?tts)/i
const IMAGE_PATTERN = /(dall.?e|imagen|stable.?diffusion|\bsd[-_]|\bsdxl\b|flux|midjourney|seedream|wanx|cogview|kolors)/i
const VISION_PATTERN = /(vision|gpt-4o|claude-3|gemini|grok|glm-4v|qwen-vl|yi-vl)/i
const VIDEO_PATTERN = /(sora|veo|kling|cogvideo|seedance|wan2|runway|pika|hailuo|mochi)/i
const CHAT_EXCLUDE_PATTERN = /(embedding|moderation|reranker|guard)/i

const PRESET_MODELS_BY_PROVIDER_TYPE: Partial<Record<APIProvider, Partial<Record<APIConfigType, string[]>>>> = {
  zhipu: {
    stt: ['glm-asr-2512'],
    tts: ['glm-tts'],
  },
}

const ENV_CONFIG_ID = 'env:text-default'
const REMOVED_LOCAL_PROVIDERS = new Set(['ollama', 'local'])

function isRemovedLocalProvider(provider?: string): boolean {
  return REMOVED_LOCAL_PROVIDERS.has((provider || '').trim().toLowerCase())
}

function normalizeProvider(provider?: string): APIProvider {
  const value = (provider || 'openai-compatible').trim() as APIProvider
  return getAdapterOrDefault(value).providerId
}

function getEnvTextConfig(): APIConfig | null {
  const env = import.meta.env
  const apiKey = env.VITE_LLM_API_KEY?.trim()
  const model = env.VITE_LLM_MODEL?.trim()
  if (!apiKey || !model) return null

  return normalizeModels({
    id: ENV_CONFIG_ID,
    name: env.VITE_LLM_NAME?.trim() || 'Env API',
    provider: normalizeProvider(env.VITE_LLM_PROVIDER),
    apiKey,
    baseURL: env.VITE_LLM_BASE_URL?.trim() || undefined,
    model,
    models: [model],
    isDefault: false,
    source: 'env',
    configType: 'text',
  })
}

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

function getPresetModels(provider: string | undefined, configType: APIConfigType): string[] {
  if (!provider) return []
  return PRESET_MODELS_BY_PROVIDER_TYPE[provider as APIProvider]?.[configType] || []
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

function decryptConfig(config: APIConfig): APIConfig {
  if (config.apiKey && isEncryptedApiKey(config.apiKey)) {
    return { ...config, apiKey: decryptApiKey(config.apiKey) }
  }
  return config
}

function encryptConfig(config: APIConfig): APIConfig {
  if (config.apiKey && !isEncryptedApiKey(config.apiKey)) {
    return { ...config, apiKey: encryptApiKey(config.apiKey) }
  }
  return config
}

export interface ProviderStatusResult {
  configName: string
  provider: string
  baseURL: string
  latency: number
  status: 'success' | 'fail' | 'timeout'
  error?: string
}

class APIConfigService {
  async save(config: APIConfig): Promise<void> {
    if (isRemovedLocalProvider(config.provider)) {
      throw new Error('本地或 Ollama 提供商已从大模型配置中移除')
    }
    await storageDriver.saveAPIConfig(normalizeModels(encryptConfig(config)))
  }

  async create(config: Omit<APIConfig, 'id'>): Promise<string> {
    const id = generateUUID()
    await this.save({ ...config, id, source: 'storage' })
    return id
  }

  async getConfig(id: string): Promise<APIConfig | null> {
    const config = await storageDriver.getAPIConfig(id)
    if (!config || isRemovedLocalProvider(config.provider)) {
      return null
    }
    return decryptConfig(normalizeModels(config))
  }

  async getAll(): Promise<APIConfig[]> {
    return (await storageDriver.getAllAPIConfigs())
      .filter(config => !isRemovedLocalProvider(config.provider))
      .map(c => decryptConfig(normalizeModels(c)))
  }

  async getDefaultConfig(configType: APIConfigType = 'text'): Promise<APIConfig | null> {
    const configs = await this.getAll()
    const filtered = configs.filter(config => (config.configType || 'text') === configType)
    const storageConfigs = filtered.filter(config => config.source !== 'env')
    return storageConfigs.find(config => config.isDefault)
      || storageConfigs[0]
      || filtered.find(config => config.isDefault)
      || filtered[0]
      || (configType === 'text' ? getEnvTextConfig() : null)
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
      if (!testReq.url) {
        const result = adapter.parseTestResponse(200, null)
        if (result.success) return { ...result, model: config.model || result.model }
      }
      lastError = error as Error
    }

    if ((config.configType || 'text') === 'text' && adapter.capabilities.chat && config.model?.trim()) {
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
    return (await this.getAll()).length > 0 || !!getEnvTextConfig()
  }

  async fetchModels(baseURL: string | undefined, apiKey: string, configType: APIConfigType, provider?: string): Promise<string[]> {
    const adapter = getAdapterOrDefault(provider)
    const presetModels = getPresetModels(provider, configType)
    if (!adapter.capabilities.modelListing) return presetModels

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

      if (!response.ok) return presetModels
      const all = adapter.parseModelsResponse(response.data)
      return Array.from(new Set([...filterModelsByType(all, configType), ...presetModels]))
    } catch {
      return presetModels
    }
  }

  /** 查询单个配置的余额 */
  async queryBalance(config: APIConfig): Promise<BalanceInfo> {
    const adapter = getAdapterOrDefault(config.provider)

    // 如果 adapter 实现了 queryBalance，优先使用
    if (adapter.queryBalance) {
      try {
        const result = await adapter.queryBalance(config)
        return { ...result, configName: config.name }
      } catch (e) {
        return {
          provider: config.provider,
          configName: config.name,
          status: 'error',
          message: (e as Error).message || '余额查询失败',
        }
      }
    }

    // OpenAI 兼容格式尝试通用余额接口
    if (config.provider === 'openai' || config.provider === 'openai-compatible') {
      return this.queryOpenAIBalance(config)
    }

    return {
      provider: config.provider,
      configName: config.name,
      status: 'unsupported',
      message: '该服务商暂不支持余额查询',
    }
  }

  /** 批量连通性检测 */
  async checkProviderStatus(configs: APIConfig[]): Promise<ProviderStatusResult[]> {
    const results: ProviderStatusResult[] = []

    for (const config of configs) {
      const baseURL = (config.baseURL || '').trim()
      if (!baseURL) {
        results.push({
          configName: config.name,
          provider: config.provider,
          baseURL: '',
          latency: 0,
          status: 'fail',
          error: 'Base URL 为空',
        })
        continue
      }

      const start = performance.now()
      let status: ProviderStatusResult['status'] = 'fail'
      let error: string | undefined

      try {
        const url = baseURL.replace(/\/$/, '')
        const response = await runtimeRequest<unknown>({
          url,
          method: 'HEAD',
          headers: {},
          responseType: 'text',
          connectTimeout: 10_000,
          readTimeout: 10_000,
        })

        if (response.ok || response.status < 500) {
          status = 'success'
        } else {
          status = 'fail'
          error = `HTTP ${response.status}`
        }
      } catch (e) {
        const msg = (e as Error).message || ''
        if (/timeout|timed out/i.test(msg)) {
          status = 'timeout'
        }
        error = msg
      }

      const latency = Math.round(performance.now() - start)
      results.push({
        configName: config.name,
        provider: config.provider,
        baseURL,
        latency,
        status,
        error,
      })
    }

    return results
  }

  private async queryOpenAIBalance(config: APIConfig): Promise<BalanceInfo> {
    const baseURL = (config.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
    const url = `${baseURL}/dashboard/billing/subscription`

    try {
      const response = await runtimeRequest<Record<string, unknown>>({
        url,
        method: 'GET',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        responseType: 'json',
        connectTimeout: 10_000,
        readTimeout: 10_000,
      })

      if (!response.ok) {
        // 尝试 credit_grants 接口
        return this.queryOpenAICreditGrants(config)
      }

      const data = response.data
      const hardLimit = data.hard_limit_usd as number | undefined
      const totalUsed = data.total_usage as number | undefined
      const systemHardLimit = (data as Record<string, unknown>).system_hard_limit_usd as number | undefined

      return {
        provider: config.provider,
        configName: config.name,
        status: 'success',
        total: hardLimit ?? systemHardLimit,
        used: totalUsed ? totalUsed / 100 : undefined,
        balance: hardLimit !== undefined && totalUsed !== undefined
          ? hardLimit - totalUsed / 100
          : undefined,
        currency: 'USD',
      }
    } catch (e) {
      return this.queryOpenAICreditGrants(config)
    }
  }

  private async queryOpenAICreditGrants(config: APIConfig): Promise<BalanceInfo> {
    const baseURL = (config.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')
    const url = `${baseURL}/dashboard/billing/credit_grants`

    try {
      const response = await runtimeRequest<Record<string, unknown>>({
        url,
        method: 'GET',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        responseType: 'json',
        connectTimeout: 10_000,
        readTimeout: 10_000,
      })

      if (!response.ok) {
        return {
          provider: config.provider,
          configName: config.name,
          status: 'unsupported',
          message: '该服务商暂不支持余额查询',
        }
      }

      const data = response.data
      const grants = (data.grants as Record<string, unknown>) || {}
      const totalAvailable = grants.total_available as number | undefined
      const totalUsed = grants.total_used as number | undefined

      return {
        provider: config.provider,
        configName: config.name,
        status: 'success',
        balance: totalAvailable,
        used: totalUsed,
        currency: 'USD',
      }
    } catch {
      return {
        provider: config.provider,
        configName: config.name,
        status: 'unsupported',
        message: '该服务商暂不支持余额查询',
      }
    }
  }
}

export const apiConfigService = new APIConfigService()
export { APIConfigService }
