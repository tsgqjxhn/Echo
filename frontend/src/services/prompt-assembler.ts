/**
 * Prompt Assembler: 将 PromptTemplate 的 entries 排序组装为最终 prompt
 * + 模板变量宏替换系统
 * + 统一 Prompt 组装 (constructPrompt)
 */

import {
  EntryPosition,
  type PromptTemplate,
  type TemplateVariableContext,
  type EntryConditionGroup,
} from '@/types/prompt-template'
import type { ChatMessage } from '@/types/chat'
import type { LorebookEntry } from '@/types/character'
import { getActivePrompts } from './system-prompt'

// ── Unified Prompt Assembly ──

/** 世界书词条分类类型 */
export type LorebookEntryType = 'profile' | 'world_info' | 'dialogue' | 'style'

/** 带分类的世界书词条 */
export interface TypedLorebookEntry extends LorebookEntry {
  type: LorebookEntryType
}

/** constructPrompt 上下文 */
export interface PromptContext {
  /** 系统级 system prompt（来自全局设置） */
  globalSystemPrompt?: string
  /** 用户自定义的系统提示词 */
  userSystemPrompt?: string
  /** 角色卡 system prompt */
  characterSystemPrompt?: string
  /** 世界书词条（已按 type/depth/order 排序） */
  lorebookEntries?: TypedLorebookEntry[]
  /** 对话历史 */
  messages?: ChatMessage[]
  /** 当前用户输入 */
  userInput?: string
  /** 最大上下文消息数 */
  maxContext?: number
}

const TYPE_PRIORITY: Record<LorebookEntryType, number> = {
  profile: 0,
  world_info: 1,
  dialogue: 2,
  style: 3,
}

/**
 * 世界书词条排序：
 * - 先按 type 优先级（profile → world_info → dialogue → style）
 * - 同一 type 内按 order 升序
 */
