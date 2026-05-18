import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChatContext } from '@/types/chat'
import type { AbortableChatStream } from '@/services/llm-api'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'
import { getPromptById } from '@/services/system-prompt'
import { emitAppNotification } from '@/services/notification'
import { generateUUID } from '@/utils/uuid'

export type GameGenerationMode = 'create' | 'import'
export type GameGenerationPhase =
  | 'drafting-outline'
  | 'awaiting-outline-confirmation'
  | 'generating-game'
  | 'done'
  | 'error'

export interface ParsedGameFile {
  path: string
  content: string
  language?: string
}

export interface GameGenerationTask {
  id: string
  mode: GameGenerationMode
  phase: GameGenerationPhase
  title: string
  sourceText: string
  fileNames: string[]
  outline: string
  output: string
  error: string
  createdAt: number
  updatedAt: number
  parsedFiles: ParsedGameFile[]
}

interface StartOutlinePayload {
  title?: string
  sourceText: string
  fileNames?: string[]
}

interface StartImportPayload {
  title?: string
  sourceText: string
  fileNames?: string[]
}

function createTask(mode: GameGenerationMode, title: string, sourceText: string, fileNames: string[]): GameGenerationTask {
  const now = Date.now()
  return {
    id: generateUUID(),
    mode,
    phase: mode === 'create' ? 'drafting-outline' : 'generating-game',
    title,
    sourceText,
    fileNames,
    outline: '',
    output: '',
    error: '',
    createdAt: now,
    updatedAt: now,
    parsedFiles: [],
  }
}

