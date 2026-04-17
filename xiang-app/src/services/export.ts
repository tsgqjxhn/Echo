import { AppError } from './errors'
import { requestJSON } from './http'
import { triggerDownload } from './files'

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
}

class ExportService {
  async exportStandard(format: 'json' | 'md' = 'json'): Promise<ExportTask> {
    try {
      return await requestJSON<ExportTask>('/api/export/standard', {
        method: 'POST'
      }, { format })
    } catch (error) {
      console.error('[ExportService] standard export failed:', error)
      throw new AppError('EXPORT_FAILED', '生成导出文件失败')
    }
  }

  async exportFull(): Promise<ExportTask> {
    try {
      return await requestJSON<ExportTask>('/api/export/full', {
        method: 'POST'
      })
    } catch (error) {
      console.error('[ExportService] full export failed:', error)
      throw new AppError('EXPORT_FAILED', '生成完整备份失败')
    }
  }

  async exportSession(sessionId: string): Promise<ExportTask> {
    try {
      return await requestJSON<ExportTask>('/api/export/session', {
        method: 'POST'
      }, { session_id: sessionId })
    } catch (error) {
      console.error('[ExportService] session export failed:', error)
      throw new AppError('EXPORT_FAILED', '导出会话失败')
    }
  }

  async exportCharacter(characterId: string): Promise<ExportTask> {
    try {
      return await requestJSON<ExportTask>('/api/export/character', {
        method: 'POST'
      }, { character_id: characterId })
    } catch (error) {
      console.error('[ExportService] character export failed:', error)
      throw new AppError('EXPORT_FAILED', '导出角色失败')
    }
  }

  async getTask(taskId: string): Promise<ExportTask> {
    return requestJSON<ExportTask>(`/api/export/tasks/${encodeURIComponent(taskId)}`)
  }

  async downloadTask(task: ExportTask): Promise<void> {
    const latestTask = task.downloadUrl ? task : await this.getTask(task.id)

    if (!latestTask.downloadUrl) {
      throw new AppError('EXPORT_DOWNLOAD_FAILED', '导出文件尚未就绪')
    }

    triggerDownload(latestTask.downloadUrl, latestTask.filename)
  }
}

export const exportService = new ExportService()

export { ExportService }
