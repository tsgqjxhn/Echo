import type { ICharacter } from '@/types/character'

const PROFILE_STORE_KEY = 'echo_character_profile_json_v1'
const SUMMARY_STORE_KEY = 'echo_character_ai_summary_v1'
const MAX_SUMMARY_LENGTH = 1800

export interface CharacterProfileJSON {
  schemaVersion: 1
  characterId: string
  name: string
  avatar: string | null
  background: string | null
  backgroundMusic: string[]
  videos: string[]
  gameFiles: string[]
  gifs: string[]
  images: string[]
  settings: string
  description: string
  greeting: string | null
  alt_greetings?: string[]
  group_only_greetings?: string[]
  personality: string | null
  behavior: string | null
  values: string | null
  scenario: string | null
  category: string | null
  subCategory: string | null
  tags: string[]
  sourceType: string | null
  sourceName: string | null
  updatedAt: number
  rawCharacter: ICharacter
}

function readRecord<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function writeRecord<T>(key: string, value: Record<string, T>): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function compactText(value: string | undefined | null, maxLength = 360): string {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

function uniq(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map(value => (value || '').trim())
        .filter(Boolean)
    )
  )
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniq(value.map(item => String(item || '')))
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

export function buildCharacterProfileJSON(character: ICharacter): CharacterProfileJSON {
  const dynamicFields = character as ICharacter & {
    backgroundMusic?: string | string[]
    music?: string | string[]
    gameFiles?: string | string[]
    images?: string | string[]
    gifs?: string | string[]
    videos?: string | string[]
  }

  const emotionAnimationUrls = (character.emotionAnimations || []).map(item => item.animationUrl)
  const gifs = uniq([
    character.switchAnimation,
    ...emotionAnimationUrls.filter(url => /\.(gif|webp)(?:\?|$)/i.test(url || '')),
    ...getStringArray(dynamicFields.gifs),
  ])

  const images = uniq([
    character.avatar,
    character.backgroundImage,
    character.globalBackground,
    ...emotionAnimationUrls.filter(url => !/\.(gif|webp)(?:\?|$)/i.test(url || '')),
    ...getStringArray(dynamicFields.images),
  ])

  const videos = uniq([
    character.globalVideoBackground,
    character.multimedia?.video?.globalBackgroundVideo,
    character.multimedia?.video?.idleVideo,
    character.multimedia?.video?.introVideo,
    ...getStringArray(dynamicFields.videos),
  ])

  const gameFiles = uniq([
    character.gameData ? 'gameData' : '',
    ...getStringArray(dynamicFields.gameFiles),
  ])

  return {
    schemaVersion: 1,
    characterId: character.id,
    name: character.name,
    avatar: character.avatar || null,
    background: character.background || character.backgroundImage || null,
    backgroundMusic: uniq([
      ...getStringArray(dynamicFields.backgroundMusic),
      ...getStringArray(dynamicFields.music),
    ]),
    videos,
    gameFiles,
    gifs,
    images,
    settings: character.settings || '',
    description: character.description || '',
    greeting: character.greeting || null,
    alt_greetings: character.alternateGreetings?.length ? character.alternateGreetings : undefined,
    group_only_greetings: character.groupOnlyGreetings?.length ? character.groupOnlyGreetings : undefined,
    personality: character.personality || null,
    behavior: character.behavior || null,
    values: character.values || null,
    scenario: character.scenario || null,
    category: character.category || null,
    subCategory: character.subCategory || null,
    tags: character.tags || [],
    sourceType: character.sourceType || null,
    sourceName: character.sourceName || null,
    updatedAt: character.updatedAt || Date.now(),
    rawCharacter: character,
  }
}

export function buildCharacterAISummary(profile: CharacterProfileJSON): string {
  const lines = [
    `姓名：${profile.name}`,
    profile.category || profile.subCategory
      ? `分类：${[profile.category, profile.subCategory].filter(Boolean).join(' / ')}`
      : '',
    profile.description ? `简介：${compactText(profile.description, 260)}` : '',
    profile.personality ? `性格：${compactText(profile.personality, 180)}` : '',
    profile.behavior ? `行为模式：${compactText(profile.behavior, 180)}` : '',
    profile.values ? `价值观：${compactText(profile.values, 180)}` : '',
    profile.scenario ? `场景：${compactText(profile.scenario, 220)}` : '',
    profile.settings ? `设定：${compactText(profile.settings, 520)}` : '',
    profile.greeting ? `开场白：${compactText(profile.greeting, 160)}` : '',
    profile.tags.length > 0 ? `标签：${profile.tags.join('、')}` : '',
    profile.images.length > 0 ? `图片素材：${profile.images.slice(0, 6).join(' | ')}` : '',
    profile.gifs.length > 0 ? `动图素材：${profile.gifs.slice(0, 6).join(' | ')}` : '',
    profile.videos.length > 0 ? `视频素材：${profile.videos.slice(0, 4).join(' | ')}` : '',
    profile.backgroundMusic.length > 0 ? `背景音乐：${profile.backgroundMusic.slice(0, 4).join(' | ')}` : '',
    profile.gameFiles.length > 0 || profile.rawCharacter.gameData
      ? `游戏资料：${compactText(profile.rawCharacter.gameData || profile.gameFiles.join(' | '), 260)}`
      : '',
    profile.sourceType || profile.sourceName
      ? `来源：${[profile.sourceType, profile.sourceName].filter(Boolean).join(' / ')}`
      : '',
  ].filter(Boolean)

  const summary = lines.join('\n')
  return summary.length > MAX_SUMMARY_LENGTH ? summary.slice(0, MAX_SUMMARY_LENGTH) : summary
}

export function saveCharacterProfileJSON(character: ICharacter): CharacterProfileJSON {
  const profile = buildCharacterProfileJSON(character)
  const profiles = readRecord<CharacterProfileJSON>(PROFILE_STORE_KEY)
  const summaries = readRecord<string>(SUMMARY_STORE_KEY)

  profiles[character.id] = profile
  summaries[character.id] = buildCharacterAISummary(profile)

  writeRecord(PROFILE_STORE_KEY, profiles)
  writeRecord(SUMMARY_STORE_KEY, summaries)
  return profile
}

export function getCharacterProfileJSON(characterId: string): CharacterProfileJSON | null {
  return readRecord<CharacterProfileJSON>(PROFILE_STORE_KEY)[characterId] || null
}

export function getCharacterAISummary(character: ICharacter): string {
  const summaries = readRecord<string>(SUMMARY_STORE_KEY)
  const cached = summaries[character.id]
  const cachedProfile = getCharacterProfileJSON(character.id)

  if (cached && cachedProfile?.updatedAt === character.updatedAt) {
    return cached
  }

  return buildCharacterAISummary(saveCharacterProfileJSON(character))
}

export function deleteCharacterProfileJSON(characterId: string): void {
  const profiles = readRecord<CharacterProfileJSON>(PROFILE_STORE_KEY)
  const summaries = readRecord<string>(SUMMARY_STORE_KEY)
  delete profiles[characterId]
  delete summaries[characterId]
  writeRecord(PROFILE_STORE_KEY, profiles)
  writeRecord(SUMMARY_STORE_KEY, summaries)
}
