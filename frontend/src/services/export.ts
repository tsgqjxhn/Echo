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
}

export const exportService = new ExportService()

export { ExportService }
