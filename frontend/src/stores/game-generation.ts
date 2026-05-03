import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChatContext } from '@/types/chat'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'
import { notifyApp } from '@/services/notification'
import { generateUUID } from '@/utils/uuid'

export type GameGenerationMode = 'create' | 'import'
export type GameGenerationPhase =
  | 'drafting-outline'
  | 'awaiting-outline-confirmation'
  | 'generating-game'
  | 'done'
  | 'error'

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
  }
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

export const useGameGenerationStore = defineStore('game-generation', () => {
  const tasks = ref<Record<string, GameGenerationTask>>({})
  const activeTaskId = ref('')
  const runningTaskIds = ref<string[]>([])

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

  async function streamIntoTask(
    taskId: string,
    target: 'outline' | 'output',
    context: ChatContext,
    donePhase: GameGenerationPhase
  ) {
    setRunning(taskId, true)
    patchTask(taskId, { error: '' })

    try {
      const service = await createLLMService()
      const stream = service.chatStreamAbortable(context)
      let content = ''

      for await (const chunk of stream.stream) {
        if (!chunk.content) continue
        content += chunk.content
        patchTask(taskId, { [target]: content } as Partial<GameGenerationTask>)
      }

      patchTask(taskId, { [target]: content, phase: donePhase } as Partial<GameGenerationTask>)
      const taskMode = tasks.value[taskId]?.mode || 'create'
      await notifyApp({
        title: target === 'outline' ? '游戏大纲已生成' : '游戏生成已完成',
        body: tasks.value[taskId]?.title || '游戏生成任务已更新',
        route: `/game/generate?mode=${taskMode}&task=${taskId}`,
        kind: 'game',
      })
    } catch (error) {
      patchTask(taskId, {
        phase: 'error',
        error: (error as Error).message || '游戏生成失败',
      })
      await notifyApp({
        title: '游戏生成失败',
        body: (error as Error).message || '请检查大模型配置后重试',
        route: `/game/generate?mode=${tasks.value[taskId]?.mode || 'create'}&task=${taskId}`,
        kind: 'game',
      })
    } finally {
      setRunning(taskId, false)
    }
  }

  function startOutline(payload: StartOutlinePayload): string {
    const sourceText = trimForPrompt(payload.sourceText)
    const title = payload.title?.trim() || extractTitle(sourceText, '新游戏大纲')
    const task = createTask('create', title, sourceText, payload.fileNames || [])
    upsertTask(task)

    const context: ChatContext = {
      systemPrompt: [
        '你是资深 H5 游戏制作人和系统策划。',
        '当前阶段只生成「游戏大纲」，交给玩家确认；不要输出完整代码。',
        '大纲必须包含：游戏名、题材定位、核心循环、玩家操作、资源/状态、关卡或进程、胜负条件、UI 页面结构、需要玩家确认的关键设定。',
        '输出要可执行、具体，避免空泛宣传语。',
      ].join('\n'),
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
      systemPrompt: [
        '你是资深 H5 游戏开发工程师。',
        '请基于玩家确认的大纲生成具体可运行的单文件 H5 游戏。',
        '必须输出完整 HTML 源码，包含 CSS 和 JavaScript，不能依赖外部网络资源。',
        '游戏需要有开始、游玩、失败/胜利或结算状态，代码应可直接保存为 index.html 运行。',
        '如果规则复杂，优先生成可玩的最小完整版本，再在代码注释中标出可扩展点。',
      ].join('\n'),
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
            '请生成完整可运行游戏。',
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
      systemPrompt: [
        '你是 H5 游戏导入与整合助手。',
        '玩家提供的是已有游戏文件、文件夹内容或游戏说明，请直接生成具体可运行的游戏，不需要先输出大纲。',
        '必须输出完整 HTML 源码，包含 CSS 和 JavaScript，不能依赖外部网络资源。',
        '如果输入是已有 HTML/CSS/JS，请尽量保留玩法并整合为单文件版本；如果输入不完整，请补齐为可玩的最小完整版本。',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: `请根据玩家文件直接生成游戏：\n\n${sourceText}`,
        },
      ],
    }

    void streamIntoTask(task.id, 'output', context, 'done')
    return task.id
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
    startOutline,
    confirmOutline,
    startImport,
    setActiveTask,
    clearTask,
  }
})
