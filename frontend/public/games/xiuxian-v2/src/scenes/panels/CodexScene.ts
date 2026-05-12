/**
 * 《问道长生》Phaser 3 重构版 —— 图鉴系统面板
 * Phase 4: 图鉴系统
 *
 * 全屏 InkPanel，标题"图鉴"
 * TabGroup：敌人/物品/地点/功法 4个分类
 * 每个分类用 ScrollList 展示条目
 * 条目默认锁定（显示为???），解锁后显示真实信息
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { TabGroup, ScrollList } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { ENEMIES, ITEMS, WORLD_DOMAINS, getEnemyConfig, RARITY_COLORS, RARITY_NAMES } from '../../data/gameData';

/** 图鉴分类 */
type CodexCategory = 'enemy' | 'item' | 'location' | 'technique';

/** 图鉴条目数据 */
interface CodexEntryData {
  id: string;
  name: string;
  category: CodexCategory;
  description: string;
  detail: string;
  color: number;
  index: number;
  [key: string]: unknown;
}

const CATEGORY_TABS: { id: CodexCategory; label: string }[] = [
  { id: 'enemy', label: '敌人' },
  { id: 'item', label: '物品' },
  { id: 'location', label: '地点' },
  { id: 'technique', label: '功法' },
];

export class CodexScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _tabGroup!: TabGroup;
  private _scrollList!: ScrollList<CodexEntryData>;
  private _detailContainer?: Phaser.GameObjects.Container;
  private _currentCategory: CodexCategory = 'enemy';
  private _allEntries: CodexEntryData[] = [];

  constructor() {
    super({ key: 'CodexScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.92,
      title: '图鉴',
      showOverlay: true,
      closeOnOverlay: true,
      animate: true,
    });
    this._mainPanel.show();

    const originalHide = this._mainPanel.hide.bind(this._mainPanel);
    this._mainPanel.hide = () => {
      originalHide();
      this.scene.stop();
    };

    this._buildAllEntries();
    this._buildLayout();
    this._subscribeEvents();
  }

  // ==========================================================================
  // 数据构建
  // ==========================================================================

  private _buildAllEntries(): void {
    this._allEntries = [];

    // 敌人
    Object.values(ENEMIES).forEach((enemy) => {
      this._allEntries.push({
        id: `enemy_${enemy.id}`,
        name: enemy.name,
        category: 'enemy',
        description: `${enemy.realm} · ${enemy.element} · HP:${enemy.hp}`,
        detail: enemy.description ?? '暂无描述',
        color: this._getElementColor(enemy.element),
        index: 0,
      });
    });

    // 物品
    Object.values(ITEMS).forEach((item) => {
      this._allEntries.push({
        id: `item_${item.id}`,
        name: item.name,
        category: 'item',
        description: `${RARITY_NAMES[item.rarity]} · ${item.type}`,
        detail: item.description,
        color: parseInt((RARITY_COLORS[item.rarity] ?? '#E0E0E0').replace('#', '0x')),
        index: 0,
      });
    });

    // 地点（大域）
    WORLD_DOMAINS.forEach((domain) => {
      this._allEntries.push({
        id: `location_${domain.id}`,
        name: domain.name,
        category: 'location',
        description: domain.description.substring(0, 20) + '...',
        detail: domain.description,
        color: domain.color,
        index: 0,
      });
    });

    // 功法（从玩家已学功法 + 预设）
    const business = this._gsm.businessState;
    business.techniques.forEach((tech) => {
      this._allEntries.push({
        id: `technique_${tech.id}`,
        name: tech.name,
        category: 'technique',
        description: `${tech.element} · ${tech.type} · Lv.${tech.level}/${tech.maxLevel}`,
        detail: tech.description ?? '暂无描述',
        color: this._getElementColor(tech.element),
        index: 0,
      });
    });
  }

  private _getElementColor(element: string): number {
    const colors: Record<string, number> = {
      metal: 0xC0C0C0,
      wood: 0x4A6741,
      water: 0x4A90D9,
      fire: 0xD9534F,
      earth: 0x8B6914,
      mixed: 0x9B59B6,
    };
    return colors[element] ?? 0x888888;
  }

  // ==========================================================================
  // 布局
  // ==========================================================================

  private _buildLayout(): void {
    const pw = this._mainPanel.width;
    const ph = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    // TabGroup
    this._tabGroup = new TabGroup(this, 0, contentY + 24, {
      tabs: CATEGORY_TABS.map((t) => ({ id: t.id, label: t.label })),
      tabWidth: 90,
      tabHeight: 36,
      defaultIndex: 0,
      onChange: (tabId: string) => {
        this._currentCategory = tabId as CodexCategory;
        this._refreshList();
        this._clearDetail();
      },
    });
    this._mainPanel.add(this._tabGroup);

    // ScrollList
    this._buildScrollList(0, contentY + contentH * 0.5 + 10, pw * 0.88, contentH - 70);

    // 返回按钮
    const backBtn = this.createInkButton(pw * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);

    this._refreshList();
  }

  private _buildScrollList(x: number, y: number, w: number, h: number): void {
    const list = new ScrollList<CodexEntryData>(this, x, y, {
      width: w,
      height: h,
      itemHeight: 56,
      itemSpacing: 4,
      data: [] as CodexEntryData[],
      renderer: (scene, item) => this._renderEntryCell(scene, item as CodexEntryData, w),
      onSelect: (item) => this._showEntryDetail(item as CodexEntryData),
    });
    this._scrollList = list;
    this._mainPanel.add(list);
  }

  private _renderEntryCell(
    scene: Phaser.Scene,
    item: CodexEntryData,
    listW: number
  ): Phaser.GameObjects.Container {
    const cellW = listW - 16;
    const cellH = 52;
    const container = scene.add.container(0, 0);

    const isUnlocked = this._gsm.isCodexUnlocked(item.id);

    // 背景
    const bg = scene.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, isUnlocked ? 0.25 : 0.15);
    bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
    container.add(bg);

    if (isUnlocked) {
      // 解锁：显示真实信息
      const color = item.color;
      const border = scene.add.graphics();
      border.lineStyle(1.5, color, 0.6);
      border.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
      container.add(border);

      // 图标
      const icon = scene.add.graphics();
      icon.fillStyle(color, 0.3);
      icon.fillCircle(-cellW / 2 + 22, 0, 14);
      container.add(icon);

      const iconText = scene.add.text(-cellW / 2 + 22, 0, item.name.charAt(0), {
        fontFamily: '"Microsoft YaHei", serif',
        fontSize: '14px',
        color: '#F5F5DC',
      });
      iconText.setOrigin(0.5);
      container.add(iconText);

      // 名称
      const nameText = scene.add.text(-cellW / 2 + 48, -8, item.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#F5F5DC',
      });
      nameText.setOrigin(0, 0.5);
      container.add(nameText);

      // 描述
      const descText = scene.add.text(-cellW / 2 + 48, 10, item.description, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: '#AAAAAA',
      });
      descText.setOrigin(0, 0.5);
      container.add(descText);
    } else {
      // 锁定：显示???
      const lockText = scene.add.text(0, 0, '???', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#555555',
      });
      lockText.setOrigin(0.5);
      container.add(lockText);

      const hintText = scene.add.text(0, 14, '尚未解锁', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '10px',
        color: '#444444',
      });
      hintText.setOrigin(0.5);
      container.add(hintText);
    }

    return container;
  }

  private _refreshList(): void {
    const filtered = this._allEntries
      .filter((e) => e.category === this._currentCategory)
      .map((e, index) => {
        e.index = index;
        return e;
      });
    this._scrollList?.setData(filtered);
  }

  // ==========================================================================
  // 详情弹窗
  // ==========================================================================

  private _showEntryDetail(item: CodexEntryData): void {
    const isUnlocked = this._gsm.isCodexUnlocked(item.id);
    this._clearDetail();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const detailPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.7,
      height: h * 0.5,
      title: isUnlocked ? item.name : '???',
      showOverlay: true,
      closeOnOverlay: true,
      animate: true,
    });
    detailPanel.show();

    const content = isUnlocked
      ? item.detail
      : '此条目尚未解锁。\n\n在游戏中遇到对应的敌人、获得物品、到达地点或学习功法后，将自动解锁。';

    const text = this.add.text(0, 0, content, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#CCCCCC',
      align: 'center',
      wordWrap: { width: w * 0.6 },
    });
    text.setOrigin(0.5);
    detailPanel.add(text);

    this._detailContainer = detailPanel as unknown as Phaser.GameObjects.Container;
  }

  private _clearDetail(): void {
    if (this._detailContainer) {
      this._detailContainer.destroy();
      this._detailContainer = undefined;
    }
  }

  // ==========================================================================
  // 事件
  // ==========================================================================

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.CODEX_UNLOCKED, () => {
      this._refreshList();
    });
  }
}
