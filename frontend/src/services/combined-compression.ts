/**
 * 合并压缩服务
 * 
 * 将逐轮对话压缩 和 会话摘要生成 合并为单次 LLM 调用
 * 目标：减少 API 往返次数（从 3 次调用减少到 2 次）
 * 
 * 触发时机：每 8 轮对话后需要摘要时，同时进行压缩和摘要
 * 
 * 预期收益：节省 1 次 API 往返延迟（约 500ms - 2s）
 */

import type { StorageDriver } from './storage'
import type { IMessage } from '@/types/chat'
import type { LLMAPIService } from './llm-api'
import type { SessionSummary } from './summarizer'
import type { CompressedTurn, CompressedHistory } from './compressed-history'
import { estimateTokens } from './token-counter'

// ========== 合并压缩参数 ==========
const COMPRESS_MAX_TOKENS = 75          // 单轮压缩输出最大 token 数
const SUMMARY_MAX_TOKENS = 200          // 摘要输出最大长度
const COMPRESSION_TEMPERATURE = 0.1     // 温度值
const SUMMARIZE_INTERVAL = 8            // 累计 N 轮后触发摘要

// ========== 类型定义 ==========

/** 合并压缩的输入 */
export interface CombinedCompressionInput {
  /** 需要处理的最新一轮对话（用户 + 助手） */
  userMessage: IMessage
  assistantMessage: IMessage
  /** 已有的会话摘要（用于增量更新） */
  existingSummary: SessionSummary | null
  /** 角色名 */
  characterName: string
  /** 角色 ID */
  characterId: string
  /** 会话 ID */
  sessionId: string
  /** 所有消息（用于摘要的上下文） */
  allMessages: IMessage[]
}

/** LLM 返回的 JSON 结构 */
interface CombinedResponse {
  /** 用户消息压缩结果 */
  userSummary: string
  /** 助手消息压缩结果 */
  assistantSummary: string
  /** 更新后的会话摘要 */
  updatedSummary: string
  /** 节省的 token 估算（可空） */
  tokensSaved?: number
}

/** 合并压缩的输出 */
export interface CombinedCompressionOutput {
  compressedTurn: CompressedTurn
  updatedSessionSummary: SessionSummary
  /** 估算节省的 token 数 */
  tokensSaved: number
}

// ========== System Prompt ==========

/**
 * 合并压缩的 System Prompt
 * 设计目标：让 LLM 同时完成两个任务，且输出严格的 JSON 格式
 */
const COMBINED_SYSTEM_PROMPT = `你是一个对话压缩和摘要助手。请同时完成两个任务，并以严格的 JSON 格式输出。

## 任务 1：压缩最新一轮对话
将用户和助手的最新一轮对话压缩为极简的关键信息摘要：
- 保留关键事实：人名、地点、物品、承诺、状态变更、玩家选择、情感变化
- 保留角色的称呼习惯和语气特征
- 丢弃无意义的寒暄、重复表达、语气词
- 用第三人称客观叙述，每段不超过 40 字

## 任务 2：更新会话摘要
在已有摘要的基础上，融入本轮对话的新关键信息：
- 结构化输出：使用 [事件] [情感] [关系] [决策] 标签标记关键内容
- 保持摘要精炼连贯，总长度不超过 180 字
- 如果没有已有摘要，直接生成新的摘要

## 输出格式要求
必须返回严格的 JSON，不要任何额外解释、不要 Markdown 代码块标记：
{
  "userSummary": "用户消息压缩结果",
  "assistantSummary": "助手消息压缩结果",
  "updatedSummary": "更新后的会话摘要"
}`

// ========== 工具函数 ==========

function extractText(message: IMessage): string {
  if (message.contentType === 'text') return message.content
  try {
    const parsed = JSON.parse(message.content) as Record<string, unknown>
    return (parsed.text as string) || (parsed.description as string) || message.content
  } catch {
    return message.content
  }
}

/**
 * 解析 LLM 返回的 JSON 响应
 * 处理可能的格式错误（如包含 Markdown 代码块）
 */
