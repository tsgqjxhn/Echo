import type { ICharacter } from '@/types/character'
import type { MomentPost } from '@/stores/moments'
import type { StorageDriver } from './storage'

export const HISTORY_READ_EVENT = 'echo-history-read-changed'

export interface HistoryReadState {
  sessionReadAt: Record<string, number>
  momentsReadAt: number
  contactsFriendsReadAt: number
  contactsGroupsReadAt: number
  likedReadAt: number
}

const HISTORY_READ_KEY = 'echo_history_read_state_v1'

function emptyReadState(): HistoryReadState {
  return {
    sessionReadAt: {},
    momentsReadAt: 0,
    contactsFriendsReadAt: 0,
    contactsGroupsReadAt: 0,
    likedReadAt: 0,
  }
}

export function loadHistoryReadState(): HistoryReadState {
  if (typeof window === 'undefined') {
    return emptyReadState()
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_READ_KEY) || '{}') as Partial<HistoryReadState>
    return {
      ...emptyReadState(),
      ...parsed,
      sessionReadAt: parsed.sessionReadAt || {},
    }
  } catch {
    return emptyReadState()
  }
}

function saveHistoryReadState(state: HistoryReadState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(HISTORY_READ_KEY, JSON.stringify(state))
}

export function emitHistoryReadChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HISTORY_READ_EVENT))
  }
}

export function markSessionsRead(sessionIds: string[], timestamp = Date.now()): HistoryReadState {
  const state = loadHistoryReadState()
  for (const sessionId of sessionIds) {
    state.sessionReadAt[sessionId] = timestamp
  }
  saveHistoryReadState(state)
  emitHistoryReadChanged()
  return state
}

export function markMomentsRead(timestamp = Date.now()): HistoryReadState {
  const state = loadHistoryReadState()
  state.momentsReadAt = timestamp
  saveHistoryReadState(state)
  emitHistoryReadChanged()
  return state
}

export function markContactsRead(kind: 'friends' | 'groups', timestamp = Date.now()): HistoryReadState {
  const state = loadHistoryReadState()
  if (kind === 'friends') {
    state.contactsFriendsReadAt = timestamp
  } else {
    state.contactsGroupsReadAt = timestamp
  }
  saveHistoryReadState(state)
  emitHistoryReadChanged()
  return state
}

export function markLikedRead(timestamp = Date.now()): HistoryReadState {
  const state = loadHistoryReadState()
  state.likedReadAt = timestamp
  saveHistoryReadState(state)
  emitHistoryReadChanged()
  return state
}

export function getLatestMomentTime(posts: MomentPost[]): number {
  return posts.reduce((latest, post) => Math.max(latest, post.postedAt || 0), 0)
}

export function hasUnreadMoments(posts: MomentPost[], state = loadHistoryReadState()): boolean {
  return getLatestMomentTime(posts) > state.momentsReadAt
}

export function isGroupCharacterForUnread(character: ICharacter): boolean {
  return character.mode === 'group-chat' || character.mode === 'group-challenge' || character.mode === 'multi-free' || character.mode === 'multi-story' || character.mode === 'multi-game'
}

export function hasUnreadContacts(
  characters: ICharacter[],
  kind: 'friends' | 'groups',
  state = loadHistoryReadState()
): boolean {
  const readAt = kind === 'friends' ? state.contactsFriendsReadAt : state.contactsGroupsReadAt
  return characters.some(character => {
    const isGroup = isGroupCharacterForUnread(character)
    const inScope = kind === 'groups' ? isGroup : character.isFriend && !isGroup
    return inScope && (character.updatedAt || 0) > readAt
  })
}

export function hasUnreadLiked(characters: ICharacter[], state = loadHistoryReadState()): boolean {
  return characters.some(character => character.isLiked && (character.updatedAt || 0) > state.likedReadAt)
}

export function hasUnreadSession(
  sessionIds: string[],
  latestTimestamp: number,
  state = loadHistoryReadState()
): boolean {
  if (latestTimestamp <= 0) {
    return false
  }

  return sessionIds.some(sessionId => latestTimestamp > (state.sessionReadAt[sessionId] || 0))
}

export async function getLatestSessionMessageTime(storage: StorageDriver, sessionId: string): Promise<number> {
  const messages = await storage.getMessages(sessionId)
  return messages[messages.length - 1]?.timestamp || 0
}

export async function hasAnyHistoryUnread(
  storage: StorageDriver,
  momentPosts: MomentPost[]
): Promise<boolean> {
  const state = loadHistoryReadState()

  if (hasUnreadMoments(momentPosts, state)) {
    return true
  }

  const characters = await storage.getAllCharacters()
  if (
    hasUnreadContacts(characters, 'friends', state) ||
    hasUnreadContacts(characters, 'groups', state) ||
    hasUnreadLiked(characters, state)
  ) {
    return true
  }

  const sessions = await storage.getAllSessions()
  for (const session of sessions) {
    const latestTimestamp = await getLatestSessionMessageTime(storage, session.id)
    if (latestTimestamp > (state.sessionReadAt[session.id] || 0)) {
      return true
    }
  }

  return false
}
