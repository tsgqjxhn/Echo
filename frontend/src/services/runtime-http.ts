import { Capacitor } from '@capacitor/core'
import { nativeHttpRequest } from './native-http'

export type RuntimeResponseType = 'json' | 'text' | 'blob'

export interface RuntimeRequestOptions {
  url: string
  method?: string
  headers?: HeadersInit
  body?: BodyInit | Record<string, unknown> | null
  responseType?: RuntimeResponseType
  signal?: AbortSignal
  connectTimeout?: number
  readTimeout?: number
}

export interface RuntimeResponse<T> {
  data: T
  headers: Record<string, string>
  ok: boolean
  status: number
  url: string
}

function isHeaders(headers?: HeadersInit): headers is Headers {
  return typeof Headers !== 'undefined' && headers instanceof Headers
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {}
  }

  if (isHeaders(headers)) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return { ...headers }
}

function hasContentType(headers: Record<string, string>): boolean {
  return Object.keys(headers).some(key => key.toLowerCase() === 'content-type')
}

function withJsonContentType(headers: Record<string, string>): Record<string, string> {
  if (hasContentType(headers)) {
    return headers
  }

  return {
    ...headers,
    'Content-Type': 'application/json',
  }
}

function isBodyInit(value: unknown): value is BodyInit {
  if (typeof value === 'string') {
    return true
  }

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return true
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return true
  }

  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return true
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return true
  }

  return typeof ReadableStream !== 'undefined' && value instanceof ReadableStream
}

function prepareWebRequest(options: RuntimeRequestOptions): {
  body?: BodyInit
  headers: HeadersInit
} {
  const headers = normalizeHeaders(options.headers)
  const body = options.body

  if (body == null) {
    return { headers }
  }

  if (isBodyInit(body)) {
    return { headers, body }
  }

  return {
    headers: withJsonContentType(headers),
    body: JSON.stringify(body),
  }
}

function prepareNativeRequest(options: RuntimeRequestOptions): {
  data?: string
  headers: Record<string, string>
} {
  const headers = normalizeHeaders(options.headers)
  const body = options.body

  if (body == null) {
    return { headers }
  }

  if (typeof body === 'string') {
    return { headers, data: body }
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return { headers, data: body.toString() }
  }

  if (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    isBodyInit(body)
  ) {
    throw new Error('Native runtimeRequest does not support this request body. Use fetch with CapacitorHttp patching instead.')
  }

  return {
    headers: withJsonContentType(headers),
    data: JSON.stringify(body),
  }
}

function normalizeBase64(value: string): string {
  return value.replace(/\s+/g, '')
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(normalizeBase64(base64))
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

export function isNativeRuntime(): boolean {
  try {
    if (typeof Capacitor.isNativePlatform === 'function') {
      return Capacitor.isNativePlatform()
    }

    return Capacitor.getPlatform() !== 'web'
  } catch {
    return typeof (globalThis as any).androidBridge !== 'undefined'
  }
}

function parseNativeJSON<T>(payload: string | undefined): T {
  const text = typeof payload === 'string' ? payload.trim() : ''
  if (!text) {
    return {} as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export async function runtimeRequest<T = unknown>(
  options: RuntimeRequestOptions
): Promise<RuntimeResponse<T>> {
  if (options.signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  const method = options.method || 'GET'
  const responseType = options.responseType || 'json'

  if (isNativeRuntime()) {
    const prepared = prepareNativeRequest(options)
    const response = await nativeHttpRequest({
      url: options.url,
      method,
      headers: prepared.headers,
      data: prepared.data,
      responseType,
      connectTimeout: options.connectTimeout,
      readTimeout: options.readTimeout,
    })

    const contentType =
      response.headers?.['Content-Type'] ||
      response.headers?.['content-type'] ||
      'application/octet-stream'

    const data =
      responseType === 'blob'
        ? (base64ToBlob(String(response.data || ''), contentType) as T)
        : responseType === 'text'
          ? (String(response.data || '') as T)
          : parseNativeJSON<T>(response.data)

    return {
      data,
      headers: response.headers || {},
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      url: response.url,
    }
  }

  const prepared = prepareWebRequest(options)
  const response = await fetch(options.url, {
    method,
    headers: prepared.headers,
    body: prepared.body,
    signal: options.signal,
  })

  let data: T
  if (responseType === 'blob') {
    data = (await response.blob()) as T
  } else if (responseType === 'text') {
    data = (await response.text()) as T
  } else {
    data = (await response.json().catch(() => ({}))) as T
  }

  return {
    data,
    headers: Object.fromEntries(response.headers.entries()),
    ok: response.ok,
    status: response.status,
    url: response.url,
  }
}
