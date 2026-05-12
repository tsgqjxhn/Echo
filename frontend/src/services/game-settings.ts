/**
 * 游戏设置服务
 * 负责管理全局游戏开关、音效、BGM、伤害显示、消息推送及导入导出
 */

import type { GameSettings, GameExportData } from '@/types/game'
import type { StorageDriver } from './storage'

const STORAGE_KEY = 'xiang_game_settings'

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: GameSettings = {
  globalEnabled: true,
  sessionEnabled: {},
  globalSoundEnabled: true,
  globalBgmEnabled: true,
  damageDisplayEnabled: true,
  gameNotificationsEnabled: true,
  gameNotifications: [],
}

/** 导出/导入超时时间 (ms) */
const EXPORT_IMPORT_TIMEOUT = 5000

/** 等待中的导出请求 */
interface PendingExport {
  timer: ReturnType<typeof setTimeout>
  resolve: (data: GameExportData) => void
  reject: (err: Error) => void
}

/** 等待中的导入请求 */
interface PendingImport {
  timer: ReturnType<typeof setTimeout>
  resolve: () => void
  reject: (err: Error) => void
}

/** iframe 注册信息 */
interface RegisteredIframe {
  el: HTMLIFrameElement
  hostSource: string
}

/**
 * 游戏设置服务类
 */
export class GameSettingsService {
  private storage: StorageDriver
  private settings: GameSettings = { ...DEFAULT_SETTINGS }
  private initialized = false

  /** 等待中的导出请求表 */
  private pendingExports: Map<string, PendingExport> = new Map()
  /** 等待中的导入请求表 */
  private pendingImports: Map<string, PendingImport> = new Map()
  /** 已注册的 iframe 表 */
  private registeredIframes: Map<string, RegisteredIframe> = new Map()

  constructor(storage: StorageDriver) {
    this.storage = storage
  }

