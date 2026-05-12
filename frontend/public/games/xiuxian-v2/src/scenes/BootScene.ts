/**
 * 《问道长生》Phaser 3 重构版 —— 引导场景
 * Phase 2A: 场景框架
 *
 * 负责资源预加载、初始化游戏系统、显示加载进度，完成后进入主菜单。
 */

import { BaseScene } from './BaseScene';
import { gameState } from '../managers/GameStateManager';
import { audioManager } from '../managers/AudioManager';
import { eventBus, GameEventType } from '../managers/EventBus';

const XIUXIAN_V2_ASSET_BASE = '/games/xiuxian-v2/assets/';

/** 资源定义 */
interface AssetDef {
  key: string;
  path: string;
  type: 'image' | 'svg' | 'audio';
}

export class BootScene extends BaseScene {
  private _progressBar!: Phaser.GameObjects.Graphics;
  private _progressText!: Phaser.GameObjects.Text;
  private _loadingText!: Phaser.GameObjects.Text;

  /** 需要预加载的资源列表 */
  private _assets: AssetDef[] = [
    // 十域地图资源 (.webp 最大压缩)
    { key: 'world_ten_domains', path: `${XIUXIAN_V2_ASSET_BASE}maps/world/ten_domains.webp`, type: 'image' },
    { key: 'region_central', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/central.webp`, type: 'image' },
    { key: 'region_kunyuan', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/kunyuan.webp`, type: 'image' },
    { key: 'region_north', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/north.webp`, type: 'image' },
    { key: 'region_south', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/south.webp`, type: 'image' },
    { key: 'region_east', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/east.webp`, type: 'image' },
    { key: 'region_west', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/west.webp`, type: 'image' },
    { key: 'region_northeast', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/northeast.webp`, type: 'image' },
    { key: 'region_southeast', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/southeast.webp`, type: 'image' },
    { key: 'region_southwest', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/southwest.webp`, type: 'image' },
    { key: 'region_northwest', path: `${XIUXIAN_V2_ASSET_BASE}maps/regions/northwest.webp`, type: 'image' },

    // 地点节点资源
    { key: 'map_node_city', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/city.webp`, type: 'image' },
    { key: 'map_node_sect', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/sect.webp`, type: 'image' },
    { key: 'map_node_market', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/market.webp`, type: 'image' },
    { key: 'map_node_ruins', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/ruins.webp`, type: 'image' },
    { key: 'map_node_cave', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/cave.webp`, type: 'image' },
    { key: 'map_node_island', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/island.webp`, type: 'image' },
    { key: 'map_node_trial', path: `${XIUXIAN_V2_ASSET_BASE}map-nodes/trial.webp`, type: 'image' },
  ];

  constructor() {
    super({ key: 'BootScene' });
  }

  // ==========================================================================
  // 预加载
  // ==========================================================================

  preload(): void {
    this._createLoadingUI();
    this._registerLoadEvents();
    this._loadAssets();
  }

  private _createLoadingUI(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // 游戏标题
    const titleStyle: Phaser.Types.GameObjects.TextStyle = {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '42px',
      color: '#F5F5DC',
      align: 'center',
    };
    const title = this.add.text(centerX, centerY - 120, '问道长生', titleStyle);
    title.setOrigin(0.5);

    // 副标题
    const subtitle = this.add.text(centerX, centerY - 60, 'Phaser 3 重构版', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#888888',
    });
    subtitle.setOrigin(0.5);

    // 加载提示
    this._loadingText = this.add.text(centerX, centerY + 20, '正在加载资源...', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    this._loadingText.setOrigin(0.5);

    // 进度条背景
    const barWidth = 400;
    const barHeight = 8;
    const barY = centerY + 60;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x333333, 0.6);
    barBg.fillRoundedRect(centerX - barWidth / 2, barY, barWidth, barHeight, 4);

    // 进度条
    this._progressBar = this.add.graphics();

    // 进度百分比文字
    this._progressText = this.add.text(centerX, barY + 24, '0%', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#888888',
    });
    this._progressText.setOrigin(0.5);
  }

  private _registerLoadEvents(): void {
    this.load.on('progress', (value: number) => {
      const pct = Math.round(value * 100);
      this._progressText.setText(`${pct}%`);

      const centerX = this.cameras.main.width / 2;
      const barY = this.cameras.main.height / 2 + 60;
      const barWidth = 400;
      const barHeight = 8;

      this._progressBar.clear();
      this._progressBar.fillStyle(0x4A6741, 0.9);
      this._progressBar.fillRoundedRect(
        centerX - barWidth / 2,
        barY,
        barWidth * value,
        barHeight,
        4
      );
    });

    this.load.on('complete', () => {
      this._loadingText.setText('加载完成');
      this._progressText.setText('100%');
    });

    this.load.on('loaderror', (file: unknown) => {
      console.warn('[BootScene] 资源加载失败:', file);
    });
  }

  private _loadAssets(): void {
    for (const asset of this._assets) {
      switch (asset.type) {
        case 'image':
          this.load.image(asset.key, asset.path);
          break;
        case 'svg':
          this.load.svg(asset.key, asset.path);
          break;
        case 'audio':
          this.load.audio(asset.key, asset.path);
          break;
      }
    }
  }

  // ==========================================================================
  // 创建
  // ==========================================================================

  create(): void {
    super.create();

    // 初始化音频管理器（需在用户交互后才能真正播放）
    audioManager.init();

    // 初始化游戏状态（新游戏或加载存档）
    this._initializeGameState();

    // 显示版本信息
    this._showVersionInfo();

    // 延迟进入主菜单（让用户看到加载完成）
    this.time.delayedCall(800, () => {
      this._enterMainMenu();
    });
  }

  private _initializeGameState(): void {
    // 尝试加载存档，无存档则使用默认状态
    try {
      const saveData = localStorage.getItem('xiuxian_v2_save_slot_0');
      if (saveData) {
        gameState.deserialize(saveData);
        console.log('[BootScene] 已加载存档');
      } else {
        gameState.resetToNewGame();
        console.log('[BootScene] 新游戏状态已初始化');
      }
    } catch (error) {
      console.warn('[BootScene] 存档加载失败，使用默认状态:', error);
      gameState.resetToNewGame();
    }
  }

  private _showVersionInfo(): void {
    const versionText = this.add.text(
      this.cameras.main.width - 12,
      this.cameras.main.height - 12,
      'v2.0.0-alpha',
      {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: '#555555',
      }
    );
    versionText.setOrigin(1, 1);
  }

  private _enterMainMenu(): void {
    // 发射启动完成事件
    eventBus.emit(GameEventType.SAVE_COMPLETED, { slot: 0, success: true });

    // 直接进入地图场景（调试模式）
    this.scene.start('MapScene');
  }

  // ==========================================================================
  // 占位主菜单（Phase 2A 临时）
  // ==========================================================================

  private _showPlaceholderMenu(): void {
    // 淡入过渡
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // 清除加载UI
    this._progressBar.destroy();
    this._progressText.destroy();
    this._loadingText.destroy();

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d0d, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    // 标题
    const title = this.add.text(centerX, centerY - 100, '问道长生', {
      fontFamily: '"Microsoft YaHei", "SimHei", serif',
      fontSize: '52px',
      color: '#F5F5DC',
    });
    title.setOrigin(0.5);

    // 使用 InkButton 创建菜单按钮
    const btnStart = this.createInkButton(centerX, centerY, {
      text: '开始修炼',
      width: 180,
      height: 50,
    });
    btnStart.onClick(() => {
      console.log('[BootScene] 开始修炼 - 功能开发中');
    });

    const btnContinue = this.createInkButton(centerX, centerY + 70, {
      text: '继续游戏',
      width: 180,
      height: 50,
    });
    btnContinue.onClick(() => {
      console.log('[BootScene] 继续游戏 - 功能开发中');
    });

    const btnSettings = this.createInkButton(centerX, centerY + 140, {
      text: '设置',
      width: 180,
      height: 50,
    });
    btnSettings.onClick(() => {
      console.log('[BootScene] 设置 - 功能开发中');
    });

    // 入场动画
    const elements = [title, btnStart, btnContinue, btnSettings];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const originalY = el.y;
      el.y += 30;
      el.setAlpha(0);
      this.tweens.add({
        targets: el,
        alpha: 1,
        y: originalY,
        duration: 500,
        ease: 'Cubic.easeOut',
        delay: i * 100,
      });
    }
  }
}
