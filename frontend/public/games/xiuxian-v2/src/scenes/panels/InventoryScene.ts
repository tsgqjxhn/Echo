/**
 * 《问道长生》Phaser 3 重构版 —— 背包界面面板
 * Phase 3D: 功能面板实现
 *
 * 背包界面：分类筛选、物品网格、详情面板、搜索、整理
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { ScrollList, InkProgressBar } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { RARITY_COLORS, RARITY_NAMES } from '../../data/gameData';
import type { Item, ItemType } from '../../types';

/** 物品分类 */
const CATEGORIES: { id: ItemType | 'all' | 'misc'; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'pill', name: '丹药' },
  { id: 'material', name: '材料' },
  { id: 'technique', name: '功法' },
  { id: 'equipment', name: '装备' },
  { id: 'misc', name: '杂物' },
];

/** 分类映射（有些类型归入杂物） */
function getItemCategory(type: ItemType): ItemType | 'misc' {
  const miscTypes: ItemType[] = ['treasure', 'currency', 'consumable', 'artifact', 'herb'];
  if (miscTypes.includes(type)) return 'misc';
  return type;
}

/** 物品操作按钮配置 */
function getItemActions(item: Item): { label: string; action: string }[] {
  switch (item.type) {
    case 'pill':
    case 'consumable':
      return [{ label: '使用', action: 'use' }, { label: '丢弃', action: 'discard' }];
    case 'equipment':
    case 'artifact':
      return [{ label: '装备', action: 'equip' }, { label: '丢弃', action: 'discard' }];
    case 'technique':
      return [{ label: '学习', action: 'learn' }, { label: '丢弃', action: 'discard' }];
    default:
      return [{ label: '丢弃', action: 'discard' }];
  }
}

