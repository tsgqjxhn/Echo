import type { StorageDriver } from './storage'
import type { IMessage } from '@/types/chat'
import type { LLMAPIService } from './llm-api'

const SUMMARY_KEY_PREFIX = 'session_summary::'

// ========== 摘要参数调优 (B2 + B3) ==========
// B2: SUMMARIZE_INTERVAL 从 10 调整为 8
// 理由：更频繁地进行摘要，换取单轮压缩质量提升（75 tokens），整体平衡更佳
// B3: 优化 SUMMARY_SYSTEM_PROMPT 指令
// - 添加角色扮演上下文保留：语气、称呼习惯、情感状态
// - 添加结构化输出要求，使用标签分类
// - 保留关键决策和情节转折点

const SUMMARIZE_INTERVAL = 8            // 累计 N 轮后触发摘要 - 从 10 降至 8，更频繁更新
const SUMMARY_MAX_TOKENS = 200          // 摘要输出最大长度
const SUMMARY_TEMPERATURE = 0.1         // 摘要温度值 - 保持低温度确保一致性

const SUMMARY_SYSTEM_PROMPT = [
  '你是一个对话摘要助手。请用精炼的中文摘要以下对话内容。',
  '要求：',
  '1. 提取关键事实（人名、地点、物品、事件、关系变化、关键决策、情节转折点）',
  '2. 保留角色说话的语气、称呼习惯和情感状态变化',
  '3. 结构化输出：使用 [事件] [情感] [关系] [决策] 标签标记关键内容',
  '4. 省略寒暄、重复表达和无实质内容的对话',
  '5. 用第三人称客观叙述，总长度不超过 180 字',
  '6. 如果有之前的摘要，将新内容自然融入已有摘要，保持连贯性',
  '7. 只输出摘要内容，不要解释、不要标签外的额外说明',
].join('\n')

export interface SessionSummary {
  sessionId: string
  characterId: string
  characterName: string
  summary: string
  lastSummarizedMessageIndex: number
  updatedAt: number
}

function getSummaryKey(sessionId: string): string {
  return `${SUMMARY_KEY_PREFIX}${sessionId}`
}


export async function loadSessionSummary(
  storage: StorageDriver,
  sessionId: string
): Promise<SessionSummary | null> {
  const raw = await storage.getUserSetting(getSummaryKey(sessionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionSummary
  } catch {
    return null
  }
}

export async function saveSessionSummary(
  storage: StorageDriver,
  summary: SessionSummary
): Promise<void> {
  await storage.saveUserSetting(getSummaryKey(summary.sessionId), JSON.stringify(summary))
}

/**
 * 检查是否需要摘要: 自上次摘要后又积累了 SUMMARIZE_INTERVAL 条消息
 */
export function shouldSummarize(
  existing: SessionSummary | null,
  totalMessageCount: number
): boolean {
  const lastIdx = existing?.lastSummarizedMessageIndex ?? 0
  return (totalMessageCount - lastIdx) >= SUMMARIZE_INTERVAL
}

/**
 * 执行对话摘要, 返回更新后的摘要
 */
export async function summarizeSession(
  storage: StorageDriver,
  apiService: LLMAPIService,
  sessionId: string,
  messages: IMessage[],
  characterName: string,
  characterId: string,
  existing: SessionSummary | null
): Promise<SessionSummary> {
  const lastIdx = existing?.lastSummarizedMessageIndex ?? 0
  const newMessages = messages.slice(lastIdx)
  if (newMessages.length === 0) {
    return existing || {
      sessionId,
      characterId,
      characterName,
      summary: '',
      lastSummarizedMessageIndex: 0,
      updatedAt: Date.now(),
    }
  }

  const dialogue = newMessages
    .map(m => `${m.role === 'user' ? '用户' : characterName}：${extractText(m)}`)
    .join('\n')

  const userPrompt = existing?.summary
    ? `已有摘要：\n${existing.summary}\n\n新增对话：\n${dialogue}\n\n请将新内容融入已有摘要，生成更新后的摘要。`
    : `请摘要以下对话：\n${dialogue}`

  const summaryText = await apiService.chat({
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const result: SessionSummary = {
    sessionId,
    characterId,
    characterName,
    summary: summaryText.trim(),
    lastSummarizedMessageIndex: messages.length,
    updatedAt: Date.now(),
  }

  await saveSessionSummary(storage, result)
  return result
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
