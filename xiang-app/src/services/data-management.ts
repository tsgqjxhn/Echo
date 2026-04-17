import type { ICharacter } from '@/types/character'
import { AppError } from './errors'
import { buildAPIURL, requestJSON } from './http'

type ImportMode = 'merge' | 'replace'

export interface DataOverview {
  characterCount: number
  sessionCount: number
  messageCount: number
  apiConfigCount: number
  gameStateCount: number
}

export interface ImportOptions {
  mode?: ImportMode
}

export interface ImportSummary extends DataOverview {
  mode: ImportMode
}

export interface StoryImportResult {
  id: string
  title: string
  sourceName?: string | null
  sourceFormat?: string | null
  version?: string | null
  characterName?: string | null
  entryDay?: string | null
  isDefault: boolean
  createdAt: number
  updatedAt: number
  segments: Array<Record<string, unknown>>
}

async function postFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new AppError('REQUEST_FAILED', text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

class DataManagementService {
  async getOverview(): Promise<DataOverview> {
    try {
      return await requestJSON<DataOverview>('/api/overview')
    } catch (error) {
      console.error('[DataManagementService] overview failed:', error)
      throw new AppError('OVERVIEW_FAILED', '读取数据概览失败')
    }
  }

  async importFromFile(file: File, options: ImportOptions = {}): Promise<ImportSummary> {
    const mode = options.mode || 'merge'
    const formData = new FormData()
    formData.append('file', file, file.name)

    try {
      return await postFormData<ImportSummary>(buildAPIURL('/api/import/full', { mode }), formData)
    } catch (error) {
      console.error('[DataManagementService] full import failed:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('DATA_IMPORT_FAILED', '导入数据失败，请确认文件内容完整')
    }
  }

  async importCharacterDocument(file: File, category: string): Promise<ICharacter> {
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('category', category)

    try {
      return await postFormData<ICharacter>(buildAPIURL('/api/import/character'), formData)
    } catch (error) {
      console.error('[DataManagementService] character import failed:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('CHARACTER_IMPORT_FAILED', '导入角色失败')
    }
  }

  async importStoryFile(file: File): Promise<StoryImportResult> {
    const formData = new FormData()
    formData.append('file', file, file.name)

    try {
      return await postFormData<StoryImportResult>(buildAPIURL('/api/import/story'), formData)
    } catch (error) {
      console.error('[DataManagementService] story import failed:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('STORY_IMPORT_FAILED', '导入剧情失败')
    }
  }
}

export const dataManagementService = new DataManagementService()

export { DataManagementService }
