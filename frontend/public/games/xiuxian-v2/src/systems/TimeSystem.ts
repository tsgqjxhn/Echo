/**
 * 《问道长生》Phaser 3 重构版 —— 时间系统
 * Phase 3A: 核心系统层
 *
 * 管理游戏内时间推进、行动力消耗与恢复、寿命衰减、离线收益计算。
 * 游戏内时间：每年12个月，每月为1回合。
 */

import type { GameTime } from '../types';
import { EventBus, GameEventType } from '../managers/EventBus';
import {
  REALMS,
  OFFLINE_CAP_HOURS,
  OFFLINE_HOURS_PER_MONTH,
  LIFESPAN_WARNING_THRESHOLD,
  MONTHS_PER_YEAR,
} from '../data/gameData';
import { clamp } from '../utils';
import { calculateOfflineProgress, type OfflineProgress } from '../models/PlayerData';

/**
 * 时间系统
 * 负责推进游戏内时间，管理行动力与寿命
 */
export class TimeSystem {
  private _eventBus: EventBus;

  /** 当前游戏时间状态 */
  private _gameTime: GameTime;
  /** 累计游戏总月数 */
  private _totalMonths: number;
  /** 最后活跃时间戳（用于离线计算） */
  private _lastActiveTime: number;
  /** 当前境界索引（缓存，用于行动力计算） */
  private _realmIndex: number;

  constructor(gameTime: GameTime, realmId: string, lastActiveTime: number = Date.now()) {
    this._eventBus = EventBus.getInstance();
    this._gameTime = { ...gameTime };
    this._totalMonths = (gameTime.year - 1) * MONTHS_PER_YEAR + (gameTime.month - 1);
    this._lastActiveTime = lastActiveTime;
    this._realmIndex = REALMS.findIndex((r) => r.id === realmId);
    if (this._realmIndex < 0) this._realmIndex = 0;
  }

  // ==========================================================================
  // 时间推进
  // ==========================================================================

  /**
   * 推进一个月
   * 自动处理年份跨年、行动力恢复、寿命消耗
   */
  public advanceMonth(): void {
    this._gameTime.month++;
    this._totalMonths++;

    if (this._gameTime.month > MONTHS_PER_YEAR) {
      this._gameTime.month = 1;
      this._gameTime.year++;
    }

    // 每月恢复行动力
    const realm = REALMS[this._realmIndex];
    if (realm) {
      this._gameTime.actionPoints = realm.actionPoints;
      this._gameTime.actionPointsMax = realm.actionPoints;
    }

    this._lastActiveTime = Date.now();

    this._eventBus.emit(GameEventType.TIME_ADVANCED, {
      year: this._gameTime.year,
      month: this._gameTime.month,
      actionPoints: this._gameTime.actionPoints,
    });
  }

  /**
   * 推进指定月数
   * @param months 推进月数
   */
  public advanceMonths(months: number): void {
    for (let i = 0; i < months; i++) {
      this.advanceMonth();
    }
  }

  /**
   * 推进一年
   */
  public advanceYear(): void {
    this.advanceMonths(MONTHS_PER_YEAR);
  }

  // ==========================================================================
  // 行动力管理
  // ==========================================================================

  /** 获取当前可用行动力 */
  public getActionPoints(): number {
    return this._gameTime.actionPoints;
  }

  /** 获取行动力上限 */
  public getActionPointsMax(): number {
    return this._gameTime.actionPointsMax;
  }

  /**
   * 消耗行动力
   * @param points 消耗点数，默认1
   * @returns 是否成功消耗
   */
  public consumeActionPoint(points: number = 1): boolean {
    if (this._gameTime.actionPoints < points) {
      return false;
    }
    this._gameTime.actionPoints -= points;
    return true;
  }

  /**
   * 恢复行动力
   * @param points 恢复点数
   */
  public restoreActionPoints(points: number): void {
    const realm = REALMS[this._realmIndex];
    const max = realm ? realm.actionPoints : this._gameTime.actionPointsMax;
    this._gameTime.actionPoints = clamp(this._gameTime.actionPoints + points, 0, max);
  }

