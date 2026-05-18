import type { StorageDriver } from './storage'
import type { IMessage } from '@/types/chat'
import type { LLMAPIService } from './llm-api'

const COMPRESSED_KEY_PREFIX = 'compressed_history::'

// ========== 逐轮压缩参数调优 (B2) ==========
// 调优原则：60 tokens 可能过于激进，导致对话上下文丢失关键信息
// 增加到 75 tokens (+25%) 仍可显著节省 Token，但保留更多语义连贯性
// 同时调整其他相关参数以达到更好的整体压缩效果

const COMPRESS_MAX_TOKENS = 75          // 单轮压缩输出最大 token 数 - 从 60 增加 25%，保留更多语义
const USER_TRUNCATE_LENGTH = 90         // 用户输入截断长度 - 从 100 减少 10%，用户输入通常较短
const COMPRESSION_TEMPERATURE = 0.1     // 温度值 - 保持 0.1 不变，确保确定性
const DEFAULT_MAX_TURNS = 20            // 保留的历史轮数 - 保持不变
const DEFAULT_RAW_KEEP = 2              // 保留的原始消息轮数 - 保持不变

// 逐轮压缩系统提示词（B2 调优：保留关键信息的同时，要求更精炼的输出）
const COMPRESS_SYSTEM_PROMPT = `你是一个对话压缩助手。请将以下单轮对话压缩为极简的一句话摘要。
要求：
1. 保留关键事实：人名、地点、物品、承诺、状态变更、玩家选择、情感变化
2. 保留角色的称呼习惯和语气特征
3. 丢弃无意义的寒暄、重复表达、语气词
4. 格式：用第三人称客观叙述，不超过 40 字
5. 只输出摘要内容，不要解释、不要引号包裹`

export interface CompressedTurn {
  userContent: string
  assistantContent: string
  timestamp: number
}

export interface CompressedHistory {
  sessionId: string
  turns: CompressedTurn[]
  updatedAt: number
}

function getKey(sessionId: string): string {
  return `${COMPRESSED_KEY_PREFIX}${sessionId}`
}

