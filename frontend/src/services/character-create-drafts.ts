import { generateUUID } from '@/utils/uuid'
import { triggerDownloadBlob } from '@/services/files'

export const CHARACTER_CREATE_DRAFT_FILE_EXT = '.echo-character-draft.json'
export const CHARACTER_CREATE_DRAFT_FORMAT = 'echo-character-create-draft' as const

const DB_NAME = 'echo_character_create_drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'
const LAST_ACTIVE_KEY = 'echo_character_create_last_draft_id'
const LEGACY_DRAFT_KEY = 'character_draft'

export interface CharacterCreateDraftRecord {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  payload: Record<string, unknown>
}

export interface CharacterCreateDraftExportFile {
  format: typeof CHARACTER_CREATE_DRAFT_FORMAT
  version: 1
  exportedAt: number
  draft: CharacterCreateDraftRecord
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前环境不支持本地草稿存储'))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('无法打开草稿数据库'))
    })
  }
  return dbPromise
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    try {
      const result = handler(store)
      if (result instanceof Promise) {
        result.then(resolve).catch(reject)
      } else {
        result.onsuccess = () => resolve(result.result as T)
        result.onerror = () => reject(result.error || new Error('草稿读写失败'))
      }
    } catch (error) {
      reject(error)
    }
    tx.onerror = () => reject(tx.error || new Error('草稿事务失败'))
    tx.onabort = () => reject(tx.error || new Error('草稿读写已取消'))
  }))
}

export function hasDraftPayloadContent(payload: unknown): boolean {
  const draft = payload as Record<string, any> | null | undefined
  return !!(
    draft?.form?.name?.trim?.() ||
    String(draft?.templateData?.description ?? '').trim() ||
    draft?.plotCardData?.basic?.plotName?.trim?.() ||
    draft?.plotCardData?.basic?.plotGoal?.trim?.() ||
    draft?.gameCardData?.basic?.initializationTriggerType ||
    draft?.itemAttributeCardData?.item?.uid ||
    draft?.itemAttributeCardData?.attribute?.primaryAttributes ||
    draft?.globalCardData?.visual?.narratorEnabled ||
    draft?.globalCardData?.system?.globalSystemPrompt
  )
}

export function buildDefaultDraftTitle(payload: Record<string, unknown>): string {
  const name = String((payload.form as { name?: string } | undefined)?.name ?? '').trim()
  if (name) return name
  const date = new Date()
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `未命名草稿 ${stamp}`
}

export function formatDraftUpdatedAt(timestamp: number): string {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

export function getDraftStepLabel(payload: Record<string, unknown>): string {
  switch (payload.step) {
    case 'quick': return '快速创建'
    case 'cards': return '选择卡片'
    case 'manual': return '角色创建'
    case 'preview': return '预览编辑'
    default: return '创建角色'
  }
}

export async function listCharacterCreateDrafts(): Promise<CharacterCreateDraftRecord[]> {
  const items = await runTransaction<CharacterCreateDraftRecord[]>('readonly', store => store.getAll())
  return items.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getCharacterCreateDraft(id: string): Promise<CharacterCreateDraftRecord | null> {
  return runTransaction('readonly', store => store.get(id))
}

export async function saveCharacterCreateDraft(
  payload: Record<string, unknown>,
  options?: { id?: string; title?: string },
): Promise<CharacterCreateDraftRecord> {
  const now = Date.now()
  const existing = options?.id ? await getCharacterCreateDraft(options.id) : null
  const record: CharacterCreateDraftRecord = {
    id: existing?.id || options?.id || generateUUID(),
    title: (options?.title || existing?.title || buildDefaultDraftTitle(payload)).trim() || buildDefaultDraftTitle(payload),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    payload: JSON.parse(JSON.stringify(payload)),
  }
  await runTransaction('readwrite', store => store.put(record))
  setLastActiveCharacterCreateDraftId(record.id)
  return record
}

export async function renameCharacterCreateDraft(id: string, title: string): Promise<CharacterCreateDraftRecord | null> {
  const existing = await getCharacterCreateDraft(id)
  if (!existing) return null
  const nextTitle = title.trim() || existing.title
  const record = { ...existing, title: nextTitle, updatedAt: Date.now() }
  await runTransaction('readwrite', store => store.put(record))
  return record
}

export async function deleteCharacterCreateDraft(id: string): Promise<void> {
  await runTransaction('readwrite', store => store.delete(id))
  if (getLastActiveCharacterCreateDraftId() === id) {
    setLastActiveCharacterCreateDraftId(null)
  }
}

export async function deleteCharacterCreateDrafts(ids: string[]): Promise<void> {
  if (!ids.length) return
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    ids.forEach(id => store.delete(id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('批量删除草稿失败'))
  })
  const activeId = getLastActiveCharacterCreateDraftId()
  if (activeId && ids.includes(activeId)) {
    setLastActiveCharacterCreateDraftId(null)
  }
}

export function getLastActiveCharacterCreateDraftId(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setLastActiveCharacterCreateDraftId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_ACTIVE_KEY, id)
    else localStorage.removeItem(LAST_ACTIVE_KEY)
  } catch { /* ignore */ }
}

