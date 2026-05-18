/**
 * 模型路由服务
 * 根据对话上下文长度和复杂度，自动选择最佳模型
 * 支持用户手动覆盖和复杂话题检测
 */

import type { ChatMessage } from '@/types/chat'

// ==================== 类型定义 ====================

/**
 * 模型路由配置
 */
export interface ModelRouterConfig {
  /** 是否启用自动路由 */
  enabled: boolean
  /** 短对话阈值（tokens），低于此值使用轻量模型 */
  shortThreshold: number
  /** 长对话阈值（tokens），高于此值使用强模型 */
  longThreshold: number
  /** 轻量模型列表 */
  lightweightModels: string[]
  /** 标准模型列表 */
  standardModels: string[]
  /** 强模型列表 */
  heavyModels: string[]
}

/**
 * 路由决策输入上下文
 */
export interface RoutingContext {
  /** 当前上下文 Token 估算值 */
  estimatedTokens: number
  /** 对话轮数 */
  turnCount: number
  /** 是否检测到复杂话题 */
  hasComplexTopic: boolean
  /** 用户偏好的模型（手动覆盖），如果提供则优先使用 */
  userPreferredModel: string | null
  /** 当前 provider 下可用的模型列表 */
  availableModels: string[]
  /** 当前使用的 provider */
  provider?: string
}

/**
 * 路由决策结果
 */
export interface RoutingDecision {
  /** 推荐的模型 ID */
  recommendedModel: string
  /** 推荐理由（用于 UI 显示） */
  reason: string
  /** 是否自动路由（vs 用户手动选择） */
  isAutoRouted: boolean
  /** 路由分类层级 */
  tier: 'lightweight' | 'standard' | 'heavy'
  /** 估算的 token 数 */
  estimatedTokens: number
}

/**
 * 模型层级分类
 */
export type ModelTier = 'lightweight' | 'standard' | 'heavy'

// ==================== 默认配置 ====================

/**
 * 默认模型分层映射
 * 基于常见的开源模型和主流服务商的模型
 */
export const DEFAULT_MODEL_TIERS: Record<ModelTier, string[]> = {
  lightweight: [
    // OpenAI
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    // Anthropic
    'claude-haiku',
    'claude-3-haiku',
    'claude-3-haiku-20240307',
    // Google
    'gemini-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    // DeepSeek
    'deepseek-chat',
    'deepseek-v3',
    // ByteDance
    'doubao-pro-32k',
    'doubao-lite-32k',
    // Baidu
    'ernie-3.5',
    'ernie-lite',
    // Aliyun
    'qwen-turbo',
    'qwen2-7b-instruct',
    'qwen2-1.5b-instruct',
    // Zhipu
    'glm-3-turbo',
    'glm-4-flash',
    // Grok
    'grok-2-fast',
  ],
  standard: [
    // OpenAI
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    // Anthropic
    'claude-sonnet',
    'claude-3-sonnet',
    'claude-3.5-sonnet',
    'claude-3-5-sonnet-20240620',
    // Google
    'gemini-pro',
    'gemini-1.5-pro',
    // DeepSeek
    'deepseek-reasoner',
    // ByteDance
    'doubao-pro-128k',
    // Baidu
    'ernie-4.0',
    // Aliyun
    'qwen-plus',
    'qwen-max',
    // Zhipu
    'glm-4',
    'glm-4v',
    // Grok
    'grok-2',
  ],
  heavy: [
    // OpenAI（当前最强）
    'gpt-4o',
    // Anthropic
    'claude-opus',
    'claude-3-opus',
    'claude-3-opus-20240229',
    // Google
    'gemini-ultra',
    'gemini-1.5-ultra',
  ],
}

/**
 * 默认路由配置
 */
export const DEFAULT_ROUTER_CONFIG: ModelRouterConfig = {
  enabled: true,
  shortThreshold: 500,
  longThreshold: 8000,
  lightweightModels: DEFAULT_MODEL_TIERS.lightweight,
  standardModels: DEFAULT_MODEL_TIERS.standard,
  heavyModels: DEFAULT_MODEL_TIERS.heavy,
}

// ==================== 复杂话题检测 ====================

/**
 * 检测用户消息是否为复杂话题
 * @param userMessage 用户最后一条消息
 * @param messageHistory 历史消息列表（用于分析对话复杂度）
 * @returns 是否为复杂话题
 */
