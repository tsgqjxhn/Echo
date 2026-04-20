import type { APIConfig, TestResult } from '@/types/api-config'
import type { ChatChunk, ChatContentPart, ChatContext, ChatMessage, TokenUsage } from '@/types/chat'
import { APIError, NetworkError } from './errors'
import {
  buildProviderAuthHeaders,
  buildProviderURL,
  parseProviderError,
  parseProviderErrorPayload,
  requireAPIKey,
  resolveProviderModel,
} from './provider-http'
import { openNativeChatStream } from './native-chat-stream'
import { isNativeRuntime, runtimeRequest } from './runtime-http'

export interface AbortableChatStream {
  stream: AsyncGenerator<ChatChunk, void, unknown>
  abort: () => void
  signal: AbortSignal
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    delta?: {
      content?: string
    }
    finish_reason?: string | null
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  usage?: unknown
}

const WEB_STREAM_CHUNK_TIMEOUT_MS = 60_000
const NATIVE_CONNECT_TIMEOUT_MS = 30_000
const NATIVE_CHAT_READ_TIMEOUT_MS = 300_000

function getRuntimeUni(): any {
  return (globalThis as any).uni
}

function inferImageMimeType(path: string): string {
  const cleanPath = path.split('?')[0].toLowerCase()

  if (cleanPath.endsWith('.png')) return 'image/png'
  if (cleanPath.endsWith('.webp')) return 'image/webp'
  if (cleanPath.endsWith('.gif')) return 'image/gif'
  if (cleanPath.endsWith('.bmp')) return 'image/bmp'
  return 'image/jpeg'
}

function normalizeUsage(usage: any): TokenUsage | undefined {
  if (!usage || typeof usage !== 'object') {
    return undefined
  }

  const promptTokens = Number(usage.prompt_tokens ?? usage.promptTokens)
  const completionTokens = Number(usage.completion_tokens ?? usage.completionTokens)
  const totalTokens = Number(usage.total_tokens ?? usage.totalTokens)

  if (![promptTokens, completionTokens, totalTokens].some(Number.isFinite)) {
    return undefined
  }

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  }
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map(part => (part && typeof part === 'object' && typeof (part as any).text === 'string' ? (part as any).text : ''))
      .join('')
  }

  return ''
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new NetworkError('图片转换失败'))
    }

    reader.onerror = () => {
      reject(new NetworkError('图片转换失败'))
    }

    reader.readAsDataURL(blob)
  })
}

function readNativeFileAsDataURL(path: string): Promise<string> {
  const runtimeUni = getRuntimeUni()
  const fs = runtimeUni?.getFileSystemManager?.()

  if (!fs?.readFile) {
    return Promise.reject(new NetworkError('当前环境无法读取本地图片，请改用远程图片地址'))
  }

  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (result: { data?: string }) => {
        const base64 = typeof result?.data === 'string' ? result.data : ''
        if (!base64) {
          reject(new NetworkError('读取本地图片失败'))
          return
        }

        resolve(`data:${inferImageMimeType(path)};base64,${base64}`)
      },
      fail: (error: { errMsg?: string }) => {
        reject(new NetworkError(error?.errMsg || '读取本地图片失败'))
      },
    })
  })
}

async function resolveImageURL(url: string): Promise<string> {
  const source = url.trim()
  if (!source) {
    throw new NetworkError('图片地址为空，无法发送')
  }

  if (/^data:/i.test(source) || /^https?:\/\//i.test(source)) {
    return source
  }

  try {
    const response = await fetch(source)
    if (response.ok) {
      return blobToDataURL(await response.blob())
    }
  } catch {
    // Fall through to native file access.
  }

  return readNativeFileAsDataURL(source)
}

export class LLMAPIService {
  private config?: APIConfig

  constructor(config?: APIConfig) {
    this.config = config ? { ...config } : undefined
  }

  private requireConfig(): APIConfig {
    if (!this.config) {
      throw new Error('请先在设置中配置 API 提供商')
    }

    return this.config
  }

  private async serializeContent(content: string | ChatContentPart[]): Promise<string | ChatContentPart[]> {
    if (typeof content === 'string') {
      return content
    }

    return Promise.all(
      content.map(async part => {
        if (part.type !== 'image_url') {
          return part
        }

        const originalURL = part.image_url?.url || ''
        return {
          ...part,
          image_url: {
            url: await resolveImageURL(originalURL),
          },
        }
      })
    )
  }

