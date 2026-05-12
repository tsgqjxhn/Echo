/**
 * 《问道长生》Phaser 3 重构版 —— 个人界面面板 (Phase 4 重构版)
 *
 * 5个tab：修为/物品/悟道/功法/声望
 * 顶部：左侧角色形象 + 右侧基础信息
 * 下方：TabGroup 切换
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { InkProgressBar, TabGroup, ScrollList } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import {
  REALMS,
  RARITY_COLORS,
  RARITY_NAMES,
  getRealmConfig,
  DAO_PATHS,
  WORLD_DOMAINS,
} from '../../data/gameData';
import type { PlayerData, BuffEffect, Technique, Item, ItemType } from '../../types';

/** 装备槽位定义 */
const EQUIP_SLOTS = [
  { id: 'weapon', name: '武器', icon: '剑' },
  { id: 'armor', name: '防具', icon: '甲' },
  { id: 'accessory1', name: '饰品', icon: '饰' },
  { id: 'accessory2', name: '饰品', icon: '饰' },
  { id: 'artifact1', name: '法宝', icon: '宝' },
  { id: 'artifact2', name: '法宝', icon: '宝' },
];

/** 属性Tooltip说明 */
const ATTR_TOOLTIPS: Record<string, string> = {
  realm: '当前修真境界，决定寿命上限与修炼速度',
  exp: '当前修为值，满值后可尝试突破',
  comprehension: '悟性影响修炼速度和功法理解效率',
  aptitude: '根骨影响属性成长和突破成功率',
  luck: '机缘影响奇遇触发概率和掉落品质',
  lifespan: '剩余寿命，每年消耗1岁，耗尽则转世',
  mentalState: '心境值影响修炼效率和突破成功率',
  hp: '生命值，战斗中归零则失败',
  mp: '法力值，施放神通技能时消耗',
  attack: '攻击力，决定造成伤害的基础值',
  defense: '防御力，减少受到的伤害',
  speed: '速度影响出手先后顺序和闪避率',
  critRate: '暴击率，攻击时触发暴击的概率',
  metal: '金行亲和度，影响金系功法威力和抗性',
  wood: '木行亲和度，影响木系功法威力和抗性',
  water: '水行亲和度，影响水系功法威力和抗性',
  fire: '火行亲和度，影响火系功法威力和抗性',
  earth: '土行亲和度，影响土系功法威力和抗性',
};

/** 物品分类 */
const INV_CATEGORIES: { id: ItemType | 'all'; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'pill', name: '丹药' },
  { id: 'material', name: '材料' },
  { id: 'technique', name: '功法' },
  { id: 'equipment', name: '装备' },
  { id: 'misc', name: '杂物' },
];

/** 声望等级映射 */
function getReputationLevel(value: number): { label: string; color: string } {
  if (value <= -500) return { label: '敌对', color: '#FF4444' };
  if (value <= -100) return { label: '不友好', color: '#FF9E00' };
  if (value < 100) return { label: '中立', color: '#AAAAAA' };
  if (value < 500) return { label: '友好', color: '#5BCEFA' };
  return { label: '崇敬', color: '#D4AF37' };
}

function getItemCategory(type: ItemType): ItemType | 'misc' {
  const miscTypes: ItemType[] = ['treasure', 'currency', 'consumable', 'artifact', 'herb'];
  if (miscTypes.includes(type)) return 'misc';
  return type;
}

