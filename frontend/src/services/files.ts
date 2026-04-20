import { generateUUID } from '@/utils/uuid'
import { NetworkError } from './errors'

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

export async function uploadAsset(options: UploadAssetOptions): Promise<AssetResponse> {
  const { blob, filename } = await resolveUploadSource(options.source, options.filename)
  const url = URL.createObjectURL(blob)

  return {
    id: generateUUID(),
    assetType: options.assetType,
    storagePath: filename,
    originalName: filename,
    mimeType: blob.type || null,
    size: blob.size,
    ownerType: options.ownerType || null,
    ownerId: options.ownerId || null,
    createdAt: Date.now(),
    url,
  }
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
