import {
  clearGeneratedGameLibrary,
  deleteGeneratedGame,
  listGeneratedGames,
  type GeneratedGameLibraryItem,
} from '@/services/generated-game-library'

export type ManagedGameKind = 'embedded' | 'external'

export interface ManagedGameEntry {
  id: string
  name: string
  description: string
  kind: ManagedGameKind
  route: string
  icon: string
  iconKind?: 'text' | 'gomoku'
  iconClass: string
  primarySubcategory: string
  playCategories: string[]
  builtIn?: boolean
  generated?: boolean
}

const REGISTRY_HIDDEN_KEY = 'echo_hidden_managed_games_v1'

const BUILTIN_GAMES: ManagedGameEntry[] = []

function readHiddenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(REGISTRY_HIDDEN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function writeHiddenIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REGISTRY_HIDDEN_KEY, JSON.stringify([...ids]))
}

function generatedEntries(): ManagedGameEntry[] {
  return listGeneratedGames().map((item: GeneratedGameLibraryItem) => ({
    id: item.id,
    name: item.title,
    description: item.description || 'AI 生成或导入的游戏',
    kind: (item.triggerType === 'embedded' ? 'embedded' : 'external') as ManagedGameKind,
    route: `/game/play/${item.id}`,
    icon: '🎮',
    iconClass: 'generated-icon',
    primarySubcategory: item.triggerType === 'embedded' ? '益智休闲' : '策略竞技',
    playCategories: item.triggerType === 'embedded' ? ['puzzle-casual'] : ['strategy-action', 'card-rpg'],
    generated: true,
  }))
}

export function listManagedGames(options?: { includeHidden?: boolean }): ManagedGameEntry[] {
  const hidden = readHiddenIds()
  const merged = [...BUILTIN_GAMES, ...generatedEntries()]
  if (options?.includeHidden) return merged
  return merged.filter(game => !hidden.has(game.id))
}

export function listManagedGamesByKind(kind: ManagedGameKind, includeHidden = true): ManagedGameEntry[] {
  return listManagedGames({ includeHidden }).filter(game => game.kind === kind)
}

export function hideManagedGame(id: string): void {
  const hidden = readHiddenIds()
  hidden.add(id)
  writeHiddenIds(hidden)
}

export function restoreManagedGame(id: string): void {
  const hidden = readHiddenIds()
  hidden.delete(id)
  writeHiddenIds(hidden)
}

export function isManagedGameHidden(id: string): boolean {
  return readHiddenIds().has(id)
}

export function deleteManagedGame(id: string): boolean {
  const game = [...BUILTIN_GAMES, ...generatedEntries()].find(item => item.id === id)
  if (!game) return false
  if (game.generated) {
    deleteGeneratedGame(id)
    return true
  }
  hideManagedGame(id)
  return true
}

export function panelCatalogGames(): ManagedGameEntry[] {
  return listManagedGames({ includeHidden: false })
}

export function deleteAllManagedGames(): { removedGenerated: number; hiddenBuiltin: number } {
  const removedGenerated = clearGeneratedGameLibrary()
  const hiddenBuiltin = BUILTIN_GAMES.length
  writeHiddenIds(new Set(BUILTIN_GAMES.map(game => game.id)))
  return { removedGenerated, hiddenBuiltin }
}
