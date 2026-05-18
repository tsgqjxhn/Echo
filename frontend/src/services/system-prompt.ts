/**
 * 系统提示词存储与管理服务
 * 提供底层提示词的加载、保存、查询、批量操作等功能
 */

import type { ICharacter } from '@/types/character'
import type { SystemPrompt, PromptCategory } from '@/types/system-prompt'
import { DEFAULT_SYSTEM_PROMPTS, DISTILLED_PROMPTS } from '@/data/system-prompts'

/**
 * 宏替换上下文
 */
export interface MacroContext {
  charName: string
  userName: string
  originalPrompt?: string
  idleDuration?: string
  character?: ICharacter
  memoryPrompt?: string
  sessionSummary?: string | null
  userGlobalPrompt?: string
}

/**
 * 将毫秒时长格式化为人类可读字符串
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天`
  if (hours > 0) return `${hours}小时`
  if (minutes > 0) return `${minutes}分钟`
  return '刚刚'
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * 统一宏替换入口
 * 支持 SillyTavern 风格 {{parameter}} 语法
 */
export function resolveMacros(text: string, context: MacroContext): string {
  const now = new Date()
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const idleStr = context.idleDuration ?? '刚刚'

  const char = context.character

  return (
    text
      // 角色与用户简写
      .replace(/\{\{char\}\}/g, context.charName)
      .replace(/\{\{user\}\}/g, context.userName)
      // 原始 prompt（用于嵌套替换）
      .replace(/\{\{original\}\}/g, context.originalPrompt ?? '')
      // 时间/日期
      .replace(/\{\{time\}\}/g, timeStr)
      .replace(/\{\{date\}\}/g, dateStr)
      // 空闲时长
      .replace(/\{\{idle_duration\}\}/g, idleStr)
      // 角色详细字段（兼容旧宏）
      .replace(/\{\{char\.name\}\}/g, context.charName)
      .replace(/\{\{char\.desc\}\}/g, char?.description ?? '')
      .replace(/\{\{char\.description\}\}/g, char?.description ?? '')
      .replace(/\{\{char\.personality\}\}/g, char?.personality ?? '')
      .replace(/\{\{char\.behavior\}\}/g, char?.behavior ?? '')
      .replace(/\{\{char\.values\}\}/g, char?.values ?? '')
      .replace(/\{\{char\.scenario\}\}/g, char?.scenario ?? '')
      .replace(/\{\{char\.settings\}\}/g, char?.settings ?? '')
      // 用户字段（兼容旧宏）
      .replace(/\{\{user\.name\}\}/g, context.userName)
      .replace(/\{\{user\.globalPrompt\}\}/g, context.userGlobalPrompt ?? '')
      // 记忆与摘要（兼容旧宏）
      .replace(/\{\{memory\}\}/g, context.memoryPrompt ?? '')
      .replace(/\{\{summary\}\}/g, context.sessionSummary ?? '')
  )
}

const STORAGE_KEY = 'echo_system_prompts'
const STORAGE_VERSION = '3'

/**
 * 从 localStorage 加载系统提示词配置
 * 如果不存在或版本不匹配，返回默认配置
 */
export function loadSystemPrompts(): SystemPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultPrompts()
    }

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.prompts)) {
      console.warn('[SystemPrompt] 存储版本不匹配或数据损坏，重置为默认配置')
      return getDefaultPrompts()
    }

    // 合并存储数据与默认数据：保留启用状态和用户编辑后的基础提示词。
    const storedMap = new Map<string, Partial<SystemPrompt>>()
    for (const p of parsed.prompts) {
      if (p && p.id) {
        storedMap.set(p.id, {
          enabled: p.enabled,
          basicPrompt: typeof p.basicPrompt === 'string' ? p.basicPrompt : undefined,
        })
      }
    }

    return DEFAULT_SYSTEM_PROMPTS.map((defaultPrompt) => {
      const stored = storedMap.get(defaultPrompt.id)
      if (stored) {
        return {
          ...defaultPrompt,
          enabled: typeof stored.enabled === 'boolean' ? stored.enabled : defaultPrompt.enabled,
          basicPrompt: typeof stored.basicPrompt === 'string' ? stored.basicPrompt : defaultPrompt.basicPrompt,
        }
      }
      return { ...defaultPrompt }
    })
  } catch (err) {
    console.error('[SystemPrompt] 加载失败:', err)
    return getDefaultPrompts()
  }
}

/**
 * 保存系统提示词配置到 localStorage
 */
