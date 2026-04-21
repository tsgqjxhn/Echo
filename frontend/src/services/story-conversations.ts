import { Message } from '@/entity/message'
import {
  STORY_CHARACTER_NAME,
  STORY_SEGMENTS,
  type DialogueMessage,
  type DialogueSegment,
} from '@/data/story'
import type { ICharacter } from '@/types/character'
import {
  STORY_CHARACTER_TAGS,
  STORY_CHARACTER_TAXONOMY,
  normalizeCharacterTaxonomy
} from '@/data/taxonomy'
import type { IChatSession, IMessage } from '@/types/chat'
import { getStorageDriver } from './storage'
import { generateUUID } from '@/utils/uuid'
import xingAvatar from '@/static/images/头像.png'
import echoBgm from '@/static/images/背景音乐.mp3'

export const ECHO_STORY_NAME = '回声'
export const ECHO_FIRST_CONVERSATION_NAME = '回响'
export const ECHO_STORY_CHARACTER_ID = 'builtin-echo-xing'
export const ECHO_STORY_RUNTIME_KEY = 'echo-story-runtime-v3'

const MUSIC_RATES = [1, 0.94, 1.08, 0.98, 1.12, 0.9]

export type StoryConversationStatus =
  | 'idle'
  | 'playing'
  | 'awaiting-text'
  | 'awaiting-choice'
  | 'completed'
  | 'dead'

export interface StoryConversationDefinition {
  id: string
  title: string
  dayLabel: string
  sceneLabel: string
  shortLabel: string
  segments: DialogueSegment[]
  defaultGameTime: string
  avatar: string
  musicUrl: string
  musicRate: number
}

export interface StoryConversationState {
  conversationId: string
  sessionId: string | null
  segmentIndex: number
  messageIndex: number
  status: StoryConversationStatus
  currentGameTime: string
  unreadCount: number
  lastUpdatedAt: number
}

export interface StoryRuntimeState {
  activeConversationId: string
  order: string[]
  notes: string
  clues: string[]
  states: Record<string, StoryConversationState>
}

export interface StoryLibrary {
  storyName: string
  characterName: string
  conversations: StoryConversationDefinition[]
}

function readLocalJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveStoryRuntimeState(state: StoryRuntimeState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ECHO_STORY_RUNTIME_KEY, JSON.stringify(state))
}

function extractGameTime(text: string): string | null {
  const match = text.match(/(?:当前时间|时间)\s*(\d{1,2}:\d{2})/)
  return match?.[1] || null
}

function normalizeStorySegments(segments: DialogueSegment[]): DialogueSegment[] {
  return segments.flatMap(segment => {
    if (segment.kind !== 'messages' || !segment.messages.some(message => message.role === 'me')) {
      return [segment]
    }

    const normalizedSegments: DialogueSegment[] = []
    let buffer: DialogueMessage[] = []
    let chunkIndex = 0

    const flushBuffer = () => {
      if (buffer.length === 0) {
        return
      }

      chunkIndex += 1
      normalizedSegments.push({
        id: `${segment.id}-messages-${chunkIndex}`,
        kind: 'messages',
        scene: segment.scene,
        prompt: segment.prompt,
        messages: buffer.map(message => ({ ...message })),
        options: [],
      })
      buffer = []
    }

    for (let index = 0; index < segment.messages.length; ) {
      const currentMessage = segment.messages[index]

      if (currentMessage.role !== 'me') {
        buffer.push({ ...currentMessage })
        index += 1
        continue
      }

      flushBuffer()
      const choiceMessages: DialogueMessage[] = []

      while (index < segment.messages.length && segment.messages[index].role === 'me') {
        choiceMessages.push(segment.messages[index])
        index += 1
      }

      chunkIndex += 1
      normalizedSegments.push({
        id: `${segment.id}-choice-${chunkIndex}`,
        kind: 'choice',
        scene: segment.scene,
        prompt: '你的回复',
        messages: [],
        options: choiceMessages.map((message, optionIndex) => ({
          id: `${segment.id}-inline-option-${chunkIndex}-${optionIndex + 1}`,
          key: String.fromCharCode(65 + optionIndex),
          text: message.text,
          retry: false,
          branchMessages: [],
        })),
      })
    }

    flushBuffer()
    return normalizedSegments
  })
}

