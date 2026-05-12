/**
 * 《问道长生》Phaser 3 重构版 —— 门派界面面板
 * Phase 3D: 功能面板实现
 *
 * 门派界面：概览/任务/商店/晋升标签页，未加入时显示门派列表
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { TabGroup, ScrollList, InkProgressBar } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { SECTS, getSectConfig, REALMS, getRealmIndex } from '../../data/gameData';
import {
  SectSystem,
  SECT_POSITIONS,
  SECT_TASKS,
  SECT_SHOP_ITEMS,
  type SectTaskDef,
  type SectShopItemDef,
} from '../../systems/SectSystem';
import type { SectConfig } from '../../data/gameData';

export class SectScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _sectSystem!: SectSystem;

  // UI
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _tabGroup!: TabGroup;
  private _contentContainer!: Phaser.GameObjects.Container;
  private _currentTabId = 'overview';
  private _scrollList?: ScrollList<any>;

  constructor() {
    super({ key: 'SectScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();
    this._sectSystem = this._gsm.sectSystem;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 全屏面板
    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.9,
      title: '门派',
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

    // 内容容器
    this._contentContainer = this.add.container(0, 0);
    this._mainPanel.add(this._contentContainer);

    this._buildLayout();
    this._subscribeEvents();
  }

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._refreshContent();
    });
  }

  // ==========================================================================
  // 布局构建
  // ==========================================================================

  private _buildLayout(): void {
    const pw = this._mainPanel.width;
    const ph = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    const hasSect = this._sectSystem.hasSect;

    if (hasSect) {
      // 已加入门派：顶部信息 + TabGroup
      this._buildHeader(0, contentY + 18, pw * 0.88, 40);

      this._tabGroup = new TabGroup(this, 0, contentY + 52, {
        tabs: [
          { id: 'overview', label: '概览' },
          { id: 'tasks', label: '任务' },
          { id: 'shop', label: '商店' },
          { id: 'promotion', label: '晋升' },
        ],
        tabWidth: 80,
        tabHeight: 36,
        defaultIndex: 0,
        onChange: (tabId) => {
          this._currentTabId = tabId;
          this._refreshContent();
        },
      });
      this._mainPanel.add(this._tabGroup);

      // 内容区域
      this._showJoinedContent(pw, contentY + 80, contentH - 90);
    } else {
      // 未加入门派：显示五大门派列表
      this._showSectList(pw, contentY + 20, contentH - 40);
    }

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

  // ==========================================================================
  // 已加入门派：顶部信息
  // ==========================================================================

  private _buildHeader(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const sect = this._sectSystem.getCurrentSect();
    const membership = this._sectSystem.getState().membership;
    const pos = this._sectSystem.getCurrentPosition();

    // 门派名称 + 主题色条
    const themeColor = sect?.themeColor ?? '#4A6741';
    const colorNum = parseInt(themeColor.replace('#', '0x'));

    const decoBar = this.add.graphics();
    decoBar.fillStyle(colorNum, 0.8);
    decoBar.fillRoundedRect(-w / 2, -h / 2, 4, h, 2);
    container.add(decoBar);

    const sectName = this.add.text(-w / 2 + 14, -4, sect?.name ?? '未知门派', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '18px',
      color: themeColor,
    });
    sectName.setOrigin(0, 0.5);
    container.add(sectName);

    // 职位
    const posText = this.add.text(-w / 2 + 14, 14, `职位：${pos?.name ?? '无'}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    posText.setOrigin(0, 0.5);
    container.add(posText);

    // 声望
    const repText = this.add.text(w / 2 - 10, 0, `声望：${membership?.reputation ?? 0}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#D4AF37',
    });
    repText.setOrigin(1, 0.5);
    container.add(repText);
  }

  // ==========================================================================
  // 已加入门派：标签内容
  // ==========================================================================

  private _showJoinedContent(pw: number, contentY: number, contentH: number): void {
    this._contentContainer.removeAll(true);
    this._scrollList?.destroy();
    this._scrollList = undefined;

    switch (this._currentTabId) {
      case 'overview':
        this._showOverview(pw, contentY, contentH);
        break;
      case 'tasks':
        this._showTasks(pw, contentY, contentH);
        break;
      case 'shop':
        this._showShop(pw, contentY, contentH);
        break;
      case 'promotion':
        this._showPromotion(pw, contentY, contentH);
        break;
    }
  }

  private _refreshContent(): void {
    const pw = this._mainPanel.width;
    const cy = this._mainPanel.contentOriginY + 80;
    const ch = this._mainPanel.contentHeight - 90;
    this._showJoinedContent(pw, cy, ch);
  }

  // ---- 概览标签 ----
  private _showOverview(pw: number, cy: number, ch: number): void {
    const c = this._contentContainer;
    const sect = this._sectSystem.getCurrentSect();
    const pos = this._sectSystem.getCurrentPosition();
    const bonus = this._sectSystem.getSectBonus();

    let y = cy - ch / 2 + 16;

    // 门派描述
    const desc = this.add.text(0, y, sect?.description ?? '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#CCCCCC',
      wordWrap: { width: pw * 0.8 },
      align: 'center',
    });
    desc.setOrigin(0.5, 0);
    c.add(desc);
    y += desc.height + 20;

    // 当前职位俸禄
    const salaryText = this.add.text(0, y, `当前俸禄：${pos?.salaryLingshi ?? 0} 灵石/月`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#F5F5DC',
    });
    salaryText.setOrigin(0.5);
    c.add(salaryText);
    y += 32;

    // 门派加成
    const bonusLabel = this.add.text(-pw * 0.35, y, '门派加成：', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    bonusLabel.setOrigin(0, 0.5);
    c.add(bonusLabel);
    y += 28;

    const bonuses = [
      `修炼速度 +${Math.round(bonus.cultivationSpeed * 100)}%`,
      `攻击加成 +${Math.round(bonus.attackBonus * 100)}%`,
      `防御加成 +${Math.round(bonus.defenseBonus * 100)}%`,
      `商店折扣 ${Math.round(bonus.shopDiscount * 100)}%`,
    ];
    bonuses.forEach((b, i) => {
      const bx = i % 2 === 0 ? -pw * 0.22 : pw * 0.08;
      const by = y + Math.floor(i / 2) * 26;
      const text = this.add.text(bx, by, `· ${b}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#7ED957',
      });
      text.setOrigin(0, 0.5);
      c.add(text);
    });
    y += 60;

    // 离开门派按钮（红色标识）
    const leaveBtn = this.createInkButton(0, y + 30, {
      text: '离开门派',
      width: 120,
      height: 44,
      fontSize: 14,
    });
    leaveBtn.onClick(() => {
      if (window.confirm('确定要离开当前门派吗？离开后10年内无法加入新门派。')) {
        const player = this._gsm.getPlayerSnapshot() as any;
        const result = this._sectSystem.leaveSect(player?.gameTime?.year ?? 1);
        window.alert(result.message);
        // 重新构建整个布局
        this._contentContainer.removeAll(true);
        this._tabGroup?.destroy();
        this._buildLayout();
      }
    });
    c.add(leaveBtn);
  }

  // ---- 任务标签 ----
  private _showTasks(pw: number, cy: number, ch: number): void {
    const c = this._contentContainer;
    const gameTime = this._gsm.getTimeSnapshot();
    const tasks = this._sectSystem.getAvailableTasks(gameTime.year, gameTime.month);

    const taskData = tasks.map((t) => ({ id: t.id, task: t }));

    if (taskData.length === 0) {
      const empty = this.add.text(0, cy, '当前无可接任务', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#888888',
      });
      empty.setOrigin(0.5);
      c.add(empty);
      return;
    }

    this._scrollList = new ScrollList(this, 0, cy, {
      width: pw * 0.82,
      height: ch - 10,
      itemHeight: 72,
      itemSpacing: 6,
      data: taskData,
      renderer: (scene, data) => {
        const t = data.task as SectTaskDef;
        const container = scene.add.container(0, 0);
        const cellW = pw * 0.82 - 16;
        const cellH = 68;

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        const name = scene.add.text(-cellW / 2 + 12, -cellH / 2 + 14, t.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: '#F5F5DC',
        });
        name.setOrigin(0, 0.5);
        container.add(name);

        const typeColors: Record<string, string> = { daily: '#5BCEFA', contribution: '#7ED957', special: '#FF9E00' };
        const typeLabel = scene.add.text(-cellW / 2 + 12, -cellH / 2 + 36, t.description, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#AAAAAA',
        });
        typeLabel.setOrigin(0, 0.5);
        container.add(typeLabel);

        const reward = scene.add.text(cellW / 2 - 12, -cellH / 2 + 14, `${t.contributionReward}贡献`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: '#D4AF37',
        });
        reward.setOrigin(1, 0.5);
        container.add(reward);

        // 接取/提交按钮
        const btn = this.createInkButton(cellW / 2 - 50, cellH / 2 - 18, {
          text: '接取',
          width: 70,
          height: 32,
          fontSize: 12,
        });
        btn.onClick(() => {
          const result = this._sectSystem.acceptTask(t.id, gameTime.year, gameTime.month, () => true);
          window.alert(result.message);
          this._refreshContent();
        });
        container.add(btn);

        return container;
      },
    });
    c.add(this._scrollList);
  }

  // ---- 商店标签 ----
  private _showShop(pw: number, cy: number, ch: number): void {
    const c = this._contentContainer;
    const items = this._sectSystem.getAvailableShopItems();

    const shopData = items.map((i) => ({ id: i.id, item: i }));

    if (shopData.length === 0) {
      const empty = this.add.text(0, cy, '当前无可用商品', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#888888',
      });
      empty.setOrigin(0.5);
      c.add(empty);
      return;
    }

    this._scrollList = new ScrollList(this, 0, cy, {
      width: pw * 0.82,
      height: ch - 10,
      itemHeight: 64,
      itemSpacing: 6,
      data: shopData,
      renderer: (scene, data) => {
        const item = data.item as SectShopItemDef;
        const container = scene.add.container(0, 0);
        const cellW = pw * 0.82 - 16;
        const cellH = 60;

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 6);
        container.add(bg);

        const name = scene.add.text(-cellW / 2 + 12, -cellH / 2 + 12, item.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: '#F5F5DC',
        });
        name.setOrigin(0, 0.5);
        container.add(name);

        const desc = scene.add.text(-cellW / 2 + 12, -cellH / 2 + 32, item.description, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '11px',
          color: '#AAAAAA',
        });
        desc.setOrigin(0, 0.5);
        container.add(desc);

        const price = scene.add.text(cellW / 2 - 12, -cellH / 2 + 12, `${item.cost}贡献`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: '#D4AF37',
        });
        price.setOrigin(1, 0.5);
        container.add(price);

        const buyBtn = this.createInkButton(cellW / 2 - 50, cellH / 2 - 16, {
          text: '购买',
          width: 70,
          height: 30,
          fontSize: 12,
        });
        buyBtn.onClick(() => {
          const rep = this._sectSystem.getReputation();
          const result = this._sectSystem.buyFromShop(item.id, rep, () => {});
          window.alert(result.message);
          this._refreshContent();
        });
        container.add(buyBtn);

        return container;
      },
    });
    c.add(this._scrollList);
  }

  // ---- 晋升标签 ----
  private _showPromotion(pw: number, cy: number, ch: number): void {
    const c = this._contentContainer;
    const player = this._gsm.getPlayerSnapshot() as any;
    const realmIndex = getRealmIndex(player.cultivation.realm);
    const pos = this._sectSystem.getCurrentPosition();
    const currentIdx = this._sectSystem.currentPositionIndex;
    const check = this._sectSystem.canPromote(realmIndex);

    let y = cy - ch / 2 + 24;

    // 当前职位
    const currentText = this.add.text(0, y, `当前职位：${pos?.name ?? '无'}`, {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#F5F5DC',
    });
    currentText.setOrigin(0.5);
    c.add(currentText);
    y += 36;

    if (currentIdx >= SECT_POSITIONS.length - 1) {
      const maxText = this.add.text(0, y, '已是最高职位，恭喜！', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#D4AF37',
      });
      maxText.setOrigin(0.5);
      c.add(maxText);
      return;
    }

    const nextPos = SECT_POSITIONS[currentIdx + 1];

    // 下一职位要求
    const reqText = this.add.text(0, y, `下一职位：${nextPos.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#D4AF37',
    });
    reqText.setOrigin(0.5);
    c.add(reqText);
    y += 32;

    // 声望要求进度条
    const rep = this._sectSystem.getReputation();
    this._addLabel(c, -pw * 0.3, y, '声望要求');
    const repBar = new InkProgressBar(this, 20, y, {
      width: pw * 0.45,
      height: 16,
      type: 'cultivation',
      showText: true,
      textFormat: 'current/max',
    });
    repBar.setValue(rep, nextPos.requiredRep, false);
    c.add(repBar);
    y += 32;

    // 境界要求
    const realmReq = nextPos.requiredRealmIndex;
    const realmName = REALMS[realmReq]?.name ?? `${realmReq}阶`;
    const realmOk = realmIndex >= realmReq;
    const realmColor = realmOk ? '#7ED957' : '#FF4444';
    const realmText = this.add.text(0, y, `境界要求：${realmName} ${realmOk ? '✓' : '✗'}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: realmColor,
    });
    realmText.setOrigin(0.5);
    c.add(realmText);
    y += 36;

    // 申请晋升按钮
    const promoteBtn = this.createInkButton(0, y + 20, {
      text: '申请晋升',
      width: 120,
      height: 44,
      fontSize: 15,
    });
    promoteBtn.setDisabled(!check.can);
    promoteBtn.onClick(() => {
      const result = this._sectSystem.promotePosition(realmIndex);
      window.alert(result.message);
      this._refreshContent();
    });
    c.add(promoteBtn);

    if (!check.can) {
      const reason = this.add.text(0, y + 56, check.reason, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#FF4444',
      });
      reason.setOrigin(0.5);
      c.add(reason);
    }
  }

  // ==========================================================================
  // 未加入门派：门派列表
  // ==========================================================================

  private _showSectList(pw: number, cy: number, ch: number): void {
    const c = this._contentContainer;
    const sects = this._sectSystem.getAvailableSects();

    const label = this.add.text(0, cy - ch / 2 + 10, '请选择想要加入的门派', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#F5F5DC',
    });
    label.setOrigin(0.5);
    c.add(label);

    const sectData = sects.map((s) => ({ id: s.id, sect: s }));

    this._scrollList = new ScrollList(this, 0, cy + 20, {
      width: pw * 0.82,
      height: ch - 50,
      itemHeight: 110,
      itemSpacing: 8,
      data: sectData,
      renderer: (scene, data) => {
        const sect = data.sect as SectConfig;
        const container = scene.add.container(0, 0);
        const cellW = pw * 0.82 - 16;
        const cellH = 106;
        const themeColor = parseInt(sect.themeColor.replace('#', '0x'));

        const bg = scene.add.graphics();
        bg.fillStyle(INK_COLORS.inkGray, 0.25);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 8);
        bg.lineStyle(2, themeColor, 0.4);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 8);
        container.add(bg);

        // 名称
        const name = scene.add.text(-cellW / 2 + 16, -cellH / 2 + 18, sect.name, {
          fontFamily: '"Microsoft YaHei", serif',
          fontSize: '16px',
          color: sect.themeColor,
        });
        name.setOrigin(0, 0.5);
        container.add(name);

        // 五行
        const elementText: Record<string, string> = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
        const elem = scene.add.text(-cellW / 2 + 16, -cellH / 2 + 42, `主修：${elementText[sect.element] ?? sect.element}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: '#AAAAAA',
        });
        elem.setOrigin(0, 0.5);
        container.add(elem);

        // 描述
        const desc = scene.add.text(-cellW / 2 + 16, -cellH / 2 + 64, sect.description, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '12px',
          color: '#CCCCCC',
          wordWrap: { width: cellW - 140 },
        });
        desc.setOrigin(0, 0);
        container.add(desc);

        // 加入按钮
        const joinBtn = this.createInkButton(cellW / 2 - 60, 0, {
          text: '加入',
          width: 80,
          height: 36,
          fontSize: 13,
        });
        joinBtn.onClick(() => {
          const player = this._gsm.getPlayerSnapshot() as any;
          const realmIndex = getRealmIndex(player.cultivation.realm);
          const result = this._sectSystem.joinSect(sect.id, realmIndex, player.gameTime?.year ?? 1);
          window.alert(result.message);
          if (result.success) {
            this._contentContainer.removeAll(true);
            this._scrollList?.destroy();
            this._scrollList = undefined;
            this._buildLayout();
          }
        });
        container.add(joinBtn);

        return container;
      },
    });
    c.add(this._scrollList);
  }

  // ==========================================================================
  // 辅助方法
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
}
