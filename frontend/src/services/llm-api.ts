import type { APIConfig, TestResult } from '@/types/api-config'
import type { ChatChunk, ChatContentPart, ChatContext, ChatMessage, TokenUsage } from '@/types/chat'
import { APIError, NetworkError } from './errors'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'
import type { ProviderAdapter } from './providers/types'
import { openNativeChatStream } from './native-chat-stream'
import { isNativeRuntime, runtimeRequest } from './runtime-http'

export interface AbortableChatStream {
  stream: AsyncGenerator<ChatChunk, void, unknown>
  abort: () => void
  signal: AbortSignal
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
    reader.onerror = () => reject(new NetworkError('图片转换失败'))
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
  if (!source) throw new NetworkError('图片地址为空，无法发送')
  if (/^data:/i.test(source) || /^https?:\/\//i.test(source)) return source

  try {
    const response = await fetch(source)
    if (response.ok) return blobToDataURL(await response.blob())
  } catch {
    // fall through to native
  }
  return readNativeFileAsDataURL(source)
}

export class LLMAPIService {
  private config?: APIConfig
  private adapter: ProviderAdapter

  constructor(config?: APIConfig) {
    this.config = config ? { ...config } : undefined
    this.adapter = getAdapterOrDefault(config?.provider)
  }

  private requireConfig(): APIConfig {
    if (!this.config) throw new Error('请先在设置中配置 API 提供商')
    return this.config
  }

  private async serializeContent(content: string | ChatContentPart[]): Promise<string | ChatContentPart[]> {
    if (typeof content === 'string') return content
    return Promise.all(
      content.map(async part => {
        if (part.type !== 'image_url') return part
        return { ...part, image_url: { url: await resolveImageURL(part.image_url?.url || '') } }
      })
    )
  }

  private async buildMessages(context: ChatContext): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = []
    if (context.systemPrompt.trim()) {
      messages.push({ role: 'system', content: context.systemPrompt.trim() })
    }
    for (const message of context.messages) {
      messages.push({ role: message.role, content: await this.serializeContent(message.content) })
    }
    if (context.postHistoryPrompt?.trim()) {
      messages.push({ role: 'system', content: context.postHistoryPrompt.trim() })
    }
    return messages
  }

