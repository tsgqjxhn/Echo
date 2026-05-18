/**
 * 角色卡 LLM 语义压缩服务 (F4)
 *
 * 多级压缩管道：
 * 1. 规则截断（现有 compactText）— 快速减少到 ~1500 tokens
 * 2. LLM 语义精炼（新增）— 智能压缩到 ~800-1000 tokens
 * 3. 缓存精炼结果 — 避免重复调用 LLM
 *
 * 与对话历史压缩形成完整的多级压缩管道
 */

import type { ICharacter } from '@/types/character'
import { estimateTokens } from './token-counter'
import { storageDriver } from './storage'

const LLM_COMPRESS_CACHE_KEY = 'echo_llm_character_compress_v1'
const LLM_COMPRESS_TEMPERATURE = 0.1

/**
 * 压缩级别配置
 */
export type CompressionLevel = 'off' | 'rule' | 'llm' | 'hybrid'

/**
 * LLM 压缩选项
 */
export interface LLMCompressionOptions {
  /** 目标 Token 数 */
  targetTokens: number
  /** 不压缩的字段 */
  preserveFields: string[]
  /** 用于压缩的模型 */
  model: string
  /** 压缩级别 */
  level: CompressionLevel
  /** LLM 调用函数 */
  llmCallFn?: (systemPrompt: string, userPrompt: string) => Promise<string>
}

/**
 * LLM 压缩后的角色卡字段
 */
export interface LLMCompressedCharacter {
  name: string
  description: string
  personality: string
  scenario: string
  greeting: string
  exampleDialogue?: string
  settings: string
  behavior?: string
  values?: string
}

/**
 * 压缩缓存条目
 */
interface CompressionCacheEntry {
  characterId: string
  fingerprint: string
  compressed: LLMCompressedCharacter
  compressedAt: number
  sourceTokens: number
  compressedTokens: number
}

interface CompressionCache {
  [characterId: string]: CompressionCacheEntry
}

/**
 * System Prompt 设计：角色描述精炼
 *
 * 设计原则：
 * 1. 保留核心身份和性格特征
 * 2. 去除冗余形容词和修饰语
 * 3. 严格按 JSON 格式输出，便于解析
 * 4. 不要虚构信息
 */
const COMPRESS_SYSTEM_PROMPT = `你是一个角色描述精炼助手。请压缩以下角色信息，保留核心身份和性格特征。

要求：
1. 保留角色名不变
2. 保留角色最核心的 3-5 个性格关键词，用逗号分隔
3. 描述压缩为 2-3 句，保留身份和背景核心信息
4. 场景描述压缩为 1 句
5. 开场白保留语气和称呼风格，压缩到 1 句
6. 对话示例保留 1 个最有代表性的（如果有）
7. 核心设定保留最关键的 2-3 点
8. 行为边界和价值观各压缩为 1 句（如果有）
9. 不要虚构新信息，不要添加原文没有的内容
10. 严格按 JSON 格式输出，不要解释、不要 Markdown 包裹

输出格式：
{
  "name": "角色名",
  "description": "压缩后的描述",
  "personality": "压缩后的性格（关键词逗号分隔）",
  "scenario": "压缩后的场景",
  "greeting": "压缩后的开场白",
  "exampleDialogue": "压缩后的对话示例（可选）",
  "settings": "压缩后的核心设定",
  "behavior": "压缩后的行为边界（可选）",
  "values": "压缩后的价值观（可选）"
}`

/**
 * 生成角色指纹，用于检测内容变更
 */
function generateCharacterFingerprint(character: ICharacter): string {
  const source = {
    name: character.name,
    description: character.description,
    personality: character.personality,
    scenario: character.scenario,
    greeting: character.greeting,
    exampleDialogue: character.exampleDialogue,
    settings: character.settings,
    behavior: character.behavior,
    values: character.values,
    updatedAt: character.updatedAt,
  }
  return JSON.stringify(source).length.toString() + '-' + (character.updatedAt || 0)
}

/**
 * 加载压缩缓存
 */
async function loadCache(): Promise<CompressionCache> {
  const raw = await storageDriver.getUserSetting(LLM_COMPRESS_CACHE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as CompressionCache
  } catch {
    return {}
  }
}

/**
 * 保存压缩缓存
 */
async function saveCache(cache: CompressionCache): Promise<void> {
  await storageDriver.saveUserSetting(LLM_COMPRESS_CACHE_KEY, JSON.stringify(cache))
}

/**
 * 构建 LLM 压缩的用户提示词
 */
function buildCompressPrompt(character: ICharacter): string {
  const lines = [
    `角色名：${character.name}`,
    `描述：${character.description || ''}`,
    `性格：${character.personality || ''}`,
    `场景：${character.scenario || ''}`,
    `开场白：${character.greeting || ''}`,
  ]

  if (character.exampleDialogue) {
    lines.push(`对话示例：${character.exampleDialogue}`)
  }
  if (character.settings) {
    lines.push(`核心设定：${character.settings}`)
  }
  if (character.behavior) {
    lines.push(`行为边界：${character.behavior}`)
  }
  if (character.values) {
    lines.push(`价值观：${character.values}`)
  }

  return lines.join('\n')
}

