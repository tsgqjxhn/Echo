/**
 * 《问道长生》Phaser 3 重构版 —— 修炼系统
 * Phase 3A: 核心系统层
 *
 * 负责修为增长、突破判定、离线收益计算。
 * 修为速度 = 基础速度 × 灵气浓度 × 洞府加成 × 功法效率 × 境界系数
 */

import type { PlayerData, PlayerCultivation, GameTime } from '../types';
import { EventBus, GameEventType } from '../managers/EventBus';
import {
  REALMS,
  getRealmConfig,
  getRealmIndex,
  BREAKTHROUGH_FAIL_PENALTY,
  FIRST_BREAKTHROUGH_GUARANTEE,
  isFirstBigBreakthrough,
  getItemConfig,
} from '../data/gameData';
import { clamp, randomInt } from '../utils';

/** 突破结果 */
export interface BreakthroughResult {
  success: boolean;
  message: string;
  effects: Record<string, number>;
  /** 是否消耗了护道符 */
  consumedHudaofu: boolean;
}

/** 修炼系统配置 */
export interface CultivationConfig {
  /** 灵气浓度 1.0-1.5 */
  spiritDensity: number;
  /** 聚灵阵等级 */
  arrayLevel: number;
  /** 功法效率加成 */
  techniqueBonus: number;
  /** 已用天材地宝ID列表 */
  usedTreasures: string[];
  /** 大境界突破保底加成（累计） */
  breakthroughGuarantee: number;
  /** 是否首次大境界突破 */
  isFirstBigBreakthrough: boolean;
}

/**
 * 修炼系统
 * 管理玩家修为增长与境界突破
 */
export class CultivationSystem {
  private _eventBus: EventBus;

  /** 基础修炼速度（每秒修为） */
  private _baseSpeed: number;
  /** 灵气浓度系数 1.0-1.5 */
  private _spiritDensity: number;
  /** 聚灵阵加成 */
  private _arrayBonus: number;
  /** 功法效率加成 */
  private _techniqueBonus: number;
  /** 心境加成系数 0.8-1.2 */
  private _mentalStateBonus: number;
  /** 累计离线修为（待应用） */
  private _pendingOfflineExp: number;

  /** 突破保底加成（每次失败+5%） */
  private _breakthroughGuarantee: number;
  /** 已使用天材地宝记录 */
  private _usedTreasures: Set<string>;

  constructor(config: Partial<CultivationConfig> = {}) {
    this._eventBus = EventBus.getInstance();
    this._baseSpeed = 1;
    this._spiritDensity = config.spiritDensity ?? 1.0;
    this._arrayBonus = 0;
    this._techniqueBonus = config.techniqueBonus ?? 1.0;
    this._mentalStateBonus = 1.0;
    this._pendingOfflineExp = 0;
    this._breakthroughGuarantee = config.breakthroughGuarantee ?? 0;
    this._usedTreasures = new Set(config.usedTreasures ?? []);
  }

  // ==========================================================================
  // 核心：修炼速度计算
  // ==========================================================================

  /**
   * 计算综合修炼速度
   * 公式：基础速度 × 灵气浓度 × (1+洞府加成) × 功法效率 × 心境系数 × 境界系数
   */
  public getCultivationSpeed(realmId: string, mentalState: number): number {
    const realm = getRealmConfig(realmId);
    if (!realm) return 0;

    const realmBonus = realm.cultivationSpeedBase;
    const mentalBonus = this.calculateMentalStateBonus(mentalState);

    return (
      this._baseSpeed *
      this._spiritDensity *
      (1 + this._arrayBonus) *
      this._techniqueBonus *
      mentalBonus *
      realmBonus
    );
  }

  /** 计算心境加成系数 0.8-1.2 */
  private calculateMentalStateBonus(mentalState: number): number {
    // 心境80为基准1.0，每偏离10点变化0.05
    return clamp(1.0 + (mentalState - 80) * 0.005, 0.8, 1.2);
  }

  // ==========================================================================
  // 核心：修为增长 (tick)
  // ==========================================================================

  /**
   * 每秒调用，增加修为
   * @param player 玩家数据（只读，返回增量）
   * @param deltaTime 实际经过秒数
   * @returns 本次tick获得的修为值
   */
  public tick(player: PlayerData, deltaTime: number = 1): number {
    const speed = this.getCultivationSpeed(
      player.cultivation.realm,
      player.cultivation.mentalState
    );
    const gained = speed * deltaTime;
    return gained;
  }

  // ==========================================================================
  // 核心：突破系统
  // ==========================================================================

