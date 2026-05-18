import type { IChatSession } from '@/types/chat'
import type { APIConfig } from '@/types/api-config'
import { generateUUID } from '@/utils/uuid'
import { AppError } from './errors'
import { triggerDownloadBlob } from './files'
import {
  buildBackupSnapshot,
  buildCharacterSnapshot,
  buildSessionSnapshot,
  buildStandardSnapshot,
  type BackupSnapshot,
  type StandardSnapshot,
} from './local-snapshot'
import { getStorageDriver } from './storage'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000'

export interface ExportTask {
  id: string
  exportType: string
  status: string
  filename: string
  assetId?: string | null
  downloadUrl?: string | null
  detail?: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  blob?: Blob
}

const taskCache = new Map<string, ExportTask>()

function createTask(exportType: string, filename: string, blob: Blob): ExportTask {
  const timestamp = Date.now()
  const task: ExportTask = {
    id: generateUUID(),
    exportType,
    status: 'completed',
    filename,
    assetId: null,
    downloadUrl: null,
    detail: { size: blob.size },
    createdAt: timestamp,
    updatedAt: timestamp,
    blob,
  }

  taskCache.set(task.id, task)
  return task
}

function stringifySnapshot(snapshot: StandardSnapshot | BackupSnapshot): Blob {
  return new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
}

class ExportService {
  async exportStandard(_format?: 'json' | 'md'): Promise<ExportTask> {
    try {
      const snapshot = await buildStandardSnapshot()
      return createTask('standard', `xiang-export-${Date.now()}.json`, stringifySnapshot(snapshot))
    } catch (error) {
      console.error('[ExportService] standard export failed:', error)
      throw new AppError('EXPORT_FAILED', '生成导出文件失败')
    }
  }

  async exportFull(): Promise<ExportTask> {
    try {
      const snapshot = await buildBackupSnapshot()
      return createTask('backup', `xiang-backup-${Date.now()}.json`, stringifySnapshot(snapshot))
    } catch (error) {
      console.error('[ExportService] full export failed:', error)
      throw new AppError('EXPORT_FAILED', '生成完整备份失败')
    }
  }

  async exportSession(sessionId: string): Promise<ExportTask> {
    try {
      const snapshot = await buildSessionSnapshot(sessionId)
      return createTask('session', `xiang-session-${sessionId}-${Date.now()}.json`, stringifySnapshot(snapshot))
    } catch (error) {
      console.error('[ExportService] session export failed:', error)
      throw new AppError('EXPORT_FAILED', '导出会话失败')
    }
  }

  async exportCharacter(characterId: string): Promise<ExportTask> {
    try {
      const snapshot = await buildCharacterSnapshot(characterId)
      return createTask('character', `xiang-character-${characterId}-${Date.now()}.json`, stringifySnapshot(snapshot))
    } catch (error) {
      console.error('[ExportService] character export failed:', error)
      throw new AppError('EXPORT_FAILED', '导出角色失败')
    }
  }

  async getTask(taskId: string): Promise<ExportTask> {
    const task = taskCache.get(taskId)
    if (!task) {
      throw new AppError('EXPORT_DOWNLOAD_FAILED', '导出任务不存在')
    }
    return task
  }

  async downloadTask(task: ExportTask): Promise<void> {
    const latestTask = task.blob ? task : await this.getTask(task.id)

    if (!latestTask.blob) {
      throw new AppError('EXPORT_DOWNLOAD_FAILED', '导出文件尚未就绪')
    }

    await triggerDownloadBlob(latestTask.blob, latestTask.filename)
  }
  async exportCustom(options: {
    characters?: string[]
    sessions?: string[]
    games?: string[]
    includeApiConfigs?: boolean
    includeApiKeys?: boolean
    includeGameStates?: boolean
    includeSettings?: string[]
  }): Promise<ExportTask> {
    try {
      const standard = await buildStandardSnapshot()

      const snapshot: Partial<StandardSnapshot> = {
        version: '1.0',
        exportedAt: Date.now(),
        appVersion: standard.appVersion,
        user: standard.user,
      }

      const hasCharacterScope = options.characters !== undefined
      const hasSessionScope = options.sessions !== undefined
      const hasGameScope = options.games !== undefined
      const hasApiScope = options.includeApiConfigs !== undefined
      const hasSettingsScope = options.includeSettings !== undefined

      if (hasCharacterScope && options.characters?.length) {
        snapshot.characters = standard.characters.filter(c =>
          options.characters?.includes(c.id)
        )
        const charIds = new Set(options.characters)
        const sessions = standard.sessions.filter(s => charIds.has(s.characterId))
        snapshot.sessions = sessions
        snapshot.messages = Object.fromEntries(
          Object.entries(standard.messages).filter(([sid]) =>
            sessions.some(s => s.id === sid)
          )
        )
      }

      if (hasSessionScope && options.sessions?.length) {
        const existingSessions = snapshot.sessions || []
        const newSessions = standard.sessions.filter(s =>
          options.sessions?.includes(s.id) &&
          !existingSessions.some(es => es.id === s.id)
        )
        snapshot.sessions = [...existingSessions, ...newSessions]
        const sessionIds = new Set((snapshot.sessions as IChatSession[]).map(s => s.id))
        snapshot.messages = Object.fromEntries(
          Object.entries(standard.messages).filter(([sid]) => sessionIds.has(sid))
        )
      }

      if (!hasCharacterScope && !hasSessionScope) {
        snapshot.characters = standard.characters
        snapshot.sessions = standard.sessions
        snapshot.messages = standard.messages
      }

      if (hasApiScope && options.includeApiConfigs) {
        snapshot.apiConfigs = options.includeApiKeys
          ? standard.apiConfigs
          : standard.apiConfigs.map(config => {
              const { apiKey: _apiKey, ...rest } = config
              return rest as APIConfig
            })
      }

      if (hasGameScope && options.games?.length) {
        snapshot.gameStates = standard.gameStates.filter(g =>
          options.games?.includes(g.id)
        )
      } else if (hasGameScope) {
        snapshot.gameStates = []
      }

      if (hasSettingsScope && options.includeSettings?.length) {
        const settings: Record<string, unknown> = {}
        const storage = getStorageDriver()
        for (const key of options.includeSettings) {
          const raw = await storage.getUserSetting(key)
          if (raw) {
            try { settings[key] = JSON.parse(raw) } catch { settings[key] = raw }
          }
        }
        ;(snapshot as Record<string, unknown>).settings = settings
      }

      return createTask(
        'custom',
        `xiang-custom-${Date.now()}.json`,
        new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      )
    } catch (error) {
      console.error('[ExportService] custom export failed:', error)
      throw new AppError('EXPORT_FAILED', '生成自定义导出文件失败')
    }
  }

  async exportAllCharactersAsPNG(): Promise<void> {
    const response = await fetch(`${API_BASE}/api/export/characters/png`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new AppError('EXPORT_FAILED', `导出 PNG 失败: ${response.status}`)
    }
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
    const filename = filenameMatch ? filenameMatch[1] : `xiang-characters-${Date.now()}.zip`
    await triggerDownloadBlob(blob, filename)
  }

  async exportAllCharactersAsJSON(): Promise<void> {
    const response = await fetch(`${API_BASE}/api/export/characters/json`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new AppError('EXPORT_FAILED', `导出 JSON 失败: ${response.status}`)
    }
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
    const filename = filenameMatch ? filenameMatch[1] : `xiang-characters-json-${Date.now()}.zip`
    await triggerDownloadBlob(blob, filename)
  }
}

export const exportService = new ExportService()

export { ExportService }
