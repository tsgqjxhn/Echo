/**
 * AI 角色生成服务
 * 根据用户描述调用 LLM 生成完整角色卡
 */

import { createLLMAPI } from './llm-api'
import type { ICharacter, DepthPrompt } from '@/types/character'
import type { APIConfig } from '@/types/api-config'
import { getCategoryGroups, getFirstSubCategory } from '@/data/taxonomy'
import { inferCharacterMode } from '@/data/taxonomy'
import { generateUUID } from '@/utils/uuid'
import { getPromptById } from './system-prompt'

export interface AIGenerateOptions {
  /** 用户描述 */
  description: string
  /** 风格标签 */
  styleTags: string[]
  /** 互动类型 */
  interactionType: string
  /** 创意度 1-10 */
  creativity: number
  /** 详细度 1-10 */
  detailLevel: number
}

export interface AIGenerateRawResult {
  name: string
  description: string
  greeting: string
  settings: string
  scenario: string
  persona: {
    anchor: string
    traits: string
    voice: string
  }
  exampleDialogue?: string
  alternateGreetings?: string[]
  tags?: string[]
  category?: string
  subCategory?: string
  depthPrompt?: {
    depth: number
    prompt: string
    role: 'system' | 'user' | 'assistant'
  }
}

function buildSystemPrompt(opts: AIGenerateOptions): string {
  // 尝试使用系统提示词中的 AI 角色卡生成器模板
  const aiPrompt = getPromptById('char-creation-ai-card')
  if (aiPrompt && aiPrompt.enabled) {
    const template = aiPrompt.useAdvanced ? aiPrompt.advancedPrompt : aiPrompt.basicPrompt
    return template
      .replace(/\{\{user\.inputDescription\}\}/g, opts.description)
      .replace(/\{\{user\.preferredCategory\}\}/g, opts.styleTags.join('、') || '未指定')
      .replace(/\{\{styleTags\}\}/g, opts.styleTags.join('、') || '未指定')
      .replace(/\{\{interactionType\}\}/g, opts.interactionType || '未指定')
      .replace(/\{\{creativity\}\}/g, String(opts.creativity))
      .replace(/\{\{detailLevel\}\}/g, String(opts.detailLevel))
  }

  // 兜底：使用硬编码的默认提示词
  return `你是一个专业的角色扮演游戏角色设计师。根据用户的描述，生成一个完整的角色卡。

用户描述：${opts.description}
风格倾向：${opts.styleTags.join('、') || '未指定'}
互动类型：${opts.interactionType || '未指定'}
创意度：${opts.creativity}/10
详细度：${opts.detailLevel}/10

请严格按照以下JSON格式返回（不要包含任何其他文本，只返回JSON）：
{
  "name": "角色名称",
  "description": "角色描述（100-300字）",
  "greeting": "开场白（1-3句话）",
  "settings": "整体设定/主提示词（包含性格、行为、说话风格、世界观等）",
  "scenario": "场景设定",
  "persona": {
    "anchor": "身份锁",
    "traits": "性格特质",
    "voice": "交流风格"
  },
  "exampleDialogue": "示例对话（可选）",
  "alternateGreetings": ["备选开场白1", "备选开场白2"],
  "tags": ["标签1", "标签2"],
  "category": "分类（自由对话/剧情/剧情&游戏/群聊派对/工具）",
  "subCategory": "子分类",
  "depthPrompt": {
    "depth": 4,
    "prompt": "深度提示内容",
    "role": "system"
  }
}

要求：
1. 角色必须说中文，保持中文语境
2. 性格鲜明，说话风格一致
3. 避免生成任何违规、色情、暴力内容
4. 如果用户描述简单，请适当扩展和丰富
5. settings字段必须包含完整的角色行为约束`
}