  /**
   * 尝试突破
   * @param player 当前玩家数据
   * @param isBigRealm 是否大境界突破（跨境界）
   * @param hasHudaofu 是否拥有护道符
   * @param requiredDaoLevel 所需悟道等级
   * @param requiredMentalState 所需心境值
   */
  public attemptBreakthrough(
    player: PlayerData,
    isBigRealm: boolean,
    hasHudaofu: boolean = false,
    requiredDaoLevel: number = 0,
    requiredMentalState: number = 60
  ): BreakthroughResult {
    const cultivation = player.cultivation;

    // 检查修为是否满
    if (cultivation.exp < cultivation.expMax) {
      return {
        success: false,
        message: '修为未满，无法突破',
        effects: {},
        consumedHudaofu: false,
      };
    }

    // 检查心境
    if (cultivation.mentalState < requiredMentalState) {
      return {
        success: false,
        message: `心境不足，需要${requiredMentalState}点心境（当前${cultivation.mentalState}）`,
        effects: {},
        consumedHudaofu: false,
      };
    }

    if (isBigRealm) {
      return this._attemptBigBreakthrough(player, hasHudaofu, requiredDaoLevel);
    } else {
      return this._attemptSmallBreakthrough(player);
    }
  }

  /** 小境界突破：修为满自动晋升 */
  private _attemptSmallBreakthrough(player: PlayerData): BreakthroughResult {
    const realm = getRealmConfig(player.cultivation.realm);
    if (!realm) {
      return {
        success: false,
        message: '境界配置错误',
        effects: {},
        consumedHudaofu: false,
      };
    }

    // 小境界突破必定成功
    const nextStage = player.cultivation.stage + 1;

    if (nextStage >= realm.stages.length) {
      return {
        success: false,
        message: '已达到圆满，需进行大境界突破',
        effects: {},
        consumedHudaofu: false,
      };
    }

    const effects: Record<string, number> = {
      newStage: nextStage,
      newExpMax: realm.stages[nextStage].expCap,
      hpBonus: realm.stages[nextStage].hp - realm.stages[player.cultivation.stage].hp,
      attackBonus:
        realm.stages[nextStage].attack - realm.stages[player.cultivation.stage].attack,
      defenseBonus:
        realm.stages[nextStage].defense - realm.stages[player.cultivation.stage].defense,
    };

    return {
      success: true,
      message: `突破成功！晋升至${realm.name}${realm.stages[nextStage].name}`,
      effects,
      consumedHudaofu: false,
    };
  }

  /** 大境界突破：需要丹药、悟道、心境，有成功率 */
  private _attemptBigBreakthrough(
    player: PlayerData,
    hasHudaofu: boolean,
    requiredDaoLevel: number
  ): BreakthroughResult {
    const realmIndex = getRealmIndex(player.cultivation.realm);
    const realm = getRealmConfig(player.cultivation.realm);

    if (!realm || realmIndex < 0 || realmIndex >= REALMS.length - 1) {
      return {
        success: false,
        message: '已是最高境界，无法继续突破',
        effects: {},
        consumedHudaofu: false,
      };
    }

    const nextRealm = REALMS[realmIndex + 1];

    // 检查突破丹药
    if (realm.breakthroughPill && !this._hasBreakthroughPill(player, realm.breakthroughPill)) {
      return {
        success: false,
        message: `缺少突破丹药：${getItemConfig(realm.breakthroughPill)?.name ?? realm.breakthroughPill}`,
        effects: {},
        consumedHudaofu: false,
      };
    }

    // 计算成功率
    let successRate = this.calculateBreakthroughChance(realmIndex);

    // 首次大境界突破护道符
    const isFirst = isFirstBigBreakthrough(realmIndex);
    let consumedHudaofu = false;

    if (isFirst && FIRST_BREAKTHROUGH_GUARANTEE && hasHudaofu) {
      successRate = 1.0;
      consumedHudaofu = true;
    }

    // 随机判定
    const roll = Math.random();
    const success = roll < successRate;

    if (success) {
      // 突破成功
      const effects: Record<string, number> = {
        newRealm: realmIndex + 1,
        newStage: 0,
        newExpMax: nextRealm.stages[0].expCap,
        newLifespanMax: nextRealm.maxLifespan,
        lifespanBonus: nextRealm.maxLifespan - realm.maxLifespan,
        hpBonus: nextRealm.stages[0].hp,
        attackBonus: nextRealm.stages[0].attack,
        defenseBonus: nextRealm.stages[0].defense,
      };

      // 重置保底
      this._breakthroughGuarantee = 0;

      return {
        success: true,
        message: `大境界突破成功！晋升至${nextRealm.name}！天地灵气倒灌，脱胎换骨！`,
        effects,
        consumedHudaofu,
      };
    } else {
      // 突破失败
      const penaltyExp = Math.floor(player.cultivation.expMax * BREAKTHROUGH_FAIL_PENALTY);
      this._breakthroughGuarantee += 0.05; // 每次失败+5%保底

      return {
        success: false,
        message: `突破失败！修为受损，扣除${(BREAKTHROUGH_FAIL_PENALTY * 100).toFixed(0)}%修为。下次突破成功率+5%`,
        effects: {
          expPenalty: penaltyExp,
          guaranteeBonus: this._breakthroughGuarantee,
        },
        consumedHudaofu: false,
      };
    }
  }

