/**
 * 《问道长生》Phaser 3 重构版 —— 游戏状态管理器
 * Phase 3A: 集成时间系统 + 修炼系统
 *
 * 采用三层状态架构管理所有游戏数据：
 * - Layer 1 (Runtime): 运行时高频变更状态（玩家当前HP/MP、时间等）
 * - Layer 2 (Business): 业务低频变更状态（功法、背包、悟道进度等）
 * - Layer 3 (Persistent): 持久化状态（由 SaveManager 负责读写）
 *
 * 所有状态变更必须通过 transaction() 方法执行，确保原子性和一致性，
 * 变更完成后自动通过 EventBus 广播相应事件。
 */

import {
  PlayerData,
  GameTime,
  BuffEffect,
  Technique,
  Item,
  SectMembership,
  DaoPath,
  WorldProgress,
  StateUpdate,
  GameSettings,
  GameMessage,
  DwellingState,
  CodexUnlocks,
} from '../types';
import { EventBus, GameEventType } from './EventBus';
import { deepClone, getByPath, setByPath } from '../utils';
import { TimeSystem } from '../systems/TimeSystem';
import { CultivationSystem, type BreakthroughResult } from '../systems/CultivationSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { SectSystem } from '../systems/SectSystem';
import { DaoSystem } from '../systems/DaoSystem';
import { AlchemySystem } from '../systems/AlchemySystem';
import { ForgeSystem } from '../systems/ForgeSystem';
import { ExplorationSystem } from '../systems/ExplorationSystem';
import { createNewPlayer, createDefaultGameTime, type OfflineProgress } from '../models/PlayerData';
import { REALMS, getRealmConfig, getRealmIndex, getItemConfig, LIFESPAN_WARNING_THRESHOLD } from '../data/gameData';
import { migrateSaveData } from './saveMigration';

/**
 * 运行时状态层（高频变更）
 * 包含游戏进行中持续变化的核心数据
 */
export interface RuntimeState {
  /** 玩家完整数据 */
  player: PlayerData;
  /** 游戏内时间 */
  gameTime: GameTime;
  /** 当前激活的临时效果 */
  activeEffects: BuffEffect[];
}

/**
 * 业务状态层（低频变更）
 * 包含相对稳定、仅在特定操作下变更的数据
 */
export interface BusinessState {
  /** 已学习的功法列表 */
  techniques: Technique[];
  /** 背包物品列表 */
  inventory: Item[];
  /** 门派成员信息（可选，未加入门派时为 undefined） */
  sectMembership?: SectMembership;
  /** 各条大道的悟道进度，key 为大道ID */
  daoProgress: Record<string, DaoPath>;
  /** 世界探索进度 */
  worldProgress: WorldProgress;
  /** 图鉴解锁状态 */
  codexUnlocks: CodexUnlocks;
  /** 传音符消息列表 */
  messages: GameMessage[];
  /** 洞府状态 */
  dwelling: DwellingState;
}

/**
 * 完整游戏状态快照
 * 包含所有三层状态的合并视图
 */
export interface GameStateSnapshot {
  runtime: RuntimeState;
  business: BusinessState;
  settings: GameSettings;
}

/** 默认游戏设置 */
const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1.0,
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  autoSaveInterval: 60000,
  textSpeed: 40,
  skipReadEvents: false,
};

/** 创建默认世界进度 */
function createDefaultWorldProgress(): WorldProgress {
  return {
    unlockedRegions: ['starting_village'],
    regionProgress: { starting_village: 0 },
    defeatedBosses: [],
    completedStoryEvents: [],
  };
}

/**
 * 游戏状态管理器
 * 单例模式，负责所有游戏状态的集中管理与事务性更新。
 */
export class GameStateManager {
  private static _instance: GameStateManager | null = null;
  private _eventBus: EventBus;

  /** Layer 1: 运行时状态 */
  private _runtimeState: RuntimeState;
  /** Layer 2: 业务状态 */
  private _businessState: BusinessState;
  /** Layer 3: 游戏设置（持久化） */
  private _settings: GameSettings;

  /** 时间系统 */
  private _timeSystem: TimeSystem;
  /** 修炼系统 */
  private _cultivationSystem: CultivationSystem;
  /** 战斗系统 */
  private _combatSystem: CombatSystem;
  /** 门派系统 */
  private _sectSystem: SectSystem;
  /** 悟道系统 */
  private _daoSystem: DaoSystem;
  /** 炼丹系统 */
  private _alchemySystem: AlchemySystem;
  /** 炼器系统 */
  private _forgeSystem: ForgeSystem;
  /** 探索系统 */
  private _explorationSystem: ExplorationSystem;

  /** 事务进行中标记，防止嵌套事务 */
  private _inTransaction = false;
  /** 累计修为增量（tick缓存） */
  private _pendingExpDelta = 0;
  /** tick 计数器 */
  private _tickCounter = 0;

