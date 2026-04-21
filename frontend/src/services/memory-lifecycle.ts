import type { StorageDriver } from './storage'
import type { SemanticMemoryEntry } from './semantic-memory'
import { getMemoriesByCharacter, updateMemory } from './semantic-memory'

export interface MemoryLifecycleConfig {
  /** 衰减系数 (0-1), 每次维护时 accessCount 乘以此值 */
  decayRate: number
  /** 低于此阈值的 hot 记忆降级为 cold */
  coldThreshold: number
  /** hot 记忆最大数量, 超出时按 accessCount 降级最低的 */
  maxHotEntries: number
  /** 维护间隔 (消息数) */
  maintenanceInterval: number
}

const DEFAULT_CONFIG: MemoryLifecycleConfig = {
  decayRate: 0.85,
  coldThreshold: 0.5,
  maxHotEntries: 50,
  maintenanceInterval: 10,
}

/**
 * 执行记忆维护周期:
 * 1. 衰减: 所有 unpinned hot 记忆的 accessCount 乘以 decayRate
 * 2. 降级: accessCount < coldThreshold 的 hot 记忆变为 cold
 * 3. 溢出: 如果 hot 记忆超 maxHotEntries, 按 accessCount 降级最低的
 */
export async function runMemoryMaintenance(
  storage: StorageDriver,
  characterId: string,
  config: Partial<MemoryLifecycleConfig> = {}
): Promise<{ decayed: number; demoted: number; overflowed: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const hotMemories = await getMemoriesByCharacter(storage, characterId, 'hot')

  let decayed = 0
  let demoted = 0
  let overflowed = 0

  // Phase 1: Decay unpinned hot memories
  for (const entry of hotMemories) {
    if (entry.pinned) continue
    const newCount = entry.accessCount * cfg.decayRate
    await updateMemory(storage, entry.id, { accessCount: newCount })
    decayed++
  }

  // Phase 2: Demote below threshold
  const afterDecay = await getMemoriesByCharacter(storage, characterId, 'hot')
  for (const entry of afterDecay) {
    if (entry.pinned) continue
    if (entry.accessCount < cfg.coldThreshold) {
      await updateMemory(storage, entry.id, { heat: 'cold' })
      demoted++
    }
  }

  // Phase 3: Overflow demotion
  const afterDemotion = await getMemoriesByCharacter(storage, characterId, 'hot')
  if (afterDemotion.length > cfg.maxHotEntries) {
    const unpinned = afterDemotion
      .filter(e => !e.pinned)
      .sort((a, b) => a.accessCount - b.accessCount)

    const toDemote = unpinned.slice(0, afterDemotion.length - cfg.maxHotEntries)
    for (const entry of toDemote) {
      await updateMemory(storage, entry.id, { heat: 'cold' })
      overflowed++
    }
  }

  return { decayed, demoted, overflowed }
}

/**
 * 标记记忆被访问 (increment accessCount)
 */
export async function touchMemory(
  storage: StorageDriver,
  entryId: string
): Promise<void> {
  const store = await storage.getUserSetting('semantic_memory_store')
  if (!store) return

  let parsed: { entries: SemanticMemoryEntry[] }
  try {
    parsed = JSON.parse(store) as { entries: SemanticMemoryEntry[] }
  } catch {
    return
  }

  const entry = parsed.entries.find(e => e.id === entryId)
  if (!entry) return

  entry.accessCount += 1
  entry.lastAccessedAt = Date.now()

  // Auto-promote cold → hot if accessed
  if (entry.heat === 'cold' && entry.accessCount >= 1) {
    entry.heat = 'hot'
  }

  await storage.saveUserSetting('semantic_memory_store', JSON.stringify(parsed))
}

/**
 * 检查是否需要运行维护
 */
export function shouldRunMaintenance(
  messageCountSinceLastMaintenance: number,
  config: Partial<MemoryLifecycleConfig> = {}
): boolean {
  const interval = config.maintenanceInterval ?? DEFAULT_CONFIG.maintenanceInterval
  return messageCountSinceLastMaintenance >= interval
}
