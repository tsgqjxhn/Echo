/**
 * 动态 Prompt 模板系统类型定义
 *
 * 基于 LettuceAI 的 Entry 架构和 SillyTavern 的扩展提示系统,
 * 提供模块化、可排序、条件化的 prompt 组装能力。
 */

/**
 * Entry 注入位置
 */
export enum EntryPosition {
  /** 在 system prompt 中, 作为相对位置的一部分 */
  RELATIVE = 'relative',
  /** 插入到 chat 消息历史中 */
  IN_CHAT = 'in-chat',
  /** 仅在 turn count >= minTurns 时插入 */
  CONDITIONAL = 'conditional',
  /** 每隔 interval 轮插入一次 */
  INTERVAL = 'interval',
}

/**
 * Entry 条件检查类型
 */
export type EntryConditionCheck =
  | { type: 'minTurns'; value: number }
  | { type: 'maxTurns'; value: number }
  | { type: 'hasKeyword'; value: string }
  | { type: 'hasMemory'; value: boolean }
  | { type: 'hasLorebook'; value: boolean }
  | { type: 'mode'; value: string }

/**
 * 条件组: AND/OR 逻辑
 */
export interface EntryConditionGroup {
  operator: 'and' | 'or'
  checks: EntryConditionCheck[]
}

/**
 * 单个 Prompt Entry
 */
export interface PromptEntry {
  /** 唯一 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant'
  /** 注入位置 */
  position: EntryPosition
  /** 注入深度 (0 = 最靠近用户最新消息, 数值越大越靠前) */
  depth: number
  /** 排序优先级 (数值越大越靠前) */
  order: number
  /** 是否启用 */
  enabled: boolean
  /** 条件 (满足时才注入) */
  condition?: EntryConditionGroup
  /** interval 模式的间隔轮数 */
  interval?: number
  /** 条件模式的最小轮数 */
  minTurns?: number
  /** 内容模板 (支持 {{变量}} 宏) */
  content: string
}

/**
 * Prompt 模板: 一组有序的 Entry
 */
export interface PromptTemplate {
  id: string
  name: string
  entries: PromptEntry[]
  isDefault?: boolean
}

/**
 * 模板变量上下文: 提供给宏替换的数据
 */
export interface TemplateVariableContext {
  'char.name'?: string
  'char.desc'?: string
  'char.personality'?: string
  'char.behavior'?: string
  'char.values'?: string
  'char.scenario'?: string
  'char.greeting'?: string
  'persona'?: string
  'scene'?: string
  'memory'?: string
  'summary'?: string
  'lorebook'?: string
  'user.name'?: string
  'user.corePrompt'?: string
  'content_rules'?: string
  [key: string]: string | undefined
}