  private constructor() {
    this._eventBus = EventBus.getInstance();

    const player = createNewPlayer();
    const gameTime = createDefaultGameTime();

    this._runtimeState = {
      player,
      gameTime,
      activeEffects: [],
    };
    this._businessState = {
      techniques: [],
      inventory: [
        // 初始赠送护道符（首次大境界突破使用）
        {
          id: 'hudaofu',
          name: '护道符',
          type: 'misc',
          rarity: 4,
          quantity: 1,
          maxStack: 1,
          description: '首次大境界突破时自动消耗，确保突破成功',
          icon: 'item_hudaofu',
        },
      ],
      daoProgress: {},
      worldProgress: createDefaultWorldProgress(),
      codexUnlocks: {},
      messages: [],
      dwelling: {
        arrayLevel: 1,
        gardenLevel: 1,
        plantedHerbs: [],
        isCultivating: false,
        cultivateStartMonth: 0,
      },
    };
    this._settings = deepClone(DEFAULT_SETTINGS);

    // 初始化时间系统
    this._timeSystem = new TimeSystem(gameTime, player.cultivation.realm);
    // 初始化修炼系统
    this._cultivationSystem = new CultivationSystem({
      spiritDensity: 1.0,
      arrayLevel: 1,
      techniqueBonus: 1.0,
      breakthroughGuarantee: 0,
      usedTreasures: [],
    });
    // 初始化战斗系统
    this._combatSystem = new CombatSystem();
    // 初始化门派系统
    this._sectSystem = new SectSystem();
    // 初始化悟道系统
    this._daoSystem = new DaoSystem();
    // 初始化炼丹系统
    this._alchemySystem = new AlchemySystem();
    // 初始化炼器系统
    this._forgeSystem = new ForgeSystem();
    // 初始化探索系统
    this._explorationSystem = new ExplorationSystem();
  }

  /** 获取 GameStateManager 单例实例 */
  public static getInstance(): GameStateManager {
    if (!GameStateManager._instance) {
      GameStateManager._instance = new GameStateManager();
    }
    return GameStateManager._instance;
  }

  // ==========================================================================
  // 核心系统访问器
  // ==========================================================================

  /** 获取时间系统 */
  public get timeSystem(): TimeSystem {
    return this._timeSystem;
  }

  /** 获取修炼系统 */
  public get cultivationSystem(): CultivationSystem {
    return this._cultivationSystem;
  }

  /** 获取战斗系统 */
  public get combatSystem(): CombatSystem {
    return this._combatSystem;
  }

  /** 获取门派系统 */
  public get sectSystem(): SectSystem {
    return this._sectSystem;
  }

  /** 获取悟道系统 */
  public get daoSystem(): DaoSystem {
    return this._daoSystem;
  }

  /** 获取炼丹系统 */
  public get alchemySystem(): AlchemySystem {
    return this._alchemySystem;
  }

  /** 获取炼器系统 */
  public get forgeSystem(): ForgeSystem {
    return this._forgeSystem;
  }

  /** 获取探索系统 */
  public get explorationSystem(): ExplorationSystem {
    return this._explorationSystem;
  }

  /**
   * 开始战斗
   * @param enemyId 敌人ID
   * @param type 战斗类型
   * @returns 战斗状态
   */
  public startBattle(enemyId: string, type: 'normal' | 'boss' | 'breakthrough' | 'arena' = 'normal'): import('../types').BattleState {
    const playerData = this._runtimeState.player;
    return this._combatSystem.startBattle(enemyId, type, playerData);
  }

  // ==========================================================================
  // 状态访问器
  // ==========================================================================

  /** 获取运行时状态（只读快照） */
  public get runtimeState(): Readonly<RuntimeState> {
    return deepClone(this._runtimeState);
  }

  /** 获取业务状态（只读快照） */
  public get businessState(): Readonly<BusinessState> {
    return deepClone(this._businessState);
  }

  /** 获取游戏设置 */
  public get settings(): Readonly<GameSettings> {
    return deepClone(this._settings);
  }

  /** 获取完整状态快照 */
  public getSnapshot(): GameStateSnapshot {
    return {
      runtime: deepClone(this._runtimeState),
      business: deepClone(this._businessState),
      settings: deepClone(this._settings),
    };
  }

  /** 获取玩家状态快照（供UI高频渲染使用） */
  public getPlayerSnapshot(): Readonly<PlayerData> {
    return deepClone(this._runtimeState.player);
  }

  /** 获取游戏时间快照 */
  public getTimeSnapshot(): Readonly<GameTime> {
    return deepClone(this._runtimeState.gameTime);
  }

  // ==========================================================================
  // 事务性更新（核心机制）
  // ==========================================================================

  /**
   * 执行事务性状态更新
   * 所有状态变更必须通过此方法执行，确保：
   * 1. 原子性：一组更新要么全部成功，要么全部回滚
   * 2. 一致性：更新完成后自动校验状态合法性
   * 3. 事件通知：变更后自动广播对应事件
   *
   * @param updates 状态更新操作数组
   * @throws 当事务嵌套或更新路径无效时抛出错误
   */
  public transaction(updates: StateUpdate[]): void {
    if (this._inTransaction) {
      throw new Error('[GameStateManager] 不支持嵌套事务');
    }

    this._inTransaction = true;
    const appliedUpdates: { path: string; oldValue: unknown; newValue: unknown }[] = [];

    try {
      for (const update of updates) {
        const oldValue = this._applySingleUpdate(update);
        appliedUpdates.push({
          path: update.path,
          oldValue,
          newValue: this._getValueByPath(update.path),
        });
      }

      // 校验状态合法性
      this._validateState();

      // 广播变更事件
      for (const change of appliedUpdates) {
        this._eventBus.emit(GameEventType.PLAYER_STATE_CHANGED, {
          path: change.path,
          oldValue: change.oldValue,
          newValue: change.newValue,
        });
      }
    } catch (error) {
      // 回滚已应用的更新
      this._rollback(appliedUpdates);
      throw error;
    } finally {
      this._inTransaction = false;
    }
  }

