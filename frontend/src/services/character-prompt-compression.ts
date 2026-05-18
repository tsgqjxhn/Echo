import type { GroupMember, ICharacter, LorebookEntry } from '@/types/character'
import type { WorldBookEntry } from '@/types/world-book'
import { storageDriver } from './storage'
import {
  compressCharacterWithLLM,
  shouldUseLLMCompression,
  type CompressionLevel,
  type LLMCompressedCharacter,
  type LLMCompressionOptions,
} from './character-llm-compression'
import { estimateTokens } from './token-counter'

const STORE_KEY = 'echo_character_prompt_compression_v1'
const SCHEMA_VERSION = 1

// ========== 压缩参数调优 (A1) ==========
// 调优原则：在"信息保留 vs Token 节省"间寻找平衡点
// name: 保持不变 - 名字本身就短
// description: 收紧约15% - 去除冗余形容词，保留核心身份
// personality: 收紧约25% - 鼓励用关键词替代长句
// scenario: 收紧约30% - 非核心设定，保留场景核心即可
// greeting: 收紧约15% - 保留语气风格
// settings: 谨慎调整，减少约10% - 核心设定不宜过度压缩
// behavior/values: 收紧约20% - 边界和价值观通常较精炼

const MAXLEN_CATEGORY = 40          // 分类 - 保持不变，通常很短
const MAXLEN_ANCHOR = 120           // 身份锚点 - 从140减少14%，保留核心身份描述
const MAXLEN_VOICE = 120            // 语言习惯 - 从140减少14%，保留口吻关键词
const MAXLEN_DESCRIPTION = 180      // 角色简介 - 从220减少18%，去除冗余形容词
const MAXLEN_SETTINGS = 380         // 核心设定 - 从420减少9.5%，核心设定谨慎压缩
const MAXLEN_SCENARIO = 150         // 当前场景 - 从220减少32%，非核心设定
const MAXLEN_PERSONALITY = 100      // 性格 - 从140减少29%，鼓励用逗号分隔关键词
const MAXLEN_BEHAVIOR = 110         // 行为边界 - 从140减少21%，边界通常较精炼
const MAXLEN_VALUES = 110           // 价值观 - 从140减少21%，价值观通常较精炼
const MAXLEN_GREETING = 100         // 开场口吻 - 从120减少17%，保留语气风格
const MAXLEN_ALT_GREETING = 70      // 备选开场 - 从80减少12.5%
const MAXLEN_DEPTH_PROMPT = 150     // 深度提示 - 从180减少17%
const MAXLEN_GAME_DATA = 150        // 游戏资料 - 从180减少17%
const MAXLEN_GAME_DATA_SOURCE = 1000 // getPromptSource 中 gameData - 从1200减少17%

// 群成员相关 maxLength
const MAXLEN_MEMBER_DESC = 90       // 成员描述 - 从110减少18%
const MAXLEN_MEMBER_ANCHOR = 80     // 成员身份 - 从100减少20%
const MAXLEN_MEMBER_VOICE = 80      // 成员口吻 - 从100减少20%
const MAXLEN_MEMBER_PERSONALITY = 80 // 成员性格 - 从100减少20%
const MAXLEN_MEMBER_SCENARIO = 80   // 成员场景 - 从100减少20%
const MAXLEN_MEMBER_SETTINGS = 120  // 成员设定 - 从150减少20%
const MAXLEN_MEMBER_DEPTH = 80      // 成员深度提示 - 从100减少20%

// 世界知识相关 maxLength
const MAXLEN_LORE_CONTENT = 100     // 知识条目内容 - 从120减少17%
const MAXLEN_BOOK_NAME = 25         // 世界书书名 - 从30减少17%

// 多媒体相关 maxLength
const MAXLEN_VOICE_INFO = 70        // 语音信息 - 从80减少12.5%

export interface CompressedCharacterPrompts {
  schemaVersion: 1
  characterId: string
  characterName: string
  fingerprint: string
  sourceUpdatedAt: number
  compressedAt: number
  sourceChars: number
  compressedChars: number
  rolePrompt: string
  npcPrompt: string
  worldPrompt: string
  mediaPrompt: string
}

type PromptCache = Record<string, CompressedCharacterPrompts>

