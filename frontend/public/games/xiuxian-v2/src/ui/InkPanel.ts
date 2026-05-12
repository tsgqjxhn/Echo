/**
 * 《问道长生》Phaser 3 重构版 —— 水墨面板基类
 * Phase 2A: 水墨风格UI组件库
 *
 * 继承 Phaser.GameObjects.Container，提供国风水墨视觉的面板容器。
 * 支持圆角背景、九宫格边框、阴影、标题栏、遮罩层关闭等完整面板功能。
 */

import { eventBus, GameEventType } from '../managers/EventBus';

/** 水墨主题配色 */
export const INK_COLORS = {
  /** 青黛色 - 主色调 */
  primary: 0x4A6741,
  /** 深青黛 */
  primaryDark: 0x3a5232,
  /** 浅青黛 */
  primaryLight: 0x5a7d51,
  /** 牙白色 - 文字/高亮 */
  ivory: 0xF5F5DC,
  /** 淡墨色 - 背景/边框 */
  inkGray: 0x333333,
  /** 浅墨色 */
  inkLight: 0x555555,
  /** 金色 - 修为/重要 */
  gold: 0xD4AF37,
  /** 红色 - 生命 */
  red: 0xC0392B,
  /** 蓝色 - 法力 */
  blue: 0x2980B9,
  /** 半透明黑 - 阴影 */
  shadow: 0x000000,
  /** 遮罩层 */
  overlay: 0x000000,
} as const;

/** 面板配置选项 */
export interface InkPanelOptions {
  /** 面板宽度 */
  width: number;
  /** 面板高度 */
  height: number;
  /** 圆角半径，默认 12 */
  radius?: number;
  /** 标题文字，可选 */
  title?: string;
  /** 是否显示遮罩层，默认 true */
  showOverlay?: boolean;
  /** 是否点击遮罩关闭，默认 true */
  closeOnOverlay?: boolean;
  /** 入场动画，默认 true */
  animate?: boolean;
  /** 是否可拖拽，默认 false */
  draggable?: boolean;
}

