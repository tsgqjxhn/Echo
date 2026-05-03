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
const MAX_BINARY_BASE64_CHARS = 120_000

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

async function readOneFile(file: File): Promise<GameInputFile> {
  const path = getFilePath(file)
  let text = ''

  if (isTextFile(file)) {
    const raw = await file.text()
    text = raw.length > MAX_TEXT_CHARS_PER_FILE
      ? `${raw.slice(0, MAX_TEXT_CHARS_PER_FILE)}\n\n[文件内容过长，已截断：${raw.length} 字符]`
      : raw
  } else if (file.size <= MAX_BINARY_BASE64_CHARS) {
    text = await readAsDataURL(file)
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

export async function readGameInputFiles(inputFiles: FileList | File[]): Promise<GameInputBundle> {
  const files = Array.from(inputFiles)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  if (totalSize > MAX_TOTAL_BYTES) {
    throw new Error('总大小超过100MB限制')
  }

  const items = await Promise.all(files.map(readOneFile))
  const text = items
    .map(file => [
      `=== ${file.path} ===`,
      `size: ${formatFileSize(file.size)}`,
      `type: ${file.type || 'unknown'}`,
      '',
      file.text,
    ].join('\n'))
    .join('\n\n')

  return {
    files: items,
    fileNames: items.map(file => file.path),
    totalSize,
    text,
  }
}

export function describeGameInputBundle(bundle: GameInputBundle): string {
  return `${bundle.fileNames.length} 个文件，${formatFileSize(bundle.totalSize)}`
}
