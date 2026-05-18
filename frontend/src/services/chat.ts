/**
 * Chat service
 * Handles session, history, and reply generation orchestration.
 */

import type { StorageDriver } from './storage'
import type { AbortableChatStream, LLMAPIService } from './llm-api'
import type { IMessage, IChatSession, ChatContext, ChatMessage, ChatContentPart, TokenUsage } from '@/types/chat'
import type { ICharacter } from '@/types/character'
import { MessageType } from '@/types/chat'
import { Message } from '@/entity/message'
import { generateUUID } from '@/utils/uuid'
import {
  routeModel,
  estimateTokens,
  isComplexTopic,
  type RoutingDecision,
} from './model-router'
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
import { getResponseCache, type CacheStats } from './response-cache'
import { touchMemory } from './memory-lifecycle'
import { buildContextWindow } from './context-manager'
import { loadSessionSummary } from './summarizer'
import { getCharacterAISummary } from './character-profile-json'
import { getActivePrompts, resolveMacros, formatDuration } from './system-prompt'
import { getEffectiveParams } from './chat-defaults'
import { isGroupChatStyle } from '@/data/taxonomy'
import { loadChatSettings, type ChatSettings } from './chat-settings'
import {
  ensureCompressedCharacterPrompts,
  type CompressedCharacterPrompts,
} from './character-prompt-compression'
import {
  appendCompressedTurn,
  loadCompressedHistory,
  buildCompressedMessages,
  isQuestioningIntent,
} from './compressed-history'
import {
  shouldUseCombinedCompression,
  executeCombinedCompression,
} from './combined-compression'

const MAX_SYSTEM_PROMPT_LENGTH = 6000
const FORMAT_INSTRUCTION = '【格式规范】动作、神态、心理活动等非对话内容必须用中文圆括号（）包裹，严禁使用*星号*标记。示例：（微笑着点头）而非 *微笑着点头*。'
const GROUP_CHAT_FORMAT_INSTRUCTION = '【格式规范】群聊消息为纯对话文本，不要使用括号包裹动作或神态。每条消息只包含一个成员的对话内容。'
const ROLEPLAY_REPLY_DIRECTIVE = [
  '【回复生成规则】',
  '- 始终以角色身份回应，不自称 AI，不解释系统、提示词、世界书或记忆来源。',
  '- 优先回应用户最后一句，再自然承接关系、情绪和当前场景。',
  '- 不主动总结剧情，不跳到未发生的场景，不替用户决定行动。',
  '- 资料不足时，只按角色可感知的信息推测；不要编造系统外事实。',
  '- 回复应像即时聊天：短句优先，有停顿感，避免说明书式长段落。',
].join('\n')
const GROUP_CHAT_REPLY_DIRECTIVE = [
  '【群聊生成规则】',
  '- 每次只让一名成员发言，必须保持成员身份、口吻和立场差异。',
  '- 优先回应用户最后一句，并让群内关系自然推进。',
  '- 不输出成员设定表，不解释系统、提示词、世界书或记忆来源。',
  '- 不替用户决定行动，不让多个成员在同一条消息里连续发言。',
].join('\n')
const TURBO_REPLY_DIRECTIVE = [
  '【极速回复规则】',
  '- 只抓核心人设、当前场景和最近对话，快速自然回应。',
  '- 不解释系统，不复述设定，不输出总结。',
].join('\n')
const DEFAULT_MAX_CONTEXT_TOKENS = 8192