export function parseGameFiles(output: string): ParsedGameFile[] {
  const files: ParsedGameFile[] = []
  // 匹配 ```<lang>:path 或 ```path 格式
  const codeBlockRegex = /```(?:(\w+):)?([^\n]+)\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(output)) !== null) {
    const lang = match[1]
    const path = match[2]?.trim()
    const content = match[3] || ''
    if (path) {
      files.push({ path, content, language: lang })
    }
  }
  // 回退：匹配 === path ===\ncontent 格式
  const altRegex = /===\s*([^\n=]+)\s*===\n([\s\S]*?)(?=\n===\s*[^\n=]+\s*===|$)/g
  while ((match = altRegex.exec(output)) !== null) {
    const path = match[1]?.trim()
    const content = match[2] || ''
    if (path && !files.some(f => f.path === path)) {
      files.push({ path, content })
    }
  }
  return files
}

function guessLanguage(path: string): string | undefined {
  const ext = path.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', scss: 'scss',
    js: 'javascript', ts: 'typescript', vue: 'vue',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown',
    py: 'python', java: 'java', xml: 'xml',
  }
  return ext ? map[ext] : undefined
}

function trimForPrompt(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 260_000
    ? `${trimmed.slice(0, 260_000)}\n\n[输入内容过长，已截断后发送给大模型]`
    : trimmed
}

function extractTitle(source: string, fallback: string): string {
  const firstLine = source
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)

  if (!firstLine) return fallback
  return firstLine.replace(/^#+\s*/, '').slice(0, 28) || fallback
}

/**
 * 从「系统提示词管理」中读取游戏生成相关的提示词。
 * - 优先取用户当前选用的版本（basic / advanced）
 * - 若用户禁用，仍回退到 basicPrompt，避免无指令地空跑模型
 */
function resolveGamePrompt(id: 'game-outline' | 'game-implementation' | 'game-import'): string {
  const prompt = getPromptById(id)
  if (!prompt) {
    console.warn(`[game-generation] 未找到系统提示词 ${id}，将使用空指令`)
    return ''
  }
  if (prompt.enabled) {
    return prompt.basicPrompt
  }
  // 用户禁用：仍取 basicPrompt 兜底，保证模型能正常工作
  return prompt.basicPrompt
}

export const useGameGenerationStore = defineStore('game-generation', () => {
  const tasks = ref<Record<string, GameGenerationTask>>({})
  const activeTaskId = ref('')
  const runningTaskIds = ref<string[]>([])
  const activeStreams = new Map<string, AbortableChatStream>()

  const taskList = computed(() =>
    Object.values(tasks.value).sort((left, right) => right.updatedAt - left.updatedAt)
  )
  const activeTask = computed(() => tasks.value[activeTaskId.value] || null)
  const isActiveTaskRunning = computed(() =>
    activeTask.value ? runningTaskIds.value.includes(activeTask.value.id) : false
  )

  function upsertTask(task: GameGenerationTask) {
    tasks.value = {
      ...tasks.value,
      [task.id]: {
        ...task,
        updatedAt: Date.now(),
      },
    }
    activeTaskId.value = task.id
  }

  function patchTask(taskId: string, patch: Partial<GameGenerationTask>) {
    const task = tasks.value[taskId]
    if (!task) return
    tasks.value = {
      ...tasks.value,
      [taskId]: {
        ...task,
        ...patch,
        updatedAt: Date.now(),
      },
    }
  }

  function setRunning(taskId: string, running: boolean) {
    const ids = new Set(runningTaskIds.value)
    if (running) {
      ids.add(taskId)
    } else {
      ids.delete(taskId)
    }
    runningTaskIds.value = Array.from(ids)
  }

  async function createLLMService(): Promise<LLMAPIService> {
    const config = await apiConfigService.getDefaultConfig('text')
    if (!config) {
      throw new Error('请先在设置里配置可用的大模型 API')
    }
    return new LLMAPIService(config)
  }

  function cancelTask(taskId: string): void {
    const stream = activeStreams.get(taskId)
    if (stream) {
      stream.abort()
      activeStreams.delete(taskId)
    }
    setRunning(taskId, false)
  }

  async function streamIntoTask(
    taskId: string,
    target: 'outline' | 'output',
    context: ChatContext,
    donePhase: GameGenerationPhase
  ) {
    // 如果同一 taskId 已经在运行，先取消旧的流
    cancelTask(taskId)

    setRunning(taskId, true)
    patchTask(taskId, { error: '' })

    try {
      const service = await createLLMService()
      const stream = service.chatStreamAbortable(context)
      activeStreams.set(taskId, stream)

      let content = ''

      for await (const chunk of stream.stream) {
        if (!chunk.content) continue
        content += chunk.content
        patchTask(taskId, { [target]: content } as Partial<GameGenerationTask>)
      }

      const extra: Partial<GameGenerationTask> = { [target]: content, phase: donePhase }
      if (donePhase === 'done' || donePhase === 'awaiting-outline-confirmation') {
        const files = parseGameFiles(content)
        files.forEach(f => {
          if (!f.language) f.language = guessLanguage(f.path)
        })
        extra.parsedFiles = files
      }
      patchTask(taskId, extra)

      const task = tasks.value[taskId]
      emitAppNotification({
        title: target === 'outline' ? '游戏大纲已生成' : '游戏生成已完成',
        body: task?.title || '游戏生成任务已更新',
        route: `/game/generate?mode=${task?.mode || 'create'}&task=${taskId}`,
      })
    } catch (error) {
      const task = tasks.value[taskId]
      patchTask(taskId, {
        phase: 'error',
        error: (error as Error).message || '游戏生成失败',
      })
      emitAppNotification({
        title: '游戏生成失败',
        body: (error as Error).message || '请检查大模型配置后重试',
        route: `/game/generate?mode=${task?.mode || 'create'}&task=${taskId}`,
      })
    } finally {
      activeStreams.delete(taskId)
      setRunning(taskId, false)
    }
  }

  function startOutline(payload: StartOutlinePayload): string {
    const sourceText = trimForPrompt(payload.sourceText)
    const title = payload.title?.trim() || extractTitle(sourceText, '新游戏大纲')
    const task = createTask('create', title, sourceText, payload.fileNames || [])
    upsertTask(task)

    const context: ChatContext = {
      systemPrompt: resolveGamePrompt('game-outline'),
      messages: [
        {
          role: 'user',
          content: `请根据以下规则或玩法设想生成游戏大纲：\n\n${sourceText}`,
        },
      ],
    }

    void streamIntoTask(task.id, 'outline', context, 'awaiting-outline-confirmation')
    return task.id
  }

  function confirmOutline(taskId: string): void {
    const task = tasks.value[taskId]
    if (!task || runningTaskIds.value.includes(taskId)) return

    patchTask(taskId, {
      phase: 'generating-game',
      output: '',
      error: '',
    })

    const context: ChatContext = {
      systemPrompt: resolveGamePrompt('game-implementation'),
      messages: [
        {
          role: 'user',
          content: [
            '原始玩家输入：',
            trimForPrompt(task.sourceText),
            '',
            '已确认游戏大纲：',
            task.outline,
            '',
            '请基于 Phaser 4 生成完整可运行游戏（单文件 index.html，本地引用 /games/_shared/phaser/phaser.min.js）。',
          ].join('\n'),
        },
      ],
    }

    void streamIntoTask(taskId, 'output', context, 'done')
  }

  function startImport(payload: StartImportPayload): string {
    const sourceText = trimForPrompt(payload.sourceText)
    const title = payload.title?.trim() || extractTitle(sourceText, '导入游戏')
    const task = createTask('import', title, sourceText, payload.fileNames || [])
    upsertTask(task)

    const context: ChatContext = {
      systemPrompt: resolveGamePrompt('game-import'),
      messages: [
        {
          role: 'user',
          content: `请根据玩家文件直接生成游戏（优先使用项目内置的 Phaser 4 框架，本地路径 /games/_shared/phaser/phaser.min.js）：\n\n${sourceText}`,
        },
      ],
    }

    void streamIntoTask(task.id, 'output', context, 'done')
    return task.id
  }

  function regenerateOutline(taskId: string, feedback: string): void {
    const task = tasks.value[taskId]
    if (!task || runningTaskIds.value.includes(taskId)) return

    patchTask(taskId, {
      phase: 'drafting-outline',
      error: '',
    })

    const context: ChatContext = {
      systemPrompt: resolveGamePrompt('game-outline'),
      messages: [
        {
          role: 'user',
          content: `请根据以下规则或玩法设想生成游戏大纲：\n\n${trimForPrompt(task.sourceText)}`,
        },
        {
          role: 'assistant',
          content: task.outline,
        },
        {
          role: 'user',
          content: feedback.trim().length > 0
            ? `请根据以下反馈重新优化大纲：\n${feedback.trim()}`
            : '请重新优化并生成更好的游戏大纲。',
        },
      ],
    }

    void streamIntoTask(taskId, 'outline', context, 'awaiting-outline-confirmation')
  }

  function regenerateGame(taskId: string, feedback: string): void {
    const task = tasks.value[taskId]
    if (!task || runningTaskIds.value.includes(taskId)) return

    patchTask(taskId, {
      phase: 'generating-game',
      output: '',
      error: '',
    })

    const context: ChatContext = {
      systemPrompt: resolveGamePrompt('game-implementation'),
      messages: [
        {
          role: 'user',
          content: [
            '原始玩家输入：',
            trimForPrompt(task.sourceText),
            '',
            '已确认游戏大纲：',
            task.outline,
            '',
            '请基于 Phaser 4 生成完整可运行游戏（单文件 index.html，本地引用 /games/_shared/phaser/phaser.min.js）。',
          ].join('\n'),
        },
        {
          role: 'assistant',
          content: task.output,
        },
        {
          role: 'user',
          content: feedback.trim().length > 0
            ? `请根据以下反馈重新优化游戏实现：\n${feedback.trim()}`
            : '请重新优化并生成更好的游戏实现。',
        },
      ],
    }

    void streamIntoTask(taskId, 'output', context, 'done')
  }

  function setActiveTask(taskId: string) {
    if (tasks.value[taskId]) {
      activeTaskId.value = taskId
    }
  }

  function clearTask(taskId: string) {
    const next = { ...tasks.value }
    delete next[taskId]
    tasks.value = next
    if (activeTaskId.value === taskId) {
      activeTaskId.value = taskList.value[0]?.id || ''
    }
  }

  return {
    tasks,
    activeTaskId,
    activeTask,
    taskList,
    runningTaskIds,
    isActiveTaskRunning,
    cancelTask,
    startOutline,
    confirmOutline,
    regenerateOutline,
    regenerateGame,
    startImport,
    setActiveTask,
    clearTask,
    patchTask,
  }
})
