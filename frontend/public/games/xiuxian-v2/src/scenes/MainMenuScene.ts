/**
 * 《问道长生》Phaser 3 重构版 —— 主菜单场景
 * Phase 2B + Phase 1: 核心游戏场景实现 + 世界观与角色创建
 *
 * 主菜单，展示游戏标题、菜单按钮列表、背景粒子装饰。
 * 新增：世界观说明界面 + 三步骤角色创建流程（职业→天赋→出生点）。
 * 继承 BaseScene，使用水墨风格UI组件。
 */

import { BaseScene } from './BaseScene';
import { gameState } from '../managers/GameStateManager';
import { saveManager } from '../managers/SaveManager';
import { eventBus, GameEventType } from '../managers/EventBus';
import { InkButton, InkPanel, INK_COLORS, TabGroup } from '../ui';
import { createNewPlayer } from '../models/PlayerData';
import {
  PROFESSIONS,
  BIRTH_PLACES,
  WORLD_DOMAINS,
  TALENT_RARITY_COLORS,
  TALENT_RARITY_NAMES,
  rollTalents,
  getWorldDomainConfig,
  type ProfessionConfig,
  type TalentConfig,
  type BirthPlaceConfig,
} from '../data/gameData';

/** 角色创建状态 */
interface CreationState {
  profession: string;
  talent: string;
  birthPlace: string;
}

export class MainMenuScene extends BaseScene {
  /** 标题文字对象 */
  private _titleText!: Phaser.GameObjects.Text;
  /** 按钮列表 */
  private _menuButtons: InkButton[] = [];
  /** 粒子管理器 */
  private _particleEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  /** 关于面板 */
  private _aboutPanel?: InkPanel;
  /** 设置面板 */
  private _settingsPanel?: InkPanel;
  /** 世界观说明面板 */
  private _worldViewPanel?: InkPanel;
  /** 角色创建面板 */
  private _charCreationPanel?: InkPanel;
  /** 角色创建步骤 0=职业 1=天赋 2=出生点 */
  private _creationStep = 0;
  /** 角色创建状态 */
  private _creationState: CreationState = {
    profession: '',
    talent: '',
    birthPlace: '',
  };
  /** 随机roll出的天赋 */
  private _rolledTalents: TalentConfig[] = [];
  /** 创建面板内容容器 */
  private _creationContent?: Phaser.GameObjects.Container;
  /** 创建面板导航按钮 */
  private _creationNavBtns: InkButton[] = [];
  /** 步骤标题文字 */
  private _stepTitleText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  create(): void {
    super.create();

    this._createBackground();
    this._createParticles();
    this._createTitle();
    this._createMenuButtons();
    this._createVersionInfo();
    this._playEntryAnimation();
  }

  // ==========================================================================
  // 背景
  // ==========================================================================