function parseScene(sceneLabel: string | null, index: number) {
  const fallbackDay = `第${Math.max(1, index + 1)}天`

  if (!sceneLabel) {
    return {
      dayLabel: fallbackDay,
      shortLabel: `对话 ${index + 1}`,
      sceneLabel: fallbackDay,
    }
  }

  const parts = sceneLabel
    .split('·')
    .map(part => part.trim())
    .filter(Boolean)

  return {
    dayLabel: parts[0] || fallbackDay,
    shortLabel: parts[parts.length - 1] || sceneLabel,
    sceneLabel,
  }
}

function buildConversationDefinition(
  sceneLabel: string | null,
  segments: DialogueSegment[],
  index: number,
): StoryConversationDefinition {
  const parsedScene = parseScene(sceneLabel, index)
  let defaultGameTime = '--:--'

  for (const segment of segments) {
    for (const message of segment.messages) {
      const inferredTime = extractGameTime(message.text)
      if (inferredTime) {
        defaultGameTime = inferredTime
        break
      }
    }

    if (defaultGameTime !== '--:--') {
      break
    }
  }

  return {
    id: `echo-conversation-${index + 1}`,
    title: index === 0 ? ECHO_FIRST_CONVERSATION_NAME : parsedScene.shortLabel,
    dayLabel: parsedScene.dayLabel,
    sceneLabel: parsedScene.sceneLabel,
    shortLabel: parsedScene.shortLabel,
    segments,
    defaultGameTime,
    avatar: xingAvatar,
    musicUrl: echoBgm,
    musicRate: MUSIC_RATES[index % MUSIC_RATES.length],
  }
}

function createDefaultConversationState(
  conversation: StoryConversationDefinition,
  sessionId: string | null = null,
): StoryConversationState {
  return {
    conversationId: conversation.id,
    sessionId,
    segmentIndex: 0,
    messageIndex: 0,
    status: 'idle',
    currentGameTime: conversation.defaultGameTime,
    unreadCount: 0,
    lastUpdatedAt: 0,
  }
}

function getSessionTitle(conversation: StoryConversationDefinition): string {
  return conversation.title === ECHO_FIRST_CONVERSATION_NAME ? ECHO_STORY_NAME : conversation.title
}

export function loadStoryLibrary(): StoryLibrary {
  return buildStoryLibrary(STORY_CHARACTER_NAME, STORY_SEGMENTS)
}

function buildStoryLibrary(characterName: string, segments: DialogueSegment[]): StoryLibrary {
  const normalizedSegments = normalizeStorySegments(segments)
  const conversations: StoryConversationDefinition[] = []
  let currentScene: string | null = null
  let currentSegments: DialogueSegment[] = []

  for (const segment of normalizedSegments) {
    if (segment.scene && currentSegments.length > 0 && segment.scene !== currentScene) {
      conversations.push(buildConversationDefinition(currentScene, currentSegments, conversations.length))
      currentSegments = []
    }

    if (segment.scene) {
      currentScene = segment.scene
    }

    currentSegments.push(segment)
  }

  if (currentSegments.length > 0) {
    conversations.push(buildConversationDefinition(currentScene, currentSegments, conversations.length))
  }

  return {
    storyName: ECHO_STORY_NAME,
    characterName,
    conversations,
  }
}

export function loadStoryRuntimeState(conversations: StoryConversationDefinition[]): StoryRuntimeState {
  const conversationIds = conversations.map(conversation => conversation.id)
  const stored = readLocalJSON<Partial<StoryRuntimeState>>(ECHO_STORY_RUNTIME_KEY, {})
  const states: Record<string, StoryConversationState> = {}

  for (const conversation of conversations) {
    const storedState = stored.states?.[conversation.id]
    states[conversation.id] = {
      ...createDefaultConversationState(conversation, storedState?.sessionId || null),
      ...storedState,
      conversationId: conversation.id,
      currentGameTime: storedState?.currentGameTime || conversation.defaultGameTime,
      unreadCount: storedState?.unreadCount || 0,
    }
  }

  const order = [...conversationIds]

  return {
    activeConversationId:
      (typeof stored.activeConversationId === 'string' && conversationIds.includes(stored.activeConversationId))
        ? stored.activeConversationId
        : conversationIds[0],
    order,
    notes: typeof stored.notes === 'string' ? stored.notes : '',
    clues: Array.isArray(stored.clues)
      ? stored.clues.filter(clue => typeof clue === 'string' && clue.trim().length > 0)
      : [],
    states,
  }
}

