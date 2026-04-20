import { registerPlugin } from '@capacitor/core'

export interface NativeHttpRequestOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  data?: string
  responseType?: 'json' | 'text' | 'blob'
  connectTimeout?: number
  readTimeout?: number
}

export interface NativeHttpResponse {
  data?: string
  headers?: Record<string, string>
  status: number
  url: string
}

interface NativeHttpPlugin {
  request(options: NativeHttpRequestOptions): Promise<NativeHttpResponse>
}

const NativeHttp = registerPlugin<NativeHttpPlugin>('NativeHttp')

export async function nativeHttpRequest(
  options: NativeHttpRequestOptions
): Promise<NativeHttpResponse> {
  return NativeHttp.request(options)
}
