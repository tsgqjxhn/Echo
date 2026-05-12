/**
 * 《问道长生》Phaser 3 重构版 —— 水墨按钮
 * Phase 2A: 水墨风格UI组件库
 *
 * 继承 Phaser.GameObjects.Container，提供国风水墨风格的交互按钮。
 * 支持 normal / hover / pressed / disabled 四种状态，含动画和音效。
 */

import { eventBus, GameEventType } from '../managers/EventBus';
import { INK_COLORS } from './InkPanel';

/** 按钮状态枚举 */
export enum ButtonState {
  NORMAL = 'normal',
  HOVER = 'hover',
  PRESSED = 'pressed',
  DISABLED = 'disabled',
}

/** 按钮配置选项 */
export interface InkButtonOptions {
  /** 按钮文字 */
  text: string;
  /** 按钮宽度，默认自适应 */
  width?: number;
  /** 按钮高度，默认 48 */
  height?: number;
  /** 字体大小，默认 20px */
  fontSize?: number | string;
  /** 图标纹理名，可选 */
  icon?: string;
  /** 图标与文字间距，默认 8 */
  iconSpacing?: number;
  /** 是否禁用，默认 false */
  disabled?: boolean;
  /** 音效ID，可选 */
  soundEffect?: string;
}

export class InkButton extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _textObj!: Phaser.GameObjects.Text;
  private _iconObj?: Phaser.GameObjects.Image;
  private _hitZone!: Phaser.GameObjects.Zone;

  private _width: number;
  private _height: number;
  private _state: ButtonState = ButtonState.NORMAL;
  private _options: InkButtonOptions;
  private _clickHandlers: (() => void)[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, options: InkButtonOptions) {
    super(scene, x, y);
    this._options = options;
    this._height = options.height ?? 48;

    // 先创建文字以测量宽度
    this._textObj = this._createText();
    const textWidth = this._textObj.width;

    // 计算按钮宽度（确保最小触控区域 60px）
    const paddingX = 32;
    const iconWidth = options.icon ? 24 + (options.iconSpacing ?? 8) : 0;
    const calculatedWidth = Math.max(60, textWidth + paddingX * 2 + iconWidth);
    this._width = options.width ?? calculatedWidth;

    // 确保高度也满足最小触控区域
    this._height = Math.max(60, this._height);

    this._buildButton();
    this.setSize(this._width, this._height);
    this.setInteractive({ useHandCursor: true });

    this._setupInteractions();

    if (options.disabled) {
      this.setDisabled(true);
    }

    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _createText(): Phaser.GameObjects.Text {
    const fontSize = this._options.fontSize ?? 20;
    const sizeStr = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
    return this.scene.add.text(0, 0, this._options.text, {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: sizeStr,
      color: '#F5F5DC',
    });
  }

  private _buildButton(): void {
    // 背景
    this._bg = this.scene.add.graphics();
    this._drawBgForState(ButtonState.NORMAL);
    this.add(this._bg);

    // 图标
    if (this._options.icon) {
      this._iconObj = this.scene.add.image(0, 0, this._options.icon);
      this._iconObj.setDisplaySize(24, 24);
      this.add(this._iconObj);
    }

    // 文字
    this.add(this._textObj);
    this._layoutContent();

    // 点击热区（确保整个区域可交互）
    this._hitZone = this.scene.add.zone(0, 0, this._width, this._height);
    this._hitZone.setInteractive({ useHandCursor: true });
    this.add(this._hitZone);
  }

  private _layoutContent(): void {
    const hasIcon = !!this._iconObj;
    const iconSpacing = this._options.iconSpacing ?? 8;

    let totalWidth = this._textObj.width;
    if (hasIcon) totalWidth += 24 + iconSpacing;

    let startX = -totalWidth / 2;
    if (hasIcon && this._iconObj) {
      this._iconObj.setPosition(startX + 12, 0);
      startX += 24 + iconSpacing;
    }

    this._textObj.setPosition(startX + this._textObj.width / 2, 0);
    this._textObj.setOrigin(0.5);
  }

  // ==========================================================================
  // 绘制各状态背景
  // ==========================================================================

  private _drawBgForState(state: ButtonState): void {
    this._bg.clear();

    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const r = 8;

    switch (state) {
      case ButtonState.NORMAL: {
        this._bg.fillStyle(INK_COLORS.primary, 0.9);
        this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._bg.lineStyle(1.5, INK_COLORS.ivory, 0.35);
        this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._textObj?.setColor('#F5F5DC');
        this.setAlpha(1);
        break;
      }
      case ButtonState.HOVER: {
        this._bg.fillStyle(INK_COLORS.primaryLight, 0.95);
        this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._bg.lineStyle(1.5, INK_COLORS.ivory, 0.6);
        this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._textObj?.setColor('#FFFFFF');
        this.setAlpha(1);
        break;
      }
      case ButtonState.PRESSED: {
        this._bg.fillStyle(INK_COLORS.primaryDark, 0.95);
        this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._bg.lineStyle(1.5, INK_COLORS.ivory, 0.25);
        this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._textObj?.setColor('#E0E0C0');
        this.setAlpha(1);
        break;
      }
      case ButtonState.DISABLED: {
        this._bg.fillStyle(INK_COLORS.inkGray, 0.5);
        this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._bg.lineStyle(1, INK_COLORS.inkLight, 0.2);
        this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, r);
        this._textObj?.setColor('#888888');
        this.setAlpha(0.5);
        break;
      }
    }
  }

  // ==========================================================================
  // 交互
  // ==========================================================================

  private _setupInteractions(): void {
    const hitZone = this._hitZone;

    hitZone.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (this._state === ButtonState.DISABLED) return;
      this._setState(ButtonState.HOVER);
      this.scene.input.setDefaultCursor('pointer');
    });

    hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      if (this._state === ButtonState.DISABLED) return;
      this._setState(ButtonState.NORMAL);
      this.scene.input.setDefaultCursor('default');
    });

    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this._state === ButtonState.DISABLED) return;
      this._setState(ButtonState.PRESSED);
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        ease: 'Quad.easeOut',
      });
    });

    hitZone.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this._state === ButtonState.DISABLED) return;
      this._setState(ButtonState.HOVER);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: 'Quad.easeOut',
      });

      // 播放音效
      if (this._options.soundEffect) {
        eventBus.emit(GameEventType.UI_PANEL_OPENED, { panel: `sound_${this._options.soundEffect}` });
      }

      // 触发点击回调
      for (const handler of this._clickHandlers) {
        handler();
      }
    });
  }

  private _setState(state: ButtonState): void {
    if (this._state === state) return;
    const oldState = this._state;
    this._state = state;
    this._drawBgForState(state);

    // hover 状态轻微放大动画
    if (state === ButtonState.HOVER && oldState === ButtonState.NORMAL) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    } else if (state === ButtonState.NORMAL && oldState === ButtonState.HOVER) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /** 注册点击回调 */
  onClick(callback: () => void): this {
    this._clickHandlers.push(callback);
    return this;
  }

  /** 移除点击回调 */
  offClick(callback: () => void): this {
    this._clickHandlers = this._clickHandlers.filter((h) => h !== callback);
    return this;
  }

  /** 设置禁用状态 */
  setDisabled(disabled: boolean): this {
    if (disabled) {
      this._setState(ButtonState.DISABLED);
      this._hitZone.disableInteractive();
    } else {
      this._setState(ButtonState.NORMAL);
      this._hitZone.setInteractive({ useHandCursor: true });
    }
    return this;
  }

  /** 设置文字 */
  setText(text: string): this {
    this._options.text = text;
    this._textObj.setText(text);
    this._layoutContent();
    return this;
  }

  /** 获取当前状态 */
  get state(): ButtonState {
    return this._state;
  }

  /** 是否禁用 */
  get disabled(): boolean {
    return this._state === ButtonState.DISABLED;
  }

  destroy(fromScene?: boolean): void {
    this._clickHandlers = [];
    this.scene.input.setDefaultCursor('default');
    super.destroy(fromScene);
  }
}
