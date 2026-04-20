import type { ICharacter } from '@/types/character'
import { generateUUID } from '@/utils/uuid'
import { AppError } from './errors'
import {
  getSnapshotOverview,
  importSnapshot,
  type SnapshotImportSummary,
  type SnapshotOverview,
} from './local-snapshot'

type ImportMode = 'merge' | 'replace'

export type DataOverview = SnapshotOverview

export interface ImportOptions {
  mode?: ImportMode
}

export type ImportSummary = SnapshotImportSummary

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

function buildCharacterFromDocument(filename: string, content: string, category: string): ICharacter {
  const normalized = content.replace(/\s+/g, ' ').trim()
  const timestamp = Date.now()
  const description = (normalized.slice(0, 180) || '由导入文档生成的角色设定。').trim()
  const excerpt = (normalized.slice(0, 520) || '原文档内容为空。').trim()

  return {
    id: generateUUID(),
    name: filename.replace(/\.[^.]+$/, '') || '导入角色',
    avatar: '',
    background: `${category} / 导入文档`,
    description,
    greeting: `我已经读完《${filename || '导入文档'}》里的内容，你想从哪里开始聊？`,
    settings: `文档导入设定\n\n内容摘要：${excerpt}`,
    isFavorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    mode: 'free-dialogue',
    category,
    subCategory: '导入文档',
    avatarTone: 'silver',
    backgroundImage: '',
    personality: '善于根据资料展开交流',
    behavior: '优先围绕导入内容继续展开',
    values: '保留原文档中的关键信息',
    members: [],
    tags: [category, '导入文档'],
    sourceType: 'document-import',
    sourceName: filename,
  }
}

class DataManagementService {
  async getOverview(): Promise<DataOverview> {
    try {
      return await getSnapshotOverview()
    } catch (error) {
      console.error('[DataManagementService] overview failed:', error)
      throw new AppError('OVERVIEW_FAILED', '读取数据概览失败')
    }
  }

  async importFromFile(file: File, options: ImportOptions = {}): Promise<ImportSummary> {
    const mode = options.mode || 'merge'

    try {
      const payload = JSON.parse(await file.text()) as Record<string, unknown>
      return await importSnapshot(payload, mode)
    } catch (error) {
      console.error('[DataManagementService] full import failed:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('DATA_IMPORT_FAILED', '导入数据失败，请确认文件内容完整')
    }
  }

  async importCharacterDocument(file: File, category: string): Promise<ICharacter> {
    try {
      return buildCharacterFromDocument(file.name, await file.text(), category)
    } catch (error) {
      console.error('[DataManagementService] character import failed:', error)
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('CHARACTER_IMPORT_FAILED', '导入角色失败')
    }
  }

  async importStoryFile(file: File): Promise<StoryImportResult> {
    try {
      const content = await file.text()
      const timestamp = Date.now()
      const title =
        content.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
        file.name.replace(/\.[^.]+$/, '') ||
        '导入剧情'
      const characterName = content.match(/^##\s+角色[:：]\s*(.+)$/m)?.[1]?.trim() || null
      const entryDay = content.match(/^#\s*(第.+天)/m)?.[1]?.trim() || null

      return {
        id: generateUUID(),
        title,
        sourceName: file.name,
        sourceFormat: 'markdown',
        version: '1.0',
        characterName,
        entryDay,
        isDefault: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        segments: [],
      }
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