function normalizeText(value: string | undefined | null): string {
  return (value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\[[^\]]{1,120}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: string | undefined | null, maxLength: number): string {
  const text = normalizeText(value)
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

function pushLine(lines: string[], label: string, value: string | undefined | null, maxLength: number): void {
  const text = compactText(value, maxLength)
  if (text) {
    lines.push(`${label}：${text}`)
  }
}

function uniq(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map(value => normalizeText(value)).filter(Boolean)))
}

function readCache(raw: string | null): PromptCache {
  if (!raw) return {}

  try {
    return JSON.parse(raw) as PromptCache
  } catch {
    return {}
  }
}

async function loadCache(): Promise<PromptCache> {
  return readCache(await storageDriver.getUserSetting(STORE_KEY))
}

async function saveCache(cache: PromptCache): Promise<void> {
  await storageDriver.saveUserSetting(STORE_KEY, JSON.stringify(cache))
}

function stableHash(source: string): string {
  let hash = 2166136261
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return (hash >>> 0).toString(36)
}

function getPromptSource(character: ICharacter): string {
  const source = {
    id: character.id,
    name: character.name,
    updatedAt: character.updatedAt || 0,
    description: character.description,
    settings: character.settings,
    personality: character.personality,
    behavior: character.behavior,
    values: character.values,
    persona: character.persona,
    scenario: character.scenario,
    greeting: character.greeting,
    alternateGreetings: character.alternateGreetings,
    groupOnlyGreetings: character.groupOnlyGreetings,
    structuredMembers: character.structuredMembers,
    lorebook: character.lorebook,
    worldBooks: character.worldBooks,
    depthPrompt: character.depthPrompt,
    gameData: compactText(character.gameData, MAXLEN_GAME_DATA_SOURCE),
    tags: character.tags,
    category: character.category,
    subCategory: character.subCategory,
  }

  return JSON.stringify(source)
}

function buildRolePrompt(character: ICharacter): string {
  const extendedCharacter = character as ICharacter & { speakingStyle?: string }
  const lines = [
    `姓名：${character.name || '未命名角色'}`,
  ]

  const category = [character.category, character.subCategory].map(value => compactText(value, MAXLEN_CATEGORY)).filter(Boolean).join(' / ')
  if (category) lines.push(`分类：${category}`)
  if (character.tags?.length) lines.push(`标签：${character.tags.slice(0, 8).join('、')}`)

  pushLine(lines, '身份锚点', character.persona?.anchor, MAXLEN_ANCHOR)
  if (character.persona?.traits?.length) lines.push(`核心特质：${character.persona.traits.slice(0, 5).join('、')}`)
  pushLine(lines, '语言习惯', character.persona?.voice || extendedCharacter.speakingStyle, MAXLEN_VOICE)
  pushLine(lines, '角色简介', character.description, MAXLEN_DESCRIPTION)
  pushLine(lines, '核心设定', character.settings, MAXLEN_SETTINGS)
  pushLine(lines, '当前场景', character.scenario, MAXLEN_SCENARIO)
  pushLine(lines, '性格', character.personality, MAXLEN_PERSONALITY)
  pushLine(lines, '行为边界', character.behavior, MAXLEN_BEHAVIOR)
  pushLine(lines, '价值观', character.values, MAXLEN_VALUES)
  pushLine(lines, '开场口吻', character.greeting, MAXLEN_GREETING)
  if (character.alternateGreetings?.length) {
    lines.push(`备选开场：${character.alternateGreetings.slice(0, 2).map(item => compactText(item, MAXLEN_ALT_GREETING)).join(' / ')}`)
  }
  pushLine(lines, '深度提示', character.depthPrompt?.prompt, MAXLEN_DEPTH_PROMPT)
  pushLine(lines, '游戏资料', character.gameData, MAXLEN_GAME_DATA)

  return `【压缩角色 Prompt】\n${lines.map(line => `- ${line}`).join('\n')}\n- 使用方式：这是快速模式下的长期缓存，只保留会影响回复的人设、关系、口吻、边界和场景。`
}

