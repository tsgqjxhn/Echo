import type { Lorebook, LorebookEntry } from '@/types/character'
import type { ChatMessage } from '@/types/chat'

const DEFAULT_SCAN_RANGE = 10

/**
 * 匹配 lorebook 条目: 扫描最近 N 条消息, 返回被激活的条目 (按 order 降序)
 */
export function matchLorebookEntries(
  lorebook: Lorebook,
  recentMessages: ChatMessage[],
  characterName?: string
): LorebookEntry[] {
  const scanRange = lorebook.scanRange || DEFAULT_SCAN_RANGE
  const messages = recentMessages.slice(-scanRange)
  const textToScan = messages
    .map(m => typeof m.content === 'string' ? m.content : '')
    .join('\n')
    .toLowerCase()

  const matched = lorebook.entries
    .filter(entry => entry.enabled)
    .filter(entry => !entry.characterName || entry.characterName === characterName)
    .filter(entry => entry.keywords.some(kw => textToScan.includes(kw.toLowerCase())))

  return matched.sort((a, b) => b.order - a.order)
}

/**
 * 将匹配的 lorebook 条目分为 in-prompt 和 in-chat 两组
 */
export function partitionLorebookMatches(
  entries: LorebookEntry[]
): { inPrompt: LorebookEntry[]; inChat: LorebookEntry[] } {
  const inPrompt: LorebookEntry[] = []
  const inChat: LorebookEntry[] = []

  for (const entry of entries) {
    if (entry.position === 1) {
      inChat.push(entry)
    } else {
      inPrompt.push(entry)
    }
  }

  return { inPrompt, inChat }
}

/**
 * 将 in-prompt 条目合并为一段文本, 注入 system prompt
 */
export function buildLorebookPromptText(entries: LorebookEntry[]): string {
  if (entries.length === 0) return ''
  return entries.map(e => e.content).join('\n')
}

/**
 * 将 in-chat 条目转换为 ChatMessage, 按 depth 排序
 * depth=0 最靠近用户最新消息, depth 越大越早
 */
export function buildLorebookChatMessages(
  entries: LorebookEntry[],
  totalMessageCount: number
): Array<{ depth: number; message: ChatMessage }> {
  return entries
    .filter(e => e.depth < totalMessageCount)
    .map(e => ({
      depth: e.depth,
      message: { role: e.role, content: e.content } as ChatMessage,
    }))
    .sort((a, b) => b.depth - a.depth)
}
