/**
 * 上下文管理: 滑动窗口 + 分层摘要
 *
 * 策略 (来自 MoreClever.md):
 * 1. 保留最近 N 条原文消息 (热路径)
 * 2. 中间层: 压缩摘要 (如果有)
 * 3. 超出窗口的存入长期记忆 (冷路径)
 */

import type { IMessage } from '@/types/chat'
import type { SessionSummary } from './summarizer'
import { estimateTokens } from './token-counter'

export interface ContextWindowConfig {
  /** 对话历史最大 Token 数（摘要计入，系统/角色设定不计入） */
  maxContextTokens: number
  /** 始终保留首条 assistant 消息 (greeting) */
  keepFirstGreeting: boolean
  /** 最大消息加载量 (性能限制) */
  maxLoadMessages: number
}

/**
 * 模型 Token 预算映射表
 *
 * 设计原则：
 * 1. 保守默认值：大多数用户对话实际上远小于模型最大窗口
 * 2. 按模型档次分配：高级模型分配更高预算（16K），轻量模型分配更低预算（8K）
 * 3. 国产模型通常窗口较小，使用保守值
 * 4. 兜底默认值 8192 适用于大多数日常对话场景
 *
 * 参考依据：
 * - GPT-4o/GPT-4 Turbo: 128K 窗口 → 推荐 16K 预算（高质量长对话）
 * - GPT-4o Mini/Haiku: 128K 窗口 → 推荐 8K 预算（轻量模型够用）
 * - Claude Sonnet/Opus: 200K 窗口 → 推荐 16K 预算
 * - Gemini Flash: 128K 窗口 → 推荐 8K 预算
 * - 国产模型 (DeepSeek/Qwen/Zhipu): 使用保守 8K 预算
 */
export const MODEL_TOKEN_BUDGET_MAP: Record<string, number> = {
  // OpenAI 系列
  'gpt-4o': 16384,           // 128K 窗口 → 推荐 16K 预算
  'gpt-4o-mini': 8192,       // 128K 窗口 → 推荐 8K 预算（多数对话够用）
  'gpt-4-turbo': 16384,     // 128K 窗口 → 推荐 16K
  'gpt-4': 8192,             // 8K 窗口 → 推荐 8K
  'gpt-3.5-turbo': 4096,    // 4K 窗口 → 推荐 4K
  'gpt-4.5': 16384,
  'gpt-4.5-mini': 8192,

  // Anthropic Claude 系列
  'claude-sonnet': 16384,     // 200K 窗口 → 推荐 16K
  'claude-sonnet-3.5': 16384,
  'claude-haiku': 8192,       // 200K 窗口 → 推荐 8K（精简模型用精简预算）
  'claude-opus': 16384,       // 200K 窗口 → 推荐 16K

  // Google Gemini 系列
  'gemini-pro': 16384,        // 128K 窗口
  'gemini-flash': 8192,       // 128K 窗口 → 轻量用轻量预算
  'gemini-1.5-pro': 16384,
  'gemini-1.5-flash': 8192,

  // X Grok 系列
  'grok-2': 16384,
  'grok-2-mini': 8192,

  // 国产模型系列
  'deepseek': 8192,          // DeepSeek
  'deepseek-v3': 8192,
  'qwen': 8192,              // 通义千问
  'qwen2': 8192,
  'glm': 8192,               // 智谱 GLM
  'glm-4': 8192,
  'moonshot': 8192,          // 月之暗面
  'minimax': 8192,           // MiniMax
  'doubao': 8192,            // 豆包
  'ernie': 8192,             // 文心一言

  // AWS Bedrock 托管模型
  'bedrock-claude': 16384,
  'bedrock-titan': 8192,

  // Azure OpenAI 托管模型
  'azure-gpt-4o': 16384,
  'azure-gpt-4': 8192,
  'azure-gpt-35': 4096,

  // 本地模型 / 兼容模型（保守默认）
  'ollama': 8192,
  'local': 8192,
  'openai-compatible': 8192,

  // 默认兜底
  '_default': 8192,
}

/**
 * 根据模型 ID 获取推荐的 Token 预算
 *
 * 匹配策略：
 * 1. 精确匹配（优先）：模型 ID 完全匹配
 * 2. 前缀匹配：模型 ID 以某个 key 开头（如 "gpt-4o-2024-05-13" 匹配 "gpt-4o"）
 * 3. 兜底默认值：8192
 *
 * @param modelId - 模型 ID 字符串
 * @returns 推荐的 Token 预算值
 */
