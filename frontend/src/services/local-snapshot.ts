import type { APIConfig } from '@/types/api-config'
import type { IChatSession, IMessage } from '@/types/chat'
import type { ICharacter } from '@/types/character'
import type { GameState } from '@/types/game'
import type { UserInfo } from '@/types/user'
import { getStorageDriver, type GameSettings } from './storage'

export interface StandardSnapshot {
  version: string
  exportedAt: number
  appVersion: string
  user: UserInfo | null
  characters: ICharacter[]
  sessions: IChatSession[]
  messages: Record<string, IMessage[]>
  apiConfigs: APIConfig[]
  gameSettings: GameSettings
  gameStates: GameState[]
}

export interface BackupSnapshot extends StandardSnapshot {
  exportType: 'backup'
}

export interface SnapshotOverview {
  characterCount: number
  sessionCount: number
  messageCount: number
  apiConfigCount: number
  gameStateCount: number
}

export interface SnapshotImportSummary extends SnapshotOverview {
  mode: 'merge' | 'replace'
}

export type SnapshotImportPayload = Partial<StandardSnapshot> &
  Partial<Pick<BackupSnapshot, 'apiConfigs' | 'gameSettings' | 'gameStates'>>

const APP_SNAPSHOT_VERSION = 'frontend-local-1.0'

function cloneMessages(messages: IMessage[]): IMessage[] {
  return messages.map(message => ({ ...message }))
}

function defaultGameSettings(settings?: GameSettings | null): GameSettings {
  return {
    globalEnabled: settings?.globalEnabled ?? true,
    sessionEnabled: settings?.sessionEnabled || {},
    globalSoundEnabled: settings?.globalSoundEnabled ?? true,
    globalBgmEnabled: settings?.globalBgmEnabled ?? true,
    damageDisplayEnabled: settings?.damageDisplayEnabled ?? true,
    gameNotificationsEnabled: settings?.gameNotificationsEnabled ?? true,
    gameNotifications: settings?.gameNotifications ?? [],
  }
}

async function buildMessageGroups(sessions: IChatSession[]): Promise<Record<string, IMessage[]>> {
  const storage = getStorageDriver()
  const groups: Record<string, IMessage[]> = {}

  for (const session of sessions) {
    const messages = await storage.getMessages(session.id)
    groups[session.id] = cloneMessages(messages)
  }

  return groups
}

export async function getSnapshotOverview(): Promise<SnapshotOverview> {
  const storage = getStorageDriver()
  const [characters, sessions, apiConfigs, gameStates] = await Promise.all([
    storage.getAllCharacters(),
    storage.getAllSessions(),
    storage.getAllAPIConfigs(),
    storage.getAllGameStates(),
  ])

  let messageCount = 0
  for (const session of sessions) {
    messageCount += (await storage.getMessages(session.id)).length
  }

  return {
    characterCount: characters.length,
    sessionCount: sessions.length,
    messageCount,
    apiConfigCount: apiConfigs.length,
    gameStateCount: gameStates.length,
  }
}

export async function buildStandardSnapshot(): Promise<StandardSnapshot> {
  const storage = getStorageDriver()
  const [user, characters, sessions, apiConfigs, gameSettings, gameStates] = await Promise.all([
    storage.getUserInfo(),
    storage.getAllCharacters(),
    storage.getAllSessions(),
    storage.getAllAPIConfigs(),
    storage.getGameSettings(),
    storage.getAllGameStates(),
  ])

  return {
    version: '1.0',
    exportedAt: Date.now(),
    appVersion: APP_SNAPSHOT_VERSION,
    user,
    characters: characters.map(character => ({ ...character })),
    sessions: sessions.map(session => ({ ...session })),
    messages: await buildMessageGroups(sessions),
    apiConfigs: apiConfigs.map(config => {
      const { apiKey: _apiKey, ...rest } = config
      return rest as APIConfig
    }),
    gameSettings: defaultGameSettings(gameSettings),
    gameStates: gameStates.map(state => ({ ...state })),
  }
}

export async function buildBackupSnapshot(): Promise<BackupSnapshot> {
  const storage = getStorageDriver()
  const standard = await buildStandardSnapshot()
  const apiConfigs = await storage.getAllAPIConfigs()

  return {
    ...standard,
    version: '1.1',
    exportType: 'backup',
    apiConfigs: apiConfigs.map(config => ({ ...config })),
  }
}

export async function buildSessionSnapshot(sessionId: string): Promise<StandardSnapshot> {
  const snapshot = await buildStandardSnapshot()
  const session = snapshot.sessions.find(item => item.id === sessionId)

  if (!session) {
    throw new Error('Session was not found.')
  }

  return {
    ...snapshot,
    sessions: [session],
    messages: {
      [sessionId]: snapshot.messages[sessionId] || [],
    },
  }
}