  /**
   * 初始化设置服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    await this.loadSettings()
    this.initialized = true
  }

  /**
   * 加载设置
   */
  async loadSettings(): Promise<void> {
    try {
      const saved = await this.storage.getGameSettings()
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...saved }
      }
    } catch (error) {
      console.error('加载游戏设置失败:', error)
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.storage.saveGameSettings(this.settings)
  }

  /**
   * 获取当前设置快照
   */
  getSettings(): GameSettings {
    return { ...this.settings }
  }

  /**
   * 重置为默认设置
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS }
    await this.saveSettings()
  }

  // ==================== 全局开关 ====================

  /**
   * 设置全局开关
   */
  async setGlobalEnabled(enabled: boolean): Promise<void> {
    this.settings.globalEnabled = enabled
    await this.saveSettings()
  }

  /**
   * 获取全局开关状态
   */
  isGlobalEnabled(): boolean {
    return this.settings.globalEnabled
  }

  // ==================== 会话开关 ====================

  /**
   * 设置会话开关
   */
  async setSessionEnabled(sessionId: string, enabled: boolean): Promise<void> {
    this.settings.sessionEnabled[sessionId] = enabled
    await this.saveSettings()
  }

  /**
   * 获取会话开关状态
   */
  isSessionEnabled(sessionId: string): boolean {
    return this.settings.sessionEnabled[sessionId] !== false
  }

  /**
   * 切换会话开关状态
   */
  async toggleSessionEnabled(sessionId: string): Promise<boolean> {
    const current = this.isSessionEnabled(sessionId)
    this.settings.sessionEnabled[sessionId] = !current
    await this.saveSettings()
    return !current
  }

  /**
   * 检查是否可以触发游戏
   */
  canTriggerGame(sessionId: string): boolean {
    return this.settings.globalEnabled && this.isSessionEnabled(sessionId)
  }

  // ==================== 音效 / BGM ====================

  /**
   * 设置全局音效开关
   */
  async setGlobalSoundEnabled(v: boolean): Promise<void> {
    this.settings.globalSoundEnabled = v
    await this.saveSettings()
  }

  /**
   * 获取全局音效开关
   */
  isGlobalSoundEnabled(): boolean {
    return this.settings.globalSoundEnabled
  }

  /**
   * 设置全局背景音乐开关
   */
  async setGlobalBgmEnabled(v: boolean): Promise<void> {
    this.settings.globalBgmEnabled = v
    await this.saveSettings()
  }

  /**
   * 获取全局背景音乐开关
   */
  isGlobalBgmEnabled(): boolean {
    return this.settings.globalBgmEnabled
  }

  // ==================== 伤害显示 ====================

  /**
   * 设置伤害显示开关
   */
  async setDamageDisplayEnabled(v: boolean): Promise<void> {
    this.settings.damageDisplayEnabled = v
    await this.saveSettings()
  }

  /**
   * 获取伤害显示开关
   */
  isDamageDisplayEnabled(): boolean {
    return this.settings.damageDisplayEnabled
  }

  // ==================== 游戏消息推送 ====================

  /**
   * 设置游戏消息推送开关
   */
  async setGameNotificationsEnabled(v: boolean): Promise<void> {
    this.settings.gameNotificationsEnabled = v
    await this.saveSettings()
  }

  /**
   * 获取游戏消息推送开关
   */
  isGameNotificationsEnabled(): boolean {
    return this.settings.gameNotificationsEnabled
  }

  /**
   * 订阅游戏消息类型
   */
  async subscribeGameNotification(type: string): Promise<void> {
    if (!this.settings.gameNotifications.includes(type)) {
      this.settings.gameNotifications.push(type)
      await this.saveSettings()
    }
  }

  /**
   * 取消订阅游戏消息类型
   */
  async unsubscribeGameNotification(type: string): Promise<void> {
    const idx = this.settings.gameNotifications.indexOf(type)
    if (idx >= 0) {
      this.settings.gameNotifications.splice(idx, 1)
      await this.saveSettings()
    }
  }

  /**
   * 检查是否已订阅某消息类型
   */
  isSubscribed(type: string): boolean {
    return this.settings.gameNotifications.includes(type)
  }

  // ==================== iframe 注册 ====================

  /**
   * 注册 iframe 元素，用于 postMessage 通信
   */
  registerIframe(gameId: string, el: HTMLIFrameElement, hostSource: string): void {
    this.registeredIframes.set(gameId, { el, hostSource })
  }

  /**
   * 注销 iframe
   */
  unregisterIframe(gameId: string): void {
    this.registeredIframes.delete(gameId)
  }

  /**
   * 向已注册的 iframe 发送消息
   */
  postToGame(gameId: string, payload: Record<string, unknown>): void {
    const reg = this.registeredIframes.get(gameId)
    if (!reg) return
    reg.el.contentWindow?.postMessage({ source: reg.hostSource, ...payload }, '*')
  }

  // ==================== 导出 / 导入 ====================

  /**
   * 导出游戏数据
   * 通过 iframe postMessage 请求游戏导出存档
   */
  exportGameData(gameId: string): Promise<GameExportData> {
    return new Promise<GameExportData>((resolve, reject) => {
      // 清除同 gameId 的旧请求
      const old = this.pendingExports.get(gameId)
      if (old) {
        clearTimeout(old.timer)
        old.reject(new Error('cancelled'))
      }

      const timer = setTimeout(() => {
        this.pendingExports.delete(gameId)
        reject(new Error('导出超时'))
      }, EXPORT_IMPORT_TIMEOUT)

      this.pendingExports.set(gameId, { timer, resolve, reject })

      // 通过 iframe 发送导出请求
      this.postToGame(gameId, { type: 'game-export-request' })
    })
  }

  /**
   * 处理来自 iframe 的导出响应
   * 由 play.vue 在收到 game-export-data 消息时调用
   */
  handleExportResponse(gameId: string, data: GameExportData): void {
    const pending = this.pendingExports.get(gameId)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pendingExports.delete(gameId)
    pending.resolve(data)
  }

  /**
   * 导入游戏数据
   * 通过 iframe postMessage 将存档数据发给游戏
   */
  importGameData(gameId: string, data: GameExportData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const old = this.pendingImports.get(gameId)
      if (old) {
        clearTimeout(old.timer)
        old.reject(new Error('cancelled'))
      }

      const timer = setTimeout(() => {
        this.pendingImports.delete(gameId)
        reject(new Error('导入超时'))
      }, EXPORT_IMPORT_TIMEOUT)

      this.pendingImports.set(gameId, { timer, resolve, reject })

      this.postToGame(gameId, { type: 'game-import-request', data })
    })
  }

  /**
   * 处理来自 iframe 的导入响应
   * 由 play.vue 在收到 game-import-result 消息时调用
   */
  handleImportResponse(gameId: string, success: boolean): void {
    const pending = this.pendingImports.get(gameId)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pendingImports.delete(gameId)
    if (success) {
      pending.resolve()
    } else {
      pending.reject(new Error('导入失败'))
    }
  }

  /**
   * 向 iframe 同步当前设置
   */
  syncSettingsToGame(gameId: string): void {
    const s = this.settings
    this.postToGame(gameId, {
      type: 'game-settings-changed',
      settings: {
        globalSoundEnabled: s.globalSoundEnabled,
        globalBgmEnabled: s.globalBgmEnabled,
        damageDisplayEnabled: s.damageDisplayEnabled,
        gameNotificationsEnabled: s.gameNotificationsEnabled,
        gameNotifications: [...s.gameNotifications],
      },
    })
  }
}

/**
 * 从 localStorage 直接读取游戏设置（供 notification.ts 等避免循环依赖的场景使用）
 */
export function readGameSettingsFromStorage(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS }
}
