/**
 * 《问道长生》Phaser 3 重构版 —— 常驻UI层
 * Phase 4: 底部导航改造为3按钮
 *
 * 与 MapScene 并行运行的常驻UI层，负责顶部信息栏、底部导航栏。
 * 底部导航：传音符 / 地图 / 图鉴
 */

import { BaseScene } from './BaseScene';
import { gameState } from '../managers/GameStateManager';
import { eventBus, GameEventType } from '../managers/EventBus';
import { InkButton, InkProgressBar } from '../ui';

/** 底部导航项 */
interface NavItem {
  key: string;
  label: string;
  icon: string;
}

export class UIScene extends BaseScene {
  /** 顶部信息栏容器 */
  private _topBar!: Phaser.GameObjects.Container;
  /** 底部导航栏容器 */
  private _bottomNav!: Phaser.GameObjects.Container;
  /** 修为进度条 */
  private _expBar?: InkProgressBar;
  /** 境界文字 */
  private _realmText?: Phaser.GameObjects.Text;
  /** 时间文字 */
  private _timeText?: Phaser.GameObjects.Text;
  /** 行动力文字 */
  private _actionText?: Phaser.GameObjects.Text;
  /** 导航按钮 */
  private _navButtons: InkButton[] = [];
  /** 当前选中的导航索引 */
  private _selectedNavIndex = -1;
  /** 传音符红点 */
  private _messengerBadge?: Phaser.GameObjects.Graphics;
  /** 未读消息数量文本 */
  private _messengerBadgeText?: Phaser.GameObjects.Text;

  /** 导航项配置 */
  private readonly _navItems: NavItem[] = [
    { key: 'messenger', label: '传音符', icon: '📜' },
    { key: 'map', label: '地图', icon: '🗺️' },
    { key: 'codex', label: '图鉴', icon: '📖' },
  ];

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    super.create();

    this._createTopBar();
    this._createBottomNav();
    this._updateFromState();