export class InkPanel extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _border!: Phaser.GameObjects.Graphics;
  private _titleBar?: Phaser.GameObjects.Graphics;
  private _titleText?: Phaser.GameObjects.Text;
  private _overlay?: Phaser.GameObjects.Rectangle;
  private _width: number;
  private _height: number;
  private _radius: number;
  private _options: InkPanelOptions;
  private _isVisible = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: InkPanelOptions) {
    super(scene, x, y);
    this._width = options.width;
    this._height = options.height;
    this._radius = options.radius ?? 12;
    this._options = options;

    this._buildPanel();
    this.setDepth(100);
    this.setVisible(false);
    this.setAlpha(0);

    // 默认启用交互，接收点击事件防止穿透
    this.setSize(this._width, this._height);
    this.setInteractive({ useHandCursor: false });

    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _buildPanel(): void {
    // 阴影
    this._bg = this.scene.add.graphics();
    this._drawShadow(this._bg);
    this.add(this._bg);

    // 边框
    this._border = this.scene.add.graphics();
    this._drawBorder(this._border);
    this.add(this._border);

    // 主体背景（青黛色渐变模拟）
    const bgGraphics = this.scene.add.graphics();
    this._drawBackground(bgGraphics);
    this.add(bgGraphics);

    // 标题栏
    if (this._options.title) {
      this._titleBar = this.scene.add.graphics();
      this._drawTitleBar(this._titleBar);
      this.add(this._titleBar);

      this._titleText = this.scene.add.text(0, -this._height / 2 + 18, this._options.title, {
        fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
        fontSize: '18px',
        color: '#F5F5DC',
        align: 'center',
      });
      this._titleText.setOrigin(0.5);
      this.add(this._titleText);
    }
  }

  private _drawShadow(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(INK_COLORS.shadow, 0.3);
    g.fillRoundedRect(
      -this._width / 2 + 4,
      -this._height / 2 + 4,
      this._width,
      this._height,
      this._radius
    );
  }

  private _drawBorder(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(2, INK_COLORS.ivory, 0.4);
    g.strokeRoundedRect(
      -this._width / 2,
      -this._height / 2,
      this._width,
      this._height,
      this._radius
    );
  }

  private _drawBackground(g: Phaser.GameObjects.Graphics): void {
    // 主色块 - 青黛色半透明
    g.fillStyle(INK_COLORS.primary, 0.92);
    g.fillRoundedRect(
      -this._width / 2,
      -this._height / 2,
      this._width,
      this._height,
      this._radius
    );

    // 顶部微亮渐变效果（用半透明矩形模拟）
    g.fillStyle(INK_COLORS.primaryLight, 0.15);
    g.fillRoundedRect(
      -this._width / 2 + 1,
      -this._height / 2 + 1,
      this._width - 2,
      this._height * 0.3,
      { tl: this._radius, tr: this._radius, bl: 0, br: 0 }
    );
  }

  private _drawTitleBar(g: Phaser.GameObjects.Graphics): void {
    const barHeight = 36;
    g.fillStyle(INK_COLORS.primaryDark, 0.85);
    g.fillRoundedRect(
      -this._width / 2 + 1,
      -this._height / 2 + 1,
      this._width - 2,
      barHeight,
      { tl: this._radius, tr: this._radius, bl: 0, br: 0 }
    );
  }

  // ==========================================================================
  // 遮罩层
  // ==========================================================================

  private _createOverlay(): void {
    const camera = this.scene.cameras.main;
    this._overlay = this.scene.add.rectangle(
      camera.width / 2,
      camera.height / 2,
      camera.width,
      camera.height,
      INK_COLORS.overlay,
      0.6
    );
    this._overlay.setDepth(99);
    this._overlay.setInteractive({ useHandCursor: true });

    if (this._options.closeOnOverlay !== false) {
      this._overlay.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.hide();
      });
    }
  }

  private _destroyOverlay(): void {
    if (this._overlay) {
      this._overlay.destroy();
      this._overlay = undefined;
    }
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /** 显示面板 */
  show(): void {
    if (this._isVisible) return;
    this._isVisible = true;

    if (this._options.showOverlay !== false) {
      this._createOverlay();
    }

    this.setVisible(true);
    eventBus.emit(GameEventType.UI_PANEL_OPENED, { panel: this.constructor.name });

    if (this._options.animate !== false) {
      this.y += 60;
      this.setAlpha(0);
      this.scene.tweens.add({
        targets: this,
        y: this.y - 60,
        alpha: 1,
        duration: 300,
        ease: 'Cubic.easeInOut',
      });
    } else {
      this.setAlpha(1);
    }
  }

  /** 隐藏面板 */
  hide(): void {
    if (!this._isVisible) return;

    if (this._options.animate !== false) {
      this.scene.tweens.add({
        targets: this,
        y: this.y + 60,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this._finishHide();
        },
      });
    } else {
      this._finishHide();
    }
  }

  private _finishHide(): void {
    this._isVisible = false;
    this.setVisible(false);
    this.setAlpha(0);
    this._destroyOverlay();
    eventBus.emit(GameEventType.UI_PANEL_CLOSED, { panel: this.constructor.name });
  }

  /** 设置标题 */
  setTitle(title: string): void {
    if (this._titleText) {
      this._titleText.setText(title);
    } else {
      // 动态添加标题
      this._options.title = title;
      this._titleBar = this.scene.add.graphics();
      this._drawTitleBar(this._titleBar);
      this.add(this._titleBar);

      this._titleText = this.scene.add.text(0, -this._height / 2 + 18, title, {
        fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
        fontSize: '18px',
        color: '#F5F5DC',
        align: 'center',
      });
      this._titleText.setOrigin(0.5);
      this.add(this._titleText);
    }
  }

  /** 当前是否可见 */
  get isPanelVisible(): boolean {
    return this._isVisible;
  }

  /** 面板内容区域原点偏移（考虑标题栏） */
  get contentOriginY(): number {
    return this._options.title ? -this._height / 2 + 42 : -this._height / 2 + 12;
  }

  /** 面板内容区域可用高度 */
  get contentHeight(): number {
    return this._options.title ? this._height - 48 : this._height - 24;
  }

  // ==========================================================================
  // 销毁
  // ==========================================================================

  destroy(fromScene?: boolean): void {
    this._destroyOverlay();
    super.destroy(fromScene);
  }
}
