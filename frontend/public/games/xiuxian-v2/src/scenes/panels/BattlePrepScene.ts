/**
 * 《问道长生》Phaser 3 重构版 —— 战斗准备界面
 * Phase 4: 战斗准备系统
 *
 * 从地图点击战斗任务或探索遇到战斗节点时，先进入此界面。
 * 左侧：敌人预览区域
 * 右侧：玩家准备区域（装备、技能、丹药）
 * 底部：开始战斗 / 撤退 按钮
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { InkProgressBar } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { getEnemyConfig, RARITY_COLORS } from '../../data/gameData';
import type { Technique, Item } from '../../types';

/** 战斗准备场景数据 */
export interface BattlePrepData {
  enemyId: string;
  battleType?: 'normal' | 'boss' | 'breakthrough' | 'arena';
  source?: 'map' | 'exploration';
}

export class BattlePrepScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _prepData!: BattlePrepData;
  private _selectedTechniques: string[] = [];
  private _selectedPill?: string;

  // UI
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _enemyHpBar?: InkProgressBar;

  constructor() {
    super({ key: 'BattlePrepScene' });
  }

  init(data: BattlePrepData): void {
    this._prepData = data;
    this._selectedTechniques = [];
    this._selectedPill = undefined;
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.94,
      height: h * 0.9,
      title: '战前准备',
      showOverlay: true,
      closeOnOverlay: false,
      animate: true,
    });
    this._mainPanel.show();

    this._buildLayout();
  }

  // ==========================================================================
  // 布局
  // ==========================================================================

  private _buildLayout(): void {
    const pw = this._mainPanel.width;
    const ph = this._mainPanel.height;
    const contentY = this._mainPanel.contentOriginY;
    const contentH = this._mainPanel.contentHeight;

    // 左侧：敌人预览 (45%)
    this._buildEnemyPreview(-pw * 0.22, contentY + contentH * 0.4, pw * 0.4, contentH * 0.7);

    // 右侧：玩家准备 (45%)
    this._buildPlayerPrep(pw * 0.22, contentY + contentH * 0.4, pw * 0.4, contentH * 0.7);

    // 底部按钮
    this._buildActionButtons(0, contentY + contentH - 40, pw * 0.8);

    // 返回/关闭按钮
    const backBtn = this.createInkButton(pw * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this._onRetreat());
    this._mainPanel.add(backBtn);
  }

  // ==========================================================================
  // 左侧：敌人预览
  // ==========================================================================

  private _buildEnemyPreview(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const enemyCfg = getEnemyConfig(this._prepData.enemyId);
    if (!enemyCfg) {
      const noData = this.add.text(0, 0, '敌人数据缺失', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#FF4444',
      });
      noData.setOrigin(0.5);
      container.add(noData);
      return;
    }

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.2);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1, INK_COLORS.inkLight, 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(bg);

    // 标题
    const title = this.add.text(0, -h / 2 + 24, '敌方情报', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    title.setOrigin(0.5);
    container.add(title);

    // 敌人形象（圆形占位）
    const enemyAvatar = this.add.graphics();
    enemyAvatar.fillStyle(0x8B0000, 0.5);
    enemyAvatar.fillCircle(0, -h * 0.15, 50);
    enemyAvatar.lineStyle(2, 0xFF6B6B, 0.8);
    enemyAvatar.strokeCircle(0, -h * 0.15, 50);
    container.add(enemyAvatar);

    const enemyName = this.add.text(0, -h * 0.15, enemyCfg.name.charAt(0), {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '32px',
      color: '#FF6B6B',
    });
    enemyName.setOrigin(0.5);
    container.add(enemyName);

    // 敌人名称
    const nameText = this.add.text(0, h * 0.05, enemyCfg.name, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#FF6B6B',
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // 境界
    const realmText = this.add.text(0, h * 0.14, `${enemyCfg.realm} ${enemyCfg.element}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    realmText.setOrigin(0.5);
    container.add(realmText);

    // HP 条
    this._enemyHpBar = new InkProgressBar(this, 0, h * 0.24, {
      width: w * 0.7,
      height: 16,
      type: 'hp',
      showText: true,
      textFormat: 'current/max',
    });
    this._enemyHpBar.setValue(enemyCfg.hp, enemyCfg.hp, false);
    container.add(this._enemyHpBar);

    // 属性概览
    const attrs = [
      { label: '攻击', value: enemyCfg.attack },
      { label: '防御', value: enemyCfg.defense },
      { label: '速度', value: enemyCfg.speed },
    ];
    attrs.forEach((attr, i) => {
      const ax = (i - 1) * (w * 0.22);
      const ay = h * 0.38;
      const attrLabel = this.add.text(ax, ay, `${attr.label}：${attr.value}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#CCCCCC',
      });
      attrLabel.setOrigin(0.5);
      container.add(attrLabel);
    });

    // 描述
    if (enemyCfg.description) {
      const desc = this.add.text(0, h * 0.5, enemyCfg.description, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#888888',
        align: 'center',
        wordWrap: { width: w * 0.8 },
      });
      desc.setOrigin(0.5);
      container.add(desc);
    }
  }

  // ==========================================================================
  // 右侧：玩家准备
  // ==========================================================================

  private _buildPlayerPrep(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.2);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1, INK_COLORS.inkLight, 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(bg);

    // 标题
    const title = this.add.text(0, -h / 2 + 24, '备战配置', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    title.setOrigin(0.5);
    container.add(title);

    const player = this._gsm.getPlayerSnapshot();
    const business = this._gsm.businessState;
    const techniques = business.techniques as Technique[];
    const inventory = business.inventory as Item[];

    // 当前状态概览
    const statY = -h / 2 + 56;
    const stats = [
      { label: '生命', current: player.stats.hp, max: player.stats.maxHp },
      { label: '法力', current: player.stats.mp, max: player.stats.maxMp },
    ];
    stats.forEach((s, i) => {
      const sy = statY + i * 28;
      const statText = this.add.text(-w / 2 + 16, sy, `${s.label}：${s.current}/${s.max}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#CCCCCC',
      });
      statText.setOrigin(0, 0.5);
      container.add(statText);
    });

    // 技能选择（最多3个）
    const skillY = -h / 2 + 120;
    const skillLabel = this.add.text(-w / 2 + 16, skillY, `选择技能 (${this._selectedTechniques.length}/3)：`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    skillLabel.setOrigin(0, 0.5);
    container.add(skillLabel);

    if (techniques.length === 0) {
      const noSkill = this.add.text(0, skillY + 30, '未学习功法', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#666666',
      });
      noSkill.setOrigin(0.5);
      container.add(noSkill);
    } else {
      techniques.forEach((tech, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const sx = -w / 2 + 20 + col * (w * 0.45);
        const sy = skillY + 24 + row * 32;

        const isSelected = this._selectedTechniques.includes(tech.id);
        const btn = this.createInkButton(sx + 50, sy, {
          text: `${isSelected ? '✓ ' : ''}${tech.name}`,
          width: w * 0.38,
          height: 28,
          fontSize: 11,
        });
        if (isSelected) {
          btn.setAlpha(1);
        } else {
          btn.setAlpha(0.7);
        }
        btn.onClick(() => this._toggleTechnique(tech.id));
        container.add(btn);
      });
    }

    // 丹药快捷槽
    const pillY = h * 0.25;
    const pillLabel = this.add.text(-w / 2 + 16, pillY, '丹药快捷槽：', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    pillLabel.setOrigin(0, 0.5);
    container.add(pillLabel);

    const pills = inventory.filter((i) => i.type === 'pill' || i.type === 'consumable');
    if (pills.length === 0) {
      const noPill = this.add.text(0, pillY + 24, '无可用丹药', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#666666',
      });
      noPill.setOrigin(0.5);
      container.add(noPill);
    } else {
      pills.slice(0, 4).forEach((pill, i) => {
        const px = -w / 2 + 30 + i * (w * 0.22);
        const py = pillY + 28;
        const isSelected = this._selectedPill === pill.id;
        const btn = this.createInkButton(px + 40, py, {
          text: `${isSelected ? '● ' : ''}${pill.name}`,
          width: w * 0.18,
          height: 28,
          fontSize: 10,
        });
        btn.setAlpha(isSelected ? 1 : 0.7);
        btn.onClick(() => this._selectPill(pill.id));
        container.add(btn);
      });
    }

    // 装备概览（简化）
    const equipY = h * 0.48;
    const equipLabel = this.add.text(-w / 2 + 16, equipY, '当前装备：', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    equipLabel.setOrigin(0, 0.5);
    container.add(equipLabel);

    const equipSlots = ['武器', '防具', '饰品', '法宝'];
    equipSlots.forEach((slot, i) => {
      const ex = -w / 2 + 20 + i * (w * 0.22);
      const ey = equipY + 24;
      const slotBg = this.add.graphics();
      slotBg.fillStyle(INK_COLORS.inkGray, 0.3);
      slotBg.fillRoundedRect(ex, ey - 14, w * 0.18, 28, 4);
      container.add(slotBg);

      const slotText = this.add.text(ex + w * 0.09, ey, slot, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '10px',
        color: '#666666',
      });
      slotText.setOrigin(0.5);
      container.add(slotText);
    });
  }

  // ==========================================================================
  // 交互
  // ==========================================================================

  private _toggleTechnique(techId: string): void {
    const idx = this._selectedTechniques.indexOf(techId);
    if (idx >= 0) {
      this._selectedTechniques.splice(idx, 1);
    } else if (this._selectedTechniques.length < 3) {
      this._selectedTechniques.push(techId);
    }
    this._refreshPlayerPrep();
  }

  private _selectPill(pillId: string): void {
    this._selectedPill = this._selectedPill === pillId ? undefined : pillId;
    this._refreshPlayerPrep();
  }

  private _refreshPlayerPrep(): void {
    // 移除右侧容器并重绘
    this._mainPanel.removeAll(true);
    // 重新构建（简化：直接 rebuild 整个面板）
    this.scene.restart(this._prepData);
  }

  // ==========================================================================
  // 底部按钮
  // ==========================================================================

  private _buildActionButtons(x: number, y: number, w: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 开始战斗
    const startBtn = this.createInkButton(-w * 0.18, 0, {
      text: '开始战斗',
      width: 120,
      height: 44,
      fontSize: 16,
    });
    startBtn.onClick(() => this._onStartBattle());
    container.add(startBtn);

    // 撤退
    const retreatBtn = this.createInkButton(w * 0.18, 0, {
      text: '撤退',
      width: 120,
      height: 44,
      fontSize: 16,
    });
    retreatBtn.onClick(() => this._onRetreat());
    container.add(retreatBtn);
  }

  private _onStartBattle(): void {
    const battleType = this._prepData.battleType ?? 'normal';
    this.scene.stop();
    this.scene.launch('BattleScene', {
      enemyId: this._prepData.enemyId,
      battleType,
      selectedTechniques: this._selectedTechniques,
      selectedPill: this._selectedPill,
    });
  }

  private _onRetreat(): void {
    this.scene.stop();
  }
}