  // ==========================================================================
  // 寿命管理
  // ==========================================================================

  /**
   * 消耗寿命（按年计算）
   * @param years 消耗年数
   */
  public consumeLifespan(years: number): void {
    // 寿命消耗由 GameStateManager 通过 transaction 处理
    // 本方法只返回应消耗的值，实际修改在外部执行
  }

  /**
   * 获取剩余寿命警告状态
   * @param remainingLifespan 当前剩余寿命
   */
  public isLifespanWarning(remainingLifespan: number): boolean {
    return remainingLifespan <= LIFESPAN_WARNING_THRESHOLD;
  }

  // ==========================================================================
  // 离线收益
  // ==========================================================================

  /**
   * 计算离线进度
   * @param offlineHours 离线小时数（可选，不传则计算从 lastActiveTime 到现在）
   * @param cultivationSpeed 当前每秒修炼速度
   * @param spiritDensity 灵气浓度
   * @param arrayBonus 聚灵阵加成
   * @param techniqueBonus 功法效率加成
   */
  public calculateOfflineProgress(
    cultivationSpeed: number,
    spiritDensity: number = 1.0,
    arrayBonus: number = 0,
    techniqueBonus: number = 1.0,
    offlineHours?: number
  ): OfflineProgress {
    const offlineMs = offlineHours
      ? offlineHours * 60 * 60 * 1000
      : Date.now() - this._lastActiveTime;

    return calculateOfflineProgress(
      offlineMs,
      cultivationSpeed,
      spiritDensity,
      arrayBonus,
      techniqueBonus
    );
  }

  /**
   * 应用离线收益到游戏时间
   * @param progress 离线收益数据
   * @returns 推进后的时间快照
   */
  public applyOfflineProgress(progress: OfflineProgress): GameTime {
    // 推进游戏时间
    this.advanceMonths(progress.monthsPassed);
    this._lastActiveTime = Date.now();
    return { ...this._gameTime };
  }

  // ==========================================================================
  // 境界变更同步
  // ==========================================================================

  /**
   * 当玩家突破到新境界时调用
   * 更新行动力上限和境界索引
   */
  public onRealmChanged(realmId: string): void {
    const newIndex = REALMS.findIndex((r) => r.id === realmId);
    if (newIndex >= 0) {
      this._realmIndex = newIndex;
      const realm = REALMS[newIndex];
      this._gameTime.actionPointsMax = realm.actionPoints;
      // 突破时补满行动力
      this._gameTime.actionPoints = realm.actionPoints;
    }
  }

  // ==========================================================================
  // 序列化 / 反序列化
  // ==========================================================================

  /** 获取当前时间快照 */
  public getGameTime(): GameTime {
    return { ...this._gameTime };
  }

  /** 获取总月数 */
  public getTotalMonths(): number {
    return this._totalMonths;
  }

  /** 获取最后活跃时间 */
  public getLastActiveTime(): number {
    return this._lastActiveTime;
  }

  /** 更新最后活跃时间 */
  public updateLastActiveTime(): void {
    this._lastActiveTime = Date.now();
  }

  /** 序列化为可保存对象 */
  public serialize(): {
    gameTime: GameTime;
    totalMonths: number;
    lastActiveTime: number;
  } {
    return {
      gameTime: { ...this._gameTime },
      totalMonths: this._totalMonths,
      lastActiveTime: this._lastActiveTime,
    };
  }

  /** 从保存对象恢复 */
  public restore(data: {
    gameTime: GameTime;
    totalMonths: number;
    lastActiveTime: number;
    realmId: string;
  }): void {
    this._gameTime = { ...data.gameTime };
    this._totalMonths = data.totalMonths;
    this._lastActiveTime = data.lastActiveTime;
    this.onRealmChanged(data.realmId);
  }
}
