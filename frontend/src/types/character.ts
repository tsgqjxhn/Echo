import type { WorldBook } from './world-book'
import type { PlotCardData } from './plot-card'
import type { GameCardData } from './game-card'
import type { ItemAttributeCardData } from './item-attribute-card'
import type { GlobalCardData } from './global-card'

export interface CharacterMultimedia {
  /** 语音设置 */
  voice: {
    enabled: boolean
    voiceId?: string
    voiceName?: string
    speechRate?: number
    pitch?: number
    volume?: number
    autoRead?: 'off' | 'click' | 'auto'
    emotionStyle?: string
  }
  /** 图片设置 */
  image: {
    avatar?: string
    chatBackground?: string
    coverImage?: string
    switchAnimation?: string
    emotionImages?: Array<{ emotion: string; url: string }>
  }
  /** 视频设置 */
  video: {
    introVideo?: string
    idleVideo?: string
    globalBackgroundVideo?: string
    emotionVideos?: Array<{ emotion: string; url: string }>
  }
}

// ========== 角色构建块 — 低级设定 ==========

/**
 * 负向特征与行为禁忌
 * 单一精准描述角色"不做"或"排斥"的行为
 */
export interface NegativeTrait {
  id: string
  /** 单一精准描述，如"绝不主动道歉"、"排斥身体接触" */
  content: string
}

/**
 * 客观物理特征清单
 * 角色外观的客观事实描述
 */
export interface PhysicalFeature {
  id: string
  /** 客观事实描述，如"蓝眼睛"、"左手有旧伤" */
  content: string
}

/**
 * 语言习惯与语用特征
 * 描述角色的说话方式和语言风格
 */
export interface SpeechPattern {
  id: string
  /** 语言特征分类 */
  category: 'sentence-length' | 'catchphrase' | 'interjection' | 'slang' | 'address' | 'rhetorical-question' | 'other'
  /** 语言特征描述 */
  content: string
}

/**
 * 多重情境开场白
 * 根据不同的对话情境提供对应的开场白
 */
export interface ContextualGreeting {
  id: string
  /** 预设情境类型 */
  context: 'first-meet' | 'reunion' | 'conflict' | 'comfort' | 'task-start' | 'group-entry' | 'other'
  /** 开场白内容 */
  content: string
  /** 自定义情境标签（当 context 为 'other' 时使用） */
  contextLabel?: string
}

/**
 * 系统级越狱与输出排版规范
 * 控制角色的输出格式和身份边界
 */
export interface OutputFormatRules {
  /** 角色身份边界说明 */
  identityBoundary?: string
  /** 动作描写格式，如"用*包裹动作" */
  actionFormat?: string
  /** 语言描写格式，如"用双引号包裹对话" */
  speechFormat?: string
  /** 超出认知范围时的回应方式 */
  outOfScopeResponse?: string
}

/**
 * 上下文控制补充词条
 * 用于动态角色注释和关系演算
 */
export interface ContextControlEntry {
  /** 动态角色注释/心理锚点 */
  dynamicAnchor?: string
  /** 用户画像与长期关系演算 */
  userPersona?: string
  /** 契合度/联结度指标 0-100 */
  compatibilityScore?: number
  /** 当前关系阶段 */
  relationshipStage?: 'stranger' | 'familiar' | 'trusted' | 'intimate' | 'hostile' | 'reconciled'
  /** 关系阶段触发条件 */
  relationshipTrigger?: string
}

/**
 * 示例对话
 * 用于指导模型的对话风格
 */
export interface ExampleDialogue {
  id: string
  /** 用户输入示例 */
  userInput: string
  /** 角色回复示例 */
  characterResponse: string
}

// ========== 媒体设定相关接口 ==========

/**
 * 媒体权重配置
 * 控制角色相关的视觉呈现参数
 */
export interface MediaWeights {
  /** 是否允许聊天中按角色画风生成图片 */
  enableChatImageGeneration?: boolean
  /** 宏观画风描述 */
  artStyle?: string
  /** 多画风混合权重 */
  artStyleMix?: ArtStyleConfig[]
  /** 视觉风格权重 0-100 */
  qualityWeight?: number
  /** 主色调 */
  mainColor?: string
  /** 光照风格 */
  lighting?: string
  /** 构图风格 */
  composition?: string
  /** 细节密度描述 */
  detailDensity?: string
}

/**
 * 聊天图片生成的画风条目
 * 允许像音色一样配置多个画风及百分比权重
 */
export interface ArtStyleConfig {
  id: string
  styleName: string
  weight: number
}