/**
 * 解析 LLM 返回的 JSON 结果
 * 包含容错处理：去除 Markdown 包裹、修复语法错误
 */
function parseLLMResult(text: string): LLMCompressedCharacter | null {
  let jsonStr = text.trim()

  // 移除 Markdown 代码块包裹
  jsonStr = jsonStr.replace(/^```json\s*/i, '')
  jsonStr = jsonStr.replace(/^```\s*/i, '')
  jsonStr = jsonStr.replace(/\s*```$/, '')

  // 尝试解析
  try {
    const parsed = JSON.parse(jsonStr)
    // 验证必要字段
    if (!parsed.name || !parsed.description) {
      return null
    }
    return parsed as LLMCompressedCharacter
  } catch {
    // 尝试修复常见的 JSON 错误
    try {
      // 尝试提取第一个 { 和最后一个 } 之间的内容
      const start = jsonStr.indexOf('{')
      const end = jsonStr.lastIndexOf('}')
      if (start >= 0 && end > start) {
        const fixed = jsonStr.slice(start, end + 1)
        return JSON.parse(fixed) as LLMCompressedCharacter
      }
    } catch {
      // ignore
    }
    return null
  }
}

/**
 * 判断是否需要使用 LLM 压缩
 *
 * 决策逻辑：
 * - 规则压缩后仍超过 Token 预算的 40% 时，使用 LLM 精炼
 */
export function shouldUseLLMCompression(
  ruleCompressedText: string,
  budgetTokens: number,
  thresholdRatio = 0.4
): boolean {
  const afterRuleCompression = estimateTokens(ruleCompressedText)
  return afterRuleCompression > budgetTokens * thresholdRatio
}

/**
 * 使用 LLM 压缩角色卡
 *
 * @param character 原始角色卡
 * @param options 压缩选项
 * @returns 压缩后的角色卡字段
 */
export async function compressCharacterWithLLM(
  character: ICharacter,
  options: LLMCompressionOptions
): Promise<LLMCompressedCharacter> {
  // 默认降级结果（失败时返回）
  const fallback: LLMCompressedCharacter = {
    name: character.name,
    description: character.description || '',
    personality: character.personality || '',
    scenario: character.scenario || '',
    greeting: character.greeting || '',
    exampleDialogue: character.exampleDialogue,
    settings: character.settings || '',
    behavior: character.behavior,
    values: character.values,
  }

  // 检查是否有 LLM 调用函数
  if (!options.llmCallFn) {
    return fallback
  }

  // 检查缓存
  const cache = await loadCache()
  const fingerprint = generateCharacterFingerprint(character)
  const cached = cache[character.id]
  if (cached && cached.fingerprint === fingerprint) {
    return cached.compressed
  }

  try {
    // 调用 LLM
    const userPrompt = buildCompressPrompt(character)
    const result = await options.llmCallFn(COMPRESS_SYSTEM_PROMPT, userPrompt)

    // 解析结果
    const parsed = parseLLMResult(result)
    if (!parsed) {
      return fallback
    }

    // 确保 name 正确
    parsed.name = character.name

    // 计算 Token 节省
    const sourceTokens = estimateTokens(buildCompressPrompt(character))
    const compressedTokens = estimateTokens(JSON.stringify(parsed))

    // 保存缓存
    cache[character.id] = {
      characterId: character.id,
      fingerprint,
      compressed: parsed,
      compressedAt: Date.now(),
      sourceTokens,
      compressedTokens,
    }
    await saveCache(cache)

    return parsed
  } catch {
    // LLM 调用失败，降级到原始内容
    return fallback
  }
}

/**
 * 清除指定角色的 LLM 压缩缓存
 */
export async function clearLLMCompressionCache(characterId: string): Promise<void> {
  const cache = await loadCache()
  if (cache[characterId]) {
    delete cache[characterId]
    await saveCache(cache)
  }
}

/**
 * 清除所有 LLM 压缩缓存
 */
export async function clearAllLLMCompressionCache(): Promise<void> {
  await storageDriver.saveUserSetting(LLM_COMPRESS_CACHE_KEY, JSON.stringify({}))
}

/**
 * 获取压缩统计信息
 */
export async function getCompressionStats(characterId: string): Promise<{
  cached: boolean
  sourceTokens: number
  compressedTokens: number
  savingsPercent: number
} | null> {
  const cache = await loadCache()
  const entry = cache[characterId]
  if (!entry) return null

  return {
    cached: true,
    sourceTokens: entry.sourceTokens,
    compressedTokens: entry.compressedTokens,
    savingsPercent: Math.round((1 - entry.compressedTokens / entry.sourceTokens) * 100),
  }
}