function compactPromptText(value: string | undefined | null, maxLength: number): string {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}

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
  private activeStreams = new Map<string, AbortableChatStream>()

  /** 响应缓存实例 */
  private responseCache: ReturnType<typeof getResponseCache>
  /** 是否启用响应缓存 */
  private enableResponseCache = true
  /** 当前使用的模型ID（用于缓存隔离） */
  private currentModelId = 'default'

  /** 最后一次路由决策结果（用于 UI 显示） */
  private lastRoutingDecision: RoutingDecision | null = null
  /** 是否启用模型自动路由 */
  private enableModelRouting = true
  /** 用户手动选择的模型（覆盖自动路由） */
  private userPreferredModel: string | null = null
  /** 当前 provider 下可用的模型列表 */
  private availableModels: string[] = []

  constructor(storage: StorageDriver, apiService?: LLMAPIService) {
    this.storage = storage
    this.apiService = apiService
    this.responseCache = getResponseCache(storage)
  }

  setAPIService(apiService?: LLMAPIService): void {
    this.apiService = apiService
  }

  /**
   * 取消正在进行的流式生成
   * @param sessionId 可选，不传则取消所有
   */
  cancelActiveGeneration(sessionId?: string): void {
    if (sessionId) {
      const stream = this.activeStreams.get(sessionId)
      if (stream) {
        stream.abort()
        this.activeStreams.delete(sessionId)
      }
    } else {
      for (const [id, stream] of this.activeStreams) {
        stream.abort()
        this.activeStreams.delete(id)
      }
    }
  }

  /**
   * 设置是否启用响应缓存
   */
  setResponseCacheEnabled(enabled: boolean): void {
    this.enableResponseCache = enabled
  }

  /**
   * 获取响应缓存是否启用
   */
  isResponseCacheEnabled(): boolean {
    return this.enableResponseCache
  }

  /**
   * 设置当前模型ID（用于缓存隔离）
   */
  setCurrentModelId(modelId: string): void {
    this.currentModelId = modelId
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    return this.responseCache.getStats()
  }

  /**
   * 清空响应缓存
   */
  async clearResponseCache(): Promise<void> {
    await this.responseCache.clear()
  }

  // ==================== 模型路由相关方法 ====================

  /**
   * 设置是否启用模型自动路由
   */
  setModelRoutingEnabled(enabled: boolean): void {
    this.enableModelRouting = enabled
  }

  /**
   * 获取模型自动路由是否启用
   */
  isModelRoutingEnabled(): boolean {
    return this.enableModelRouting
  }

  /**
   * 设置用户偏好模型（手动覆盖自动路由）
   */
  setUserPreferredModel(model: string | null): void {
    this.userPreferredModel = model
  }

  /**
   * 获取用户偏好模型
   */
  getUserPreferredModel(): string | null {
    return this.userPreferredModel
  }

  /**
   * 设置可用模型列表
   */
  setAvailableModels(models: string[]): void {
    this.availableModels = models
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels(): string[] {
    return this.availableModels
  }

  /**
   * 获取最后一次路由决策
   */
  getLastRoutingDecision(): RoutingDecision | null {
    return this.lastRoutingDecision
  }

  /**
   * 根据消息历史执行模型路由决策
   */
  async performModelRouting(messages: IMessage[]): Promise<RoutingDecision> {
    // 估算 token 数
    const chatMessages: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }))
    const estimatedTokens = estimateTokens(chatMessages)

    // 获取最后一条用户消息
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .slice(-1)[0]
    const lastUserText = lastUserMessage
      ? (typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : JSON.stringify(lastUserMessage.content))
      : ''

    // 检测复杂话题
    const hasComplexTopic = isComplexTopic(lastUserText, chatMessages)

    // 执行路由决策
    const decision = routeModel(
      {
        estimatedTokens,
        turnCount: messages.length,
        hasComplexTopic,
        userPreferredModel: this.userPreferredModel,
        availableModels: this.availableModels,
      },
      { enabled: this.enableModelRouting }
    )

    // 保存最后一次决策
    this.lastRoutingDecision = decision

    // 更新当前模型 ID（用于缓存隔离）
    this.currentModelId = decision.recommendedModel

    return decision
  }

  /**
   * 检查是否为多轮对话（对话历史超过一定条数）
   */
  private isMultiTurnConversation(messages: IMessage[]): boolean {
    // 超过 3 条消息认为是多轮对话（用户可能有连续追问）
    return messages.length > 3
  }

  async appendMessage(message: IMessage): Promise<void> {
    await this.storage.saveMessage(message)
    await this.syncSessionAfterMessage(message.sessionId, message.timestamp)
    await updateCharacterMemoryFromMessage(this.storage, message.sessionId, message)
    await this.indexMessageToSemanticMemory(message)
  }

  async saveAssistantReply(
    sessionId: string,
    content: string,
    memberName?: string,
    tokenUsage?: TokenUsage
  ): Promise<IMessage> {
    const reply = Message.createText(sessionId, 'assistant', content)
    if (memberName) {
      reply.memberName = memberName
    }
    if (tokenUsage) {
      reply.tokenUsage = tokenUsage
    }
    await this.storage.saveMessage(reply)
    await this.syncSessionAfterMessage(sessionId, reply.timestamp)
    await updateCharacterMemoryFromMessage(this.storage, sessionId, reply)

    // 后台异步压缩本轮对话（不阻塞用户）
    const apiService = this.apiService
    if (apiService) {
      const recent = await this.storage.getMessages(sessionId, 4)
      const userMsg = recent.reverse().find(m => m.role === 'user' && m.timestamp < reply.timestamp)
      if (userMsg) {
        const session = await this.storage.getSession(sessionId)
        if (session) {
          const character = await this.storage.getCharacter(session.characterId)
          if (character) {
            // 检查是否需要触发合并压缩（压缩 + 摘要）
            const allMessages = await this.storage.getMessages(sessionId)
            const existingSummary = await loadSessionSummary(this.storage, sessionId)

            if (shouldUseCombinedCompression(existingSummary, allMessages.length)) {
              // 使用合并压缩：单次 API 调用同时完成压缩和摘要
              executeCombinedCompression(this.storage, apiService, {
                userMessage: userMsg,
                assistantMessage: reply,
                existingSummary,
                characterName: character.name,
                characterId: character.id,
                sessionId,
                allMessages,
              }).catch(() => {
                // 降级策略：如果合并压缩失败，回退到单独压缩
                appendCompressedTurn(
                  this.storage,
                  apiService,
                  sessionId,
                  userMsg,
                  reply,
                  character.name,
                ).catch(() => {})
              })
            } else {
              // 只需要单独压缩
              appendCompressedTurn(
                this.storage,
                apiService,
                sessionId,
                userMsg,
                reply,
                character.name,
              ).catch(() => {})
            }
          }
        }
      }
    }

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
    // 获取对话历史和上下文
    const [messages, context] = await Promise.all([
      this.storage.getMessages(sessionId),
      this.buildContext(sessionId),
    ])

    // 执行模型路由决策（在每次发送消息前）
    if (this.availableModels.length > 0 && this.apiService) {
      const routingDecision = await this.performModelRouting(messages)
      
      // 如果路由决策成功，更新 API 服务使用推荐的模型
      if (routingDecision.recommendedModel) {
        const config = this.apiService.getConfig()
        if (config) {
          this.apiService.updateConfig({
            ...config,
            model: routingDecision.recommendedModel,
          })
        }
      }
    }

    // 获取最后一条用户消息
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .slice(-1)[0]

    // 检查缓存（仅在启用且简单寒暄场景使用）
    if (this.enableResponseCache && lastUserMessage && context.character) {
      const isMultiTurn = this.isMultiTurnConversation(messages)
      const cachedResponse = await this.responseCache.get(
        lastUserMessage.content,
        context.character.id,
        this.currentModelId,
        isMultiTurn
      )

      if (cachedResponse) {
        // 缓存命中，直接返回缓存的响应（模拟流式输出）
        return this.createCachedStream(cachedResponse, sessionId, context.character.id)
      }
    }

    // 缓存未命中，正常调用 LLM API，并将结果存入缓存
    return this.generateTextStreamWithCache(context, sessionId, lastUserMessage)
  }

  /**
   * 创建缓存响应的模拟流
   */
  private async *createCachedStream(
    response: string,
    _sessionId: string,
    _characterId: string
  ): AsyncGenerator<string, void, unknown> {
    // 模拟流式输出效果，提高用户体验
    const chunkSize = Math.max(1, Math.floor(response.length / 10))
    for (let i = 0; i < response.length; i += chunkSize) {
      yield response.slice(i, i + chunkSize)
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  /**
   * 生成文本流并在完成后缓存结果
   */
  private async *generateTextStreamWithCache(
    context: ChatContext,
    sessionId: string,
    userMessage?: IMessage
  ): AsyncGenerator<string, void, unknown> {
    const chunks: string[] = []

    for await (const chunk of this.generateTextStream(context, sessionId)) {
      chunks.push(chunk)
      yield chunk
    }

    // 对话完成后，将响应存入缓存（仅适合缓存的场景）
    if (userMessage && chunks.length > 0 && context.character) {
      const fullResponse = chunks.join('')
      const messages = await this.storage.getMessages(sessionId)
      const isMultiTurn = this.isMultiTurnConversation(messages)

      if (!isMultiTurn) {
        await this.responseCache.set(
          userMessage.content,
          context.character.id,
          this.currentModelId,
          fullResponse,
          isMultiTurn
        )
      }
    }
  }

  async generateOneShotReply(sessionId: string, extraSystemPrompt = ''): Promise<string> {
    if (!this.apiService) {
      throw new Error('Please configure an API provider before chatting.')
    }

    const context = await this.buildContext(sessionId, extraSystemPrompt)
    return this.apiService.chat(context)
  }

  private async *generateTextStream(
    context: ChatContext,
    sessionId: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiService) {
      throw new Error('Please configure an API provider before chatting.')
    }

    // 同一 session 的新请求自动取消旧流
    this.cancelActiveGeneration(sessionId)

    const concurrentCount = context.concurrentRequests ?? 1
    const abortableStream = concurrentCount > 1
      ? this.apiService.chatStreamConcurrent(context, concurrentCount)
      : this.apiService.chatStreamAbortable(context)
    this.activeStreams.set(sessionId, abortableStream)

    try {
      for await (const chunk of abortableStream.stream) {
        if (chunk.content) {
          yield chunk.content
        }
      }
    } finally {
      if (this.activeStreams.get(sessionId) === abortableStream) {
        this.activeStreams.delete(sessionId)
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
    const chatSettings = await loadChatSettings(character.id)

    // ── Character-specific or global LLM params ──
    const effectiveParams = await getEffectiveParams(character.id)
    const isTurbo = effectiveParams.speedMode === 'turbo'

    // ── Sliding window + hierarchical summary ──
    const allMessages = await this.storage.getMessages(sessionId, 200)
    const sessionSummary = await loadSessionSummary(this.storage, sessionId)
    const maxContextTokens = effectiveParams.contextWindow ?? DEFAULT_MAX_CONTEXT_TOKENS
    const ctxWindow = buildContextWindow(allMessages, sessionSummary, { maxContextTokens })
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

    // 检测质疑意图：若用户质疑，回退到全部原始消息
    const lastUserMessage = allMessages.filter(m => m.role === 'user').slice(-1)[0]
    const questioning = lastUserMessage ? isQuestioningIntent(lastUserMessage.content) : false

    let recentForRetrieval: IMessage[]
    const greetingId = ctxWindow.greetingMessage?.id

    if (questioning) {
      // 质疑模式：发送全部原始对话
      for (const msg of allMessages) {
        if (msg.id === greetingId && messageHistory.length > 0) continue
        messageHistory.push({
          role: msg.role,
          content: this.mapMessageToContent(msg),
        })
      }
      recentForRetrieval = allMessages
    } else if (isTurbo) {
      // 极速模式：只保留最近 4 轮原始消息，不做压缩
      const rawKeep = 4
      const turns: IMessage[][] = []
      let currentTurn: IMessage[] = []
      for (let i = 0; i < allMessages.length; i++) {
        const msg = allMessages[i]
        if (msg.role === 'user' && currentTurn.length > 0) {
          turns.push(currentTurn)
          currentTurn = [msg]
        } else {
          currentTurn.push(msg)
        }
      }
      if (currentTurn.length > 0) turns.push(currentTurn)

      const rawTurns = turns.slice(-rawKeep)
      const rawMessages = rawTurns.flat()
      for (const msg of rawMessages) {
        if (msg.id === greetingId && messageHistory.length > 0) continue
        messageHistory.push({
          role: msg.role,
          content: this.mapMessageToContent(msg),
        })
      }
      recentForRetrieval = rawMessages
    } else {
      // 正常模式：压缩历史 + 最近 2 轮原始消息
      const compressedHistory = await loadCompressedHistory(this.storage, sessionId)
      const { rawMessages, compressedMessages } = buildCompressedMessages(
        allMessages,
        compressedHistory,
        2,
      )

      for (const cm of compressedMessages) {
        messageHistory.push(cm)
      }

      for (const msg of rawMessages) {
        if (msg.id === greetingId && messageHistory.length > 0) continue
        messageHistory.push({
          role: msg.role,
          content: this.mapMessageToContent(msg),
        })
      }

      recentForRetrieval = rawMessages
    }

    // ── Lorebook: keyword matching against recent messages ──
    const lorebookInChat = isTurbo ? null : this.injectLorebookChatEntries(character, messageHistory)

    // ── Semantic memory retrieval ──
    let semanticResults: MemorySearchResult[] = []
    if (!isTurbo) {
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
    }

    // ── 计算 idleDuration ──
    const lastMessage = allMessages[allMessages.length - 1]
    const idleDuration = lastMessage
      ? formatDuration(Date.now() - lastMessage.timestamp)
      : '刚刚'

    // ── Layered system prompt assembly ──
    const memoryPrompt = isTurbo ? '' : await buildCharacterMemoryPrompt(this.storage, character.id, character.name)
    const compressedCharacterPrompts = isTurbo
      ? await ensureCompressedCharacterPrompts(character, true)
      : null
    const characterAISummary = isTurbo ? '' : getCharacterAISummary(character)
    const systemPrompt = this.buildSystemPrompt(character, userInfo, memoryPrompt, extraSystemPrompt, messageHistory, semanticResults, summaryText, characterAISummary, idleDuration, chatSettings, isTurbo, compressedCharacterPrompts)

    // effectiveParams already loaded above

    // ── Depth prompt injection into message history ──
    if (character.depthPrompt) {
      this.injectDepthPrompt(character.depthPrompt, messageHistory)
    }

    // ── Post-history reminder ──
    const postHistoryPrompt = isTurbo
      ? `保持${character.name}人设，自然回复。`
      : [
          `[系统提醒] 请继续保持${character.name}的语气和性格。`,
          `记住你们的关系状态，用自然的口吻回复。`,
          `不要总结、不要解释、不要跳出角色。`,
        ].join(' ')

    return {
      systemPrompt,
      messages: lorebookInChat || messageHistory,
      postHistoryPrompt,
      character,
      temperature: effectiveParams.temperature,
      maxTokens: effectiveParams.maxTokens,
      topP: effectiveParams.topP,
      topK: effectiveParams.topK,
      presencePenalty: effectiveParams.presencePenalty,
      frequencyPenalty: effectiveParams.frequencyPenalty,
      repetitionPenalty: effectiveParams.repetitionPenalty,
      systemPromptOverride: chatSettings.systemPromptOverride,
      concurrentRequests: effectiveParams.concurrentRequests,
    }
  }

  /**
   * 替换系统提示词模板中的变量宏
   * 统一委托到 system-prompt.ts 的 resolveMacros
   */
  private resolveSystemPromptMacros(
    text: string,
    character: ICharacter,
    userInfo: { name?: string; globalPrompt?: string } | null,
    memoryPrompt: string = '',
    sessionSummary: string | null = null,
    idleDuration?: string
  ): string {
    return resolveMacros(text, {
      charName: character.name || '',
      userName: userInfo?.name || '用户',
      originalPrompt: undefined,
      idleDuration,
      character,
      memoryPrompt,
      sessionSummary,
      userGlobalPrompt: userInfo?.globalPrompt,
    })
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
    userInfo: { name?: string; globalPrompt?: string } | null,
    memoryPrompt: string,
    extraSystemPrompt: string,
    messageHistory: ChatMessage[],
    semanticResults: MemorySearchResult[] = [],
    sessionSummary: string | null = null,
    characterAISummary = '',
    idleDuration?: string,
    chatSettings?: ChatSettings,
    isTurbo = false,
    compressedCharacterPrompts: CompressedCharacterPrompts | null = null,
  ): string {
    const sections: string[] = []
    const isGroupChat = isGroupChatStyle(character.subCategory)

    // 获取启用的系统提示词
    let topPrompts: Array<{ text: string }> = []
    let middlePrompts: Array<{ text: string }> = []
    let bottomPrompts: Array<{ text: string }> = []
    let compressionStrategyPrompt = ''
    try {
      const activePrompts = getActivePrompts()
      const resolve = (p: typeof activePrompts[number]) =>
        this.resolveSystemPromptMacros(
          p.basicPrompt,
          character,
          userInfo,
          memoryPrompt,
          sessionSummary,
          idleDuration
        )
      topPrompts = activePrompts
        .filter(p => p.injectionPosition === 'system-top')
        .map(p => ({ text: resolve(p) }))
      middlePrompts = activePrompts
        .filter(p => p.injectionPosition === 'system-middle')
        .map(p => ({ text: resolve(p) }))
      bottomPrompts = activePrompts
        .filter(p => p.injectionPosition === 'system-bottom')
        .map(p => ({ text: resolve(p) }))
      const compressionPrompt = activePrompts.find(p => p.id === 'compression-runtime-strategy')
      compressionStrategyPrompt = compressionPrompt ? resolve(compressionPrompt).trim() : ''
    } catch {
      // 向后兼容：系统提示词加载失败时不影响现有功能
    }

    if (isTurbo) {
      // 极速模式：极简提示词，只保留核心角色设定 + 格式约束
      if (compressedCharacterPrompts) {
        sections.push(compressedCharacterPrompts.rolePrompt)
        if (compressedCharacterPrompts.npcPrompt) sections.push(compressedCharacterPrompts.npcPrompt)
        if (compressedCharacterPrompts.worldPrompt) sections.push(compressedCharacterPrompts.worldPrompt)
        if (compressedCharacterPrompts.mediaPrompt) sections.push(compressedCharacterPrompts.mediaPrompt)
      } else {
        const turboParts: string[] = []
        if (character.persona?.anchor) turboParts.push(character.persona.anchor)
        if (character.scenario) turboParts.push(`场景：${character.scenario}`)
        if (character.description) turboParts.push(character.description)
        if (character.personality) turboParts.push(`性格：${character.personality}`)
        if (character.behavior) turboParts.push(`行为：${character.behavior}`)
        if (character.values) turboParts.push(`价值观：${character.values}`)
        if (turboParts.length > 0) {
          sections.push(`【角色：${character.name}】\n${turboParts.join(' | ')}`)
        }
      }
      if (userInfo?.name) sections.push(`用户：${userInfo.name}`)
      const effectiveCharacterSystemPrompt = chatSettings?.systemPromptOverride?.trim() || character.settings
      if (effectiveCharacterSystemPrompt) sections.push(effectiveCharacterSystemPrompt)
      sections.push(compressionStrategyPrompt || TURBO_REPLY_DIRECTIVE)
      sections.push(FORMAT_INSTRUCTION)
    } else {
      // --- system-top 注入 ---
      for (const prompt of topPrompts) {
        if (prompt.text.trim()) sections.push(prompt.text.trim())
      }

      sections.push(isGroupChat ? GROUP_CHAT_REPLY_DIRECTIVE : ROLEPLAY_REPLY_DIRECTIVE)

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

      // Layer 3.5: Group Members (for multiplayer / composite characters)
      if (character.structuredMembers && character.structuredMembers.length > 0) {
        const memberSections: string[] = []
        for (const member of character.structuredMembers) {
          if (member.isNarrator) {
            const narratorParts: string[] = []
            if (member.name) narratorParts.push(`旁白：${member.name}`)
            if (member.speakingStyle) narratorParts.push(`风格：${compactPromptText(member.speakingStyle, 80)}`)
            if (narratorParts.length) memberSections.push(narratorParts.join(' | '))
            continue
          }
          const mparts: string[] = []
          if (member.name) mparts.push(`【${member.name}】`)
          if (member.description) mparts.push(`描述：${compactPromptText(member.description, 120)}`)
          if (member.persona?.anchor) mparts.push(`身份：${compactPromptText(member.persona.anchor, 100)}`)
          if (member.persona?.traits?.length) mparts.push(`特质：${member.persona.traits.join('、')}`)
          if (member.persona?.voice) mparts.push(`风格：${compactPromptText(member.persona.voice, 90)}`)
          if (member.scenario) mparts.push(`场景：${compactPromptText(member.scenario, 120)}`)
          if (member.settings) mparts.push(`设定：${compactPromptText(member.settings, 220)}`)
          if (member.speakingStyle) mparts.push(`口吻：${compactPromptText(member.speakingStyle, 90)}`)
          if (member.personality) mparts.push(`性格：${compactPromptText(member.personality, 120)}`)
          if (member.depthPrompt?.prompt) mparts.push(`深度提示：${compactPromptText(member.depthPrompt.prompt, 140)}`)
          if (mparts.length > 1) {
            memberSections.push(mparts.join('\n'))
          }
        }
        if (memberSections.length) {
          sections.push([
            '【群成员精简设定】',
            '使用方式：只用于区分 NPC 身份、口吻、关系和当前发言倾向；不要逐字复述。',
            memberSections.join('\n\n'),
          ].join('\n'))
        }
      }

      // Layer 4: User profile
      if (userInfo?.name) {
        const userSection = [
          `【用户画像】`,
          userInfo.name ? `用户名字：${userInfo.name}` : '',
        ].filter((v): v is string => v.trim().length > 0).join('\n')
        if (userSection.trim()) sections.push(userSection)
      }

      // --- system-middle 注入 ---
      for (const prompt of middlePrompts) {
        if (prompt.text.trim()) sections.push(prompt.text.trim())
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
      const effectiveCharacterSystemPrompt = chatSettings?.systemPromptOverride?.trim() || character.settings
      if (effectiveCharacterSystemPrompt) {
        sections.push(effectiveCharacterSystemPrompt)
      }

      // Layer 8: Format + Extra
      sections.push(isGroupChat ? GROUP_CHAT_FORMAT_INSTRUCTION : FORMAT_INSTRUCTION)
      if (extraSystemPrompt) {
        sections.push(extraSystemPrompt)
      }

      // --- system-bottom 注入 ---
      for (const prompt of bottomPrompts) {
        if (prompt.text.trim()) sections.push(prompt.text.trim())
      }
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