export async function loadCompressedHistory(
  storage: StorageDriver,
  sessionId: string
): Promise<CompressedHistory | null> {
  const raw = await storage.getUserSetting(getKey(sessionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompressedHistory
  } catch {
    return null
  }
}

export async function saveCompressedHistory(
  storage: StorageDriver,
  history: CompressedHistory
): Promise<void> {
  await storage.saveUserSetting(getKey(history.sessionId), JSON.stringify(history))
}


function buildCompressPrompt(userText: string, assistantText: string, charName: string): string {
  return `用户：${userText}\n${charName}：${assistantText}\n\n请用一句话概括本轮对话的关键内容。`
}

/**
 * 压缩单轮对话（用户+助手）
 */
async function compressTurn(
  apiService: LLMAPIService,
  userText: string,
  assistantText: string,
  charName: string
): Promise<{ userSummary: string; assistantSummary: string }> {
  // 用户输入通常较短，直接截断保留即可，避免额外 API 调用
  const userSummary = userText.length > USER_TRUNCATE_LENGTH ? userText.slice(0, USER_TRUNCATE_LENGTH) + '…' : userText

  // 助手回复可能很长，用模型压缩
  const prompt = buildCompressPrompt(userText, assistantText, charName)
  const summary = await apiService.chat({
    systemPrompt: COMPRESS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: COMPRESS_MAX_TOKENS,
    temperature: COMPRESSION_TEMPERATURE,
  })

  const assistantSummary = summary.trim() || assistantText.slice(0, 100)
  return { userSummary, assistantSummary }
}

/**
 * 追加最新一轮对话到压缩历史
 * 异步执行，不阻塞用户阅读
 */
export async function appendCompressedTurn(
  storage: StorageDriver,
  apiService: LLMAPIService,
  sessionId: string,
  userMsg: IMessage,
  assistantMsg: IMessage,
  charName: string,
  maxTurns: number = DEFAULT_MAX_TURNS
): Promise<void> {
  const userText = extractText(userMsg)
  const assistantText = extractText(assistantMsg)

  if (!userText || !assistantText) return

  const history = (await loadCompressedHistory(storage, sessionId)) || {
    sessionId,
    turns: [],
    updatedAt: Date.now(),
  }

  const { userSummary, assistantSummary } = await compressTurn(
    apiService,
    userText,
    assistantText,
    charName
  )

  history.turns.push({
    userContent: userSummary,
    assistantContent: assistantSummary,
    timestamp: Date.now(),
  })

  // 超限截断：保留最近 maxTurns 条
  if (history.turns.length > maxTurns) {
    history.turns = history.turns.slice(-maxTurns)
  }

  history.updatedAt = Date.now()
  await saveCompressedHistory(storage, history)
}

/**
 * 将压缩历史转换为 ChatMessage[] 用于上下文
 * 保留最近 rawKeep 轮原始消息，其余用压缩历史填充
 * 自动跳过 greeting（第一条没有前置 user 的 assistant 消息）
 */
export function buildCompressedMessages(
  allMessages: IMessage[],
  compressedHistory: CompressedHistory | null,
  rawKeep: number = DEFAULT_RAW_KEEP
): {
  greeting: IMessage | null
  rawMessages: IMessage[]
  compressedMessages: { role: 'user' | 'assistant'; content: string }[]
} {
  // 分离 greeting（第一条且 role === 'assistant'，前面没有 user）
  let greeting: IMessage | null = null
  let startIndex = 0
  if (allMessages.length > 0 && allMessages[0].role === 'assistant') {
    greeting = allMessages[0]
    startIndex = 1
  }

  // 按轮次分组（user + 后续 assistant 为一轮）
  const turns: IMessage[][] = []
  let currentTurn: IMessage[] = []
  for (let i = startIndex; i < allMessages.length; i++) {
    const msg = allMessages[i]
    if (msg.role === 'user' && currentTurn.length > 0) {
      turns.push(currentTurn)
      currentTurn = [msg]
    } else {
      currentTurn.push(msg)
    }
  }
  if (currentTurn.length > 0) {
    turns.push(currentTurn)
  }

  const totalTurns = turns.length
  const rawTurnCount = Math.min(rawKeep, totalTurns)
  const compressedTurnCount = totalTurns - rawTurnCount

  // 最近 rawKeep 轮保留原始消息
  const rawTurns = turns.slice(-rawTurnCount)
  const rawMessages = rawTurns.flat()

  // 更早的轮次用压缩历史替代
  const compressedMessages: { role: 'user' | 'assistant'; content: string }[] = []

  if (compressedHistory && compressedTurnCount > 0) {
    const available = compressedHistory.turns.slice(-compressedTurnCount)
    for (const turn of available) {
      compressedMessages.push({ role: 'user', content: `[历史] ${turn.userContent}` })
      compressedMessages.push({ role: 'assistant', content: `[历史] ${turn.assistantContent}` })
    }
  }

  return { greeting, rawMessages, compressedMessages }
}

/**
 * 检测用户消息是否包含质疑/纠正意图
 */
export function isQuestioningIntent(text: string): boolean {
  const triggers = [
    '不对',
    '错了',
    '你记错',
    '刚才',
    '之前不是',
    '你不是说',
    '我没说',
    '不应该是',
    ' contradict',
    ' wrong',
    ' earlier you said',
  ]
  const lower = text.toLowerCase()
  return triggers.some(t => lower.includes(t.toLowerCase()))
}

function extractText(message: IMessage): string {
  if (message.contentType === 'text') return message.content
  try {
    const parsed = JSON.parse(message.content) as Record<string, unknown>
    return (parsed.text as string) || (parsed.description as string) || message.content
  } catch {
    return message.content
  }
}
