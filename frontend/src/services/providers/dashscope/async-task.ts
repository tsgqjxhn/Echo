export interface AsyncTaskResult {
  taskId: string
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  resultUrls: string[]
  error?: string
}

const DEFAULT_POLL_INTERVAL = 2000
const DEFAULT_TIMEOUT = 300_000

export async function pollDashScopeTask(
  baseURL: string,
  apiKey: string,
  taskId: string,
  options?: { interval?: number; timeout?: number }
): Promise<AsyncTaskResult> {
  const interval = options?.interval ?? DEFAULT_POLL_INTERVAL
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const taskUrl = `${baseURL.replace(/\/+$/, '')}/api/v1/tasks/${taskId}`

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const response = await fetch(taskUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`轮询任务失败: HTTP ${response.status} ${text}`)
    }

    const data = await response.json() as Record<string, unknown>
    const output = data.output as Record<string, unknown> | undefined
    const status = String(output?.task_status || '').toUpperCase()

    if (status === 'SUCCEEDED') {
      const results = output?.results as Array<Record<string, unknown>> | undefined
      const urls = Array.isArray(results)
        ? results.map(r => String(r.url || '')).filter(Boolean)
        : []
      return { taskId, status: 'succeeded', resultUrls: urls }
    }

    if (status === 'FAILED') {
      const message = (output?.message as string) || (output?.code as string) || '任务失败'
      return { taskId, status: 'failed', resultUrls: [], error: message }
    }

    if (status === 'PENDING' || status === 'RUNNING') {
      await new Promise(resolve => setTimeout(resolve, interval))
      continue
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  return { taskId, status: 'failed', resultUrls: [], error: '任务超时' }
}

export async function submitDashScopeTask(
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
  const output = data.output as Record<string, unknown> | undefined
  const taskId = String(output?.task_id || '')

  if (!taskId) {
    throw new Error('提交任务成功但未返回 task_id')
  }

  return { taskId, status: 'pending', resultUrls: [] }
}