  /**
   * 便捷方法：修改玩家属性（按路径增加值）
   * @param path 属性路径，如 "cultivation.exp"、"stats.hp"
   * @param delta 变化量（正数增加，负数减少）
   * @param source 更新来源标识，用于日志
   */
  public modifyPlayer(path: string, delta: number, source?: string): void {
    this.transaction([
      {
        path: `player.${path}`,
        operation: 'add',
        value: delta,
        source,
      },
    ]);
  }

  /**
   * 便捷方法：设置玩家属性（直接赋值）
   * @param path 属性路径
   * @param value 目标值
   * @param source 更新来源标识
   */
  public setPlayer(path: string, value: unknown, source?: string): void {
    this.transaction([
      {
        path: `player.${path}`,
        operation: 'set',
        value,
        source,
      },
    ]);
  }

  // ==========================================================================
  // 时间系统封装
  // ==========================================================================

  /**
   * 推进游戏时间（使用 TimeSystem）
   * @param months 推进的月数
   */
  public advanceTime(months: number = 1): void {
    const oldTime = deepClone(this._runtimeState.gameTime);

    // 消耗寿命（每年1岁）
    const yearsPassed = Math.floor((oldTime.month + months - 1) / 12);
    if (yearsPassed > 0) {
      this.modifyPlayer('cultivation.lifespan', -yearsPassed, 'time_advance');
    }

    // 使用时间系统推进
    this._timeSystem.advanceMonths(months);

    // 同步回运行时状态
    this._runtimeState.gameTime = this._timeSystem.getGameTime();

    // 处理效果衰减
    this._decayEffects(months);

    // 门派每日刷新
    const oldMonth = oldTime.month;
    const newMonth = this._runtimeState.gameTime.month;
    if (oldMonth !== newMonth) {
      this._sectSystem.refreshDaily(
        this._runtimeState.gameTime.year,
        this._runtimeState.gameTime.month
      );
    }

    // 检查寿命警告
    this._checkLifespanWarning();

    const newTime = this._runtimeState.gameTime;
    this._eventBus.emit(GameEventType.TIME_ADVANCED, {
      year: newTime.year,
      month: newTime.month,
      actionPoints: newTime.actionPoints,
    });
  }

  /**
   * 消耗行动力
   * @param points 消耗点数
   * @returns 是否成功
   */
  public consumeActionPoints(points: number = 1): boolean {
    if (this._timeSystem.consumeActionPoint(points)) {
      this._runtimeState.gameTime = this._timeSystem.getGameTime();
      return true;
    }
    return false;
  }

  /** 获取当前行动力 */
  public getActionPoints(): number {
    return this._timeSystem.getActionPoints();
  }

  // ==========================================================================
  // 修炼系统封装
  // ==========================================================================

  /**
   * 游戏帧 tick —— 驱动修炼系统的修为增长
   * 由 Phaser 场景的 update() 循环调用
   * @param deltaMs 距上次调用的毫秒数
   */
  public tick(deltaMs: number): void {
    // 每 1 秒累积一次修为更新（避免过于频繁的 transaction）
    const deltaSec = deltaMs / 1000;
    const player = this._runtimeState.player;

    const expGained = this._cultivationSystem.tick(player, deltaSec);
    this._pendingExpDelta += expGained;
    this._tickCounter++;

    // 每秒同步一次到状态
    if (this._tickCounter >= 60) {
      // 约每秒（按60fps计算）
      this._tickCounter = 0;
      if (this._pendingExpDelta > 0) {
        this._applyCultivationTick(this._pendingExpDelta);
        this._pendingExpDelta = 0;
      }
    }
  }

  /** 应用修为增长（内部，不走 transaction 优化性能） */
  private _applyCultivationTick(expDelta: number): void {
    const player = this._runtimeState.player;
    const newExp = player.cultivation.exp + expDelta;

    // 检查是否达到阶段上限
    if (newExp >= player.cultivation.expMax) {
      // 修为满，停止自动增长，等待突破
      player.cultivation.exp = player.cultivation.expMax;
    } else {
      player.cultivation.exp = newExp;
    }

    this._eventBus.emit(GameEventType.CULTIVATION_TICK, {
      expGained: expDelta,
      currentExp: player.cultivation.exp,
      expMax: player.cultivation.expMax,
    });
  }

  /**
   * 尝试突破
   * @param isBigRealm 是否大境界突破
   * @returns 突破结果
   */
  public attemptBreakthrough(isBigRealm: boolean): BreakthroughResult {
    const player = this._runtimeState.player;
    const hasHudaofu = this._hasItem('hudaofu');

    const result = this._cultivationSystem.attemptBreakthrough(
      player,
      isBigRealm,
      hasHudaofu
    );

    if (result.success) {
      // 应用突破效果
      this._applyBreakthroughSuccess(result, isBigRealm);
    } else {
      // 应用失败惩罚
      if (result.effects.expPenalty) {
        this.modifyPlayer('cultivation.exp', -result.effects.expPenalty, 'breakthrough_fail');
      }
      // Phase 8: 突破失败消息通知
      this.addMessage({
        sender: '修炼心得',
        title: '突破失败',
        content: result.message,
        type: 'system',
        timestamp: Date.now(),
        read: false,
      });
    }

    return result;
  }

