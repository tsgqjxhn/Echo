/**
 * 《问道长生》Phaser 3 重构版 —— 战斗场景
 * Phase 3B: 战斗系统
 *
 * 战斗场景UI，适配移动端竖屏，包含回合制战斗交互。
 */

import { BaseScene } from './BaseScene';
import { CombatSystem } from '../systems/CombatSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { gameState } from '../managers/GameStateManager';
import { eventBus, GameEventType } from '../managers/EventBus';
import { InkProgressBar } from '../ui/InkProgressBar';
import { InkButton } from '../ui/InkButton';
import type { PlayerAction, Skill, BattleResult } from '../types';
import { clamp, formatNumber } from '../utils';

/** 战斗场景配置 */
interface BattleSceneData {
  enemyId: string;
  battleType?: 'normal' | 'boss' | 'breakthrough' | 'arena';
}

/** 神通卡槽UI */
interface SkillCardUI {
  container: Phaser.GameObjects.Container;
  skill: Skill;
  cooldownText: Phaser.GameObjects.Text;
  manaText: Phaser.GameObjects.Text;
}

export class BattleScene extends BaseScene {
  private _combatSystem = new CombatSystem();
  private _skillSystem = new SkillSystem();
  private _battleData?: BattleSceneData;

  // UI元素
  private _roundText?: Phaser.GameObjects.Text;
  private _playerHpBar?: InkProgressBar;
  private _playerMpBar?: InkProgressBar;
  private _enemyHpBar?: InkProgressBar;
  private _enemyNameText?: Phaser.GameObjects.Text;
  private _logText?: Phaser.GameObjects.Text;
  private _skillCards: SkillCardUI[] = [];
  private _actionButtons: InkButton[] = [];
  private _autoToggle?: InkButton;
  private _damageNumbers: Phaser.GameObjects.Text[] = [];
  private _battleEffectGraphics?: Phaser.GameObjects.Graphics;

  // 状态
  private _isPlayerTurn = false;
  private _isAnimating = false;
  private _pendingAction: PlayerAction | null = null;
  private _autoBattle = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  init(data: BattleSceneData): void {
    this._battleData = data;
  }