    // 监听状态变化
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._updateFromState();
    });
    this.subscribeToEvent(GameEventType.TIME_ADVANCED, () => {
      this._updateFromState();
    });
    this.subscribeToEvent(GameEventType.MESSAGE_RECEIVED, () => {
      this._updateMessengerBadge();
    });

    // 点击顶部头像打开个人面板
    this._setupAvatarClick();
  }

  // ==========================================================================
  // 顶部信息栏
  // ==========================================================================

  private _createTopBar(): void {
    const w = this.cameras.main.width;
    const barHeight = 70;

    this._topBar = this.add.container(0, 0);

    // 背景条
    const bg = this.add.graphics();
    bg.fillStyle(0x0a1a0a, 0.92);
    bg.fillRect(0, 0, w, barHeight);
    bg.lineStyle(1, 0x4A6741, 0.4);
    bg.moveTo(0, barHeight);
    bg.lineTo(w, barHeight);
    bg.strokePath();
    this._topBar.add(bg);

    // 左侧：头像 + 境界 + 修为条
    this._createPlayerInfo(16, 8);

    // 中间：时间 + 行动力
    this._createTimeInfo(w / 2, 10);

    // 右侧：设置按钮
    const settingsBtn = this.createInkButton(w - 40, barHeight / 2, {
      text: '⚙',
      width: 48,
      height: 48,
      fontSize: 22,
    });
    settingsBtn.onClick(() => {
      this._openSettingsPanel();
    });
    this._topBar.add(settingsBtn);
  }

  private _createPlayerInfo(x: number, y: number): void {
    // 头像圆形（可点击）
    const avatar = this.add.graphics();
    avatar.fillStyle(0x4A6741, 1);
    avatar.fillCircle(x + 22, y + 22, 22);
    avatar.lineStyle(2, 0xD4AF37, 0.6);
    avatar.strokeCircle(x + 22, y + 22, 22);
    this._topBar.add(avatar);

    // 头像文字
    const avatarText = this.add.text(x + 22, y + 22, '修', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#F5F5DC',
    });
    avatarText.setOrigin(0.5);
    this._topBar.add(avatarText);

    // 境界文字
    this._realmText = this.add.text(x + 56, y + 6, '炼气初期', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#D4AF37',
    });
    this._topBar.add(this._realmText);

    // 修为进度条
    this._expBar = new InkProgressBar(this, x + 130, y + 24, {
      width: 140,
      height: 14,
      type: 'cultivation',
      showText: true,
      textFormat: 'percent',
    });
    this._topBar.add(this._expBar);
  }

  private _setupAvatarClick(): void {
    // 头像点击区域
    const hitZone = this.add.zone(38, 30, 60, 60);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.launch('PersonalScene');
    });
    this._topBar.add(hitZone);
  }

  private _createTimeInfo(cx: number, y: number): void {
    // 游戏时间
    this._timeText = this.add.text(cx, y + 4, '修真历 1年 1月', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#CCCCCC',
    });
    this._timeText.setOrigin(0.5, 0);
    this._topBar.add(this._timeText);

    // 行动力
    this._actionText = this.add.text(cx, y + 28, '行动力：10/10', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#88ccaa',
    });
    this._actionText.setOrigin(0.5, 0);
    this._topBar.add(this._actionText);
  }

  // ==========================================================================
  // 底部导航栏（3按钮）
  // ==========================================================================

  private _createBottomNav(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const navHeight = 72;
    const btnSize = 64;
    const gap = (w - btnSize * this._navItems.length) / (this._navItems.length + 1);

    this._bottomNav = this.add.container(0, h - navHeight);

    // 弧形背景
    const bg = this.add.graphics();
    bg.fillStyle(0x0a1a0a, 0.95);
    bg.fillRoundedRect(0, 8, w, navHeight - 8, { tl: 20, tr: 20, bl: 0, br: 0 });
    bg.lineStyle(1, 0x4A6741, 0.4);
    bg.strokeRoundedRect(0, 8, w, navHeight - 8, { tl: 20, tr: 20, bl: 0, br: 0 });
    this._bottomNav.add(bg);

    // 导航按钮
    for (let i = 0; i < this._navItems.length; i++) {
      const item = this._navItems[i];
      const bx = gap + i * (btnSize + gap) + btnSize / 2;
      const by = navHeight / 2 + 4;

      const btn = this.createInkButton(bx, by, {
        text: item.icon,
        width: btnSize,
        height: btnSize,
        fontSize: 24,
      });

      btn.onClick(() => this._onNavClick(i, item.key));
      this._navButtons.push(btn);
      this._bottomNav.add(btn);

      // 标签文字
      const label = this.add.text(bx, by + 32, item.label, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: '#888888',
      });
      label.setOrigin(0.5);
      this._bottomNav.add(label);

      // 传音符红点
      if (item.key === 'messenger') {
        this._messengerBadge = this.add.graphics();
        this._messengerBadge.fillStyle(0xFF4444, 1);
        this._messengerBadge.fillCircle(bx + 22, by - 22, 8);
        this._messengerBadge.setVisible(false);
        this._bottomNav.add(this._messengerBadge);

        this._messengerBadgeText = this.add.text(bx + 22, by - 22, '', {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '9px',
          color: '#FFFFFF',
        });
        this._messengerBadgeText.setOrigin(0.5);
        this._messengerBadgeText.setVisible(false);
        this._bottomNav.add(this._messengerBadgeText);
      }
    }
  }

  private _onNavClick(index: number, key: string): void {
    // 取消之前的选中
    if (this._selectedNavIndex >= 0 && this._selectedNavIndex < this._navButtons.length) {
      const prevBtn = this._navButtons[this._selectedNavIndex];
      this.tweens.add({
        targets: prevBtn,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }

    // 如果点击已选中，则关闭（地图除外，地图是切换场景不是面板）
    if (this._selectedNavIndex === index && key !== 'map') {
      this._selectedNavIndex = -1;
      this.scene.stop(this._getPanelSceneKey(key));
      return;
    }

    this._selectedNavIndex = index;

    // 放大+发光效果
    const btn = this._navButtons[index];
    this.tweens.add({
      targets: btn,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 150,
      ease: 'Back.easeOut',
    });

    // 发射面板打开事件
    eventBus.emit(GameEventType.UI_PANEL_OPENED, { panel: key });

    // 处理导航
    if (key === 'map') {
      // 切换到地图场景
      if (!this.scene.isActive('MapScene')) {
        this.scene.start('MapScene');
      }
      return;
    }

    // 先停止其他面板
    for (const item of this._navItems) {
      if (item.key !== key && item.key !== 'map') {
        this.scene.stop(this._getPanelSceneKey(item.key));
      }
    }

    // 启动对应面板场景
    const panelScene = this._getPanelSceneKey(key);
    if (!this.scene.get(panelScene)) {
      console.warn(`[UIScene] 面板场景 ${panelScene} 未注册`);
      return;
    }
    this.scene.launch(panelScene);
  }

  private _getPanelSceneKey(navKey: string): string {
    const mapping: Record<string, string> = {
      messenger: 'MessengerScene',
      map: 'MapScene',
      codex: 'CodexScene',
    };
    return mapping[navKey] ?? navKey;
  }

  private _updateMessengerBadge(): void {
    const count = gameState.getUnreadMessageCount();
    if (this._messengerBadge && this._messengerBadgeText) {
      if (count > 0) {
        this._messengerBadge.setVisible(true);
        this._messengerBadgeText.setVisible(true);
        this._messengerBadgeText.setText(count > 9 ? '9+' : `${count}`);
      } else {
        this._messengerBadge.setVisible(false);
        this._messengerBadgeText.setVisible(false);
      }
    }
  }

  /** 打开设置面板 */
  private _openSettingsPanel(): void {
    eventBus.emit(GameEventType.UI_PANEL_OPENED, { panel: 'settings' });
    this.scene.launch('SettingsScene');
  }

  // ==========================================================================
  // 状态更新
  // ==========================================================================

  private _updateFromState(): void {
    const player = gameState.getPlayerSnapshot();
    const time = gameState.getTimeSnapshot();

    // 境界显示
    const realmNames: Record<string, string> = {
      lianqi: '炼气',
      zhuji: '筑基',
      jindan: '金丹',
      yuanying: '元婴',
      huashen: '化神',
      lianxu: '炼虚',
      heti: '合体',
      dacheng: '大乘',
      dujie: '渡劫',
    };
    const stageNames = ['初期', '中期', '后期', '圆满'];
    const realmName = realmNames[player.cultivation.realm] ?? player.cultivation.realm;
    const stageName = stageNames[player.cultivation.stage] ?? '';
    this._realmText?.setText(`${realmName}${stageName}`);

    // 修为条
    this._expBar?.setValue(player.cultivation.exp, player.cultivation.expMax);

    // 时间
    this._timeText?.setText(`修真历 ${time.year}年 ${time.month}月`);

    // 行动力
    this._actionText?.setText(`行动力：${time.actionPoints}/${time.actionPointsMax}`);

    // 更新红点
    this._updateMessengerBadge();
  }
}
