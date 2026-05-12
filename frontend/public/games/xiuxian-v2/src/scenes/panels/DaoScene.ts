/**
 * 《问道长生》Phaser 3 重构版 —— 悟道界面面板
 * Phase 3D: 功能面板实现
 *
 * 可视化星图：5条大道呈放射状分布，节点状态可视化，
 * 支持激活/升级、详情弹窗、组合效果、一键重置、双指缩放。
 */

import { BaseScene } from '../BaseScene';
import { GameStateManager } from '../../managers/GameStateManager';
import { GameEventType } from '../../managers/EventBus';
import { DAO_PATHS, getDaoPathConfig, RARITY_COLORS } from '../../data/gameData';
import { INK_COLORS } from '../../ui/InkPanel';
import type { DaoPathConfig, DaoNodeConfig } from '../../data/gameData';

/** 大道颜色映射 */
const DAO_COLORS: Record<string, number> = {
  metal: 0xC0C0C0,
  wood: 0x4A6741,
  water: 0x4A90D9,
  fire: 0xD9534F,
  earth: 0x8B6914,
  'yin-yang': 0x9B59B6,
  'space-time': 0x2C3E50,
};

/** 节点状态 */
enum NodeStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  ACTIVATED = 'activated',
}

/** 节点布局信息 */
interface NodeLayout {
  daoId: string;
  nodeId: string;
  x: number;
  y: number;
  config: DaoNodeConfig;
  status: NodeStatus;
  level: number;
}

export class DaoScene extends BaseScene {
  private _gsm!: GameStateManager;

  // 星图容器（用于缩放）
  private _starMapContainer!: Phaser.GameObjects.Container;
  private _starMapScale = 1;
  private _minScale = 0.5;
  private _maxScale = 2;

  // 节点
  private _nodeLayouts: NodeLayout[] = [];
  private _nodeGraphics: Map<string, Phaser.GameObjects.Container> = new Map();
  private _connectionGraphics!: Phaser.GameObjects.Graphics;

  // 详情弹窗
  private _detailPanel?: Phaser.GameObjects.Container;

  // 底部信息
  private _infoText!: Phaser.GameObjects.Text;
  private _comboTexts: Phaser.GameObjects.Text[] = [];

