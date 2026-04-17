import type { ICharacter } from '@/types/character'
import type { IMessage, IChatSession } from '@/types/chat'
import type { GameState } from '@/types/game'
import type { UserInfo as AppUserInfo, ThemeType } from '@/types/user'
import type { APIConfig as AppAPIConfig } from '@/types/api-config'
import { requestJSON, requestOptionalJSON } from './http'
import { NetworkError } from './errors'

/**
 * Storage key constants.
 */
export const STORAGE_KEYS = {
  CHARACTERS: 'xiang_characters',
  SESSIONS: 'xiang_sessions',
  MESSAGES: 'xiang_messages',
  USER_INFO: 'xiang_user_info',
  API_CONFIGS: 'xiang_api_configs',
  GAME_SETTINGS: 'xiang_game_settings',
  GAME_STATES: 'xiang_game_states',
} as const

/**
 * Re-exported types.
 */
export type UserInfo = AppUserInfo
export type APIConfig = AppAPIConfig
export type { ThemeType }

/**
 * Game settings structure.
 */
export interface GameSettings {
  globalEnabled: boolean
  sessionEnabled: Record<string, boolean>
}

/**
 * Storage driver contract.
 */
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

class BackendStorageDriver implements StorageDriver {
  async saveCharacter(character: ICharacter): Promise<void> {
    await requestJSON('/api/characters', {
      method: 'POST',
      body: JSON.stringify(character)
    })
  }

  async getCharacter(id: string): Promise<ICharacter | null> {
    return requestOptionalJSON<ICharacter>(`/api/characters/${encodeURIComponent(id)}`)
  }

  async getAllCharacters(): Promise<ICharacter[]> {
    return requestJSON<ICharacter[]>('/api/characters')
  }

