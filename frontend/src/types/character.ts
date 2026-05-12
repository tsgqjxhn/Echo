import type { WorldBook } from './world-book'

export interface GroupMember {
  /** 成员唯一标识 */
  id: string
  /** 角色名称 */
  name: string
  /** 头像URL */
  avatar?: string
  /** 一句话描述/标签 */
  description?: string
  /** 性格特征 */
  personality?: string
  /** 说话风格 */
  speakingStyle?: string
  /** 角色设定（深度配置时使用） */
  settings?: string
  /** 是否为旁白角色 */
  isNarrator?: boolean
  /** 配置模式：simple=简单配置, deep=深度配置 */
  configMode?: 'simple' | 'deep'
}

/**
 * 结构化人设 — Anchor-Traits-Voice 框架
 */
export interface CharacterPersona {
  /** 身份锁: 150 字以内的核心身份声明 (姓名 + 定位 + 视角) */
  anchor: string
  /** 2-3 个核心性格特质, 如 ["冷静", "直接", "情感稳定"] */
  traits: string[]
  /** 交流风格: 语气、长度、叙述方式 */
  voice: string
}

/**
 * Depth Prompt — 深层角色提示, 注入在 prompt 不同深度
 */
export interface DepthPrompt {
  /** 插入深度 (0 = 最靠近用户消息) */
  depth: number
  /** 提示内容 */
  prompt: string
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant'
}

/**
 * Lorebook 条目 — 关键词触发的世界知识
 */
export interface LorebookEntry {
  /** 条目 ID */
  id: string
  /** 触发关键词列表 (任一匹配即激活) */
  keywords: string[]
  /** 条目内容 */
  content: string
  /** 注入优先级 (数值越大越靠前) */
  order: number
  /** 是否启用 */
  enabled: boolean
  /** 限定角色名 (空 = 全局) */
  characterName?: string
  /** 位置: 0=对话前,1=对话后,2=EM顶部,3=EM底部,4=AN顶部,5=AN底部,6=深度位置,7=出口 */
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  /** 注入深度 (仅 position=6 时生效) */
  depth: number
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant'
}

/**
 * Lorebook 配置
 */
export interface Lorebook {
  /** 条目列表 */
  entries: LorebookEntry[]
  /** 扫描最近 N 条消息进行关键词匹配 */
  scanRange: number
}

export type CharacterMode =
  | 'challenge-dialogue'
  | 'free-dialogue'
  | 'group-chat'
  | 'group-challenge'
  | 'multi-free'
  | 'multi-story'
  | 'multi-game'

export interface ICharacter {
  id: string
  name: string
  avatar?: string
  background?: string
  description: string
  greeting?: string
  settings: string
  isFavorite: boolean
  createdAt: number
  updatedAt: number
  mode?: CharacterMode
  category?: string
  subCategory?: string
  avatarTone?: string
  backgroundImage?: string
  personality?: string
  behavior?: string
  values?: string
  /** @deprecated 使用 structuredMembers 替代 */
  members?: string[]
  /** @deprecated 使用 structuredMembers 替代 */
  memberIds?: string[]
  /** 结构化群成员列表 */
  structuredMembers?: GroupMember[]
  groupAvatar?: string
  groupAnnouncement?: string
  groupDescription?: string
  groupChatMode?: 'queue' | 'free'
  tags?: string[]
  sourceType?: 'manual' | 'document-import' | 'builtin-story'
  sourceName?: string
  sceneTime?: string
  isLiked?: boolean
  isFriend?: boolean
  exampleDialogue?: string
  /** 结构化人设 (Anchor-Traits-Voice 框架) */
  persona?: CharacterPersona
  /** 场景设定: 对话发生的时间/地点/背景 */
  scenario?: string
  /** 深层角色提示, 注入在 prompt 不同深度 */
  depthPrompt?: DepthPrompt
  /** Lorebook 世界知识库 */
  lorebook?: Lorebook
  /** 备选开场白列表 */
  alternateGreetings?: string[]
  /** 角色聊天背景图 */
  chatBackground?: string
  /** 整体聊天背景图 */
  globalBackground?: string
  /** 角色切换动图 */
  switchAnimation?: string
  /** 角色情感表达动图列表 */
  emotionAnimations?: EmotionAnimation[]
  /** 导入的游戏数据（规则、脚本、关卡等） */
  gameData?: string
  /** 世界书列表 — 独立命名的可复用知识库 */
  worldBooks?: WorldBook[]
}

export interface EmotionAnimation {
  emotion: string
  animationUrl: string
}

export interface CharacterTTS {
  voice: string
  weight: number
}

export interface CreateCharacterRequest {
  name: string
  avatar?: string
  background?: string
  description: string
  greeting?: string
  settings: string
  mode?: CharacterMode
  category?: string
  subCategory?: string
  avatarTone?: string
  backgroundImage?: string
  personality?: string
  behavior?: string
  values?: string
  members?: string[]
  structuredMembers?: GroupMember[]
  tags?: string[]
  sourceType?: ICharacter['sourceType']
  sourceName?: string
  sceneTime?: string
  exampleDialogue?: string
  persona?: CharacterPersona
  scenario?: string
  depthPrompt?: DepthPrompt
  lorebook?: Lorebook
  alternateGreetings?: string[]
  chatBackground?: string
  globalBackground?: string
  switchAnimation?: string
  emotionAnimations?: EmotionAnimation[]
  worldBooks?: WorldBook[]
}

export interface UpdateCharacterRequest extends CreateCharacterRequest {
  id: string
}

export interface CharacterFilter {
  favorite?: boolean
  keyword?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface CharacterValidationResult {
  valid: boolean
  errors: string[]
}
