import type { APIConfig as AppAPIConfig } from '@/types/api-config'
import type { IMessage, IChatSession } from '@/types/chat'
import type { ICharacter } from '@/types/character'
import type { GameState } from '@/types/game'
import type { ThemeType, UserInfo as AppUserInfo } from '@/types/user'
import { normalizeCharacterTaxonomy } from '@/data/taxonomy'

export const STORAGE_KEYS = {
  CHARACTERS: 'xiang_characters',
  SESSIONS: 'xiang_sessions',
  MESSAGES: 'xiang_messages',
  USER_INFO: 'xiang_user_info',
  API_CONFIGS: 'xiang_api_configs',
  GAME_SETTINGS: 'xiang_game_settings',
  GAME_STATES: 'xiang_game_states',
} as const

const USER_SETTINGS_KEY = 'xiang_user_settings'

export type UserInfo = AppUserInfo
export type APIConfig = AppAPIConfig
export type { ThemeType }

export interface GameSettings {
  globalEnabled: boolean
  sessionEnabled: Record<string, boolean>
  difficultyLevel: 'easy' | 'normal' | 'hard'
  baseSuccessRate: number
}

export interface StorageDriver {
  saveCharacter(character: ICharacter): Promise<void>
  getCharacter(id: string): Promise<ICharacter | null>
  getAllCharacters(): Promise<ICharacter[]>
  deleteCharacter(id: string): Promise<void>

  saveSession(session: IChatSession): Promise<void>
  getSession(id: string): Promise<IChatSession | null>
  getAllSessions(): Promise<IChatSession[]>
  getSessionsByCharacter(characterId: string): Promise<IChatSession[]>
  deleteSession(id: string): Promise<void>

  saveMessage(message: IMessage): Promise<void>
  getMessage(id: string): Promise<IMessage | null>
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<IMessage[]>
  deleteMessages(sessionId: string): Promise<void>
  updateMessage(message: IMessage): Promise<void>
  replaceMessages(sessionId: string, messages: IMessage[]): Promise<void>

  saveUserInfo(info: UserInfo): Promise<void>
  getUserInfo(): Promise<UserInfo | null>
  saveUserSetting(key: string, value: string): Promise<void>
  getUserSetting(key: string): Promise<string | null>

  saveAPIConfig(config: APIConfig): Promise<void>
  getAPIConfig(id: string): Promise<APIConfig | null>
  getAllAPIConfigs(): Promise<APIConfig[]>
  deleteAPIConfig(id: string): Promise<void>

  saveGameSettings(settings: GameSettings): Promise<void>
  getGameSettings(): Promise<GameSettings | null>

  saveGameState(state: GameState): Promise<void>
  getGameState(gameId: string): Promise<GameState | null>
  getAllGameStates(): Promise<GameState[]>
  getGameStatesBySession(sessionId: string): Promise<GameState[]>
  deleteGameState(gameId: string): Promise<void>

  clear(): Promise<void>
}

