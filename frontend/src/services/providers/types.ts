import type { APIConfig, APIProvider } from '@/types/api-config'
import type { ChatMessage, TokenUsage } from '@/types/chat'
import type { TestResult } from '@/types/api-config'

export interface ProviderCapabilities {
  chat: boolean
  chatStream: boolean
  tts: boolean
  stt: boolean
  imageGeneration: boolean
  videoGeneration: boolean
  modelListing: boolean
}

export interface ChatCompletionResult {
  content: string
  usage?: TokenUsage
  model?: string
  finishReason?: string
}

export interface AdapterChatRequest {
  model: string
  messages: ChatMessage[]
  systemPrompt: string
  stream: boolean
}

export interface AdapterTTSRequest {
  model: string
  voice: string
  input: string
}

export interface AdapterSTTRequest {
  model: string
  language?: string
  file: Blob
  filename: string
}

export interface AdapterImageRequest {
  model: string
  prompt: string
  size?: string
  n?: number
}

export interface AdapterVideoRequest {
  model: string
  prompt: string
}

export interface AsyncTaskResult {
  taskId: string
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  resultUrls: string[]
  error?: string
}

export interface StreamChunkResult {
  content: string
  finishReason?: string
  usage?: TokenUsage
  done: boolean
}

export interface ProviderAdapter {
  readonly providerId: APIProvider
  readonly capabilities: ProviderCapabilities

  buildAuthHeaders(apiKey: string): Record<string, string>

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string

  buildChatBody(request: AdapterChatRequest): Record<string, unknown>
  parseChatResponse(raw: unknown): ChatCompletionResult
  parseStreamChunk(line: string): StreamChunkResult | null

  buildTTSBody(request: AdapterTTSRequest): Record<string, unknown>
  buildSTTFormData(request: AdapterSTTRequest): FormData

  parseModelsResponse(raw: unknown): string[]

  buildImageBody?(request: AdapterImageRequest): Record<string, unknown>
  parseImageResponse?(raw: unknown): string[]

  buildVideoBody?(request: AdapterVideoRequest): Record<string, unknown>
  submitAsyncTask?(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult>
  pollAsyncTask?(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult>

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string }
  parseTestResponse(status: number, data: unknown): TestResult

  parseErrorPayload(payload: unknown, status: number): string
}