export class InventoryScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _inventory: Item[] = [];
  private _currentCategory: ItemType | 'all' = 'all';
  private _searchQuery = '';
  private _selectedItem?: Item;
  private _maxCapacity = 100;

  // UI
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _gridScrollList!: ScrollList<{ id: string; item: Item; [key: string]: unknown }>;
  private _detailContainer!: Phaser.GameObjects.Container;
  private _capacityText!: Phaser.GameObjects.Text;
  private _categoryBtns: ReturnType<BaseScene['createInkButton']>[] = [];

  constructor() {
    super({ key: 'InventoryScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();
    this._refreshData();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 全屏面板
    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.9,
      title: '背包',
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

    this._buildLayout();
    this._subscribeEvents();
  }

  private _refreshData(): void {
    this._inventory = [...(this._gsm.businessState.inventory as Item[])];
  }

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._refreshData();
      this._refreshGrid();
      this._updateCapacity();
      if (this._selectedItem) {
        const updated = this._inventory.find((i) => i.id === this._selectedItem!.id);
        if (updated) {
          this._selectedItem = updated;
          this._showItemDetail(updated);
        } else {
          this._selectedItem = undefined;
          this._clearDetail();
        }
      }
    });
  }

  // ==========================================================================
  // 布局
  // ==========================================================================

  private _buildLayout(): void {
    const pw = this._mainPanel.width;
    const ph = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    // 顶部工具栏（搜索 + 整理 + 容量）
    this._buildToolbar(0, contentY + 8, pw * 0.9, 40);

    // 左侧 15%：分类标签
    this._buildCategoryBar(-pw * 0.38, contentY + contentH * 0.5, pw * 0.13, contentH - 60);

    // 中间 55%：物品网格
    this._buildItemGrid(-pw * 0.08, contentY + contentH * 0.5 + 16, pw * 0.48, contentH - 68);

    // 右侧 30%：详情面板
    this._buildDetailPanel(pw * 0.32, contentY + contentH * 0.5 + 16, pw * 0.28, contentH - 68);

    // 返回按钮
    const backBtn = this.createInkButton(pw * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);

    this._updateCapacity();
  }

  // ==========================================================================
  // 顶部工具栏
  // ==========================================================================

  private _buildToolbar(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 搜索提示文字（因Phaser无内置Input，用点击弹窗模拟）
    const searchBtn = this.createInkButton(-w / 2 + 60, 0, {
      text: '🔍 搜索物品',
      width: 140,
      height: 36,
      fontSize: 13,
    });
    searchBtn.onClick(() => {
      const query = window.prompt('输入物品名称搜索：', this._searchQuery) ?? '';
      this._searchQuery = query.trim();
      searchBtn.setText(this._searchQuery ? `🔍 ${this._searchQuery}` : '🔍 搜索物品');
      this._refreshGrid();
    });
    container.add(searchBtn);

    // 整理按钮
    const sortBtn = this.createInkButton(-w / 2 + 200, 0, {
      text: '⇅ 整理',
      width: 80,
      height: 36,
      fontSize: 13,
    });
    sortBtn.onClick(() => this._sortInventory());
    container.add(sortBtn);

    // 容量显示
    this._capacityText = this.add.text(w / 2 - 10, 0, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#F5F5DC',
    });
    this._capacityText.setOrigin(1, 0.5);
    container.add(this._capacityText);
  }

  private _updateCapacity(): void {
    const total = this._inventory.reduce((sum, i) => sum + i.quantity, 0);
    const ratio = total / this._maxCapacity;
    const color = ratio >= 0.9 ? '#FF4444' : ratio >= 0.7 ? '#FF9E00' : '#F5F5DC';
    this._capacityText.setText(`容量：${total}/${this._maxCapacity}`);
    this._capacityText.setColor(color);
  }

  // ==========================================================================
  // 左侧分类栏
  // ==========================================================================

  private _buildCategoryBar(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.15);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    // 分类按钮（垂直排列）
    const btnH = 44;
    const gap = 6;
    const startY = -((CATEGORIES.length * (btnH + gap)) / 2) + btnH / 2;

    this._categoryBtns = [];
    CATEGORIES.forEach((cat, i) => {
      const btn = this.createInkButton(0, startY + i * (btnH + gap), {
        text: cat.name,
        width: w - 12,
        height: btnH,
        fontSize: 14,
      });
      btn.onClick(() => this._selectCategory(cat.id));
      container.add(btn);
      this._categoryBtns.push(btn);
    });

    this._highlightCategoryBtn(0);
  }

  private _selectCategory(catId: ItemType | 'all'): void {
    this._currentCategory = catId;
    const idx = CATEGORIES.findIndex((c) => c.id === catId);
    this._highlightCategoryBtn(idx);
    this._refreshGrid();
  }

  private _highlightCategoryBtn(activeIndex: number): void {
    this._categoryBtns.forEach((btn, i) => {
      if (i === activeIndex) {
        btn.setAlpha(1);
      } else {
        btn.setAlpha(0.6);
      }
    });
  }

  // ==========================================================================
  // 中间物品网格
  // ==========================================================================

  private _buildItemGrid(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    // ScrollList 物品网格
    this._gridScrollList = new ScrollList(this, 0, 0, {
      width: w - 8,
      height: h - 8,
      itemHeight: 68,
      itemSpacing: 6,
      data: this._getFilteredItems(),
      renderer: (scene, data) => this._renderItemCell(scene, data.item as Item, w - 8),
      onSelect: (data) => {
        const item = data.item as Item;
        this._selectedItem = item;
        this._showItemDetail(item);
      },
    });
    container.add(this._gridScrollList);
  }

  private _getFilteredItems(): { id: string; item: Item; [key: string]: unknown }[] {
    let items = this._inventory;

    // 分类筛选
    if (this._currentCategory !== 'all') {
      items = items.filter((i) => getItemCategory(i.type) === this._currentCategory);
    }

    // 搜索筛选
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }

    return items.map((item) => ({ id: item.id, item }));
  }

  private _renderItemCell(scene: Phaser.Scene, item: Item, listW: number): Phaser.GameObjects.Container {
    const cellW = listW - 16;
    const cellH = 64;
    const container = scene.add.container(0, 0);

    // 背景
    const bg = scene.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.25);
    bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
    container.add(bg);

    // 品质边框色
    const rarityColor = RARITY_COLORS[item.rarity] ?? '#E0E0E0';
    const border = scene.add.graphics();
    border.lineStyle(2, parseInt(rarityColor.replace('#', '0x')), 0.8);
    border.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
    container.add(border);

    // 图标（彩色方块 + 文字）
    const iconSize = 40;
    const icon = scene.add.graphics();
    icon.fillStyle(parseInt(rarityColor.replace('#', '0x')), 0.3);
    icon.fillRoundedRect(-cellW / 2 + 10, -iconSize / 2, iconSize, iconSize, 4);
    container.add(icon);

    const iconText = scene.add.text(-cellW / 2 + 30, 0, item.name.charAt(0), {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '18px',
      color: rarityColor,
    });
    iconText.setOrigin(0.5);
    container.add(iconText);

    // 名称
    const nameText = scene.add.text(-cellW / 2 + 62, -10, item.name, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: rarityColor,
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    // 类型 + 品质
    const typeText = scene.add.text(-cellW / 2 + 62, 10, `${RARITY_NAMES[item.rarity]} · ${item.description?.substring(0, 16) ?? ''}...`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '11px',
      color: '#888888',
    });
    typeText.setOrigin(0, 0.5);
    container.add(typeText);

    // 数量角标
    if (item.quantity > 1) {
      const badge = scene.add.graphics();
      badge.fillStyle(0xC0392B, 0.9);
      badge.fillCircle(cellW / 2 - 14, -cellH / 2 + 14, 10);
      container.add(badge);

      const qtyText = scene.add.text(cellW / 2 - 14, -cellH / 2 + 14, `${item.quantity}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '10px',
        color: '#FFFFFF',
      });
      qtyText.setOrigin(0.5);
      container.add(qtyText);
    }

    return container;
  }

  private _refreshGrid(): void {
    this._gridScrollList?.setData(this._getFilteredItems());
  }

  // ==========================================================================
  // 右侧详情面板
  // ==========================================================================

  private _buildDetailPanel(x: number, y: number, w: number, h: number): void {
    this._detailContainer = this.add.container(x, y);
    this._mainPanel.add(this._detailContainer);

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.15);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1, INK_COLORS.inkLight, 0.2);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    this._detailContainer.add(bg);

    // 默认提示
    const hint = this.add.text(0, 0, '点击物品查看详情', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#888888',
    });
    hint.setOrigin(0.5);
    this._detailContainer.add(hint);
  }

  private _clearDetail(): void {
    this._detailContainer.removeAll(true);

    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.15);
    bg.fillRoundedRect(-this._detailContainer.width / 2, -this._detailContainer.height / 2, this._detailContainer.width, this._detailContainer.height, 8);
    this._detailContainer.add(bg);

    const hint = this.add.text(0, 0, '点击物品查看详情', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#888888',
    });
    hint.setOrigin(0.5);
    this._detailContainer.add(hint);
  }

  private _showItemDetail(item: Item): void {
    this._detailContainer.removeAll(true);
    const w = this._mainPanel.width * 0.28;
    const h = this._mainPanel.contentHeight - 68;

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.15);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this._detailContainer.add(bg);

    const rarityColor = RARITY_COLORS[item.rarity] ?? '#E0E0E0';
    let currentY = -h / 2 + 24;

    // 名称
    const nameText = this.add.text(0, currentY, item.name, {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '18px',
      color: rarityColor,
    });
    nameText.setOrigin(0.5);
    this._detailContainer.add(nameText);
    currentY += 32;

    // 类型
    const typeText = this.add.text(0, currentY, `类型：${item.type} · ${RARITY_NAMES[item.rarity]}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#AAAAAA',
    });
    typeText.setOrigin(0.5);
    this._detailContainer.add(typeText);
    currentY += 28;

    // 数量
    const qtyText = this.add.text(0, currentY, `数量：${item.quantity}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#F5F5DC',
    });
    qtyText.setOrigin(0.5);
    this._detailContainer.add(qtyText);
    currentY += 32;

    // 描述
    const descText = this.add.text(0, currentY, item.description ?? '暂无描述', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#CCCCCC',
      wordWrap: { width: w - 24 },
      align: 'center',
    });
    descText.setOrigin(0.5, 0);
    this._detailContainer.add(descText);
    currentY += descText.height + 36;

    // 操作按钮
    const actions = getItemActions(item);
    actions.forEach((act, i) => {
      const isDanger = act.action === 'discard';
      const btn = this.createInkButton(0, currentY + i * 48, {
        text: act.label,
        width: w * 0.6,
        height: 40,
        fontSize: 14,
      });
      if (isDanger) {
        // 危险操作按钮红色提示（通过文字标识）
        btn.setText(`⚠ ${act.label}`);
      }
      btn.onClick(() => this._onItemAction(item, act.action));
      this._detailContainer.add(btn);
    });
  }

  private _onItemAction(item: Item, action: string): void {
    switch (action) {
      case 'use':
        window.alert(`使用 ${item.name} x1`);
        break;
      case 'equip':
        window.alert(`装备 ${item.name}`);
        break;
      case 'learn':
        window.alert(`学习功法 ${item.name}`);
        break;
      case 'discard':
        if (window.confirm(`确定丢弃 ${item.name} x${item.quantity} 吗？`)) {
          window.alert(`已丢弃 ${item.name}`);
        }
        break;
    }
  }

  // ==========================================================================
  // 整理排序
  // ==========================================================================

  private _sortInventory(): void {
    // 按品质降序，然后按类型分组
    const typeOrder: Record<string, number> = { equipment: 0, artifact: 1, technique: 2, pill: 3, consumable: 4, material: 5, treasure: 6, misc: 7, currency: 8, herb: 9 };
    this._inventory.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
    });
    this._refreshGrid();
  }
}
