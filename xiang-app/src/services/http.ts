import { APIError, NetworkError } from './errors'

const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:8000'

export function getBackendBaseURL(): string {
  return (import.meta.env.VITE_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '')
}

export function buildAPIURL(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
  const url = new URL(`${getBackendBaseURL()}${path}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue
      }

      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    if (typeof payload?.detail === 'string' && payload.detail.trim()) {
      return payload.detail
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message
    }
  } catch {
    const text = await response.text().catch(() => '')
    if (text.trim()) {
      return text
    }
  }

  return `HTTP ${response.status}`
}

export async function requestJSON<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  try {
    const response = await fetch(buildAPIURL(path, query), {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers || {})
      }
    })

    if (!response.ok) {
      throw new APIError(response.status, await parseErrorMessage(response))
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    throw new NetworkError((error as Error).message || 'Network request failed.')
  }
}

export async function requestOptionalJSON<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T | null> {
  try {
    return await requestJSON<T>(path, init, query)
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 404) {
      return null
    }
    throw error
  }
}

export async function requestBlob(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<Blob> {
  try {
    const response = await fetch(buildAPIURL(path, query), {
      ...init,
      headers: {
        ...(init.headers || {})
      }
    })

    if (!response.ok) {
      throw new APIError(response.status, await parseErrorMessage(response))
    }

    return await response.blob()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    throw new NetworkError((error as Error).message || 'Network request failed.')
  }
}
