/**
 * 《问道长生》Phaser 3 重构版 —— 水墨进度条
 * Phase 2A: 水墨风格UI组件库
 *
 * 支持水平/垂直方向，多种颜色类型，分段显示和平滑动画。
 */

import { INK_COLORS } from './InkPanel';
import { clamp } from '../utils';

/** 进度条类型，决定填充色 */
export type ProgressBarType = 'cultivation' | 'hp' | 'mp' | 'stamina' | 'custom';

/** 进度条方向 */
export type ProgressBarDirection = 'horizontal' | 'vertical';

/** 进度条配置选项 */
export interface InkProgressBarOptions {
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 方向，默认 horizontal */
  direction?: ProgressBarDirection;
  /** 类型，默认 cultivation（金色） */
  type?: ProgressBarType;
  /** 自定义填充色（type='custom' 时生效） */
  fillColor?: number;
  /** 是否显示文字，默认 true */
  showText?: boolean;
  /** 文字格式，默认 "current / max" */
  textFormat?: 'current/max' | 'percent' | 'current' | 'none';
  /** 分段数量（如修为突破段数），默认 1 */
  segments?: number;
  /** 圆角半径，默认 4 */
  radius?: number;
}

export class InkProgressBar extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _fill!: Phaser.GameObjects.Graphics;
  private _text?: Phaser.GameObjects.Text;

  private _width: number;
  private _height: number;
  private _direction: ProgressBarDirection;
  private _type: ProgressBarType;
  private _customColor?: number;
  private _showText: boolean;
  private _textFormat: string;
  private _segments: number;
  private _radius: number;

  private _current = 0;
  private _max = 100;
  private _displayedRatio = 0;
  private _tween?: Phaser.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, options: InkProgressBarOptions) {
    super(scene, x, y);

    this._width = options.width;
    this._height = options.height;
    this._direction = options.direction ?? 'horizontal';
    this._type = options.type ?? 'cultivation';
    this._customColor = options.fillColor;
    this._showText = options.showText !== false;
    this._textFormat = options.textFormat ?? 'current/max';
    this._segments = Math.max(1, options.segments ?? 1);
    this._radius = options.radius ?? 4;

    this._buildBar();
    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _buildBar(): void {
    // 背景
    this._bg = this.scene.add.graphics();
    this._drawBackground();
    this.add(this._bg);

    // 填充
    this._fill = this.scene.add.graphics();
    this.add(this._fill);

    // 文字
    if (this._showText) {
      this._text = this.scene.add.text(0, 0, '', {
        fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
        fontSize: `${Math.min(this._height * 0.6, 14)}px`,
        color: '#F5F5DC',
        align: 'center',
      });
      this._text.setOrigin(0.5);
      this.add(this._text);
    }

    this._updateFill(0);
  }

  private _drawBackground(): void {
    const halfW = this._width / 2;
    const halfH = this._height / 2;

    // 淡墨色背景
    this._bg.fillStyle(INK_COLORS.inkGray, 0.7);
    this._bg.fillRoundedRect(-halfW, -halfH, this._width, this._height, this._radius);

    // 边框
    this._bg.lineStyle(1, INK_COLORS.inkLight, 0.4);
    this._bg.strokeRoundedRect(-halfW, -halfH, this._width, this._height, this._radius);

    // 分段线
    if (this._segments > 1) {
      this._bg.lineStyle(1, INK_COLORS.inkGray, 0.6);
      if (this._direction === 'horizontal') {
        const segWidth = this._width / this._segments;
        for (let i = 1; i < this._segments; i++) {
          const x = -halfW + segWidth * i;
          this._bg.beginPath();
          this._bg.moveTo(x, -halfH + 2);
          this._bg.lineTo(x, halfH - 2);
          this._bg.strokePath();
        }
      } else {
        const segHeight = this._height / this._segments;
        for (let i = 1; i < this._segments; i++) {
          const y = -halfH + segHeight * i;
          this._bg.beginPath();
          this._bg.moveTo(-halfW + 2, y);
          this._bg.lineTo(halfW - 2, y);
          this._bg.strokePath();
        }
      }
    }
  }

  // ==========================================================================
  // 颜色映射
  // ==========================================================================

  private _getFillColor(): number {
    switch (this._type) {
      case 'cultivation': return INK_COLORS.gold;
      case 'hp': return INK_COLORS.red;
      case 'mp': return INK_COLORS.blue;
      case 'stamina': return INK_COLORS.primaryLight;
      case 'custom': return this._customColor ?? INK_COLORS.ivory;
      default: return INK_COLORS.gold;
    }
  }

  // ==========================================================================
  // 更新填充
  // ==========================================================================

  private _updateFill(ratio: number): void {
    this._fill.clear();

    const clampedRatio = clamp(ratio, 0, 1);
    if (clampedRatio <= 0) {
      this._updateText();
      return;
    }

    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const fillColor = this._getFillColor();

    let fillW = this._width;
    let fillH = this._height;
    let x = -halfW;
    let y = -halfH;

    if (this._direction === 'horizontal') {
      fillW = this._width * clampedRatio;
    } else {
      fillH = this._height * clampedRatio;
      y = halfH - fillH;
    }

    // 填充主体
    this._fill.fillStyle(fillColor, 0.85);
    this._fill.fillRoundedRect(x + 1, y + 1, fillW - 2, fillH - 2, this._radius);

    // 高光条（模拟渐变）
    this._fill.fillStyle(0xffffff, 0.12);
    if (this._direction === 'horizontal') {
      this._fill.fillRoundedRect(x + 1, y + 1, fillW - 2, (fillH - 2) * 0.35, { tl: this._radius, tr: this._radius, bl: 0, br: 0 });
    } else {
      this._fill.fillRoundedRect(x + 1, y + 1, (fillW - 2) * 0.35, fillH - 2, { tl: this._radius, tr: 0, bl: this._radius, br: 0 });
    }

    this._updateText();
  }

  private _updateText(): void {
    if (!this._text) return;

    let text = '';
    switch (this._textFormat) {
      case 'current/max':
        text = `${Math.round(this._current)} / ${Math.round(this._max)}`;
        break;
      case 'percent':
        text = `${Math.round((this._current / this._max) * 100)}%`;
        break;
      case 'current':
        text = `${Math.round(this._current)}`;
        break;
      default:
        text = '';
    }
    this._text.setText(text);
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /**
   * 设置当前值和目标值
   * @param current 当前值
   * @param max 最大值
   * @param animate 是否播放动画，默认 true
   */
  setValue(current: number, max: number, animate: boolean = true): this {
    this._current = current;
    this._max = max;
    const targetRatio = max > 0 ? current / max : 0;

    if (animate) {
      // 停止之前的动画
      if (this._tween) {
        this._tween.stop();
        this._tween = undefined;
      }

      this._tween = this.scene.tweens.addCounter({
        from: this._displayedRatio,
        to: targetRatio,
        duration: 300,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          this._displayedRatio = tween.getValue();
          this._updateFill(this._displayedRatio);
        },
        onComplete: () => {
          this._displayedRatio = targetRatio;
          this._updateFill(targetRatio);
          this._tween = undefined;
        },
      });
    } else {
      this._displayedRatio = targetRatio;
      this._updateFill(targetRatio);
    }

    return this;
  }

  /** 获取当前值 */
  get current(): number {
    return this._current;
  }

  /** 获取最大值 */
  get max(): number {
    return this._max;
  }

  /** 设置进度条类型 */
  setType(type: ProgressBarType, fillColor?: number): this {
    this._type = type;
    if (fillColor !== undefined) this._customColor = fillColor;
    this._updateFill(this._displayedRatio);
    return this;
  }

  /** 设置文字格式 */
  setTextFormat(format: InkProgressBarOptions['textFormat']): this {
    this._textFormat = format ?? 'current/max';
    this._updateText();
    return this;
  }

  destroy(fromScene?: boolean): void {
    if (this._tween) {
      this._tween.stop();
      this._tween = undefined;
    }
    super.destroy(fromScene);
  }
}