/**
 * 基于亲密度的动态媒体触发
 * 根据用户与角色的亲密度自动触发媒体内容
 */
export interface IntimacyMediaTrigger {
  id: string
  /** 触发亲密度阈值 0-100 */
  intimacyLevel: number
  /** 媒体类型 */
  mediaType: 'sticker' | 'meme' | 'animation' | 'background' | 'tts-voice'
  /** 媒体资源 URL */
  mediaUrl?: string
  /** TTS 音色 ID（mediaType 为 'tts-voice' 时使用） */
  ttsVoiceId?: string
  /** 冷却时间（秒） */
  cooldown?: number
  /** 禁止触发条件 */
  forbiddenCondition?: string
  /** 触发后显示的文案 */
  triggerText?: string
}

/**
 * TTS 音色配置
 * 定义角色的语音合成参数
 */
export interface TTSConfig {
  /** 音色唯一标识 */
  voiceId: string
  /** 音色名称 */
  voiceName: string
  /** 音色权重 0-100 */
  weight: number
  /** 语速 */
  speechRate?: number
  /** 音调 */
  pitch?: number
  /** 音量 */
  volume?: number
}

export type TTSMode = 'voice-clone' | 'single' | 'multi' | 'emotion'

// ========== 核心角色接口 ==========

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
  /** 多模态设置 */
  multimedia?: CharacterMultimedia
  /** 场景设定 */
  scenario?: string
  /** 结构化人设 */
  persona?: CharacterPersona
  /** 世界知识库 */
  lorebook?: Lorebook
  /** 世界书列表 */
  worldBooks?: WorldBook[]
  /** 深度提示 */
  depthPrompt?: DepthPrompt
  /** 备选开场白 */
  alternateGreetings?: string[]
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
  /** 身份锁（锚点）- 明确拆分后的身份声明 */
  identityAnchor?: string
  /** 性格特质列表 - 明确拆分后的特质数组 */
  personalityTraits?: string[]
  /** 交流风格 - 明确拆分后的风格描述 */
  communicationStyle?: string
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
  /** 角色定位 - 描述角色在对话中的位置与功能 */
  rolePosition?: string
  /** 动态角色注释/心理锚点 */
  dynamicAnchor?: string
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
  /** 词条类型 */
  type?: 'profile' | 'world_info' | 'dialogue' | 'style'
  /** 绑定的角色 ID（空 = 全局） */
  characterId?: string
  /** 动态角色注释/心理锚点 */
  dynamicAnchor?: string
  /** 用户画像与长期关系演算 */
  userPersona?: string
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

/** 角色对话参数 — 可覆盖全局默认 */
export interface CharacterChatParams {
  overrideGlobal?: boolean
  mode?: 'free-dialogue' | 'challenge-dialogue' | 'group-chat'
  replyLength?: 'short' | 'medium' | 'long'
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  presencePenalty?: number
  frequencyPenalty?: number
  repetitionPenalty?: number
  contextWindow?: number
  streamOutput?: boolean
  jsonMode?: boolean
  functionCalling?: boolean
  systemPromptPrefix?: string
  /** 并发请求数：将单次请求拆分为 N 个子问题并发处理，按顺序组合结果。默认 1（不拆分）。 */
  concurrentRequests?: number
}

export interface ICharacter {
  id: string
  name: string
  avatar?: string
  coverImage?: string
  voiceSample?: string
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
  emotionalTendency?: string
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
  /** 群组专属备选开场白列表 */
  groupOnlyGreetings?: string[]
  /** 角色聊天背景图 */
  chatBackground?: string
  /** 整体聊天背景图 */
  globalBackground?: string
  /** 对话全局动态视频背景 */
  globalVideoBackground?: string
  /** 角色切换动图 */
  switchAnimation?: string
  /** 角色情感表达动图列表 */
  emotionAnimations?: EmotionAnimation[]
  /** 导入的游戏数据（规则、脚本、关卡等） */
  gameData?: string
  /** 世界书列表 — 独立命名的可复用知识库 */
  worldBooks?: WorldBook[]
  /** 剧情卡配置 — 剧情类角色的基础/高级叙事规则 */
  plotCard?: PlotCardData
  /** 游戏卡配置 — 内嵌/外联小游戏机制 */
  gameCard?: GameCardData
  /** 全局卡配置 — 多人/群聊旁白、共享世界和全局状态 */
  globalCard?: GlobalCardData
  /** 物品/属性卡配置 — 物品客观机制与角色属性追踪 */
  itemAttributeCard?: ItemAttributeCardData
  /** 角色对话参数 — 覆盖全局默认 */
  chatParams?: CharacterChatParams
  /** 角色多模态设置 */
  multimedia?: CharacterMultimedia

