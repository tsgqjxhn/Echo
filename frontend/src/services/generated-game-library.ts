import type { GeneratedGameLibraryItem } from '@/types/game'

export type { GeneratedGameLibraryItem } from '@/types/game'

const LIBRARY_KEY = 'echo_generated_game_library_v1'

function readLibrary(): GeneratedGameLibraryItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed as GeneratedGameLibraryItem[] : []
  } catch {
    return []
  }
}

function writeLibrary(items: GeneratedGameLibraryItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(items))
}

function makeId(): string {
  return `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listGeneratedGames(): GeneratedGameLibraryItem[] {
  return readLibrary().sort((left, right) => right.updatedAt - left.updatedAt)
}

export function getGeneratedGame(id: string): GeneratedGameLibraryItem | null {
  return readLibrary().find(item => item.id === id) || null
}

export function saveGeneratedGame(payload: {
  title: string
  html: string
  description?: string
  sourceTaskId?: string
  triggerType?: GeneratedGameLibraryItem['triggerType']
}): GeneratedGameLibraryItem {
  const now = Date.now()
  const item: GeneratedGameLibraryItem = {
    id: makeId(),
    title: payload.title.trim() || 'AI 生成游戏',
    description: payload.description?.trim() || undefined,
    html: payload.html,
    triggerType: payload.triggerType || 'external',
    sourceTaskId: payload.sourceTaskId,
    createdAt: now,
    updatedAt: now,
  }

  writeLibrary([item, ...readLibrary()])
  return item
}

export function deleteGeneratedGame(id: string): void {
  writeLibrary(readLibrary().filter(item => item.id !== id))
}

export function clearGeneratedGameLibrary(): number {
  const count = readLibrary().length
  writeLibrary([])
  return count
}
