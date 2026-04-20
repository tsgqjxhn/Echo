import type {
  AdapterVideoRequest,
  AsyncTaskResult,
  ProviderAdapter,
} from '../types'
import { openaiAdapter, openaiCapabilities } from '../openai'
import { pollGeminiVideoTask, submitGeminiVideoTask } from './async-task'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const geminiAdapter: ProviderAdapter = {
  ...openaiAdapter,
  providerId: 'gemini',

  capabilities: {
    ...openaiCapabilities,
    videoGeneration: true,
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    if (service === 'video') {
      return `${resolveBaseURL(baseURL)}/videos/generations`
    }
    return openaiAdapter.resolveEndpoint(baseURL, service)
  },

  buildVideoBody(request: AdapterVideoRequest): Record<string, unknown> {
    return {
      model: request.model,
      prompt: request.prompt,
    }
  },

  async submitAsyncTask(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult> {
    return submitGeminiVideoTask(resolveBaseURL(baseURL), apiKey, body)
  },

  async pollAsyncTask(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult> {
    return pollGeminiVideoTask(resolveBaseURL(baseURL), apiKey, taskId)
  },
}
