import type { StorageDriver } from './storage'
import { getEmbeddingProvider, cosineSimilarity } from './embedding'
import { generateUUID } from '@/utils/uuid'

const STORE_KEY = 'semantic_memory_store'

export type MemoryHeat = 'hot' | 'cold'

export interface SemanticMemoryEntry {
  id: string
  characterId: string
  sessionId: string
  text: string
  embedding: number[]
  heat: MemoryHeat
  pinned: boolean
  accessCount: number
  createdAt: number
  lastAccessedAt: number
  source: 'user' | 'assistant' | 'summary' | 'lorebook'
  metadata?: Record<string, string>
}

export interface SemanticMemoryStore {
  entries: SemanticMemoryEntry[]
  updatedAt: number
}

export interface MemorySearchResult {
  entry: SemanticMemoryEntry
  score: number
}

export interface MemorySearchOptions {
  topK?: number
  minScore?: number
  heatFilter?: MemoryHeat
  sourceFilter?: SemanticMemoryEntry['source']
}

const DEFAULT_TOP_K = 5
const DEFAULT_MIN_SCORE = 0.3

function emptyStore(): SemanticMemoryStore {
  return { entries: [], updatedAt: Date.now() }
}

async function loadStore(storage: StorageDriver): Promise<SemanticMemoryStore> {
  const raw = await storage.getUserSetting(STORE_KEY)
  if (!raw) return emptyStore()
  try {
    return JSON.parse(raw) as SemanticMemoryStore
  } catch {
    return emptyStore()
  }
}

async function saveStore(storage: StorageDriver, store: SemanticMemoryStore): Promise<void> {
  store.updatedAt = Date.now()
  await storage.saveUserSetting(STORE_KEY, JSON.stringify(store))
}

/**
 * 添加一条语义记忆
 */
export async function addMemory(
  storage: StorageDriver,
  params: {
    characterId: string
    sessionId: string
    text: string
    source: SemanticMemoryEntry['source']
    pinned?: boolean
    metadata?: Record<string, string>
  }
): Promise<SemanticMemoryEntry> {
  const provider = getEmbeddingProvider()
  const embedding = await provider.embed(params.text)
  const entry: SemanticMemoryEntry = {
    id: generateUUID(),
    characterId: params.characterId,
    sessionId: params.sessionId,
    text: params.text,
    embedding,
    heat: 'hot',
    pinned: params.pinned ?? false,
    accessCount: 0,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    source: params.source,
    metadata: params.metadata,
  }

  const store = await loadStore(storage)
  store.entries.push(entry)
  await saveStore(storage, store)
  return entry
}

/**
 * 批量添加语义记忆
 */
export async function addMemoryBatch(
  storage: StorageDriver,
  items: Array<{
    characterId: string
    sessionId: string
    text: string
    source: SemanticMemoryEntry['source']
    pinned?: boolean
    metadata?: Record<string, string>
  }>
): Promise<void> {
  if (items.length === 0) return

  const provider = getEmbeddingProvider()
  const texts = items.map(i => i.text)
  const embeddings = await provider.embedBatch(texts)

  const store = await loadStore(storage)
  for (let i = 0; i < items.length; i++) {
    store.entries.push({
      id: generateUUID(),
      characterId: items[i].characterId,
      sessionId: items[i].sessionId,
      text: items[i].text,
      embedding: embeddings[i],
      heat: 'hot',
      pinned: items[i].pinned ?? false,
      accessCount: 0,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      source: items[i].source,
      metadata: items[i].metadata,
    })
  }
  await saveStore(storage, store)
}

/**
 * 语义搜索: 用 query embedding 检索最相关的记忆
 */
export async function searchMemories(
  storage: StorageDriver,
  query: string,
  characterId: string,
  options?: MemorySearchOptions
): Promise<MemorySearchResult[]> {
  const provider = getEmbeddingProvider()
  const queryEmbedding = await provider.embed(query)
  const store = await loadStore(storage)

  const topK = options?.topK ?? DEFAULT_TOP_K
  const minScore = options?.minScore ?? DEFAULT_MIN_SCORE

  let candidates = store.entries.filter(e => e.characterId === characterId)

  if (options?.heatFilter) {
    candidates = candidates.filter(e => e.heat === options.heatFilter)
  }
  if (options?.sourceFilter) {
    candidates = candidates.filter(e => e.source === options.sourceFilter)
  }

  const scored: MemorySearchResult[] = candidates
    .map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, topK)
}

/**
 * 更新记忆条目
 */
export async function updateMemory(
  storage: StorageDriver,
  entryId: string,
  updates: Partial<Pick<SemanticMemoryEntry, 'heat' | 'pinned' | 'accessCount' | 'text'>>
): Promise<void> {
  const store = await loadStore(storage)
  const entry = store.entries.find(e => e.id === entryId)
  if (!entry) return

  if (updates.heat !== undefined) entry.heat = updates.heat
  if (updates.pinned !== undefined) entry.pinned = updates.pinned
  if (updates.accessCount !== undefined) entry.accessCount = updates.accessCount
  if (updates.text !== undefined) {
    entry.text = updates.text
    const provider = getEmbeddingProvider()
    entry.embedding = await provider.embed(updates.text)
  }
  entry.lastAccessedAt = Date.now()
  await saveStore(storage, store)
}

/**
 * 删除记忆条目
 */
export async function deleteMemory(storage: StorageDriver, entryId: string): Promise<void> {
  const store = await loadStore(storage)
  store.entries = store.entries.filter(e => e.id !== entryId)
  await saveStore(storage, store)
}

/**
 * 获取某角色的所有记忆
 */
export async function getMemoriesByCharacter(
  storage: StorageDriver,
  characterId: string,
  heatFilter?: MemoryHeat
): Promise<SemanticMemoryEntry[]> {
  const store = await loadStore(storage)
  let entries = store.entries.filter(e => e.characterId === characterId)
  if (heatFilter) {
    entries = entries.filter(e => e.heat === heatFilter)
  }
  return entries
}

/**
 * 清除某会话的记忆
 */
export async function clearSessionMemories(
  storage: StorageDriver,
  sessionId: string
): Promise<void> {
  const store = await loadStore(storage)
  store.entries = store.entries.filter(e => e.sessionId !== sessionId)
  await saveStore(storage, store)
}
