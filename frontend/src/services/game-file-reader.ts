export interface GameInputFile {
  path: string
  name: string
  size: number
  type: string
  text: string
}

export interface GameInputBundle {
  files: GameInputFile[]
  fileNames: string[]
  totalSize: number
  text: string
}

const MAX_TOTAL_BYTES = 100 * 1024 * 1024
const MAX_TEXT_CHARS_PER_FILE = 180_000
const MAX_FILES_TO_READ = 260
const CONCURRENT_READS = 8

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'yaml',
  'yml',
  'html',
  'htm',
  'css',
  'js',
  'ts',
  'vue',
  'svg',
])

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'zip',
])

const SKIP_PATH_PARTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.vite',
  '.cache',
])

function getFilePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

function getExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
}

function isTextFile(file: File): boolean {
  const ext = getExtension(getFilePath(file))
  return TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')
}

function shouldSkipPath(path: string): boolean {
  return path
    .split(/[\\/]/)
    .some(part => SKIP_PATH_PARTS.has(part))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function readOneFile(file: File): Promise<GameInputFile> {
  const path = getFilePath(file)
  const ext = getExtension(path)
  let text = ''

  if (isTextFile(file)) {
    const raw = await file.text()
    text = raw.length > MAX_TEXT_CHARS_PER_FILE
      ? `${raw.slice(0, MAX_TEXT_CHARS_PER_FILE)}\n\n[文件内容过长，已截断：${raw.length} 字符]`
      : raw
  } else if (BINARY_EXTENSIONS.has(ext)) {
    text = `[resource file: ${file.name}, size=${formatFileSize(file.size)}, type=${file.type || ext || 'binary'}]`
  } else {
    text = `[binary file: ${file.name}, size=${formatFileSize(file.size)}, type=${file.type || 'application/octet-stream'}]`
  }

  return {
    path,
    name: file.name,
    size: file.size,
    type: file.type,
    text,
  }
}

async function readInBatches(files: File[]): Promise<GameInputFile[]> {
  const results: GameInputFile[] = []
  for (let index = 0; index < files.length; index += CONCURRENT_READS) {
    const batch = files.slice(index, index + CONCURRENT_READS)
    results.push(...await Promise.all(batch.map(readOneFile)))
  }
  return results
}

export async function readGameInputFiles(inputFiles: FileList | File[]): Promise<GameInputBundle> {
  const allFiles = Array.from(inputFiles)
  const files = allFiles
    .filter(file => !shouldSkipPath(getFilePath(file)))
    .slice(0, MAX_FILES_TO_READ)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  if (totalSize > MAX_TOTAL_BYTES) {
    throw new Error('总大小超过100MB限制')
  }

  const items = await readInBatches(files)
  const skippedCount = allFiles.length - files.length
  const text = items
    .map(file => [
      `=== ${file.path} ===`,
      `size: ${formatFileSize(file.size)}`,
      `type: ${file.type || 'unknown'}`,
      '',
      file.text,
    ].join('\n'))
    .join('\n\n')
  const skippedText = skippedCount > 0
    ? `\n\n[已跳过 ${skippedCount} 个低优先级或超出数量限制的资源文件，以加快读取速度]`
    : ''

  return {
    files: items,
    fileNames: items.map(file => file.path),
    totalSize,
    text: `${text}${skippedText}`,
  }
}

export function describeGameInputBundle(bundle: GameInputBundle): string {
  return `${bundle.fileNames.length} 个文件，${formatFileSize(bundle.totalSize)}`
}