export function isComplexTopic(
  userMessage: string,
  messageHistory: ChatMessage[] = []
): boolean {
  const text = userMessage.trim()
  if (!text) return false

  // 1. 包含问号且字数 > 20（可能是复杂问题）
  const hasQuestionMark = /[？?]/.test(text)
  const isLongQuestion = hasQuestionMark && text.length > 20

  // 2. 包含深度思考关键词
  const complexitySignals: RegExp[] = [
    /为什么|怎么|分析|解释|比较|区别|原理|如何|方法|步骤|原因|逻辑|辩证|本质/g,
    /请说明|请解释|请分析|请比较|请阐述|请总结|请归纳|请推导/g,
    /代码|编程|算法|数据结构|架构|设计|实现|优化|调试|bug/g,
    /哲学|伦理|道德|情感|心理|认知|思维|意识|精神/g,
    /数学|物理|化学|生物|科学|研究|论文|学术|理论/g,
    /法律|法规|合同|条款|责任|权利|义务/g,
    /经济|金融|投资|理财|市场|分析|策略/g,
  ]

  const matchCount = complexitySignals.reduce(
    (count, regex) => count + ((text.match(regex) || []).length > 0 ? 1 : 0),
    0
  )

  // 3. 包含代码块或技术术语
  const hasCodeBlock = /```|const |let |var |function |class |import |export /.test(text)

  // 4. 输入长度 > 200 字符（可能是详细描述）
  const isLongInput = text.length > 200

  // 5. 对话轮数较多（可能是复杂对话）
  const hasManyTurns = messageHistory.length > 10

  // 决策逻辑：满足 2 个以上条件或单个强信号
  return (
    isLongInput ||
    hasCodeBlock ||
    matchCount >= 2 ||
    (isLongQuestion && matchCount >= 1) ||
    hasManyTurns
  )
}

// ==================== 模型层级判断 ====================

/**
 * 判断模型属于哪个层级
 * @param modelId 模型 ID
 * @returns 模型层级
 */
export function getModelTier(modelId: string): ModelTier {
  const normalizedId = modelId.toLowerCase().trim()

  // 检查轻量模型
  if (DEFAULT_MODEL_TIERS.lightweight.some(m => normalizedId.includes(m.toLowerCase()))) {
    return 'lightweight'
  }

  // 检查强模型（优先于标准模型，因为可能重叠）
  if (DEFAULT_MODEL_TIERS.heavy.some(m => normalizedId.includes(m.toLowerCase()))) {
    return 'heavy'
  }

  // 检查标准模型
  if (DEFAULT_MODEL_TIERS.standard.some(m => normalizedId.includes(m.toLowerCase()))) {
    return 'standard'
  }

  // 默认归类为标准模型
  return 'standard'
}

// ==================== Token 估算 ====================

/**
 * 粗略估算消息历史的 token 数
 * 用于路由决策的快速估算，精确计数由 token-counter.ts 处理
 * @param messages 消息列表
 * @returns 估算的 token 数
 */
export function estimateTokens(messages: ChatMessage[]): number {
  let totalChars = 0
  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    totalChars += content.length
    totalChars += msg.role.length
  }
  // 粗略估算：中文每 1.3 字符 = 1 token，英文每 4 字符 = 1 token
  // 这里取平均值，假设中英文混合
  return Math.floor(totalChars / 2.5)
}

// ==================== 核心路由逻辑 ====================

/**
 * 根据上下文自动路由选择最佳模型
 * @param context 路由上下文
 * @param config 路由配置（可选，覆盖默认配置）
 * @returns 路由决策
 */
export function routeModel(
  context: RoutingContext,
  config?: Partial<ModelRouterConfig>
): RoutingDecision {
  const finalConfig: ModelRouterConfig = {
    ...DEFAULT_ROUTER_CONFIG,
    ...config,
  }

  // 如果用户手动选择了模型，优先使用用户选择
  if (context.userPreferredModel && context.userPreferredModel.trim()) {
    const tier = getModelTier(context.userPreferredModel)
    return {
      recommendedModel: context.userPreferredModel,
      reason: '用户手动选择模型',
      isAutoRouted: false,
      tier,
      estimatedTokens: context.estimatedTokens,
    }
  }

  // 如果自动路由未启用，返回第一个可用模型
  if (!finalConfig.enabled || context.availableModels.length === 0) {
    return {
      recommendedModel: context.availableModels[0] || '',
      reason: '自动路由未启用',
      isAutoRouted: false,
      tier: 'standard',
      estimatedTokens: context.estimatedTokens,
    }
  }

  const { estimatedTokens, hasComplexTopic } = context
  const { shortThreshold, longThreshold, lightweightModels, standardModels, heavyModels } = finalConfig

  let targetTier: ModelTier
  let reason: string

  // 复杂话题直接使用强模型
  if (hasComplexTopic) {
    targetTier = 'heavy'
    reason = '检测到复杂话题，使用强模型确保回答质量'
  }
  // 短对话使用轻量模型
  else if (estimatedTokens < shortThreshold) {
    targetTier = 'lightweight'
    reason = `短对话优化（约 ${estimatedTokens} tokens），使用轻量模型`
  }
  // 长对话使用强模型
  else if (estimatedTokens > longThreshold) {
    targetTier = 'heavy'
    reason = `长对话优化（约 ${estimatedTokens} tokens），使用强模型`
  }
  // 中等长度使用标准模型
  else {
    targetTier = 'standard'
    reason = `标准对话（约 ${estimatedTokens} tokens），使用标准模型`
  }

  // 在可用模型中查找符合目标层级的模型
  const targetModels = targetTier === 'lightweight'
    ? lightweightModels
    : targetTier === 'heavy'
      ? heavyModels
      : standardModels

  // 查找第一个匹配的可用模型
  const matchedModel = findMatchingModel(context.availableModels, targetModels)

  if (matchedModel) {
    return {
      recommendedModel: matchedModel,
      reason,
      isAutoRouted: true,
      tier: targetTier,
      estimatedTokens,
    }
  }

  // 如果目标层级没有可用模型，降级查找
  const fallbackResult = findFallbackModel(context.availableModels, targetTier, {
    lightweightModels,
    standardModels,
    heavyModels,
  })

  return {
    recommendedModel: fallbackResult.model,
    reason: `${reason}，但目标层级模型不可用，自动降级为 ${fallbackResult.tier} 层级`,
    isAutoRouted: true,
    tier: fallbackResult.tier,
    estimatedTokens,
  }
}

/**
 * 在可用模型中查找与目标模型列表匹配的模型
 */
function findMatchingModel(availableModels: string[], targetModels: string[]): string | null {
  for (const available of availableModels) {
    const normalizedAvailable = available.toLowerCase()
    for (const target of targetModels) {
      if (normalizedAvailable.includes(target.toLowerCase())) {
        return available
      }
    }
  }
  return null
}

/**
 * 查找降级可用的模型
 */
function findFallbackModel(
  availableModels: string[],
  originalTier: ModelTier,
  tiers: {
    lightweightModels: string[]
    standardModels: string[]
    heavyModels: string[]
  }
): { model: string; tier: ModelTier } {
  // 降级优先级
  const fallbackOrder: ModelTier[] =
    originalTier === 'heavy'
      ? ['standard', 'lightweight']
      : originalTier === 'standard'
        ? ['heavy', 'lightweight']
        : ['standard', 'heavy']

  for (const tier of fallbackOrder) {
    const models =
      tier === 'lightweight'
        ? tiers.lightweightModels
        : tier === 'heavy'
          ? tiers.heavyModels
          : tiers.standardModels

    const matched = findMatchingModel(availableModels, models)
    if (matched) {
      return { model: matched, tier }
    }
  }

  // 都找不到，返回第一个可用模型
  return { model: availableModels[0] || '', tier: 'standard' }
}

// ==================== UI 辅助函数 ====================

/**
 * 获取模型层级的显示名称
 */
export function getTierDisplayName(tier: ModelTier): string {
  const names: Record<ModelTier, string> = {
    lightweight: '轻量模型',
    standard: '标准模型',
    heavy: '强模型',
  }
  return names[tier]
}

/**
 * 获取模型层级的颜色（用于 UI 显示）
 */
export function getTierColor(tier: ModelTier): string {
  const colors: Record<ModelTier, string> = {
    lightweight: '#10b981', // 绿色
    standard: '#3b82f6', // 蓝色
    heavy: '#8b5cf6', // 紫色
  }
  return colors[tier]
}

/**
 * 获取模型层级的图标（用于 UI 显示）
 */
export function getTierIcon(tier: ModelTier): string {
  const icons: Record<ModelTier, string> = {
    lightweight: '⚡',
    standard: '✨',
    heavy: '🚀',
  }
  return icons[tier]
}
