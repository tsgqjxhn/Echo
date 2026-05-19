import type { ParsedGameFile } from '@/stores/game-generation'

function extractHtmlFromOutput(output: string): string {
  if (!output.trim()) return ''
  const htmlMatch = output.match(/```html\s*([\s\S]*?)```/i)
  if (htmlMatch?.[1]) return htmlMatch[1].trim()
  const fullHtml = output.match(/<!doctype html[\s\S]*<\/html>/i) || output.match(/<html[\s\S]*<\/html>/i)
  return fullHtml?.[0]?.trim() || ''
}

function normalizePath(basePath: string, relativePath: string): string {
  const baseParts = basePath.replace(/\\/g, '/').split('/').slice(0, -1)
  const relParts = relativePath.replace(/\\/g, '/').split('/')
  const merged = [...baseParts, ...relParts]
  const resolved: string[] = []
  for (const part of merged) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

function findIndexHtml(files: ParsedGameFile[]): ParsedGameFile | undefined {
  const sorted = [...files].sort((a, b) => a.path.length - b.path.length)
  return (
    sorted.find(f => /(^|\/)index\.html?$/i.test(f.path.replace(/\\/g, '/'))) ||
    sorted.find(f => /\.html?$/i.test(f.path))
  )
}

function fileLookup(files: ParsedGameFile[], indexPath: string, assetPath: string): ParsedGameFile | undefined {
  const normalizedIndex = indexPath.replace(/\\/g, '/').replace(/^\.\//, '')
  const candidates = [
    normalizePath(normalizedIndex, assetPath),
    assetPath.replace(/^\.\//, ''),
    normalizedIndex.split('/').slice(0, -1).concat(assetPath.split('/')).filter(Boolean).join('/'),
  ]
  const map = new Map<string, ParsedGameFile>()
  files.forEach(file => {
    const key = file.path.replace(/\\/g, '/').replace(/^\.\//, '')
    map.set(key, file)
    map.set(key.split('/').pop() || key, file)
  })
  for (const candidate of candidates) {
    const hit = map.get(candidate)
    if (hit && !hit.content.startsWith('[')) return hit
  }
  return files.find(f => f.path.replace(/\\/g, '/').endsWith(assetPath.replace(/^\.\//, '')))
}

function inlineAssets(html: string, indexFile: ParsedGameFile, files: ParsedGameFile[]): string {
  let result = html
  const indexPath = indexFile.path

  result = result.replace(
    /<link([^>]*?)\s+href=["']([^"']+)["']([^>]*)>/gi,
    (match, before, href, after) => {
      if (/^(https?:|data:|\/)/i.test(href)) return match
      const asset = fileLookup(files, indexPath, href)
      if (!asset?.content || asset.content.startsWith('[')) return match
      return `<style data-inlined-from="${href}">\n${asset.content}\n</style>`
    },
  )

  result = result.replace(
    /<script([^>]*?)\s+src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, before, src, after) => {
      if (/^(https?:|data:|\/)/i.test(src)) return match
      const asset = fileLookup(files, indexPath, src)
      if (!asset?.content || asset.content.startsWith('[')) return match
      const attrs = `${before || ''} ${after || ''}`.replace(/\s+src=["'][^"']+["']/gi, '').trim()
      return `<script${attrs ? ` ${attrs}` : ''} data-inlined-from="${src}">\n${asset.content}\n</script>`
    },
  )

  return result
}

export function bundleHtmlFromParsedFiles(files: ParsedGameFile[]): string {
  if (!files.length) return ''
  const indexFile = findIndexHtml(files)
  if (!indexFile?.content?.trim()) return ''
  if (indexFile.content.startsWith('[')) return ''
  const html = indexFile.content.trim()
  if (!/<html[\s>]/i.test(html) && !/<!doctype/i.test(html)) {
    return html
  }
  return inlineAssets(html, indexFile, files)
}

export function resolveImportableHtml(payload: {
  output?: string
  parsedFiles?: ParsedGameFile[]
}): string {
  const fromOutput = extractHtmlFromOutput(payload.output || '')
  if (fromOutput) return fromOutput

  const bundled = bundleHtmlFromParsedFiles(payload.parsedFiles || [])
  if (bundled) return bundled

  const raw = (payload.output || '').trim()
  if (/<html[\s>]/i.test(raw) || /<!doctype/i.test(raw)) return raw
  return ''
}

export function parsedFilesFromUploadTexts(
  files: Array<{ path: string; text: string }>,
): ParsedGameFile[] {
  return files
    .filter(file => file.text && !file.text.startsWith('[resource file') && !file.text.startsWith('[binary file'))
    .map(file => ({
      path: file.path.replace(/\\/g, '/'),
      content: file.text,
    }))
}