  /** 应用突破成功效果 */
  private _applyBreakthroughSuccess(result: BreakthroughResult, isBigRealm: boolean): void {
    const player = this._runtimeState.player;
    const effects = result.effects;

    if (isBigRealm) {
      // 大境界突破
      const newRealmIndex = effects.newRealm as number;
      const newRealm = REALMS[newRealmIndex];
      const oldRealmId = player.cultivation.realm;

      this.transaction([
        { path: 'player.cultivation.realm', operation: 'set', value: newRealm.id },
        { path: 'player.cultivation.stage', operation: 'set', value: 0 },
        { path: 'player.cultivation.exp', operation: 'set', value: 0 },
        {
          path: 'player.cultivation.expMax',
          operation: 'set',
          value: newRealm.stages[0].expCap,
        },
        {
          path: 'player.cultivation.lifespanMax',
          operation: 'set',
          value: newRealm.maxLifespan,
        },
        {
          path: 'player.cultivation.lifespan',
          operation: 'add',
          value: effects.lifespanBonus as number,
        },
        { path: 'player.stats.hp', operation: 'set', value: effects.hpBonus as number },
        { path: 'player.stats.maxHp', operation: 'set', value: effects.hpBonus as number },
        { path: 'player.stats.attack', operation: 'set', value: effects.attackBonus as number },
        { path: 'player.stats.defense', operation: 'set', value: effects.defenseBonus as number },
      ]);

      // 消耗护道符
      if (result.consumedHudaofu) {
        this._removeItem('hudaofu', 1);
      }

      // 同步时间系统境界变更
      this._timeSystem.onRealmChanged(newRealm.id);
      this._runtimeState.gameTime = this._timeSystem.getGameTime();

      this._eventBus.emit(GameEventType.REALM_BREAKTHROUGH, {
        oldRealm: oldRealmId,
        newRealm: newRealm.id,
        stage: 0,
      });

      // Phase 8: 首次突破该境界时解锁图鉴
      const realmCodexId = `realm_${newRealm.id}`;
      if (!this.isCodexUnlocked(realmCodexId)) {
        this.unlockCodex(realmCodexId, newRealm.name, '境界');
      }

      // Phase 8: 发送宗门贺信（大境界突破才有）
      this.addMessage({
        sender: '宗门执事',
        title: `恭贺突破 —— ${newRealm.name}`,
        content: `恭贺道友突破至${newRealm.name}！天地灵气倒灌，脱胎换骨。宗门特备薄礼，以表祝贺。`,
        type: 'system',
        timestamp: Date.now(),
        read: false,
      });
    } else {
      // 小境界突破
      const newStage = effects.newStage as number;
      const newExpMax = effects.newExpMax as number;
      const realm = getRealmConfig(player.cultivation.realm);

      if (realm) {
        this.transaction([
          { path: 'player.cultivation.stage', operation: 'set', value: newStage },
          { path: 'player.cultivation.exp', operation: 'set', value: 0 },
          { path: 'player.cultivation.expMax', operation: 'set', value: newExpMax },
          {
            path: 'player.stats.hp',
            operation: 'add',
            value: effects.hpBonus as number,
          },
          {
            path: 'player.stats.maxHp',
            operation: 'add',
            value: effects.hpBonus as number,
          },
          {
            path: 'player.stats.attack',
            operation: 'add',
            value: effects.attackBonus as number,
          },
          {
            path: 'player.stats.defense',
            operation: 'add',
            value: effects.defenseBonus as number,
          },
        ]);
      }
    }
  }

  /**
   * 使用天材地宝
   * @param itemId 物品ID
   */
  public useTreasure(itemId: string): boolean {
    if (!this._hasItem(itemId)) {
      return false;
    }

    this._cultivationSystem.applyBreakthroughBonus(itemId);
    // 天材地宝使用即消耗
    this._removeItem(itemId, 1);
    return true;
  }

  // ==========================================================================
  // 离线收益
  // ==========================================================================

