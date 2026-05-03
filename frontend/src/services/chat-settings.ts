/**
 * Per-character chat settings
 *
 * Stores small per-character toggles that override the global defaults for one
 * specific conversation, e.g. whether to auto-play TTS, whether to allow the AI
 * to inject H5 mini-games into the chat, etc.
 *
 * The 星 (echo-story) chat does NOT use this: its dialogue/feed page is
 * fully scripted by the imported story data. These settings are intended for
 * regular AI conversations where the user wants to disable auxiliary features.
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
   * Off by default for non-星 characters because regular AI chats usually do
   * not need them.
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
}

const KEY_PREFIX = 'chat_settings_'

function key(characterId: string): string {
  return `${KEY_PREFIX}${characterId}`
}

function safeParse(raw: string | null): ChatSettings {
  if (!raw) return { ...DEFAULT_CHAT_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<ChatSettings>
    return { ...DEFAULT_CHAT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS }
  }
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
  await storageDriver.saveUserSetting(key(characterId), JSON.stringify(settings))
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
