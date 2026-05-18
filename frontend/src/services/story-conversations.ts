import { Message } from '@/entity/message'
import {
  STORY_CHARACTER_NAME,
  STORY_CONVERSATIONS,
  type DialogueMessage,
  type DialogueSegment,
  type StoryConversation,
} from '@/data/story'
import type { ICharacter } from '@/types/character'
import type { IChatSession, IMessage } from '@/types/chat'
import defaultAvatar from '@/static/images/default-avatar.svg'
import { STORAGE_KEYS, getStorageDriver } from './storage'
import { generateUUID } from '@/utils/uuid'

export const ECHO_STORY_NAME = '回声'
export const ECHO_FIRST_CONVERSATION_NAME = '回响'
export const ECHO_STORY_CHARACTER_ID = 'builtin-echo-xing'
export const ECHO_STORY_RUNTIME_KEY = 'echo-story-runtime-removed-v1'

const LEGACY_STORY_RUNTIME_KEYS = [
  'echo-story-runtime',
  'echo-story-runtime-v2',
  'echo-story-runtime-v3',
  'echo-story-runtime-v4',
  'echo-story-runtime-v5',
]
const GALLERY_PROGRESS_KEY = 'echo-gallery-unlocked'
const MOMENTS_POSTS_KEY = 'echo_moments_posts'
const MOMENTS_SCHEDULE_KEY = 'echo_moments_schedule'
const FRIEND_REQUESTS_KEY = 'echo_friend_requests'
const STORY_GUIDE_MAX_LENGTH = 380
const STORY_SUMMARY_MAX_LENGTH = 1200

export type StoryAvatarKey = 'question' | 'blur' | 'short' | 'xing'

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
  contactName: string
  avatarKey: StoryAvatarKey
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

export interface StoryGuideSnapshot {
  conversationId: string
  currentGuide: string
  globalGuide: string
  dialogueSummary: string
  updatedAt: number
}

export interface StoryRuntimeState {
  activeConversationId: string
  order: string[]
  notes: string
  clues: string[]
  currentContactName: string
  currentAvatarKey: StoryAvatarKey
  currentGuide: string
  globalGuide: string
  dialogueSummary: string
  guideHistory: StoryGuideSnapshot[]
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
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocalJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

function purgeLegacyStoryLocalStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of [ECHO_STORY_RUNTIME_KEY, ...LEGACY_STORY_RUNTIME_KEYS, GALLERY_PROGRESS_KEY]) {
    window.localStorage.removeItem(key)
  }

  const characters = readLocalJSON<Record<string, ICharacter>>(STORAGE_KEYS.CHARACTERS, {})
  for (const [id, character] of Object.entries(characters)) {
    if (id === ECHO_STORY_CHARACTER_ID || character.sourceType === 'builtin-story') {
      delete characters[id]
    }
  }
  writeLocalJSON(STORAGE_KEYS.CHARACTERS, characters)

  const removedSessionIds: string[] = []
  const sessions = readLocalJSON<Record<string, IChatSession>>(STORAGE_KEYS.SESSIONS, {})
  for (const [id, session] of Object.entries(sessions)) {
    if (session.characterId === ECHO_STORY_CHARACTER_ID) {
      removedSessionIds.push(id)
      delete sessions[id]
    }
  }
  writeLocalJSON(STORAGE_KEYS.SESSIONS, sessions)
  for (const sessionId of removedSessionIds) {
    window.localStorage.removeItem(`${STORAGE_KEYS.MESSAGES}_${sessionId}`)
  }

  const posts = readLocalJSON<Array<{ id?: string; characterId?: string }>>(MOMENTS_POSTS_KEY, [])
  writeLocalJSON(
    MOMENTS_POSTS_KEY,
    posts.filter(post => post.characterId !== ECHO_STORY_CHARACTER_ID && !String(post.id || '').startsWith('echo-story-')),
  )

  const schedule = readLocalJSON<Record<string, number>>(MOMENTS_SCHEDULE_KEY, {})
  delete schedule[ECHO_STORY_CHARACTER_ID]
  writeLocalJSON(MOMENTS_SCHEDULE_KEY, schedule)

  const requests = readLocalJSON<Array<{ characterId?: string }>>(FRIEND_REQUESTS_KEY, [])
  writeLocalJSON(
    FRIEND_REQUESTS_KEY,
    requests.filter(request => request.characterId !== ECHO_STORY_CHARACTER_ID),
  )
}

export async function purgeStoryRuntimeContent(): Promise<void> {
  purgeLegacyStoryLocalStorage()

  const storage = getStorageDriver()
  const sessions = await storage.getSessionsByCharacter(ECHO_STORY_CHARACTER_ID)
  await Promise.all(sessions.map(session => storage.deleteSession(session.id).catch(() => undefined)))
  await storage.deleteCharacter(ECHO_STORY_CHARACTER_ID).catch(() => undefined)
}