  private async buildMessages(context: ChatContext): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = []

    if (context.systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: context.systemPrompt.trim(),
      })
    }

    for (const message of context.messages) {
      messages.push({
        role: message.role,
        content: await this.serializeContent(message.content),
      })
    }

    return messages
  }

  private async buildChatRequest(
    context: ChatContext,
    stream: boolean
  ): Promise<{
    url: string
    headers: Record<string, string>
    body: {
      model: string
      messages: ChatMessage[]
      stream: boolean
    }
  }> {
    const config = this.requireConfig()

    return {
      url: buildProviderURL(config.baseURL, '/chat/completions'),
      headers: {
        ...buildProviderAuthHeaders(requireAPIKey(config)),
        'Content-Type': 'application/json',
        ...(stream
          ? {
              Accept: 'text/event-stream',
              'Cache-Control': 'no-cache',
            }
          : {}),
      },
      body: {
        model: resolveProviderModel(config),
        messages: await this.buildMessages(context),
        stream,
      },
    }
  }

  private parseChatPayload(rawText: string): OpenAIChatCompletionResponse | undefined {
    const trimmed = rawText.trim()
    if (!trimmed) {
      return undefined
    }

    try {
      return JSON.parse(trimmed) as OpenAIChatCompletionResponse
    } catch {
      return undefined
    }
  }

  private async requestChatStream(
    context: ChatContext,
    signal?: AbortSignal
  ): Promise<Response> {
    const request = await this.buildChatRequest(context, true)

    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal,
      })

      if (!response.ok) {
        throw new APIError(response.status, await parseProviderError(response))
      }

      return response
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error
      }

      throw new NetworkError((error as Error).message || 'Network request failed.')
    }
  }

  private async requestChatPayload(
    context: ChatContext,
    signal?: AbortSignal
  ): Promise<OpenAIChatCompletionResponse> {
    const request = await this.buildChatRequest(context, false)

    try {
      const response = await runtimeRequest<OpenAIChatCompletionResponse>({
        url: request.url,
        method: 'POST',
        headers: request.headers,
        body: request.body,
        responseType: 'json',
        signal,
        connectTimeout: NATIVE_CONNECT_TIMEOUT_MS,
        readTimeout: NATIVE_CHAT_READ_TIMEOUT_MS,
      })

      if (!response.ok) {
        throw new APIError(response.status, parseProviderErrorPayload(response.data, response.status))
      }

      return response.data
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error
      }

      throw new NetworkError((error as Error).message || 'Network request failed.')
    }
  }

  private async readStreamChunk(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onTimeout: () => void
  ): Promise<ReadableStreamReadResult<Uint8Array>> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      return await Promise.race([
        reader.read(),
        new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
          timeoutId = setTimeout(() => {
            onTimeout()
            reject(new NetworkError('Streaming request timed out after 60 seconds.'))
          }, WEB_STREAM_CHUNK_TIMEOUT_MS)
        }),
      ])
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }

  private processStreamBuffer(
    rawBuffer: string,
    isFirstChunk: boolean
  ): {
    chunks: ChatChunk[]
    buffer: string
    done: boolean
    isFirstChunk: boolean
  } {
    const lines = rawBuffer.split('\n')
    const buffer = lines.pop() || ''
    const chunks: ChatChunk[] = []
    let done = false
    let isFirst = isFirstChunk

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || !line.startsWith('data: ')) {
        continue
      }

      if (line === 'data: [DONE]') {
        done = true
        break
      }

      try {
        const data = JSON.parse(line.slice(6))
        const choice = data.choices?.[0]
        const content = choice?.delta?.content || ''
        const finishReason = choice?.finish_reason

        if (content) {
          chunks.push({
            content,
            isFirst,
            finishReason: finishReason || undefined,
            usage: normalizeUsage(data.usage),
          })
          isFirst = false
        }

        if (finishReason) {
          done = true
          break
        }
      } catch (error) {
        console.warn('Failed to parse stream chunk:', error)
      }
    }

    return {
      chunks,
      buffer,
      done,
      isFirstChunk: isFirst,
    }
  }

  chatStreamAbortable(context: ChatContext): AbortableChatStream {
    const controller = new AbortController()
    let abortReason = 'manual'

    const abort = () => {
      if (!controller.signal.aborted) {
        abortReason = 'manual'
        controller.abort()
      }
    }

    const stream = (async function* (service: LLMAPIService): AsyncGenerator<ChatChunk, void, unknown> {
      if (isNativeRuntime()) {
        const request = await service.buildChatRequest(context, true)
        const nativeStream = await openNativeChatStream({
          url: request.url,
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify(request.body),
          signal: controller.signal,
          connectTimeout: NATIVE_CONNECT_TIMEOUT_MS,
          readTimeout: NATIVE_CHAT_READ_TIMEOUT_MS,
        })
        let buffer = ''
        let rawResponse = ''
        let isFirstChunk = true
        let yieldedChunk = false

        try {
          for await (const rawChunk of nativeStream.stream) {
            rawResponse += rawChunk
            buffer += rawChunk

            const parsed = service.processStreamBuffer(buffer, isFirstChunk)
            buffer = parsed.buffer
            isFirstChunk = parsed.isFirstChunk

            for (const chunk of parsed.chunks) {
              yieldedChunk = true
              yield chunk
            }

            if (parsed.done) {
              return
            }
          }

          if (controller.signal.aborted && abortReason === 'manual') {
            return
          }

          if (!yieldedChunk) {
            const payload = service.parseChatPayload(rawResponse)
            const content = extractMessageText(payload?.choices?.[0]?.message?.content)

            if (content) {
              yield {
                content,
                isFirst: true,
                usage: normalizeUsage(payload?.usage),
              }
              return
            }

            throw new NetworkError('Provider did not return a readable streaming response.')
          }
        } catch (error) {
          if (controller.signal.aborted && abortReason === 'manual') {
            return
          }

          if (error instanceof APIError || error instanceof NetworkError) {
            throw error
          }

          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }

          throw new NetworkError((error as Error).message || 'Streaming request failed.')
        } finally {
          await nativeStream.abort().catch(() => undefined)
        }

        return
      }

      const response = await service.requestChatStream(context, controller.signal)

      if (!response.body) {
        throw new APIError(502, 'Provider returned an empty response body.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let isFirstChunk = true

      try {
        while (true) {
          const { done, value } = await service.readStreamChunk(reader, () => {
            abortReason = 'timeout'
            controller.abort()
            void reader.cancel().catch(() => undefined)
          })

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const parsed = service.processStreamBuffer(buffer, isFirstChunk)
          buffer = parsed.buffer
          isFirstChunk = parsed.isFirstChunk

          for (const chunk of parsed.chunks) {
            yield chunk
          }

          if (parsed.done) {
            return
          }
        }
      } catch (error) {
        if (controller.signal.aborted && abortReason === 'manual') {
          return
        }

        if (controller.signal.aborted && abortReason === 'timeout') {
          throw new NetworkError('Streaming request timed out after 60 seconds.')
        }

        if (error instanceof APIError || error instanceof NetworkError) {
          throw error
        }

        throw new NetworkError((error as Error).message || 'Streaming request failed.')
      } finally {
        void reader.cancel().catch(() => undefined)
      }
    })(this)

    return {
      stream,
      abort,
      signal: controller.signal,
    }
  }

  async *chatStream(context: ChatContext): AsyncGenerator<ChatChunk, void, unknown> {
    const abortable = this.chatStreamAbortable(context)

    for await (const chunk of abortable.stream) {
      yield chunk
    }
  }

  async chat(context: ChatContext): Promise<string> {
    const data = await this.requestChatPayload(context)
    return extractMessageText(data.choices?.[0]?.message?.content)
  }

  async testConnection(): Promise<TestResult> {
    try {
      const config = this.requireConfig()
      const response = await runtimeRequest<Record<string, unknown>>({
        url: buildProviderURL(config.baseURL, '/models'),
        method: 'GET',
        headers: buildProviderAuthHeaders(requireAPIKey(config)),
        responseType: 'json',
      })

      if (!response.ok && ![404, 405, 501].includes(response.status)) {
        throw new Error(parseProviderErrorPayload(response.data, response.status))
      }

      return {
        success: true,
        message: response.ok ? '连接成功' : '连接成功，模型列表接口未开放',
        model: resolveProviderModel(config),
      }
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || '连接失败',
        model: this.config?.model || undefined,
      }
    }
  }

  updateConfig(config: APIConfig): void {
    this.config = { ...config }
  }

  getConfig(): APIConfig | undefined {
    return this.config ? { ...this.config } : undefined
  }
}

export function createLLMAPI(config?: APIConfig): LLMAPIService {
  return new LLMAPIService(config)
}
