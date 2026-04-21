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

export interface ContextWindowConfig {
  /** 保留最近 N 条原文消息 */
  recentWindowSize: number
  /** 始终保留首条 assistant 消息 (greeting) */
  keepFirstGreeting: boolean
  /** 最大消息加载量 (性能限制) */
  maxLoadMessages: number
}

const DEFAULT_CONFIG: ContextWindowConfig = {
  recentWindowSize: 20,
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

  // Recent window
  const recentMessages = nonEmpty.slice(-cfg.recentWindowSize)

  return {
    greetingMessage,
    summary: summary?.summary || null,
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
 * 估算 token 数量 (简单字符比例估算, 中文约 1.5 字/token)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length
  const otherCount = text.length - cjkCount
  return Math.ceil(cjkCount / 1.5 + otherCount / 4)
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