export function saveStoryRuntimeState(state: StoryRuntimeState): void {
  writeLocalJSON(ECHO_STORY_RUNTIME_KEY, state)
}

export function resolveStoryAvatar(_key: StoryAvatarKey | null | undefined): string {
  return defaultAvatar
}

export function applyConversationPresentation(
  runtimeState: StoryRuntimeState,
  conversation: Pick<StoryConversationDefinition, 'contactName' | 'avatarKey'>,
): StoryRuntimeState {
  runtimeState.currentContactName = conversation.contactName || runtimeState.currentContactName || ''
  runtimeState.currentAvatarKey = conversation.avatarKey || runtimeState.currentAvatarKey || 'question'
  return runtimeState
}

function createDefaultConversationState(
  conversation: StoryConversationDefinition,
  sessionId: string | null,
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

function compactStoryText(value: string | null | undefined, maxLength = 96): string {
  const text = (value || '')
    .replace(/\[IMAGE:[^\]]+\]/g, '[图片]')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}

function normalizeGuideText(value: string): string {
  return compactStoryText(value, STORY_GUIDE_MAX_LENGTH).replace(/\s+/g, '')
}

function getConversationIndex(conversations: StoryConversationDefinition[], conversationId: string): number {
  return conversations.findIndex(conversation => conversation.id === conversationId)
}

