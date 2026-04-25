/**
 * Chat service
 * Handles session, history, and reply generation orchestration.
 */

import type { StorageDriver } from './storage'
import type { AbortableChatStream, LLMAPIService } from './llm-api'
import type { IMessage, IChatSession, ChatContext, ChatMessage, ChatContentPart } from '@/types/chat'
import type { ICharacter } from '@/types/character'
import { MessageType } from '@/types/chat'
import { Message } from '@/entity/message'
import { generateUUID } from '@/utils/uuid'
import {
  buildCharacterMemoryPrompt,
  rebuildCharacterMemoryFromSession,
  updateCharacterMemoryFromMessage,
} from './chat-memory'
import {
  matchLorebookEntries,
  partitionLorebookMatches,
  buildLorebookPromptText,
  buildLorebookChatMessages,
} from './lorebook'
import { searchMemories, addMemory, type MemorySearchResult } from './semantic-memory'
import { touchMemory } from './memory-lifecycle'
import { buildContextWindow, trimMessagesToTokenLimit } from './context-manager'
import { loadSessionSummary, shouldSummarize, summarizeSession } from './summarizer'
import { getCharacterAISummary } from './character-profile-json'

const MAX_SYSTEM_PROMPT_LENGTH = 6000
const FORMAT_INSTRUCTION = '【格式规范】动作、神态、心理活动等非对话内容必须用中文圆括号（）包裹，严禁使用*星号*标记。示例：（微笑着点头）而非 *微笑着点头*。'
const CONTEXT_WINDOW_SIZE = 20

function parseExampleDialogue(raw: string): ChatMessage[] {
  if (!raw?.trim()) return []
  const messages: ChatMessage[] = []
  const blocks = raw.split(/<START>/i)

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const userMatch = line.match(/^user:\s*(.+)/i) || line.match(/^用户[：:]\s*(.+)/)
      const assistantMatch = line.match(/^(?:assistant|{{char}}):\s*(.+)/i) || line.match(/^角色[：:]\s*(.+)/)

      if (userMatch) {
        messages.push({ role: 'user', content: userMatch[1].trim() })
      } else if (assistantMatch) {
        messages.push({ role: 'assistant', content: assistantMatch[1].trim() })
      }
    }
  }

  return messages
}

export class ChatService {
  private storage: StorageDriver
  private apiService?: LLMAPIService
  private activeStream: AbortableChatStream | null = null

  constructor(storage: StorageDriver, apiService?: LLMAPIService) {
    this.storage = storage
    this.apiService = apiService
  }

  setAPIService(apiService?: LLMAPIService): void {
    this.apiService = apiService
  }

  cancelActiveGeneration(): void {
    this.activeStream?.abort()
    this.activeStream = null
  }

  async appendMessage(message: IMessage): Promise<void> {
    await this.storage.saveMessage(message)
    await this.syncSessionAfterMessage(message.sessionId, message.timestamp)
    await updateCharacterMemoryFromMessage(this.storage, message.sessionId, message)
    await this.indexMessageToSemanticMemory(message)
  }

  async saveAssistantReply(sessionId: string, content: string): Promise<IMessage> {
    const reply = Message.createText(sessionId, 'assistant', content)
    await this.storage.saveMessage(reply)
    await this.syncSessionAfterMessage(sessionId, reply.timestamp)
    await updateCharacterMemoryFromMessage(this.storage, sessionId, reply)
    return reply
  }

  async sendMessage(sessionId: string): Promise<AsyncGenerator<string, void, unknown>> {
    return this.generateReply(sessionId)
  }

  async sendImage(sessionId: string): Promise<AsyncGenerator<string, void, unknown>> {
    return this.generateReply(sessionId)
  }

  async sendVoice(sessionId: string): Promise<AsyncGenerator<string, void, unknown>> {
    return this.generateReply(sessionId)
  }

  async generateReply(sessionId: string): Promise<AsyncGenerator<string, void, unknown>> {
    const context = await this.buildContext(sessionId)
    return this.generateTextStream(context)
  }

