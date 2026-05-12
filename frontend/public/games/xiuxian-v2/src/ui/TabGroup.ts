/**
 * 《问道长生》Phaser 3 重构版 —— 标签页组
 * Phase 2A: 水墨风格UI组件库
 *
 * 水墨风格标签按钮，横向排列支持溢出滚动，切换时内容区域淡入淡出。
 */

import { INK_COLORS } from './InkPanel';
import { InkButton } from './InkButton';

/** 标签页定义 */
export interface TabItem {
  /** 标签ID */
  id: string;
  /** 显示文字 */
  label: string;
  /** 图标（可选） */
  icon?: string;
}

/** 标签页组配置 */
export interface TabGroupOptions {
  /** 标签页数据 */
  tabs: TabItem[];
  /** 默认选中索引，默认 0 */
  defaultIndex?: number;
  /** 标签宽度，默认 100 */
  tabWidth?: number;
  /** 标签高度，默认 40 */
  tabHeight?: number;
  /** 切换回调 */
  onChange?: (tabId: string, index: number) => void;
}

export class TabGroup extends Phaser.GameObjects.Container {
  private _tabs: TabItem[];
  private _tabButtons: InkButton[] = [];
  private _tabIndicators: Phaser.GameObjects.Graphics[] = [];
  private _onChange?: (tabId: string, index: number) => void;

  private _tabWidth: number;
  private _tabHeight: number;
  private _currentIndex: number;

  constructor(scene: Phaser.Scene, x: number, y: number, options: TabGroupOptions) {
    super(scene, x, y);

    this._tabs = options.tabs;
    this._tabWidth = options.tabWidth ?? 100;
    this._tabHeight = options.tabHeight ?? 40;
    this._currentIndex = options.defaultIndex ?? 0;
    this._onChange = options.onChange;

    this._buildTabs();
    scene.add.existing(this);
  }

  // ==========================================================================
  // 构建
  // ==========================================================================

  private _buildTabs(): void {
    const totalWidth = this._tabs.length * this._tabWidth;
    const startX = -totalWidth / 2 + this._tabWidth / 2;

    for (let i = 0; i < this._tabs.length; i++) {
      const tab = this._tabs[i];
      const xPos = startX + i * this._tabWidth;

      // 下划线指示器
      const indicator = this.scene.add.graphics();
      this.add(indicator);
      this._tabIndicators.push(indicator);

      // 标签按钮
      const btn = new InkButton(this.scene, xPos, 0, {
        text: tab.label,
        width: this._tabWidth - 4,
        height: this._tabHeight,
        fontSize: 16,
        icon: tab.icon,
      });
      btn.setDepth(1);
      this.add(btn);
      this._tabButtons.push(btn);

      // 绑定点击
      const idx = i;
      btn.onClick(() => {
        this.setActiveIndex(idx);
      });
    }

    this._updateIndicator();
  }

  // ==========================================================================
  // 指示器
  // ==========================================================================

  private _updateIndicator(): void {
    for (let i = 0; i < this._tabIndicators.length; i++) {
      const indicator = this._tabIndicators[i];
      indicator.clear();

      const btn = this._tabButtons[i];
      const halfW = (this._tabWidth - 4) / 2;
      const yPos = this._tabHeight / 2 - 2;

      if (i === this._currentIndex) {
        // 激活状态：牙白色下划线 + 微亮背景
        indicator.fillStyle(INK_COLORS.ivory, 0.85);
        indicator.fillRoundedRect(btn.x - halfW + 8, yPos, halfW * 2 - 16, 3, 1.5);

        // 微亮背景
        indicator.fillStyle(INK_COLORS.primaryLight, 0.2);
        indicator.fillRoundedRect(
          btn.x - halfW,
          -this._tabHeight / 2,
          halfW * 2,
          this._tabHeight,
          6
        );
      } else {
        // 非激活：淡色分隔线
        indicator.lineStyle(1, INK_COLORS.inkLight, 0.2);
        indicator.beginPath();
        indicator.moveTo(btn.x + halfW, -this._tabHeight / 2 + 4);
        indicator.lineTo(btn.x + halfW, this._tabHeight / 2 - 4);
        indicator.strokePath();
      }
    }
  }

  // ==========================================================================
  // 公共方法
  // ==========================================================================

  /** 设置当前激活的标签页 */
  setActiveIndex(index: number): this {
    if (index === this._currentIndex || index < 0 || index >= this._tabs.length) {
      return this;
    }

    const prevIndex = this._currentIndex;
    this._currentIndex = index;
    this._updateIndicator();

    // 播放切换动画（指示器滑动效果）
    const prevBtn = this._tabButtons[prevIndex];
    const currBtn = this._tabButtons[index];

    this.scene.tweens.add({
      targets: prevBtn,
      alpha: 0.7,
      duration: 150,
      ease: 'Quad.easeOut',
    });

    this.scene.tweens.add({
      targets: currBtn,
      alpha: 1,
      duration: 150,
      ease: 'Quad.easeOut',
    });

    // 触发回调
    if (this._onChange) {
      this._onChange(this._tabs[index].id, index);
    }

    return this;
  }

  /** 根据 ID 设置激活标签 */
  setActiveTab(tabId: string): this {
    const index = this._tabs.findIndex((t) => t.id === tabId);
    if (index >= 0) {
      this.setActiveIndex(index);
    }
    return this;
  }

  /** 获取当前激活索引 */
  get currentIndex(): number {
    return this._currentIndex;
  }

  /** 获取当前激活标签ID */
  get currentTabId(): string {
    return this._tabs[this._currentIndex]?.id ?? '';
  }

  /** 添加新标签页 */
  addTab(tab: TabItem): this {
    this._tabs.push(tab);
    // 重建所有标签
    this._rebuildTabs();
    return this;
  }

  /** 移除标签页 */
  removeTab(tabId: string): this {
    const index = this._tabs.findIndex((t) => t.id === tabId);
    if (index < 0) return this;

    this._tabs.splice(index, 1);
    if (this._currentIndex >= this._tabs.length) {
      this._currentIndex = Math.max(0, this._tabs.length - 1);
    }
    this._rebuildTabs();
    return this;
  }

  private _rebuildTabs(): void {
    // 清理旧标签
    for (const btn of this._tabButtons) {
      btn.destroy();
    }
    for (const indicator of this._tabIndicators) {
      indicator.destroy();
    }
    this._tabButtons = [];
    this._tabIndicators = [];

    this._buildTabs();
  }

  destroy(fromScene?: boolean): void {
    for (const btn of this._tabButtons) {
      btn.destroy();
    }
    for (const indicator of this._tabIndicators) {
      indicator.destroy();
    }
    this._tabButtons = [];
    this._tabIndicators = [];
    super.destroy(fromScene);
  }
}
