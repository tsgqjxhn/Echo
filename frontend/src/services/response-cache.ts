/**
 * 响应缓存服务
 * 实现用户输入 -> 模型回复的语义缓存映射
 * 支持精确匹配和可选的相似度匹配
 */

import type { StorageDriver } from './storage'
import { getEmbeddingProvider, cosineSimilarity } from './embedding'

const STORAGE_KEY = 'echo_response_cache'

// ============ 类型定义 ============

/**
 * 缓存条目
 */
export interface CacheEntry {
  /** 规范化后的用户输入 */
  input: string
  /** 模型回复内容 */
  response: string
  /** 角色ID（不同角色回复不同） */
  characterId: string
  /** 模型ID（不同模型回复不同） */
  modelId: string
  /** 缓存时间 */
  timestamp: number
  /** 命中次数（用于淘汰策略） */
  hitCount: number
  /** 输入哈希（快速精确匹配） */
  inputHash: string
  /** 输入的 embedding 向量（用于模糊匹配） */
  embedding?: number[]
}

/**
 * 缓存配置
 */
export interface ResponseCacheConfig {
  /** 最大缓存条目数 */
  maxEntries: number
  /** 缓存有效期（毫秒），默认 30 分钟 */
  ttlMs: number
  /** 最小输入长度，太短的不缓存 */
  minInputLength: number
  /** 最大缓存输入长度，太长的不缓存 */
  maxInputLength: number
  /** 是否仅精确匹配 */
  exactMatchOnly: boolean
  /** 是否启用模糊匹配 */
  enableFuzzyMatch: boolean
  /** 模糊匹配阈值 */
  fuzzyMatchThreshold: number
  /** 是否启用持久化 */
  enablePersistence: boolean
  /** 持久化最大条目数 */
  maxPersistentEntries: number
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 总请求次数 */
  totalRequests: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 当前缓存条目数 */
  currentEntries: number
  /** 命中率 */
  hitRate: number
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: ResponseCacheConfig = {
  maxEntries: 200,
  ttlMs: 30 * 60 * 1000, // 30 分钟
  minInputLength: 2,
  maxInputLength: 50,
  exactMatchOnly: true,
  enableFuzzyMatch: false,
  fuzzyMatchThreshold: 0.92,
  enablePersistence: true,
  maxPersistentEntries: 100,
}

// ============ 工具函数 ============

/**
 * 简单的字符串哈希函数
 * 用于快速精确匹配
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * 规范化用户输入
 * 用于提高缓存命中率
 */
function normalizeInput(input: string): string {
  if (!input) return ''

  return input
    // Unicode 标准化
    .normalize('NFKC')
    // 全角转半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    // 移除多余空白
    .replace(/\s+/g, ' ')
    // 移除常见标点符号
    .replace(/[，。！？、；：""''（）【】《》,.!?;:"'()\[\]<>]/g, '')
    // 转小写
    .toLowerCase()
    // 首尾去空白
    .trim()
}

/**
 * 检查是否应该缓存这个输入
 */
function shouldCacheInput(
  input: string,
  config: ResponseCacheConfig
): boolean {
  const normalized = normalizeInput(input)

  // 长度检查
  if (normalized.length < config.minInputLength) return false
  if (normalized.length > config.maxInputLength) return false

  // 检查是否包含敏感信息标记（简单规则）
  const sensitivePatterns = [
    /密码|账号|身份证|银行卡|手机号|电话|地址/,
    /http|https|www\./,
    /<[^>]+>/, // HTML 标签
  ]

  for (const pattern of sensitivePatterns) {
    if (pattern.test(input)) return false
  }

  return true
}

// ============ LRU 缓存实现 ============

class LRUCache {
  private cache: Map<string, CacheEntry> = new Map()
  private config: ResponseCacheConfig

  constructor(config: ResponseCacheConfig) {
    this.config = config
  }

  /**
   * 获取缓存条目（命中时移动到末尾，表示最近使用）
   */
  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // 移动到末尾，表示最近使用
    this.cache.delete(key)
    entry.hitCount++
    this.cache.set(key, entry)

    return entry
  }

  /**
   * 设置缓存条目
   */
  set(key: string, entry: CacheEntry): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 如果超过最大条目数，删除最旧的（开头的）
    if (this.cache.size >= this.config.maxEntries) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, entry)
  }