  async generateOneShotReply(sessionId: string, extraSystemPrompt = ''): Promise<string> {
    if (!this.apiService) {
      throw new Error('Please configure an API provider before chatting.')
    }

    const context = await this.buildContext(sessionId, extraSystemPrompt)
    return this.apiService.chat(context)
  }

  private async *generateTextStream(
    context: ChatContext
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiService) {
      throw new Error('Please configure an API provider before chatting.')
    }

    this.cancelActiveGeneration()

    const abortableStream = this.apiService.chatStreamAbortable(context)
    this.activeStream = abortableStream

    try {
      for await (const chunk of abortableStream.stream) {
        if (chunk.content) {
          yield chunk.content
        }
      }
    } finally {
      if (this.activeStream === abortableStream) {
        this.activeStream = null
      }
    }
  }

  private async syncSessionAfterMessage(sessionId: string, timestamp: number): Promise<void> {
    const session = await this.storage.getSession(sessionId)
    if (!session) {
      return
    }

    const messages = await this.storage.getMessages(sessionId)
    session.messageCount = messages.length
    session.updatedAt = Math.max(session.updatedAt || 0, timestamp || 0)
    await this.storage.saveSession(session)
  }

  private async buildContext(sessionId: string, extraSystemPrompt = ''): Promise<ChatContext> {
    const session = await this.storage.getSession(sessionId)
    if (!session) {
      throw new Error('Chat session was not found.')
    }

    const character = await this.storage.getCharacter(session.characterId)
    if (!character) {
      throw new Error('Character was not found.')
    }

    const userInfo = await this.storage.getUserInfo()
    const memoryPrompt = await buildCharacterMemoryPrompt(this.storage, character.id, character.name)

    // ── Sliding window + hierarchical summary ──
    const allMessages = await this.storage.getMessages(sessionId, 200)
    const sessionSummary = await loadSessionSummary(this.storage, sessionId)
    const ctxWindow = buildContextWindow(allMessages, sessionSummary, { recentWindowSize: CONTEXT_WINDOW_SIZE })
    const summaryText = ctxWindow.summary

    // ── Build message history from context window ──
    const messageHistory: ChatMessage[] = []

    if (ctxWindow.greetingMessage) {
      messageHistory.push({
        role: ctxWindow.greetingMessage.role,
        content: this.mapMessageToContent(ctxWindow.greetingMessage),
      })
    }

    const exampleMessages = parseExampleDialogue(character.exampleDialogue || '')
    messageHistory.push(...exampleMessages)

    const greetingId = ctxWindow.greetingMessage?.id
    for (const msg of ctxWindow.recentMessages) {
      if (msg.id === greetingId && messageHistory.length > 0) continue
      messageHistory.push({
        role: msg.role,
        content: this.mapMessageToContent(msg),
      })
    }

    const recentForRetrieval = ctxWindow.recentMessages

    // ── Lorebook: keyword matching against recent messages ──
    const lorebookInChat = this.injectLorebookChatEntries(character, messageHistory)

    // ── Semantic memory retrieval ──
    let semanticResults: MemorySearchResult[] = []
    const lastUserMsg = recentForRetrieval.filter(m => m.role === 'user').slice(-1)[0]
    if (lastUserMsg) {
      const queryText = lastUserMsg.content.trim()
      if (queryText.length >= 2) {
        semanticResults = await searchMemories(this.storage, queryText, character.id, {
          topK: 5,
          minScore: 0.3,
          heatFilter: 'hot',
        })
        // Touch accessed memories
        for (const r of semanticResults) {
          await touchMemory(this.storage, r.entry.id).catch(() => {})
        }
      }
    }

    // ── Layered system prompt assembly ──
    const characterAISummary = getCharacterAISummary(character)
    const systemPrompt = this.buildSystemPrompt(character, userInfo, memoryPrompt, extraSystemPrompt, messageHistory, semanticResults, summaryText, characterAISummary)

    // ── Depth prompt injection into message history ──
    if (character.depthPrompt) {
      this.injectDepthPrompt(character.depthPrompt, messageHistory)
    }

    // ── Post-history reminder ──
    const postHistoryPrompt = [
      `[系统提醒] 请继续保持${character.name}的语气和性格。`,
      `记住你们的关系状态，用自然的口吻回复。`,
      `不要总结、不要解释、不要跳出角色。`,
    ].join(' ')

    return {
      systemPrompt,
      messages: lorebookInChat || messageHistory,
      postHistoryPrompt,
      character,
    }
  }

  /**
   * 按层次组装 system prompt:
   * Layer 1: Persona (Anchor → Traits → Voice)
   * Layer 2: Scenario (场景设定)
   * Layer 3: Description (角色描述 + personality + behavior + values)
   * Layer 4: User profile (用户画像)
   * Layer 5: Memory (长期记忆)
   * Layer 6: Lorebook in-prompt entries
   * Layer 7: Settings + Global prompt
   * Layer 8: Format instruction + Extra
   */
  private buildSystemPrompt(
    character: ICharacter,
    userInfo: { name?: string; corePrompt?: string; globalPrompt?: string } | null,
    memoryPrompt: string,
    extraSystemPrompt: string,
    messageHistory: ChatMessage[],
    semanticResults: MemorySearchResult[] = [],
    sessionSummary: string | null = null,
    characterAISummary = ''
  ): string {
    const sections: string[] = []

    // Layer 1: Persona (Anchor-Traits-Voice)
    if (character.persona) {
      const { anchor, traits, voice } = character.persona
      const personaLines: string[] = []
      if (anchor.trim()) personaLines.push(anchor)
      if (traits.length > 0) personaLines.push(`核心特质：${traits.join('、')}`)
      if (voice.trim()) personaLines.push(`交流风格：${voice}`)
      if (personaLines.length > 0) {
        sections.push(`【角色身份】\n${personaLines.join('\n')}`)
      }
    }

    // Layer 2: Scenario
    if (character.scenario?.trim()) {
      sections.push(`【场景设定】\n${character.scenario}`)
    }

    if (characterAISummary.trim()) {
      sections.push(`【角色资料摘要】\n${characterAISummary.trim()}`)
    }

    // Layer 3: Description (full character info)
    const descParts = [
      `【角色设定】`,
      `${character.name} 的完整信息：`,
      character.description,
      character.personality ? `性格：${character.personality}` : '',
      character.behavior ? `行为模式：${character.behavior}` : '',
      character.values ? `价值观：${character.values}` : '',
    ].filter((v): v is string => v.trim().length > 0)
    if (descParts.length > 1) {
      sections.push(descParts.join('\n'))
    }

    // Layer 4: User profile
    if (userInfo?.name || userInfo?.corePrompt) {
      const userSection = [
        `【用户画像】`,
        userInfo.name ? `用户名字：${userInfo.name}` : '',
        userInfo.corePrompt || '',
      ].filter((v): v is string => v.trim().length > 0).join('\n')
      if (userSection.trim()) sections.push(userSection)
    }

    // Layer 5: Memory (regex-based long-term memory from chat-memory.ts)
    if (memoryPrompt) {
      sections.push(`【长期记忆】\n${memoryPrompt}`)
    }

    // Layer 5.3: Session summary (compressed conversation history)
    if (sessionSummary) {
      sections.push(`【对话摘要】\n${sessionSummary}`)
    }

    // Layer 5.6: Semantic memory (embedding-based retrieval)
    if (semanticResults.length > 0) {
      const semanticLines = semanticResults.map(r => `- ${r.entry.text}`)
      sections.push(`【相关记忆】\n${semanticLines.join('\n')}`)
    }

    // Layer 6: Lorebook in-prompt entries
    if (character.lorebook) {
      const allMatched = matchLorebookEntries(character.lorebook, messageHistory, character.name)
      const { inPrompt } = partitionLorebookMatches(allMatched)
      const lorebookText = buildLorebookPromptText(inPrompt)
      if (lorebookText) {
        sections.push(`【世界知识】\n${lorebookText}`)
      }
    }

    // Layer 7: Settings + Global prompt
    if (userInfo?.globalPrompt) {
      sections.push(userInfo.globalPrompt)
    }
    if (character.settings) {
      sections.push(character.settings)
    }

    // Layer 8: Format + Extra
    sections.push(FORMAT_INSTRUCTION)
    if (extraSystemPrompt) {
      sections.push(extraSystemPrompt)
    }

    const raw = sections.join('\n\n')
    // Token-aware trimming: cap system prompt to ~4000 tokens (~6000 chars safety)
    return raw.length > MAX_SYSTEM_PROMPT_LENGTH
      ? raw.slice(0, MAX_SYSTEM_PROMPT_LENGTH)
      : raw
  }

  /**
   * 注入 lorebook in-chat 条目到消息历史
   */
  private injectLorebookChatEntries(character: ICharacter, messages: ChatMessage[]): ChatMessage[] | null {
    if (!character.lorebook) return null

    const allMatched = matchLorebookEntries(character.lorebook, messages, character.name)
    const { inChat } = partitionLorebookMatches(allMatched)
    if (inChat.length === 0) return null

    const insertions = buildLorebookChatMessages(inChat, messages.length)
    const result = [...messages]

    for (const { depth, message } of insertions) {
      const insertIndex = Math.max(0, result.length - depth)
      result.splice(insertIndex, 0, message)
    }

    return result
  }

  /**
   * 注入 depth prompt 到消息历史中指定深度位置
   */
  private injectDepthPrompt(dp: NonNullable<ICharacter['depthPrompt']>, messages: ChatMessage[]): void {
    const insertIndex = Math.max(0, messages.length - dp.depth)
    messages.splice(insertIndex, 0, { role: dp.role, content: dp.prompt })
  }

  /**
   * 将消息索引到语义记忆 (后台, 不阻塞回复)
   */
  private async indexMessageToSemanticMemory(message: IMessage): Promise<void> {
    const text = this.extractPlainText(message)
    if (!text || text.length < 4) return

    const session = await this.storage.getSession(message.sessionId)
    if (!session) return

    await addMemory(this.storage, {
      characterId: session.characterId,
      sessionId: message.sessionId,
      text,
      source: message.role === 'user' ? 'user' : 'assistant',
    }).catch(() => {})
  }

  private extractPlainText(message: IMessage): string {
    if (message.contentType === MessageType.TEXT) return message.content.trim()
    if (message.contentType === MessageType.AUDIO || message.contentType === MessageType.IMAGE) {
      try {
        const parsed = JSON.parse(message.content) as Record<string, unknown>
        return ((parsed.text as string) || (parsed.description as string) || '').trim()
      } catch {
        return ''
      }
    }
    return ''
  }

  private mapMessageToContent(message: IMessage): string | ChatContentPart[] {
    if (message.contentType === MessageType.TEXT) {
      return message.content
    }

    if (message.contentType === MessageType.AUDIO) {
      try {
        const parsed = JSON.parse(message.content) as { text?: string }
        return parsed.text?.trim() || message.content
      } catch {
        return message.content
      }
    }

    if (message.contentType === MessageType.IMAGE) {
      try {
        const parsed = JSON.parse(message.content) as { imagePath?: string; description?: string }
        const imagePath = parsed.imagePath || message.content

        if (message.role === 'user') {
          return [
            {
              type: 'text',
              text: parsed.description?.trim() || 'Please consider the attached image in your reply.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imagePath,
              },
            },
          ]
        }

        return parsed.description?.trim() || '[Image]'
      } catch {
        return message.role === 'user'
          ? [
              { type: 'text', text: 'Please consider the attached image in your reply.' },
              { type: 'image_url', image_url: { url: message.content } },
            ]
          : '[Image]'
      }
    }

    return message.content
  }

  async getHistory(
    sessionId: string,
    page: number = 0,
    pageSize: number = 50
  ): Promise<IMessage[]> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 50

    return this.storage.getMessages(sessionId, safePageSize, safePage * safePageSize)
  }

  async clearHistory(sessionId: string): Promise<boolean> {
    await this.storage.deleteMessages(sessionId)

    const session = await this.storage.getSession(sessionId)
    if (session) {
      session.messageCount = 0
      session.updatedAt = Date.now()
      await this.storage.saveSession(session)
    }

    return true
  }

  async likeMessage(messageId: string): Promise<boolean> {
    const message = await this.storage.getMessage(messageId)
    if (!message) {
      throw new Error('Message was not found.')
    }

    message.isLiked = !message.isLiked
    await this.storage.updateMessage(message)

    return message.isLiked
  }

  async createSession(characterId: string, greetingIndex?: number): Promise<string> {
    const character = await this.storage.getCharacter(characterId)
    const session: IChatSession = {
      id: generateUUID(),
      characterId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      title: character?.name || '新对话',
      mode: character?.sourceType === 'builtin-story' ? 'story' : 'chat',
    }

    await this.storage.saveSession(session)

    const greetingText = this.selectGreeting(character, greetingIndex)
    if (greetingText) {
      const greetingMessage = Message.createText(session.id, 'assistant', greetingText)
      await this.storage.saveMessage(greetingMessage)
      await this.syncSessionAfterMessage(session.id, greetingMessage.timestamp)
      await updateCharacterMemoryFromMessage(this.storage, session.id, greetingMessage)
    }

    return session.id
  }

  private selectGreeting(character: ICharacter | null, greetingIndex?: number): string | undefined {
    if (!character) return undefined

    if (greetingIndex !== undefined && character.alternateGreetings && character.alternateGreetings.length > 0) {
      const idx = Math.max(0, Math.min(greetingIndex, character.alternateGreetings.length - 1))
      return character.alternateGreetings[idx]
    }

    return character.greeting
  }

  async getSession(sessionId: string): Promise<IChatSession | null> {
    return this.storage.getSession(sessionId)
  }

  async getLatestSessionByCharacter(characterId: string): Promise<IChatSession | null> {
    const sessions = await this.storage.getSessionsByCharacter(characterId)
    if (sessions.length === 0) {
      return null
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  async getCharacter(characterId: string) {
    return this.storage.getCharacter(characterId)
  }

  async updateLastMessage(sessionId: string, content: string): Promise<void> {
    const messages = await this.storage.getMessages(sessionId)
    const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant')

    if (!lastAssistant) {
      return
    }

    lastAssistant.content = content
    await this.storage.updateMessage(lastAssistant)
  }

  async deleteMessage(messageId: string): Promise<void> {
    const message = await this.storage.getMessage(messageId)
    if (!message) {
      return
    }

    const messages = await this.storage.getMessages(message.sessionId)
    await this.storage.replaceMessages(
      message.sessionId,
      messages.filter(item => item.id !== messageId)
    )
    await rebuildCharacterMemoryFromSession(this.storage, message.sessionId)
  }

  async retryGeneration(
    sessionId: string,
    lastUserMessage?: IMessage
  ): Promise<AsyncGenerator<string, void, unknown>> {
    if (lastUserMessage) {
      const messages = await this.storage.getMessages(sessionId)
      const boundaryIndex = messages.findIndex(message => message.id === lastUserMessage.id)

      if (boundaryIndex >= 0) {
        await this.storage.replaceMessages(sessionId, messages.slice(0, boundaryIndex + 1))
        await rebuildCharacterMemoryFromSession(this.storage, sessionId)
      } else {
        console.warn('Retry boundary message was not found. Continuing with current history.')
      }
    }

    return this.generateReply(sessionId)
  }
}

export function createChatService(
  storage: StorageDriver,
  apiService?: LLMAPIService
): ChatService {
  return new ChatService(storage, apiService)
}
