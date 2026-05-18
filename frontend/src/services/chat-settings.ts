/**
 * Per-character chat settings
 *
 * Stores small per-character toggles that override the global defaults for one
 * specific conversation, e.g. whether to auto-play TTS, whether to allow the AI
 * to inject H5 mini-games into the chat, etc.
 *
 * Imported scripted chats do NOT use this: their dialogue/feed page is fully
 * driven by imported story data. These settings are intended for regular AI
 * conversations where the user wants to disable auxiliary features.
 */

import { storageDriver } from './storage'

export interface ChatSettings {
  /**
   * Whether TTS (text-to-speech) is allowed for this character.
   * When false: header TTS button is disabled, message bubble TTS is hidden,
   * and `autoTTS` is forced off regardless of its stored value.
   */
  enableTTS: boolean

  /** Auto-play TTS on new assistant replies. Requires enableTTS. */
  autoTTS: boolean

  /**
   * Whether the AI may insert/embed H5 mini-games into this conversation.
   * Off by default for regular AI chats because they usually do not need them.
   */
  enableMiniGame: boolean

  /**
   * Minimum passing score (0-100) for any inserted H5 mini-game. Used as the
   * default success threshold. Only meaningful when `enableMiniGame` is true.
   */
  miniGamePassingScore: number

  /** Whether the AI may auto-insert images via [图片插入:xxx] markers. */
  enableAutoImage: boolean

  /** Whether to stream the assistant reply token-by-token. */
  streamReply: boolean

  /** Whether to show the inline voice input toggle. */
  enableVoiceInput: boolean

  /** Whether to allow the AI to auto-post moments from this conversation. */
  enableAutoMoments: boolean

  // ── 显示与交互 ──
  typewriterSpeed: 'fast' | 'medium' | 'slow' | 'instant'
  autoSend: boolean
  inputMode: 'text' | 'voice' | 'hybrid'
  bubbleStyle: 'classic' | 'minimal' | 'roleplay'

  // ── System Prompt 覆盖 ──
  /** 角色卡 system prompt 覆盖值（存在且非空时替换角色卡的 system prompt） */
  systemPromptOverride?: string

  // ── 上下文记忆 ──
  longTermMemory: boolean
  longTermMemoryData: string
  backtrackEnabled: boolean
  contextEditEnabled: boolean

  // ── 快捷操作 ──
  quickCommands: Array<{ name: string; content: string }>
  replySuggestions: boolean
  recentCharacterCount: number

  /** Whether to display estimated token counts on messages and input. */
  showTokenCount: boolean

  // ── LLM 参数（与 SillyTavern 对齐的默认值） ──
  temperature: number
  maxTokens: number
  topP: number
  topK: number
  presencePenalty: number
  frequencyPenalty: number
  repetitionPenalty: number
  contextWindow: number

  /**
   * 并发请求数：将单次请求拆分为 N 个子问题并发处理，按顺序组合结果。
   * 范围 1-3，默认 1（不拆分）。限制为 3 是为了避免过度消耗 API 额度和触发速率限制。
   */
  concurrentRequests: number

}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  enableTTS: true,
  autoTTS: false,
  enableMiniGame: false,
  miniGamePassingScore: 60,
  enableAutoImage: true,
  streamReply: true,
  enableVoiceInput: true,
  enableAutoMoments: true,

  typewriterSpeed: 'medium',
  autoSend: true,
  inputMode: 'hybrid',
  bubbleStyle: 'classic',

  longTermMemory: true,
  longTermMemoryData: '',
  backtrackEnabled: true,
  contextEditEnabled: true,
  showTokenCount: false,

  quickCommands: [
    { name: '/summarize', content: '总结当前对话' },
    { name: '/continue', content: '继续生成' },
    { name: '/ooc', content: '跳出角色' },
  ],
  replySuggestions: false,
  recentCharacterCount: 5,

  // LLM 默认值（与 SillyTavern 对齐）
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  topK: 0,
  presencePenalty: 0,
  frequencyPenalty: 0,
  repetitionPenalty: 1.0,
  contextWindow: 8192,
  concurrentRequests: 1,
}

const KEY_PREFIX = 'chat_settings_'

function key(characterId: string): string {
  return `${KEY_PREFIX}${characterId}`
}

function safeParse(raw: string | null): ChatSettings {
  if (!raw) return { ...DEFAULT_CHAT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<ChatSettings> & {
      speedMode?: unknown
      memoryMode?: unknown
      summaryTriggerTokens?: unknown
      limitedRounds?: unknown
    }
    const {
      speedMode: _legacySpeedMode,
      memoryMode: _legacyMemoryMode,
      summaryTriggerTokens: _legacySummaryTriggerTokens,
      limitedRounds: _legacyLimitedRounds,
      ...settings
    } = parsed
    return { ...DEFAULT_CHAT_SETTINGS, ...settings }
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS }
  }
}

function sanitizeChatSettings(settings: ChatSettings): ChatSettings {
  const {
    memoryMode: _legacyMemoryMode,
    summaryTriggerTokens: _legacySummaryTriggerTokens,
    limitedRounds: _legacyLimitedRounds,
    speedMode: _legacySpeedMode,
    ...safeSettings
  } = settings as ChatSettings & {
    memoryMode?: unknown
    summaryTriggerTokens?: unknown
    limitedRounds?: unknown
    speedMode?: unknown
  }
  return { ...DEFAULT_CHAT_SETTINGS, ...safeSettings }
}

/** Load per-character chat settings (always returns a fully populated object). */
export async function loadChatSettings(characterId: string): Promise<ChatSettings> {
  if (!characterId) return { ...DEFAULT_CHAT_SETTINGS }
  const raw = await storageDriver.getUserSetting(key(characterId))
  return safeParse(raw)
}

/** Save per-character chat settings. */
export async function saveChatSettings(
  characterId: string,
  settings: ChatSettings,
): Promise<void> {
  if (!characterId) return
  await storageDriver.saveUserSetting(key(characterId), JSON.stringify(sanitizeChatSettings(settings)))
}

/** Patch per-character chat settings (merge partial values). */
export async function patchChatSettings(
  characterId: string,
  patch: Partial<ChatSettings>,
): Promise<ChatSettings> {
  const current = await loadChatSettings(characterId)
  const next: ChatSettings = { ...current, ...patch }
  await saveChatSettings(characterId, next)
  return next
}

/** Reset per-character chat settings to defaults. */
export async function resetChatSettings(characterId: string): Promise<ChatSettings> {
  const next = { ...DEFAULT_CHAT_SETTINGS }
  await saveChatSettings(characterId, next)
  return next
}

/** Load global chat settings (stored without characterId). */
export async function loadGlobalChatSettings(): Promise<ChatSettings> {
  const raw = await storageDriver.getUserSetting('echo_chat_settings_global')
  return safeParse(raw)
}

/** Save global chat settings. */
export async function saveGlobalChatSettings(settings: ChatSettings): Promise<void> {
  await storageDriver.saveUserSetting('echo_chat_settings_global', JSON.stringify(sanitizeChatSettings(settings)))
}