export class PersonalScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _player!: PlayerData;
  private _activeEffects: BuffEffect[] = [];
  private _techniques: Technique[] = [];
  private _inventory: Item[] = [];
  private _equippedTechniques: string[] = [];

  // UI
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _tabGroup!: TabGroup;
  private _tabContentContainer!: Phaser.GameObjects.Container;
  private _currentTabId = 'cultivation';

  // 寿命脉冲
  private _lifespanTween?: Phaser.Tween | any;

  constructor() {
    super({ key: 'PersonalScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();
    this._refreshData();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.92,
      height: h * 0.88,
      title: '个人',
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

  // ==========================================================================
  // 数据
  // ==========================================================================

  private _refreshData(): void {
    this._player = this._gsm.getPlayerSnapshot() as PlayerData;
    const runtime = this._gsm.runtimeState;
    this._activeEffects = [...(runtime.activeEffects as BuffEffect[])];
    const business = this._gsm.businessState;
    this._techniques = [...(business.techniques as Technique[])];
    this._inventory = [...(business.inventory as Item[])];
  }

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._refreshData();
      this._updateUI();
    });
  }

  // ==========================================================================
  // 布局构建
  // ==========================================================================

  private _buildLayout(): void {
    const panelW = this._mainPanel.width;
    const panelH = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    // 顶部信息区：左侧头像 + 右侧信息
    this._buildHeaderArea(0, contentY + 50, panelW * 0.88, 90);

    // TabGroup（在顶部信息下方）
    this._buildTabGroup(0, contentY + 112, panelW * 0.88);

    // Tab 内容容器
    this._tabContentContainer = this.add.container(0, contentY + 136);
    this._mainPanel.add(this._tabContentContainer);

    // 默认显示修为tab
    this._switchTabContent('cultivation', panelW * 0.86, contentH - 150);

    // 底部装备栏
    this._buildEquipBar(0, contentY + contentH - 36, panelW * 0.82, 64);

    // 返回按钮
    const backBtn = this.createInkButton(panelW * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);
  }

  // ==========================================================================
  // 顶部信息区
  // ==========================================================================

  private _buildHeaderArea(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 左侧：头像圆形
    const avatarR = 32;
    const avatar = this.add.graphics();
    avatar.fillStyle(0x2a3a2a, 0.8);
    avatar.fillCircle(-w / 2 + avatarR + 10, 0, avatarR);
    avatar.lineStyle(2, 0xD4AF37, 0.6);
    avatar.strokeCircle(-w / 2 + avatarR + 10, 0, avatarR);
    container.add(avatar);

    // 头像文字（首字）
    const avatarText = this.add.text(-w / 2 + avatarR + 10, 0, this._player.name.charAt(0) || '修', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '22px',
      color: '#F5F5DC',
    });
    avatarText.setOrigin(0.5);
    container.add(avatarText);

    // 右侧：姓名、境界、职业、天赋
    const realmCfg = getRealmConfig(this._player.cultivation.realm);
    const stageName = realmCfg?.stages[this._player.cultivation.stage]?.name ?? '';
    const infoX = -w / 2 + avatarR * 2 + 24;

    // 姓名
    const nameText = this.add.text(infoX, -18, this._player.name, {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '18px',
      color: '#F5F5DC',
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    // 境界
    const realmText = this.add.text(infoX, 4, `${realmCfg?.name ?? ''}${stageName}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#D4AF37',
    });
    realmText.setOrigin(0, 0.5);
    container.add(realmText);

    // 职业 + 天赋
    const profLabel = this._player.profession || '散修';
    const talentLabel = this._player.talent || '无天赋';
    const extraText = this.add.text(infoX, 26, `${profLabel} · ${talentLabel}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#888888',
    });
    extraText.setOrigin(0, 0.5);
    container.add(extraText);

    // 右侧：进入洞府按钮
    const dwellingBtn = this.createInkButton(w / 2 - 60, 0, {
      text: '进入洞府',
      width: 90,
      height: 36,
      fontSize: 13,
    });
    dwellingBtn.onClick(() => {
      this.scene.launch('DwellingScene');
    });
    container.add(dwellingBtn);
  }

  // ==========================================================================
  // TabGroup
  // ==========================================================================

  private _buildTabGroup(x: number, y: number, w: number): void {
    this._tabGroup = new TabGroup(this, x, y, {
      tabs: [
        { id: 'cultivation', label: '修为' },
        { id: 'inventory', label: '物品' },
        { id: 'dao', label: '悟道' },
        { id: 'techniques', label: '功法' },
        { id: 'reputation', label: '声望' },
      ],
      tabWidth: 76,
      tabHeight: 34,
      defaultIndex: 0,
      onChange: (tabId: string) => {
        this._switchTabContent(tabId, w, this._mainPanel.contentHeight - 150);
      },
    });
    this._mainPanel.add(this._tabGroup);
  }

  private _switchTabContent(tabId: string, w: number, h: number): void {
    this._currentTabId = tabId;
    this._tabContentContainer.removeAll(true);

    switch (tabId) {
      case 'cultivation':
        this._showCultivationTab(w, h);
        break;
      case 'inventory':
        this._showInventoryTab(w, h);
        break;
      case 'dao':
        this._showDaoTab(w, h);
        break;
      case 'techniques':
        this._showTechniquesTab(w, h);
        break;
      case 'reputation':
        this._showReputationTab(w, h);
        break;
    }
  }

  // ==========================================================================
  // 修为 Tab
  // ==========================================================================

  private _showCultivationTab(w: number, h: number): void {
    const c = this._tabContentContainer;
    const startY = -h / 2 + 10;
    const lineH = 32;

    const realmCfg = getRealmConfig(this._player.cultivation.realm);
    const stageName = realmCfg?.stages[this._player.cultivation.stage]?.name ?? '';

    // 境界
    this._addAttrRow(c, -w * 0.22, startY, '境界', `${realmCfg?.name ?? ''}${stageName}`, 'realm', w * 0.45);

    // 修为进度条
    const expY = startY + lineH + 4;
    this._addLabel(c, -w / 2 + 10, expY, '修为');
    const expBar = new InkProgressBar(this, 10, expY, {
      width: w * 0.55,
      height: 16,
      type: 'cultivation',
      showText: true,
      textFormat: 'current/max',
    });
    expBar.setValue(this._player.cultivation.exp, this._player.cultivation.expMax, false);
    c.add(expBar);

    // 悟性 / 根骨
    const attrY = expY + lineH + 4;
    this._addAttrRow(c, -w * 0.22, attrY, '悟性', `${this._player.cultivation.comprehension}`, 'comprehension', w * 0.45);
    this._addAttrRow(c, w * 0.18, attrY, '根骨', `${this._player.cultivation.aptitude}`, 'aptitude', w * 0.45);

    // 机缘 / 寿命
    const attrY2 = attrY + lineH;
    this._addAttrRow(c, -w * 0.22, attrY2, '机缘', `${this._player.cultivation.luck}`, 'luck', w * 0.45);

    const lifeColor = this._player.cultivation.lifespan <= 20 ? '#FF4444' : '#F5F5DC';
    const lifespanText = this.add.text(w * 0.18, attrY2, `寿命：${this._player.cultivation.lifespan} / ${this._player.cultivation.lifespanMax} 年`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: lifeColor,
    });
    lifespanText.setOrigin(0, 0.5);
    c.add(lifespanText);

    if (this._player.cultivation.lifespan <= 20) {
      this._lifespanTween = this.tweens.add({
        targets: lifespanText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 心境进度条
    const mentalY = attrY2 + lineH + 4;
    this._addLabel(c, -w / 2 + 10, mentalY, '心境');
    const mentalBar = new InkProgressBar(this, 10, mentalY, {
      width: w * 0.55,
      height: 14,
      type: 'custom',
      fillColor: 0x9B59B6,
      showText: true,
      textFormat: 'current/max',
    });
    mentalBar.setValue(this._player.cultivation.mentalState, 100, false);
    c.add(mentalBar);

    // 战斗属性（精简）
    const combatY = mentalY + lineH + 8;
    this._addLabel(c, -w / 2 + 10, combatY, '战斗属性');

    const combatY2 = combatY + lineH - 4;
    this._addAttrRow(c, -w * 0.22, combatY2, '生命', `${this._player.stats.hp}/${this._player.stats.maxHp}`, 'hp', w * 0.45);
    this._addAttrRow(c, w * 0.18, combatY2, '法力', `${this._player.stats.mp}/${this._player.stats.maxMp}`, 'mp', w * 0.45);

    const combatY3 = combatY2 + lineH - 4;
    this._addAttrRow(c, -w * 0.22, combatY3, '攻击', `${this._player.stats.attack}`, 'attack', w * 0.45);
    this._addAttrRow(c, w * 0.18, combatY3, '防御', `${this._player.stats.defense}`, 'defense', w * 0.45);

    const combatY4 = combatY3 + lineH - 4;
    this._addAttrRow(c, -w * 0.22, combatY4, '速度', `${this._player.stats.speed}`, 'speed', w * 0.45);
  }

  // ==========================================================================
  // 物品 Tab（简化版背包）
  // ==========================================================================

  private _showInventoryTab(w: number, h: number): void {
    const c = this._tabContentContainer;

    if (this._inventory.length === 0) {
      const empty = this.add.text(0, 0, '背包空空如也', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#666666',
      });
      empty.setOrigin(0.5);
      c.add(empty);
      return;
    }

    const itemsData = this._inventory.map((item) => ({ id: item.id, item }));

    const scrollList = new ScrollList(this, 0, 0, {
      width: w - 16,
      height: h - 10,
      itemHeight: 52,
      itemSpacing: 4,
      data: itemsData,
      renderer: (scene, data) => {
        const item = (data as { id: string; item: Item }).item;
        const cellW = w - 32;
        const cellH = 48;
        const container = scene.add.container(0, 0);

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        const rarityColor = RARITY_COLORS[item.rarity] ?? '#E0E0E0';
        const border = scene.add.graphics();
        border.lineStyle(1.5, parseInt(rarityColor.replace('#', '0x')), 0.6);
        border.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(border);

        const nameText = scene.add.text(-cellW / 2 + 12, -6, item.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: rarityColor,
        });
        nameText.setOrigin(0, 0.5);
        container.add(nameText);

        const descText = scene.add.text(-cellW / 2 + 12, 10, `${RARITY_NAMES[item.rarity]} · ${item.description?.substring(0, 20) ?? ''}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#888888',
        });
        descText.setOrigin(0, 0.5);
        container.add(descText);

        if (item.quantity > 1) {
          const qty = scene.add.text(cellW / 2 - 12, 0, `x${item.quantity}`, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: '12px',
            color: '#CCCCCC',
          });
          qty.setOrigin(1, 0.5);
          container.add(qty);
        }

        return container;
      },
      onSelect: (data) => {
        const item = (data as { id: string; item: Item }).item;
        this.showTooltip(`${item.name}\n${item.description ?? '暂无描述'}`, this.input.activePointer.x, this.input.activePointer.y);
      },
    });
    c.add(scrollList);
  }

  // ==========================================================================
  // 悟道 Tab（简化版星图）
  // ==========================================================================

  private _showDaoTab(w: number, h: number): void {
    const c = this._tabContentContainer;
    const daoSystem = this._gsm.daoSystem;

    if (DAO_PATHS.length === 0) {
      const empty = this.add.text(0, 0, '暂无悟道数据', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#666666',
      });
      empty.setOrigin(0.5);
      c.add(empty);
      return;
    }

    const daoData = DAO_PATHS.map((path, index) => ({
      id: path.id,
      index,
      path,
      activatedNodes: path.nodes.filter((n) => daoSystem.getNodeLevel(path.id, n.id) > 0).length,
    }));

    const scrollList = new ScrollList(this, 0, 0, {
      width: w - 16,
      height: h - 10,
      itemHeight: 56,
      itemSpacing: 4,
      data: daoData,
      renderer: (scene, data) => {
        const d = data as { id: string; index: number; path: typeof DAO_PATHS[0]; activatedNodes: number };
        const path = d.path;
        const cellW = w - 32;
        const cellH = 52;
        const container = scene.add.container(0, 0);

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        const colors: Record<string, number> = {
          metal: 0xC0C0C0, wood: 0x4A6741, water: 0x4A90D9,
          fire: 0xD9534F, earth: 0x8B6914, 'yin-yang': 0x9B59B6, 'space-time': 0x2C3E50,
        };
        const color = colors[path.element] ?? 0x888888;

        const indicator = scene.add.graphics();
        indicator.fillStyle(color, 0.6);
        indicator.fillRoundedRect(-cellW / 2 + 6, -cellH / 2 + 6, 4, cellH - 12, 2);
        container.add(indicator);

        const nameText = scene.add.text(-cellW / 2 + 20, -6, path.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: '#F5F5DC',
        });
        nameText.setOrigin(0, 0.5);
        container.add(nameText);

        const descText = scene.add.text(-cellW / 2 + 20, 12, `${path.description.substring(0, 24)}...`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#888888',
        });
        descText.setOrigin(0, 0.5);
        container.add(descText);

        const progressText = scene.add.text(cellW / 2 - 12, 0, `${d.activatedNodes}/${path.nodes.length}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: '#D4AF37',
        });
        progressText.setOrigin(1, 0.5);
        container.add(progressText);

        return container;
      },
      onSelect: () => {
        this.showTooltip('点击可查看悟道详情\n（完整功能请前往悟道界面）', this.input.activePointer.x, this.input.activePointer.y);
      },
    });
    c.add(scrollList);
  }

  // ==========================================================================
  // 功法 Tab
  // ==========================================================================

  private _showTechniquesTab(w: number, h: number): void {
    const c = this._tabContentContainer;

    if (this._techniques.length === 0) {
      const empty = this.add.text(0, 0, '未学习功法', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#666666',
      });
      empty.setOrigin(0.5);
      c.add(empty);
      return;
    }

    // 已装备提示
    const equippedCount = this._equippedTechniques.length;
    const hint = this.add.text(0, -h / 2 + 14, `已装备 ${equippedCount}/3`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#AAAAAA',
    });
    hint.setOrigin(0.5);
    c.add(hint);

    const techData = this._techniques.map((tech, index) => ({ id: tech.id, index, tech }));

    const scrollList = new ScrollList(this, 0, 10, {
      width: w - 16,
      height: h - 40,
      itemHeight: 56,
      itemSpacing: 4,
      data: techData,
      renderer: (scene, data) => {
        const d = data as { id: string; index: number; tech: Technique };
        const tech = d.tech;
        const isEquipped = this._equippedTechniques.includes(tech.id);
        const cellW = w - 32;
        const cellH = 52;
        const container = scene.add.container(0, 0);

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, isEquipped ? 0.35 : 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        if (isEquipped) {
          const border = scene.add.graphics();
          border.lineStyle(2, 0xD4AF37, 0.6);
          border.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
          container.add(border);
        }

        const elements: Record<string, string> = {
          metal: '金', wood: '木', water: '水', fire: '火', earth: '土', mixed: '混',
        };
        const elText = scene.add.text(-cellW / 2 + 12, -6, `${elements[tech.element] ?? '?'} ${tech.name}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: isEquipped ? '#D4AF37' : '#F5F5DC',
        });
        elText.setOrigin(0, 0.5);
        container.add(elText);

        const descText = scene.add.text(-cellW / 2 + 12, 12, `${tech.type} · Lv.${tech.level}/${tech.maxLevel}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#888888',
        });
        descText.setOrigin(0, 0.5);
        container.add(descText);

        const statusText = scene.add.text(cellW / 2 - 12, 0, isEquipped ? '已装备' : '未装备', {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: isEquipped ? '#D4AF37' : '#666666',
        });
        statusText.setOrigin(1, 0.5);
        container.add(statusText);

        return container;
      },
      onSelect: (data) => {
        this._toggleEquipTechnique((data as { id: string; index: number; tech: Technique }).tech.id);
      },
    });
    c.add(scrollList);
  }

  private _toggleEquipTechnique(techId: string): void {
    const idx = this._equippedTechniques.indexOf(techId);
    if (idx >= 0) {
      this._equippedTechniques.splice(idx, 1);
    } else if (this._equippedTechniques.length < 3) {
      this._equippedTechniques.push(techId);
    }
    this._switchTabContent('techniques', this._mainPanel.width * 0.86, this._mainPanel.contentHeight - 150);
  }

  // ==========================================================================
  // 声望 Tab
  // ==========================================================================

  private _showReputationTab(w: number, h: number): void {
    const c = this._tabContentContainer;
    const reputation = this._player.reputation;
    const factions = WORLD_DOMAINS;

    const repData = factions.map((faction, index) => {
      const value = reputation[faction.id] ?? 0;
      const level = getReputationLevel(value);
      return {
        id: faction.id,
        index,
        name: faction.name,
        value,
        level,
      };
    });

    const scrollList = new ScrollList(this, 0, 0, {
      width: w - 16,
      height: h - 10,
      itemHeight: 56,
      itemSpacing: 4,
      data: repData,
      renderer: (scene, data) => {
        const d = data as { id: string; index: number; name: string; value: number; level: { label: string; color: string } };
        const cellW = w - 32;
        const cellH = 52;
        const container = scene.add.container(0, 0);

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        const nameText = scene.add.text(-cellW / 2 + 12, -8, d.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: '#F5F5DC',
        });
        nameText.setOrigin(0, 0.5);
        container.add(nameText);

        const levelText = scene.add.text(-cellW / 2 + 12, 12, d.level.label, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: d.level.color,
        });
        levelText.setOrigin(0, 0.5);
        container.add(levelText);

        // 声望值进度条（简化）
        const barW = cellW * 0.35;
        const bar = scene.add.graphics();
        bar.fillStyle(0x333333, 0.5);
        bar.fillRoundedRect(cellW / 2 - barW - 8, -6, barW, 10, 3);
        const ratio = Math.min(Math.abs(d.value) / 1000, 1);
        bar.fillStyle(parseInt(d.level.color.replace('#', '0x')), 0.7);
        bar.fillRoundedRect(cellW / 2 - barW - 8, -6, barW * ratio, 10, 3);
        container.add(bar);

        const valText = scene.add.text(cellW / 2 - 12, 12, `${d.value}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#888888',
        });
        valText.setOrigin(1, 0.5);
        container.add(valText);

        return container;
      },
      onSelect: () => {
        this.showTooltip('声望影响该势力对你的态度和可获取资源', this.input.activePointer.x, this.input.activePointer.y);
      },
    });
    c.add(scrollList);
  }

  // ==========================================================================
  // 底部装备栏
  // ==========================================================================

  private _buildEquipBar(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.2);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1, INK_COLORS.inkLight, 0.2);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    const slotSize = 48;
    const gap = (w - slotSize * 6) / 7;

    EQUIP_SLOTS.forEach((slot, i) => {
      const sx = -w / 2 + gap + slotSize / 2 + i * (slotSize + gap);
      const slotContainer = this.add.container(sx, 0);

      const slotBg = this.add.graphics();
      slotBg.fillStyle(INK_COLORS.inkGray, 0.4);
      slotBg.fillRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 6);
      slotBg.lineStyle(1, INK_COLORS.inkLight, 0.3);
      slotBg.strokeRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 6);
      slotContainer.add(slotBg);

      const iconText = this.add.text(0, -4, slot.icon, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '16px',
        color: '#888888',
      });
      iconText.setOrigin(0.5);
      slotContainer.add(iconText);

      const nameText = this.add.text(0, 12, slot.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '9px',
        color: '#AAAAAA',
      });
      nameText.setOrigin(0.5);
      slotContainer.add(nameText);

      const hitZone = this.add.zone(0, 0, slotSize, slotSize);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.showTooltip(`${slot.name}槽位`, this.input.activePointer.x, this.input.activePointer.y);
      });
      slotContainer.add(hitZone);

      container.add(slotContainer);
    });
  }

  // ==========================================================================
  // UI 辅助方法
  // ==========================================================================

  private _addLabel(parent: Phaser.GameObjects.Container, x: number, y: number, text: string): Phaser.GameObjects.Text {
    const label = this.add.text(x, y, text, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    label.setOrigin(0, 0.5);
    parent.add(label);
    return label;
  }

  private _addAttrRow(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    value: string,
    tooltipKey: string,
    maxW: number
  ): Phaser.GameObjects.Text {
    const labelText = this.add.text(x, y, `${label}：`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    labelText.setOrigin(0, 0.5);
    parent.add(labelText);

    const valueText = this.add.text(x + labelText.width + 4, y, value, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#F5F5DC',
    });
    valueText.setOrigin(0, 0.5);
    parent.add(valueText);

    const hitZone = this.add.zone(x + (labelText.width + valueText.width) / 2, y, maxW * 0.8, 28);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on(Phaser.Input.Events.POINTER_OVER, (pointer: any) => {
      this.showTooltip(ATTR_TOOLTIPS[tooltipKey] ?? label, pointer.x, pointer.y);
    });
    hitZone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.hideTooltip();
    });
    parent.add(hitZone);

    return valueText;
  }

  // ==========================================================================
  // UI 刷新
  // ==========================================================================

  private _updateUI(): void {
    const panelW = this._mainPanel.width;
    const contentH = this._mainPanel.contentHeight;
    this._switchTabContent(this._currentTabId, panelW * 0.86, contentH - 150);

    if (this._player.cultivation.lifespan <= 20 && !this._lifespanTween) {
      // 寿命警告动画将在下一次_tabContentContainer重建时创建
    } else if (this._player.cultivation.lifespan > 20 && this._lifespanTween) {
      this._lifespanTween.stop();
      this._lifespanTween = undefined;
    }
  }

  shutdown(): void {
    if (this._lifespanTween) {
      this._lifespanTween.stop();
      this._lifespanTween = undefined;
    }
  }
}
