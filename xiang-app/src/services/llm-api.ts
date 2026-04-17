import type { ChatContext, ChatChunk, TokenUsage } from '@/types/chat'
import { APIError, NetworkError } from './errors'
import { buildAPIURL } from './http'

export type APIProvider = 'openai' | 'openai-compatible'

export interface APIConfig {
  id: string
  name: string
  provider: APIProvider
  apiKey: string
  baseURL?: string
  model: string
  isDefault: boolean
}

export interface TestResult {
  success: boolean
  message: string
  model?: string
}

export interface AbortableChatStream {
  stream: AsyncGenerator<ChatChunk, void, unknown>
  abort: () => void
  signal: AbortSignal
}

const STREAM_READ_TIMEOUT_MS = 60_000

export class LLMAPIService {
  private config?: APIConfig

  constructor(config?: APIConfig) {
    this.config = config ? { ...config } : undefined
  }

  private async requestChat(context: ChatContext, stream: boolean, signal?: AbortSignal): Promise<Response> {
    try {
      const response = await fetch(buildAPIURL(stream ? '/api/chat/completions/stream' : '/api/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(context),
        signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIError(response.status, errorText || `HTTP ${response.status}`)
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
          }, STREAM_READ_TIMEOUT_MS)
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
            usage: data.usage as TokenUsage | undefined,
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
    let abortReason: string = 'manual'

    const abort = () => {
      if (!controller.signal.aborted) {
        abortReason = 'manual'
        controller.abort()
      }
    }

    const stream = (async function* (service: LLMAPIService): AsyncGenerator<ChatChunk, void, unknown> {
      const response = await service.requestChat(context, true, controller.signal)

      if (!response.body) {
        throw new APIError(502, 'Backend returned an empty response body.')
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
    const response = await this.requestChat(context, false)
    const data = await response.json()
    return data.content || ''
  }

  async testConnection(): Promise<TestResult> {
    return {
      success: true,
      message: 'Connection is managed by the backend.',
      model: this.config?.model
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