  async deleteCharacter(id: string): Promise<void> {
    await requestJSON(`/api/characters/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  async saveSession(session: IChatSession): Promise<void> {
    await requestJSON('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session)
    })
  }

  async getSession(id: string): Promise<IChatSession | null> {
    return requestOptionalJSON<IChatSession>(`/api/sessions/${encodeURIComponent(id)}`)
  }

  async getAllSessions(): Promise<IChatSession[]> {
    return requestJSON<IChatSession[]>('/api/sessions')
  }

  async getSessionsByCharacter(characterId: string): Promise<IChatSession[]> {
    return requestJSON<IChatSession[]>('/api/sessions', {}, { character_id: characterId })
  }

  async deleteSession(id: string): Promise<void> {
    await requestJSON(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  async saveMessage(message: IMessage): Promise<void> {
    await requestJSON('/api/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    })
  }

  async getMessage(id: string): Promise<IMessage | null> {
    return requestOptionalJSON<IMessage>(`/api/messages/${encodeURIComponent(id)}`)
  }

  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<IMessage[]> {
    return requestJSON<IMessage[]>(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
      {},
      { limit, offset }
    )
  }

  async deleteMessages(sessionId: string): Promise<void> {
    await requestJSON(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'DELETE'
    })
  }

  async updateMessage(message: IMessage): Promise<void> {
    await requestJSON(`/api/messages/${encodeURIComponent(message.id)}`, {
      method: 'PUT',
      body: JSON.stringify(message)
    })
  }

  async replaceMessages(sessionId: string, messages: IMessage[]): Promise<void> {
    await requestJSON(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'PUT',
      body: JSON.stringify({ messages })
    })
  }

  async saveUserInfo(info: UserInfo): Promise<void> {
    await requestJSON('/api/user', {
      method: 'PUT',
      body: JSON.stringify(info)
    })
  }

  async getUserInfo(): Promise<UserInfo | null> {
    try {
      return await requestOptionalJSON<UserInfo>('/api/user')
    } catch (error) {
      if (error instanceof NetworkError) {
        return null
      }

      throw error
    }
  }

  async saveUserSetting(key: string, value: string): Promise<void> {
    await requestJSON(`/api/user/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ key, value })
    })
  }

  async getUserSetting(key: string): Promise<string | null> {
    try {
      const payload = await requestOptionalJSON<{ key: string; value: string }>(`/api/user/settings/${encodeURIComponent(key)}`)
      return payload?.value || null
    } catch (error) {
      if (error instanceof NetworkError) {
        return null
      }

      throw error
    }
  }

  async saveAPIConfig(config: APIConfig): Promise<void> {
    await requestJSON('/api/api-configs', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async getAPIConfig(id: string): Promise<APIConfig | null> {
    return requestOptionalJSON<APIConfig>(`/api/api-configs/${encodeURIComponent(id)}`)
  }

  async getAllAPIConfigs(): Promise<APIConfig[]> {
    return requestJSON<APIConfig[]>('/api/api-configs')
  }

  async deleteAPIConfig(id: string): Promise<void> {
    await requestJSON(`/api/api-configs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  }

  async saveGameSettings(settings: GameSettings): Promise<void> {
    await requestJSON('/api/game/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  }

  async getGameSettings(): Promise<GameSettings | null> {
    try {
      return await requestOptionalJSON<GameSettings>('/api/game/settings')
    } catch (error) {
      if (error instanceof NetworkError) {
        return null
      }

      throw error
    }
  }

  async saveGameState(state: GameState): Promise<void> {
    await requestJSON('/api/game/states', {
      method: 'POST',
      body: JSON.stringify(state)
    })
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    return requestOptionalJSON<GameState>(`/api/game/states/${encodeURIComponent(gameId)}`)
  }

  async getAllGameStates(): Promise<GameState[]> {
    return requestJSON<GameState[]>('/api/game/states')
  }

  async getGameStatesBySession(sessionId: string): Promise<GameState[]> {
    return requestJSON<GameState[]>('/api/game/states', {}, { session_id: sessionId })
  }

  async deleteGameState(gameId: string): Promise<void> {
    await requestJSON(`/api/game/states/${encodeURIComponent(gameId)}`, {
      method: 'DELETE'
    })
  }

  async clear(): Promise<void> {
    await requestJSON('/api/user/clear', {
      method: 'POST'
    })
  }
}

// ── LocalStorageDriver ────────────────────────────────
// Used when the backend is not available. All data is persisted in
// window.localStorage using the same STORAGE_KEYS constants.

function lsGet<T>(key: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function lsSet<T>(key: string, data: Record<string, T>): void {
  window.localStorage.setItem(key, JSON.stringify(data))
}

class LocalStorageDriver implements StorageDriver {
  // ── Characters ───────────────────────────────────────
  async saveCharacter(character: ICharacter): Promise<void> {
    const map = lsGet<ICharacter>(STORAGE_KEYS.CHARACTERS)
    map[character.id] = character
    lsSet(STORAGE_KEYS.CHARACTERS, map)
  }
  async getCharacter(id: string): Promise<ICharacter | null> {
    return lsGet<ICharacter>(STORAGE_KEYS.CHARACTERS)[id] ?? null
  }
  async getAllCharacters(): Promise<ICharacter[]> {
    return Object.values(lsGet<ICharacter>(STORAGE_KEYS.CHARACTERS))
  }
  async deleteCharacter(id: string): Promise<void> {
    const map = lsGet<ICharacter>(STORAGE_KEYS.CHARACTERS)
    delete map[id]
    lsSet(STORAGE_KEYS.CHARACTERS, map)
  }

  // ── Sessions ─────────────────────────────────────────
  async saveSession(session: IChatSession): Promise<void> {
    const map = lsGet<IChatSession>(STORAGE_KEYS.SESSIONS)
    map[session.id] = session
    lsSet(STORAGE_KEYS.SESSIONS, map)
  }
  async getSession(id: string): Promise<IChatSession | null> {
    return lsGet<IChatSession>(STORAGE_KEYS.SESSIONS)[id] ?? null
  }
  async getAllSessions(): Promise<IChatSession[]> {
    return Object.values(lsGet<IChatSession>(STORAGE_KEYS.SESSIONS))
  }
  async getSessionsByCharacter(characterId: string): Promise<IChatSession[]> {
    return Object.values(lsGet<IChatSession>(STORAGE_KEYS.SESSIONS)).filter(
      s => s.characterId === characterId
    )
  }
  async deleteSession(id: string): Promise<void> {
    const map = lsGet<IChatSession>(STORAGE_KEYS.SESSIONS)
    delete map[id]
    lsSet(STORAGE_KEYS.SESSIONS, map)
    window.localStorage.removeItem(`${STORAGE_KEYS.MESSAGES}_${id}`)
  }

  // ── Messages (per-session key) ────────────────────────
  private msgKey(sessionId: string) { return `${STORAGE_KEYS.MESSAGES}_${sessionId}` }
  async saveMessage(message: IMessage): Promise<void> {
    const key = this.msgKey(message.sessionId)
    const msgs = this._getMsgs(key)
    const idx = msgs.findIndex(m => m.id === message.id)
    if (idx >= 0) msgs[idx] = message
    else msgs.push(message)
    window.localStorage.setItem(key, JSON.stringify(msgs))
  }
  async getMessage(id: string): Promise<IMessage | null> {
    // scan all message keys — not efficient but correct
    for (const k of Object.keys(window.localStorage)) {
      if (!k.startsWith(STORAGE_KEYS.MESSAGES + '_')) continue
      const found = (JSON.parse(window.localStorage.getItem(k) || '[]') as IMessage[]).find(m => m.id === id)
      if (found) return found
    }
    return null
  }
  async getMessages(sessionId: string): Promise<IMessage[]> {
    return this._getMsgs(this.msgKey(sessionId))
  }
  async deleteMessages(sessionId: string): Promise<void> {
    window.localStorage.removeItem(this.msgKey(sessionId))
  }
  async updateMessage(message: IMessage): Promise<void> {
    await this.saveMessage(message)
  }
  async replaceMessages(sessionId: string, messages: IMessage[]): Promise<void> {
    window.localStorage.setItem(this.msgKey(sessionId), JSON.stringify(messages))
  }
  private _getMsgs(key: string): IMessage[] {
    try {
      return JSON.parse(window.localStorage.getItem(key) || '[]') as IMessage[]
    } catch { return [] }
  }

  // ── User info / settings ──────────────────────────────
  async saveUserInfo(info: UserInfo): Promise<void> {
    window.localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(info))
  }
  async getUserInfo(): Promise<UserInfo | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.USER_INFO)
      return raw ? (JSON.parse(raw) as UserInfo) : null
    } catch { return null }
  }
  async saveUserSetting(key: string, value: string): Promise<void> {
    const map = lsGet<string>('xiang_user_settings')
    map[key] = value
    lsSet('xiang_user_settings', map)
  }
  async getUserSetting(key: string): Promise<string | null> {
    return lsGet<string>('xiang_user_settings')[key] ?? null
  }

  // ── API configs ───────────────────────────────────────
  async saveAPIConfig(config: APIConfig): Promise<void> {
    const map = lsGet<APIConfig>(STORAGE_KEYS.API_CONFIGS)
    map[config.id] = config
    lsSet(STORAGE_KEYS.API_CONFIGS, map)
  }
  async getAPIConfig(id: string): Promise<APIConfig | null> {
    return lsGet<APIConfig>(STORAGE_KEYS.API_CONFIGS)[id] ?? null
  }
  async getAllAPIConfigs(): Promise<APIConfig[]> {
    return Object.values(lsGet<APIConfig>(STORAGE_KEYS.API_CONFIGS))
  }
  async deleteAPIConfig(id: string): Promise<void> {
    const map = lsGet<APIConfig>(STORAGE_KEYS.API_CONFIGS)
    delete map[id]
    lsSet(STORAGE_KEYS.API_CONFIGS, map)
  }

  // ── Game settings / states ────────────────────────────
  async saveGameSettings(settings: GameSettings): Promise<void> {
    window.localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settings))
  }
  async getGameSettings(): Promise<GameSettings | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS)
      return raw ? (JSON.parse(raw) as GameSettings) : null
    } catch { return null }
  }
  async saveGameState(state: GameState): Promise<void> {
    const map = lsGet<GameState>(STORAGE_KEYS.GAME_STATES)
    map[state.gameId] = state
    lsSet(STORAGE_KEYS.GAME_STATES, map)
  }
  async getGameState(gameId: string): Promise<GameState | null> {
    return lsGet<GameState>(STORAGE_KEYS.GAME_STATES)[gameId] ?? null
  }
  async getAllGameStates(): Promise<GameState[]> {
    return Object.values(lsGet<GameState>(STORAGE_KEYS.GAME_STATES))
  }
  async getGameStatesBySession(sessionId: string): Promise<GameState[]> {
    return Object.values(lsGet<GameState>(STORAGE_KEYS.GAME_STATES)).filter(
      g => g.sessionId === sessionId
    )
  }
  async deleteGameState(gameId: string): Promise<void> {
    const map = lsGet<GameState>(STORAGE_KEYS.GAME_STATES)
    delete map[gameId]
    lsSet(STORAGE_KEYS.GAME_STATES, map)
  }

  async clear(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(k => window.localStorage.removeItem(k))
    Object.keys(window.localStorage)
      .filter(k => k.startsWith(STORAGE_KEYS.MESSAGES + '_'))
      .forEach(k => window.localStorage.removeItem(k))
  }
}

export const storageDriver = new LocalStorageDriver()

export function getStorageDriver(): StorageDriver {
  return storageDriver
}
