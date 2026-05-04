import type { APIConfig, TestResult } from '@/types/api-config'
import type { ProviderAdapter, ProviderCapabilities } from '../types'

const localCapabilities: ProviderCapabilities = {
  chat: false,
  chatStream: false,
  tts: true,
  stt: true,
  imageGeneration: false,
  videoGeneration: false,
  modelListing: false,
}

// sherpa-ncnn 软件内置（仅 STT），TTS 仍走系统 TTS
const localBuiltinCapabilities: ProviderCapabilities = {
  chat: false,
  chatStream: false,
  tts: false,
  stt: true,
  imageGeneration: false,
  videoGeneration: false,
  modelListing: false,
}

// 谷歌服务安卓内置 GMS SpeechRecognizer（仅 STT）
const localGmsCapabilities: ProviderCapabilities = {
  chat: false,
  chatStream: false,
  tts: false,
  stt: true,
  imageGeneration: false,
  videoGeneration: false,
  modelListing: false,
}

const baseLocalAdapter: Omit<ProviderAdapter, 'providerId' | 'capabilities'> = {
  buildAuthHeaders(): Record<string, string> {
    return {}
  },

  resolveEndpoint(): string {
    throw new Error('本地提供者不支持远程接口')
  },

  buildChatBody(): Record<string, unknown> {
    throw new Error('本地提供者不支持聊天补全')
  },

  parseChatResponse(): never {
    throw new Error('本地提供者不支持聊天补全')
  },

  parseStreamChunk(): null {
    return null
  },

  buildTTSBody(): Record<string, unknown> {
    return { input: '' }
  },

  buildSTTFormData(): FormData {
    return new FormData()
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildTestRequest(_config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    return { url: '', method: 'GET', headers: {} }
  },

  parseTestResponse(): TestResult {
    return { success: true, message: '本地语音已就绪' }
  },

  parseErrorPayload(): string {
    return '本地语音错误'
  },
}

export const localAdapter: ProviderAdapter = {
  ...baseLocalAdapter,
  providerId: 'local',
  capabilities: localCapabilities,
}

export const localBuiltinAdapter: ProviderAdapter = {
  ...baseLocalAdapter,
  providerId: 'local-builtin',
  capabilities: localBuiltinCapabilities,
  parseTestResponse(): TestResult {
    return { success: true, message: '软件内置语音引擎已就绪 (sherpa-ncnn)' }
  },
}

export const localGmsAdapter: ProviderAdapter = {
  ...baseLocalAdapter,
  providerId: 'local-gms',
  capabilities: localGmsCapabilities,
  parseTestResponse(): TestResult {
    return { success: true, message: '谷歌服务安卓内置语音引擎已就绪 (GMS)' }
  },
}