export function saveSystemPrompts(prompts: SystemPrompt[]): void {
  try {
    const data = {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      prompts: prompts.map((p) => ({
        id: p.id,
        enabled: p.enabled,
        basicPrompt: p.basicPrompt,
      })),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('[SystemPrompt] 保存失败:', err)
  }
}

/**
 * 获取默认提示词副本
 */
export function getDefaultPrompts(): SystemPrompt[] {
  return DEFAULT_SYSTEM_PROMPTS.map((p) => ({ ...p }))
}

/**
 * 获取当前启用的提示词（按优先级降序排列）
 */
export function getActivePrompts(prompts?: SystemPrompt[]): SystemPrompt[] {
  const list = prompts ?? loadSystemPrompts()
  return list
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * 获取指定分类的提示词
 */
export function getPromptsByCategory(
  category: PromptCategory,
  prompts?: SystemPrompt[]
): SystemPrompt[] {
  const list = prompts ?? loadSystemPrompts()
  return list.filter((p) => p.category === category)
}

/**
 * 获取单个提示词
 */
export function getPromptById(id: string, prompts?: SystemPrompt[]): SystemPrompt | undefined {
  const list = prompts ?? loadSystemPrompts()
  return list.find((p) => p.id === id)
}

/**
 * 更新单个提示词的指定字段并自动保存
 */
export function updatePrompt(
  id: string,
  updates: Partial<Pick<SystemPrompt, 'enabled' | 'basicPrompt'>>
): SystemPrompt[] {
  const prompts = loadSystemPrompts()
  const index = prompts.findIndex((p) => p.id === id)
  if (index === -1) {
    console.warn(`[SystemPrompt] 未找到提示词: ${id}`)
    return prompts
  }

  prompts[index] = { ...prompts[index], ...updates }
  saveSystemPrompts(prompts)
  return prompts
}

/**
 * 一键启用/弃用全部提示词
 */
export function setAllEnabled(enabled: boolean): SystemPrompt[] {
  const prompts = loadSystemPrompts().map((p) => ({ ...p, enabled }))
  saveSystemPrompts(prompts)
  return prompts
}

/**
 * 获取实际使用的提示词文本
 */
export function getPromptText(id: string): string | null {
  const prompt = getPromptById(id)
  if (!prompt || !prompt.enabled) {
    return null
  }
  return prompt.basicPrompt
}

/**
 * 重置为默认配置
 */
export function resetToDefaults(): SystemPrompt[] {
  const defaults = getDefaultPrompts()
  saveSystemPrompts(defaults)
  return defaults
}

/**
 * 导出当前配置为 JSON（便于备份/分享）
 */
export function exportPromptConfig(prompts?: SystemPrompt[]): string {
  const list = prompts ?? loadSystemPrompts()
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      prompts: list.map((p) => ({
        id: p.id,
        enabled: p.enabled,
        basicPrompt: p.basicPrompt,
      })),
    },
    null,
    2
  )
}

/**
 * 导入配置 JSON
 */
export function importPromptConfig(jsonString: string): SystemPrompt[] | null {
  try {
    const data = JSON.parse(jsonString)
    if (!data || !Array.isArray(data.prompts)) {
      return null
    }

    const importedMap = new Map<string, { enabled: boolean; basicPrompt?: string }>()
    for (const p of data.prompts) {
      if (p && p.id && typeof p.enabled === 'boolean') {
        importedMap.set(p.id, {
          enabled: p.enabled,
          basicPrompt: typeof p.basicPrompt === 'string' ? p.basicPrompt : undefined,
        })
      }
    }

    const merged = DEFAULT_SYSTEM_PROMPTS.map((defaultPrompt) => {
      const imported = importedMap.get(defaultPrompt.id)
      if (imported) {
        return {
          ...defaultPrompt,
          enabled: imported.enabled,
          basicPrompt: imported.basicPrompt || defaultPrompt.basicPrompt,
        }
      }
      return { ...defaultPrompt }
    })

    saveSystemPrompts(merged)
    return merged
  } catch (err) {
    console.error('[SystemPrompt] 导入失败:', err)
    return null
  }
}

// ============================================================================
// 精简版提示词支持 (Turbo 模式)
// ============================================================================

/**
 * Prompt 模式类型
 * - 'full': 完整版 (8层结构，最高质量，适合GPT-4等大模型)
 * - 'distilled': 精简版 (6层蒸馏结构，约节省40% Token，适合Turbo模式和轻量模型)
 */
export type PromptMode = 'full' | 'distilled'

/**
 * 获取指定模式的默认提示词集合
 */
export function getDefaultPromptsByMode(mode: PromptMode): SystemPrompt[] {
  if (mode === 'distilled') {
    return DISTILLED_PROMPTS.map((p) => ({ ...p }))
  }
  return DEFAULT_SYSTEM_PROMPTS.map((p) => ({ ...p }))
}

/**
 * 获取当前启用的提示词（支持模式选择）
 * 默认使用精简版 (distilled) 以获得更好的性能
 */
export function getActivePromptsByMode(
  mode: PromptMode = 'distilled',
  prompts?: SystemPrompt[]
): SystemPrompt[] {
  const list = prompts ?? getDefaultPromptsByMode(mode)
  return list
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * 切换 Prompt 模式并重置配置
 * 这会清除用户自定义配置，使用对应模式的默认配置
 */
export function switchPromptMode(mode: PromptMode): SystemPrompt[] {
  const defaults = getDefaultPromptsByMode(mode)
  saveSystemPrompts(defaults)
  return defaults
}

/**
 * 获取当前使用的模式（根据存储的提示词 ID 推断）
 * 检测策略：检查是否包含精简版特有的提示词 ID
 */
export function detectCurrentPromptMode(): PromptMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return 'distilled' // 默认使用精简版
    }
    const data = JSON.parse(stored)
    if (Array.isArray(data.prompts)) {
      const ids = data.prompts.map((p: any) => p.id)
      // 检测是否包含精简版特有的提示词 ID
      const hasDistilledIds = ids.some((id: string) => id.startsWith('distilled-'))
      return hasDistilledIds ? 'distilled' : 'full'
    }
    return 'distilled'
  } catch {
    return 'distilled'
  }
}
