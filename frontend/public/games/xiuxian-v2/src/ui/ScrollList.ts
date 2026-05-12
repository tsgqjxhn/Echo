/**
 * 《问道长生》Phaser 3 重构版 —— 滚动列表
 * Phase 2A: 水墨风格UI组件库
 *
 * 支持惯性滚动、边界回弹、对象池复用列表项。
 * 适用于背包物品列表、功法列表等场景。
 */

import { INK_COLORS } from './InkPanel';
import { clamp } from '../utils';

/** 列表项数据 */
export interface ScrollListItem {
  id: string;
  [key: string]: unknown;
}

/** 列表项渲染器 */
export type ListItemRenderer<T extends ScrollListItem> = (
  scene: Phaser.Scene,
  item: T,
  index: number
) => Phaser.GameObjects.GameObject;

/** 滚动列表配置 */
export interface ScrollListOptions<T extends ScrollListItem> {
  /** 可视区域宽度 */
  width: number;
  /** 可视区域高度 */
  height: number;
  /** 每项高度 */
  itemHeight: number;
  /** 项间距 */
  itemSpacing?: number;
  /** 数据数组 */
  data: T[];
  /** 渲染器 */
  renderer: ListItemRenderer<T>;
  /** 选中回调 */
  onSelect?: (item: T, index: number) => void;
}

export class ScrollList<T extends ScrollListItem> extends Phaser.GameObjects.Container {
  private _maskGraphics!: Phaser.GameObjects.Graphics;
  private _contentContainer!: Phaser.GameObjects.Container;
  private _itemsContainer!: Phaser.GameObjects.Container;
  private _scrollbar!: Phaser.GameObjects.Graphics;

  private _width: number;
  private _height: number;
  private _itemHeight: number;
  private _itemSpacing: number;
  private _data: T[];
  private _renderer: ListItemRenderer<T>;
  private _onSelect?: (item: T, index: number) => void;

  // 滚动状态
  private _scrollY = 0;
  private _velocity = 0;
  private _isDragging = false;
  private _dragStartY = 0;
  private _scrollStartY = 0;
  private _lastPointerY = 0;
  private _lastTime = 0;

  // 对象池
  private _pool: Phaser.GameObjects.GameObject[] = [];
  private _visibleItems: Map<number, Phaser.GameObjects.GameObject> = new Map();