export async function getLastActiveCharacterCreateDraft(): Promise<CharacterCreateDraftRecord | null> {
  const id = getLastActiveCharacterCreateDraftId()
  if (!id) return null
  const draft = await getCharacterCreateDraft(id)
  if (!draft || !hasDraftPayloadContent(draft.payload)) return null
  return draft
}

export async function exportCharacterCreateDraftFile(id: string): Promise<void> {
  const draft = await getCharacterCreateDraft(id)
  if (!draft) throw new Error('草稿不存在')
  const blob = new Blob([JSON.stringify(buildExportFile(draft), null, 2)], { type: 'application/json' })
  const safeName = draft.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'character-draft'
  await triggerDownloadBlob(blob, `${safeName}${CHARACTER_CREATE_DRAFT_FILE_EXT}`)
}

export function buildExportFile(draft: CharacterCreateDraftRecord): CharacterCreateDraftExportFile {
  return {
    format: CHARACTER_CREATE_DRAFT_FORMAT,
    version: 1,
    exportedAt: Date.now(),
    draft,
  }
}

function normalizeImportedDraft(raw: unknown): CharacterCreateDraftRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const candidate = (root.format === CHARACTER_CREATE_DRAFT_FORMAT ? root.draft : root) as Record<string, unknown> | undefined
  if (!candidate || typeof candidate !== 'object') return null
  const payload = (candidate.payload && typeof candidate.payload === 'object')
    ? candidate.payload as Record<string, unknown>
    : candidate
  if (!hasDraftPayloadContent(payload)) return null
  const now = Date.now()
  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : generateUUID(),
    title: String(candidate.title || buildDefaultDraftTitle(payload)).trim() || buildDefaultDraftTitle(payload),
    createdAt: Number(candidate.createdAt) || now,
    updatedAt: Number(candidate.updatedAt) || now,
    payload: JSON.parse(JSON.stringify(payload)),
  }
}

export async function importCharacterCreateDraftFromText(text: string): Promise<CharacterCreateDraftRecord> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('草稿文件格式无效')
  }
  const draft = normalizeImportedDraft(parsed)
  if (!draft) throw new Error('草稿内容为空或格式不受支持')
  draft.id = generateUUID()
  draft.updatedAt = Date.now()
  await runTransaction('readwrite', store => store.put(draft))
  setLastActiveCharacterCreateDraftId(draft.id)
  return draft
}

export async function importCharacterCreateDraftFromFile(file: File): Promise<CharacterCreateDraftRecord> {
  const text = await file.text()
  const draft = await importCharacterCreateDraftFromText(text)
  const baseName = file.name.replace(/\.[^.]+$/, '').trim()
  if (baseName && (!draft.title || draft.title.startsWith('未命名草稿'))) {
    return (await renameCharacterCreateDraft(draft.id, baseName)) || draft
  }
  return draft
}

export async function migrateLegacyCharacterDraftIfNeeded(): Promise<CharacterCreateDraftRecord | null> {
  try {
    const raw = localStorage.getItem(LEGACY_DRAFT_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as Record<string, unknown>
    localStorage.removeItem(LEGACY_DRAFT_KEY)
    if (!hasDraftPayloadContent(payload)) return null
    return saveCharacterCreateDraft(payload, { title: buildDefaultDraftTitle(payload) })
  } catch {
    try { localStorage.removeItem(LEGACY_DRAFT_KEY) } catch { /* ignore */ }
    return null
  }
}