function buildMemberLine(member: GroupMember): string {
  const lines = [`成员：${member.name || '未命名成员'}`]
  if (member.isNarrator) lines.push('类型：旁白')
  pushLine(lines, '描述', member.description, MAXLEN_MEMBER_DESC)
  pushLine(lines, '身份', member.persona?.anchor, MAXLEN_MEMBER_ANCHOR)
  if (member.persona?.traits?.length) lines.push(`特质：${member.persona.traits.slice(0, 4).join('、')}`)
  pushLine(lines, '口吻', member.persona?.voice || member.speakingStyle, MAXLEN_MEMBER_VOICE)
  pushLine(lines, '性格', member.personality, MAXLEN_MEMBER_PERSONALITY)
  pushLine(lines, '场景', member.scenario, MAXLEN_MEMBER_SCENARIO)
  pushLine(lines, '设定', member.settings, MAXLEN_MEMBER_SETTINGS)
  pushLine(lines, '深度提示', member.depthPrompt?.prompt, MAXLEN_MEMBER_DEPTH)
  return lines.join('；')
}

function buildNpcPrompt(character: ICharacter): string {
  const members = character.structuredMembers || []
  if (members.length === 0) {
    return ''
  }

  const memberLines = members.slice(0, 16).map(buildMemberLine)
  return [
    '【压缩 NPC / 群成员 Prompt】',
    '- 使用方式：只用于区分发言身份、口吻、关系张力和当前立场；不要复述成员表。',
    ...memberLines.map(line => `- ${line}`),
  ].join('\n')
}

function formatLoreEntry(entry: LorebookEntry | WorldBookEntry): string {
  const keywords = entry.keywords?.slice(0, 4).join('、') || '无关键词'
  return `关键词=${keywords}；内容=${compactText(entry.content, MAXLEN_LORE_CONTENT)}`
}

function buildWorldPrompt(character: ICharacter): string {
  const lines: string[] = []

  const loreEntries = (character.lorebook?.entries || [])
    .filter(entry => entry.enabled !== false)
    .sort((a, b) => (b.order || 0) - (a.order || 0))
    .slice(0, 8)
  if (loreEntries.length) {
    lines.push('角色知识：')
    lines.push(...loreEntries.map(entry => `- ${formatLoreEntry(entry)}`))
  }

  const worldBookEntries = (character.worldBooks || [])
    .flatMap(book => (book.entries || []).map(entry => ({ bookName: book.name, entry })))
    .filter(item => item.entry.enabled !== false)
    .sort((a, b) => (b.entry.order || 0) - (a.entry.order || 0))
    .slice(0, 10)

  if (worldBookEntries.length) {
    lines.push('世界书：')
    lines.push(...worldBookEntries.map(({ bookName, entry }) => `- ${compactText(bookName, MAXLEN_BOOK_NAME)}：${formatLoreEntry(entry)}`))
  }

  return lines.length
    ? `【压缩世界知识 Prompt】\n${lines.join('\n')}\n- 使用方式：仅在用户话题命中时自然引用，不主动倾倒设定。`
    : ''
}

function buildMediaPrompt(character: ICharacter): string {
  const voice = character.multimedia?.voice
  const images = uniq([
    character.avatar,
    character.coverImage,
    character.backgroundImage,
    character.globalBackground,
    character.multimedia?.image?.avatar,
    character.multimedia?.image?.coverImage,
    ...(character.emotionAnimations || []).map(item => item.emotion),
    ...(character.multimedia?.image?.emotionImages || []).map(item => item.emotion),
  ])
  const videos = uniq([
    character.globalVideoBackground,
    character.multimedia?.video?.globalBackgroundVideo,
    character.multimedia?.video?.idleVideo,
    character.multimedia?.video?.introVideo,
    ...(character.multimedia?.video?.emotionVideos || []).map(item => item.emotion),
  ])

  const lines: string[] = []
  if (voice?.enabled) {
    lines.push(`语音：${compactText(voice.emotionStyle || voice.voiceName || voice.voiceId || '已启用', MAXLEN_VOICE_INFO)}`)
  }
  if (images.length) lines.push(`视觉素材：${images.slice(0, 8).join('、')}`)
  if (videos.length) lines.push(`动态素材：${videos.slice(0, 6).join('、')}`)

  return lines.length
    ? `【压缩多媒体 Prompt】\n${lines.map(line => `- ${line}`).join('\n')}\n- 使用方式：只作为氛围和素材索引，不把路径当作聊天内容。`
    : ''
}