function buildPromptBlock(title: string, lines: string[], maxLength = STORY_GUIDE_MAX_LENGTH): string {
  const text = [
    `【${title}】`,
    ...lines
      .map(line => compactStoryText(line, 160))
      .filter(Boolean)
      .map(line => `- ${line}`),
  ].join('\n')

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

export function buildStoryGlobalGuide(
  conversations: StoryConversationDefinition[],
  runtimeState: StoryRuntimeState,
  conversationId: string,
): string {
  const conversation = getConversationById(conversations, conversationId)
  if (!conversation) {
    return '当前暂无可用剧情。'
  }

  const index = getConversationIndex(conversations, conversationId)
  const progress = index >= 0 ? `${index + 1}/${conversations.length}` : ''
  const clueText = runtimeState.clues.length > 0
    ? runtimeState.clues.slice(-3).join('、')
    : ''

  return buildPromptBlock('全局剧情指引', [
    `主线进度：${progress || '未知'}；日期：${conversation.dayLabel || '当前日期'}。`,
    `当前片段：${conversation.title || conversation.shortLabel || '当前片段'}。`,
    `场景锚点：${conversation.sceneLabel || '未标注'}。`,
    clueText ? `已确认线索：${clueText}。` : '',
    '使用约束：只校准剧情方向，不替代角色台词，不改写已经发生的剧情。',
  ])
}

export function buildStoryCurrentGuide(
  conversations: StoryConversationDefinition[],
  runtimeState: StoryRuntimeState,
  conversationId: string,
): string {
  const conversation = getConversationById(conversations, conversationId)
  const state = conversation ? runtimeState.states[conversationId] : null

  if (!conversation || !state) {
    return buildPromptBlock('下一句剧情指引（非强制）', [
      '状态：当前暂无可用片段。',
      '使用约束：等待剧情数据恢复或重新进入片段后再推进。',
    ])
  }

  const segment = conversation.segments[state.segmentIndex]
  if (!segment) {
    const nextConversation = conversations[getConversationIndex(conversations, conversationId) + 1]
    return nextConversation
      ? buildPromptBlock('下一句剧情指引（非强制）', [
          '状态：当前片段已完成。',
          `下一步：进入「${nextConversation.title || nextConversation.shortLabel}」。`,
          '使用约束：先完成当前收束，再切换到下一片段。',
        ])
      : buildPromptBlock('下一句剧情指引（非强制）', [
          '状态：当前剧情已到达末尾。',
          '下一步：允许回溯、重开当前片段，或等待新剧情导入。',
        ])
  }

  if (segment.kind === 'choice') {
    const options = segment.options.map(option => compactStoryText(option.text, 42)).filter(Boolean)
    if (options.length > 0) {
      return buildPromptBlock('下一句剧情指引（非强制）', [
        '状态：等待用户选择分支。',
        `可选方向：${options.slice(0, 3).join(' / ')}。`,
        '使用约束：不要代替用户选择；只在用户询问时解释各分支含义。',
      ])
    }
    return buildPromptBlock('下一句剧情指引（非强制）', [
      `状态：${segment.prompt || '等待用户回应，保持当前剧情方向。'}`,
      '使用约束：让用户先行动，不强行推进。',
    ])
  }

  const nextMessage = segment.messages.slice(state.messageIndex).find(message => !message.hidden)
  if (nextMessage) {
    const speaker = nextMessage.role === 'me' ? '用户' : nextMessage.role === 'other' ? '对方' : '系统'
    return buildPromptBlock('下一句剧情指引（非强制）', [
      `推进方：${speaker}。`,
      `参考内容：${nextMessage.text}`,
      '使用约束：这是方向提示，不是必须照读的台词；优先保持剧情连续与情绪承接。',
    ])
  }

  return buildPromptBlock('下一句剧情指引（非强制）', [
    `状态：${segment.prompt || '当前片段即将进入下一处互动。'}`,
    '使用约束：承接当前片段，不跳到未知剧情。',
  ])
}

export function refreshStoryGuidance(
  runtimeState: StoryRuntimeState,
  conversations: StoryConversationDefinition[],
  conversationId: string,
): StoryRuntimeState {
  const currentGuide = buildStoryCurrentGuide(conversations, runtimeState, conversationId)
  const globalGuide = buildStoryGlobalGuide(conversations, runtimeState, conversationId)
  runtimeState.currentGuide = currentGuide
  runtimeState.globalGuide = globalGuide
  runtimeState.guideHistory = [
    ...(runtimeState.guideHistory || []),
    {
      conversationId,
      currentGuide,
      globalGuide,
      dialogueSummary: runtimeState.dialogueSummary || '',
      updatedAt: Date.now(),
    },
  ].slice(-16)
  return runtimeState
}

export function verifyStoryGuidance(
  runtimeState: StoryRuntimeState,
  conversations: StoryConversationDefinition[],
  conversationId: string,
): { correct: boolean; currentGuide: string; globalGuide: string; previousCurrentGuide: string; previousGlobalGuide: string } {
  const previousCurrentGuide = runtimeState.currentGuide || ''
  const previousGlobalGuide = runtimeState.globalGuide || ''
  const currentGuide = buildStoryCurrentGuide(conversations, runtimeState, conversationId)
  const globalGuide = buildStoryGlobalGuide(conversations, runtimeState, conversationId)
  const correct =
    normalizeGuideText(previousCurrentGuide) === normalizeGuideText(currentGuide) &&
    normalizeGuideText(previousGlobalGuide) === normalizeGuideText(globalGuide)

  if (!correct) {
    runtimeState.currentGuide = currentGuide
    runtimeState.globalGuide = globalGuide
  }

  return { correct, currentGuide, globalGuide, previousCurrentGuide, previousGlobalGuide }
}

export function isStoryQuestioningInput(text: string): boolean {
  return /(不对|错了|走错|选错|剧情不对|你记错|是不是错|没有走错|正确吗|对吗|该往哪|下一步)/.test(text.replace(/\s+/g, ''))
}

export function buildStoryQuestioningReply(check: ReturnType<typeof verifyStoryGuidance>): string {
  if (check.correct) {
    return [
      '我先核对了当前剧情指引和全局剧情指引。',
      '结论：没有走错，当前走向是正确的。',
      `当前指引：${check.currentGuide}`,
      `全局进度：${check.globalGuide}`,
      '可以继续按这个方向推进；指引只做校准，不会强制替你选择。',
    ].join('\n')
  }

  return [
    '我先核对了当前剧情指引和全局剧情指引。',
    '结论：刚才的指引有偏差，已按当前实际进度回退并重新校正。',
    `校正后指引：${check.currentGuide}`,
    `全局进度：${check.globalGuide}`,
    '接下来会以校正后的指引继续，不会沿着错误分支推进。',
  ].join('\n')
}

export function compressStoryDialogueMessages(messages: Array<Pick<IMessage, 'role' | 'content'>>): string {
  const visible = messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .slice(-24)

  if (visible.length === 0) {
    return ''
  }

  const omitted = Math.max(0, messages.length - visible.length)
  const lines = visible.map(message => {
    const speaker = message.role === 'user' ? '用户' : '对方'
    return `- ${speaker}：${compactStoryText(message.content, 88)}`
  })

  const summary = [
    '【剧情对话压缩】',
    omitted > 0 ? `- 折叠范围：较早 ${omitted} 条消息已压缩。` : '- 折叠范围：仅保留当前窗口内消息。',
    '- 保留重点：用户选择、承诺、线索、情绪转折、关系变化。',
    '- 最近对话：',
    ...lines,
  ].join('\n')

  return summary.length <= STORY_SUMMARY_MAX_LENGTH
    ? summary
    : `${summary.slice(0, STORY_SUMMARY_MAX_LENGTH)}...`
}

export async function refreshStoryDialogueCompression(
  runtimeState: StoryRuntimeState,
  conversationId: string,
): Promise<StoryRuntimeState> {
  const sessionId = runtimeState.states[conversationId]?.sessionId
  if (!sessionId) {
    runtimeState.dialogueSummary = ''
    return runtimeState
  }

  const messages = await getConversationMessages(sessionId)
  runtimeState.dialogueSummary = compressStoryDialogueMessages(messages)
  return runtimeState
}

export function loadStoryLibrary(): StoryLibrary {
  void purgeStoryRuntimeContent()

  const conversations: StoryConversationDefinition[] = STORY_CONVERSATIONS.map(
    (conv: StoryConversation): StoryConversationDefinition => ({
      id: conv.id,
      title: conv.title,
      dayLabel: conv.dayLabel,
      sceneLabel: conv.sceneLabel,
      shortLabel: conv.shortLabel,
      contactName: conv.contactName || STORY_CHARACTER_NAME,
      avatarKey: conv.avatarKey,
      segments: conv.segments as DialogueSegment[],
      defaultGameTime: '--:--',
      avatar: defaultAvatar,
      musicUrl: '',
      musicRate: 1,
    }),
  )

  return {
    storyName: ECHO_STORY_NAME,
    characterName: STORY_CHARACTER_NAME,
    conversations,
  }
}

export function loadStoryRuntimeState(conversations: StoryConversationDefinition[]): StoryRuntimeState {
  purgeLegacyStoryLocalStorage()

  const states: Record<string, StoryConversationState> = {}
  for (const conversation of conversations) {
    states[conversation.id] = createDefaultConversationState(conversation, null)
  }

  return {
    activeConversationId: conversations[0]?.id || '',
    order: conversations.map(conversation => conversation.id),
    notes: '',
    clues: [],
    currentContactName: conversations[0]?.contactName || '',
    currentAvatarKey: conversations[0]?.avatarKey || 'question',
    currentGuide: '',
    globalGuide: '',
    dialogueSummary: '',
    guideHistory: [],
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
  return [...new Set(conversations.map(conversation => conversation.dayLabel))]
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
  if (state) {
    state.unreadCount = 0
    state.lastUpdatedAt = Date.now()
  }
  return runtimeState
}

export function addStoryClue(runtimeState: StoryRuntimeState, clue: string): StoryRuntimeState {
  const normalized = clue.trim()
  if (normalized && !runtimeState.clues.includes(normalized)) {
    runtimeState.clues = [...runtimeState.clues, normalized]
  }
  return runtimeState
}

export function removeStoryClue(runtimeState: StoryRuntimeState, clue: string): StoryRuntimeState {
  runtimeState.clues = runtimeState.clues.filter(item => item !== clue)
  return runtimeState
}

export async function ensureStoryCharacter(characterName: string): Promise<ICharacter> {
  await purgeStoryRuntimeContent()

  const timestamp = Date.now()
  return {
    id: ECHO_STORY_CHARACTER_ID,
    name: characterName || '',
    avatar: defaultAvatar,
    background: '',
    description: '',
    greeting: '',
    settings: '',
    isFavorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    mode: 'free-dialogue',
    category: '',
    subCategory: '',
    avatarTone: 'default',
    backgroundImage: '',
    personality: '',
    behavior: '',
    values: '',
    members: [],
    tags: [],
    sourceType: 'builtin-story',
    sourceName: ECHO_STORY_NAME,
  }
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
  return getStorageDriver().getMessages(sessionId)
}

let lastMessageTimestamp = Date.now()

function nextMessageTimestamp(): number {
  const current = Date.now()
  lastMessageTimestamp = Math.max(current, lastMessageTimestamp + 1)
  return lastMessageTimestamp
}

async function syncConversationSessionMeta(sessionId: string, timestamp: number): Promise<void> {
  const storage = getStorageDriver()
  const session = await storage.getSession(sessionId)
  if (!session) {
    return
  }

  const messages = await storage.getMessages(sessionId)
  session.messageCount = messages.length
  session.updatedAt = Math.max(session.updatedAt || 0, timestamp || 0)
  await storage.saveSession(session)
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
  await syncConversationSessionMeta(sessionId, message.timestamp)
  return message
}

export async function clearConversationMessages(sessionId: string | null): Promise<void> {
  if (!sessionId) {
    return
  }
  const storage = getStorageDriver()
  await storage.deleteMessages(sessionId)
  await syncConversationSessionMeta(sessionId, Date.now())
}

export function applySystemEffects(
  runtimeState: StoryRuntimeState,
  _conversationId: string,
  _message: Pick<DialogueMessage, 'role' | 'text'>,
): StoryRuntimeState {
  return runtimeState
}