export async function buildCharacterSnapshot(characterId: string): Promise<StandardSnapshot> {
  const snapshot = await buildStandardSnapshot()
  const character = snapshot.characters.find(item => item.id === characterId)

  if (!character) {
    throw new Error('Character was not found.')
  }

  const sessions = snapshot.sessions.filter(session => session.characterId === characterId)
  const allowedIds = new Set(sessions.map(session => session.id))

  return {
    ...snapshot,
    characters: [character],
    sessions,
    messages: Object.fromEntries(
      Object.entries(snapshot.messages).filter(([sessionId]) => allowedIds.has(sessionId))
    ),
  }
}

export function renderMarkdownSnapshot(snapshot: StandardSnapshot): string {
  const output: string[] = ['# Echo 数据导出', '']
  output.push(`**导出时间**: ${snapshot.exportedAt}`)
  output.push('')

  if (snapshot.user?.name) {
    output.push(`**用户名称**: ${snapshot.user.name}`)
    output.push('')
  }

  output.push('---')
  output.push('')

  const sessionsByCharacter = new Map<string, IChatSession[]>()
  for (const session of snapshot.sessions) {
    const list = sessionsByCharacter.get(session.characterId) || []
    list.push(session)
    sessionsByCharacter.set(session.characterId, list)
  }

  for (const character of snapshot.characters) {
    output.push(`## 角色：${character.name}`)
    output.push('')
    output.push(`**描述**: ${character.description}`)
    output.push('')

    if (character.background) {
      output.push(`**背景**: ${character.background}`)
      output.push('')
    }

    if (character.settings) {
      output.push(`**设定**: ${character.settings}`)
      output.push('')
    }

    for (const session of sessionsByCharacter.get(character.id) || []) {
      const messages = snapshot.messages[session.id] || []
      for (const message of messages) {
        const role = message.role === 'user' ? '用户' : 'AI'
        output.push(`**${role}**: ${message.content}`)
        output.push('')
      }
      output.push('---')
      output.push('')
    }
  }

  return output.join('\n')
}

function normalizeMessagesPayload(messages: unknown): Record<string, IMessage[]> {
  if (Array.isArray(messages)) {
    const grouped: Record<string, IMessage[]> = {}
    for (const message of messages as IMessage[]) {
      grouped[message.sessionId] ||= []
      grouped[message.sessionId].push({ ...message })
    }
    return grouped
  }

  if (messages && typeof messages === 'object') {
    const grouped: Record<string, IMessage[]> = {}
    for (const [sessionId, items] of Object.entries(messages as Record<string, IMessage[]>)) {
      grouped[sessionId] = Array.isArray(items) ? items.map(item => ({ ...item })) : []
    }
    return grouped
  }

  return {}
}

async function mergeSessionMessages(sessionId: string, incoming: IMessage[], mode: 'merge' | 'replace'): Promise<number> {
  const storage = getStorageDriver()
  const sortedIncoming = incoming
    .map(message => ({ ...message }))
    .sort((left, right) => left.timestamp - right.timestamp)

  if (mode === 'replace') {
    await storage.replaceMessages(sessionId, sortedIncoming)
    return sortedIncoming.length
  }

  const existing = await storage.getMessages(sessionId)
  const byId = new Map(existing.map(message => [message.id, { ...message }]))

  for (const message of sortedIncoming) {
    if (!byId.has(message.id)) {
      byId.set(message.id, message)
    }
  }

  const merged = Array.from(byId.values()).sort((left, right) => left.timestamp - right.timestamp)
  await storage.replaceMessages(sessionId, merged)
  return merged.length
}

export async function importSnapshot(
  payload: SnapshotImportPayload,
  mode: 'merge' | 'replace'
): Promise<SnapshotImportSummary> {
  const storage = getStorageDriver()

  if (mode === 'replace') {
    await storage.clear()
  }

  if (payload.user) {
    const current = (await storage.getUserInfo()) || {}
    await storage.saveUserInfo({
      ...current,
      ...payload.user,
    })
  }

  for (const character of payload.characters || []) {
    await storage.saveCharacter({ ...character })
  }

  for (const session of payload.sessions || []) {
    await storage.saveSession({ ...session })
  }

  const groupedMessages = normalizeMessagesPayload(payload.messages)
  for (const [sessionId, messages] of Object.entries(groupedMessages)) {
    const count = await mergeSessionMessages(sessionId, messages, mode)
    const session = await storage.getSession(sessionId)
    if (session) {
      await storage.saveSession({
        ...session,
        messageCount: count,
        updatedAt: Math.max(
          session.updatedAt || 0,
          ...messages.map(message => message.timestamp || 0),
          Date.now()
        ),
      })
    }
  }

  for (const config of payload.apiConfigs || []) {
    if (config.apiKey) {
      await storage.saveAPIConfig({ ...config })
    }
  }

  if (payload.gameSettings) {
    await storage.saveGameSettings(defaultGameSettings(payload.gameSettings))
  }

  for (const state of payload.gameStates || []) {
    await storage.saveGameState({ ...state })
  }

  return {
    mode,
    characterCount: (payload.characters || []).length,
    sessionCount: (payload.sessions || []).length,
    messageCount: Object.values(groupedMessages).reduce((total, items) => total + items.length, 0),
    apiConfigCount: (payload.apiConfigs || []).filter(item => !!item.apiKey).length,
    gameStateCount: (payload.gameStates || []).length,
  }
}