  /** 计算大境界突破成功率 */
  public calculateBreakthroughChance(realmIndex: number): number {
    const realm = REALMS[realmIndex];
    if (!realm) return 0;

    // 基础成功率 + 保底加成
    return clamp(realm.bigBreakthroughRate + this._breakthroughGuarantee, 0, 1);
  }

  /** 检查是否有突破丹药（简化版，实际需查询背包） */
  private _hasBreakthroughPill(_player: PlayerData, _pillId: string): boolean {
    // TODO: 从 GameStateManager 查询背包
    // 返回 true 表示假设拥有，实际逻辑在 GameStateManager 中处理
    return true;
  }

  // ==========================================================================
  // 天材地宝加成
  // ==========================================================================

  /**
   * 使用天材地宝增加突破成功率
   * @param itemId 天材地宝ID
   */
  public applyBreakthroughBonus(itemId: string): void {
    if (this._usedTreasures.has(itemId)) {
      return; // 同种天材地宝只能使用一次
    }

    const item = getItemConfig(itemId);
    if (!item || item.type !== 'treasure') {
      return;
    }

    this._usedTreasures.add(itemId);

    if (item.breakthroughBonus) {
      // 天材地宝直接增加成功率
      this._breakthroughGuarantee += item.breakthroughBonus;
    }
  }

  /** 获取已使用的天材地宝列表 */
  public getUsedTreasures(): string[] {
    return Array.from(this._usedTreasures);
  }

  // ==========================================================================
  // 离线收益
  // ==========================================================================

  /**
   * 计算离线修为收益
   * @param player 玩家数据
   * @param offlineMs 离线毫秒数
   */
  public calculateOfflineGain(player: PlayerData, offlineMs: number): number {
    const speed = this.getCultivationSpeed(
      player.cultivation.realm,
      player.cultivation.mentalState
    );
    const offlineSeconds = offlineMs / 1000;
    return speed * offlineSeconds;
  }

  // ==========================================================================
  // 配置更新
  // ==========================================================================

  /** 更新灵气浓度 */
  public setSpiritDensity(density: number): void {
    this._spiritDensity = clamp(density, 1.0, 1.5);
  }

  /** 更新聚灵阵加成 */
  public setArrayBonus(level: number): void {
    // 聚灵阵等级对应加成：从 ARRAY_UPGRADES 查表
    const bonuses = [0, 0.05, 0.12, 0.20, 0.30, 0.45, 0.60, 0.80, 1.0, 1.3];
    this._arrayBonus = bonuses[clamp(level - 1, 0, bonuses.length - 1)] ?? 0;
  }

  /** 更新功法效率 */
  public setTechniqueBonus(bonus: number): void {
    this._techniqueBonus = Math.max(0.1, bonus);
  }

  /** 更新基础速度 */
  public setBaseSpeed(speed: number): void {
    this._baseSpeed = Math.max(0, speed);
  }

  // ==========================================================================
  // 序列化
  // ==========================================================================

  public serialize(): {
    spiritDensity: number;
    arrayBonus: number;
    techniqueBonus: number;
    breakthroughGuarantee: number;
    usedTreasures: string[];
  } {
    return {
      spiritDensity: this._spiritDensity,
      arrayBonus: this._arrayBonus,
      techniqueBonus: this._techniqueBonus,
      breakthroughGuarantee: this._breakthroughGuarantee,
      usedTreasures: Array.from(this._usedTreasures),
    };
  }

  public restore(data: {
    spiritDensity: number;
    arrayBonus: number;
    techniqueBonus: number;
    breakthroughGuarantee: number;
    usedTreasures: string[];
  }): void {
    this._spiritDensity = data.spiritDensity;
    this._arrayBonus = data.arrayBonus;
    this._techniqueBonus = data.techniqueBonus;
    this._breakthroughGuarantee = data.breakthroughGuarantee;
    this._usedTreasures = new Set(data.usedTreasures);
  }
}
