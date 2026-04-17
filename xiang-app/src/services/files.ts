import { APIError, NetworkError } from './errors'
import { buildAPIURL, getBackendBaseURL } from './http'

export interface AssetResponse {
  id: string
  assetType: string
  storagePath: string
  originalName?: string | null
  mimeType?: string | null
  size?: number | null
  ownerType?: string | null
  ownerId?: string | null
  createdAt: number
  url: string
}

export type UploadSource = File | Blob | string

export interface UploadAssetOptions {
  source: UploadSource
  assetType: string
  ownerType?: string
  ownerId?: string
  filename?: string
}

function inferExtension(mimeType: string | null | undefined): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'audio/mpeg':
      return '.mp3'
    case 'audio/mp4':
      return '.m4a'
    case 'audio/webm':
      return '.webm'
    case 'audio/wav':
      return '.wav'
    case 'application/json':
      return '.json'
    case 'text/markdown':
      return '.md'
    default:
      return ''
  }
}

function inferFilenameFromURL(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin)
    const name = parsed.pathname.split('/').pop()
    return name || null
  } catch {
    return null
  }
}

async function resolveUploadSource(
  source: UploadSource,
  filename?: string
): Promise<{ blob: Blob; filename: string }> {
  if (source instanceof File) {
    return {
      blob: source,
      filename: filename || source.name || 'upload.bin'
    }
  }

  if (source instanceof Blob) {
    return {
      blob: source,
      filename: filename || `upload${inferExtension(source.type)}`
    }
  }

  if (typeof source === 'string') {
    try {
      const response = await fetch(source)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      return {
        blob,
        filename:
          filename ||
          inferFilenameFromURL(source) ||
          `upload${inferExtension(blob.type)}`
      }
    } catch (error) {
      throw new NetworkError((error as Error).message || 'Unable to read local file for upload.')
    }
  }

  throw new NetworkError('Unsupported upload source.')
}

function getRuntimeUni(): any {
  return (globalThis as any).uni
}

async function parseAssetResponse(response: Response): Promise<AssetResponse> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new APIError(response.status, text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<AssetResponse>
}

export function isRemoteAssetURL(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith(`${getBackendBaseURL()}/media/`)
}

export async function uploadAsset(options: UploadAssetOptions): Promise<AssetResponse> {
  if (typeof options.source === 'string') {
    const runtimeUni = getRuntimeUni()
    const isLocalNativePath = !/^blob:|^data:|^https?:/i.test(options.source)

    if (runtimeUni?.uploadFile && isLocalNativePath) {
      return new Promise((resolve, reject) => {
        runtimeUni.uploadFile({
          url: buildAPIURL('/api/files/upload'),
          filePath: options.source,
          name: 'file',
          formData: {
            asset_type: options.assetType,
            owner_type: options.ownerType || '',
            owner_id: options.ownerId || '',
          },
          success: (result: { statusCode?: number; data?: string }) => {
            try {
              if ((result.statusCode || 0) >= 400) {
                reject(new APIError(result.statusCode || 500, result.data || 'File upload failed.'))
                return
              }

              resolve(JSON.parse(result.data || '{}') as AssetResponse)
            } catch (error) {
              reject(error)
            }
          },
          fail: (error: { errMsg?: string }) => {
            reject(new NetworkError(error?.errMsg || 'File upload failed.'))
          }
        })
      })
    }
  }

  const { blob, filename } = await resolveUploadSource(options.source, options.filename)
  const formData = new FormData()

  formData.append('file', blob, filename)
  formData.append('asset_type', options.assetType)

  if (options.ownerType) {
    formData.append('owner_type', options.ownerType)
  }

  if (options.ownerId) {
    formData.append('owner_id', options.ownerId)
  }

  try {
    const response = await fetch(buildAPIURL('/api/files/upload'), {
      method: 'POST',
      body: formData
    })

    return await parseAssetResponse(response)
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    throw new NetworkError((error as Error).message || 'File upload failed.')
  }
}

export function triggerDownload(url: string, filename?: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  if (filename) {
    anchor.download = filename
  }
  anchor.rel = 'noopener'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
