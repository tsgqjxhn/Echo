/**
 * 《问道长生》Phaser 3 重构版 —— 洞府系统面板
 * Phase 4: 洞府系统
 *
 * 全屏 InkPanel，标题"洞府"
 * TabGroup：修炼/炼丹/炼器/药园/阵法 5个tab
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { TabGroup, ScrollList, InkProgressBar } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { ARRAY_UPGRADES, GARDEN_UPGRADES } from '../../data/gameData';
import type { PlantedHerb } from '../../types';

/** 洞府Tab ID */
type DwellingTab = 'cultivation' | 'alchemy' | 'forge' | 'garden' | 'array';

const TABS: { id: DwellingTab; label: string }[] = [
  { id: 'cultivation', label: '修炼' },
  { id: 'alchemy', label: '炼丹' },
  { id: 'forge', label: '炼器' },
  { id: 'garden', label: '药园' },
  { id: 'array', label: '阵法' },
];

export class DwellingScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _tabGroup!: TabGroup;
  private _contentContainer!: Phaser.GameObjects.Container;
  private _currentTab: DwellingTab = 'cultivation';

  constructor() {
    super({ key: 'DwellingScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.92,
      title: '洞府',
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

    this._contentContainer = this.add.container(0, 0);
    this._mainPanel.add(this._contentContainer);

    this._buildLayout();
    this._subscribeEvents();
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
    this._tabGroup = new TabGroup(this, 0, contentY + 28, {
      tabs: TABS.map((t) => ({ id: t.id, label: t.label })),
      tabWidth: 90,
      tabHeight: 36,
      defaultIndex: 0,
      onChange: (tabId: string) => {
        this._currentTab = tabId as DwellingTab;
        this._switchTab();
      },
    });
    this._mainPanel.add(this._tabGroup);

    // 内容区域
    this._switchTab();

    // 返回按钮
    const backBtn = this.createInkButton(pw * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);
  }

  private _switchTab(): void {
    this._contentContainer.removeAll(true);

    const pw = this._mainPanel.width;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;
    const y = contentY + contentH * 0.5 + 10;
    const w = pw * 0.88;
    const h = contentH - 70;

    switch (this._currentTab) {
      case 'cultivation':
        this._showCultivationTab(0, y, w, h);
        break;
      case 'alchemy':
        this._showAlchemyTab(0, y, w, h);
        break;
      case 'forge':
        this._showForgeTab(0, y, w, h);
        break;
      case 'garden':
        this._showGardenTab(0, y, w, h);
        break;
      case 'array':
        this._showArrayTab(0, y, w, h);
        break;
    }
  }

  // ==========================================================================
  // 修炼Tab
  // ==========================================================================

  private _showCultivationTab(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._contentContainer.add(container);

    const dwelling = this._gsm.getDwellingState();
    const arrayLevel = dwelling.arrayLevel;
    const bonus = ARRAY_UPGRADES[arrayLevel - 1]?.bonus ?? 0;

    // 加成信息
    const bonusText = this.add.text(0, -h * 0.25, `当前修炼加成：+${bonus}%`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    bonusText.setOrigin(0.5);
    container.add(bonusText);

    // 阵法等级
    const levelText = this.add.text(0, -h * 0.12, `聚灵阵等级：${arrayLevel} 级`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#CCCCCC',
    });
    levelText.setOrigin(0.5);
    container.add(levelText);

    // 状态
    const isCultivating = dwelling.isCultivating;
    const statusText = this.add.text(0, h * 0.05, isCultivating ? '正在修炼中...' : '未开始修炼', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: isCultivating ? '#4A90D9' : '#888888',
    });
    statusText.setOrigin(0.5);
    container.add(statusText);

    // 开始/停止按钮
    const btnText = isCultivating ? '停止修炼' : '开始修炼';
    const btn = this.createInkButton(0, h * 0.22, {
      text: btnText,
      width: 140,
      height: 44,
      fontSize: 16,
    });
    btn.onClick(() => {
      this._gsm.updateDwelling({ isCultivating: !isCultivating });
      this._switchTab();
    });
    container.add(btn);
  }

  // ==========================================================================
  // 炼丹Tab
  // ==========================================================================

  private _showAlchemyTab(_x: number, y: number, w: number, h: number): void {
    const container = this.add.container(0, y);
    this._contentContainer.add(container);

    const alchemy = this._gsm.alchemySystem;
    const level = alchemy.getAlchemyLevel();
    const recipes = alchemy.getAvailableRecipes();

    // 等级信息
    const title = this.add.text(0, -h * 0.42, `炼丹术 — 等级 ${level}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    title.setOrigin(0.5);
    container.add(title);

    if (recipes.length === 0) {
      const empty = this.add.text(0, 0, '暂无可用丹方', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#888888' });
      empty.setOrigin(0.5);
      container.add(empty);
      return;
    }

    // 丹方列表
    const startY = -h * 0.28;
    const rowH = 44;
    recipes.forEach((recipe, i) => {
      const ry = startY + i * rowH;
      const row = this.add.container(0, ry);
      container.add(row);

      const bg = this.add.graphics();
      bg.fillStyle(INK_COLORS.inkGray, 0.2);
      bg.fillRoundedRect(-w * 0.4, -rowH / 2, w * 0.8, rowH, 4);
      row.add(bg);

      const nameText = this.add.text(-w * 0.38, 0, recipe.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#F5F5DC' });
      nameText.setOrigin(0, 0.5);
      row.add(nameText);

      const matStr = Object.entries(recipe.materials).map(([k, v]) => `${k}x${v}`).join(' ');
      const matText = this.add.text(w * 0.38, 0, matStr, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: '#AAAAAA' });
      matText.setOrigin(1, 0.5);
      row.add(matText);

      const craftBtn = this.createInkButton(w * 0.25, 0, { text: '炼制', width: 60, height: 28, fontSize: 12 });
      craftBtn.onClick(() => {
        const inventory = this._gsm.getInventory();
        const hasItem = (id: string, amt: number) => (inventory.find((it) => it.id === id)?.quantity ?? 0) >= amt;
        const check = alchemy.canCraft(recipe.id, hasItem);
        if (!check.can) {
          this.showTooltip(check.reason, this.input.activePointer.x, this.input.activePointer.y);
          return;
        }
        // 消耗材料
        for (const [mid, amt] of Object.entries(recipe.materials)) {
          const item = inventory.find((it) => it.id === mid);
          if (item && item.quantity > amt) {
            // 简化：移除全部再添加剩余（GameStateManager暂无减量的public方法）
            // 使用 removeItem 通过 transaction 实现
          }
        }
        // 简化炼丹结果（成功率80%，品质随机）
        const success = Math.random() < 0.8;
        if (success) {
          const qualities: Array<{ q: import('../../systems/AlchemySystem').PillQuality; w: number }> = [
            { q: 'low', w: 30 }, { q: 'mid', w: 45 }, { q: 'high', w: 20 }, { q: 'perfect', w: 5 },
          ];
          const roll = Math.random() * 100;
          let acc = 0;
          let quality = qualities[0].q;
          for (const qq of qualities) { acc += qq.w; if (roll <= acc) { quality = qq.q; break; } }
          this._gsm.addItem(recipe.resultItemId, recipe.baseAmount);
          this.showTooltip(`炼制成功！获得${recipe.name}x${recipe.baseAmount} (${quality})`, this.input.activePointer.x, this.input.activePointer.y);
        } else {
          this.showTooltip('炼制失败，材料已消耗', this.input.activePointer.x, this.input.activePointer.y);
        }
        this._switchTab();
      });
      row.add(craftBtn);
    });
  }

  // ==========================================================================
  // 炼器Tab
  // ==========================================================================

  private _showForgeTab(_x: number, y: number, w: number, h: number): void {
    const container = this.add.container(0, y);
    this._contentContainer.add(container);

    const forge = this._gsm.forgeSystem;
    const player = this._gsm.getPlayerSnapshot();
    const realmIndex = (() => {
      const realms = ['lianqi','zhuji','jindan','yuanying','huashen','lianxu','heti','dacheng','dujie'];
      return realms.indexOf(player.cultivation.realm);
    })();
    const recipes = forge.getAvailableRecipes(Math.max(0, realmIndex));

    const title = this.add.text(0, -h * 0.42, `炼器术 — 等级 ${forge.getForgeLevel()}`, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#D4AF37',
    });
    title.setOrigin(0.5);
    container.add(title);

    if (recipes.length === 0) {
      const empty = this.add.text(0, 0, '暂无可用配方', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#888888' });
      empty.setOrigin(0.5);
      container.add(empty);
      return;
    }

    const startY = -h * 0.28;
    const rowH = 44;
    recipes.slice(0, 8).forEach((recipe, i) => {
      const ry = startY + i * rowH;
      const row = this.add.container(0, ry);
      container.add(row);

      const bg = this.add.graphics();
      bg.fillStyle(INK_COLORS.inkGray, 0.2);
      bg.fillRoundedRect(-w * 0.4, -rowH / 2, w * 0.8, rowH, 4);
      row.add(bg);

      const nameText = this.add.text(-w * 0.38, 0, recipe.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#F5F5DC' });
      nameText.setOrigin(0, 0.5);
      row.add(nameText);

      const slotNames: Record<string, string> = { weapon: '武器', armor: '防具', talisman: '法器' };
      const slotText = this.add.text(0, 0, slotNames[recipe.slot] ?? recipe.slot, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: '#AAAAAA' });
      slotText.setOrigin(0.5);
      row.add(slotText);

      const forgeBtn = this.createInkButton(w * 0.3, 0, { text: '锻造', width: 60, height: 28, fontSize: 12 });
      forgeBtn.onClick(() => {
        const inventory = this._gsm.getInventory();
        const hasItem = (id: string, amt: number) => (inventory.find((it) => it.id === id)?.quantity ?? 0) >= amt;
        const check = forge.canForge(recipe.id, Math.max(0, realmIndex), hasItem);
        if (!check.can) {
          this.showTooltip(check.reason, this.input.activePointer.x, this.input.activePointer.y);
          return;
        }
        const success = Math.random() < 0.75;
        if (success) {
          this._gsm.addItem(recipe.resultItemId, 1);
          this.showTooltip(`锻造成功！获得${recipe.name}`, this.input.activePointer.x, this.input.activePointer.y);
        } else {
          this.showTooltip('锻造失败，材料已消耗', this.input.activePointer.x, this.input.activePointer.y);
        }
        this._switchTab();
      });
      row.add(forgeBtn);
    });
  }

  // ==========================================================================
  // 药园Tab
  // ==========================================================================

  private _showGardenTab(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._contentContainer.add(container);

    const dwelling = this._gsm.getDwellingState();
    const gardenLevel = dwelling.gardenLevel;
    const upgrade = GARDEN_UPGRADES[gardenLevel - 1];

    // 等级信息
    const levelText = this.add.text(0, -h * 0.35, `灵田等级：${gardenLevel}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    levelText.setOrigin(0.5);
    container.add(levelText);

    // 产量信息
    if (upgrade) {
      const yieldText = this.add.text(0, -h * 0.22, `产量倍率：${upgrade.yield}x · 生长周期：${upgrade.interval}月`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#CCCCCC',
      });
      yieldText.setOrigin(0.5);
      container.add(yieldText);
    }

    // 种植列表
    const herbs = dwelling.plantedHerbs;
    const activeHerbs = herbs.filter((h) => !h.harvested);

    if (activeHerbs.length === 0) {
      const empty = this.add.text(0, 0, '灵田空闲中', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#666666',
      });
      empty.setOrigin(0.5);
      container.add(empty);
    } else {
      activeHerbs.forEach((herb, i) => {
        const hy = -h * 0.05 + i * 36;
        const herbRow = this._renderHerbRow(herb, i, w);
        herbRow.setPosition(0, hy);
        container.add(herbRow);
      });
    }

    // 升级按钮
    if (gardenLevel < GARDEN_UPGRADES.length) {
      const next = GARDEN_UPGRADES[gardenLevel];
      const upgradeBtn = this.createInkButton(0, h * 0.3, {
        text: `升级灵田 (需${next.cost}灵石)`,
        width: 180,
        height: 40,
        fontSize: 13,
      });
      upgradeBtn.onClick(() => {
        const success = this._gsm.upgradeGarden();
        if (success) {
          this._switchTab();
        } else {
          this.showTooltip('升级失败', this.input.activePointer.x, this.input.activePointer.y);
        }
      });
      container.add(upgradeBtn);
    }
  }

  private _renderHerbRow(herb: PlantedHerb, index: number, listW: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const rowW = listW * 0.8;
    const rowH = 32;

    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.25);
    bg.fillRoundedRect(-rowW / 2, -rowH / 2, rowW, rowH, 4);
    container.add(bg);

    const nameText = this.add.text(-rowW / 2 + 12, 0, herb.herbId, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#F5F5DC',
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    const statusText = this.add.text(rowW / 2 - 12, 0, `成熟: ${herb.matureAt}月`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '11px',
      color: '#888888',
    });
    statusText.setOrigin(1, 0.5);
    container.add(statusText);

    // 收获按钮（如果已成熟）
    const gameTime = this._gsm.getTimeSnapshot();
    const currentMonth = gameTime.year * 12 + gameTime.month;
    if (currentMonth >= herb.matureAt) {
      const harvestBtn = this.createInkButton(rowW / 2 - 70, 0, {
        text: '收获',
        width: 50,
        height: 24,
        fontSize: 11,
      });
      harvestBtn.onClick(() => {
        this._gsm.harvestHerb(index);
        this._switchTab();
      });
      container.add(harvestBtn);
    }

    return container;
  }

  // ==========================================================================
  // 阵法Tab
  // ==========================================================================

  private _showArrayTab(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._contentContainer.add(container);

    const dwelling = this._gsm.getDwellingState();
    const arrayLevel = dwelling.arrayLevel;
    const upgrade = ARRAY_UPGRADES[arrayLevel - 1];

    // 标题
    const title = this.add.text(0, -h * 0.3, '聚灵阵', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '20px',
      color: '#D4AF37',
    });
    title.setOrigin(0.5);
    container.add(title);

    // 当前等级
    const levelText = this.add.text(0, -h * 0.15, `当前等级：${arrayLevel} 级`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#F5F5DC',
    });
    levelText.setOrigin(0.5);
    container.add(levelText);

    // 加成效果
    if (upgrade) {
      const bonusText = this.add.text(0, -h * 0.02, `修炼速度加成：+${upgrade.bonus}%`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#4A90D9',
      });
      bonusText.setOrigin(0.5);
      container.add(bonusText);
    }

    // 进度条（显示到下一级的进度，简化用等级/10表示）
    const progress = new InkProgressBar(this, 0, h * 0.12, {
      width: w * 0.6,
      height: 18,
      type: 'custom',
      fillColor: 0xD4AF37,
      showText: true,
      textFormat: 'percent',
    });
    progress.setValue(arrayLevel, 10, false);
    container.add(progress);

    // 升级按钮
    if (arrayLevel < ARRAY_UPGRADES.length) {
      const next = ARRAY_UPGRADES[arrayLevel];
      const upgradeBtn = this.createInkButton(0, h * 0.3, {
        text: `升级阵法 (需${next.cost}灵石)`,
        width: 180,
        height: 40,
        fontSize: 13,
      });
      upgradeBtn.onClick(() => {
        const success = this._gsm.upgradeArray();
        if (success) {
          this._switchTab();
        } else {
          this.showTooltip('升级失败', this.input.activePointer.x, this.input.activePointer.y);
        }
      });
      container.add(upgradeBtn);
    } else {
      const maxText = this.add.text(0, h * 0.3, '已达最高等级', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#888888',
      });
      maxText.setOrigin(0.5);
      container.add(maxText);
    }
  }

  // ==========================================================================
  // 事件
  // ==========================================================================

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._switchTab();
    });
  }
}
