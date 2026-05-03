import type { APIConfig, TestResult } from '@/types/api-config'
import type {
  AdapterChatRequest,
  AdapterImageRequest,
  AdapterSTTRequest,
  AdapterTTSRequest,
  AdapterVideoRequest,
  AsyncTaskResult,
  ChatCompletionResult,
  ProviderAdapter,
  ProviderCapabilities,
  StreamChunkResult,
} from '../types'
import { extractMessageText, normalizeUsage, parseOpenAIStreamLine } from '../openai/stream-parser'

const DEFAULT_BASE_URL = 'https://bedrock-runtime.us-east-1.amazonaws.com'

function resolveBaseURL(baseURL?: string): string {
  return (baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export const bedrockCapabilities: ProviderCapabilities = {
  chat: true,
  chatStream: true,
  tts: true,
  stt: true,
  imageGeneration: true,
  videoGeneration: true,
  modelListing: false,
}

export const bedrockAdapter: ProviderAdapter = {
  providerId: 'bedrock',
  capabilities: bedrockCapabilities,

  buildAuthHeaders(apiKey: string): Record<string, string> {
    // AWS uses Signature V4; users typically pass via proxy or custom header.
    // For basic Bearer fallback when using a gateway/proxy:
    return { Authorization: `Bearer ${apiKey}` }
  },

  resolveEndpoint(baseURL: string | undefined, service: 'chat' | 'tts' | 'stt' | 'image' | 'video' | 'models'): string {
    const base = resolveBaseURL(baseURL)
    switch (service) {
      case 'chat': return `${base}/model/converse`
      case 'image': return `${base}/model/amazon.titan-image-generator-v2:0/invoke`
      case 'video': return `${base}/async-invoke`
      case 'tts': return base.replace('bedrock-runtime', 'polly')
      case 'stt': return base.replace('bedrock-runtime', 'transcribe')
      case 'models': throw new Error('AWS Bedrock does not support model listing via this adapter')
    }
  },

  buildChatBody(request: AdapterChatRequest): Record<string, unknown> {
    const messages = request.messages.map(m => ({
      role: m.role,
      content: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }))
    const system = request.systemPrompt.trim() ? [{ text: request.systemPrompt.trim() }] : undefined
    const body: Record<string, unknown> = { modelId: request.model, messages }
    if (system) body.system = system
    if (request.stream) body.inferenceConfig = { maxTokens: 1024 }
    return body
  },

  parseChatResponse(raw: unknown): ChatCompletionResult {
    const data = raw as Record<string, unknown>
    const output = data.output as Record<string, unknown> | undefined
    const message = output?.message as Record<string, unknown> | undefined
    const contentArr = message?.content as Array<Record<string, unknown>> | undefined
    const text = contentArr?.map(c => String(c.text || '')).join('') || ''
    const usage = data.usage as Record<string, unknown> | undefined
    return {
      content: text,
      usage: {
        promptTokens: Number(usage?.inputTokens ?? 0),
        completionTokens: Number(usage?.outputTokens ?? 0),
        totalTokens: Number(usage?.totalTokens ?? 0),
      },
      finishReason: String(output?.stopReason || ''),
      model: (data.modelId as string) || undefined,
    }
  },

  parseStreamChunk(line: string): StreamChunkResult | null {
    return parseOpenAIStreamLine(line)
  },

  buildTTSBody(_request: AdapterTTSRequest): Record<string, unknown> {
    throw new Error('AWS Polly TTS requires Signature V4 and is not supported by this generic adapter. Please use a proxy or custom integration.')
  },

  buildSTTFormData(_request: AdapterSTTRequest): FormData {
    throw new Error('AWS Transcribe STT requires Signature V4 and is not supported by this generic adapter. Please use a proxy or custom integration.')
  },

  parseModelsResponse(): string[] {
    return []
  },

  buildImageBody(request: AdapterImageRequest): Record<string, unknown> {
    return {
      modelId: request.model || 'amazon.titan-image-generator-v2:0',
      body: JSON.stringify({
        textToImageParams: { text: request.prompt },
        imageGenerationConfig: { numberOfImages: request.n || 1 },
      }),
      contentType: 'application/json',
      accept: 'application/json',
    }
  },

  parseImageResponse(raw: unknown): string[] {
    const data = raw as Record<string, unknown>
    const images = data.images as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(images)) return []
    return images.map(img => String(img.base64 || '')).filter(Boolean)
  },

  buildVideoBody(request: AdapterVideoRequest): Record<string, unknown> {
    return {
      modelId: 'amazon.nova-reel-v1:0',
      modelInput: {
        taskType: 'TEXT_VIDEO',
        textToVideoParams: { text: request.prompt },
        videoGenerationConfig: {
          durationSeconds: 6,
          fps: 24,
          dimension: '1280x720',
          seed: 0,
        },
      },
      outputDataConfig: {
        s3OutputDataConfig: { s3Uri: 's3://my-bucket' },
      },
    }
  },

  async submitAsyncTask(baseURL: string | undefined, apiKey: string, body: Record<string, unknown>): Promise<AsyncTaskResult> {
    const url = this.resolveEndpoint(baseURL, 'video')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.buildAuthHeaders(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(this.parseErrorPayload(errorData, response.status))
    }
    const data = await response.json()
    const taskId = String(data.invocationArn || data.jobId || '')
    return { taskId, status: 'pending', resultUrls: [] }
  },

  async pollAsyncTask(baseURL: string | undefined, apiKey: string, taskId: string): Promise<AsyncTaskResult> {
    const url = `${resolveBaseURL(baseURL)}/async-invoke/${taskId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildAuthHeaders(apiKey),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(this.parseErrorPayload(errorData, response.status))
    }
    const data = await response.json()
    const status = String(data.status || 'InProgress')
    const resultUrls: string[] = []
    if (status === 'Completed' && data.outputDataConfig?.s3OutputDataConfig?.s3Uri) {
      resultUrls.push(data.outputDataConfig.s3OutputDataConfig.s3Uri)
    }
    return {
      taskId,
      status: status === 'Completed' ? 'succeeded' : status === 'Failed' ? 'failed' : 'running',
      resultUrls,
      error: data.failureMessage || undefined,
    }
  },

  buildTestRequest(config: APIConfig): { url: string; headers: Record<string, string>; body?: unknown; method: string } {
    return {
      url: this.resolveEndpoint(config.baseURL, 'chat'),
      method: 'POST',
      headers: {
        ...this.buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: {
        modelId: config.model || 'amazon.nova-lite-v1:0',
        messages: [{ role: 'user', content: [{ text: 'ping' }] }],
      },
    }
  },

  parseTestResponse(status: number, data: unknown): TestResult {
    if (status >= 200 && status < 300) {
      const output = (data as Record<string, unknown>)?.output as Record<string, unknown> | undefined
      if (output) return { success: true, message: '连接成功' }
    }
    return { success: false, message: this.parseErrorPayload(data, status) }
  },

  parseErrorPayload(payload: unknown, status: number): string {
    if (typeof payload === 'string' && payload.trim()) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      const message = obj.message as string | undefined
      if (message?.trim()) return message
    }
    return `HTTP ${status}`
  },
}