  private _createBackground(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 深青色渐变背景
    const bg = this.add.graphics();
    for (let y = 0; y < h; y++) {
      const ratio = y / h;
      const r = Math.round(10 + ratio * 10);
      const g = Math.round(26 + ratio * 16);
      const b = Math.round(10 + ratio * 16);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      bg.fillRect(0, y, w, 1);
    }

    // 四角暗角效果
    const corners = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: 0, y: h },
      { x: w, y: h },
    ];
    for (const c of corners) {
      const cornerGrad = this.add.graphics();
      for (let i = 0; i < 200; i++) {
        const alpha = 0.4 * (1 - i / 200);
        cornerGrad.fillStyle(0x000000, alpha);
        cornerGrad.fillCircle(c.x, c.y, i * 2);
      }
    }
  }

  // ==========================================================================
  // 粒子装饰
  // ==========================================================================

  private _createParticles(): void {
    const particleGfx = this.make.graphics({ x: 0, y: 0, add: false });
    particleGfx.fillStyle(0x88ccaa, 1);
    particleGfx.fillCircle(8, 8, 6);
    particleGfx.generateTexture('spirit_particle', 16, 16);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const particles = this.add.particles(0, 0, 'spirit_particle', {
      x: { min: 0, max: w },
      y: { min: h * 0.6, max: h },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: -15, max: -5 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.3, max: 0.8 },
      alpha: { start: 0.15, end: 0 },
      quantity: 1,
      frequency: 800,
      blendMode: Phaser.BlendModes.ADD,
    });

    this._particleEmitter = particles;
  }

  // ==========================================================================
  // 标题
  // ==========================================================================

  private _createTitle(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height * 0.3;

    this._titleText = this.add.text(centerX, centerY, '问道长生', {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '64px',
      color: '#4A6741',
      stroke: '#D4AF37',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 8,
        stroke: true,
        fill: true,
      },
    });
    this._titleText.setOrigin(0.5);

    const subtitle = this.add.text(centerX, centerY + 50, '—— 修仙问道，长生可期 ——', {
      fontFamily: '"Microsoft YaHei", "KaiTi", serif',
      fontSize: '18px',
      color: '#888888',
    });
    subtitle.setOrigin(0.5);

    this.tweens.add({
      targets: this._titleText,
      alpha: { from: 1, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ==========================================================================
  // 菜单按钮
  // ==========================================================================

  private _createMenuButtons(): void {
    const centerX = this.cameras.main.width / 2;
    const startY = this.cameras.main.height * 0.55;
    const gap = 65;

    const menuItems: { text: string; onClick: () => void }[] = [
      {
        text: '新的开始',
        onClick: () => this._onNewGame(),
      },
      {
        text: '继续修仙',
        onClick: () => this._onContinue(),
      },
      {
        text: '设置',
        onClick: () => this._onSettings(),
      },
      {
        text: '关于',
        onClick: () => this._onAbout(),
      },
    ];

    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      const btn = this.createInkButton(centerX, startY + i * gap, {
        text: item.text,
        width: 200,
        height: 52,
        fontSize: 22,
      });
      btn.onClick(item.onClick);
      this._menuButtons.push(btn);
    }
  }

  // ==========================================================================
  // 版本信息
  // ==========================================================================

  private _createVersionInfo(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const versionText = this.add.text(w / 2, h - 32, 'v2.0.0', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#555555',
    });
    versionText.setOrigin(0.5);

    const engineText = this.add.text(w / 2, h - 14, '基于 Phaser 3 重构', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '11px',
      color: '#444444',
    });
    engineText.setOrigin(0.5);
  }

  // ==========================================================================
  // 入场动画
  // ==========================================================================

  private _playEntryAnimation(): void {
    const titleY = this._titleText.y;
    this._titleText.y -= 80;
    this._titleText.setAlpha(0);

    this.tweens.add({
      targets: this._titleText,
      y: titleY,
      alpha: 1,
      duration: 800,
      ease: 'Cubic.easeOut',
    });

    for (let i = 0; i < this._menuButtons.length; i++) {
      const btn = this._menuButtons[i];
      const originalY = btn.y;
      btn.y += 40;
      btn.setAlpha(0);
      btn.setScale(0.9);

      this.tweens.add({
        targets: btn,
        y: originalY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        delay: 300 + i * 150,
        ease: 'Back.easeOut',
      });
    }
  }

  // ==========================================================================
  // 按钮回调
  // ==========================================================================

  /** 新游戏 */
  private _onNewGame(): void {
    gameState.resetToNewGame();
    this.switchScene('MapScene');
  }

  /** 继续游戏 */
  private _onContinue(): void {
    const saveData = saveManager.load(0);
    if (saveData) {
      console.log('[MainMenuScene] 已加载存档');
      this._enterGameWorld();
    } else {
      this._showNoSaveAlert();
    }
  }

  /** 进入游戏世界 */
  private _enterGameWorld(): void {
    saveManager.startAutoSave();
    this.switchScene('MapScene');
  }

  /** 设置 */
  private _onSettings(): void {
    if (!this._settingsPanel) {
      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      this._settingsPanel = this.createInkPanel(w / 2, h / 2, {
        width: 360,
        height: 280,
        title: '游戏设置',
        showOverlay: true,
        closeOnOverlay: true,
      });

      const settingsLabels = [
        '背景音乐音量：开发中',
        '音效音量：开发中',
        '自动保存：已开启',
        '文字速度：开发中',
      ];
      for (let i = 0; i < settingsLabels.length; i++) {
        const label = this.add.text(0, -60 + i * 40, settingsLabels[i], {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '15px',
          color: '#CCCCCC',
        });
        label.setOrigin(0.5);
        this._settingsPanel.add(label);
      }
    }
    this._settingsPanel.show();
  }

  /** 关于 */
  private _onAbout(): void {
    if (!this._aboutPanel) {
      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      this._aboutPanel = this.createInkPanel(w / 2, h / 2, {
        width: 380,
        height: 240,
        title: '关于',
        showOverlay: true,
        closeOnOverlay: true,
      });

      const aboutContent = [
        '《问道长生》v2.0.0',
        '',
        'Phaser 3 重构版',
        '水墨国风修仙放置游戏',
        '',
        '© 2024-2025 问道长生开发组',
      ];

      for (let i = 0; i < aboutContent.length; i++) {
        const isTitle = i === 0;
        const text = this.add.text(0, -50 + i * 28, aboutContent[i], {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: isTitle ? '18px' : '14px',
          color: isTitle ? '#D4AF37' : '#AAAAAA',
          align: 'center',
        });
        text.setOrigin(0.5);
        this._aboutPanel.add(text);
      }
    }
    this._aboutPanel.show();
  }

  /** 无存档提示 */
  private _showNoSaveAlert(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const alertPanel = this.createInkPanel(w / 2, h / 2, {
      width: 300,
      height: 140,
      title: '提示',
      showOverlay: true,
      closeOnOverlay: true,
    });

    const msg = this.add.text(0, -10, '暂无存档，请先开始新游戏', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#CCCCCC',
    });
    msg.setOrigin(0.5);
    alertPanel.add(msg);

    alertPanel.show();
  }

  // ==========================================================================
  // A. 世界观说明界面
  // ==========================================================================

  private _showWorldViewPanel(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (!this._worldViewPanel) {
      this._worldViewPanel = this.createInkPanel(w / 2, h / 2, {
        width: Math.min(720, w - 40),
        height: Math.min(520, h - 60),
        title: '问道长生',
        showOverlay: true,
        closeOnOverlay: false,
        animate: true,
      });

      // 世界观正文
      const worldText =
        '八荒世界，浩瀚无垠。\n\n' +
        '东荒剑气冲霄，南疆毒瘴密布，\n' +
        '西漠金沙万里，北原玄冰封天。\n' +
        '东南海域万岛林立，西南蛮荒妖兽横行，\n' +
        '东北雪原佛音回荡，西北荒漠丹霞映日。\n' +
        '中央域道统正宗，坤元域仙踪缥缈。\n\n' +
        '十大域各自为政，宗门林立，妖兽横行。\n' +
        '凡人欲求长生，需引灵气入体，\n' +
        '历经炼气、筑基、金丹、元婴……\n' +
        '直至渡劫飞升。\n\n' +
        '然天道无情，寿元有尽，机缘难觅。\n' +
        '你，一个来自尘世的凡人，\n' +
        '即将踏上这条逆天改命之路。\n\n' +
        '问道长生，自此而始。';

      const contentText = this.add.text(0, -20, worldText, {
        fontFamily: '"Microsoft YaHei", "KaiTi", serif',
        fontSize: '16px',
        color: '#CCCCCC',
        align: 'center',
      });
      contentText.setOrigin(0.5);
      this._worldViewPanel.add(contentText);

      // 继续按钮
      const continueBtn = this.createInkButton(0, this._worldViewPanel.contentHeight / 2 - 30, {
        text: '继续',
        width: 140,
        height: 48,
        fontSize: 18,
      });
      continueBtn.onClick(() => {
        this._worldViewPanel?.hide();
        this._showCharacterCreation();
      });
      this._worldViewPanel.add(continueBtn);
    }

    this._worldViewPanel.show();
  }

  // ==========================================================================
  // B. 角色创建界面
  // ==========================================================================

  private _showCharacterCreation(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (!this._charCreationPanel) {
      this._charCreationPanel = this.createInkPanel(w / 2, h / 2, {
        width: Math.min(800, w - 32),
        height: Math.min(560, h - 48),
        title: '角色创建',
        showOverlay: true,
        closeOnOverlay: false,
        animate: true,
      });

      // 步骤标题
      this._stepTitleText = this.add.text(0, -this._charCreationPanel.contentHeight / 2 + 16, '', {
        fontFamily: '"Microsoft YaHei", "SimHei", serif',
        fontSize: '18px',
        color: '#D4AF37',
        align: 'center',
      });
      this._stepTitleText.setOrigin(0.5);
      this._charCreationPanel.add(this._stepTitleText);
    }

    // 初始化创建状态
    this._creationStep = 0;
    this._creationState = {
      profession: PROFESSIONS[0].id,
      talent: '',
      birthPlace: BIRTH_PLACES[8].id, // 道源城
    };
    this._rolledTalents = rollTalents(3);
    if (this._rolledTalents.length > 0) {
      this._creationState.talent = this._rolledTalents[0].id;
    }

    this._refreshCreationStep();
    this._charCreationPanel.show();
  }

  /** 刷新当前创建步骤的UI */
  private _refreshCreationStep(): void {
    // 清理旧内容
    if (this._creationContent) {
      this._creationContent.destroy();
      this._creationContent = undefined;
    }
    for (const btn of this._creationNavBtns) {
      btn.destroy();
    }
    this._creationNavBtns = [];

    // 更新步骤标题
    const stepNames = ['选择职业', '选择天赋', '选择出生地'];
    if (this._stepTitleText) {
      this._stepTitleText.setText(`${stepNames[this._creationStep]} (${this._creationStep + 1}/3)`);
    }

    // 创建新内容
    this._creationContent = this.add.container(0, 0);
    this._charCreationPanel?.add(this._creationContent);

    switch (this._creationStep) {
      case 0:
        this._buildProfessionStep();
        break;
      case 1:
        this._buildTalentStep();
        break;
      case 2:
        this._buildBirthPlaceStep();
        break;
    }

    this._buildCreationNavButtons();
  }

  /** 构建步骤导航按钮 */
  private _buildCreationNavButtons(): void {
    const panel = this._charCreationPanel!;
    const bottomY = panel.contentHeight / 2 - 28;

    if (this._creationStep > 0) {
      const prevBtn = this.createInkButton(-100, bottomY, {
        text: '上一步',
        width: 110,
        height: 44,
        fontSize: 16,
      });
      prevBtn.onClick(() => {
        this._creationStep--;
        this._refreshCreationStep();
      });
      this._creationNavBtns.push(prevBtn);
      this._creationContent?.add(prevBtn);
    }

    if (this._creationStep < 2) {
      const nextBtn = this.createInkButton(100, bottomY, {
        text: '下一步',
        width: 110,
        height: 44,
        fontSize: 16,
      });
      nextBtn.onClick(() => {
        this._creationStep++;
        this._refreshCreationStep();
      });
      this._creationNavBtns.push(nextBtn);
      this._creationContent?.add(nextBtn);
    } else {
      const confirmBtn = this.createInkButton(100, bottomY, {
        text: '确认并开始修仙',
        width: 160,
        height: 44,
        fontSize: 16,
      });
      confirmBtn.onClick(() => this._onConfirmCreation());
      this._creationNavBtns.push(confirmBtn);
      this._creationContent?.add(confirmBtn);
    }
  }

  // ==========================================================================
  // 步骤1: 职业选择
  // ==========================================================================

  private _buildProfessionStep(): void {
    const cardWidth = 150;
    const cardHeight = 200;
    const gap = 16;
    const totalWidth = PROFESSIONS.length * cardWidth + (PROFESSIONS.length - 1) * gap;
    const startX = -totalWidth / 2 + cardWidth / 2;
    const y = 10;

    for (let i = 0; i < PROFESSIONS.length; i++) {
      const prof = PROFESSIONS[i];
      const x = startX + i * (cardWidth + gap);
      const card = this._createProfessionCard(x, y, cardWidth, cardHeight, prof);
      this._creationContent?.add(card);
    }
  }

  private _createProfessionCard(
    x: number,
    y: number,
    w: number,
    h: number,
    prof: ProfessionConfig
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isSelected = this._creationState.profession === prof.id;

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.primary, 0.6);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(bg);

    // 选中高亮边框
    if (isSelected) {
      const border = this.add.graphics();
      border.lineStyle(2, INK_COLORS.gold, 0.9);
      border.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
      container.add(border);
    }

    // 图标
    const icon = this.add.text(0, -h / 2 + 30, prof.icon, {
      fontSize: '32px',
    });
    icon.setOrigin(0.5);
    container.add(icon);

    // 名称
    const name = this.add.text(0, -h / 2 + 64, prof.name, {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '18px',
      color: '#F5F5DC',
    });
    name.setOrigin(0.5);
    container.add(name);

    // 描述
    const desc = this.add.text(0, -h / 2 + 96, prof.description, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#AAAAAA',
      align: 'center',
      wordWrap: { width: w - 16 },
    });
    desc.setOrigin(0.5, 0);
    container.add(desc);

    // 加成
    const bonusTexts: string[] = [];
    for (const [key, val] of Object.entries(prof.bonuses)) {
      const label = this._getBonusLabel(key);
      bonusTexts.push(`${label} +${Math.round(val * 100)}%`);
    }
    const bonus = this.add.text(0, h / 2 - 40, bonusTexts.join('\n'), {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#D4AF37',
      align: 'center',
    });
    bonus.setOrigin(0.5);
    container.add(bonus);

    // 点击交互
    const hitZone = this.add.zone(0, 0, w, h);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this._creationState.profession = prof.id;
      this._refreshCreationStep();
    });

    return container;
  }

  private _getBonusLabel(key: string): string {
    const map: Record<string, string> = {
      critRate: '暴击率',
      defenseBreak: '破防',
      maxHp: '生命上限',
      defense: '防御',
      maxMp: '法力上限',
      cultivationSpeed: '修炼速度',
      speed: '速度',
      controlHit: '控制命中',
    };
    return map[key] ?? key;
  }

  // ==========================================================================
  // 步骤2: 天赋选择
  // ==========================================================================

  private _buildTalentStep(): void {
    const cardWidth = 200;
    const cardHeight = 200;
    const gap = 20;
    const totalWidth = this._rolledTalents.length * cardWidth + (this._rolledTalents.length - 1) * gap;
    const startX = -totalWidth / 2 + cardWidth / 2;
    const y = 10;

    for (let i = 0; i < this._rolledTalents.length; i++) {
      const talent = this._rolledTalents[i];
      const x = startX + i * (cardWidth + gap);
      const card = this._createTalentCard(x, y, cardWidth, cardHeight, talent);
      this._creationContent?.add(card);
    }

    // 重roll按钮
    const rerollBtn = this.createInkButton(0, y + cardHeight / 2 + 30, {
      text: '重新随机',
      width: 120,
      height: 40,
      fontSize: 14,
    });
    rerollBtn.onClick(() => {
      this._rolledTalents = rollTalents(3);
      this._creationState.talent = this._rolledTalents[0]?.id ?? '';
      this._refreshCreationStep();
    });
    this._creationNavBtns.push(rerollBtn);
    this._creationContent?.add(rerollBtn);
  }

  private _createTalentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    talent: TalentConfig
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isSelected = this._creationState.talent === talent.id;
    const rarityColor = TALENT_RARITY_COLORS[talent.rarity];

    // 背景（稀有度颜色作为边框）
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.primary, 0.5);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(bg);

    // 稀有度边框
    const borderColor = parseInt(rarityColor.replace('#', ''), 16);
    const border = this.add.graphics();
    border.lineStyle(isSelected ? 3 : 1.5, borderColor, isSelected ? 1 : 0.6);
    border.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(border);

    // 稀有度标签
    const rarityLabel = this.add.text(0, -h / 2 + 18, `[${TALENT_RARITY_NAMES[talent.rarity]}]`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: rarityColor,
    });
    rarityLabel.setOrigin(0.5);
    container.add(rarityLabel);

    // 名称
    const name = this.add.text(0, -h / 2 + 42, talent.name, {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '18px',
      color: '#F5F5DC',
    });
    name.setOrigin(0.5);
    container.add(name);

    // 描述
    const desc = this.add.text(0, -h / 2 + 70, talent.description, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#CCCCCC',
      align: 'center',
      wordWrap: { width: w - 20 },
    });
    desc.setOrigin(0.5, 0);
    container.add(desc);

    // 选中标记
    if (isSelected) {
      const check = this.add.text(0, h / 2 - 24, '✓ 已选中', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#D4AF37',
      });
      check.setOrigin(0.5);
      container.add(check);
    }

    // 点击交互
    const hitZone = this.add.zone(0, 0, w, h);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this._creationState.talent = talent.id;
      this._refreshCreationStep();
    });

    return container;
  }

  // ==========================================================================
  // 步骤3: 出生地点选择
  // ==========================================================================

  private _buildBirthPlaceStep(): void {
    const cols = 5;
    const cardWidth = 130;
    const cardHeight = 110;
    const gapX = 14;
    const gapY = 14;
    const rows = Math.ceil(BIRTH_PLACES.length / cols);
    const totalWidth = cols * cardWidth + (cols - 1) * gapX;
    const totalHeight = rows * cardHeight + (rows - 1) * gapY;
    const startX = -totalWidth / 2 + cardWidth / 2;
    const startY = -totalHeight / 2 + cardHeight / 2 - 10;

    for (let i = 0; i < BIRTH_PLACES.length; i++) {
      const place = BIRTH_PLACES[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const card = this._createBirthPlaceCard(x, y, cardWidth, cardHeight, place);
      this._creationContent?.add(card);
    }
  }

  private _createBirthPlaceCard(
    x: number,
    y: number,
    w: number,
    h: number,
    place: BirthPlaceConfig
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isSelected = this._creationState.birthPlace === place.id;
    const domain = getWorldDomainConfig(place.region);
    const domainColor = domain ? domain.color : INK_COLORS.ivory;

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.primary, 0.5);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    // 选中高亮
    if (isSelected) {
      const selBorder = this.add.graphics();
      selBorder.lineStyle(2, INK_COLORS.gold, 0.9);
      selBorder.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      container.add(selBorder);
    }

    // 大域颜色条
    const colorBar = this.add.graphics();
    colorBar.fillStyle(domainColor, 0.85);
    colorBar.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, 4, h - 8, 2);
    container.add(colorBar);

    // 名称
    const name = this.add.text(0, -h / 2 + 18, place.name, {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '15px',
      color: '#F5F5DC',
    });
    name.setOrigin(0.5);
    container.add(name);

    // 所属大域
    const domainName = this.add.text(0, -h / 2 + 36, domain?.name ?? place.region, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '11px',
      color: '#999999',
    });
    domainName.setOrigin(0.5);
    container.add(domainName);

    // 描述
    const desc = this.add.text(0, -h / 2 + 52, place.description, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '10px',
      color: '#AAAAAA',
      align: 'center',
      wordWrap: { width: w - 12 },
    });
    desc.setOrigin(0.5, 0);
    container.add(desc);

    // 起始奖励简述
    const bonus = place.startingBonus;
    let bonusText = '';
    if ('itemId' in bonus && bonus.itemId) {
      bonusText = `奖励: ${bonus.itemId} x${bonus.count ?? 1}`;
    } else if ('comprehension' in bonus) {
      bonusText = `悟性 +${bonus.comprehension}`;
    } else if ('aptitude' in bonus) {
      bonusText = `根骨 +${bonus.aptitude}`;
    } else if ('luck' in bonus) {
      bonusText = `机缘 +${bonus.luck}`;
    } else if ('maxHp' in bonus) {
      bonusText = `生命 +${bonus.maxHp}`;
    } else if ('fiveElements' in bonus) {
      bonusText = '五行灵根+2';
    }

    if (bonusText) {
      const bonusLabel = this.add.text(0, h / 2 - 14, bonusText, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '10px',
        color: '#D4AF37',
      });
      bonusLabel.setOrigin(0.5);
      container.add(bonusLabel);
    }

    // 点击交互
    const hitZone = this.add.zone(0, 0, w, h);
    hitZone.setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this._creationState.birthPlace = place.id;
      this._refreshCreationStep();
    });

    return container;
  }

  // ==========================================================================
  // 确认创建
  // ==========================================================================

  private _onConfirmCreation(): void {
    const { profession, talent, birthPlace } = this._creationState;

    // 创建新玩家数据
    const newPlayer = createNewPlayer({
      name: '无名修士',
      profession,
      talent,
      birthPlace,
    });

    // 重置游戏状态并注入新玩家数据
    gameState.resetToNewGame();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any)._runtimeState.player = newPlayer;

    // 隐藏创建面板
    this._charCreationPanel?.hide();

    // 进入游戏
    this._enterGameWorld();
  }
}