function parseCombinedResponse(raw: string): CombinedResponse {
  let jsonStr = raw.trim()

  // 移除可能的 Markdown 代码块标记
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '')
  jsonStr = jsonStr.replace(/\s*```$/, '')

  // 找到第一个 { 和最后一个 }
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')
  if (start >= 0 && end > start) {
    jsonStr = jsonStr.slice(start, end + 1)
  }

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`JSON parse failed: ${(e as Error).message}`)
  }
}

// ========== 核心功能 ==========

/**
 * 执行合并压缩调用
 * 单次 LLM 调用，同时返回压缩结果和更新的摘要
 */
export async function combinedCompress(
  apiService: LLMAPIService,
  input: CombinedCompressionInput
): Promise<CombinedCompressionOutput> {
  const userText = extractText(input.userMessage)
  const assistantText = extractText(input.assistantMessage)
  const existingSummaryText = input.existingSummary?.summary || ''

  // 用户输入通常较短，直接截断保留即可，避免额外 API 调用
  const fallbackUserSummary = userText.length > 90 ? userText.slice(0, 90) + '…' : userText

  // 构建用户 Prompt
  const userPromptParts = [
    `## 本轮对话内容`,
    `用户：${userText}`,
    `${input.characterName}：${assistantText}`,
  ]

  if (existingSummaryText) {
    userPromptParts.push(``, `## 已有会话摘要`, existingSummaryText)
  }

  userPromptParts.push(
    ``,
    `## 任务`,
    `1. 压缩用户消息和${input.characterName}的回复`,
    `2. 生成或更新会话摘要`,
    `3. 返回严格的 JSON 格式`
  )

  const userPrompt = userPromptParts.join('\n')

  // 调用 LLM
  const rawResponse = await apiService.chat({
    systemPrompt: COMBINED_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: COMPRESS_MAX_TOKENS + SUMMARY_MAX_TOKENS,
    temperature: COMPRESSION_TEMPERATURE,
    // 注意：JSON mode 只在 OpenAI 系列模型可用，这里不强制设置
    // 依赖 prompt 约束和降级策略保证可靠性
  })

  // 解析响应
  let parsed: CombinedResponse
  try {
    parsed = parseCombinedResponse(rawResponse)
  } catch (e) {
    // 解析失败，抛出异常让调用方降级
    throw new Error(`Combined compression failed: ${(e as Error).message}`)
  }

  // 验证必要字段
  if (!parsed.userSummary || !parsed.assistantSummary || !parsed.updatedSummary) {
    throw new Error('Missing required fields in combined response')
  }

  // 计算节省的 token
  const originalTokens = estimateTokens(userText + assistantText)
  const compressedTokens = estimateTokens(parsed.userSummary + parsed.assistantSummary)
  const tokensSaved = Math.max(0, originalTokens - compressedTokens)

  return {
    compressedTurn: {
      userContent: parsed.userSummary,
      assistantContent: parsed.assistantSummary,
      timestamp: Date.now(),
    },
    updatedSessionSummary: {
      sessionId: input.sessionId,
      characterId: input.characterId,
      characterName: input.characterName,
      summary: parsed.updatedSummary,
      lastSummarizedMessageIndex: input.allMessages.length,
      updatedAt: Date.now(),
    },
    tokensSaved,
  }
}

// ========== 存储集成 ==========

/**
 * 保存压缩历史
 * 复用 compressed-history.ts 的存储逻辑
 */
const COMPRESSED_KEY_PREFIX = 'compressed_history::'

async function loadCompressedHistory(
  storage: StorageDriver,
  sessionId: string
): Promise<CompressedHistory | null> {
  const raw = await storage.getUserSetting(`${COMPRESSED_KEY_PREFIX}${sessionId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompressedHistory
  } catch {
    return null
  }
}

async function saveCompressedHistory(
  storage: StorageDriver,
  history: CompressedHistory
): Promise<void> {
  await storage.saveUserSetting(
    `${COMPRESSED_KEY_PREFIX}${history.sessionId}`,
    JSON.stringify(history)
  )
}

/**
 * 保存会话摘要
 * 复用 summarizer.ts 的存储逻辑
 */
const SUMMARY_KEY_PREFIX = 'session_summary::'

async function saveSessionSummary(
  storage: StorageDriver,
  summary: SessionSummary
): Promise<void> {
  await storage.saveUserSetting(
    `${SUMMARY_KEY_PREFIX}${summary.sessionId}`,
    JSON.stringify(summary)
  )
}

// ========== 对外 API ==========

/**
 * 判断是否需要触发合并压缩
 * 返回 true 表示应该使用合并压缩（同时做压缩和摘要）
 * 返回 false 表示只需要单独做压缩
 */
export function shouldUseCombinedCompression(
  existingSummary: SessionSummary | null,
  totalMessageCount: number
): boolean {
  const lastIdx = existingSummary?.lastSummarizedMessageIndex ?? 0
  return (totalMessageCount - lastIdx) >= SUMMARIZE_INTERVAL
}

/**
 * 执行合并压缩并保存结果
 * 包含降级策略：如果合并调用失败，回退到分别调用
 */
export async function executeCombinedCompression(
  storage: StorageDriver,
  apiService: LLMAPIService,
  input: CombinedCompressionInput
): Promise<CombinedCompressionOutput> {
  // 首先尝试合并调用
  try {
    const result = await combinedCompress(apiService, input)

    // 保存压缩历史
    const history = (await loadCompressedHistory(storage, input.sessionId)) || {
      sessionId: input.sessionId,
      turns: [],
      updatedAt: Date.now(),
    }
    history.turns.push(result.compressedTurn)
    history.updatedAt = Date.now()
    await saveCompressedHistory(storage, history)

    // 保存摘要
    await saveSessionSummary(storage, result.updatedSessionSummary)

    return result
  } catch (e) {
    // 降级策略：分别调用
    console.warn('Combined compression failed, falling back to separate calls:', e)
    throw e // 让调用方处理降级（或在这里直接实现降级逻辑）
  }
}
