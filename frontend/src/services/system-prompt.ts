/**
 * 系统提示词存储与管理服务
 * 提供底层提示词的加载、保存、查询、批量操作等功能
 */

import type { SystemPrompt, PromptCategory } from '@/types/system-prompt'
import { DEFAULT_SYSTEM_PROMPTS } from '@/data/system-prompts'

const STORAGE_KEY = 'echo_system_prompts'
const STORAGE_VERSION = '2'

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

    // 合并存储数据与默认数据：以存储的 enabled/useAdvanced 为准，但提示词文本以代码中最新版本为准
    const storedMap = new Map<string, Partial<SystemPrompt>>()
    for (const p of parsed.prompts) {
      if (p && p.id) {
        storedMap.set(p.id, {
          enabled: p.enabled,
          useAdvanced: p.useAdvanced,
        })
      }
    }

    return DEFAULT_SYSTEM_PROMPTS.map((defaultPrompt) => {
      const stored = storedMap.get(defaultPrompt.id)
      if (stored) {
        return {
          ...defaultPrompt,
          enabled: typeof stored.enabled === 'boolean' ? stored.enabled : defaultPrompt.enabled,
          useAdvanced: typeof stored.useAdvanced === 'boolean' ? stored.useAdvanced : defaultPrompt.useAdvanced,
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
        useAdvanced: p.useAdvanced,
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
  updates: Partial<Pick<SystemPrompt, 'enabled' | 'useAdvanced' | 'basicPrompt' | 'advancedPrompt'>>
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
 * 一键切换全部提示词的高级模式
 */
export function setAllAdvanced(useAdvanced: boolean): SystemPrompt[] {
  const prompts = loadSystemPrompts().map((p) => ({ ...p, useAdvanced }))
  saveSystemPrompts(prompts)
  return prompts
}

/**
 * 一键切换指定分类的高级模式
 */
export function setCategoryAdvanced(
  category: PromptCategory,
  useAdvanced: boolean
): SystemPrompt[] {
  const prompts = loadSystemPrompts().map((p) =>
    p.category === category ? { ...p, useAdvanced } : { ...p }
  )
  saveSystemPrompts(prompts)
  return prompts
}

/**
 * 获取实际使用的提示词文本
 * 根据 enabled 和 useAdvanced 返回对应的模板文本
 */
export function getPromptText(id: string): string | null {
  const prompt = getPromptById(id)
  if (!prompt || !prompt.enabled) {
    return null
  }
  return prompt.useAdvanced ? prompt.advancedPrompt : prompt.basicPrompt
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
        useAdvanced: p.useAdvanced,
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

    const importedMap = new Map<string, { enabled: boolean; useAdvanced: boolean }>()
    for (const p of data.prompts) {
      if (p && p.id && typeof p.enabled === 'boolean' && typeof p.useAdvanced === 'boolean') {
        importedMap.set(p.id, { enabled: p.enabled, useAdvanced: p.useAdvanced })
      }
    }

    const merged = DEFAULT_SYSTEM_PROMPTS.map((defaultPrompt) => {
      const imported = importedMap.get(defaultPrompt.id)
      if (imported) {
        return {
          ...defaultPrompt,
          enabled: imported.enabled,
          useAdvanced: imported.useAdvanced,
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
