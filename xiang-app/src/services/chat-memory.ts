import type { StorageDriver } from './storage'
import type { IMessage } from '@/types/chat'
import { MessageType } from '@/types/chat'

const MEMORY_KEY_PREFIX = 'chat_memory::'
const MAX_FACTS = 8
const MAX_PREFERENCES = 8
const MAX_EVENTS = 10

export interface CharacterMemoryProfile {
  characterId: string
  characterName: string
  summary: string
  relationshipStage: '初识' | '熟悉' | '亲近'
  userFacts: string[]
  userPreferences: string[]
  keyEvents: string[]
  exchangeCount: number
  lastUpdatedAt: number
}

function getMemoryKey(characterId: string): string {
  return `${MEMORY_KEY_PREFIX}${characterId}`
}

function clampList(values: string[], max: number): string[] {
  return values
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, source) => source.indexOf(item) === index)
    .slice(-max)
}

function inferRelationshipStage(exchangeCount: number): CharacterMemoryProfile['relationshipStage'] {
  if (exchangeCount >= 10) {
    return '亲近'
  }

  if (exchangeCount >= 4) {
    return '熟悉'
  }

  return '初识'
}

function normalizeMessageText(message: IMessage): string {
  if (message.contentType === MessageType.TEXT) {
    return message.content.trim()
  }

  if (message.contentType === MessageType.AUDIO) {
    try {
      const parsed = JSON.parse(message.content) as { text?: string }
      return (parsed.text || '').trim()
    } catch {
      return ''
    }
  }

  if (message.contentType === MessageType.IMAGE) {
    try {
      const parsed = JSON.parse(message.content) as { description?: string }
      return parsed.description?.trim() || ''
    } catch {
      return ''
    }
  }

  return ''
}

function extractMatches(text: string, patterns: RegExp[]): string[] {
  const results: string[] = []

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      results.push(match[1].trim())
    }
  }

  return results
}

function extractUserFacts(text: string): string[] {
  return extractMatches(text, [
    /(?:我叫|叫我)([^，。！？\n]{1,12})/,
    /(?:我是|我现在是)([^，。！？\n]{1,18})/,
    /(?:我在|我住在)([^，。！？\n]{1,18})/,
    /(?:我的工作是|我做)([^，。！？\n]{1,18})/,
  ]).map(item => `用户提到：${item}`)
}

function extractUserPreferences(text: string): string[] {
  const positives = extractMatches(text, [
    /(?:我喜欢|我更喜欢)([^，。！？\n]{1,18})/,
    /(?:我想要|我想)([^，。！？\n]{1,18})/,
  ]).map(item => `偏好：${item}`)

  const negatives = extractMatches(text, [
    /(?:我不喜欢|我讨厌)([^，。！？\n]{1,18})/,
    /(?:别提|不要)([^，。！？\n]{1,18})/,
  ]).map(item => `避开：${item}`)

  return [...positives, ...negatives]
}

function buildSummary(profile: Omit<CharacterMemoryProfile, 'summary'>): string {
  const lines: string[] = [
    `当前关系阶段：${profile.relationshipStage}。`,
  ]

  if (profile.userFacts.length > 0) {
    lines.push(`用户信息：${profile.userFacts.join('；')}。`)
  }

  if (profile.userPreferences.length > 0) {
    lines.push(`用户偏好：${profile.userPreferences.join('；')}。`)
  }

  if (profile.keyEvents.length > 0) {
    lines.push(`近期关键事件：${profile.keyEvents.slice(-4).join('；')}。`)
  }

  return lines.join('\n')
}

function createEmptyProfile(characterId: string, characterName: string): CharacterMemoryProfile {
  const base: Omit<CharacterMemoryProfile, 'summary'> = {
    characterId,
    characterName,
    relationshipStage: '初识',
    userFacts: [],
    userPreferences: [],
    keyEvents: [],
    exchangeCount: 0,
    lastUpdatedAt: 0,
  }

  return {
    ...base,
    summary: buildSummary(base),
  }
}

async function saveProfile(storage: StorageDriver, profile: CharacterMemoryProfile): Promise<void> {
  await storage.saveUserSetting(getMemoryKey(profile.characterId), JSON.stringify(profile))
}

