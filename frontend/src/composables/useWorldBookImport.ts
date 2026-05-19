import { parseWorldBookFromJSON } from '@/utils/world-book-import'
import type { WorldBookUI } from '@/types/world-book-ui'

export function useWorldBookImport() {
  function parseFromJson(json: unknown): WorldBookUI | null {
    return parseWorldBookFromJSON(json)
  }

  function parseFromFile(file: File): Promise<WorldBookUI | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result || ''))
          resolve(parseFromJson(json))
        } catch {
          resolve(null)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  return { parseFromJson, parseFromFile }
}
