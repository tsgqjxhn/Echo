import type { StorageDriver } from './storage'
import type { IMessage } from '@/types/chat'
import type { LLMAPIService } from './llm-api'

const SUMMARY_KEY_PREFIX = 'session_summary::'
const SUMMARIZE_INTERVAL = 10

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

const SUMMARY_SYSTEM_PROMPT = [
  '你是一个对话摘要助手。请用简洁的中文摘要以下对话内容。',
  '要求：',
  '1. 提取关键事实（人名、地点、事件、关系变化）',
  '2. 保留情感状态和角色互动变化',
  '3. 用第三人称叙述，不超过 200 字',
  '4. 如果有之前的摘要，将新内容融入已有摘要',
  '5. 只输出摘要内容，不要解释',
].join('\n')

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
