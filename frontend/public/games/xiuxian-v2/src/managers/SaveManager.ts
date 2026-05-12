/**
 * 《问道长生》Phaser 3 重构版 —— 存档管理器
 * Phase 1: 核心基础设施
 *
 * 负责游戏存档的持久化存储、加载、导出/导入及自动保存功能。
 * 存档数据使用简单 XOR 加密 + 校验和防篡改。
 * 所有存档操作基于 localStorage。
 */

import type { GameSaveData, SaveSlotInfo } from '../types';
import { GameStateManager } from './GameStateManager';
import { EventBus, GameEventType } from './EventBus';
import { deepClone } from '../utils';
import { migrateSaveData } from './saveMigration';

export { migrateSaveData } from './saveMigration';

/** localStorage 键名前缀 */
const STORAGE_PREFIX = 'xiuxian_v2_save_';
/** 存档数据版本号 */
const SAVE_VERSION = '1.0.0';
/** 默认 XOR 加密密钥（可扩展为从玩家数据派生） */
const XOR_KEY = 0x7a; // 十六进制 0x7a = 字符 'z'

/**
 * 存档管理器
 * 单例模式，统一管理所有存档槽位的读写操作。
 */
export class SaveManager {
  private static _instance: SaveManager | null = null;
  private _eventBus: EventBus;
  private _gameState: GameStateManager;

  /** 自动保存定时器 ID */
  private _autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  /** 自动保存间隔（毫秒），默认 60 秒 */
  private _autoSaveInterval: number = 60000;
  /** 当前使用的存档槽位 */
  private _currentSlot: number = 0;

  private constructor() {
    this._eventBus = EventBus.getInstance();
    this._gameState = GameStateManager.getInstance();
  }

  /** 获取 SaveManager 单例实例 */
  public static getInstance(): SaveManager {
    if (!SaveManager._instance) {
      SaveManager._instance = new SaveManager();
    }
    return SaveManager._instance;
  }

  // ==========================================================================
  // 核心存取
  // ==========================================================================

  /**
   * 保存游戏到指定槽位
   * @param slot 存档槽位编号，默认 0
   * @returns 是否保存成功
   */
  public save(slot: number = 0): boolean {
    try {
      const data = this._gameState.serialize();
      const saveData = this._buildSaveData(data);
      const encrypted = this._encrypt(saveData);
      const checksum = this._computeChecksum(encrypted);
      const wrapped = JSON.stringify({ data: encrypted, checksum, version: SAVE_VERSION });

      localStorage.setItem(`${STORAGE_PREFIX}${slot}`, wrapped);
      this._currentSlot = slot;

      this._eventBus.emit(GameEventType.SAVE_COMPLETED, { slot, success: true });
      return true;
    } catch (error) {
      console.error(`[SaveManager] 存档槽位 ${slot} 保存失败:`, error);
      this._eventBus.emit(GameEventType.SAVE_COMPLETED, { slot, success: false });
      return false;
    }
  }

  /**
   * 从指定槽位加载游戏
   * @param slot 存档槽位编号，默认 0
   * @returns 加载的存档数据，或 null（存档不存在/损坏）
   */
  public load(slot: number = 0): GameSaveData | null {
    try {
      const wrapped = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
      if (!wrapped) return null;

      const parsed = JSON.parse(wrapped) as {
        data: string;
        checksum: string;
        version: string;
      };

      // 校验和验证
      if (parsed.checksum !== this._computeChecksum(parsed.data)) {
        console.warn(`[SaveManager] 存档槽位 ${slot} 校验和不匹配，可能已被篡改`);
        return null;
      }

      const decrypted = this._decrypt(parsed.data);
      let saveData = JSON.parse(decrypted) as GameSaveData;

      // 版本检查与存档迁移
      if (saveData.version !== SAVE_VERSION) {
        console.warn(`[SaveManager] 存档版本 ${saveData.version} 与当前版本 ${SAVE_VERSION} 不一致，执行迁移`);
        saveData = migrateSaveData(saveData);
      }

      // 恢复到 GameStateManager
      this._gameState.deserialize(JSON.stringify(saveData));
      this._currentSlot = slot;

      return saveData;
    } catch (error) {
      console.error(`[SaveManager] 存档槽位 ${slot} 加载失败:`, error);
      return null;
    }
  }