export function sortLorebookEntries(entries: TypedLorebookEntry[]): TypedLorebookEntry[] {
  return [...entries].sort((a, b) => {
    const prioA = TYPE_PRIORITY[a.type] ?? 999
    const prioB = TYPE_PRIORITY[b.type] ?? 999
    if (prioA !== prioB) return prioA - prioB
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

/**
 * 按规范顺序组装 prompt
 * 1. 系统级 system prompt（来自全局设置）
 * 2. user-defined system prompt
 * 3. 角色卡 system prompt
 * 4. 世界书词条（按 type/depth/order 排序后插入）
 * 5. 对话历史（按 max_context 截断后的消息列表）
 * 6. user input（当前用户输入）
 *
 * 每个部分之间用换行符分隔，空内容跳过。
 */
export function constructPrompt(context: PromptContext): {
  systemPrompt: string
  messages: ChatMessage[]
} {
  const sections: string[] = []

  // 1. 系统级 system prompt
  if (context.globalSystemPrompt?.trim()) {
    sections.push(context.globalSystemPrompt.trim())
  }

  // 2. 用户自定义 system prompt
  if (context.userSystemPrompt?.trim()) {
    sections.push(context.userSystemPrompt.trim())
  }

  // 3. 角色卡 system prompt
  if (context.characterSystemPrompt?.trim()) {
    sections.push(context.characterSystemPrompt.trim())
  }

  // 4. 世界书词条
  if (context.lorebookEntries && context.lorebookEntries.length > 0) {
    const sorted = sortLorebookEntries(context.lorebookEntries)
    const combined = sorted.map(e => e.content.trim()).filter(Boolean).join('\n')
    if (combined) {
      sections.push(combined)
    }
  }

  const systemPrompt = sections.join('\n\n')

  // 5. 对话历史（截断）
  let history = context.messages ? [...context.messages] : []
  if (context.maxContext !== undefined && context.maxContext >= 0) {
    history = history.slice(-context.maxContext)
  }

  // 6. 当前用户输入
  if (context.userInput?.trim()) {
    history = [...history, { role: 'user' as const, content: context.userInput.trim() }]
  }

  return { systemPrompt, messages: history }
}

// ── Template variable macro replacement ──

const MACRO_PATTERN = /\{\{(\w[\w.]*)\}\}/g

/**
 * 替换模板中的 {{变量}} 宏
 */
export function resolveMacros(text: string, ctx: TemplateVariableContext): string {
  return text.replace(MACRO_PATTERN, (match, key: string) => {
    const value = ctx[key]
    return value !== undefined ? value : match
  })
}

/**
 * 从 ICharacter 等数据构建 TemplateVariableContext
 */
export function buildVariableContext(params: {
  characterName?: string
  characterDesc?: string
  personality?: string
  behavior?: string
  values?: string
  scenario?: string
  greeting?: string
  persona?: string
  memorySummary?: string
  sessionSummary?: string
  lorebookText?: string
  userName?: string
  userCorePrompt?: string
}): TemplateVariableContext {
  return {
    'char.name': params.characterName,
    'char.desc': params.characterDesc,
    'char.personality': params.personality,
    'char.behavior': params.behavior,
    'char.values': params.values,
    'char.scenario': params.scenario,
    'char.greeting': params.greeting,
    'persona': params.persona,
    'summary': params.sessionSummary,
    'memory': params.memorySummary,
    'lorebook': params.lorebookText,
    'user.name': params.userName,
  }
}

// ── Condition evaluation ──

interface ConditionContext {
  turnCount: number
  hasMemory: boolean
  hasLorebook: boolean
  mode?: string
  lastMessageText?: string
}

function evaluateConditionGroup(group: EntryConditionGroup, ctx: ConditionContext): boolean {
  const results = group.checks.map(check => evaluateCondition(check, ctx))
  return group.operator === 'and'
    ? results.every(Boolean)
    : results.some(Boolean)
}

function evaluateCondition(check: EntryConditionGroup['checks'][number], ctx: ConditionContext): boolean {
  switch (check.type) {
    case 'minTurns': return ctx.turnCount >= check.value
    case 'maxTurns': return ctx.turnCount <= check.value
    case 'hasKeyword': return (ctx.lastMessageText || '').includes(check.value)
    case 'hasMemory': return ctx.hasMemory === check.value
    case 'hasLorebook': return ctx.hasLorebook === check.value
    case 'mode': return ctx.mode === check.value
    default: return true
  }
}

// ── Prompt Assembly ──

export interface AssembledPrompt {
  /** System prompt 部分 */
  systemSections: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  /** 需要插入 chat 中的 entries, 按 depth 排序 */
  chatInsertions: Array<{ depth: number; role: 'system' | 'user' | 'assistant'; content: string }>
}

/**
 * 组装 prompt: 将模板 entries 按条件/优先级分类为 system 和 chat 两部分
 * @deprecated 请使用 constructPrompt 进行统一 prompt 组装
 */
export function assemblePrompt(
  template: PromptTemplate,
  variableCtx: TemplateVariableContext,
  conditionCtx: ConditionContext
): AssembledPrompt {
  const enabled = template.entries
    .filter(e => e.enabled)
    .filter(e => {
      if (!e.condition) return true
      return evaluateConditionGroup(e.condition, conditionCtx)
    })

  // Interval filter
  const filtered = enabled.filter(e => {
    if (e.position === EntryPosition.INTERVAL && e.interval) {
      return conditionCtx.turnCount % e.interval === 0
    }
    if (e.position === EntryPosition.CONDITIONAL && e.minTurns) {
      return conditionCtx.turnCount >= e.minTurns
    }
    return true
  })

  // Resolve macros
  const resolved = filtered.map(e => ({
    ...e,
    content: resolveMacros(e.content, variableCtx),
  }))

  // Partition by position
  const systemEntries = resolved
    .filter(e => e.position === EntryPosition.RELATIVE || e.position === EntryPosition.CONDITIONAL || e.position === EntryPosition.INTERVAL)
    .sort((a, b) => b.order - a.order)

  const chatEntries = resolved
    .filter(e => e.position === EntryPosition.IN_CHAT)
    .sort((a, b) => b.depth - a.depth)

  return {
    systemSections: systemEntries.map(e => ({ role: e.role, content: e.content })),
    chatInsertions: chatEntries.map(e => ({ depth: e.depth, role: e.role, content: e.content })),
  }
}

/**
 * 将 chatInsertions 注入到消息历史中
 */
export function injectChatEntries(
  messages: ChatMessage[],
  insertions: Array<{ depth: number; role: 'system' | 'user' | 'assistant'; content: string }>
): ChatMessage[] {
  if (insertions.length === 0) return messages

  const result = [...messages]
  for (const ins of insertions) {
    const idx = Math.max(0, result.length - ins.depth)
    result.splice(idx, 0, { role: ins.role, content: ins.content })
  }
  return result
}

/**
 * 构建默认模板 (兼容现有 chat.ts 的分层组装逻辑)
 * @deprecated 请使用 constructPrompt 进行统一 prompt 组装
 */
export function buildDefaultTemplate(): PromptTemplate {
  const entries: PromptTemplate['entries'] = [
    {
      id: 'persona',
      name: '角色身份 (Anchor-Traits-Voice)',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 100,
      enabled: true,
      content: '{{persona}}',
    },
    {
      id: 'scenario',
      name: '场景设定',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 90,
      enabled: true,
      content: '{{char.scenario}}',
    },
    {
      id: 'description',
      name: '角色描述',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 80,
      enabled: true,
      content: '{{char.desc}}',
    },
    {
      id: 'memory',
      name: '长期记忆',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 70,
      enabled: true,
      content: '{{memory}}',
    },
    {
      id: 'summary',
      name: '对话摘要',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 65,
      enabled: true,
      content: '{{summary}}',
    },
    {
      id: 'lorebook',
      name: '世界知识',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 60,
      enabled: true,
      content: '{{lorebook}}',
    },
    {
      id: 'user_profile',
      name: '用户画像',
      role: 'system',
      position: EntryPosition.RELATIVE,
      depth: 0,
      order: 50,
      enabled: true,
      content: '{{user.name}}',
    },
    {
      id: 'reminder',
      name: '角色维持提醒',
      role: 'system',
      position: EntryPosition.IN_CHAT,
      depth: 2,
      order: 10,
      enabled: true,
      content: '[系统提醒] 请继续保持{{char.name}}的语气和性格。记住你们的关系状态，用自然的口吻回复。不要总结、不要解释、不要跳出角色。',
    },
  ]

  // 注入启用的系统提示词
  try {
    const activePrompts = getActivePrompts()
    for (const prompt of activePrompts) {
      const pos = prompt.injectionPosition
      if (pos === 'system-top' || pos === 'system-middle' || pos === 'system-bottom') {
        const text = prompt.basicPrompt
        entries.push({
          id: `sys-${prompt.id}`,
          name: prompt.name,
          role: 'system',
          position: EntryPosition.RELATIVE,
          depth: 0,
          order: prompt.priority * 10,
          enabled: true,
          content: text,
        })
      }
    }
  } catch {
    // 向后兼容：系统提示词加载失败时不影响现有功能
  }

  return {
    id: 'default',
    name: '默认模板',
    isDefault: true,
    entries,
  }
}
