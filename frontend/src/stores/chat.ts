/**
 * Chat store
 * Manages chat sessions, messages, and reply generation state.
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import type { IMessage, IChatSession } from '@/types/chat'
import { Message } from '@/entity/message'
import { getStorageDriver } from '@/services/storage'
import { createLLMAPI } from '@/services/llm-api'
import { createChatService, type ChatService } from '@/services/chat'
import { apiConfigService } from '@/services/api-config'

export interface ChatState {
  currentSessionId: string | null
  currentCharacterId: string | null
  messages: IMessage[]
  isGenerating: boolean
  sessions: IChatSession[]
}

export const useChatStore = defineStore('chat', () => {
  const currentSessionId = ref<string | null>(null)
  const currentCharacterId = ref<string | null>(null)
  const messages = ref<IMessage[]>([])
  const isGenerating = ref(false)
  const sessions = ref<IChatSession[]>([])
  const proactiveTimers = new Map<string, number>()

  const currentSession = computed(() => {
    return sessions.value.find(session => session.id === currentSessionId.value) || null
  })

  const hasMessages = computed(() => messages.value.length > 0)

  function getLocalChatService(): ChatService {
    return createChatService(getStorageDriver())
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
    messages.value = await chatService.getHistory(currentSessionId.value)
  }

  async function streamAssistantReply(streamFactory: () => Promise<AsyncGenerator<string, void, unknown>>) {
    if (!currentSessionId.value) {
      return
    }

    const activeSessionId = currentSessionId.value
    const chatService = getLocalChatService()
    const draftMessage = Message.createEmpty(activeSessionId)
    messages.value.push(draftMessage)
    isGenerating.value = true

    try {
      const stream = await streamFactory()
      let fullText = ''

      for await (const chunk of stream) {
        fullText += chunk
        // Access via the reactive array so Vue's proxy set-trap fires and
        // MessageBubble's computed re-evaluates on every chunk.
        const last = messages.value[messages.value.length - 1]
        if (last?.id === draftMessage.id) {
          last.content = fullText
        }
        await nextTick()
      }

      if (fullText.trim()) {
        const savedReply = await chatService.saveAssistantReply(activeSessionId, fullText)
        messages.value = messages.value.map(message =>
          message.id === draftMessage.id ? savedReply : message
        )
        queueProactiveFollowUp(activeSessionId)
      } else {
        messages.value = messages.value.filter(message => message.id !== draftMessage.id)
      }
    } catch (error) {
      messages.value = messages.value.filter(message => message.id !== draftMessage.id)
      throw error
    } finally {
      isGenerating.value = false
      await loadSessions()
    }
  }

  async function sendMessage(content: string) {
    if (!currentSessionId.value || isGenerating.value) {
      return
    }

    clearProactiveFollowUp(currentSessionId.value)
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    const remoteChatService = await getRemoteChatService()
    const localChatService = getLocalChatService()
    const userMessage = Message.createText(currentSessionId.value, 'user', trimmedContent)
    messages.value.push(userMessage)
    await localChatService.appendMessage(userMessage)

    await streamAssistantReply(() => remoteChatService.sendMessage(currentSessionId.value as string))
  }

  async function sendImage(imagePath: string) {
    if (!currentSessionId.value || isGenerating.value) {
      return
    }

    clearProactiveFollowUp(currentSessionId.value)
    const remoteChatService = await getRemoteChatService()
    const localChatService = getLocalChatService()
    const userMessage = Message.createImage(currentSessionId.value, 'user', imagePath)
    messages.value.push(userMessage)
    await localChatService.appendMessage(userMessage)

    await streamAssistantReply(() => remoteChatService.sendImage(currentSessionId.value as string))
  }

  async function sendVoice(audioPath: string, text: string, duration?: number) {
    if (!currentSessionId.value || isGenerating.value) {
      return
    }

    clearProactiveFollowUp(currentSessionId.value)
    const remoteChatService = await getRemoteChatService()
    const localChatService = getLocalChatService()
    const userMessage = Message.createVoice(
      currentSessionId.value,
      'user',
      audioPath,
      text,
      duration
    )
    messages.value.push(userMessage)
    await localChatService.appendMessage(userMessage)

    await streamAssistantReply(() => remoteChatService.sendVoice(currentSessionId.value as string))
  }

  async function retryLastResponse(messageId?: string) {
    if (!currentSessionId.value || isGenerating.value) {
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

    if (userBoundaryIndex < 0 || !currentSessionId.value) {
      throw new Error('No user message was found to retry from.')
    }

    const lastUserMessage = messages.value[userBoundaryIndex]
    const remoteChatService = await getRemoteChatService()
    messages.value = messages.value.slice(0, userBoundaryIndex + 1)

    await streamAssistantReply(() =>
      remoteChatService.retryGeneration(currentSessionId.value as string, lastUserMessage)
    )
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
    isGenerating.value = false
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
    sessions,
    currentSession,
    hasMessages,
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
