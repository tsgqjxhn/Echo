import { generateUUID } from '@/utils/uuid'
import type { WorldBookEntryUI, WorldBookUI } from '@/types/world-book-ui'

export function parseWorldBookFromJSON(json: unknown): WorldBookUI | null {
  if (!json || typeof json !== 'object') return null
  const record = json as Record<string, unknown>
  const entries: WorldBookEntryUI[] = []
  const rawEntries = Array.isArray(record.entries)
    ? record.entries
    : Array.isArray(json)
      ? json
      : []
  for (const item of rawEntries) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    const keywords = Array.isArray(e.keywords)
      ? (e.keywords as string[])
      : String(e.key || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
    entries.push({
      id: String(e.id || generateUUID()),
      keywords,
      keywordInput: keywords.join('，'),
      content: String(e.content || e.value || ''),
      order: Number(e.order ?? 0),
      enabled: e.enabled !== false,
      position: Number(e.position ?? 0),
      depth: Number(e.depth ?? 0),
      role: Number(e.role ?? 0),
      probability: Number(e.probability ?? 100),
      comment: String(e.comment || ''),
      dynamicAnchor: String(e.dynamicAnchor || ''),
      userPersona: String(e.userPersona || ''),
      compatibilityScore: e.compatibilityScore != null ? Number(e.compatibilityScore) : undefined,
      relationshipTrigger: String(e.relationshipTrigger || ''),
    })
  }
  return {
    id: String(record.id || generateUUID()),
    name: String(record.name || '导入的世界书'),
    entries,
    scanRange: Number(record.scanRange ?? 100),
    _expanded: true,
  }
}
