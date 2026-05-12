/**
 * 《问道长生》Phaser 3 重构版 —— 设置界面面板
 * Phase 3D: 功能面板实现
 *
 * 音频设置、游戏设置、存档管理、重新开始
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { InkProgressBar } from '../../ui';
import { INK_COLORS } from '../../ui/InkPanel';
import { AudioManager } from '../../managers/AudioManager';
import type { GameSettings } from '../../types';

/** 难度选项 */
const DIFFICULTIES = [
  { id: 'easy', name: '简单' },
  { id: 'normal', name: '普通' },
  { id: 'hard', name: '困难' },
];

export class SettingsScene extends BaseScene {
  private _gsm!: GameStateManager;
  private _settings!: GameSettings;
  private _audioMgr!: AudioManager;

  // UI 引用
  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;
  private _volumeBars: InkProgressBar[] = [];
  private _difficultyBtns: ReturnType<BaseScene['createInkButton']>[] = [];
  private _toggleBtns: { id: string; btn: ReturnType<BaseScene['createInkButton']> }[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();
    this._audioMgr = AudioManager.getInstance();
    this._settings = { ...(this._gsm.settings as GameSettings) };

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 全屏面板
    this._mainPanel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.9,
      height: h * 0.88,
      title: '设置',
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

  private _subscribeEvents(): void {
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._settings = { ...(this._gsm.settings as GameSettings) };
      this._refreshUI();
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

    let y = contentY + 16;

    // ---- 音频设置区域 ----
    y = this._buildSectionTitle(0, y, '音频设置', pw);
    y += 8;

    // 主音量
    y = this._buildVolumeSlider(0, y, pw, '主音量', this._settings.masterVolume, (v) => {
      this._settings = { ...this._settings, masterVolume: v };
      this._audioMgr.setMasterVolume(v);
      this._saveSettings();
    });

    // BGM音量
    y = this._buildVolumeSlider(0, y, pw, 'BGM音量', this._settings.bgmVolume, (v) => {
      this._settings = { ...this._settings, bgmVolume: v };
      this._audioMgr.setBGMVolume(v);
      this._saveSettings();
    });

    // SFX音量
    y = this._buildVolumeSlider(0, y, pw, '音效音量', this._settings.sfxVolume, (v) => {
      this._settings = { ...this._settings, sfxVolume: v };
      this._audioMgr.setSFXVolume(v);
      this._saveSettings();
    });

    // 静音开关
    y += 8;
    y = this._buildToggleRow(0, y, pw, '静音', this._settings.muted, (v) => {
      this._settings = { ...this._settings, muted: v };
      if (v) {
        this._audioMgr.mute();
      } else {
        this._audioMgr.unmute();
      }
      this._saveSettings();
    });

    y += 16;

    // ---- 游戏设置区域 ----
    y = this._buildSectionTitle(0, y, '游戏设置', pw);
    y += 8;

    // 难度选择
    y = this._buildDifficultyRow(0, y, pw);

    // 自动突破
    y += 8;
    y = this._buildToggleRow(0, y, pw, '自动突破', false, (v) => {
      window.alert(`自动突破已${v ? '开启' : '关闭'}`);
    });

    // 自动战斗
    y += 8;
    y = this._buildToggleRow(0, y, pw, '自动战斗', false, (v) => {
      window.alert(`自动战斗已${v ? '开启' : '关闭'}`);
    });

    y += 16;

    // ---- 存档管理区域 ----
    y = this._buildSectionTitle(0, y, '存档管理', pw);
    y += 10;

    y = this._buildSaveButtons(0, y, pw);

    y += 20;

    // ---- 其他 ----
    y = this._buildSectionTitle(0, y, '其他', pw);
    y += 10;

    // 重新开始按钮（红色警告）
    const restartBtn = this.createInkButton(0, y + 20, {
      text: '⚠ 重新开始',
      width: 140,
      height: 44,
      fontSize: 14,
    });
    restartBtn.onClick(() => this._onRestart());
    this._mainPanel.add(restartBtn);

    // 版本号
    const versionText = this.add.text(pw * 0.38, y + 20, 'v1.0.0', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#888888',
    });
    versionText.setOrigin(0.5);
    this._mainPanel.add(versionText);

    // 返回按钮
    const backBtn = this.createInkButton(pw * 0.4, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    this._mainPanel.add(backBtn);
  }

  // ==========================================================================
  // 区域标题
  // ==========================================================================

  private _buildSectionTitle(x: number, y: number, title: string, _pw: number): number {
    const text = this.add.text(x, y, title, {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    text.setOrigin(0.5, 0);
    this._mainPanel.add(text);
    return y + 28;
  }

  // ==========================================================================
  // 音量滑块（用 InkProgressBar 模拟）
  // ==========================================================================

  private _buildVolumeSlider(x: number, y: number, pw: number, label: string, initialValue: number, onChange: (v: number) => void): number {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const labelText = this.add.text(-pw * 0.32, 0, label, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    labelText.setOrigin(0, 0.5);
    container.add(labelText);

    const bar = new InkProgressBar(this, 10, 0, {
      width: pw * 0.4,
      height: 16,
      type: 'custom',
      fillColor: 0x4A6741,
      showText: true,
      textFormat: 'percent',
    });
    bar.setValue(Math.round(initialValue * 100), 100, false);
    container.add(bar);
    this._volumeBars.push(bar);

    // 点击设置音量
    const hitZone = this.add.zone(10, 0, pw * 0.4, 30);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on(Phaser.Input.Events.POINTER_DOWN, (pointer: any) => {
      const localX = pointer.x - (this._mainPanel.x + container.x + bar.x - pw * 0.2);
      const ratio = Math.max(0, Math.min(1, localX / (pw * 0.4)));
      const newValue = Math.round(ratio * 100) / 100;
      bar.setValue(Math.round(newValue * 100), 100, false);
      onChange(newValue);
    });
    container.add(hitZone);

    return y + 36;
  }

  // ==========================================================================
  // 难度选择
  // ==========================================================================

  private _buildDifficultyRow(x: number, y: number, pw: number): number {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const label = this.add.text(-pw * 0.32, 0, '难度', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    label.setOrigin(0, 0.5);
    container.add(label);

    const btnW = 70;
    const gap = 10;
    const startX = -btnW - gap;

    DIFFICULTIES.forEach((diff, i) => {
      const btn = this.createInkButton(startX + i * (btnW + gap), 0, {
        text: diff.name,
        width: btnW,
        height: 36,
        fontSize: 13,
      });
      btn.onClick(() => {
        this._selectDifficulty(i);
        window.alert(`难度已切换为：${diff.name}`);
      });
      container.add(btn);
      this._difficultyBtns.push(btn);
    });

    // 默认选中普通
    this._selectDifficulty(1);

    return y + 40;
  }

  private _selectDifficulty(index: number): void {
    this._difficultyBtns.forEach((btn, i) => {
      if (i === index) {
        btn.setAlpha(1);
      } else {
        btn.setAlpha(0.5);
      }
    });
  }

  // ==========================================================================
  // Toggle 开关行
  // ==========================================================================

  private _buildToggleRow(x: number, y: number, pw: number, label: string, initialValue: boolean, onChange: (v: boolean) => void): number {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const labelText = this.add.text(-pw * 0.32, 0, label, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#AAAAAA',
    });
    labelText.setOrigin(0, 0.5);
    container.add(labelText);

    let currentValue = initialValue;
    const btn = this.createInkButton(pw * 0.08, 0, {
      text: currentValue ? '✓ 开启' : '✗ 关闭',
      width: 90,
      height: 34,
      fontSize: 13,
    });
    btn.onClick(() => {
      currentValue = !currentValue;
      btn.setText(currentValue ? '✓ 开启' : '✗ 关闭');
      onChange(currentValue);
    });
    container.add(btn);
    this._toggleBtns.push({ id: label, btn });

    return y + 38;
  }

  // ==========================================================================
  // 存档管理按钮
  // ==========================================================================

  private _buildSaveButtons(x: number, y: number, pw: number): number {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    const btnConfigs = [
      { label: '💾 保存游戏', action: () => this._onSave() },
      { label: '📤 导出存档', action: () => this._onExport() },
      { label: '📥 导入存档', action: () => this._onImport() },
    ];

    btnConfigs.forEach((cfg, i) => {
      const btn = this.createInkButton(-pw * 0.15 + i * 120, 0, {
        text: cfg.label,
        width: 100,
        height: 40,
        fontSize: 12,
      });
      btn.onClick(cfg.action);
      container.add(btn);
    });

    // 删除存档（红色警告）
    const deleteBtn = this.createInkButton(pw * 0.32, 0, {
      text: '🗑 删除存档',
      width: 100,
      height: 40,
      fontSize: 12,
    });
    deleteBtn.onClick(() => this._onDeleteSave());
    container.add(deleteBtn);

    return y + 50;
  }

  // ==========================================================================
  // 存档操作
  // ==========================================================================

  private _onSave(): void {
    try {
      const data = this._gsm.serialize();
      localStorage.setItem('xiuxian_save', data);
      window.alert('游戏已保存！');
    } catch (e) {
      window.alert('保存失败：' + (e as Error).message);
    }
  }

  private _onExport(): void {
    try {
      const data = this._gsm.serialize();
      const base64 = btoa(encodeURIComponent(data));
      // 显示弹窗
      const shortStr = base64.length > 200 ? base64.substring(0, 200) + '...' : base64;
      window.alert(`存档数据（Base64）：\n\n${shortStr}\n\n请复制保存。完整数据长度：${base64.length}`);
    } catch (e) {
      window.alert('导出失败：' + (e as Error).message);
    }
  }

  private _onImport(): void {
    const input = window.prompt('请输入存档数据（Base64）：');
    if (!input || !input.trim()) return;

    try {
      const json = decodeURIComponent(atob(input.trim()));
      this._gsm.deserialize(json);
      window.alert('存档导入成功！');
    } catch (e) {
      window.alert('导入失败：数据格式错误');
    }
  }

  private _onDeleteSave(): void {
    if (window.confirm('确定要删除本地存档吗？此操作不可恢复！')) {
      localStorage.removeItem('xiuxian_save');
      window.alert('存档已删除');
    }
  }

  // ==========================================================================
  // 重新开始
  // ==========================================================================

  private _onRestart(): void {
    if (window.confirm('确定要重新开始吗？所有进度将被重置！')) {
      if (window.confirm('最后确认：此操作不可撤销，是否继续？')) {
        this._gsm.resetToNewGame();
        localStorage.removeItem('xiuxian_save');
        window.alert('游戏已重置，请重新加载。');
        this.scene.stop();
      }
    }
  }

  // ==========================================================================
  // 保存设置
  // ==========================================================================

  private _saveSettings(): void {
    // 通过 transaction 更新 settings
    try {
      this._gsm.transaction([
        { path: 'settings.masterVolume', operation: 'set', value: this._settings.masterVolume },
        { path: 'settings.bgmVolume', operation: 'set', value: this._settings.bgmVolume },
        { path: 'settings.sfxVolume', operation: 'set', value: this._settings.sfxVolume },
        { path: 'settings.muted', operation: 'set', value: this._settings.muted },
      ]);
    } catch {
      // 设置更新失败不阻塞
    }
  }

  // ==========================================================================
  // 刷新 UI
  // ==========================================================================

  private _refreshUI(): void {
    // 重新读取设置并更新滑块
    this._settings = { ...(this._gsm.settings as GameSettings) };
    const values = [
      this._settings.masterVolume,
      this._settings.bgmVolume,
      this._settings.sfxVolume,
    ];
    this._volumeBars.forEach((bar, i) => {
      if (values[i] !== undefined) {
        bar.setValue(Math.round(values[i] * 100), 100, false);
      }
    });
  }
}