  // ========== 低级设定 ==========
  /** 一句话描述 - 角色核心信息精简概括 */
  oneLineDescription?: string
  /** 负向特征与行为禁忌 - 角色"不做"或"排斥"的行为清单 */
  negativeTraits?: NegativeTrait[]
  /** 客观物理特征清单 - 角色外观的客观事实 */
  physicalFeatures?: PhysicalFeature[]
  /** 语言习惯与语用特征 - 角色说话方式描述 */
  speechPatterns?: SpeechPattern[]

  // ========== 整体设定 ==========
  /** 整体设定包 - 包含低级设定的聚合对象 */
  overallSettings?: {
    /** 一句话描述 */
    oneLineDescription?: string
    /** 开场白 */
    greeting?: string
    /** 场景设定 */
    scenario?: string
    /** 性格描述 */
    personality?: string
    /** 负向特征与行为禁忌 */
    negativeTraits?: NegativeTrait[]
    /** 客观物理特征清单 */
    physicalFeatures?: PhysicalFeature[]
    /** 语言习惯与语用特征 */
    speechPatterns?: SpeechPattern[]
    /** 系统级越狱与输出排版规范 */
    outputFormatRules?: OutputFormatRules
    /** 示例对话 */
    exampleDialogues?: ExampleDialogue[]
  }

  // ========== 高级设定 - 角色描述增强词条 ==========
  /** 系统级越狱与输出排版规范 */
  outputFormatRules?: OutputFormatRules
  /** 示例对话列表 - 指导模型回复风格 */
  exampleDialogues?: ExampleDialogue[]

  // ========== 开场白 ==========
  /** 主开场白 - 默认第一句对话 */
  mainGreeting?: string
  /** 多重情境开场白池 - 根据对话情境选择对应开场白 */
  contextualGreetings?: ContextualGreeting[]

  // ========== 媒体设定 ==========
  /** 媒体权重配置 - 控制视觉呈现参数 */
  mediaWeights?: MediaWeights
  /** 全局聊天背景图 */
  globalChatBackground?: string
  /** 基于亲密度的动态媒体触发列表 */
  intimacyMediaTriggers?: IntimacyMediaTrigger[]
  /** TTS 音色方案 */
  ttsMode?: TTSMode
  /** TTS 音色配置列表 */
  ttsConfigs?: TTSConfig[]
}

export interface CharacterValidationResult {
  valid: boolean
  errors: string[]
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
  coverImage?: string
  voiceSample?: string
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
  emotionalTendency?: string
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
  groupOnlyGreetings?: string[]
  chatBackground?: string
  globalBackground?: string
  globalVideoBackground?: string
  switchAnimation?: string
  emotionAnimations?: EmotionAnimation[]
  worldBooks?: WorldBook[]
  plotCard?: PlotCardData
  gameCard?: GameCardData
  globalCard?: GlobalCardData
  itemAttributeCard?: ItemAttributeCardData
  chatParams?: CharacterChatParams
  multimedia?: CharacterMultimedia
  /** 一句话描述 */
  oneLineDescription?: string
  /** 负向特征与行为禁忌 */
  negativeTraits?: NegativeTrait[]
  /** 客观物理特征清单 */
  physicalFeatures?: PhysicalFeature[]
  /** 语言习惯与语用特征 */
  speechPatterns?: SpeechPattern[]
  /** 整体设定包 */
  overallSettings?: ICharacter['overallSettings']
  /** 系统级越狱与输出排版规范 */
  outputFormatRules?: OutputFormatRules
  /** 示例对话列表 */
  exampleDialogues?: ExampleDialogue[]
  /** 主开场白 */
  mainGreeting?: string
  /** 多重情境开场白池 */
  contextualGreetings?: ContextualGreeting[]
  /** 媒体权重配置 */
  mediaWeights?: MediaWeights
  /** 全局聊天背景图 */
  globalChatBackground?: string
  /** 基于亲密度的动态媒体触发列表 */
  intimacyMediaTriggers?: IntimacyMediaTrigger[]
  /** TTS 音色方案 */
  ttsMode?: TTSMode
  /** TTS 音色配置列表 */
  ttsConfigs?: TTSConfig[]
}

export interface UpdateCharacterRequest extends CreateCharacterRequest {
  id: string
}
