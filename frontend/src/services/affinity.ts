import { STORAGE_KEYS } from '@/constants/storage-keys'

export function getAffinityMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.affinity) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}

export function getAffinity(charId: string): number | undefined {
  const map = getAffinityMap()
  return map[charId]
}

export function setAffinity(charId: string, val: number): void {
  const map = getAffinityMap()
  map[charId] = Math.max(0, Math.min(100, val))
  localStorage.setItem(STORAGE_KEYS.affinity, JSON.stringify(map))
}

export function ensureAffinity(charId: string, initial: number): number {
  const existing = getAffinity(charId)
  if (existing !== undefined) return existing
  setAffinity(charId, initial)
  return initial
}