/**
 * 多级压缩管道选项
 */
export interface MultiStageCompressionOptions {
  /** 压缩级别：off(不压缩) | rule(仅规则) | llm(LLM精炼) | hybrid(混合模式) */
  level: CompressionLevel
  /** Token 预算（用于决定是否触发 LLM 精炼） */
  budgetTokens?: number
  /** LLM 压缩选项 */
  llmOptions?: Omit<LLMCompressionOptions, 'level'>
}

/**
 * 使用 LLM 压缩结果构建角色 Prompt
 */
function buildLLMCompressedRolePrompt(
  character: ICharacter,
  llmCompressed: LLMCompressedCharacter
): string {
  const lines = [
    `姓名：${character.name || '未命名角色'}`,
  ]

  const category = [character.category, character.subCategory]
    .map(value => compactText(value, MAXLEN_CATEGORY))
    .filter(Boolean)
    .join(' / ')
  if (category) lines.push(`分类：${category}`)
  if (character.tags?.length) lines.push(`标签：${character.tags.slice(0, 8).join('、')}`)

  pushLine(lines, '角色简介', llmCompressed.description, MAXLEN_DESCRIPTION)
  pushLine(lines, '核心设定', llmCompressed.settings, MAXLEN_SETTINGS)
  pushLine(lines, '当前场景', llmCompressed.scenario, MAXLEN_SCENARIO)
  pushLine(lines, '性格', llmCompressed.personality, MAXLEN_PERSONALITY)
  if (llmCompressed.behavior) pushLine(lines, '行为边界', llmCompressed.behavior, MAXLEN_BEHAVIOR)
  if (llmCompressed.values) pushLine(lines, '价值观', llmCompressed.values, MAXLEN_VALUES)
  pushLine(lines, '开场口吻', llmCompressed.greeting, MAXLEN_GREETING)
  if (character.alternateGreetings?.length) {
    lines.push(`备选开场：${character.alternateGreetings.slice(0, 2).map(item => compactText(item, MAXLEN_ALT_GREETING)).join(' / ')}`)
  }
  pushLine(lines, '深度提示', character.depthPrompt?.prompt, MAXLEN_DEPTH_PROMPT)
  pushLine(lines, '游戏资料', character.gameData, MAXLEN_GAME_DATA)

  return `【LLM 精炼角色 Prompt】\n${lines.map(line => `- ${line}`).join('\n')}\n- 使用方式：这是 LLM 精炼模式下的长期缓存，保留核心人设语义的同时大幅减少 Token。`
}

/**
 * 第 1 级：规则压缩（纯文本截断）
 * 快速减少到 ~1500 tokens，无额外成本
 */
function applyRuleCompression(character: ICharacter): CompressedCharacterPrompts {
  return buildCompressedCharacterPromptsInternal(character, 'rule')
}

/**
 * 第 2 级：LLM 语义精炼
 * 智能压缩到 ~800-1000 tokens，有 API 调用成本
 */
async function applyLLMCompression(
  character: ICharacter,
  llmOptions: Omit<LLMCompressionOptions, 'level'>
): Promise<CompressedCharacterPrompts> {
  // 先进行规则压缩作为基础
  const ruleCompressed = applyRuleCompression(character)

  try {
    // 调用 LLM 进行精炼
    const llmCompressed = await compressCharacterWithLLM(character, {
      ...llmOptions,
      level: 'llm',
    })

    // 使用 LLM 压缩结果重新构建 Prompt
    const source = getPromptSource(character)
    const rolePrompt = buildLLMCompressedRolePrompt(character, llmCompressed)
    const npcPrompt = buildNpcPrompt(character)
    const worldPrompt = buildWorldPrompt(character)
    const mediaPrompt = buildMediaPrompt(character)
    const compressedChars = [rolePrompt, npcPrompt, worldPrompt, mediaPrompt].filter(Boolean).join('\n\n').length

    return {
      schemaVersion: SCHEMA_VERSION,
      characterId: character.id,
      characterName: character.name,
      fingerprint: stableHash(source),
      sourceUpdatedAt: character.updatedAt || 0,
      compressedAt: Date.now(),
      sourceChars: source.length,
      compressedChars,
      rolePrompt,
      npcPrompt,
      worldPrompt,
      mediaPrompt,
    }
  } catch {
    // LLM 调用失败，降级到规则压缩结果
    return ruleCompressed
  }
}