  create(): void {
    super.create();

    const width = this.scale.width;
    const height = this.scale.height;

    // 背景（深色战斗背景）
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    // 战斗特效画布
    this._battleEffectGraphics = this.add.graphics();

    // 初始化战斗系统
    const playerData = gameState.getPlayerSnapshot();
    const battleType = this._battleData?.battleType ?? 'normal';
    const enemyId = this._battleData?.enemyId ?? 'spirit_rabbit';

    this._combatSystem.startBattle(enemyId, battleType, playerData);

    // 广播战斗开始事件
    eventBus.emit(GameEventType.BATTLE_STARTED, {
      enemyId,
      enemyName: this._combatSystem.state?.enemy.name ?? '未知敌人',
    });

    // 构建UI
    this._buildTopBar(width);
    this._buildEnemyArea(width, height);
    this._buildBattleArea(width, height);
    this._buildActionArea(width, height);

    // 更新UI初始状态
    this._updateUI();

    // 开始第一回合
    this._processTurnQueue();

    // 订阅事件
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._updateUI();
    });
  }

  // ==========================================================================
  // UI构建
  // ==========================================================================

  /** 顶部栏：回合数 + 双方血量 */
  private _buildTopBar(width: number): void {
    const y = 30;

    // 回合数
    this._roundText = this.add.text(width / 2, y, '第 1 回合', {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '18px',
      color: '#F5F5DC',
    });
    this._roundText.setOrigin(0.5);

    // 玩家血量条
    this._playerHpBar = new InkProgressBar(this, 80, y + 30, {
      width: 140,
      height: 16,
      type: 'hp',
      showText: true,
      textFormat: 'current/max',
    });

    // 玩家灵气条
    this._playerMpBar = new InkProgressBar(this, 80, y + 52, {
      width: 140,
      height: 10,
      type: 'mp',
      showText: true,
      textFormat: 'current/max',
    });

    // 敌人血量条
    this._enemyHpBar = new InkProgressBar(this, width - 80, y + 30, {
      width: 140,
      height: 16,
      type: 'hp',
      showText: true,
      textFormat: 'percent',
    });
  }

  /** 敌人区域 */
  private _buildEnemyArea(width: number, height: number): void {
    const y = height * 0.18;

    // 敌人名称
    this._enemyNameText = this.add.text(width / 2, y, '', {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '22px',
      color: '#FF6B6B',
    });
    this._enemyNameText.setOrigin(0.5);

    // 敌人占位图形（圆形代表敌人）
    const enemyGfx = this.add.graphics();
    enemyGfx.fillStyle(0x8B0000, 0.6);
    enemyGfx.fillCircle(width / 2, y + 60, 40);
    enemyGfx.lineStyle(2, 0xFF6B6B, 0.8);
    enemyGfx.strokeCircle(width / 2, y + 60, 40);

    // 五行标识
    const state = this._combatSystem.state;
    if (state) {
      const elementColors: Record<string, number> = {
        metal: 0xC0C0C0,
        wood: 0x4A6741,
        water: 0x4A90D9,
        fire: 0xD9534F,
        earth: 0x8B6914,
      };
      const elementNames: Record<string, string> = {
        metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
      };
      const elementColor = elementColors[state.enemy.element] ?? 0x888888;

      const elGfx = this.add.graphics();
      elGfx.fillStyle(elementColor, 1);
      elGfx.fillCircle(width / 2 + 50, y + 30, 14);
      this.add.text(width / 2 + 50, y + 30, elementNames[state.enemy.element] ?? '?', {
        fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
        fontSize: '12px',
        color: '#FFFFFF',
      }).setOrigin(0.5);
    }
  }

  /** 战斗动画区域 */
  private _buildBattleArea(width: number, height: number): void {
    const centerY = height * 0.42;

    // 玩家占位
    const playerGfx = this.add.graphics();
    playerGfx.fillStyle(0x2E8B57, 0.6);
    playerGfx.fillCircle(width * 0.25, centerY, 30);
    playerGfx.lineStyle(2, 0x7BE08A, 0.8);
    playerGfx.strokeCircle(width * 0.25, centerY, 30);

    // VS 标识
    this.add.text(width / 2, centerY, 'VS', {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '24px',
      color: '#F5F5DC',
    }).setOrigin(0.5);

    // 战斗日志
    this._logText = this.add.text(width / 2, centerY + 60, '', {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '14px',
      color: '#CCCCCC',
      align: 'center',
    });
    this._logText.setOrigin(0.5);
  }

  /** 操作区域 */
  private _buildActionArea(width: number, height: number): void {
    const startY = height * 0.58;
    const state = this._combatSystem.state;
    if (!state) return;

    // 神通卡槽区域
    const cardY = startY + 30;
    const cardWidth = 72;
    const cardSpacing = 8;
    const totalCards = state.player.skills.length;
    const totalWidth = totalCards * cardWidth + (totalCards - 1) * cardSpacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    this._skillCards = [];
    for (let i = 0; i < state.player.skills.length; i++) {
      const skill = state.player.skills[i];
      const x = startX + i * (cardWidth + cardSpacing);
      const cardUI = this._createSkillCard(x, cardY, skill, cardWidth);
      this._skillCards.push(cardUI);
    }

    // 操作按钮行
    const btnY = cardY + 70;
    const btnWidth = 80;
    const btnSpacing = 12;
    const btnTotalWidth = 4 * btnWidth + 3 * btnSpacing;
    const btnStartX = (width - btnTotalWidth) / 2 + btnWidth / 2;

    // 攻击按钮
    const attackBtn = this.createInkButton(btnStartX, btnY, {
      text: '攻击',
      width: btnWidth,
      height: 44,
      fontSize: 16,
    });
    attackBtn.onClick(() => this._onAction({ type: 'attack' }));
    this._actionButtons.push(attackBtn);

    // 防御按钮
    const defendBtn = this.createInkButton(btnStartX + btnWidth + btnSpacing, btnY, {
      text: '防御',
      width: btnWidth,
      height: 44,
      fontSize: 16,
    });
    defendBtn.onClick(() => this._onAction({ type: 'defend' }));
    this._actionButtons.push(defendBtn);

    // 物品按钮
    const itemBtn = this.createInkButton(btnStartX + 2 * (btnWidth + btnSpacing), btnY, {
      text: '物品',
      width: btnWidth,
      height: 44,
      fontSize: 16,
    });
    itemBtn.onClick(() => this._onUseItem());
    this._actionButtons.push(itemBtn);

    // 逃跑按钮
    const fleeBtn = this.createInkButton(btnStartX + 3 * (btnWidth + btnSpacing), btnY, {
      text: '逃跑',
      width: btnWidth,
      height: 44,
      fontSize: 16,
    });
    fleeBtn.onClick(() => this._onAction({ type: 'flee' }));
    this._actionButtons.push(fleeBtn);

    // 自动战斗开关
    this._autoToggle = this.createInkButton(width - 50, btnY + 50, {
      text: '自动:关',
      width: 80,
      height: 36,
      fontSize: 14,
    });
    this._autoToggle.onClick(() => this._toggleAutoBattle());
  }

  /** 创建神通卡片 */
  private _createSkillCard(x: number, y: number, skill: Skill, width: number): SkillCardUI {
    const container = this.add.container(x, y);
    const height = 56;

    // 卡片背景
    const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(1, 0x4a4a6a);
    container.add(bg);

    // 神通名称
    const nameText = this.add.text(0, -14, skill.name, {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '12px',
      color: '#F5F5DC',
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // 灵气消耗
    const manaText = this.add.text(0, 2, `${skill.mpCost}灵`, {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '10px',
      color: '#5BCEFA',
    });
    manaText.setOrigin(0.5);
    container.add(manaText);

    // 冷却显示
    const cdText = this.add.text(0, 16, '', {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize: '10px',
      color: '#FF6B6B',
    });
    cdText.setOrigin(0.5);
    container.add(cdText);

    // 点击交互
    const hitZone = this.add.zone(0, 0, width, height);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on('pointerdown', () => {
      if (skill.currentCooldown > 0) {
        this._showLog(`${skill.name} 冷却中 (${skill.currentCooldown}回合)`);
        return;
      }
      const state = this._combatSystem.state;
      if (state && state.player.mp < skill.mpCost) {
        this._showLog('灵气不足！');
        return;
      }
      this._onAction({ type: 'skill', skillId: skill.id });
    });

    // 长按显示详情
    hitZone.on('pointerover', () => {
      this.showTooltip(
        `${skill.name}\n${skill.description ?? ''}\n消耗:${skill.mpCost}灵气 冷却:${skill.cooldown}回合`,
        x,
        y - height
      );
    });
    hitZone.on('pointerout', () => {
      this.hideTooltip();
    });

    return { container, skill, cooldownText: cdText, manaText };
  }

  // ==========================================================================
  // 交互处理
  // ==========================================================================

  private _onAction(action: PlayerAction): void {
    if (!this._isPlayerTurn || this._isAnimating) return;
    this._pendingAction = action;
    this._executePlayerTurn();
  }

  private _onUseItem(): void {
    if (!this._isPlayerTurn || this._isAnimating) return;
    // 简化：直接使用回血丹
    const state = this._combatSystem.state;
    if (!state) return;

    const result = this._combatSystem.useBattleItem('huixue_dan', state.player);
    this._showLog(result.log);
    if (result.success && result.healAmount) {
      this._showDamageNumber(this.scale.width * 0.25, this.scale.height * 0.42, result.healAmount, false, true);
      this._updateUI();
    }
  }

  private _toggleAutoBattle(): void {
    this._autoBattle = !this._autoBattle;
    this._autoToggle?.setText(`自动:${this._autoBattle ? '开' : '关'}`);
    this._combatSystem.toggleAuto();

    if (this._autoBattle && this._isPlayerTurn && !this._isAnimating) {
      this._executeAutoAction();
    }
  }

  // ==========================================================================
  // 回合处理
  // ==========================================================================

  private _processTurnQueue(): void {
    const turn = this._combatSystem.getCurrentTurn();
    if (!turn) return;

    if (turn === 'player') {
      this._isPlayerTurn = true;
      this._updateActionButtons(true);
      this._showLog('轮到你的回合');

      if (this._autoBattle) {
        this.time.delayedCall(500, () => this._executeAutoAction());
      }
    } else {
      this._isPlayerTurn = false;
      this._updateActionButtons(false);
      this.time.delayedCall(800, () => this._executeEnemyTurn());
    }
  }

  private _executePlayerTurn(): void {
    if (!this._pendingAction) return;
    this._isAnimating = true;

    const result = this._combatSystem.executeTurn(this._pendingAction);
    this._pendingAction = null;

    this._playTurnAnimation(result, 'player');
  }

  private _executeEnemyTurn(): void {
    this._isAnimating = true;
    const result = this._combatSystem.executeAutoTurn();
    this._playTurnAnimation(result, 'enemy');
  }

  private _executeAutoAction(): void {
    if (!this._isPlayerTurn || this._isAnimating) return;

    // AI策略：优先使用高伤害可用技能，否则普通攻击
    const state = this._combatSystem.state;
    if (!state) return;

    let bestSkill: Skill | null = null;
    for (const skill of state.player.skills) {
      if (skill.currentCooldown === 0 && state.player.mp >= skill.mpCost && skill.type === 'attack') {
        if (!bestSkill || skill.power > bestSkill.power) {
          bestSkill = skill;
        }
      }
    }

    if (bestSkill && bestSkill.id !== 'basic_attack') {
      this._pendingAction = { type: 'skill', skillId: bestSkill.id };
    } else {
      this._pendingAction = { type: 'attack' };
    }

    this._executePlayerTurn();
  }

  // ==========================================================================
  // 动画与特效
  // ==========================================================================

  private _playTurnAnimation(result: import('../types').TurnResult, actor: 'player' | 'enemy'): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 显示日志
    for (const log of result.logs.slice(0, 3)) {
      this._showLog(log);
    }

    // 播放伤害/治疗数字
    if (result.damage) {
      const targetX = actor === 'player' ? width * 0.75 : width * 0.25;
      const targetY = height * 0.42;
      this._showDamageNumber(
        targetX,
        targetY,
        result.damage.damage,
        result.damage.isCrit,
        false,
        result.damage.elementModifier
      );
    }

    if (result.healAmount) {
      const healerX = actor === 'player' ? width * 0.25 : width * 0.75;
      const healerY = height * 0.42;
      this._showDamageNumber(healerX, healerY, result.healAmount, false, true);
    }

    // 播放神通特效
    if (result.action === 'skill') {
      const element = this._getActionElement(result);
      this._playElementEffect(element, actor);
    }

    // 更新UI
    this._updateUI();
    this._updateSkillCards();

    // 检查战斗结束
    const battleResult = this._combatSystem.checkBattleEnd();
    if (battleResult) {
      this.time.delayedCall(1500, () => this._endBattle(battleResult));
      return;
    }

    // 继续下一回合
    this.time.delayedCall(1200, () => {
      this._isAnimating = false;
      this._processTurnQueue();
    });
  }

  private _getActionElement(result: import('../types').TurnResult): string {
    const state = this._combatSystem.state;
    if (!state) return 'metal';

    if (result.action === 'skill') {
      // 查找使用的技能
      const unit = result.actor === 'player' ? state.player : state.enemy;
      // 从日志中推断或使用单位主属性
      return unit.element;
    }
    return 'metal';
  }

  /** 播放五行特效 */
  private _playElementEffect(element: string, actor: 'player' | 'enemy'): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const fromX = actor === 'player' ? width * 0.25 : width * 0.75;
    const toX = actor === 'player' ? width * 0.75 : width * 0.25;
    const y = height * 0.42;

    const g = this._battleEffectGraphics;
    if (!g) return;

    switch (element) {
      case 'metal': {
        // 金色剑气 - 线条
        g.lineStyle(3, 0xFFD700, 0.8);
        g.beginPath();
        g.moveTo(fromX, y);
        g.lineTo(toX, y);
        g.strokePath();
        this.tweens.add({
          targets: {},
          duration: 300,
          onUpdate: () => {},
          onComplete: () => g.clear(),
        });
        break;
      }
      case 'wood': {
        // 绿色毒雾 - 粒子
        for (let i = 0; i < 8; i++) {
          const px = toX + (Math.random() - 0.5) * 60;
          const py = y + (Math.random() - 0.5) * 60;
          const pSize = 4 + Math.random() * 6;
          const particle = this.add.graphics();
          particle.fillStyle(0x4A6741, 0.6);
          particle.fillCircle(0, 0, pSize);
          particle.x = px;
          particle.y = py;
          this.tweens.add({
            targets: particle,
            alpha: 0,
            scale: 2,
            duration: 600,
            onComplete: () => particle.destroy(),
          });
        }
        break;
      }
      case 'water': {
        // 蓝色冰霜 - 圆形扩散
        const circle = this.add.graphics();
        circle.fillStyle(0x4A90D9, 0.5);
        circle.fillCircle(0, 0, 10);
        circle.x = toX;
        circle.y = y;
        this.tweens.add({
          targets: circle,
          scale: 4,
          alpha: 0,
          duration: 500,
          onComplete: () => circle.destroy(),
        });
        break;
      }
      case 'fire': {
        // 红色烈焰 - 粒子 + 屏幕震动
        for (let i = 0; i < 12; i++) {
          const px = toX + (Math.random() - 0.5) * 50;
          const py = y + (Math.random() - 0.5) * 50;
          const fSize = 3 + Math.random() * 5;
          const flame = this.add.graphics();
          flame.fillStyle(0xD9534F, 0.7);
          flame.fillCircle(0, 0, fSize);
          flame.x = px;
          flame.y = py;
          this.tweens.add({
            targets: flame,
            y: py - 30,
            alpha: 0,
            duration: 400 + Math.random() * 200,
            onComplete: () => flame.destroy(),
          });
        }
        (this.cameras.main as any).shake(200, 0.005);
        break;
      }
      case 'earth': {
        // 黄色山岳 - 矩形下压
        const rect = this.add.rectangle(toX, y - 30, 60, 40, 0x8B6914, 0.6);
        this.tweens.add({
          targets: rect,
          y: y + 10,
          duration: 300,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: rect,
              alpha: 0,
              duration: 300,
              onComplete: () => rect.destroy(),
            });
          },
        });
        break;
      }
    }
  }

  /** 显示伤害/治疗数字 */
  private _showDamageNumber(
    x: number,
    y: number,
    value: number,
    isCrit: boolean,
    isHeal: boolean,
    elementModifier?: number
  ): void {
    const color = isHeal ? '#7BE08A' : isCrit ? '#FFD700' : elementModifier && elementModifier > 1 ? '#FF6B6B' : '#FFFFFF';
    const fontSize = isCrit ? '32px' : '22px';
    const prefix = isHeal ? '+' : '-';

    const text = this.add.text(x, y, `${prefix}${formatNumber(value, 0)}`, {
      fontFamily: '"Microsoft YaHei", "SimHei", sans-serif',
      fontSize,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    this._damageNumbers.push(text);

    // 暴击震动
    if (isCrit) {
      (this.cameras.main as any).shake(150, 0.003);
    }

    // 上浮动画
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
        const idx = this._damageNumbers.indexOf(text);
        if (idx >= 0) this._damageNumbers.splice(idx, 1);
      },
    });
  }

  // ==========================================================================
  // UI更新
  // ==========================================================================

  private _updateUI(): void {
    const state = this._combatSystem.state;
    if (!state) return;

    // 回合数
    this._roundText?.setText(`第 ${state.round} 回合`);

    // 血量条
    this._playerHpBar?.setValue(state.player.hp, state.player.maxHp);
    this._playerMpBar?.setValue(state.player.mp, state.player.maxMp);
    this._enemyHpBar?.setValue(state.enemy.hp, state.enemy.maxHp);

    // 敌人名称
    this._enemyNameText?.setText(state.enemy.name);
  }

  private _updateSkillCards(): void {
    const state = this._combatSystem.state;
    if (!state) return;

    for (const card of this._skillCards) {
      const skill = state.player.skills.find((s) => s.id === card.skill.id);
      if (!skill) continue;

      // 更新冷却显示
      if (skill.currentCooldown > 0) {
        card.cooldownText.setText(`CD:${skill.currentCooldown}`);
        card.container.setAlpha(0.5);
      } else {
        card.cooldownText.setText('');
        // 检查灵气是否足够
        const hasMana = state.player.mp >= skill.mpCost;
        card.container.setAlpha(hasMana ? 1 : 0.4);
      }
    }
  }

  private _updateActionButtons(enabled: boolean): void {
    for (const btn of this._actionButtons) {
      btn.setDisabled(!enabled);
    }
  }

  private _showLog(message: string): void {
    if (this._logText) {
      this._logText.setText(message);
      // 淡入效果
      this._logText.setAlpha(0);
      this.tweens.add({
        targets: this._logText,
        alpha: 1,
        duration: 200,
      });
    }
  }

  // ==========================================================================
  // 战斗结束
  // ==========================================================================

  private _endBattle(result: BattleResult): void {
    this._updateActionButtons(false);

    // 广播战斗结束
    eventBus.emit(GameEventType.BATTLE_ENDED, {
      victory: result.victory,
      expGained: result.expGained,
    });

    // 应用奖励
    if (result.victory) {
      gameState.modifyPlayer('cultivation.exp', result.expGained, 'battle_victory');
      gameState.modifyPlayer('stats.hp', result.playerHpRemaining - gameState.getPlayerSnapshot().stats.hp, 'battle_end');
      gameState.modifyPlayer('stats.mp', result.playerMpRemaining - gameState.getPlayerSnapshot().stats.mp, 'battle_end');

      // 添加掉落物品到背包
      for (const [itemId, quantity] of Object.entries(result.loot)) {
        gameState.addItem(itemId, quantity);
        // Phase 8: 触发物品图鉴解锁
        const itemCodexId = `item_${itemId}`;
        if (!gameState.isCodexUnlocked(itemCodexId)) {
          gameState.unlockCodex(itemCodexId, itemId, '物品');
        }
      }

      // Phase 8: 解锁敌人图鉴（如果是首次遇到该敌人）
      const enemyCodexId = `enemy_${this._battleData?.enemyId}`;
      if (this._battleData?.enemyId && !gameState.isCodexUnlocked(enemyCodexId)) {
        const enemyName = this._combatSystem.state?.enemy.name ?? '未知敌人';
        gameState.unlockCodex(enemyCodexId, enemyName, '妖兽');
      }

      this._showLog(`战斗胜利！获得 ${formatNumber(result.expGained, 0)} 修为`);
    } else {
      // 失败恢复30%生命
      const player = gameState.getPlayerSnapshot();
      const recoverHp = Math.floor(player.stats.maxHp * 0.3);
      gameState.setPlayer('stats.hp', recoverHp, 'battle_defeat');
      this._showLog('战斗失败...恢复部分生命');
    }

    // 延迟返回地图
    this.time.delayedCall(2000, () => {
      this._combatSystem.reset();
      this.switchScene('MapScene');
    });
  }

  // ==========================================================================
  // 清理
  // ==========================================================================

  shutdown(): void {
    this._combatSystem.reset();
    this._skillCards = [];
    this._actionButtons = [];
    this._damageNumbers = [];
  }
}