  /**
   * 计算并应用离线收益
   * 在游戏启动时调用
   */
  public calculateAndApplyOfflineProgress(): OfflineProgress | null {
    const player = this._runtimeState.player;
    const spiritDensity = 1.0; // TODO: 从当前区域获取
    const arrayBonus = 0; // TODO: 从洞府等级获取
    // 获取修炼速度用于离线计算
    const speed = this._cultivationSystem.getCultivationSpeed(
      player.cultivation.realm,
      player.cultivation.mentalState
    );

    // speed 已由 CultivationSystem 计算了所有乘数因子
    // 因此向 TimeSystem 传递 1.0/0 作为额外乘数，避免重复计算
    const progress = this._timeSystem.calculateOfflineProgress(
      speed,
      1.0, // spiritDensity 已包含在 speed 中
      0,   // arrayBonus 已包含在 speed 中
      1.0  // techniqueBonus 已包含在 speed 中
    );

    if (progress.monthsPassed <= 0 && progress.cultivationGained <= 0) {
      return null;
    }

    // 应用离线时间推进
    const newGameTime = this._timeSystem.applyOfflineProgress(progress);
    this._runtimeState.gameTime = newGameTime;

    // 应用离线修为
    if (progress.cultivationGained > 0) {
      this.modifyPlayer('cultivation.exp', progress.cultivationGained, 'offline_progress');
    }

    // 应用离线寿命消耗
    if (progress.lifespanConsumed > 0) {
      this.modifyPlayer('cultivation.lifespan', -progress.lifespanConsumed, 'offline_progress');
    }

    this._eventBus.emit(GameEventType.OFFLINE_PROGRESS_CALCULATED, {
      monthsPassed: progress.monthsPassed,
      cultivationGained: progress.cultivationGained,
      lifespanConsumed: progress.lifespanConsumed,
      capped: progress.capped,
    });

    return progress;
  }

  // ==========================================================================
  // 序列化 / 反序列化
  // ==========================================================================

  /**
   * 序列化完整游戏状态为 JSON 字符串
   * 供 SaveManager 持久化存储
   */
  public serialize(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify({
      version: '1.1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      player: snapshot.runtime.player,
      gameTime: snapshot.runtime.gameTime,
      techniques: snapshot.business.techniques,
      inventory: snapshot.business.inventory,
      sectMembership: snapshot.business.sectMembership,
      daoProgress: snapshot.business.daoProgress,
      worldProgress: snapshot.business.worldProgress,
      codexUnlocks: snapshot.business.codexUnlocks,
      messages: snapshot.business.messages,
      dwelling: snapshot.business.dwelling,
      activeEffects: snapshot.runtime.activeEffects,
      settings: snapshot.settings,
      timeSystem: this._timeSystem.serialize(),
      cultivationSystem: this._cultivationSystem.serialize(),
      sectSystem: this._sectSystem.serialize(),
      daoSystem: this._daoSystem.serialize(),
      alchemySystem: this._alchemySystem.serialize(),
      forgeSystem: this._forgeSystem.serialize(),
      explorationSystem: this._explorationSystem.serialize(),
    });
  }

  /**
   * 从 JSON 字符串反序列化恢复游戏状态
   * @param data 序列化后的 JSON 字符串
   */
  public deserialize(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error('[GameStateManager] 存档数据 JSON 解析失败');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('[GameStateManager] 存档数据格式无效');
    }

    let save = parsed as Record<string, unknown>;

    // Phase 8: 执行存档迁移，确保旧存档字段完整
    save = migrateSaveData(save) as unknown as Record<string, unknown>;

    // 恢复运行时状态
    if (save.player) {
      this._runtimeState.player = deepClone(save.player as PlayerData);
    }
    if (save.gameTime) {
      this._runtimeState.gameTime = deepClone(save.gameTime as GameTime);
    }
    if (save.activeEffects) {
      this._runtimeState.activeEffects = deepClone(save.activeEffects as BuffEffect[]);
    }

    // 恢复业务状态
    if (save.techniques) {
      this._businessState.techniques = deepClone(save.techniques as Technique[]);
    }
    if (save.inventory) {
      this._businessState.inventory = deepClone(save.inventory as Item[]);
    }
    if (save.sectMembership) {
      this._businessState.sectMembership = deepClone(save.sectMembership as SectMembership);
    }
    if (save.daoProgress) {
      this._businessState.daoProgress = deepClone(save.daoProgress as Record<string, DaoPath>);
    }
    if (save.worldProgress) {
      this._businessState.worldProgress = deepClone(save.worldProgress as WorldProgress);
    }
    if (save.codexUnlocks) {
      this._businessState.codexUnlocks = deepClone(save.codexUnlocks as CodexUnlocks);
    }
    if (save.messages) {
      this._businessState.messages = deepClone(save.messages as GameMessage[]);
    }
    if (save.dwelling) {
      this._businessState.dwelling = deepClone(save.dwelling as DwellingState);
    }

    // 恢复设置
    if (save.settings) {
      this._settings = { ...DEFAULT_SETTINGS, ...(save.settings as GameSettings) };
    }

    // 恢复时间系统
    if (save.timeSystem) {
      const ts = save.timeSystem as {
        gameTime: GameTime;
        totalMonths: number;
        lastActiveTime: number;
      };
      this._timeSystem.restore({
        ...ts,
        realmId: this._runtimeState.player.cultivation.realm,
      });
    } else {
      // 兼容旧存档
      this._timeSystem = new TimeSystem(
        this._runtimeState.gameTime,
        this._runtimeState.player.cultivation.realm
      );
    }

    // 恢复修炼系统
    if (save.cultivationSystem) {
      this._cultivationSystem.restore(
        save.cultivationSystem as {
          spiritDensity: number;
          arrayBonus: number;
          techniqueBonus: number;
          breakthroughGuarantee: number;
          usedTreasures: string[];
        }
      );
    }

    // 恢复门派系统
    if (save.sectSystem) {
      this._sectSystem.restore(save.sectSystem as Parameters<SectSystem['restore']>[0]);
    }

