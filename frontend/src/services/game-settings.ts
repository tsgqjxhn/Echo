/**
 * 游戏设置服务
 * 负责管理全局游戏开关和会话级游戏开关
 */

import type { GameSettings } from '@/types/game';
import type { StorageDriver } from './storage';

/**
 * 游戏设置服务类
 */
export class GameSettingsService {
  private storage: StorageDriver;
  private settings: GameSettings = {
    globalEnabled: true,
    sessionEnabled: {},
    difficultyLevel: 'normal',
    baseSuccessRate: 50
  };
  private initialized = false;

  constructor(storage: StorageDriver) {
    this.storage = storage;
  }

  /**
   * 初始化设置服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.loadSettings();
    this.initialized = true;
  }

  /**
   * 加载设置
   */
  async loadSettings(): Promise<void> {
    try {
      const saved = await this.storage.getGameSettings();
      if (saved) {
        this.settings = saved;
      }
    } catch (error) {
      console.error('加载游戏设置失败:', error);
      // 使用默认设置
      this.settings = {
        globalEnabled: true,
        sessionEnabled: {},
        difficultyLevel: 'normal',
        baseSuccessRate: 50
      };
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.storage.saveGameSettings(this.settings);
  }

  /**
   * 设置全局开关
   * @param enabled 是否启用
   */
  async setGlobalEnabled(enabled: boolean): Promise<void> {
    this.settings.globalEnabled = enabled;
    await this.saveSettings();
  }

  /**
   * 获取全局开关状态
   */
  isGlobalEnabled(): boolean {
    return this.settings.globalEnabled;
  }

  /**
   * 设置会话开关
   * @param sessionId 会话 ID
   * @param enabled 是否启用
   */
  async setSessionEnabled(sessionId: string, enabled: boolean): Promise<void> {
    this.settings.sessionEnabled[sessionId] = enabled;
    await this.saveSettings();
  }

  /**
   * 获取会话开关状态
   * @param sessionId 会话 ID
   */
  isSessionEnabled(sessionId: string): boolean {
    // 默认启用，除非明确设置为 false
    return this.settings.sessionEnabled[sessionId] !== false;
  }

  /**
   * 切换会话开关状态
   * @param sessionId 会话 ID
   */
  async toggleSessionEnabled(sessionId: string): Promise<boolean> {
    const current = this.isSessionEnabled(sessionId);
    this.settings.sessionEnabled[sessionId] = !current;
    await this.saveSettings();
    return !current;
  }

  /**
   * 检查是否可以触发游戏（聊天触发模式）
   * 需要全局开关和会话开关都为 true
   * @param sessionId 会话 ID
   */
  canTriggerGame(sessionId: string): boolean {
    return this.settings.globalEnabled && this.isSessionEnabled(sessionId);
  }

  /**
   * 获取当前设置快照
   */
  getSettings(): GameSettings {
    return { ...this.settings };
  }

  /**
   * 重置为默认设置
   */
  async reset(): Promise<void> {
    this.settings = {
      globalEnabled: true,
      sessionEnabled: {},
      difficultyLevel: 'normal',
      baseSuccessRate: 50
    };
    await this.saveSettings();
  }

  /**
   * 设置难度等级
   */
  async setDifficultyLevel(level: 'easy' | 'normal' | 'hard'): Promise<void> {
    this.settings.difficultyLevel = level;
    await this.saveSettings();
  }

  /**
   * 获取难度等级
   */
  getDifficultyLevel(): 'easy' | 'normal' | 'hard' {
    return this.settings.difficultyLevel;
  }

  /**
   * 设置基础成功率
   */
  async setBaseSuccessRate(rate: number): Promise<void> {
    this.settings.baseSuccessRate = Math.max(0, Math.min(100, rate));
    await this.saveSettings();
  }

  /**
   * 获取基础成功率
   */
  getBaseSuccessRate(): number {
    return this.settings.baseSuccessRate;
  }
}