  /**
   * 检查指定槽位是否存在有效存档
   * @param slot 存档槽位编号
   */
  public hasSave(slot: number): boolean {
    const key = `${STORAGE_PREFIX}${slot}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * 删除指定槽位的存档
   * @param slot 存档槽位编号
   */
  public deleteSave(slot: number): boolean {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${slot}`);
      return true;
    } catch (error) {
      console.error(`[SaveManager] 删除存档槽位 ${slot} 失败:`, error);
      return false;
    }
  }

  // ==========================================================================
  // 自动保存
  // ==========================================================================

  /**
   * 启动自动保存
   * 按设定间隔自动将当前状态写入当前槽位
   * @param interval 间隔毫秒数，不传则使用当前设置
   */
  public startAutoSave(interval?: number): void {
    this.stopAutoSave();
    if (interval !== undefined) {
      this._autoSaveInterval = Math.max(10000, interval); // 最小 10 秒
    }
    this._autoSaveTimer = setInterval(() => {
      this.save(this._currentSlot);
    }, this._autoSaveInterval);
  }

  /** 停止自动保存 */
  public stopAutoSave(): void {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  }

  /** 设置自动保存间隔（不影响已启动的定时器） */
  public setAutoSaveInterval(interval: number): void {
    this._autoSaveInterval = Math.max(10000, interval);
  }

  // ==========================================================================
  // 导出 / 导入（Base64 编码 JSON）
  // ==========================================================================

  /**
   * 导出当前存档为 Base64 字符串
   * 可用于跨设备迁移或分享存档
   * @returns Base64 编码的存档字符串
   */
  public exportSave(): string {
    const data = this._gameState.serialize();
    const saveData = this._buildSaveData(data);
    const encrypted = this._encrypt(saveData);
    const checksum = this._computeChecksum(encrypted);
    const wrapped = JSON.stringify({
      data: encrypted,
      checksum,
      version: SAVE_VERSION,
      exportedAt: Date.now(),
    });

    // 使用 btoa 编码为 Base64
    try {
      return btoa(unescape(encodeURIComponent(wrapped)));
    } catch {
      // 兼容处理
      return btoa(wrapped);
    }
  }

  /**
   * 从 Base64 字符串导入存档
   * @param base64Data Base64 编码的存档字符串
   * @returns 是否导入成功
   */
  public importSave(base64Data: string): boolean {
    try {
      // 解码 Base64
      let decoded: string;
      try {
        decoded = decodeURIComponent(escape(atob(base64Data)));
      } catch {
        decoded = atob(base64Data);
      }

      const parsed = JSON.parse(decoded) as {
        data: string;
        checksum: string;
        version: string;
        exportedAt?: number;
      };

      // 校验和验证
      if (parsed.checksum !== this._computeChecksum(parsed.data)) {
        console.warn('[SaveManager] 导入存档校验和不匹配');
        return false;
      }

      const decrypted = this._decrypt(parsed.data);
      let saveData = JSON.parse(decrypted) as GameSaveData;

      // 执行存档迁移（导入的旧存档可能没有新版本字段）
      saveData = migrateSaveData(saveData);

      // 恢复到 GameStateManager
      this._gameState.deserialize(JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('[SaveManager] 导入存档失败:', error);
      return false;
    }
  }

  // ==========================================================================
  // 存档列表
  // ==========================================================================

  /**
   * 获取所有存档槽位的信息列表
   * @param maxSlots 最大检查槽位数，默认 10
   * @returns 存档槽位信息数组
   */
  public listSaves(maxSlots: number = 10): SaveSlotInfo[] {
    const list: SaveSlotInfo[] = [];

    for (let slot = 0; slot < maxSlots; slot++) {
      const info: SaveSlotInfo = { slot, exists: false };
      const wrapped = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);

      if (wrapped) {
        try {
          const parsed = JSON.parse(wrapped) as {
            data: string;
            checksum: string;
          };

          if (parsed.checksum === this._computeChecksum(parsed.data)) {
            const decrypted = this._decrypt(parsed.data);
            const saveData = JSON.parse(decrypted) as GameSaveData;

            info.exists = true;
            info.playerName = saveData.player.name;
            info.year = saveData.gameTime.year;
            info.updatedAt = saveData.updatedAt;
          }
        } catch {
          // 损坏的存档，标记为存在但信息不完整
          info.exists = true;
        }
      }

      list.push(info);
    }

    return list;
  }

  // ==========================================================================
  // 内部加密 / 校验方法
  // ==========================================================================

  /**
   * 构建标准存档数据结构
   * @param serializedState GameStateManager.serialize() 的输出
   */
  private _buildSaveData(serializedState: string): string {
    const state = JSON.parse(serializedState);
    const saveData: GameSaveData = {
    version: SAVE_VERSION,
    createdAt: state.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    player: state.player,
    gameTime: state.gameTime,
    techniques: state.techniques ?? [],
    inventory: state.inventory ?? [],
    sectMembership: state.sectMembership,
    daoProgress: state.daoProgress ?? {},
    worldProgress: state.worldProgress ?? {
      unlockedRegions: [],
      regionProgress: {},
      defeatedBosses: [],
      completedStoryEvents: [],
    },
    activeEffects: state.activeEffects ?? [],
    settings: state.settings,
    // Phase 8: 新增字段兼容
    codexUnlocks: state.codexUnlocks ?? {},
    messages: state.messages ?? [],
    dwelling: state.dwelling ?? { arrayLevel: 1, gardenLevel: 1, plantedHerbs: [], isCultivating: false, cultivateStartMonth: 0 },
  };
    return JSON.stringify(saveData);
  }

  /**
   * XOR 加密
   * 简单的字节级异或加密，足够阻止 casual inspection
   * @param text 明文
   * @returns 十六进制字符串形式的密文
   */
  private _encrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const byte = text.charCodeAt(i) ^ XOR_KEY;
      result += byte.toString(16).padStart(2, '0');
    }
    return result;
  }

  /**
   * XOR 解密
   * @param hex 十六进制字符串形式的密文
   * @returns 明文
   */
  private _decrypt(hex: string): string {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16) ^ XOR_KEY;
      result += String.fromCharCode(byte);
    }
    return result;
  }

  /**
   * 计算校验和
   * 使用简单加法校验和，用于检测存档篡改
   * @param data 待校验数据
   * @returns 校验和字符串
   */
  private _computeChecksum(data: string): string {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data.charCodeAt(i);
      // 模拟溢出，保持数值在合理范围内
      sum = sum & 0xffffffff;
    }
    return sum.toString(16).padStart(8, '0');
  }
}

/** 全局便捷访问导出 */
export const saveManager = SaveManager.getInstance();