  // 背景星星
  private _stars: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'DaoScene' });
  }

  create(): void {
    super.create();
    this._gsm = GameStateManager.getInstance();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 深蓝星空背景（通过矩形覆盖实现）
    const bgRect = this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
    bgRect.setDepth(-1);

    // 绘制随机星星
    this._drawStars(w, h);

    // 主面板（半透明，不遮全屏以便看到星空）
    const panel = this.createInkPanel(w / 2, h / 2, {
      width: w * 0.96,
      height: h * 0.92,
      title: '悟道',
      showOverlay: false,
      closeOnOverlay: false,
      animate: true,
    });
    panel.show();
    panel.setAlpha(0.92);

    const originalHide = panel.hide.bind(panel);
    panel.hide = () => {
      originalHide();
      this.scene.stop();
    };

    this._mainPanel = panel;

    // 星图容器（居中）
    const contentY = panel.contentOriginY;
    const contentH = panel.contentHeight;
    const mapCx = 0;
    const mapCy = contentY + contentH * 0.38;
    this._starMapContainer = this.add.container(mapCx, mapCy);
    panel.add(this._starMapContainer);

    // 中心角色头像
    this._drawCenterAvatar();

    // 连线层
    this._connectionGraphics = this.add.graphics();
    this._starMapContainer.add(this._connectionGraphics);

    // 计算并绘制节点
    this._calculateNodeLayouts();
    this._drawConnections();
    this._drawNodes();

    // 底部信息栏
    this._buildInfoBar(0, contentY + contentH - 56, w * 0.88, 100);

    // 右下角一键重置
    const resetBtn = this.createInkButton(w * 0.38, contentY + contentH - 28, {
      text: '一键重置',
      width: 100,
      height: 40,
      fontSize: 13,
    });
    resetBtn.onClick(() => this._onReset());
    panel.add(resetBtn);

    // 返回按钮
    const backBtn = this.createInkButton(w * 0.42, contentY + 10, {
      text: '返回',
      width: 70,
      height: 36,
      fontSize: 14,
    });
    backBtn.onClick(() => this.scene.stop());
    panel.add(backBtn);

    // 缩放交互（滚轮 + 双指）
    this._setupZoomInteraction();

    // 事件订阅
    this.subscribeToEvent(GameEventType.PLAYER_STATE_CHANGED, () => {
      this._refreshNodes();
    });
  }

  private _mainPanel!: ReturnType<BaseScene['createInkPanel']>;

  // ==========================================================================
  // 星空背景
  // ==========================================================================

  private _drawStars(w: number, h: number): void {
    const starCount = 120;
    for (let i = 0; i < starCount; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h);
      const size = Phaser.Math.Between(1, 3);
      const alpha = 0.3 + Math.random() * 0.6;
      const star = this.add.graphics();
      star.fillStyle(0xFFFFFF, alpha);
      star.fillCircle(sx, sy, size);
      this._stars.push(star);
    }

    // 星星闪烁动画
    this._stars.forEach((star) => {
      this.tweens.add({
        targets: star,
        alpha: 0.2 + Math.random() * 0.6,
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // ==========================================================================
  // 中心头像
  // ==========================================================================

  private _drawCenterAvatar(): void {
    const r = 28;
    const circle = this.add.graphics();
    circle.fillStyle(0xD4AF37, 0.3);
    circle.fillCircle(0, 0, r);
    circle.lineStyle(2, 0xD4AF37, 0.8);
    circle.strokeCircle(0, 0, r);
    this._starMapContainer.add(circle);

    const text = this.add.text(0, 0, '我', {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#D4AF37',
    });
    text.setOrigin(0.5);
    this._starMapContainer.add(text);

    // 脉冲动画
    this.tweens.add({
      targets: circle,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0.6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ==========================================================================
  // 节点布局计算
  // ==========================================================================

  private _calculateNodeLayouts(): void {
    this._nodeLayouts = [];
    const daoSystem = this._gsm.daoSystem;

    // 5条基础大道呈放射状
    const baseDaos = DAO_PATHS.filter((d) => d.element !== 'mixed');
    const angleStep = (Math.PI * 2) / baseDaos.length;
    const radiusBase = 100;
    const radiusStep = 80;

    baseDaos.forEach((dao, daoIdx) => {
      const angle = angleStep * daoIdx - Math.PI / 2;
      const color = DAO_COLORS[dao.element] ?? 0xAAAAAA;

      dao.nodes.forEach((node, nodeIdx) => {
        const dist = radiusBase + nodeIdx * radiusStep;
        const nx = Math.cos(angle) * dist;
        const ny = Math.sin(angle) * dist;

        const level = daoSystem.getNodeLevel(dao.id, node.id);
        let status = NodeStatus.LOCKED;

        if (level > 0) {
          status = NodeStatus.ACTIVATED;
        } else {
          // 检查前置
          const hasReq = !node.requires || node.requires.every((reqId) => daoSystem.getNodeLevel(dao.id, reqId) > 0);
          status = hasReq ? NodeStatus.AVAILABLE : NodeStatus.LOCKED;
        }

        this._nodeLayouts.push({
          daoId: dao.id,
          nodeId: node.id,
          x: nx,
          y: ny,
          config: node,
          status,
          level,
        });
      });
    });

    // 衍生大道（阴阳、时空）放在下方
    const mixedDaos = DAO_PATHS.filter((d) => d.element === 'mixed');
    mixedDaos.forEach((dao, idx) => {
      const mx = (idx === 0 ? -1 : 1) * 180;
      const my = 220;
      const color = DAO_COLORS[dao.id] ?? 0x9B59B6;

      dao.nodes.forEach((node, nodeIdx) => {
        const nx = mx + nodeIdx * 100;
        const ny = my;
        const level = daoSystem.getNodeLevel(dao.id, node.id);
        let status = NodeStatus.LOCKED;

        if (level > 0) {
          status = NodeStatus.ACTIVATED;
        } else {
          const hasReq = !node.requires || node.requires.every((reqId) => daoSystem.getNodeLevel(dao.id, reqId) > 0);
          status = hasReq ? NodeStatus.AVAILABLE : NodeStatus.LOCKED;
        }

        this._nodeLayouts.push({
          daoId: dao.id,
          nodeId: node.id,
          x: nx,
          y: ny,
          config: node,
          status,
          level,
        });
      });
    });
  }

  // ==========================================================================
  // 绘制连线
  // ==========================================================================

  private _drawConnections(): void {
    const g = this._connectionGraphics;
    g.clear();

    // 中心到各大道第一个节点的连线
    const baseDaos = DAO_PATHS.filter((d) => d.element !== 'mixed');
    baseDaos.forEach((dao) => {
      const firstNode = this._nodeLayouts.find((n) => n.daoId === dao.id && n.nodeId === dao.nodes[0]?.id);
      if (firstNode) {
        const color = DAO_COLORS[dao.element] ?? 0xAAAAAA;
        g.lineStyle(2, color, 0.4);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(firstNode.x, firstNode.y);
        g.strokePath();
      }
    });

    // 节点间的连线
    this._nodeLayouts.forEach((layout) => {
      if (layout.config.requires) {
        layout.config.requires.forEach((reqId) => {
          const reqNode = this._nodeLayouts.find((n) => n.daoId === layout.daoId && n.nodeId === reqId);
          if (reqNode) {
            const color = DAO_COLORS[layout.daoId] ?? 0xAAAAAA;
            const alpha = layout.status === NodeStatus.ACTIVATED ? 0.7 : 0.25;
            g.lineStyle(2, color, alpha);
            g.beginPath();
            g.moveTo(reqNode.x, reqNode.y);
            g.lineTo(layout.x, layout.y);
            g.strokePath();
          }
        });
      }
    });
  }

  // ==========================================================================
  // 绘制节点
  // ==========================================================================

  private _drawNodes(): void {
    // 清理旧节点
    this._nodeGraphics.forEach((g) => g.destroy());
    this._nodeGraphics.clear();

    this._nodeLayouts.forEach((layout) => {
      const container = this.add.container(layout.x, layout.y);
      const nodeR = 25;
      const color = DAO_COLORS[layout.daoId] ?? 0xAAAAAA;

      // 节点圆形
      const circle = this.add.graphics();
      if (layout.status === NodeStatus.ACTIVATED) {
        // 已激活：发光+对应大道颜色
        circle.fillStyle(color, 0.8);
        circle.fillCircle(0, 0, nodeR);
        circle.lineStyle(2, 0xFFFFFF, 0.6);
        circle.strokeCircle(0, 0, nodeR);

        // 外圈光晕
        const glow = this.add.graphics();
        glow.lineStyle(3, color, 0.3);
        glow.strokeCircle(0, 0, nodeR + 6);
        container.add(glow);

        // 光晕脉冲
        this.tweens.add({
          targets: glow,
          alpha: 0.1,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (layout.status === NodeStatus.AVAILABLE) {
        // 可激活：呼吸灯白色
        circle.fillStyle(0xFFFFFF, 0.3);
        circle.fillCircle(0, 0, nodeR);
        circle.lineStyle(1.5, 0xFFFFFF, 0.5);
        circle.strokeCircle(0, 0, nodeR);

        this.tweens.add({
          targets: circle,
          alpha: 0.5,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        // 未解锁：灰色
        circle.fillStyle(0x444444, 0.5);
        circle.fillCircle(0, 0, nodeR);
        circle.lineStyle(1, 0x666666, 0.3);
        circle.strokeCircle(0, 0, nodeR);
      }
      container.add(circle);

      // 节点名称
      const nameText = this.add.text(0, 0, layout.config.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: layout.status === NodeStatus.LOCKED ? '#666666' : '#F5F5DC',
      });
      nameText.setOrigin(0.5);
      container.add(nameText);

      // 等级标记
      if (layout.level > 0) {
        const lvText = this.add.text(nodeR - 6, -nodeR + 6, `${layout.level}`, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '9px',
          color: '#D4AF37',
        });
        lvText.setOrigin(1, 0);
        container.add(lvText);
      }

      // 交互
      const hitZone = this.add.zone(0, 0, nodeR * 2 + 10, nodeR * 2 + 10);
      hitZone.setInteractive({ useHandCursor: layout.status !== NodeStatus.LOCKED });
      hitZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this._showNodeDetail(layout);
      });
      container.add(hitZone);

      this._starMapContainer.add(container);
      this._nodeGraphics.set(`${layout.daoId}_${layout.nodeId}`, container);
    });
  }

  private _refreshNodes(): void {
    this._calculateNodeLayouts();
    this._drawConnections();
    this._drawNodes();
    this._updateInfoBar();
  }

  // ==========================================================================
  // 节点详情弹窗
  // ==========================================================================

  private _showNodeDetail(layout: NodeLayout): void {
    // 关闭旧弹窗
    this._detailPanel?.destroy();

    const daoSystem = this._gsm.daoSystem;
    const available = daoSystem.getAvailablePoints();
    const cost = layout.level < layout.config.maxLevel ? layout.config.cost[layout.level] ?? 0 : 0;
    const canUpgrade = layout.status !== NodeStatus.LOCKED && available >= cost && layout.level < layout.config.maxLevel;

    const panelW = 260;
    const panelH = 240;
    const px = Math.min(Math.max(layout.x, -this.cameras.main.width * 0.3), this.cameras.main.width * 0.3);
    const py = Math.min(Math.max(layout.y - 80, -180), 120);

    const panel = this.add.container(px, py);
    this._starMapContainer.add(panel);
    this._detailPanel = panel;

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.95);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    bg.lineStyle(2, DAO_COLORS[layout.daoId] ?? 0xAAAAAA, 0.6);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    panel.add(bg);

    let cy = -panelH / 2 + 24;

    // 名称
    const name = this.add.text(0, cy, layout.config.name, {
      fontFamily: '"Microsoft YaHei", serif',
      fontSize: '16px',
      color: '#F5F5DC',
    });
    name.setOrigin(0.5);
    panel.add(name);
    cy += 28;

    // 等级
    const lv = this.add.text(0, cy, `等级：${layout.level} / ${layout.config.maxLevel}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#AAAAAA',
    });
    lv.setOrigin(0.5);
    panel.add(lv);
    cy += 24;

    // 效果
    const effectText = layout.config.effects[layout.level] ?? layout.config.effects[0] ?? '无';
    const eff = this.add.text(0, cy, `效果：${effectText}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#D4AF37',
      wordWrap: { width: panelW - 24 },
      align: 'center',
    });
    eff.setOrigin(0.5, 0);
    panel.add(eff);
    cy += eff.height + 20;

    // 消耗
    const costText = this.add.text(0, cy, `消耗悟道点：${cost}（可用${available}）`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: available >= cost ? '#7ED957' : '#FF4444',
    });
    costText.setOrigin(0.5);
    panel.add(costText);
    cy += 28;

    // 前置条件
    if (layout.config.requires && layout.config.requires.length > 0 && layout.status === NodeStatus.LOCKED) {
      const reqs = layout.config.requires.map((r) => {
        const n = this._nodeLayouts.find((nl) => nl.daoId === layout.daoId && nl.nodeId === r);
        return n?.config.name ?? r;
      });
      const reqText = this.add.text(0, cy, `前置：${reqs.join('、')}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color: '#FF9E00',
      });
      reqText.setOrigin(0.5);
      panel.add(reqText);
      cy += 24;
    }

    // 激活/升级按钮
    const btnText = layout.level === 0 ? '激活' : '升级';
    const actionBtn = this.createInkButton(0, panelH / 2 - 32, {
      text: btnText,
      width: 100,
      height: 38,
      fontSize: 14,
    });
    actionBtn.setDisabled(!canUpgrade);
    actionBtn.onClick(() => {
      if (layout.level === 0) {
        const result = daoSystem.activateNode(layout.daoId, layout.nodeId);
        window.alert(result.message);
      } else {
        const result = daoSystem.upgradeNode(layout.daoId, layout.nodeId);
        window.alert(result.message);
      }
      this._detailPanel?.destroy();
      this._detailPanel = undefined;
      this._refreshNodes();
    });
    panel.add(actionBtn);

    // 关闭按钮（点击面板外关闭）
    const closeHit = this.add.zone(0, 0, panelW, panelH);
    closeHit.setInteractive();
    // 阻止点击穿透
  }

  // ==========================================================================
  // 底部信息栏
  // ==========================================================================

  private _buildInfoBar(x: number, y: number, w: number, h: number): void {
    const container = this.add.container(x, y);
    this._mainPanel.add(container);

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(INK_COLORS.inkGray, 0.2);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    container.add(bg);

    // 悟道点信息
    const daoSystem = this._gsm.daoSystem;
    const available = daoSystem.getAvailablePoints();
    const cap = daoSystem.getPointsCap();
    const totalLevel = daoSystem.getTotalDaoLevel();

    this._infoText = this.add.text(-w / 2 + 16, -h / 2 + 14, `悟道点：${available} / ${cap}　大道总等级：${totalLevel}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#F5F5DC',
    });
    this._infoText.setOrigin(0, 0.5);
    container.add(this._infoText);

    // 组合效果
    const player = this._gsm.getPlayerSnapshot() as any;
    const combos = daoSystem.calculateComboEffects(player?.cultivation?.realm);
    const comboLabel = this.add.text(-w / 2 + 16, -h / 2 + 38, '组合效果：', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#AAAAAA',
    });
    comboLabel.setOrigin(0, 0.5);
    container.add(comboLabel);

    let cx = -w / 2 + 90;
    this._comboTexts = [];
    combos.slice(0, 4).forEach((combo) => {
      const color = combo.active ? '#7ED957' : '#666666';
      const text = this.add.text(cx, -h / 2 + 38, combo.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color,
      });
      text.setOrigin(0, 0.5);
      container.add(text);
      this._comboTexts.push(text);
      cx += text.width + 16;
    });
  }

  private _updateInfoBar(): void {
    const daoSystem = this._gsm.daoSystem;
    const available = daoSystem.getAvailablePoints();
    const cap = daoSystem.getPointsCap();
    const totalLevel = daoSystem.getTotalDaoLevel();
    this._infoText.setText(`悟道点：${available} / ${cap}　大道总等级：${totalLevel}`);

    const player = this._gsm.getPlayerSnapshot() as any;
    const combos = daoSystem.calculateComboEffects(player?.cultivation?.realm);
    this._comboTexts.forEach((t) => t.destroy());
    this._comboTexts = [];
    let cx = -this._mainPanel.width * 0.44 + 90;
    combos.slice(0, 4).forEach((combo) => {
      const color = combo.active ? '#7ED957' : '#666666';
      const text = this.add.text(cx, this._infoText.y + 24, combo.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '11px',
        color,
      });
      text.setOrigin(0, 0.5);
      this._infoText.parentContainer?.add(text);
      this._comboTexts.push(text);
      cx += text.width + 16;
    });
  }

  // ==========================================================================
  // 一键重置
  // ==========================================================================

  private _onReset(): void {
    if (!window.confirm('确定要重置悟道吗？需要消耗悟道玉简。')) return;

    const daoSystem = this._gsm.daoSystem;
    const result = daoSystem.resetDao(true, Date.now());
    window.alert(result.message);
    if (result.success) {
      this._refreshNodes();
    }
  }

  // ==========================================================================
  // 缩放交互
  // ==========================================================================

  private _setupZoomInteraction(): void {
    // 滚轮缩放
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const factor = deltaY > 0 ? 0.9 : 1.1;
      this._setStarMapScale(this._starMapScale * factor);
    });

    // 双指缩放（通过两个指针的距离变化模拟）
    let initialDistance = 0;
    let initialScale = 1;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: any) => {
      const activePointers = this.input.activePointer.isDown ? [this.input.activePointer] : [];
      // Phaser 不支持真正的多指针，这里用滚轮为主
    });
  }

  private _setStarMapScale(scale: number): void {
    this._starMapScale = Phaser.Math.Clamp(scale, this._minScale, this._maxScale);
    this.tweens.add({
      targets: this._starMapContainer,
      scaleX: this._starMapScale,
      scaleY: this._starMapScale,
      duration: 200,
      ease: 'Quad.easeOut',
    });
  }

  // 点击空白处关闭详情弹窗
  private _wasDown = false;
  update(): void {
    const isDown = this.input.activePointer.isDown;
    if (!isDown && this._wasDown && this._detailPanel) {
      this._detailPanel.destroy();
      this._detailPanel = undefined;
    }
    this._wasDown = isDown;
  }
}
