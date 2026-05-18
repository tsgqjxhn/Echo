/**
 * Chat store
 * Manages chat sessions, messages, and reply generation state.
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import type { IMessage, IChatSession, TokenUsage } from '@/types/chat'
import { Message } from '@/entity/message'
import { getStorageDriver } from '@/services/storage'
import { createLLMAPI } from '@/services/llm-api'
import { createChatService, type ChatService } from '@/services/chat'
import { apiConfigService } from '@/services/api-config'
import { isGroupChatStyle, isMultiplayerStyle } from '@/data/taxonomy'
import { estimateTokens } from '@/services/token-counter'
import { emitAppNotification } from '@/services/notification'

/**
 * 拆分群聊/多人模式的多成员回复
 * 格式：成员名：消息内容
 * 返回 [{ memberName, content }] 数组；如果无法拆分则返回 null
 */
function splitMultiMemberReply(text: string): Array<{ memberName: string; content: string }> | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const results: Array<{ memberName: string; content: string }> = []

  for (const line of lines) {
    // 匹配 "成员名：消息内容" 或 "成员名:消息内容"
    const match = line.match(/^([^：:\n]{1,20})[：:](.+)$/)
    if (!match) {
      // 如果某一行不符合格式，整体回退为单条消息
      return null
    }
    const memberName = match[1].trim()
    const content = match[2].trim()
    if (memberName && content) {
      results.push({ memberName, content })
    }
  }

  return results.length > 0 ? results : null
}

export interface ChatState {
  currentSessionId: string | null
  currentCharacterId: string | null
  messages: IMessage[]
  isGenerating: boolean
  sessions: IChatSession[]
}

function stripTagBlock(source: string, tagName: string): string {
  let result = source
  const openNeedle = `<${tagName}`
  const closeNeedle = `</${tagName}>`

  while (true) {
    const lower = result.toLowerCase()
    const openIndex = lower.indexOf(openNeedle)
    if (openIndex < 0) {
      return result
    }

    const openEnd = result.indexOf('>', openIndex)
    if (openEnd < 0) {
      return result.slice(0, openIndex)
    }

    const closeIndex = lower.indexOf(closeNeedle, openEnd + 1)
    if (closeIndex < 0) {
      return result.slice(0, openIndex)
    }

    result = `${result.slice(0, openIndex)}${result.slice(closeIndex + closeNeedle.length)}`
  }
}

function sanitizeAssistantOutput(content: string): string {
  const withoutThinking = ['think', 'thinking'].reduce(
    (text, tagName) => stripTagBlock(text, tagName),
    content
  )

  return withoutThinking
    .replace(/<\/?(?:think|thinking)\b[^>]*>/gi, '')
    .replace(/^\s+/, '')
}

function extractThinkingText(content: string): string {
  const parts: string[] = []
  content.replace(/<(?:think|thinking)\b[^>]*>([\s\S]*?)(?:<\/(?:think|thinking)>|$)/gi, (_match, body: string) => {
    if (body?.trim()) {
      parts.push(body.trim())
    }
    return ''
  })
  return parts.join('\n')
}

function estimateReplyTokenUsage(
  promptText: string,
  visibleText: string,
  rawText: string,
  includePrompt = true,
  includeThinking = true,
): TokenUsage {
  const promptTokens = includePrompt ? estimateTokens(promptText) : 0
  const completionTokens = estimateTokens(visibleText)
  const thinkingTokens = includeThinking ? estimateTokens(extractThinkingText(rawText)) : 0

  return {
    promptTokens,
    completionTokens,
    thinkingTokens,
    totalTokens: promptTokens + completionTokens + thinkingTokens,
  }
}

function extractMessageEstimateText(message: IMessage): string {
  if (message.contentType === 'text') {
    return message.content || ''
  }

  try {
    const parsed = JSON.parse(message.content) as Record<string, unknown>
    return String(parsed.text || parsed.description || parsed.caption || message.content || '')
  } catch {
    return message.content || ''
  }
}

