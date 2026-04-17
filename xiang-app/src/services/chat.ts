/**
 * Chat service
 * Handles session, history, and reply generation orchestration.
 */

import type { StorageDriver } from './storage'
import type { AbortableChatStream, LLMAPIService } from './llm-api'
import type { IMessage, IChatSession, ChatContext, ChatMessage, ChatContentPart } from '@/types/chat'
import { MessageType } from '@/types/chat'
import { Message } from '@/entity/message'
import { generateUUID } from '@/utils/uuid'
import {
  buildCharacterMemoryPrompt,
  rebuildCharacterMemoryFromSession,
  updateCharacterMemoryFromMessage,
} from './chat-memory'

const MAX_SYSTEM_PROMPT_LENGTH = 6000

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
    await updateCharacterMemoryFromMessage(this.storage, message.sessionId, message)
  }

  async saveAssistantReply(sessionId: string, content: string): Promise<IMessage> {
    const reply = Message.createText(sessionId, 'assistant', content)
    await this.storage.saveMessage(reply)
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
    const rawSystemPrompt = [userInfo?.globalPrompt, character.settings, memoryPrompt, extraSystemPrompt]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n\n')

    const systemPrompt = rawSystemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH
      ? rawSystemPrompt.slice(0, MAX_SYSTEM_PROMPT_LENGTH)
      : rawSystemPrompt

    const messages = await this.storage.getMessages(sessionId, 50)
    const messageHistory: ChatMessage[] = messages
      .filter(message => message.content.trim().length > 0)
      .map(message => ({
        role: message.role,
        content: this.mapMessageToContent(message),
      }))

    return {
      systemPrompt,
      messages: messageHistory,
      character,
    }
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

  async createSession(characterId: string): Promise<string> {
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

    if (character?.greeting) {
      const greetingMessage = Message.createText(session.id, 'assistant', character.greeting)
      await this.storage.saveMessage(greetingMessage)
      await updateCharacterMemoryFromMessage(this.storage, session.id, greetingMessage)
    }

    return session.id
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
