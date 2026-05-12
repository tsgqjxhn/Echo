/**
 * 《问道长生》Phaser 3 重构版 —— 类型安全事件总线
 * Phase 1: 核心基础设施
 *
 * 基于 Phaser.Events.EventEmitter 实现的全局事件总线。
 * 采用单例模式，供游戏内各模块（Scene、UI、Manager）解耦通信。
 */

/** 游戏事件类型常量对象 —— 使用 const 断言替代 enum 以获得更精确的字符串字面量类型 */
export const GameEventType = {
  PLAYER_STATE_CHANGED: 'player_state_changed',
  REALM_BREAKTHROUGH: 'realm_breakthrough',
  TIME_ADVANCED: 'time_advanced',
  ITEM_GAINED: 'item_gained',
  ITEM_CONSUMED: 'item_consumed',
  BATTLE_STARTED: 'battle_started',
  BATTLE_ENDED: 'battle_ended',
  UI_PANEL_OPENED: 'ui_panel_opened',
  UI_PANEL_CLOSED: 'ui_panel_closed',
  SAVE_COMPLETED: 'save_completed',
  CULTIVATION_TICK: 'cultivation_tick',
  LIFESPAN_WARNING: 'lifespan_warning',
  LIFESPAN_DEPLETED: 'lifespan_depleted',
  OFFLINE_PROGRESS_CALCULATED: 'offline_progress_calculated',
  REPUTATION_CHANGED: 'reputation_changed',
  CODEX_UNLOCKED: 'codex_unlocked',
  MESSAGE_RECEIVED: 'message_received',
} as const;

/** 游戏事件类型联合类型 */
export type GameEventType = (typeof GameEventType)[keyof typeof GameEventType];

/**
 * 事件负载类型映射
 * 为每个事件定义其回调函数的参数类型，提供编译时类型检查
 */
export interface EventPayloadMap {
  [GameEventType.PLAYER_STATE_CHANGED]: { path: string; oldValue: unknown; newValue: unknown };
  [GameEventType.REALM_BREAKTHROUGH]: { oldRealm: string; newRealm: string; stage: number };
  [GameEventType.TIME_ADVANCED]: { year: number; month: number; actionPoints: number };
  [GameEventType.ITEM_GAINED]: { itemId: string; name: string; quantity: number };
  [GameEventType.ITEM_CONSUMED]: { itemId: string; name: string; quantity: number };
  [GameEventType.BATTLE_STARTED]: { enemyId: string; enemyName: string };
  [GameEventType.BATTLE_ENDED]: { victory: boolean; expGained: number };
  [GameEventType.UI_PANEL_OPENED]: { panel: string };
  [GameEventType.UI_PANEL_CLOSED]: { panel: string };
  [GameEventType.SAVE_COMPLETED]: { slot: number; success: boolean };
  [GameEventType.CULTIVATION_TICK]: { expGained: number; currentExp: number; expMax: number };
  [GameEventType.LIFESPAN_WARNING]: { remaining: number; max: number };
  [GameEventType.LIFESPAN_DEPLETED]: { playerName: string; rebirthData: unknown };
  [GameEventType.OFFLINE_PROGRESS_CALCULATED]: {
    monthsPassed: number;
    cultivationGained: number;
    lifespanConsumed: number;
    capped: boolean;
  };
  [GameEventType.REPUTATION_CHANGED]: {
    factionId: string;
    factionName: string;
    oldValue: number;
    newValue: number;
    level: string;
  };
  [GameEventType.CODEX_UNLOCKED]: {
    codexId: string;
    codexName: string;
    category: string;
  };
  [GameEventType.MESSAGE_RECEIVED]: {
    messageId: string;
    sender: string;
    title: string;
    content: string;
    type: 'sect' | 'event' | 'npc' | 'system';
  };
}

/** 事件回调函数类型 */
export type EventCallback<T extends GameEventType> = (payload: EventPayloadMap[T]) => void;

/**
 * 事件总线
 * 单例类，包装 Phaser.Events.EventEmitter 提供类型安全的事件收发。
 */
export class EventBus {
  private static _instance: EventBus | null = null;
  private _emitter: Phaser.Events.EventEmitter;

  private constructor() {
    this._emitter = new Phaser.Events.EventEmitter();
  }

  /** 获取 EventBus 单例实例 */
  public static getInstance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * 发射事件
   * @param event 事件类型
   * @param data 事件负载数据
   */
  public emit<T extends GameEventType>(event: T, data: EventPayloadMap[T]): boolean {
    return this._emitter.emit(event, data);
  }

  /**
   * 订阅事件
   * @param event 事件类型
   * @param callback 回调函数
   * @param context 回调执行的上下文（this 指向）
   */
  public on<T extends GameEventType>(
    event: T,
    callback: EventCallback<T>,
    context?: unknown
  ): void {
    this._emitter.on(event, callback as Function, context);
  }

  /**
   * 取消订阅事件
   * @param event 事件类型
   * @param callback 要移除的回调函数（必须与注册时同一引用）
   */
  public off<T extends GameEventType>(event: T, callback: EventCallback<T>): void {
    this._emitter.off(event, callback as Function);
  }

  /**
   * 一次性订阅 —— 触发一次后自动取消
   * @param event 事件类型
   * @param callback 回调函数
   * @param context 回调执行的上下文
   */
  public once<T extends GameEventType>(
    event: T,
    callback: EventCallback<T>,
    context?: unknown
  ): void {
    this._emitter.once(event, callback as Function, context);
  }

  /**
   * 移除指定事件的所有监听器
   * @param event 事件类型，不传则移除所有事件的所有监听器
   */
  public removeAllListeners(event?: GameEventType): void {
    this._emitter.removeAllListeners(event);
  }

  /**
   * 获取指定事件的监听器数量
   * @param event 事件类型
   */
  public listenerCount(event: GameEventType): number {
    return this._emitter.listenerCount(event);
  }
}

/** 全局便捷访问导出 */
export const eventBus = EventBus.getInstance();