/**
 * 内部构建函数，支持不同压缩模式标记
 */
function buildCompressedCharacterPromptsInternal(
  character: ICharacter,
  _compressionMode: 'rule' | 'llm' = 'rule'
): CompressedCharacterPrompts {
  const source = getPromptSource(character)
  const rolePrompt = buildRolePrompt(character)
  const npcPrompt = buildNpcPrompt(character)
  const worldPrompt = buildWorldPrompt(character)
  const mediaPrompt = buildMediaPrompt(character)
  const compressedChars = [rolePrompt, npcPrompt, worldPrompt, mediaPrompt].filter(Boolean).join('\n\n').length

  return {
    schemaVersion: SCHEMA_VERSION,
    characterId: character.id,
    characterName: character.name,
    fingerprint: stableHash(source),
    sourceUpdatedAt: character.updatedAt || 0,
    compressedAt: Date.now(),
    sourceChars: source.length,
    compressedChars,
    rolePrompt,
    npcPrompt,
    worldPrompt,
    mediaPrompt,
  }
}

export function buildCompressedCharacterPrompts(character: ICharacter): CompressedCharacterPrompts {
  return buildCompressedCharacterPromptsInternal(character, 'rule')
}

export async function getCompressedCharacterPrompts(character: ICharacter): Promise<CompressedCharacterPrompts | null> {
  const cache = await loadCache()
  const cached = cache[character.id]
  if (!cached || cached.schemaVersion !== SCHEMA_VERSION) {
    return null
  }

  const fingerprint = stableHash(getPromptSource(character))
  return cached.fingerprint === fingerprint ? cached : null
}

/**
 * 多级压缩管道主入口
 *
 * 压缩策略：
 * - off: 不压缩，返回 null
 * - rule: 仅规则截断（快速，无成本）
 * - llm: 直接使用 LLM 精炼（高质量，有成本）
 * - hybrid: 混合模式 - 先用规则压缩，超过阈值再用 LLM 精炼（平衡）
 */
export async function ensureCompressedCharacterPrompts(
  character: ICharacter,
  options: boolean | MultiStageCompressionOptions,
): Promise<CompressedCharacterPrompts | null> {
  // 向后兼容：布尔参数
  if (typeof options === 'boolean') {
    if (!options) return null
    options = { level: 'rule' }
  }

  // off 级别：不压缩
  if (options.level === 'off') {
    return null
  }

  // 检查现有缓存
  const existing = await getCompressedCharacterPrompts(character)
  if (existing) {
    return existing
  }

  const cache = await loadCache()
  let compressed: CompressedCharacterPrompts

  switch (options.level) {
    case 'rule':
      // 仅规则压缩
      compressed = applyRuleCompression(character)
      break

    case 'llm':
      // 直接 LLM 压缩（如果提供了 LLM 选项）
      if (options.llmOptions?.llmCallFn) {
        compressed = await applyLLMCompression(character, options.llmOptions)
      } else {
        // 降级到规则压缩
        compressed = applyRuleCompression(character)
      }
      break

    case 'hybrid':
    default: {
      // 混合模式：先用规则压缩，超过阈值再用 LLM 精炼
      const ruleCompressed = applyRuleCompression(character)
      const budgetTokens = options.budgetTokens || 2000

      // 检查是否需要 LLM 精炼
      if (
        options.llmOptions?.llmCallFn &&
        shouldUseLLMCompression(ruleCompressed.rolePrompt, budgetTokens)
      ) {
        compressed = await applyLLMCompression(character, options.llmOptions)
      } else {
        compressed = ruleCompressed
      }
      break
    }
  }

  cache[character.id] = compressed
  await saveCache(cache)
  return compressed
}

export async function deleteCompressedCharacterPrompts(characterId: string): Promise<void> {
  const cache = await loadCache()
  if (!cache[characterId]) {
    return
  }

  delete cache[characterId]
  await saveCache(cache)
}
