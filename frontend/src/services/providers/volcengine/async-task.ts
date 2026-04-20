import type { AsyncTaskResult } from '../types'

const DEFAULT_POLL_INTERVAL = 3000
const DEFAULT_TIMEOUT = 600_000

export async function submitVolcengineTask(
  baseURL: string,
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<AsyncTaskResult> {
  const url = `${baseURL.replace(/\/+$/, '')}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`提交任务失败: HTTP ${response.status} ${text}`)
  }

  const data = await response.json() as Record<string, unknown>
  const taskId = String(data.task_id || '')

  if (!taskId) {
    throw new Error('提交任务成功但未返回 task_id')
  }

  return { taskId, status: 'pending', resultUrls: [] }
}

export async function pollVolcengineTask(
  baseURL: string,
  apiKey: string,
  taskId: string,
  options?: { interval?: number; timeout?: number }
): Promise<AsyncTaskResult> {
  const interval = options?.interval ?? DEFAULT_POLL_INTERVAL
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const pollUrl = `${baseURL.replace(/\/+$/, '')}/video/generation/tasks/${taskId}`

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`轮询任务失败: HTTP ${response.status} ${text}`)
    }

    const data = await response.json() as Record<string, unknown>
    const status = String(data.status || '').toLowerCase()

    if (status === 'completed') {
      const videoUrl = String(data.video_url || '')
      const urls: string[] = []
      if (videoUrl) urls.push(videoUrl)
      const lastFrameUrl = String(data.last_frame_url || '')
      if (lastFrameUrl) urls.push(lastFrameUrl)
      return { taskId, status: 'succeeded', resultUrls: urls }
    }

    if (status === 'failed') {
      const message = String(data.error_message || data.message || '任务失败')
      return { taskId, status: 'failed', resultUrls: [], error: message }
    }

    if (status === 'processing' || status === 'pending' || status === 'running') {
      await new Promise(resolve => setTimeout(resolve, interval))
      continue
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  return { taskId, status: 'failed', resultUrls: [], error: '任务超时' }
}