export function getStoredStoryRuntimeState(): Partial<StoryRuntimeState> {
  return readLocalJSON<Partial<StoryRuntimeState>>(ECHO_STORY_RUNTIME_KEY, {})
}

export function getConversationById(
  conversations: StoryConversationDefinition[],
  conversationId: string,
): StoryConversationDefinition | null {
  return conversations.find(conversation => conversation.id === conversationId) || null
}

export function getConversationIdBySessionId(
  runtimeState: StoryRuntimeState,
  sessionId: string,
): string | null {
  for (const state of Object.values(runtimeState.states)) {
    if (state.sessionId === sessionId) {
      return state.conversationId
    }
  }

  return null
}

export function getRollbackDays(conversations: StoryConversationDefinition[]): string[] {
  const days = new Set<string>()

  for (const conversation of conversations) {
    days.add(conversation.dayLabel)
  }

  return [...days]
}

export function getConversationIdsForDay(
  conversations: StoryConversationDefinition[],
  dayLabel: string,
): string[] {
  return conversations
    .filter(conversation => conversation.dayLabel === dayLabel)
    .map(conversation => conversation.id)
}

export function resetConversationState(
  runtimeState: StoryRuntimeState,
  conversation: StoryConversationDefinition,
  preserveSessionId: string | null = null,
): StoryRuntimeState {
  runtimeState.states[conversation.id] = createDefaultConversationState(conversation, preserveSessionId)
  runtimeState.activeConversationId = conversation.id
  return runtimeState
}

export function markConversationRead(runtimeState: StoryRuntimeState, conversationId: string): StoryRuntimeState {
  const state = runtimeState.states[conversationId]

  if (!state) {
    return runtimeState
  }

  state.unreadCount = 0
  state.lastUpdatedAt = Date.now()
  return runtimeState
}

export function addStoryClue(runtimeState: StoryRuntimeState, clue: string): StoryRuntimeState {
  const normalized = clue.trim()

  if (!normalized || runtimeState.clues.includes(normalized)) {
    return runtimeState
  }

  runtimeState.clues = [...runtimeState.clues, normalized]
  return runtimeState
}

export function removeStoryClue(runtimeState: StoryRuntimeState, clue: string): StoryRuntimeState {
  runtimeState.clues = runtimeState.clues.filter(item => item !== clue)
  return runtimeState
}

