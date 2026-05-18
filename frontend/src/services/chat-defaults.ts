/**
 * Global chat defaults service
 *
 * Manages LLM inference parameters that apply globally and can be overridden
 * per-character via `chatParams`.
 */

import { storageDriver } from './storage'
import { DEFAULT_TOKEN_BUDGET } from './context-manager'
import type { RoutingDecision } from './model-router'

export interface ChatDefaults {
  mode: 'free-dialogue' | 'challenge-dialogue' | 'group-chat'
  speedMode: 'normal' | 'turbo'
  replyLength: 'short' | 'medium' | 'long'
  temperature: number
  maxTokens: number
  topP: number
  topK: number
  presencePenalty: number
  frequencyPenalty: number
  repetitionPenalty: number
  contextWindow: number
  streamOutput: boolean
  // 高级参数
  jsonMode: boolean
  functionCalling: boolean
  systemPromptPrefix: string
  /**
   * 并发请求数：将单次请求拆分为 N 个子问题并发处理，按顺序组合结果。
   * 范围 1-3，默认 1（不拆分）。限制为 3 是为了避免过度消耗 API 额度和触发速率限制。
   */
  concurrentRequests: number

  // ========== 模型自动路由配置 ==========
  /**
   * 是否启用模型自动路由
   * 启用后会根据对话长度和复杂度自动选择最佳模型
   */
  enableModelRouting: boolean

  /**
   * 用户手动选择的模型（覆盖自动路由）
   * 如果设置，将始终使用此模型
   */
  preferredModel: string | null

  /**
   * 短对话阈值（token 数）
   * 低于此值将使用轻量模型
   */
  shortConversationThreshold: number

  /**
   * 长对话阈值（token 数）
   * 高于此值将使用强模型
   */
  longConversationThreshold: number

  /**
   * 最后一次路由决策结果（用于 UI 显示）
   */
  lastRoutingDecision: RoutingDecision | null
}

export const DEFAULT_CHAT_DEFAULTS: ChatDefaults = {
  mode: 'free-dialogue',
  speedMode: 'normal',
  replyLength: 'medium',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  topK: 0,
  presencePenalty: 0,
  frequencyPenalty: 0,
  repetitionPenalty: 1.0,
  contextWindow: DEFAULT_TOKEN_BUDGET,
  streamOutput: true,
  jsonMode: false,
  functionCalling: false,
  systemPromptPrefix: '',
  concurrentRequests: 1,
  // 模型自动路由配置
  enableModelRouting: true,
  preferredModel: null,
  shortConversationThreshold: 500,
  longConversationThreshold: 8000,
  lastRoutingDecision: null,
}

const GLOBAL_KEY = 'echo_chat_defaults_v2'
const LEGACY_KEY = 'echo_chat_defaults'

function safeParse(raw: string | null): ChatDefaults {
  if (!raw) return { ...DEFAULT_CHAT_DEFAULTS }
  try {
    const parsed = JSON.parse(raw) as Partial<ChatDefaults>
    return {
      ...DEFAULT_CHAT_DEFAULTS,
      ...parsed,
      speedMode: parsed.speedMode === 'turbo' ? 'turbo' : 'normal',
    }
  } catch {
    return { ...DEFAULT_CHAT_DEFAULTS }
  }
}

/** Migrate legacy localStorage data to new format */
function migrateLegacy(): ChatDefaults | null {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return null
    const parsed = JSON.parse(legacy)
    const migrated: ChatDefaults = {
      ...DEFAULT_CHAT_DEFAULTS,
      mode: parsed.defaultMode || 'free-dialogue',
      speedMode: parsed.speedMode === 'turbo' ? 'turbo' : 'normal',
      replyLength: parsed.replyLength || 'medium',
      temperature: Number(parsed.temperature ?? 0.7),
      streamOutput: parsed.streamEnabled !== false,
    }
    // Save migrated data under new key and clear legacy
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(migrated))
    localStorage.removeItem(LEGACY_KEY)
    return migrated
  } catch {
    return null
  }
}

/** Load global chat defaults from storage (with legacy migration) */
export async function loadGlobalChatDefaults(): Promise<ChatDefaults> {
  const raw = await storageDriver.getUserSetting(GLOBAL_KEY)
  if (!raw) {
    const migrated = migrateLegacy()
    if (migrated) return migrated
    return { ...DEFAULT_CHAT_DEFAULTS }
  }
  return safeParse(raw)
}

/** Save global chat defaults to storage */
export async function saveGlobalChatDefaults(defaults: ChatDefaults): Promise<void> {
  await storageDriver.saveUserSetting(GLOBAL_KEY, JSON.stringify(defaults))
}

/** Get effective params: character overrides if enabled, otherwise global */
export async function getEffectiveParams(characterId?: string): Promise<ChatDefaults> {
  const globalDefaults = await loadGlobalChatDefaults()
  if (!characterId) return globalDefaults

  try {
    const character = await storageDriver.getCharacter(characterId)
    if (character?.chatParams?.overrideGlobal) {
      const params = character.chatParams
      return {
        mode: (params.mode as ChatDefaults['mode']) || globalDefaults.mode,
        speedMode: globalDefaults.speedMode,
        replyLength: (params.replyLength as ChatDefaults['replyLength']) || globalDefaults.replyLength,
        temperature: params.temperature ?? globalDefaults.temperature,
        maxTokens: params.maxTokens ?? globalDefaults.maxTokens,
        topP: params.topP ?? globalDefaults.topP,
        topK: params.topK ?? globalDefaults.topK,
        presencePenalty: params.presencePenalty ?? globalDefaults.presencePenalty,
        frequencyPenalty: params.frequencyPenalty ?? globalDefaults.frequencyPenalty,
        repetitionPenalty: params.repetitionPenalty ?? globalDefaults.repetitionPenalty,
        contextWindow: params.contextWindow ?? globalDefaults.contextWindow,
        streamOutput: params.streamOutput ?? globalDefaults.streamOutput,
        jsonMode: params.jsonMode ?? globalDefaults.jsonMode,
        functionCalling: params.functionCalling ?? globalDefaults.functionCalling,
        systemPromptPrefix: params.systemPromptPrefix ?? globalDefaults.systemPromptPrefix,
        concurrentRequests: params.concurrentRequests ?? globalDefaults.concurrentRequests,
        // 模型自动路由配置（全局设置，不支持角色级别覆盖）
        enableModelRouting: globalDefaults.enableModelRouting,
        preferredModel: globalDefaults.preferredModel,
        shortConversationThreshold: globalDefaults.shortConversationThreshold,
        longConversationThreshold: globalDefaults.longConversationThreshold,
        lastRoutingDecision: globalDefaults.lastRoutingDecision,
      }
    }
  } catch {
    // ignore, fallback to global
  }
  return globalDefaults
}