async function emitAssistantReplyNotification(sessionId: string, content: string) {
  const storage = getStorageDriver()
  const session = await storage.getSession(sessionId)
  const character = session ? await storage.getCharacter(session.characterId) : null
  const body = content.replace(/\s+/g, ' ').trim().slice(0, 90)

  emitAppNotification({
    title: character?.name ? `${character.name} 回复了你` : '收到新回复',
    body,
    route: session ? `/chat/${session.characterId}?sessionId=${sessionId}` : undefined,
  })
}

export const useChatStore = defineStore('chat', () => {
  const currentSessionId = ref<string | null>(null)
  const currentCharacterId = ref<string | null>(null)
  const messages = ref<IMessage[]>([])
  const sessions = ref<IChatSession[]>([])
  const proactiveTimers = new Map<string, number>()
  const draftMessagesBySession = new Map<string, IMessage>()
  const generatingSessionIds = ref<string[]>([])

  const currentSession = computed(() => {
    return sessions.value.find(session => session.id === currentSessionId.value) || null
  })

  const hasMessages = computed(() => messages.value.length > 0)
  const isGenerating = computed(() => generatingSessionIds.value.length > 0)
  const isCurrentSessionGenerating = computed(() =>
    currentSessionId.value ? generatingSessionIds.value.includes(currentSessionId.value) : false
  )

  function isSessionGenerating(sessionId: string): boolean {
    return generatingSessionIds.value.includes(sessionId)
  }

  function setSessionGenerating(sessionId: string, generating: boolean) {
    const ids = new Set(generatingSessionIds.value)
    if (generating) {
      ids.add(sessionId)
    } else {
      ids.delete(sessionId)
    }
    generatingSessionIds.value = Array.from(ids)
  }

  function getLocalChatService(): ChatService {
    return createChatService(getStorageDriver())
  }

  /**
   * 取消指定会话的流式生成（可选操作，不会自动触发）
   * @param sessionId 可选，不传则取消所有
   */
  function cancelSessionGeneration(sessionId?: string) {
    const chatService = getLocalChatService()
    chatService.cancelActiveGeneration(sessionId)
    if (sessionId) {
      setSessionGenerating(sessionId, false)
    } else {
      generatingSessionIds.value = []
    }
  }

  async function getRemoteChatService(): Promise<ChatService> {
    const config = await apiConfigService.getDefaultConfig()
    if (!config) {
      throw new Error('Please configure an API provider in Settings first.')
    }

    return createChatService(getStorageDriver(), createLLMAPI(config))
  }

  async function initChat(characterId?: string, sessionId?: string, greetingIndex?: number) {
    const chatService = getLocalChatService()

    if (sessionId) {
      const session = await chatService.getSession(sessionId)
      if (!session) {
        throw new Error('Chat session was not found.')
      }

      currentSessionId.value = session.id
      currentCharacterId.value = session.characterId
      await loadMessages()
      return
    }

    if (!characterId) {
      return
    }

    currentCharacterId.value = characterId
    const latestSession = await chatService.getLatestSessionByCharacter(characterId)
    currentSessionId.value = latestSession?.id || (await chatService.createSession(characterId, greetingIndex))
    await loadMessages()
  }

  async function loadMessages() {
    if (!currentSessionId.value) {
      messages.value = []
      return
    }

    const chatService = getLocalChatService()
    const history = await chatService.getHistory(currentSessionId.value)
    const draft = draftMessagesBySession.get(currentSessionId.value)
    messages.value = draft ? [...history, draft] : history
  }

  async function streamAssistantReply(
    sessionId: string,
    streamFactory: () => Promise<AsyncGenerator<string, void, unknown>>
  ) {
    if (!sessionId) {
      return
    }

    const chatService = getLocalChatService()
    const draftMessage = Message.createEmpty(sessionId)
    draftMessagesBySession.set(sessionId, draftMessage)
    if (currentSessionId.value === sessionId) {
      messages.value.push(draftMessage)
    }
    setSessionGenerating(sessionId, true)

    const updateVisibleDraft = async (content: string) => {
      const nextDraft = { ...(draftMessagesBySession.get(sessionId) || draftMessage), content }
      draftMessagesBySession.set(sessionId, nextDraft)

      if (currentSessionId.value !== sessionId) {
        return
      }

      const idx = messages.value.findIndex(m => m.id === draftMessage.id)
      if (idx >= 0) {
        messages.value.splice(idx, 1, nextDraft)
      } else {
        messages.value = [...messages.value, nextDraft]
      }
      await nextTick()
    }

    const removeVisibleDraft = () => {
      draftMessagesBySession.delete(sessionId)
      if (currentSessionId.value === sessionId) {
        messages.value = messages.value.filter(message => message.id !== draftMessage.id)
      }
    }

    const replaceVisibleDraft = async (savedReply: IMessage) => {
      draftMessagesBySession.delete(sessionId)
      if (currentSessionId.value === sessionId) {
        const savedIdx = messages.value.findIndex(m => m.id === draftMessage.id)
        if (savedIdx >= 0) {
          messages.value.splice(savedIdx, 1, savedReply)
        } else {
          messages.value = [...messages.value, savedReply]
        }
        await nextTick()
      }
    }

    try {
      const storage = getStorageDriver()
      const existingMessages = await storage.getMessages(sessionId)
      const latestUserMessage = [...existingMessages].reverse().find(message => message.role === 'user')
      const latestUserText = latestUserMessage ? extractMessageEstimateText(latestUserMessage) : ''
      const stream = await streamFactory()
      let rawText = ''
      let visibleText = ''

      for await (const chunk of stream) {
        rawText += chunk
        visibleText = sanitizeAssistantOutput(rawText)
        await updateVisibleDraft(visibleText)
      }

      visibleText = sanitizeAssistantOutput(rawText)
      await updateVisibleDraft(visibleText)

      if (visibleText.trim()) {
        // 判断是否为群聊/多人模式，尝试拆分多成员消息
        const session = await storage.getSession(sessionId)
        const character = session ? await storage.getCharacter(session.characterId) : null
        const isMultiplayerMode = character && (
          isGroupChatStyle(character.subCategory) || isMultiplayerStyle(character.subCategory)
        )

        const memberMessages = isMultiplayerMode ? splitMultiMemberReply(visibleText) : null

        if (memberMessages && memberMessages.length > 0) {
          // 多条独立消息：移除草稿，逐条保存并插入
          removeVisibleDraft()
          for (const [index, { memberName, content }] of memberMessages.entries()) {
            const tokenUsage = estimateReplyTokenUsage(
              latestUserText,
              content,
              rawText,
              index === 0,
              index === 0,
            )
            const msg = await chatService.saveAssistantReply(sessionId, content, memberName, tokenUsage)
            if (currentSessionId.value === sessionId) {
              messages.value.push(msg)
            }
          }
          await nextTick()
          queueProactiveFollowUp(sessionId)
          await emitAssistantReplyNotification(sessionId, memberMessages.map(item => `${item.memberName}: ${item.content}`).join(' '))
        } else {
          // 单条消息（非多人模式或拆分失败）
          const tokenUsage = estimateReplyTokenUsage(latestUserText, visibleText, rawText)
          const savedReply = await chatService.saveAssistantReply(sessionId, visibleText, undefined, tokenUsage)
          await replaceVisibleDraft(savedReply)
          queueProactiveFollowUp(sessionId)
          await emitAssistantReplyNotification(sessionId, visibleText)
        }
      } else {
        removeVisibleDraft()
      }
    } catch (error) {
      removeVisibleDraft()
      throw error
    } finally {
      setSessionGenerating(sessionId, false)
      await loadSessions()
    }
  }

  function startAssistantReply(
    sessionId: string,
    streamFactory: () => Promise<AsyncGenerator<string, void, unknown>>
  ) {
    void streamAssistantReply(sessionId, streamFactory).catch(async error => {
      const session = await getStorageDriver().getSession(sessionId)
      emitAppNotification({
        title: '回复生成失败',
        body: (error as Error).message || '请检查大模型配置后重试',
        route: session ? `/chat/${session.characterId}?sessionId=${sessionId}` : undefined,
      })
    })
  }

  async function sendMessage(content: string) {
    if (!currentSessionId.value || isSessionGenerating(currentSessionId.value)) {
      return
    }

    const sessionId = currentSessionId.value
    clearProactiveFollowUp(sessionId)
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    const localChatService = getLocalChatService()
    const userMessage = Message.createText(sessionId, 'user', trimmedContent)
    if (currentSessionId.value === sessionId) {
      messages.value.push(userMessage)
    }
    await localChatService.appendMessage(userMessage)

    startAssistantReply(sessionId, async () => {
      const remoteChatService = await getRemoteChatService()
      return remoteChatService.sendMessage(sessionId)
    })
  }

  async function sendImage(imagePath: string) {
    if (!currentSessionId.value || isSessionGenerating(currentSessionId.value)) {
      return
    }

    const sessionId = currentSessionId.value
    clearProactiveFollowUp(sessionId)
    const localChatService = getLocalChatService()
    const userMessage = Message.createImage(sessionId, 'user', imagePath)
    if (currentSessionId.value === sessionId) {
      messages.value.push(userMessage)
    }
    await localChatService.appendMessage(userMessage)

    startAssistantReply(sessionId, async () => {
      const remoteChatService = await getRemoteChatService()
      return remoteChatService.sendImage(sessionId)
    })
  }

  async function sendVoice(audioPath: string, text: string, duration?: number) {
    if (!currentSessionId.value || isSessionGenerating(currentSessionId.value)) {
      return
    }

    const sessionId = currentSessionId.value
    clearProactiveFollowUp(sessionId)
    const localChatService = getLocalChatService()
    const userMessage = Message.createVoice(
      sessionId,
      'user',
      audioPath,
      text,
      duration
    )
    if (currentSessionId.value === sessionId) {
      messages.value.push(userMessage)
    }
    await localChatService.appendMessage(userMessage)

    startAssistantReply(sessionId, async () => {
      const remoteChatService = await getRemoteChatService()
      return remoteChatService.sendVoice(sessionId)
    })
  }

  async function retryLastResponse(messageId?: string) {
    if (!currentSessionId.value || isSessionGenerating(currentSessionId.value)) {
      return
    }

    const targetAssistantIndex = messageId
      ? messages.value.findIndex(message => message.id === messageId)
      : messages.value.length - 1

    const fallbackSearchStart = targetAssistantIndex >= 0 ? targetAssistantIndex : messages.value.length - 1
    let userBoundaryIndex = -1

    for (let index = fallbackSearchStart; index >= 0; index -= 1) {
      if (messages.value[index].role === 'user') {
        userBoundaryIndex = index
        break
      }
    }

    const sessionId = currentSessionId.value
    if (userBoundaryIndex < 0 || !sessionId) {
      throw new Error('No user message was found to retry from.')
    }

    const lastUserMessage = messages.value[userBoundaryIndex]
    if (currentSessionId.value === sessionId) {
      messages.value = messages.value.slice(0, userBoundaryIndex + 1)
    }

    startAssistantReply(sessionId, async () => {
      const remoteChatService = await getRemoteChatService()
      return remoteChatService.retryGeneration(sessionId, lastUserMessage)
    })
  }

  async function toggleLike(messageId: string) {
    const chatService = getLocalChatService()
    const liked = await chatService.likeMessage(messageId)
    messages.value = messages.value.map(message =>
      message.id === messageId ? { ...message, isLiked: liked } : message
    )
  }

  async function clearHistory() {
    if (!currentSessionId.value) {
      return
    }

    clearProactiveFollowUp(currentSessionId.value)
    const chatService = getLocalChatService()
    await chatService.clearHistory(currentSessionId.value)
    messages.value = []
    await loadSessions()
  }

  async function loadSessions(characterId?: string) {
    const storage = getStorageDriver()
    let allSessions = await storage.getAllSessions()

    if (characterId) {
      allSessions = allSessions.filter(session => session.characterId === characterId)
    }

    allSessions.sort((a, b) => b.updatedAt - a.updatedAt)
    sessions.value = allSessions
  }

  async function deleteSession(sessionId: string) {
    clearProactiveFollowUp(sessionId)
    const chatService = getLocalChatService()
    await chatService.clearHistory(sessionId)

    const storage = getStorageDriver()
    await storage.deleteSession(sessionId)

    sessions.value = sessions.value.filter(session => session.id !== sessionId)

    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null
      currentCharacterId.value = null
      messages.value = []
    }
  }

  function setCurrentSession(sessionId: string) {
    currentSessionId.value = sessionId
  }

  function reset() {
    for (const sessionId of proactiveTimers.keys()) {
      clearProactiveFollowUp(sessionId)
    }
    currentSessionId.value = null
    currentCharacterId.value = null
    messages.value = []
    generatingSessionIds.value = []
    draftMessagesBySession.clear()
  }

  function clearProactiveFollowUp(sessionId: string) {
    const timer = proactiveTimers.get(sessionId)
    if (timer) {
      window.clearTimeout(timer)
      proactiveTimers.delete(sessionId)
    }
  }

  function queueProactiveFollowUp(sessionId: string) {
    const session = sessions.value.find(item => item.id === sessionId)
    if (!session || session.mode === 'story') {
      return
    }

    clearProactiveFollowUp(sessionId)
    const timer = window.setTimeout(() => {
      void sendProactiveFollowUp(sessionId)
    }, 35000)
    proactiveTimers.set(sessionId, timer)
  }

  async function sendProactiveFollowUp(sessionId: string) {
    proactiveTimers.delete(sessionId)

    if (isGenerating.value) {
      return
    }

    const remoteChatService = await getRemoteChatService().catch(() => null)
    if (!remoteChatService) {
      return
    }

    const localChatService = getLocalChatService()
    const latestSession = await localChatService.getSession(sessionId)
    if (!latestSession || latestSession.mode === 'story') {
      return
    }

    const history = await localChatService.getHistory(sessionId, 6)
    if (history.length === 0) {
      return
    }

    const lastMessage = history[history.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') {
      return
    }

    try {
      const followUp = await remoteChatService.generateOneShotReply(
        sessionId,
        [
          '你现在要像一个真实角色一样主动追问一句。',
          '要求：一句话，20字以内，延续当前话题，不要总结，不要解释自己。'
        ].join('\n')
      )

      if (!followUp.trim()) {
        return
      }

      const savedReply = await localChatService.saveAssistantReply(sessionId, followUp.trim())
      if (currentSessionId.value === sessionId) {
        messages.value = [...messages.value, savedReply]
      }
      await emitAssistantReplyNotification(sessionId, followUp.trim())
      await loadSessions()
    } catch {
      // Ignore background follow-up failures.
    }
  }

  return {
    currentSessionId,
    currentCharacterId,
    messages,
    isGenerating,
    isCurrentSessionGenerating,
    generatingSessionIds,
    sessions,
    currentSession,
    hasMessages,
    cancelSessionGeneration,
    initChat,
    loadMessages,
    sendMessage,
    sendImage,
    sendVoice,
    retryLastResponse,
    toggleLike,
    clearHistory,
    loadSessions,
    deleteSession,
    setCurrentSession,
    reset,
    sendProactiveFollowUp,
  }
})