  private async buildChatRequest(
    context: ChatContext,
    stream: boolean
  ): Promise<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> {
    const config = this.requireConfig()
    const adapter = this.adapter

    return {
      url: adapter.resolveEndpoint(config.baseURL, 'chat'),
      headers: {
        ...adapter.buildAuthHeaders(requireAPIKey(config)),
        'Content-Type': 'application/json',
        ...(stream ? { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' } : {}),
      },
      body: adapter.buildChatBody({
        model: config.model || '',
        messages: await this.buildMessages(context),
        systemPrompt: context.systemPrompt.trim(),
        stream,
      }),
    }
  }

  private parseStreamBuffer(rawBuffer: string, isFirstChunk: boolean): {
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
      const result = this.adapter.parseStreamChunk(rawLine)
      if (!result) continue
      if (result.done && !result.content) { done = true; break }

      if (result.content) {
        chunks.push({
          content: result.content,
          isFirst,
          finishReason: result.finishReason || undefined,
          usage: result.usage,
        })
        isFirst = false
      }
      if (result.finishReason) { done = true; break }
    }

    return { chunks, buffer, done, isFirstChunk: isFirst }
  }

  private async requestChatStream(context: ChatContext, signal?: AbortSignal): Promise<Response> {
    const request = await this.buildChatRequest(context, true)
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal,
      })
      if (!response.ok) throw new APIError(response.status, await (await import('./provider-http')).parseProviderError(response))
      return response
    } catch (error) {
      if (error instanceof APIError) throw error
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error
      throw new NetworkError((error as Error).message || 'Network request failed.')
    }
  }

  private async requestChatPayload(context: ChatContext, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const request = await this.buildChatRequest(context, false)
    try {
      const response = await runtimeRequest<Record<string, unknown>>({
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
        const { parseProviderErrorPayload } = await import('./provider-http')
        throw new APIError(response.status, parseProviderErrorPayload(response.data, response.status))
      }
      return response.data
    } catch (error) {
      if (error instanceof APIError) throw error
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error
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
      if (timeoutId !== undefined) clearTimeout(timeoutId)
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

    const service = this

    const stream = (async function* (): AsyncGenerator<ChatChunk, void, unknown> {
      if (isNativeRuntime()) {
        const request = await service['buildChatRequest'](context, true)
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
            const parsed = service['parseStreamBuffer'](buffer, isFirstChunk)
            buffer = parsed.buffer
            isFirstChunk = parsed.isFirstChunk
            for (const chunk of parsed.chunks) { yieldedChunk = true; yield chunk }
            if (parsed.done) return
          }

          if (controller.signal.aborted && abortReason === 'manual') return

          if (!yieldedChunk) {
            const payload = service.adapter.parseChatResponse(JSON.parse(rawResponse))
            if (payload.content) {
              yield { content: payload.content, isFirst: true, usage: payload.usage }
              return
            }
            throw new NetworkError('Provider did not return a readable streaming response.')
          }
        } catch (error) {
          if (controller.signal.aborted && abortReason === 'manual') return
          if (error instanceof APIError || error instanceof NetworkError) throw error
          if (error instanceof DOMException && error.name === 'AbortError') return
          throw new NetworkError((error as Error).message || 'Streaming request failed.')
        } finally {
          await nativeStream.abort().catch(() => undefined)
        }
        return
      }

      const response = await service['requestChatStream'](context, controller.signal)
      if (!response.body) throw new APIError(502, 'Provider returned an empty response body.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let isFirstChunk = true

      try {
        while (true) {
          const { done: readDone, value } = await service['readStreamChunk'](reader, () => {
            abortReason = 'timeout'
            controller.abort()
            void reader.cancel().catch(() => undefined)
          })
          if (readDone) break
          buffer += decoder.decode(value, { stream: true })
          const parsed = service['parseStreamBuffer'](buffer, isFirstChunk)
          buffer = parsed.buffer
          isFirstChunk = parsed.isFirstChunk
          for (const chunk of parsed.chunks) yield chunk
          if (parsed.done) return
        }
      } catch (error) {
        if (controller.signal.aborted && abortReason === 'manual') return
        if (controller.signal.aborted && abortReason === 'timeout') throw new NetworkError('Streaming request timed out.')
        if (error instanceof APIError || error instanceof NetworkError) throw error
        throw new NetworkError((error as Error).message || 'Streaming request failed.')
      } finally {
        void reader.cancel().catch(() => undefined)
      }
    })()

    return { stream, abort, signal: controller.signal }
  }

  async *chatStream(context: ChatContext): AsyncGenerator<ChatChunk, void, unknown> {
    const abortable = this.chatStreamAbortable(context)
    for await (const chunk of abortable.stream) yield chunk
  }

  async chat(context: ChatContext): Promise<string> {
    const data = await this.requestChatPayload(context)
    const result = this.adapter.parseChatResponse(data)
    return result.content
  }

  async testConnection(): Promise<TestResult> {
    try {
      const config = this.requireConfig()
      const adapter = this.adapter
      const testReq = adapter.buildTestRequest(config)

      const response = await runtimeRequest<unknown>({
        url: testReq.url,
        method: testReq.method,
        headers: testReq.headers,
        body: testReq.body,
        responseType: 'json',
      })

      return adapter.parseTestResponse(response.status, response.data)
    } catch (error) {
      return { success: false, message: (error as Error).message || '连接失败', model: this.config?.model || undefined }
    }
  }

  updateConfig(config: APIConfig): void {
    this.config = { ...config }
    this.adapter = getAdapterOrDefault(config.provider)
  }

  getConfig(): APIConfig | undefined {
    return this.config ? { ...this.config } : undefined
  }
}

export function createLLMAPI(config?: APIConfig): LLMAPIService {
  return new LLMAPIService(config)
}