export async function loadCharacterMemory(
  storage: StorageDriver,
  characterId: string,
  characterName = '角色'
): Promise<CharacterMemoryProfile> {
  const raw = await storage.getUserSetting(getMemoryKey(characterId))
  if (!raw) {
    return createEmptyProfile(characterId, characterName)
  }

  try {
    const parsed = JSON.parse(raw) as CharacterMemoryProfile
    return {
      ...createEmptyProfile(characterId, characterName),
      ...parsed,
      characterId,
      characterName: parsed.characterName || characterName,
    }
  } catch {
    return createEmptyProfile(characterId, characterName)
  }
}

export async function buildCharacterMemoryPrompt(
  storage: StorageDriver,
  characterId: string,
  characterName = '角色'
): Promise<string> {
  const profile = await loadCharacterMemory(storage, characterId, characterName)
  if (!profile.summary.trim()) {
    return ''
  }

  return [
    '你有一份长期记忆，请在回复时保持连续性，但不要生硬复读：',
    profile.summary,
  ].join('\n')
}

export async function updateCharacterMemoryFromMessage(
  storage: StorageDriver,
  sessionId: string,
  message: IMessage
): Promise<void> {
  const session = await storage.getSession(sessionId)
  if (!session) {
    return
  }

  const character = await storage.getCharacter(session.characterId)
  const text = normalizeMessageText(message)
  if (!text) {
    return
  }

  const profile = await loadCharacterMemory(storage, session.characterId, character?.name || '角色')
  const nextFacts = [...profile.userFacts]
  const nextPreferences = [...profile.userPreferences]
  const nextEvents = [...profile.keyEvents]
  let nextExchangeCount = profile.exchangeCount

  if (message.role === 'user') {
    nextFacts.push(...extractUserFacts(text))
    nextPreferences.push(...extractUserPreferences(text))
    nextEvents.push(`用户：${text.slice(0, 36)}`)
    nextExchangeCount += 1
  } else {
    nextEvents.push(`${character?.name || '角色'}：${text.slice(0, 36)}`)
  }

  const nextProfileBase: Omit<CharacterMemoryProfile, 'summary'> = {
    characterId: profile.characterId,
    characterName: character?.name || profile.characterName,
    relationshipStage: inferRelationshipStage(nextExchangeCount),
    userFacts: clampList(nextFacts, MAX_FACTS),
    userPreferences: clampList(nextPreferences, MAX_PREFERENCES),
    keyEvents: clampList(nextEvents, MAX_EVENTS),
    exchangeCount: nextExchangeCount,
    lastUpdatedAt: Date.now(),
  }

  await saveProfile(storage, {
    ...nextProfileBase,
    summary: buildSummary(nextProfileBase),
  })
}

export async function rebuildCharacterMemoryFromSession(
  storage: StorageDriver,
  sessionId: string
): Promise<CharacterMemoryProfile | null> {
  const session = await storage.getSession(sessionId)
  if (!session) {
    return null
  }

  const character = await storage.getCharacter(session.characterId)
  let profile = createEmptyProfile(session.characterId, character?.name || '角色')
  const messages = await storage.getMessages(sessionId)

  for (const message of messages) {
    const text = normalizeMessageText(message)
    if (!text) {
      continue
    }

    if (message.role === 'user') {
      profile.userFacts = clampList([...profile.userFacts, ...extractUserFacts(text)], MAX_FACTS)
      profile.userPreferences = clampList([...profile.userPreferences, ...extractUserPreferences(text)], MAX_PREFERENCES)
      profile.keyEvents = clampList([...profile.keyEvents, `用户：${text.slice(0, 36)}`], MAX_EVENTS)
      profile.exchangeCount += 1
    } else {
      profile.keyEvents = clampList([...profile.keyEvents, `${profile.characterName}：${text.slice(0, 36)}`], MAX_EVENTS)
    }
  }

  profile.relationshipStage = inferRelationshipStage(profile.exchangeCount)
  profile.lastUpdatedAt = Date.now()
  profile.summary = buildSummary(profile)
  await saveProfile(storage, profile)
  return profile
}