export function getRecommendedTokenBudget(modelId: string): number {
  if (!modelId) return MODEL_TOKEN_BUDGET_MAP._default

  const normalizedId = modelId.toLowerCase().trim()

  // 精确匹配
  if (MODEL_TOKEN_BUDGET_MAP[normalizedId] !== undefined) {
    return MODEL_TOKEN_BUDGET_MAP[normalizedId]
  }

  // 前缀匹配（处理带版本号的模型名，如 gpt-4o-2024-05-13）
  for (const [key, value] of Object.entries(MODEL_TOKEN_BUDGET_MAP)) {
    if (key === '_default') continue
    if (normalizedId.startsWith(key)) {
      return value
    }
  }

  // 兜底默认值
  return MODEL_TOKEN_BUDGET_MAP._default
}

/**
 * 默认 Token 预算值（用于初始化）
 * 保守设置为 8192，适用于 90% 以上的日常对话场景
 */
export const DEFAULT_TOKEN_BUDGET = MODEL_TOKEN_BUDGET_MAP._default

const DEFAULT_CONFIG: ContextWindowConfig = {
  maxContextTokens: DEFAULT_TOKEN_BUDGET,
  keepFirstGreeting: true,
  maxLoadMessages: 200,
}

export interface ContextWindow {
  /** 首条 greeting 消息 (如果有) */
  greetingMessage: IMessage | null
  /** 摘要 (中间层) */
  summary: string | null
  /** 最近的原文消息 */
  recentMessages: IMessage[]
  /** 总消息数 (用于判断是否需要摘要) */
  totalMessageCount: number
}

/**
 * 从全量消息构建上下文窗口
 * 按 Token 级别截断：从最新消息向前累加，直到接近 maxContextTokens。
 * 摘要文本计入额度；greeting 始终保留且不计入额度。
 */
export function buildContextWindow(
  allMessages: IMessage[],
  summary: SessionSummary | null,
  config: Partial<ContextWindowConfig> = {}
): ContextWindow {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const nonEmpty = allMessages.filter(m => m.content.trim().length > 0)

  // Find greeting (first assistant message)
  let greetingMessage: IMessage | null = null
  if (cfg.keepFirstGreeting) {
    greetingMessage = nonEmpty.find(m => m.role === 'assistant') || null
  }

  const summaryText = summary?.summary || null
  const summaryTokens = summaryText ? estimateTokens(summaryText) : 0

  // Token-based sliding window: accumulate from newest backwards
  const greetingId = greetingMessage?.id
  let usedTokens = summaryTokens
  const recentMessages: IMessage[] = []

  for (let i = nonEmpty.length - 1; i >= 0; i--) {
    const msg = nonEmpty[i]
    // greeting 单独保留，不计入窗口额度
    if (msg.id === greetingId) continue

    const msgTokens = estimateTokens(msg.content)
    // 若已保留至少一条消息且当前消息会超限，则停止（优先保留完整消息）
    if (usedTokens + msgTokens > cfg.maxContextTokens && recentMessages.length > 0) {
      break
    }
    usedTokens += msgTokens
    recentMessages.unshift(msg)
  }

  return {
    greetingMessage,
    summary: summaryText,
    recentMessages,
    totalMessageCount: nonEmpty.length,
  }
}

/**
 * 判断是否需要触发摘要
 */
export function needsSummarization(
  totalMessageCount: number,
  existingSummary: SessionSummary | null,
  interval = 10
): boolean {
  const lastIdx = existingSummary?.lastSummarizedMessageIndex ?? 0
  return (totalMessageCount - lastIdx) >= interval
}

/**
 * 根据模型 context window 裁剪 prompt
 * 策略: 保留 system prompt 全量, 裁剪消息历史直到总 token 不超限
 */
export function trimMessagesToTokenLimit(
  systemPrompt: string,
  messages: Array<{ content: string }>,
  maxContextTokens: number,
  reserveForCompletion = 1024
): Array<{ content: string }> {
  const systemTokens = estimateTokens(systemPrompt)
  const availableTokens = maxContextTokens - systemTokens - reserveForCompletion

  if (availableTokens <= 0) {
    return messages.length > 1 ? [messages[0]] : messages
  }

  let usedTokens = 0
  const kept: Array<{ content: string }> = []

  // Keep from the end (most recent) backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content)
    if (usedTokens + msgTokens > availableTokens) break
    usedTokens += msgTokens
    kept.unshift(messages[i])
  }

  return kept.length > 0 ? kept : messages.length > 0 ? [messages[messages.length - 1]] : []
}