  /**
   * 获取所有条目
   */
  getAll(): CacheEntry[] {
    return Array.from(this.cache.values())
  }

  /**
   * 从数组加载缓存
   */
  loadFromArray(entries: CacheEntry[]): void {
    this.cache.clear()
    // 按时间戳排序，旧的在前
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)
    for (const entry of sorted) {
      // 只加载未过期的
      if (Date.now() - entry.timestamp <= this.config.ttlMs) {
        this.cache.set(entry.inputHash, entry)
      }
    }
  }

  /**
   * 获取当前条目数
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }
}

// ============ 响应缓存服务 ============

export class ResponseCacheService {
  private lruCache: LRUCache
  private config: ResponseCacheConfig
  private storage?: StorageDriver
  private stats: CacheStats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    currentEntries: 0,
    hitRate: 0,
  }

  constructor(config?: Partial<ResponseCacheConfig>, storage?: StorageDriver) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.lruCache = new LRUCache(this.config)
    this.storage = storage

    // 尝试从持久化存储加载
    if (this.config.enablePersistence && storage) {
      this.loadFromStorage().catch(() => {})
    }
  }

  /**
   * 从持久化存储加载缓存
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.storage) return

    try {
      const raw = await this.storage.getUserSetting(STORAGE_KEY)
      if (raw) {
        const entries = JSON.parse(raw) as CacheEntry[]
        // 只加载最多 maxPersistentEntries 条
        const limited = entries.slice(0, this.config.maxPersistentEntries)
        this.lruCache.loadFromArray(limited)
      }
    } catch {
      // 加载失败不影响功能
    }
  }

  /**
   * 保存缓存到持久化存储
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storage || !this.config.enablePersistence) return

    try {
      const entries = this.lruCache.getAll()
      // 只保存最近的 N 条
      const toSave = entries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.config.maxPersistentEntries)
      await this.storage.saveUserSetting(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // 保存失败不影响功能
    }
  }

  /**
   * 精确匹配查找缓存
   */
  private findExactMatch(
    normalizedInput: string,
    characterId: string,
    modelId: string
  ): CacheEntry | null {
    const inputHash = hashString(normalizedInput)
    const entry = this.lruCache.get(inputHash)

    if (
      entry &&
      entry.characterId === characterId &&
      entry.modelId === modelId
    ) {
      return entry
    }

    return null
  }

  /**
   * 模糊匹配查找缓存（使用 embedding 相似度）
   */
  private async findFuzzyMatch(
    normalizedInput: string,
    characterId: string,
    modelId: string
  ): Promise<CacheEntry | null> {
    if (!this.config.enableFuzzyMatch) return null

    try {
      const provider = getEmbeddingProvider()
      const queryEmbedding = await provider.embed(normalizedInput)

      let bestMatch: CacheEntry | null = null
      let bestScore = this.config.fuzzyMatchThreshold

      for (const entry of this.lruCache.getAll()) {
        // 只比较同角色同模型的
        if (entry.characterId !== characterId || entry.modelId !== modelId) {
          continue
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.config.ttlMs) {
          continue
        }

        if (entry.embedding) {
          const score = cosineSimilarity(queryEmbedding, entry.embedding)
          if (score > bestScore) {
            bestScore = score
            bestMatch = entry
          }
        }
      }

      return bestMatch
    } catch {
      // embedding 失败，退回精确匹配
      return null
    }
  }

  /**
   * 获取缓存响应
   * @param userInput 用户原始输入
   * @param characterId 角色ID
   * @param modelId 模型ID
   * @param isMultiTurn 是否多轮对话（多轮对话不使用缓存）
   * @returns 缓存的回复，如果未命中则返回 null
   */
  async get(
    userInput: string,
    characterId: string,
    modelId: string,
    isMultiTurn = false
  ): Promise<string | null> {
    this.stats.totalRequests++

    // 多轮对话不使用缓存（上下文不同，回复可能不同）
    if (isMultiTurn) {
      this.stats.misses++
      return null
    }

    // 检查输入是否适合缓存
    if (!shouldCacheInput(userInput, this.config)) {
      this.stats.misses++
      return null
    }

    const normalized = normalizeInput(userInput)

    // 先尝试精确匹配
    let entry = this.findExactMatch(normalized, characterId, modelId)

    // 精确匹配未命中，尝试模糊匹配
    if (!entry && this.config.enableFuzzyMatch) {
      entry = await this.findFuzzyMatch(normalized, characterId, modelId)
    }

    if (entry) {
      this.stats.hits++
      this.updateHitRate()
      return entry.response
    }

    this.stats.misses++
    this.updateHitRate()
    return null
  }

  /**
   * 设置缓存
   * @param userInput 用户原始输入
   * @param characterId 角色ID
   * @param modelId 模型ID
   * @param response 模型回复
   * @param isMultiTurn 是否多轮对话（多轮对话不缓存）
   */
  async set(
    userInput: string,
    characterId: string,
    modelId: string,
    response: string,
    isMultiTurn = false
  ): Promise<void> {
    // 多轮对话不缓存
    if (isMultiTurn) return

    // 检查输入是否适合缓存
    if (!shouldCacheInput(userInput, this.config)) return

    const normalized = normalizeInput(userInput)
    const inputHash = hashString(normalized)

    // 计算 embedding（如果启用模糊匹配）
    let embedding: number[] | undefined
    if (this.config.enableFuzzyMatch) {
      try {
        const provider = getEmbeddingProvider()
        embedding = await provider.embed(normalized)
      } catch {
        // embedding 失败不影响缓存
      }
    }

    const entry: CacheEntry = {
      input: normalized,
      response,
      characterId,
      modelId,
      timestamp: Date.now(),
      hitCount: 0,
      inputHash,
      embedding,
    }

    this.lruCache.set(inputHash, entry)
    this.stats.currentEntries = this.lruCache.size()

    // 异步保存到持久化存储
    this.saveToStorage().catch(() => {})
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    this.stats.currentEntries = this.lruCache.size()
    return { ...this.stats }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      currentEntries: this.lruCache.size(),
      hitRate: 0,
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.lruCache.clear()
    this.stats.currentEntries = 0
    if (this.storage) {
      await this.storage.saveUserSetting(STORAGE_KEY, JSON.stringify([]))
    }
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<ResponseCacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
    // 重新创建 LRU 缓存以应用新的 maxEntries
    const entries = this.lruCache.getAll()
    this.lruCache = new LRUCache(this.config)
    this.lruCache.loadFromArray(entries)
  }

  /**
   * 获取当前配置
   */
  getConfig(): ResponseCacheConfig {
    return { ...this.config }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests
    }
  }
}

// ============ 单例实例 ============

let globalCacheInstance: ResponseCacheService | null = null

/**
 * 获取全局响应缓存实例
 */
export function getResponseCache(storage?: StorageDriver): ResponseCacheService {
  if (!globalCacheInstance) {
    globalCacheInstance = new ResponseCacheService(undefined, storage)
  }
  return globalCacheInstance
}

/**
 * 初始化响应缓存
 */
export function initResponseCache(
  config?: Partial<ResponseCacheConfig>,
  storage?: StorageDriver
): ResponseCacheService {
  globalCacheInstance = new ResponseCacheService(config, storage)
  return globalCacheInstance
}

/**
 * 判断是否适合使用缓存（外部调用方使用）
 */
export function shouldUseCacheForInput(
  input: string,
  config?: Partial<ResponseCacheConfig>
): boolean {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  return shouldCacheInput(input, fullConfig)
}
