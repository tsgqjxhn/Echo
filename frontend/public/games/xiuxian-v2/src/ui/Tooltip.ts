/**
 * 《问道长生》Phaser 3 重构版 —— 提示浮层
 * Phase 2A: 水墨风格UI组件库
 *
 * 延迟显示、智能避让屏幕边界、支持富文本（多行、颜色区分）。
 */

import { INK_COLORS } from './InkPanel';

/** 富文本片段 */
export interface TooltipTextSegment {
  text: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
}

/** 提示浮层配置 */
export interface TooltipOptions {
  /** 内容：纯文本或富文本片段数组 */
  content: string | TooltipTextSegment[];
  /** 最大宽度，默认 240 */
  maxWidth?: number;
  /** 行间距，默认 4 */
  lineSpacing?: number;
  /** 内边距，默认 12 */
  padding?: number;
  /** 延迟显示毫秒，默认 500 */
  delay?: number;
}

export class Tooltip extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _textLines: Phaser.GameObjects.Text[] = [];
  private _delayTimer?: ReturnType<typeof setTimeout>;

  private _maxWidth: number;
  private _lineSpacing: number;
  private _padding: number;
  private _delay: number;

  private _targetX = 0;
  private _targetY = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -1000, -1000); // 初始放在屏幕外

    this._maxWidth = 240;
    this._lineSpacing = 4;
    this._padding = 12;
    this._delay = 500;

    this._buildTooltip();
    this.setDepth(200);
    this.setVisible(false);
    this.setAlpha(0);

    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _buildTooltip(): void {
    this._bg = this.scene.add.graphics();
    this.add(this._bg);
  }

  private _drawBackground(width: number, height: number): void {
    this._bg.clear();

    const halfW = width / 2;
    const halfH = height / 2;
    const r = 8;

    // 阴影
    this._bg.fillStyle(INK_COLORS.shadow, 0.25);
    this._bg.fillRoundedRect(-halfW + 3, -halfH + 3, width, height, r);

    // 背景（深墨色，半透明）
    this._bg.fillStyle(INK_COLORS.inkGray, 0.95);
    this._bg.fillRoundedRect(-halfW, -halfH, width, height, r);

    // 边框
    this._bg.lineStyle(1, INK_COLORS.ivory, 0.3);
    this._bg.strokeRoundedRect(-halfW, -halfH, width, height, r);
  }

  // ==========================================================================
  // 内容渲染
  // ==========================================================================

  private _renderContent(content: string | TooltipTextSegment[]): { width: number; height: number } {
    // 清理旧文本
    for (const line of this._textLines) {
      line.destroy();
    }
    this._textLines = [];

    const segments: TooltipTextSegment[] =
      typeof content === 'string' ? [{ text: content, color: '#F5F5DC' }] : content;

    let currentY = 0;
    let maxLineWidth = 0;

    for (const seg of segments) {
      const fontSize = seg.fontSize ?? 14;
      const fontStyle = seg.bold ? 'bold' : 'normal';
      const color = seg.color ?? '#F5F5DC';
      const sizeStr = typeof fontSize === 'number' ? `${fontSize}px` : `${fontSize}`;

      // 按换行符分割
      const lines = seg.text.split('\n');
      for (const lineText of lines) {
        const textObj = this.scene.add.text(0, currentY, lineText, {
          fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
          fontSize: sizeStr,
          fontStyle: fontStyle,
          color: color,
          wordWrap: { width: this._maxWidth - this._padding * 2 },
        });
        textObj.setOrigin(0, 0);
        this.add(textObj);
        this._textLines.push(textObj);

        const bounds = textObj.getBounds();
        maxLineWidth = Math.max(maxLineWidth, bounds.width);
        currentY += bounds.height + this._lineSpacing;
      }
    }

    // 去除最后一行的额外间距
    currentY -= this._lineSpacing;

    return {
      width: Math.min(maxLineWidth + this._padding * 2, this._maxWidth),
      height: currentY + this._padding * 2,
    };
  }

  // ==========================================================================
  // 智能定位
  // ==========================================================================

  private _positionTooltip(): void {
    const camera = this.scene.cameras.main;
    const scale = this.scene.game.scale;
    const screenW = scale.width;
    const screenH = scale.height;

    const bounds = this.getBounds();
    const tipW = bounds.width;
    const tipH = bounds.height;

    let x = this._targetX + 16;
    let y = this._targetY + 16;

    // 右边界避让
    if (x + tipW / 2 > screenW) {
      x = this._targetX - tipW / 2 - 16;
    }

    // 左边界避让
    if (x - tipW / 2 < 0) {
      x = tipW / 2 + 8;
    }

    // 下边界避让
    if (y + tipH / 2 > screenH) {
      y = this._targetY - tipH / 2 - 16;
    }

    // 上边界避让
    if (y - tipH / 2 < 0) {
      y = tipH / 2 + 8;
    }

    this.setPosition(x, y);
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /**
   * 显示提示（带延迟）
   * @param content 提示内容
   * @param x 目标 X 坐标（屏幕坐标）
   * @param y 目标 Y 坐标（屏幕坐标）
   * @param options 可选配置（覆盖默认）
   */
  show(
    content: string | TooltipTextSegment[],
    x: number,
    y: number,
    options?: Partial<TooltipOptions>
  ): void {
    this.hide();

    // 应用配置
    if (options?.maxWidth !== undefined) this._maxWidth = options.maxWidth;
    if (options?.lineSpacing !== undefined) this._lineSpacing = options.lineSpacing;
    if (options?.padding !== undefined) this._padding = options.padding;
    if (options?.delay !== undefined) this._delay = options.delay;

    this._targetX = x;
    this._targetY = y;

    this._delayTimer = setTimeout(() => {
      const size = this._renderContent(content);
      this._drawBackground(size.width, size.height);

      // 居中文字
      const halfW = size.width / 2;
      const startY = -size.height / 2 + this._padding;
      let currentY = startY;
      for (const line of this._textLines) {
        line.setPosition(-halfW + this._padding, currentY);
        currentY += line.height + this._lineSpacing;
      }

      this._positionTooltip();
      this.setVisible(true);
      this.setAlpha(0);

      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }, this._delay);
  }

  /** 隐藏提示 */
  hide(): void {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
      this._delayTimer = undefined;
    }

    this.scene.tweens.killTweensOf(this);
    this.setVisible(false);
    this.setAlpha(0);
  }

  /** 更新位置（用于跟随鼠标） */
  updatePosition(x: number, y: number): void {
    this._targetX = x;
    this._targetY = y;
    if (this.visible) {
      this._positionTooltip();
    }
  }

  destroy(fromScene?: boolean): void {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer);
    }
    for (const line of this._textLines) {
      line.destroy();
    }
    this._textLines = [];
    super.destroy(fromScene);
  }
}