export async function ensureStoryCharacter(characterName: string): Promise<ICharacter> {
  const storage = getStorageDriver()
  const existing = await storage.getCharacter(ECHO_STORY_CHARACTER_ID)

  if (existing) {
    const normalizedExisting = normalizeCharacterTaxonomy(existing)
    const tags = Array.from(new Set([...(normalizedExisting.tags || []), ...STORY_CHARACTER_TAGS]))
    if (
      normalizedExisting.avatar !== xingAvatar ||
      normalizedExisting.name !== characterName ||
      normalizedExisting.sourceType !== 'builtin-story' ||
      normalizedExisting.category !== STORY_CHARACTER_TAXONOMY.category ||
      normalizedExisting.subCategory !== STORY_CHARACTER_TAXONOMY.subCategory ||
      normalizedExisting.background !== `${STORY_CHARACTER_TAXONOMY.category} / ${STORY_CHARACTER_TAXONOMY.subCategory}`
    ) {
      const updated: ICharacter = {
        ...normalizedExisting,
        avatar: xingAvatar,
        name: characterName,
        background: `${STORY_CHARACTER_TAXONOMY.category} / ${STORY_CHARACTER_TAXONOMY.subCategory}`,
        category: STORY_CHARACTER_TAXONOMY.category,
        subCategory: STORY_CHARACTER_TAXONOMY.subCategory,
        tags,
        sourceType: 'builtin-story',
      }
      await storage.saveCharacter(updated)
      return updated
    }

    if (JSON.stringify(tags) !== JSON.stringify(normalizedExisting.tags || [])) {
      const updated: ICharacter = {
        ...normalizedExisting,
        tags
      }
      await storage.saveCharacter(updated)
      return updated
    }

    return normalizedExisting
  }

  const timestamp = Date.now()
  const builtInCharacter: ICharacter = {
    id: ECHO_STORY_CHARACTER_ID,
    name: characterName,
    avatar: xingAvatar,
    background: `${STORY_CHARACTER_TAXONOMY.category} / ${STORY_CHARACTER_TAXONOMY.subCategory}`,
    description: '内置故事角色，会话由导入剧本驱动。',
    greeting: '',
    settings: '你是内置故事角色，只按导入剧本和玩家选择推进，不进行自由发挥。',
    isFavorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    mode: 'free-dialogue',
    category: STORY_CHARACTER_TAXONOMY.category,
    subCategory: STORY_CHARACTER_TAXONOMY.subCategory,
    avatarTone: 'default',
    backgroundImage: '',
    personality: '',
    behavior: '',
    values: '',
    members: [],
    tags: [ECHO_STORY_NAME, ...STORY_CHARACTER_TAGS],
    sourceType: 'builtin-story',
    sourceName: ECHO_STORY_NAME,
  }

  await storage.saveCharacter(builtInCharacter)
  return builtInCharacter
}

export async function ensureConversationSession(
  conversation: StoryConversationDefinition,
  runtimeState: StoryRuntimeState,
): Promise<IChatSession> {
  const storage = getStorageDriver()
  const currentState = runtimeState.states[conversation.id]

  if (currentState?.sessionId) {
    const existingSession = await storage.getSession(currentState.sessionId)
    if (existingSession) {
      const syncedSession = {
        ...existingSession,
        title: getSessionTitle(conversation),
        mode: 'story',
      }
      await storage.saveSession(syncedSession)
      return syncedSession
    }
  }

  const timestamp = Date.now()
  const session: IChatSession = {
    id: generateUUID(),
    characterId: ECHO_STORY_CHARACTER_ID,
    createdAt: timestamp,
    updatedAt: timestamp,
    messageCount: 0,
    title: getSessionTitle(conversation),
    mode: 'story',
  }

  await storage.saveSession(session)
  runtimeState.states[conversation.id] = {
    ...createDefaultConversationState(conversation, session.id),
    ...runtimeState.states[conversation.id],
    sessionId: session.id,
  }
  saveStoryRuntimeState(runtimeState)
  return session
}

export async function getConversationMessages(sessionId: string | null): Promise<IMessage[]> {
  if (!sessionId) {
    return []
  }

  const storage = getStorageDriver()
  return storage.getMessages(sessionId)
}

let lastMessageTimestamp = Date.now()

function nextMessageTimestamp(): number {
  const current = Date.now()
  lastMessageTimestamp = Math.max(current, lastMessageTimestamp + 1)
  return lastMessageTimestamp
}

export async function appendConversationMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<IMessage> {
  const storage = getStorageDriver()
  const message = Message.createText(sessionId, role, content)
  message.timestamp = nextMessageTimestamp()
  await storage.saveMessage(message)
  return message
}

export async function clearConversationMessages(sessionId: string | null): Promise<void> {
  if (!sessionId) {
    return
  }

  const storage = getStorageDriver()
  await storage.deleteMessages(sessionId)
}

export function applySystemEffects(
  runtimeState: StoryRuntimeState,
  conversationId: string,
  message: Pick<DialogueMessage, 'role' | 'text'>,
): StoryRuntimeState {
  if (message.role !== 'system') {
    return runtimeState
  }

  const inferredTime = extractGameTime(message.text)
  if (inferredTime) {
    runtimeState.states[conversationId].currentGameTime = inferredTime
  }

  if (
    /(角色已死亡|连接已断开|时间线已中断|时间线中断|被抓住|脑电波被系统强行抹平|救生机在撞击中爆炸)/.test(
      message.text,
    )
  ) {
    runtimeState.states[conversationId].status = 'dead'
  }

  return runtimeState
}