function normalizeCategory(cat: string): { category: string; subCategory: string } {
  const groups = getCategoryGroups()
  const found = groups.find(g => g.label === cat || cat.includes(g.label))
  if (found) {
    return { category: found.label, subCategory: found.items[0] || getFirstSubCategory(found.label) }
  }
  // 模糊匹配
  if (cat.includes('群聊')) return { category: '群聊派对', subCategory: '普通群聊' }
  if (cat.includes('游戏')) return { category: '剧情&游戏', subCategory: '互动游戏' }
  if (cat.includes('剧情')) return { category: '剧情', subCategory: '单线剧情' }
  if (cat.includes('工具')) return { category: '工具', subCategory: '问答' }
  return { category: '自由对话', subCategory: '' }
}

function safeJsonParse(text: string): AIGenerateRawResult | null {
  // 尝试提取 JSON 块
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as AIGenerateRawResult
  } catch {
    return null
  }
}

/**
 * 使用 AI 生成角色
 * @param opts 生成选项
 * @param apiConfig 可选的 API 配置（默认使用当前全局配置）
 * @returns 部分 ICharacter 数据
 */
export async function generateCharacterByAI(
  opts: AIGenerateOptions,
  apiConfig?: APIConfig,
): Promise<Partial<ICharacter>> {
  const llm = apiConfig ? createLLMAPI(apiConfig) : createLLMAPI()

  const systemPrompt = buildSystemPrompt(opts)
  const context = {
    systemPrompt,
    messages: [{ role: 'user' as const, content: '请生成角色' }],
  }

  const rawText = await llm.chat(context)
  const parsed = safeJsonParse(rawText)

  if (!parsed) {
    throw new Error('AI 返回格式不正确，无法解析角色数据')
  }

  const { category, subCategory } = normalizeCategory(parsed.category || '自由对话')
  const mode = inferCharacterMode({ category, subCategory })

  const now = Date.now()

  const result: Partial<ICharacter> = {
    id: generateUUID(),
    name: parsed.name || '未命名角色',
    description: parsed.description || '',
    greeting: parsed.greeting || undefined,
    settings: parsed.settings || '',
    scenario: parsed.scenario || undefined,
    mode,
    category,
    subCategory,
    sourceType: 'manual',
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    exampleDialogue: parsed.exampleDialogue || undefined,
    alternateGreetings: parsed.alternateGreetings?.filter(g => g.trim()) || undefined,
    tags: parsed.tags || [category, subCategory].filter(Boolean),
    persona: parsed.persona
      ? {
          anchor: parsed.persona.anchor || '',
          traits: parsed.persona.traits
            ? parsed.persona.traits.split(/[,，]/).map(s => s.trim()).filter(Boolean)
            : [],
          voice: parsed.persona.voice || '',
        }
      : undefined,
    depthPrompt: parsed.depthPrompt
      ? ({
          depth: parsed.depthPrompt.depth ?? 4,
          prompt: parsed.depthPrompt.prompt || '',
          role: parsed.depthPrompt.role || 'system',
        } as DepthPrompt)
      : undefined,
  }

  return result
}

/**
 * 使用 AI 生成角色头像（返回 data URL）
 * 尝试让 LLM 生成 SVG，失败则 fallback 到 silver art
 */
export async function generateCharacterAvatar(name: string, _category?: string): Promise<string> {
  try {
    const llm = createLLMAPI()
    const context = {
      systemPrompt: '你是一个SVG设计师。只输出SVG代码，不输出任何解释文字。',
      messages: [{ role: 'user' as const, content: `为角色"${name}"生成一个圆形简约风格头像SVG，直径128px，配色和谐，只返回<svg>...</svg>代码。` }],
    }
    const rawText = await llm.chat(context)
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i)
    if (svgMatch) {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMatch[0])))}`
    }
  } catch { /* ignore */ }
  const { createSilverAvatarDataUrl } = await import('@/utils/silver-art')
  return createSilverAvatarDataUrl(name || '角色')
}