function lsGetMap<T>(key: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function lsSetMap<T>(key: string, data: Record<string, T>): void {
  window.localStorage.setItem(key, JSON.stringify(data))
}

function hasCharacterTaxonomyChanged(before: ICharacter, after: ICharacter): boolean {
  return (
    before.category !== after.category ||
    before.subCategory !== after.subCategory ||
    before.background !== after.background ||
    JSON.stringify(before.tags || []) !== JSON.stringify(after.tags || [])
  )
}

export class LocalStorageDriver implements StorageDriver {
  private messageKey(sessionId: string): string {
    return `${STORAGE_KEYS.MESSAGES}_${sessionId}`
  }

  private readMessages(sessionId: string): IMessage[] {
    try {
      return JSON.parse(window.localStorage.getItem(this.messageKey(sessionId)) || '[]') as IMessage[]
    } catch {
      return []
    }
  }

  private writeMessages(sessionId: string, messages: IMessage[]): void {
    window.localStorage.setItem(this.messageKey(sessionId), JSON.stringify(messages))
  }

  async saveCharacter(character: ICharacter): Promise<void> {
    const map = lsGetMap<ICharacter>(STORAGE_KEYS.CHARACTERS)
    map[character.id] = normalizeCharacterTaxonomy(character)
    lsSetMap(STORAGE_KEYS.CHARACTERS, map)
  }

  async getCharacter(id: string): Promise<ICharacter | null> {
    const map = lsGetMap<ICharacter>(STORAGE_KEYS.CHARACTERS)
    const character = map[id]
    if (!character) {
      return null
    }

    const normalized = normalizeCharacterTaxonomy(character)
    if (hasCharacterTaxonomyChanged(character, normalized)) {
      map[id] = normalized
      lsSetMap(STORAGE_KEYS.CHARACTERS, map)
    }

    return normalized
  }

  async getAllCharacters(): Promise<ICharacter[]> {
    const map = lsGetMap<ICharacter>(STORAGE_KEYS.CHARACTERS)
    let changed = false
    const characters = Object.values(map).map(character => {
      const normalized = normalizeCharacterTaxonomy(character)
      if (hasCharacterTaxonomyChanged(character, normalized)) {
        map[character.id] = normalized
        changed = true
      }
      return normalized
    })

    if (changed) {
      lsSetMap(STORAGE_KEYS.CHARACTERS, map)
    }

    return characters
  }

  async deleteCharacter(id: string): Promise<void> {
    const map = lsGetMap<ICharacter>(STORAGE_KEYS.CHARACTERS)
    delete map[id]
    lsSetMap(STORAGE_KEYS.CHARACTERS, map)
  }

  async saveSession(session: IChatSession): Promise<void> {
    const map = lsGetMap<IChatSession>(STORAGE_KEYS.SESSIONS)
    map[session.id] = session
    lsSetMap(STORAGE_KEYS.SESSIONS, map)
  }

  async getSession(id: string): Promise<IChatSession | null> {
    return lsGetMap<IChatSession>(STORAGE_KEYS.SESSIONS)[id] ?? null
  }

  async getAllSessions(): Promise<IChatSession[]> {
    return Object.values(lsGetMap<IChatSession>(STORAGE_KEYS.SESSIONS))
  }

  async getSessionsByCharacter(characterId: string): Promise<IChatSession[]> {
    return Object.values(lsGetMap<IChatSession>(STORAGE_KEYS.SESSIONS)).filter(
      session => session.characterId === characterId
    )
  }

  async deleteSession(id: string): Promise<void> {
    const map = lsGetMap<IChatSession>(STORAGE_KEYS.SESSIONS)
    delete map[id]
    lsSetMap(STORAGE_KEYS.SESSIONS, map)
    window.localStorage.removeItem(this.messageKey(id))
  }

  async saveMessage(message: IMessage): Promise<void> {
    const messages = this.readMessages(message.sessionId)
    const index = messages.findIndex(item => item.id === message.id)
    if (index >= 0) {
      messages[index] = message
    } else {
      messages.push(message)
    }
    this.writeMessages(message.sessionId, messages)
  }

  async getMessage(id: string): Promise<IMessage | null> {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(`${STORAGE_KEYS.MESSAGES}_`)) {
        continue
      }

      try {
        const messages = JSON.parse(window.localStorage.getItem(key) || '[]') as IMessage[]
        const found = messages.find(message => message.id === id)
        if (found) {
          return found
        }
      } catch {
        // Ignore malformed local storage entries.
      }
    }

    return null
  }

  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<IMessage[]> {
    const messages = this.readMessages(sessionId).sort((left, right) => left.timestamp - right.timestamp)
    const safeOffset = Number.isFinite(offset) && (offset as number) > 0 ? Math.floor(offset as number) : 0
    const safeLimit = Number.isFinite(limit) && (limit as number) > 0 ? Math.floor(limit as number) : undefined

    if (safeLimit === undefined) {
      return messages.slice(safeOffset)
    }

    return messages.slice(safeOffset, safeOffset + safeLimit)
  }

  async deleteMessages(sessionId: string): Promise<void> {
    window.localStorage.removeItem(this.messageKey(sessionId))
  }

  async updateMessage(message: IMessage): Promise<void> {
    await this.saveMessage(message)
  }

  async replaceMessages(sessionId: string, messages: IMessage[]): Promise<void> {
    this.writeMessages(sessionId, messages)
  }

  async saveUserInfo(info: UserInfo): Promise<void> {
    window.localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info))
  }

  async getUserInfo(): Promise<UserInfo | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.USER_INFO)
      return raw ? (JSON.parse(raw) as UserInfo) : null
    } catch {
      return null
    }
  }

  async saveUserSetting(key: string, value: string): Promise<void> {
    const settings = lsGetMap<string>(USER_SETTINGS_KEY)
    settings[key] = value
    lsSetMap(USER_SETTINGS_KEY, settings)
  }

  async getUserSetting(key: string): Promise<string | null> {
    return lsGetMap<string>(USER_SETTINGS_KEY)[key] ?? null
  }

  async saveAPIConfig(config: APIConfig): Promise<void> {
    const map = lsGetMap<APIConfig>(STORAGE_KEYS.API_CONFIGS)
    map[config.id] = config
    lsSetMap(STORAGE_KEYS.API_CONFIGS, map)
  }

  async getAPIConfig(id: string): Promise<APIConfig | null> {
    return lsGetMap<APIConfig>(STORAGE_KEYS.API_CONFIGS)[id] ?? null
  }

  async getAllAPIConfigs(): Promise<APIConfig[]> {
    return Object.values(lsGetMap<APIConfig>(STORAGE_KEYS.API_CONFIGS))
  }

  async deleteAPIConfig(id: string): Promise<void> {
    const map = lsGetMap<APIConfig>(STORAGE_KEYS.API_CONFIGS)
    delete map[id]
    lsSetMap(STORAGE_KEYS.API_CONFIGS, map)
  }

  async saveGameSettings(settings: GameSettings): Promise<void> {
    window.localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settings))
  }

  async getGameSettings(): Promise<GameSettings | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS)
      if (!raw) {
        return null
      }

      const parsed = JSON.parse(raw) as Partial<GameSettings>
      return {
        globalEnabled: parsed.globalEnabled ?? true,
        sessionEnabled: parsed.sessionEnabled || {},
        difficultyLevel: parsed.difficultyLevel ?? 'normal',
        baseSuccessRate: parsed.baseSuccessRate ?? 50,
      }
    } catch {
      return null
    }
  }

  async saveGameState(state: GameState): Promise<void> {
    const map = lsGetMap<GameState>(STORAGE_KEYS.GAME_STATES)
    map[state.id] = state
    lsSetMap(STORAGE_KEYS.GAME_STATES, map)
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    return lsGetMap<GameState>(STORAGE_KEYS.GAME_STATES)[gameId] ?? null
  }

  async getAllGameStates(): Promise<GameState[]> {
    return Object.values(lsGetMap<GameState>(STORAGE_KEYS.GAME_STATES))
  }

  async getGameStatesBySession(sessionId: string): Promise<GameState[]> {
    return Object.values(lsGetMap<GameState>(STORAGE_KEYS.GAME_STATES)).filter(
      state => state.sessionId === sessionId
    )
  }

  async deleteGameState(gameId: string): Promise<void> {
    const map = lsGetMap<GameState>(STORAGE_KEYS.GAME_STATES)
    delete map[gameId]
    lsSetMap(STORAGE_KEYS.GAME_STATES, map)
  }

  async clear(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => window.localStorage.removeItem(key))
    window.localStorage.removeItem(USER_SETTINGS_KEY)

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(`${STORAGE_KEYS.MESSAGES}_`) || key.startsWith('echo-') || key.startsWith('echo_')) {
        window.localStorage.removeItem(key)
      }
    }
  }
}

export class BackendStorageDriver extends LocalStorageDriver {}

export const storageDriver = new LocalStorageDriver()

export function getStorageDriver(): StorageDriver {
  return storageDriver
}
