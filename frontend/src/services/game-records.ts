import { STORAGE_KEYS } from '@/constants/storage-keys'

export type GameRecordsMap = Record<string, string>

export function getGameRecords(): GameRecordsMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.gameRecords) || '{}') as GameRecordsMap
  } catch {
    return {}
  }
}

export function setGameRecord(key: string, value: string): void {
  const records = getGameRecords()
  records[key] = value
  localStorage.setItem(STORAGE_KEYS.gameRecords, JSON.stringify(records))
}

export function getGameRecord(key: string): string | undefined {
  return getGameRecords()[key]
}
