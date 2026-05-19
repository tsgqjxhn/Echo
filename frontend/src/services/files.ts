import { NetworkError } from './errors'

import { API_BASE } from '@/constants/api-base'

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

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

async function resolveSourceToBlob(
  source: UploadSource,
  filename?: string
): Promise<{ blob: Blob; filename: string }> {
  if (source instanceof File) {
    return {
      blob: source,
      filename: filename || source.name || 'upload.bin',
    }
  }

  if (source instanceof Blob) {
    return {
      blob: source,
      filename: filename || `upload${inferExtension(source.type)}`,
    }
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const blob = dataUrlToBlob(source)
      return {
        blob,
        filename: filename || `upload${inferExtension(blob.type)}`,
      }
    }

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
          `upload${inferExtension(blob.type)}`,
      }
    } catch (error) {
      throw new NetworkError((error as Error).message || 'Unable to read local file for upload.')
    }
  }

  throw new NetworkError('Unsupported upload source.')
}

export function isRemoteAssetURL(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value)
}

/**
 * 上传资产到 cap_files HTTP API
 * @param source 文件、Blob、data URL 或本地文件路径
 * @param type 资产类型
 * @returns 服务器返回的相对路径（如 uploads/asset_xxx.webp）
 */
export async function uploadAsset(
  source: File | Blob | string,
  type: 'avatar' | 'cover' | 'voice'
): Promise<string> {
  const { blob, filename } = await resolveSourceToBlob(source)
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('asset_type', type)

  const response = await fetch(`${API_BASE}/api/files/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    throw new NetworkError(`Upload failed: ${response.status} ${text}`)
  }

  const result = (await response.json()) as AssetResponse
  return result.storagePath
}

/**
 * 将相对路径拼接为完整 URL
 * 如果传入的已经是完整 URL 或 data URL，则原样返回
 */
export function getAssetUrl(relativePath: string): string {
  if (!relativePath) return ''
  if (/^https?:\/\//i.test(relativePath) || /^data:/i.test(relativePath) || /^blob:/i.test(relativePath)) {
    return relativePath
  }
  const base = API_BASE.replace(/\/$/, '')
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${base}${path}`
}

export async function triggerDownloadBlob(blob: Blob, filename: string): Promise<void> {
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'application/octet-stream' }) : null

  if (file && typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
    try {
      const nextNavigator = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean
        share: (data: { files?: File[]; title?: string }) => Promise<void>
      }

      if (nextNavigator.canShare?.({ files: [file] })) {
        await nextNavigator.share({ files: [file], title: filename })
        return
      }
    } catch {
      // Fall back to anchor download.
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    triggerDownload(url, filename)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
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