    // 恢复悟道系统
    if (save.daoSystem) {
      this._daoSystem.restore(save.daoSystem as Parameters<DaoSystem['restore']>[0]);
    }

    // 恢复炼丹系统
    if (save.alchemySystem) {
      this._alchemySystem.restore(save.alchemySystem as Parameters<AlchemySystem['restore']>[0]);
    }

    // 恢复炼器系统
    if (save.forgeSystem) {
      this._forgeSystem.restore(save.forgeSystem as Parameters<ForgeSystem['restore']>[0]);
    }

    // 恢复探索系统
    if (save.explorationSystem) {
      this._explorationSystem.restore(save.explorationSystem as Parameters<ExplorationSystem['restore']>[0]);
    }
  }

  // ==========================================================================
  // 声望系统
  // ==========================================================================

  /**
   * 修改势力声望
   * @param factionId 势力ID
   * @param factionName 势力名称
   * @param delta 声望变化量（正数增加，负数减少）
   */
  public changeReputation(factionId: string, factionName: string, delta: number): void {
    const current = this._runtimeState.player.reputation[factionId] ?? 0;
    const newValue = current + delta;
    this._runtimeState.player.reputation[factionId] = newValue;

    const level = this._calculateReputationLevel(newValue);
    this._eventBus.emit(GameEventType.REPUTATION_CHANGED, {
      factionId,
      factionName,
      oldValue: current,
      newValue,
      level,
    });
  }

  /** 计算声望等级 */
  private _calculateReputationLevel(value: number): string {
    if (value <= -500) return 'hostile';
    if (value <= -100) return 'unfriendly';
    if (value < 100) return 'neutral';
    if (value < 500) return 'friendly';
    return 'revered';
  }

  /** 获取指定势力声望 */
  public getReputation(factionId: string): number {
    return this._runtimeState.player.reputation[factionId] ?? 0;
  }

  // ==========================================================================
  // 图鉴系统
  // ==========================================================================

  /** 解锁图鉴条目 */
  public unlockCodex(codexId: string, codexName: string, category: string): void {
    if (this._businessState.codexUnlocks[codexId]) return;
    this._businessState.codexUnlocks[codexId] = true;
    this._eventBus.emit(GameEventType.CODEX_UNLOCKED, { codexId, codexName, category });
  }

  /** 检查图鉴是否已解锁 */
  public isCodexUnlocked(codexId: string): boolean {
    return !!this._businessState.codexUnlocks[codexId];
  }

  /** 获取图鉴解锁状态 */
  public getCodexUnlocks(): Readonly<CodexUnlocks> {
    return deepClone(this._businessState.codexUnlocks);
  }

  // ==========================================================================
  // 传音符系统
  // ==========================================================================

  /** 添加消息 */
  public addMessage(message: Omit<GameMessage, 'id'>): GameMessage {
    const newMessage: GameMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    this._businessState.messages.unshift(newMessage);
    // 限制消息数量最多 100 条
    if (this._businessState.messages.length > 100) {
      this._businessState.messages = this._businessState.messages.slice(0, 100);
    }
    this._eventBus.emit(GameEventType.MESSAGE_RECEIVED, {
      messageId: newMessage.id,
      sender: newMessage.sender,
      title: newMessage.title,
      content: newMessage.content,
      type: newMessage.type,
    });
    return newMessage;
  }

  /** 标记消息已读 */
  public markMessageRead(messageId: string): void {
    const msg = this._businessState.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.read = true;
    }
  }

  /** 删除消息 */
  public deleteMessage(messageId: string): void {
    this._businessState.messages = this._businessState.messages.filter((m) => m.id !== messageId);
  }

  /** 获取所有消息 */
  public getMessages(): Readonly<GameMessage[]> {
    return deepClone(this._businessState.messages);
  }

  /** 获取未读消息数量 */
  public getUnreadMessageCount(): number {
    return this._businessState.messages.filter((m) => !m.read).length;
  }

  // ==========================================================================
  // 洞府系统
  // ==========================================================================

  /** 获取洞府状态 */
  public getDwellingState(): Readonly<DwellingState> {
    return deepClone(this._businessState.dwelling);
  }

  /** 更新洞府状态 */
  public updateDwelling(updates: Partial<DwellingState>): void {
    this._businessState.dwelling = { ...this._businessState.dwelling, ...updates };
  }

  /** 升级聚灵阵 */
  public upgradeArray(): boolean {
    const current = this._businessState.dwelling.arrayLevel;
    if (current >= 10) return false;
    this._businessState.dwelling.arrayLevel = current + 1;
    return true;
  }

  /** 升级药园 */
  public upgradeGarden(): boolean {
    const current = this._businessState.dwelling.gardenLevel;
    if (current >= 10) return false;
    this._businessState.dwelling.gardenLevel = current + 1;
    return true;
  }

  /** 种植灵药 */
  public plantHerb(herbId: string, gameMonth: number): boolean {
    const gardenLevel = this._businessState.dwelling.gardenLevel;
    const maxPlants = gardenLevel + 1;
    if (this._businessState.dwelling.plantedHerbs.filter((h) => !h.harvested).length >= maxPlants) {
      return false;
    }
    this._businessState.dwelling.plantedHerbs.push({
      herbId,
      plantedAt: gameMonth,
      matureAt: gameMonth + Math.max(3, 12 - gardenLevel),
      harvested: false,
    });
    return true;
  }

  /** 收获灵药 */
  public harvestHerb(index: number): string | null {
    const herb = this._businessState.dwelling.plantedHerbs[index];
    if (!herb || herb.harvested) return null;
    herb.harvested = true;
    return herb.herbId;
  }

  // ==========================================================================
  // 初始化 / 重置
  // ==========================================================================

  /** 重置为全新游戏状态 */
  public resetToNewGame(): void {
    const player = createNewPlayer();
    const gameTime = createDefaultGameTime();

    this._runtimeState = {
      player,
      gameTime,
      activeEffects: [],
    };
    this._businessState = {
      techniques: [],
      inventory: [
        {
          id: 'hudaofu',
          name: '护道符',
          type: 'misc',
          rarity: 4,
          quantity: 1,
          maxStack: 1,
          description: '首次大境界突破时自动消耗，确保突破成功',
          icon: 'item_hudaofu',
        },
      ],
      daoProgress: {},
      worldProgress: createDefaultWorldProgress(),
      codexUnlocks: {},
      messages: [],
      dwelling: {
        arrayLevel: 1,
        gardenLevel: 1,
        plantedHerbs: [],
        isCultivating: false,
        cultivateStartMonth: 0,
      },
    };
    this._settings = deepClone(DEFAULT_SETTINGS);

    this._timeSystem = new TimeSystem(gameTime, player.cultivation.realm);
    this._cultivationSystem = new CultivationSystem({
      spiritDensity: 1.0,
      arrayLevel: 1,
      techniqueBonus: 1.0,
      breakthroughGuarantee: 0,
      usedTreasures: [],
    });
    this._sectSystem = new SectSystem();
    this._daoSystem = new DaoSystem();
    this._alchemySystem = new AlchemySystem();
    this._forgeSystem = new ForgeSystem();
    this._explorationSystem = new ExplorationSystem();
  }

  // ==========================================================================
  // 内部方法
  // ==========================================================================

  /** 检查背包中是否有指定物品 */
  private _hasItem(itemId: string): boolean {
    return this._businessState.inventory.some((item) => item.id === itemId && item.quantity > 0);
  }

  /** 从背包移除物品 */
  private _removeItem(itemId: string, quantity: number): void {
    const item = this._businessState.inventory.find((i) => i.id === itemId);
    if (item) {
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        this._businessState.inventory = this._businessState.inventory.filter(
          (i) => i.id !== itemId
        );
      }
    }
  }

  /**
   * 添加物品到背包
   * @param itemId 物品ID
   * @param quantity 数量
   * @returns 是否成功添加
   */
  public addItem(itemId: string, quantity: number = 1): boolean {
    if (quantity <= 0) return false;
    const itemConfig = getItemConfig(itemId);
    if (!itemConfig) {
      console.warn(`[GameStateManager] 未知物品: ${itemId}`);
      return false;
    }

    const existing = this._businessState.inventory.find((i) => i.id === itemId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > existing.maxStack) {
        existing.quantity = existing.maxStack;
      } else {
        existing.quantity = newQty;
      }
    } else {
      this._businessState.inventory.push({
        id: itemConfig.id,
        name: itemConfig.name,
        type: itemConfig.type,
        rarity: itemConfig.rarity,
        quantity,
        maxStack: itemConfig.maxStack,
        description: itemConfig.description,
        icon: itemConfig.icon,
      });
    }

    this._eventBus.emit(GameEventType.PLAYER_STATE_CHANGED, {
      path: 'inventory',
      oldValue: null,
      newValue: this._businessState.inventory,
    });
    return true;
  }

  /** 获取背包物品列表 */
  public getInventory(): Item[] {
    return deepClone(this._businessState.inventory);
  }

  /** 检查寿命警告 */
  private _checkLifespanWarning(): void {
    const lifespan = this._runtimeState.player.cultivation.lifespan;
    const maxLifespan = this._runtimeState.player.cultivation.lifespanMax;

    if (lifespan <= 0) {
      this._eventBus.emit(GameEventType.LIFESPAN_DEPLETED, {
        playerName: this._runtimeState.player.name,
        rebirthData: null, // TODO: 计算转世数据
      });
    } else if (lifespan <= LIFESPAN_WARNING_THRESHOLD) {
      this._eventBus.emit(GameEventType.LIFESPAN_WARNING, {
        remaining: lifespan,
        max: maxLifespan,
      });
    }
  }

  /** 应用单次更新，返回旧值 */
  private _applySingleUpdate(update: StateUpdate): unknown {
    const { path, operation, value } = update;

    // 解析目标层级：runtime / business / settings
    const parts = path.split('.');
    const layer = parts[0];
    const subPath = parts.slice(1).join('.');

    let target: Record<string, unknown>;
    switch (layer) {
      case 'player':
      case 'gameTime':
      case 'activeEffects':
        target = this._runtimeState as unknown as Record<string, unknown>;
        break;
      case 'techniques':
      case 'inventory':
      case 'sectMembership':
      case 'daoProgress':
      case 'worldProgress':
      case 'codexUnlocks':
      case 'messages':
      case 'dwelling':
        target = this._businessState as unknown as Record<string, unknown>;
        break;
      case 'settings':
        target = this._settings as unknown as Record<string, unknown>;
        break;
      default:
        throw new Error(`[GameStateManager] 未知的状态层级: ${layer}`);
    }

    const fullPath = layer === path ? '' : subPath;
    const oldValue = fullPath ? getByPath(target, fullPath) : target;

    switch (operation) {
      case 'set':
        if (fullPath) {
          setByPath(target, fullPath, value);
        }
        break;
      case 'add': {
        const current = fullPath
          ? getByPath<number>(target, fullPath)
          : (target as unknown as number);
        const numCurrent = typeof current === 'number' ? current : 0;
        const numDelta = typeof value === 'number' ? value : 0;
        if (fullPath) {
          setByPath(target, fullPath, numCurrent + numDelta);
        }
        break;
      }
      case 'multiply': {
        const current = fullPath
          ? getByPath<number>(target, fullPath)
          : (target as unknown as number);
        const numCurrent = typeof current === 'number' ? current : 0;
        const numFactor = typeof value === 'number' ? value : 1;
        if (fullPath) {
          setByPath(target, fullPath, numCurrent * numFactor);
        }
        break;
      }
      case 'delete':
        if (fullPath) {
          const keys = fullPath.split('.');
          let parent: Record<string, unknown> = target;
          for (let i = 0; i < keys.length - 1; i++) {
            parent = parent[keys[i]] as Record<string, unknown>;
          }
          delete parent[keys[keys.length - 1]];
        }
        break;
      default:
        throw new Error(`[GameStateManager] 不支持的操作类型: ${operation}`);
    }

    return oldValue;
  }

  /** 根据路径获取当前值 */
  private _getValueByPath(path: string): unknown {
    const parts = path.split('.');
    const layer = parts[0];
    const subPath = parts.slice(1).join('.');

    let target: Record<string, unknown>;
    switch (layer) {
      case 'player':
      case 'gameTime':
      case 'activeEffects':
        target = this._runtimeState as unknown as Record<string, unknown>;
        break;
      case 'techniques':
      case 'inventory':
      case 'sectMembership':
      case 'daoProgress':
      case 'worldProgress':
      case 'codexUnlocks':
      case 'messages':
      case 'dwelling':
        target = this._businessState as unknown as Record<string, unknown>;
        break;
      case 'settings':
        target = this._settings as unknown as Record<string, unknown>;
        break;
      default:
        return undefined;
    }

    return subPath ? getByPath(target, subPath) : target;
  }

  /** 回滚已应用的更新 */
  private _rollback(updates: { path: string; oldValue: unknown }[]): void {
    // 逆序回滚，保证依赖关系正确
    for (let i = updates.length - 1; i >= 0; i--) {
      const { path, oldValue } = updates[i];
      const parts = path.split('.');
      const layer = parts[0];
      const subPath = parts.slice(1).join('.');

      let target: Record<string, unknown>;
      switch (layer) {
        case 'player':
        case 'gameTime':
        case 'activeEffects':
          target = this._runtimeState as unknown as Record<string, unknown>;
          break;
        case 'techniques':
        case 'inventory':
        case 'sectMembership':
        case 'daoProgress':
        case 'worldProgress':
        case 'codexUnlocks':
        case 'messages':
        case 'dwelling':
          target = this._businessState as unknown as Record<string, unknown>;
          break;
        case 'settings':
          target = this._settings as unknown as Record<string, unknown>;
          break;
        default:
          continue;
      }

      if (subPath) {
        setByPath(target, subPath, oldValue);
      }
    }
  }

  /** 校验状态合法性 */
  private _validateState(): void {
    const player = this._runtimeState.player;

    // HP/MP 不能超过上限
    if (player.stats.hp > player.stats.maxHp) {
      player.stats.hp = player.stats.maxHp;
    }
    if (player.stats.mp > player.stats.maxMp) {
      player.stats.mp = player.stats.maxMp;
    }
    if (player.stats.hp < 0) player.stats.hp = 0;
    if (player.stats.mp < 0) player.stats.mp = 0;

    // 心境值范围 0-100
    if (player.cultivation.mentalState > 100) player.cultivation.mentalState = 100;
    if (player.cultivation.mentalState < 0) player.cultivation.mentalState = 0;

    // 寿命不能为负
    if (player.cultivation.lifespan < 0) player.cultivation.lifespan = 0;

    // 修为不能为负
    if (player.cultivation.exp < 0) player.cultivation.exp = 0;

    // 修为不能超过上限
    if (player.cultivation.exp > player.cultivation.expMax) {
      player.cultivation.exp = player.cultivation.expMax;
    }
  }

  /** 效果时间衰减 */
  private _decayEffects(months: number): void {
    const remaining: BuffEffect[] = [];
    for (const effect of this._runtimeState.activeEffects) {
      if (effect.remainingMonths > 0) {
        effect.remainingMonths -= months;
        if (effect.remainingMonths > 0 || effect.remainingMonths === -1) {
          remaining.push(effect);
        }
      } else if (effect.remainingMonths === -1) {
        remaining.push(effect);
      }
    }
    this._runtimeState.activeEffects = remaining;
  }
}

/** 全局便捷访问导出 */
export const gameState = GameStateManager.getInstance();
