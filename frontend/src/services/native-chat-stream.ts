import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { generateUUID } from '@/utils/uuid'
import { APIError, NetworkError } from './errors'
import { parseProviderErrorPayload } from './provider-http'

interface NativeChatStreamEvent {
  requestId: string
  type?: 'open' | 'chunk' | 'complete' | 'error'
  chunk?: string
  status?: number
  body?: unknown
  message?: string
  contentType?: string
}

interface NativeChatStreamStartOptions {
  requestId: string
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  connectTimeout?: number
  readTimeout?: number
}

interface NativeChatStreamPlugin {
  start(options: NativeChatStreamStartOptions): Promise<{ requestId: string }>
  abort(options: { requestId: string }): Promise<{ requestId: string; aborted?: boolean }>
  addListener(
    eventName: 'streamEvent',
    listenerFunc: (event: NativeChatStreamEvent) => void
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}

interface NativeChatStreamOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  connectTimeout?: number
  readTimeout?: number
  signal?: AbortSignal
}

interface NativeChatStreamSession {
  requestId: string
  stream: AsyncGenerator<string, void, unknown>
  abort: () => Promise<void>
}

const NativeChatStream = registerPlugin<NativeChatStreamPlugin>('NativeChatStream')

class AsyncQueue<T> {
  private values: T[] = []
  private waiters: Array<{
    resolve: (value: IteratorResult<T>) => void
    reject: (reason?: unknown) => void
  }> = []
  private closed = false
  private error?: Error

  push(value: T): void {
    if (this.closed || this.error) {
      return
    }

    const waiter = this.waiters.shift()
    if (waiter) {
      waiter.resolve({ value, done: false })
      return
    }

    this.values.push(value)
  }

  close(): void {
    if (this.closed || this.error) {
      return
    }

    this.closed = true
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      waiter?.resolve({ value: undefined as T, done: true })
    }
  }

  fail(error: Error): void {
    if (this.closed || this.error) {
      return
    }

    this.error = error
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      waiter?.reject(error)
    }
  }

  next(): Promise<IteratorResult<T>> {
    if (this.values.length > 0) {
      return Promise.resolve({ value: this.values.shift() as T, done: false })
    }

    if (this.error) {
      return Promise.reject(this.error)
    }

    if (this.closed) {
      return Promise.resolve({ value: undefined as T, done: true })
    }

    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
    })
  }
}

function createNativeStreamError(event: NativeChatStreamEvent): Error {
  if (typeof event.status === 'number') {
    let payload = event.body

    if (typeof payload === 'string') {
      const text = payload.trim()
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = text
        }
      }
    }

    return new APIError(event.status, parseProviderErrorPayload(payload, event.status))
  }

  return new NetworkError(event.message || 'Native chat streaming failed.')
}

function normalizePluginError(error: unknown): Error {
  if (error instanceof Error) {
    return new NetworkError(error.message || 'Native chat streaming failed.')
  }

  if (typeof error === 'string' && error.trim()) {
    return new NetworkError(error)
  }

  return new NetworkError('Native chat streaming failed.')
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

export async function openNativeChatStream(
  options: NativeChatStreamOptions
): Promise<NativeChatStreamSession> {
  if (options.signal?.aborted) {
    throw createAbortError()
  }

  const requestId = generateUUID()
  const queue = new AsyncQueue<string>()
  let listenerHandle: PluginListenerHandle | null = null
  let finished = false
  let aborted = false

  const cleanup = async () => {
    options.signal?.removeEventListener('abort', handleSignalAbort)

    if (listenerHandle) {
      const currentHandle = listenerHandle
      listenerHandle = null
      await currentHandle.remove().catch(() => undefined)
    }
  }

  const abort = async () => {
    if (aborted) {
      return
    }

    aborted = true
    finished = true
    queue.close()
    await NativeChatStream.abort({ requestId }).catch(() => undefined)
    await cleanup()
  }

  const handleSignalAbort = () => {
    void abort()
  }

  listenerHandle = await NativeChatStream.addListener('streamEvent', (event: NativeChatStreamEvent) => {
    if (event.requestId !== requestId || finished) {
      return
    }

    if (event.type === 'chunk') {
      if (typeof event.chunk === 'string' && event.chunk.length > 0) {
        queue.push(event.chunk)
      }
      return
    }

    if (event.type === 'complete') {
      finished = true
      queue.close()
      void cleanup()
      return
    }

    if (event.type === 'error') {
      finished = true
      queue.fail(createNativeStreamError(event))
      void cleanup()
    }
  })

  options.signal?.addEventListener('abort', handleSignalAbort, { once: true })

  try {
    await NativeChatStream.start({
      requestId,
      url: options.url,
      method: options.method || 'POST',
      headers: options.headers,
      body: options.body,
      connectTimeout: options.connectTimeout,
      readTimeout: options.readTimeout,
    })
  } catch (error) {
    finished = true
    queue.fail(normalizePluginError(error))
    await cleanup()
    throw normalizePluginError(error)
  }

  const stream = (async function* (): AsyncGenerator<string, void, unknown> {
    try {
      while (true) {
        const next = await queue.next()
        if (next.done) {
          return
        }

        yield next.value
      }
    } finally {
      if (!finished && !aborted) {
        await abort()
      }
    }
  })()

  return {
    requestId,
    stream,
    abort,
  }
}
