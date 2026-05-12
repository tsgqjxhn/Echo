/**
 * 《问道长生》Phaser 3 重构版 —— 场景基类
 * Phase 2A: 场景框架
 *
 * 所有场景的基类，提供水墨UI组件快速创建、事件订阅自动管理、
 * 主题色获取、场景切换动画等通用能力。
 */

import { eventBus, GameEventType, type EventCallback } from '../managers/EventBus';
import {
  InkPanel,
  InkButton,
  Tooltip,
  type InkPanelOptions,
  type InkButtonOptions,
} from '../ui';
import { INK_COLORS } from '../ui/InkPanel';

/** 主题色名称 */
export type ThemeColorName = keyof typeof INK_COLORS;

/** 事件订阅记录 */
interface EventSubscription {
  event: GameEventType;
  callback: EventCallback<GameEventType>;
}

export class BaseScene extends Phaser.Scene {
  /** 全局提示浮层 */
  protected _tooltip?: Tooltip;
  /** 当前事件订阅列表 */
  private _subscriptions: EventSubscription[] = [];
  /** 场景内创建的 UI 面板 */
  protected _panels: InkPanel[] = [];
  /** 场景内创建的按钮 */
  protected _buttons: InkButton[] = [];

  constructor(config: string | { key: string }) {
    super(typeof config === 'string' ? { key: config } : config);
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  create(): void {
    // 初始化全局提示
    this._tooltip = new Tooltip(this);

    // 注册 shutdown 自动清理
    this.events.once('shutdown', this._onShutdown, this);
    this.events.once('destroy', this._onDestroy, this);
  }

  /** shutdown 时自动清理 */
  private _onShutdown(): void {
    this._cleanupSubscriptions();
    this._cleanupUI();
  }

  /** destroy 时彻底清理 */
  private _onDestroy(): void {
    this._cleanupSubscriptions();
    this._cleanupUI();
    if (this._tooltip) {
      this._tooltip.destroy();
      this._tooltip = undefined;
    }
  }

  // ==========================================================================
  // UI 快速创建
  // ==========================================================================

  /**
   * 快速创建水墨面板
   * @param x X 坐标
   * @param y Y 坐标
   * @param options 面板配置
   */
  createInkPanel(x: number, y: number, options: InkPanelOptions): InkPanel {
    const panel = new InkPanel(this, x, y, options);
    this._panels.push(panel);
    return panel;
  }

  /**
   * 快速创建水墨按钮
   * @param x X 坐标
   * @param y Y 坐标
   * @param options 按钮配置
   */
  createInkButton(x: number, y: number, options: InkButtonOptions): InkButton {
    const btn = new InkButton(this, x, y, options);
    this._buttons.push(btn);
    return btn;
  }

  // ==========================================================================
  // 事件订阅管理
  // ==========================================================================

  /**
   * 订阅事件（自动管理，场景关闭时自动取消订阅）
   * @param event 事件类型
   * @param callback 回调函数
   */
  subscribeToEvent<T extends GameEventType>(event: T, callback: EventCallback<T>): void {
    eventBus.on(event, callback as EventCallback<GameEventType>, this);
    this._subscriptions.push({
      event,
      callback: callback as EventCallback<GameEventType>,
    });
  }

  /** 取消单个订阅 */
  unsubscribeFromEvent<T extends GameEventType>(event: T, callback: EventCallback<T>): void {
    eventBus.off(event, callback as EventCallback<GameEventType>);
    this._subscriptions = this._subscriptions.filter(
      (s) => !(s.event === event && s.callback === (callback as EventCallback<GameEventType>))
    );
  }

  /** 清理所有订阅 */
  private _cleanupSubscriptions(): void {
    for (const sub of this._subscriptions) {
      eventBus.off(sub.event, sub.callback);
    }
    this._subscriptions = [];
  }

  // ==========================================================================
  // 主题与辅助
  // ==========================================================================

  /** 获取主题色 */
  getThemeColor(name: ThemeColorName): number {
    return INK_COLORS[name];
  }

  /**
   * 检查触控区域是否安全（不超出屏幕边界）
   * @param x 区域中心 X
   * @param y 区域中心 Y
   * @param width 区域宽度
   * @param height 区域高度
   */
  isTouchSafe(x: number, y: number, width: number, height: number): boolean {
    const halfW = width / 2;
    const halfH = height / 2;
    const scale = this.game.scale;
    return (
      x - halfW >= 0 &&
      x + halfW <= scale.width &&
      y - halfH >= 0 &&
      y + halfH <= scale.height
    );
  }

  // ==========================================================================
  // 全局提示
  // ==========================================================================

  /**
   * 显示提示
   * @param content 提示内容
   * @param x 屏幕 X 坐标
   * @param y 屏幕 Y 坐标
   */
  showTooltip(content: string, x: number, y: number): void {
    this._tooltip?.show(content, x, y);
  }

  /** 隐藏提示 */
  hideTooltip(): void {
    this._tooltip?.hide();
  }

  // ==========================================================================
  // 场景切换动画
  // ==========================================================================

  /** 场景入场动画 */
  transitionIn(duration: number = 400): void {
    const camera = this.cameras.main;
    camera.fadeIn(duration, 0, 0, 0);
  }

  /** 场景退场动画 */
  transitionOut(duration: number = 400, onComplete?: () => void): void {
    const camera = this.cameras.main;
    camera.fadeOut(duration, 0, 0, 0);

    // Phaser 的 fadeOut 不会自动触发回调，用 tween 模拟
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      onComplete: () => {
        onComplete?.();
      },
    });
  }

  /** 切换至新场景（带动画） */
  switchScene(targetKey: string, data?: unknown): void {
    this.transitionOut(300, () => {
      this.scene.start(targetKey, data);
    });
  }

  // ==========================================================================
  // 清理
  // ==========================================================================

  private _cleanupUI(): void {
    for (const panel of this._panels) {
      if (panel.active) panel.destroy();
    }
    this._panels = [];

    for (const btn of this._buttons) {
      if (btn.active) btn.destroy();
    }
    this._buttons = [];
  }
}
