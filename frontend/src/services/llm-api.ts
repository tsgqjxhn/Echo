import type { APIConfig, TestResult } from '@/types/api-config'
import type { ChatChunk, ChatContentPart, ChatContext, ChatMessage } from '@/types/chat'
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

function isChatStreamEnabled(): boolean {
  try {
    const settingsRaw = localStorage.getItem('xiang_user_settings')
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw) as Record<string, unknown>
      const v2Raw = settings.echo_chat_defaults_v2
      const v2 = typeof v2Raw === 'string'
        ? JSON.parse(v2Raw) as { streamOutput?: boolean }
        : v2Raw as { streamOutput?: boolean } | undefined
      if (v2 && typeof v2.streamOutput === 'boolean') {
        return v2.streamOutput
      }
    }

    const raw = localStorage.getItem('echo_chat_defaults')
    if (!raw) return true
    const parsed = JSON.parse(raw) as { streamEnabled?: boolean }
    return parsed.streamEnabled !== false
  } catch {
    return true
  }
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
        temperature: context.temperature,
        maxTokens: context.maxTokens,
        topP: context.topP,
        topK: context.topK,
        presencePenalty: context.presencePenalty,
        frequencyPenalty: context.frequencyPenalty,
        repetitionPenalty: context.repetitionPenalty,
      }),
    }
  }

  private parseStreamBuffer(rawBuffer: string, isFirstChunk: boolean): {
    chunks: ChatChunk[]
    buffer: string
    done: boolean
    isFirstChunk: boolean
  } {
    const normalizedBuffer = rawBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const hasCompleteSSEEvent = /\n\n/.test(normalizedBuffer)
    const units = hasCompleteSSEEvent
      ? normalizedBuffer.split(/\n\n+/)
      : normalizedBuffer.split('\n')
    const buffer = units.pop() || ''
    const lines = hasCompleteSSEEvent
      ? units.flatMap(unit => unit.split('\n'))
      : units
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

  private async requestChatText(context: ChatContext, signal?: AbortSignal): Promise<string> {
    const data = await this.requestChatPayload(context, signal)
    const result = this.adapter.parseChatResponse(data)
    return result.content
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
      if (!isChatStreamEnabled() || !service.adapter.capabilities.chatStream) {
        const content = await service['requestChatText'](context, controller.signal)
        if (content) yield { content, isFirst: true }
        return
      }

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

          if (buffer.trim()) {
            const parsed = service['parseStreamBuffer'](`${buffer}\n`, isFirstChunk)
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
          if (readDone) {
            buffer += decoder.decode()
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const parsed = service['parseStreamBuffer'](buffer, isFirstChunk)
          buffer = parsed.buffer
          isFirstChunk = parsed.isFirstChunk
          for (const chunk of parsed.chunks) yield chunk
          if (parsed.done) return
        }

        if (buffer.trim()) {
          const parsed = service['parseStreamBuffer'](`${buffer}\n`, isFirstChunk)
          for (const chunk of parsed.chunks) yield chunk
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

  /**
   * 将单次聊天请求拆分为 N 个子问题并发处理，按顺序组合结果流式返回。
   *
   * 拆分策略（基于最后一条用户消息）：
   * 1. 优先按段落（\n\n）拆分
   * 2. 段落不足时按句子拆分
   * 3. 仍不足则不拆分，直接返回单请求
   *
   * 并发执行 N 个流式请求，按子问题索引顺序依次 yield 各子请求的结果。
   * 前面的子请求未 yield 完之前，后面的子请求结果缓冲等待。
   */
  chatStreamConcurrent(context: ChatContext, concurrentCount: number): AbortableChatStream {
    // 限制最大并发数为 3，避免过度消耗 API 额度和触发速率限制
    const clampedCount = Math.max(1, Math.min(3, concurrentCount))
    if (clampedCount <= 1) {
      return this.chatStreamAbortable(context)
    }

    const subContexts = this.splitContext(context, clampedCount)
    if (subContexts.length <= 1) {
      return this.chatStreamAbortable(context)
    }

    const masterController = new AbortController()
    const subControllers: AbortController[] = []
    const subStreams: AbortableChatStream[] = []

    for (const subCtx of subContexts) {
      const ctrl = new AbortController()
      subControllers.push(ctrl)
      subStreams.push(this.chatStreamAbortable(subCtx))
    }

    // 外层 signal 取消时级联取消所有子请求
    if (masterController.signal.aborted) {
      subControllers.forEach(c => c.abort())
    }
    masterController.signal.addEventListener('abort', () => {
      subControllers.forEach(c => c.abort())
    })

    const buffers: string[] = subContexts.map(() => '')
    const doneFlags: boolean[] = subContexts.map(() => false)
    const errorFlags: (Error | null)[] = subContexts.map(() => null)
    let yieldIndex = 0
    let masterFinished = false

    const stream = (async function* (): AsyncGenerator<ChatChunk, void, unknown> {
      // 启动所有子请求的并发消费（后台缓冲）
      const consumePromises = subStreams.map(async (abortable, idx) => {
        try {
          for await (const chunk of abortable.stream) {
            if (masterController.signal.aborted) return
            if (chunk.content) {
              buffers[idx] += chunk.content
            }
          }
          doneFlags[idx] = true
        } catch (err) {
          errorFlags[idx] = err instanceof Error ? err : new Error(String(err))
          doneFlags[idx] = true
        }
      })

      // 主循环：按索引顺序 yield 各子请求结果
      while (yieldIndex < subContexts.length) {
        if (masterController.signal.aborted) return

        // 等待当前 yieldIndex 的子请求至少有一些内容或已完成
        while (
          buffers[yieldIndex].length === 0 &&
          !doneFlags[yieldIndex] &&
          !errorFlags[yieldIndex]
        ) {
          if (masterController.signal.aborted) return
          await new Promise(r => setTimeout(r, 30))
        }

        if (masterController.signal.aborted) return

        // 如果当前子请求出错，直接向上抛出（中断整个流程）
        if (errorFlags[yieldIndex]) {
          throw errorFlags[yieldIndex]
        }

        let lastYieldedLength = 0

        // 流式 yield 当前子请求的新增内容
        while (yieldIndex < subContexts.length) {
          if (masterController.signal.aborted) return

          const buf = buffers[yieldIndex]
          if (buf.length > lastYieldedLength) {
            const delta = buf.slice(lastYieldedLength)
            lastYieldedLength = buf.length
            yield { content: delta, isFirst: lastYieldedLength === delta.length && yieldIndex === 0 }
          }

          if (doneFlags[yieldIndex]) {
            // 当前子请求已完成，推进到下一个
            yieldIndex++
            lastYieldedLength = 0
            // 如果下一个已经有内容或已完成，继续内层循环
            if (
              yieldIndex < subContexts.length &&
              (buffers[yieldIndex].length > 0 || doneFlags[yieldIndex] || errorFlags[yieldIndex])
            ) {
              if (errorFlags[yieldIndex]) {
                throw errorFlags[yieldIndex]
              }
              continue
            }
          }

          break
        }

        // 如果当前（新的 yieldIndex）还没数据且未完成，等待一下
        if (
          yieldIndex < subContexts.length &&
          buffers[yieldIndex].length === 0 &&
          !doneFlags[yieldIndex] &&
          !errorFlags[yieldIndex]
        ) {
          await new Promise(r => setTimeout(r, 30))
        }
      }

      masterFinished = true
      // 等待所有后台消费完成（清理）
      await Promise.allSettled(consumePromises)
    })()

    const abort = () => {
      if (!masterController.signal.aborted) {
        masterController.abort()
      }
      subControllers.forEach(c => {
        if (!c.signal.aborted) c.abort()
      })
      subStreams.forEach(s => s.abort())
    }

    return { stream, abort, signal: masterController.signal }
  }

  /**
   * 将 ChatContext 拆分为 N 个子 Context。
   * 仅拆分最后一条用户消息的文本内容，其余消息复制到每个子 Context。
   */
  private splitContext(context: ChatContext, count: number): ChatContext[] {
    if (count <= 1) return [context]

    const lastUserIndex = [...context.messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIndex < 0) return [context]
    const actualIndex = context.messages.length - 1 - lastUserIndex
    const lastMsg = context.messages[actualIndex]

    const content = typeof lastMsg.content === 'string' ? lastMsg.content : ''
    if (!content.trim()) return [context]

    // 优先按段落拆分
    let segments = this.splitByParagraphs(content, count)
    // 段落不足则按句子拆分
    if (segments.length < count) {
      segments = this.splitBySentences(content, count)
    }
    // 仍不足则不拆分
    if (segments.length < count) {
      return [context]
    }

    return segments.map(seg => ({
      ...context,
      messages: context.messages.map((m, idx) =>
        idx === actualIndex ? { ...m, content: seg } : { ...m }
      ),
    }))
  }

  private splitByParagraphs(text: string, count: number): string[] {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    if (paragraphs.length < count) return []
    return this.groupIntoN(paragraphs, count)
  }

  private splitBySentences(text: string, count: number): string[] {
    // 匹配中文和英文句子
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]*/g) || [text]
    const trimmed = sentences.map(s => s.trim()).filter(Boolean)
    if (trimmed.length < count) return []
    return this.groupIntoN(trimmed, count)
  }

  private groupIntoN(items: string[], count: number): string[] {
    const result: string[] = []
    const base = Math.floor(items.length / count)
    const rem = items.length % count
    let offset = 0
    for (let i = 0; i < count; i++) {
      const size = base + (i < rem ? 1 : 0)
      if (size === 0) continue
      result.push(items.slice(offset, offset + size).join(''))
      offset += size
    }
    return result
  }

  async chat(context: ChatContext): Promise<string> {
    const abortable = this.chatStreamAbortable(context)
    let content = ''
    for await (const chunk of abortable.stream) {
      if (chunk.content) content += chunk.content
    }
    return content
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
        body: testReq.body as BodyInit | Record<string, unknown> | null | undefined,
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