  // 常量
  private readonly _friction = 0.92;
  private readonly _bounceFactor = 0.4;
  private readonly _minVelocity = 0.5;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ScrollListOptions<T>) {
    super(scene, x, y);

    this._width = options.width;
    this._height = options.height;
    this._itemHeight = options.itemHeight;
    this._itemSpacing = options.itemSpacing ?? 4;
    this._data = [...options.data];
    this._renderer = options.renderer;
    this._onSelect = options.onSelect;

    this._buildList();
    this._setupInteractions();

    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _buildList(): void {
    // 背景（淡墨色边框区域）
    const bg = this.scene.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.25);
    bg.fillRoundedRect(-this._width / 2, -this._height / 2, this._width, this._height, 6);
    bg.lineStyle(1, INK_COLORS.inkLight, 0.3);
    bg.strokeRoundedRect(-this._width / 2, -this._height / 2, this._width, this._height, 6);
    this.add(bg);

    // 内容容器（被遮罩限制）
    this._contentContainer = this.scene.add.container(0, 0);
    this.add(this._contentContainer);

    // 项容器
    this._itemsContainer = this.scene.add.container(0, 0);
    this._contentContainer.add(this._itemsContainer);

    // 遮罩
    this._maskGraphics = this.scene.add.graphics();
    this._maskGraphics.fillStyle(0xffffff);
    this._maskGraphics.fillRoundedRect(
      this.x - this._width / 2,
      this.y - this._height / 2,
      this._width,
      this._height,
      6
    );
    const mask = this._maskGraphics.createGeometryMask();
    this._contentContainer.setMask(mask);

    // 滚动条
    this._scrollbar = this.scene.add.graphics();
    this.add(this._scrollbar);

    this._refreshItems();
    this._updateScrollbar();
  }

  // ==========================================================================
  // 对象池与渲染
  // ==========================================================================

  private _getFromPool(): Phaser.GameObjects.GameObject | undefined {
    return this._pool.pop();
  }

  private _returnToPool(item: Phaser.GameObjects.GameObject): void {
    item.setVisible(false);
    item.setActive(false);
    if (item.parentContainer) {
      item.parentContainer.remove(item);
    }
    this._pool.push(item);
  }

  private _refreshItems(): void {
    const startIndex = Math.max(0, Math.floor(-this._scrollY / (this._itemHeight + this._itemSpacing)));
    const visibleCount = Math.ceil(this._height / (this._itemHeight + this._itemSpacing)) + 1;
    const endIndex = Math.min(this._data.length - 1, startIndex + visibleCount);

    // 回收不在可见范围的项
    for (const [index, item] of this._visibleItems) {
      if (index < startIndex || index > endIndex) {
        this._returnToPool(item);
        this._visibleItems.delete(index);
      }
    }

    // 创建/复用可见项
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= this._data.length) break;
      if (this._visibleItems.has(i)) continue;

      let itemObj = this._getFromPool();
      if (!itemObj) {
        itemObj = this._renderer(this.scene, this._data[i], i);
      }

      itemObj.setActive(true);
      itemObj.setVisible(true);

      const yPos = i * (this._itemHeight + this._itemSpacing) + this._itemHeight / 2;
      itemObj.setPosition(0, yPos);

      // 如果项是 Container，设置交互
      if (itemObj instanceof Phaser.GameObjects.Container && this._onSelect) {
        itemObj.setSize(this._width - 16, this._itemHeight);
        itemObj.setInteractive({ useHandCursor: true });
        itemObj.off(Phaser.Input.Events.POINTER_DOWN);
        itemObj.on(Phaser.Input.Events.POINTER_DOWN, () => {
          if (Math.abs(this._velocity) < 1) {
            this._onSelect!(this._data[i], i);
          }
        });
      }

      this._itemsContainer.add(itemObj);
      this._visibleItems.set(i, itemObj);
    }

    this._itemsContainer.y = this._scrollY;
  }

  // ==========================================================================
  // 滚动条
  // ==========================================================================

  private _updateScrollbar(): void {
    this._scrollbar.clear();

    const contentHeight = this._data.length * (this._itemHeight + this._itemSpacing);
    if (contentHeight <= this._height) return;

    const ratio = this._height / contentHeight;
    const barHeight = Math.max(30, this._height * ratio);
    const maxScroll = contentHeight - this._height;
    const scrollRatio = maxScroll > 0 ? -this._scrollY / maxScroll : 0;
    const barY = -this._height / 2 + scrollRatio * (this._height - barHeight);

    const barX = this._width / 2 - 8;

    this._scrollbar.fillStyle(INK_COLORS.ivory, 0.25);
    this._scrollbar.fillRoundedRect(barX - 3, barY, 6, barHeight, 3);
  }

  // ==========================================================================
  // 交互
  // ==========================================================================

  private _setupInteractions(): void {
    const hitArea = this.scene.add.zone(0, 0, this._width, this._height);
    hitArea.setInteractive({ draggable: true });
    this.add(hitArea);

    hitArea.on(Phaser.Input.Events.DRAG_START, (_pointer: Phaser.Pointer, dragX: number, dragY: number) => {
      this._isDragging = true;
      this._velocity = 0;
      this._dragStartY = dragY;
      this._scrollStartY = this._scrollY;
      this._lastPointerY = dragY;
      this._lastTime = performance.now();
    });

    hitArea.on(Phaser.Input.Events.DRAG, (_pointer: Phaser.Pointer, dragX: number, dragY: number) => {
      if (!this._isDragging) return;

      const now = performance.now();
      const dt = now - this._lastTime;
      if (dt > 0) {
        this._velocity = (dragY - this._lastPointerY) / dt * 16;
      }
      this._lastPointerY = dragY;
      this._lastTime = now;

      this._scrollY = this._scrollStartY + (dragY - this._dragStartY);
      this._clampScroll();
      this._refreshItems();
      this._updateScrollbar();
    });

    hitArea.on(Phaser.Input.Events.DRAG_END, () => {
      this._isDragging = false;
    });
  }

  // ==========================================================================
  // 更新循环（惯性 + 回弹）
  // ==========================================================================

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this._isDragging || this._data.length === 0) return;

    const contentHeight = this._data.length * (this._itemHeight + this._itemSpacing);
    const maxScroll = Math.max(0, contentHeight - this._height);

    // 惯性滚动
    if (Math.abs(this._velocity) > this._minVelocity) {
      this._scrollY += this._velocity;
      this._velocity *= this._friction;
      this._clampScroll();
      this._refreshItems();
      this._updateScrollbar();
    }

    // 边界回弹
    const dt = delta / 16;
    if (this._scrollY > 0) {
      this._scrollY = Phaser.Math.Clamp(
        this._scrollY - this._scrollY * (1 - this._bounceFactor) * dt * 0.1,
        0,
        this._scrollY
      );
      if (Math.abs(this._scrollY) < 0.5) this._scrollY = 0;
      this._refreshItems();
      this._updateScrollbar();
    } else if (maxScroll > 0 && this._scrollY < -maxScroll) {
      const over = -maxScroll - this._scrollY;
      this._scrollY = -maxScroll + over * this._bounceFactor * dt * 0.1;
      if (Math.abs(this._scrollY + maxScroll) < 0.5) this._scrollY = -maxScroll;
      this._refreshItems();
      this._updateScrollbar();
    }
  }

  private _clampScroll(): void {
    const contentHeight = this._data.length * (this._itemHeight + this._itemSpacing);
    const maxScroll = Math.max(0, contentHeight - this._height);

    // 拖动时允许超出边界（回弹效果）
    if (this._isDragging) {
      // 允许拖出边界最多 60px
      this._scrollY = clamp(this._scrollY, -maxScroll - 60, 60);
    } else {
      this._scrollY = clamp(this._scrollY, -maxScroll, 0);
    }
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /** 设置数据 */
  setData(data: T[]): this {
    // 回收所有可见项
    for (const [index, item] of this._visibleItems) {
      this._returnToPool(item);
    }
    this._visibleItems.clear();

    this._data = [...data];
    this._scrollY = 0;
    this._velocity = 0;
    this._refreshItems();
    this._updateScrollbar();
    return this;
  }

  /** 滚动到指定索引 */
  scrollToIndex(index: number, animate: boolean = true): this {
    const targetY = -index * (this._itemHeight + this._itemSpacing);
    const contentHeight = this._data.length * (this._itemHeight + this._itemSpacing);
    const maxScroll = Math.max(0, contentHeight - this._height);
    const clampedY = clamp(targetY, -maxScroll, 0);

    if (animate) {
      const fromY = this._scrollY;
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 300,
        ease: 'Cubic.easeOut',
        onUpdate: (tween: Phaser.Tween, value: number) => {
          this._scrollY = fromY + (clampedY - fromY) * value;
          this._clampScroll();
          this._refreshItems();
          this._updateScrollbar();
        },
      });
    } else {
      this._scrollY = clampedY;
      this._refreshItems();
      this._updateScrollbar();
    }
    return this;
  }

  /** 获取当前数据 */
  get data(): T[] {
    return [...this._data];
  }

  destroy(fromScene?: boolean): void {
    // 清理对象池
    for (const item of this._pool) {
      item.destroy();
    }
    this._pool = [];
    this._visibleItems.clear();
    super.destroy(fromScene);
  }
}
