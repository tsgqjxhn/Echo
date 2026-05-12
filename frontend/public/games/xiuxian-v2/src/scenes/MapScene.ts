/**
 * 《问道长生》世界地图场景
 *
 * 地图结构：
 * - 默认打开为当前所在区域地图（region view）。
 * - 点击右上角"世界图"按钮或标题栏区域名，切换到十域世界地图（world view）。
 * - 世界地图按光点展示九大区域；点击光点可传送进入对应区域。
 * - 区域地图保留城市、宗门、坊市、秘境等可交互地点节点。
 *
 * 本次更新：
 * - 光点采用 SVG 风格（扩散环、呼吸光晕、定位标记、核心脉冲）
 * - 世界地图与区域地图均显示坐标
 * - 点击光点实现传送
 * - 点击头像弹出菜单（修为、悟道、声望、物品、设置）
 */

import { BaseScene } from './BaseScene';
import { gameState } from '../managers/GameStateManager';
import { eventBus, GameEventType } from '../managers/EventBus';
import {
  PROFESSIONS,
  TALENTS,
  WORLD_REGIONS,
  getRegion,
  type CreationResult,
  type LocationKind,
  type RegionDefinition,
  type RegionId,
  type RegionLocation,
} from '../data/world';

const FONT = '"Microsoft YaHei", "SimHei", sans-serif';
const SERIF_FONT = '"Microsoft YaHei", "KaiTi", "SimSun", serif';
const GAME_W = 1280;
const GAME_H = 720;

/** 扩散环配置 */
interface RingConfig {
  delay: number;
  duration: number;
  startScale: number;
  endScale: number;
  startAlpha: number;
  endAlpha: number;
}

const DEFAULT_RINGS: RingConfig[] = [
  { delay: 0, duration: 2200, startScale: 0.25, endScale: 3.8, startAlpha: 0.95, endAlpha: 0 },
  { delay: 1100, duration: 2200, startScale: 0.25, endScale: 3.8, startAlpha: 0.95, endAlpha: 0 },
];

const ACTIVE_RINGS: RingConfig[] = [
  { delay: 0, duration: 1800, startScale: 0.3, endScale: 4.0, startAlpha: 1.0, endAlpha: 0 },
  { delay: 900, duration: 1800, startScale: 0.3, endScale: 4.0, startAlpha: 1.0, endAlpha: 0 },
];

type ViewMode = 'region' | 'world';
type TaskBadge = '传' | '宗' | '秘' | '市' | '险';

interface LocalTask {
  id: string;
  badge: TaskBadge;
  title: string;
  desc: string;
  reward: string;
  deadline: string;
  difficulty: string;
  locationId: string;
  status: '可接取' | '已追踪';
}

const NODE_TEXTURES: Record<LocationKind, string> = {
  city: 'map_node_city',
  sect: 'map_node_sect',
  market: 'map_node_market',
  ruins: 'map_node_ruins',
  cave: 'map_node_cave',
  island: 'map_node_island',
  trial: 'map_node_trial',
};

const TASK_BLUEPRINTS: Record<LocationKind, Array<{ badge: TaskBadge; title: string; desc: string; difficulty: string }>> = {
  city: [
    { badge: '传', title: '城中传闻', desc: '在客栈、茶肆与渡口打听近期异动。', difficulty: '低' },
    { badge: '市', title: '城外巡路', desc: '沿城外灵脉巡查，确认是否有妖影出没。', difficulty: '低中' },
    { badge: '险', title: '护送行商', desc: '护送行商穿过邻近危险地带。', difficulty: '中' },
  ],
  sect: [
    { badge: '宗', title: '宗门委托', desc: '完成执事派发的外门事务，积累贡献。', difficulty: '低中' },
    { badge: '宗', title: '同境切磋', desc: '与同境弟子切磋，验证功法根基。', difficulty: '中' },
    { badge: '秘', title: '守阵轮值', desc: '协助看守宗门阵脚，记录灵压变化。', difficulty: '中' },
  ],
  market: [
    { badge: '市', title: '拍卖线索', desc: '追查一件拍品来历，可能牵出旧怨。', difficulty: '低中' },
    { badge: '传', title: '散修传闻', desc: '在摊位间收集秘境入口与失踪修士消息。', difficulty: '低' },
    { badge: '险', title: '商路护镖', desc: '护送商队穿过危险路段。', difficulty: '中' },
  ],
  ruins: [
    { badge: '秘', title: '残阵测绘', desc: '进入遗址外围记录阵纹，避开核心杀阵。', difficulty: '高' },
    { badge: '险', title: '禁地探路', desc: '试探禁地边缘灵压，寻找安全入口。', difficulty: '高' },
    { badge: '传', title: '古卷辨伪', desc: '根据残卷描述确认遗迹年代与入口方位。', difficulty: '中高' },
  ],
  cave: [
    { badge: '宗', title: '洞府修整', desc: '修补阵旗、清理灵田，为闭关做准备。', difficulty: '低' },
    { badge: '市', title: '丹房补货', desc: '整理丹炉与灵草，补齐炼丹材料。', difficulty: '低' },
    { badge: '传', title: '来客拜帖', desc: '有散修递来拜帖，请你判断是否接见。', difficulty: '低中' },
  ],
  island: [
    { badge: '秘', title: '潮汐航路', desc: '记录星潮或海潮变化，推算安全航线。', difficulty: '中高' },
    { badge: '市', title: '海市交易', desc: '在短暂开市期间换取稀有海材。', difficulty: '中' },
    { badge: '险', title: '罡风避难', desc: '护送低阶修士穿过罡风间隙。', difficulty: '中高' },
  ],
  trial: [
    { badge: '秘', title: '秘境试炼', desc: '进入外围试炼，带回灵草、妖兽材料或阵图残片。', difficulty: '中高' },
    { badge: '险', title: '妖兽踪迹', desc: '追踪近期出没的妖兽，判断是否形成兽潮。', difficulty: '中' },
    { badge: '传', title: '开启窗口', desc: '确认秘境开启窗口，提前准备入境物资。', difficulty: '低中' },
  ],
};

/** 头像菜单项 */
interface AvatarMenuItem {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export class MapScene extends BaseScene {
  private _viewMode: ViewMode = 'region';
  private _creation: CreationResult = { professionId: 'sword', talentId: 'wood_spirit', birthRegionId: 'central' };
  private _currentRegion: RegionDefinition = getRegion('central');
  private _currentLocation: RegionLocation = getRegion('central').locations[0];
  private _dateSerial = 178 * 360 + 6 * 30 + 22;
  private _mapLayer?: Phaser.GameObjects.Container;
  private _uiLayer?: Phaser.GameObjects.Container;
  private _modalLayer?: Phaser.GameObjects.Container;
  private _backgroundRect?: Phaser.GameObjects.Rectangle;
  private _playerMarker?: Phaser.GameObjects.Container;
  private _dateText?: Phaser.GameObjects.Text;
  private _placeText?: Phaser.GameObjects.Text;
  private _taskText?: Phaser.GameObjects.Text;
  private _modeButtonText?: Phaser.GameObjects.Text;
  private _tasks: Map<string, LocalTask[]> = new Map();
  private _trackedTask?: LocalTask;

  /** 所有动态光点容器 */
  private _glowDots: Phaser.GameObjects.Container[] = [];
  /** 所有动画 tween */
  private _glowTweens: Phaser.Tween[] = [];
  /** 传送光点相关 */
  private _teleportGlow?: Phaser.GameObjects.Container;
  private _teleportTween?: Phaser.Tween;
  private _teleportConfirm?: Phaser.GameObjects.Container;

  /** 头像菜单 */
  private _avatarMenu?: Phaser.GameObjects.Container;
  private _avatarMenuItems: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'MapScene' });
  }

  create(data?: CreationResult): void {
    super.create();
    this._creation = this._resolveCreation(data);
    this._currentRegion = getRegion(this._creation.birthRegionId);
    this._currentLocation = this._currentRegion.locations[0];
    this._ensureTasks(this._currentLocation, true);
    this._drawScene();
  }

  private _resolveCreation(data?: CreationResult): CreationResult {
    if (data?.birthRegionId) return data;
    try {
      const raw = localStorage.getItem('xiuxian_v2_creation');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CreationResult>;
        if (parsed.birthRegionId) {
          return {
            professionId: parsed.professionId || 'sword',
            talentId: parsed.talentId || 'wood_spirit',
            birthRegionId: parsed.birthRegionId,
          } as CreationResult;
        }
      }
    } catch (_) {
      // ignore corrupt local setup
    }
    return { professionId: 'sword', talentId: 'wood_spirit', birthRegionId: 'central' };
  }

  // ========================================================================
  // 场景绘制主入口
  // ========================================================================

  private _drawScene(): void {
    // 清理旧光点和动画
    this._glowDots.forEach(d => d.destroy(true));
    this._glowDots = [];
    this._glowTweens.forEach(t => t.stop());
    this._glowTweens = [];

    this._teleportTween?.stop();
    this._teleportTween = undefined;
    this._teleportGlow?.destroy(true);
    this._teleportGlow = undefined;
    this._teleportConfirm?.destroy(true);
    this._teleportConfirm = undefined;

    this._mapLayer?.destroy(true);
    this._uiLayer?.destroy(true);
    this._modalLayer?.destroy(true);
    this._backgroundRect?.destroy(true);
    this._modalLayer = undefined;

    // 关闭头像菜单
    this._hideAvatarMenu();

    this._backgroundRect = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07140f, 1).setOrigin(0);
    this._mapLayer = this.add.container(0, 0);
    this._mapLayer.setDepth(1);
    this._uiLayer = this.add.container(0, 0);
    this._uiLayer.setDepth(10);

    if (this._viewMode === 'world') this._drawWorldMap();
    else this._drawRegionMap();

    this._drawHud();
    this._updateHud();
  }

  // ========================================================================
  // 通用光点绘制（SVG 风格）
  // ========================================================================

  /**
   * 绘制 SVG 风格光点
   * @param parent 父容器
   * @param x 坐标 X
   * @param y 坐标 Y
   * @param options 样式配置
   * @returns 光点容器
   */
  private _drawSvgGlow(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    options: {
      active?: boolean;
      color?: number;
      accent?: number;
      coreRadius?: number;
      glowRadius?: number;
      label?: string;
      coord?: string;
      onClick?: () => void;
      onOver?: (pointer: Phaser.Pointer) => void;
      onOut?: () => void;
    }
  ): Phaser.GameObjects.Container {
    const active = options.active ?? false;
    const color = options.color ?? 0x4dfcff;
    const accent = options.accent ?? 0x1ca7ff;
    const coreRadius = options.coreRadius ?? (active ? 7 : 6);
    const glowRadius = options.glowRadius ?? (active ? 30 : 26);

    const container = this.add.container(x, y);

    // ---- 1. 外圈呼吸光晕（glowBreath 效果） ----
    const breathGlow = this.add.graphics();
    breathGlow.fillStyle(color, 0.45);
    breathGlow.fillCircle(0, 0, glowRadius);
    breathGlow.fillStyle(color, 0.15);
    breathGlow.fillCircle(0, 0, glowRadius + 12);
    container.add(breathGlow);

    // 呼吸动画
    const breathTween = this.tweens.add({
      targets: breathGlow,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.9,
      duration: active ? 2000 : 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this._glowTweens.push(breathTween);

    // ---- 2. 扩散环（ringSpread 效果） ----
    const rings = active ? ACTIVE_RINGS : DEFAULT_RINGS;
    rings.forEach(ring => {
      const ringGfx = this.add.graphics();
      ringGfx.lineStyle(2, color, ring.startAlpha);
      ringGfx.strokeCircle(0, 0, coreRadius + 3);
      ringGfx.setScale(ring.startScale);
      container.add(ringGfx);

      const ringTween = this.tweens.add({
        targets: ringGfx,
        scaleX: ring.endScale,
        scaleY: ring.endScale,
        alpha: ring.endAlpha,
        duration: ring.duration,
        delay: ring.delay,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
      this._glowTweens.push(ringTween);
    });

    // ---- 3. 定位标记（marker-pin） ----
    const pinSize = active ? 24 : 22;
    const pin = this.add.graphics();
    // 绘制水滴/定位标记形状（使用贝塞尔曲线近似）
    const pinPoints: { x: number; y: number }[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      // 水滴形状参数方程
      let px: number, py: number;
      if (t < Math.PI) {
        // 上半部分（圆形）
        px = Math.sin(t) * pinSize * 0.9;
        py = -Math.cos(t) * pinSize * 0.9 - pinSize * 0.1;
      } else {
        // 下半部分（尖角）
        const t2 = (t - Math.PI) / Math.PI;
        px = (1 - t2 * 2) * pinSize * 0.3;
        py = pinSize * 1.4 * (1 - Math.abs(1 - t2 * 2));
      }
      pinPoints.push({ x: px, y: py });
    }
    pin.fillStyle(color, 0.18);
    pin.lineStyle(2, color, 0.9);
    pin.fillPoints(pinPoints, true, true);
    pin.strokePoints(pinPoints, true, true);
    container.add(pin);

    // ---- 4. 核心光点（corePulse） ----
    const core = this.add.graphics();
    core.fillStyle(0xffffff, 1);
    core.fillCircle(0, -pinSize * 0.3, coreRadius);
    // 模拟 drop-shadow: 多层外圈
    core.fillStyle(color, 0.35);
    core.fillCircle(0, -pinSize * 0.3, coreRadius + 4);
    core.fillStyle(accent, 0.15);
    core.fillCircle(0, -pinSize * 0.3, coreRadius + 10);
    container.add(core);

    // 核心脉冲动画
    const coreTween = this.tweens.add({
      targets: core,
      scaleX: 1.45,
      scaleY: 1.45,
      alpha: 0.72,
      duration: active ? 1300 : 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this._glowTweens.push(coreTween);

    // ---- 5. 标签 ----
    if (options.label) {
      const labelBg = this.add.graphics();
      const labelWidth = options.label.length * 15 + 24;
      labelBg.fillStyle(0x020817, 0.82);
      labelBg.fillRoundedRect(-labelWidth / 2, pinSize + 10, labelWidth, 28, 6);
      labelBg.lineStyle(1, color, 0.35);
      labelBg.strokeRoundedRect(-labelWidth / 2, pinSize + 10, labelWidth, 28, 6);
      container.add(labelBg);

      const labelText = this.add.text(0, pinSize + 24, options.label, {
        fontFamily: SERIF_FONT,
        fontSize: '15px',
        color: active ? '#fff6b8' : '#e6ffff',
        fontStyle: 'bold',
      });
      labelText.setOrigin(0.5);
      container.add(labelText);
    }

    // ---- 6. 坐标显示 ----
    if (options.coord) {
      const coordText = this.add.text(0, pinSize + (options.label ? 52 : 34), options.coord, {
        fontFamily: FONT,
        fontSize: '12px',
        color: 'rgba(200,230,255,0.7)',
      });
      coordText.setOrigin(0.5);
      container.add(coordText);
    }

    // ---- 7. 当前位置指示器（仅 active） ----
    if (active) {
      const indicator = this.add.graphics();
      indicator.fillStyle(0xffcf5c, 0.9);
      indicator.fillTriangle(0, -pinSize - 14, -7, -pinSize - 5, 7, -pinSize - 5);
      container.add(indicator);
    }

    // ---- 8. 点击热区 ----
    const hit = this.add.zone(0, 0, (glowRadius + 20) * 2, (glowRadius + 40) * 2);
    hit.setInteractive({ useHandCursor: true });

    hit.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Pointer) => {
      options.onOver?.(pointer);
      breathGlow.setAlpha(1.3);
      pin.clear();
      pin.fillStyle(0xfff6b8, 0.25);
      pin.lineStyle(2, 0xfff6b8, 0.95);
      pin.fillPoints(pinPoints, true, true);
      pin.strokePoints(pinPoints, true, true);
      core.clear();
      core.fillStyle(0xfff6b8, 1);
      core.fillCircle(0, -pinSize * 0.3, coreRadius);
      core.fillStyle(0xfff6b8, 0.4);
      core.fillCircle(0, -pinSize * 0.3, coreRadius + 4);
      core.fillStyle(color, 0.2);
      core.fillCircle(0, -pinSize * 0.3, coreRadius + 10);
    });

    hit.on(Phaser.Input.Events.POINTER_OUT, () => {
      options.onOut?.();
      breathGlow.setAlpha(1);
      pin.clear();
      pin.fillStyle(color, 0.18);
      pin.lineStyle(2, color, 0.9);
      pin.fillPoints(pinPoints, true, true);
      pin.strokePoints(pinPoints, true, true);
      core.clear();
      core.fillStyle(0xffffff, 1);
      core.fillCircle(0, -pinSize * 0.3, coreRadius);
      core.fillStyle(color, 0.35);
      core.fillCircle(0, -pinSize * 0.3, coreRadius + 4);
      core.fillStyle(accent, 0.15);
      core.fillCircle(0, -pinSize * 0.3, coreRadius + 10);
    });

    hit.on(Phaser.Input.Events.POINTER_UP, () => {
      options.onClick?.();
    });

    container.add(hit);

    this._glowDots.push(container);
    parent.add(container);
    return container;
  }

  // ========================================================================
  // 世界地图 —— 光点覆盖模式
  // ========================================================================

  private _drawWorldMap(): void {
    if (!this._mapLayer) return;
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'world_ten_domains');
    bg.setDisplaySize(GAME_W, GAME_H);
    this._mapLayer.add(bg);

    // 暗化背景以突出光点
    const shade = this.add.graphics();
    shade.fillStyle(0x020805, 0.35);
    shade.fillRect(0, 0, GAME_W, GAME_H);
    this._mapLayer.add(shade);

    // 绘制网格线（SVG 风格）
    this._drawMapGrid();

    WORLD_REGIONS.forEach(region => {
      const active = region.id === this._currentRegion.id;
      this._drawSvgGlow(this._mapLayer!, region.worldX, region.worldY, {
        active,
        color: active ? 0x4dfcff : region.accent,
        accent: active ? 0x1ca7ff : region.color,
        coreRadius: active ? 8 : 6,
        glowRadius: active ? 36 : 28,
        label: region.shortName,
        coord: `[${region.worldX}, ${region.worldY}]`,
        onClick: () => this._enterRegion(region),
        onOver: (pointer) => {
          this.showTooltip(`${region.name}\n${region.desc}\n气候：${region.climate}`, pointer.x + 12, pointer.y + 12);
        },
        onOut: () => this.hideTooltip(),
      });
    });
  }

  // ========================================================================
  // 区域地图
  // ========================================================================

  private _drawRegionMap(): void {
    if (!this._mapLayer) return;
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, this._currentRegion.textureKey);
    bg.setDisplaySize(GAME_W, GAME_H);
    this._mapLayer.add(bg);

    const shade = this.add.graphics();
    shade.fillStyle(0x08130f, 0.15);
    shade.fillRect(0, 0, GAME_W, GAME_H);
    this._mapLayer.add(shade);

    // 绘制网格线
    this._drawMapGrid();

    this._currentRegion.locations.forEach(location => {
      const active = location.id === this._currentLocation.id;
      this._drawSvgGlow(this._mapLayer!, location.x, location.y, {
        active,
        color: 0xd4af37,
        accent: 0xffe08a,
        coreRadius: active ? 7 : 6,
        glowRadius: active ? 32 : 28,
        label: location.name,
        coord: `[${location.x}, ${location.y}]`,
        onClick: () => this._travelTo(location),
        onOver: (pointer) => {
          this.showTooltip(`${location.name}\n${location.subtitle}\n危险：${location.danger}`, pointer.x + 12, pointer.y + 12);
        },
        onOut: () => this.hideTooltip(),
      });
    });

    this._drawPlayerMarker();
    this._drawTeleportGlow();
  }

  /** 绘制地图网格（SVG 风格） */
  private _drawMapGrid(): void {
    if (!this._mapLayer) return;
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x78dcff, 0.06);
    const step = 48;
    for (let x = 0; x <= GAME_W; x += step) {
      grid.moveTo(x, 0);
      grid.lineTo(x, GAME_H);
    }
    for (let y = 0; y <= GAME_H; y += step) {
      grid.moveTo(0, y);
      grid.lineTo(GAME_W, y);
    }
    grid.strokePath();
    this._mapLayer.add(grid);

    // 斜向装饰线
    const diag = this.add.graphics();
    diag.lineStyle(1, 0x4cfcff, 0.08);
    // 左下到右上的多条斜线
    for (let offset = -GAME_H; offset < GAME_W; offset += 200) {
      diag.moveTo(offset, GAME_H);
      diag.lineTo(offset + GAME_H, 0);
    }
    diag.strokePath();
    this._mapLayer.add(diag);
  }

  private _drawPlayerMarker(): void {
    if (!this._mapLayer) return;
    const marker = this.add.container(this._currentLocation.x + 54, this._currentLocation.y + 4);
    const g = this.add.graphics();
    g.fillStyle(0xffb23f, 0.95);
    g.fillCircle(0, 0, 20);
    g.lineStyle(3, 0xfff0b2, 0.86);
    g.strokeCircle(0, 0, 20);
    marker.add(g);
    const text = this.add.text(0, 0, '进入', {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#fff7c7',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    marker.add(text);
    this._playerMarker = marker;
    this._mapLayer.add(marker);
  }

  // ========================================================================
  // 传送光点
  // ========================================================================

  private _drawTeleportGlow(): void {
    if (!this._mapLayer) return;

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const container = this.add.container(cx, cy);

    // 外圈光晕
    const outer = this.add.graphics();
    outer.fillStyle(0x4fd1c5, 0.4);
    outer.fillCircle(0, 0, 22);
    outer.fillStyle(0x4fd1c5, 0.15);
    outer.fillCircle(0, 0, 36);
    container.add(outer);

    // 呼吸动画
    this._teleportTween = this.tweens.add({
      targets: outer,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 内圈实心
    const inner = this.add.graphics();
    inner.fillStyle(0xa5f3fc, 0.95);
    inner.fillCircle(0, 0, 9);
    inner.lineStyle(2, 0xcfffff, 0.8);
    inner.strokeCircle(0, 0, 9);
    container.add(inner);

    // 交互区
    const hit = this.add.zone(0, 10, 80, 80);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Pointer) => {
      this.showTooltip('点击启动传送阵', pointer.x + 12, pointer.y + 12);
      inner.setAlpha(1.2);
    });
    hit.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.hideTooltip();
      inner.setAlpha(1);
    });
    hit.on(Phaser.Input.Events.POINTER_UP, () => this._showTeleportConfirm());
    container.add(hit);

    this._teleportGlow = container;
    this._mapLayer.add(container);
  }

  private _showTeleportConfirm(): void {
    if (this._teleportConfirm) return;

    const targetLocation = this._currentRegion.locations[0];
    const overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55);
    overlay.setOrigin(0);
    overlay.setInteractive({ useHandCursor: false });
    overlay.setDepth(60);

    const panel = this.add.container(GAME_W / 2, GAME_H / 2);
    panel.setDepth(65);

    const panelW = 480;
    const panelH = 220;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1f1c, 0.96);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    bg.lineStyle(2, 0x4fd1c5, 0.55);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    panel.add(bg);

    const title = this.add.text(0, -panelH / 2 + 32, '传送确认', {
      fontFamily: SERIF_FONT,
      fontSize: '26px',
      color: '#a5f3fc',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    panel.add(title);

    const content = this.add.text(0, -6, `是否启动「${this._currentRegion.name}」的传送阵，前往「${targetLocation.name}」？`, {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#d5e8e0',
      wordWrap: { width: panelW - 64 },
      align: 'center',
    });
    content.setOrigin(0.5);
    panel.add(content);

    // 确认按钮
    const confirmBtn = this.add.container(-100, 56);
    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0x238a82, 0.92);
    confirmBg.fillRoundedRect(-60, -20, 120, 40, 10);
    confirmBtn.add(confirmBg);
    const confirmText = this.add.text(0, 0, '确认', {
      fontFamily: SERIF_FONT,
      fontSize: '18px',
      color: '#fff4c7',
    });
    confirmText.setOrigin(0.5);
    confirmBtn.add(confirmText);
    const confirmHit = this.add.zone(0, 0, 120, 40);
    confirmHit.setInteractive({ useHandCursor: true });
    confirmHit.on(Phaser.Input.Events.POINTER_UP, () => {
      this._hideTeleportConfirm();
      this._travelTo(targetLocation);
    });
    confirmBtn.add(confirmHit);
    panel.add(confirmBtn);

    // 取消按钮
    const cancelBtn = this.add.container(100, 56);
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(0x4a5a56, 0.92);
    cancelBg.fillRoundedRect(-60, -20, 120, 40, 10);
    cancelBtn.add(cancelBg);
    const cancelText = this.add.text(0, 0, '取消', {
      fontFamily: SERIF_FONT,
      fontSize: '18px',
      color: '#c8d5d0',
    });
    cancelText.setOrigin(0.5);
    cancelBtn.add(cancelText);
    const cancelHit = this.add.zone(0, 0, 120, 40);
    cancelHit.setInteractive({ useHandCursor: true });
    cancelHit.on(Phaser.Input.Events.POINTER_UP, () => this._hideTeleportConfirm());
    cancelBtn.add(cancelHit);
    panel.add(cancelBtn);

    overlay.on(Phaser.Input.Events.POINTER_UP, () => this._hideTeleportConfirm());

    this._teleportConfirm = this.add.container(0, 0, [overlay, panel]);
    this._teleportConfirm.setDepth(60);
  }

  private _hideTeleportConfirm(): void {
    this._teleportConfirm?.destroy(true);
    this._teleportConfirm = undefined;
  }

  // ========================================================================
  // HUD
  // ========================================================================

  private _drawHud(): void {
    if (!this._uiLayer) return;
    const player = gameState.getPlayerSnapshot();

    // ---- 左侧：头像与基本信息 ----
    const left = this.add.container(24, 20);
    this._uiLayer.add(left);

    // 头像背景（可点击）
    const avatarContainer = this.add.container(38, 38);
    const avatar = this.add.graphics();
    avatar.fillStyle(0x0d211d, 0.94);
    avatar.fillCircle(0, 0, 37);
    avatar.lineStyle(4, 0xd4af37, 0.88);
    avatar.strokeCircle(0, 0, 37);
    avatar.fillStyle(0xd9c5a0, 1);
    avatar.fillCircle(0, 5, 18);
    avatar.fillStyle(0x111715, 1);
    avatar.fillTriangle(-22, -8, 0, -31, 23, -8);
    avatarContainer.add(avatar);

    // 头像点击热区
    const avatarHit = this.add.zone(0, 0, 74, 74);
    avatarHit.setInteractive({ useHandCursor: true });
    avatarHit.on(Phaser.Input.Events.POINTER_UP, () => this._toggleAvatarMenu());
    avatarContainer.add(avatarHit);
    left.add(avatarContainer);

    const nameText = this.add.text(82, 2, player.name || '李太虚', {
      fontFamily: SERIF_FONT,
      fontSize: '28px',
      color: '#e6f3c6',
      stroke: '#14342e',
      strokeThickness: 3,
    });
    left.add(nameText);
    this._bar(left, 80, 37, 250, 16, 0xdf6f31, 0x73321f, `生命 ${player.stats.hp}/${player.stats.maxHp}`);
    this._bar(left, 80, 59, 220, 13, 0x4aa6bd, 0x254656, `修为 ${Math.floor(player.cultivation.exp)}/${player.cultivation.expMax}`);

    // ---- 右侧：日期、地点、任务 ----
    const right = this.add.container(888, 20);
    this._uiLayer.add(right);
    const rg = this.add.graphics();
    rg.fillStyle(0x143b38, 0.82);
    rg.fillRoundedRect(0, 0, 360, 102, 18);
    rg.lineStyle(1.5, 0xd4af37, 0.28);
    rg.strokeRoundedRect(0, 0, 360, 102, 18);
    right.add(rg);
    const dateText = this.add.text(24, 12, '', { fontFamily: FONT, fontSize: '20px', color: '#f1e0a3' });
    const placeText = this.add.text(24, 42, '', { fontFamily: SERIF_FONT, fontSize: '26px', color: '#f7efbd', fontStyle: 'bold' });
    const taskText = this.add.text(24, 75, '', { fontFamily: FONT, fontSize: '13px', color: '#d5e2c0', wordWrap: { width: 310 } });
    right.add([dateText, placeText, taskText]);
    this._dateText = dateText;
    this._placeText = placeText;
    this._taskText = taskText;

    // 标题栏（地点/世界图名称）可点击切换视图
    const placeHit = this.add.zone(204, 55, 320, 40);
    placeHit.setInteractive({ useHandCursor: true });
    placeHit.on(Phaser.Input.Events.POINTER_UP, () => {
      this._viewMode = this._viewMode === 'world' ? 'region' : 'world';
      this._drawScene();
      this._showToast(this._viewMode === 'world' ? '已打开十域世界图' : `已回到${this._currentRegion.name}`);
    });
    right.add(placeHit);

    this._modeButtonText = this._topButton(1114, 142, 120, this._viewMode === 'world' ? '返回区域' : '世界图', () => {
      this._viewMode = this._viewMode === 'world' ? 'region' : 'world';
      this._drawScene();
      this._showToast(this._viewMode === 'world' ? '已打开十域世界图' : `已回到${this._currentRegion.name}`);
    });
    this._topButton(974, 142, 120, '任务', () => this._openTaskPanel());
    this._topButton(834, 142, 120, '附近', () => this._openPeoplePanel());
  }

  private _topButton(x: number, y: number, w: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const c = this.add.container(x, y);
    c.setDepth(18);
    this._uiLayer?.add(c);
    const g = this.add.graphics();
    g.fillStyle(0x153c36, 0.92);
    g.fillRoundedRect(0, 0, w, 40, 12);
    g.lineStyle(1.6, 0xd4af37, 0.4);
    g.strokeRoundedRect(0, 0, w, 40, 12);
    c.add(g);
    const t = this.add.text(w / 2, 20, label, {
      fontFamily: SERIF_FONT,
      fontSize: '19px',
      color: '#f2df9a',
    });
    t.setOrigin(0.5);
    c.add(t);
    const hit = this.add.zone(w / 2, 20, w, 40);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_UP, onClick);
    c.add(hit);
    return t;
  }

  // ========================================================================
  // 头像菜单
  // ========================================================================

  private _toggleAvatarMenu(): void {
    if (this._avatarMenu) {
      this._hideAvatarMenu();
      return;
    }
    this._showAvatarMenu();
  }

  private _showAvatarMenu(): void {
    if (this._avatarMenu) return;

    const menuX = 62;
    const menuY = 100;
    const itemHeight = 44;
    const itemWidth = 120;
    const menuItems: AvatarMenuItem[] = [
      {
        key: 'cultivation',
        label: '修为',
        icon: '修',
        onClick: () => {
          this._hideAvatarMenu();
          this._showToast('修为面板（待接入）');
          // 可切换至 cultivation 场景
        },
      },
      {
        key: 'dao',
        label: '悟道',
        icon: '悟',
        onClick: () => {
          this._hideAvatarMenu();
          this.scene.start('DaoScene');
        },
      },
      {
        key: 'reputation',
        label: '声望',
        icon: '声',
        onClick: () => {
          this._hideAvatarMenu();
          this._showToast('声望面板（待接入）');
        },
      },
      {
        key: 'inventory',
        label: '物品',
        icon: '物',
        onClick: () => {
          this._hideAvatarMenu();
          this.scene.start('InventoryScene');
        },
      },
      {
        key: 'settings',
        label: '设置',
        icon: '设',
        onClick: () => {
          this._hideAvatarMenu();
          this.scene.start('SettingsScene');
        },
      },
    ];

    const menuHeight = menuItems.length * itemHeight + 16;
    const menu = this.add.container(menuX, menuY);
    menu.setDepth(100);

    // 菜单背景
    const bg = this.add.graphics();
    bg.fillStyle(0x0a1f1c, 0.96);
    bg.fillRoundedRect(0, 0, itemWidth, menuHeight, 12);
    bg.lineStyle(1.5, 0xd4af37, 0.5);
    bg.strokeRoundedRect(0, 0, itemWidth, menuHeight, 12);
    menu.add(bg);

    // 菜单项
    menuItems.forEach((item, index) => {
      const y = 8 + index * itemHeight;
      const itemContainer = this.add.container(0, y);

      // 项背景（悬停用）
      const itemBg = this.add.graphics();
      itemBg.fillStyle(0xffffff, 0);
      itemBg.fillRoundedRect(4, 0, itemWidth - 8, itemHeight - 2, 8);
      itemContainer.add(itemBg);

      // 图标
      const iconText = this.add.text(14, itemHeight / 2 - 1, item.icon, {
        fontFamily: SERIF_FONT,
        fontSize: '18px',
        color: '#d4af37',
        fontStyle: 'bold',
      });
      iconText.setOrigin(0, 0.5);
      itemContainer.add(iconText);

      // 标签
      const labelText = this.add.text(40, itemHeight / 2 - 1, item.label, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#e6f3c6',
      });
      labelText.setOrigin(0, 0.5);
      itemContainer.add(labelText);

      // 热区
      const hit = this.add.zone(itemWidth / 2, itemHeight / 2, itemWidth - 8, itemHeight - 2);
      hit.setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.POINTER_OVER, () => {
        itemBg.clear();
        itemBg.fillStyle(0x1a3d38, 0.85);
        itemBg.fillRoundedRect(4, 0, itemWidth - 8, itemHeight - 2, 8);
        labelText.setColor('#fff6b8');
      });
      hit.on(Phaser.Input.Events.POINTER_OUT, () => {
        itemBg.clear();
        itemBg.fillStyle(0xffffff, 0);
        itemBg.fillRoundedRect(4, 0, itemWidth - 8, itemHeight - 2, 8);
        labelText.setColor('#e6f3c6');
      });
      hit.on(Phaser.Input.Events.POINTER_UP, item.onClick);
      itemContainer.add(hit);

      menu.add(itemContainer);
      this._avatarMenuItems.push(itemContainer);
    });

    this._avatarMenu = menu;
    this._uiLayer?.add(menu);

    // 点击菜单外部关闭
    const downHandler = (pointer: Phaser.Pointer) => {
      const inBounds = pointer.x >= menuX && pointer.x <= menuX + itemWidth && pointer.y >= menuY && pointer.y <= menuY + menuHeight;
      if (!inBounds) {
        this._hideAvatarMenu();
        this.input.off(Phaser.Input.Events.POINTER_DOWN, downHandler);
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_DOWN, downHandler);
  }

  private _hideAvatarMenu(): void {
    this._avatarMenu?.destroy(true);
    this._avatarMenu = undefined;
    this._avatarMenuItems = [];
  }

  // ========================================================================
  // 交互逻辑
  // ========================================================================

  private _enterRegion(region: RegionDefinition): void {
    if (this._currentRegion.id !== region.id) {
      this._currentRegion = region;
      this._currentLocation = region.locations[0];
      this._advanceDate(2);
      this._ensureTasks(this._currentLocation, true);
    }
    this._viewMode = 'region';
    this._drawScene();
    this._showToast(`已进入${region.name}`);
  }

  private _travelTo(location: RegionLocation): void {
    const previous = this._currentLocation;
    this._currentLocation = location;
    if (previous.id !== location.id) {
      this._advanceDate(location.travelDays);
      this._ensureTasks(location, true);
    }
    if (this._playerMarker) {
      this.tweens.add({
        targets: this._playerMarker,
        x: location.x + 54,
        y: location.y + 4,
        duration: 260,
        ease: 'Cubic.easeOut',
      });
    }
    this._updateHud();
    this._openLocationPanel(location);
    this._showToast(previous.id === location.id ? `已查看${location.name}` : `已前往${location.name}，耗时 ${location.travelDays} 日`);
    eventBus.emit(GameEventType.UI_PANEL_OPENED, { panel: `map_location_${location.id}` });
  }

  // ========================================================================
  // 面板
  // ========================================================================

  private _openLocationPanel(location: RegionLocation): void {
    const tasks = this._ensureTasks(location);
    const { panel, body } = this._createModal(location.name, location.subtitle);

    const icon = this.add.image(770, 140, NODE_TEXTURES[location.kind]);
    icon.setDisplaySize(126, 126);
    body.add(icon);

    const desc = this.add.text(46, 34, location.desc, {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#4b3d25',
      wordWrap: { width: 650 },
    });
    desc.setLineSpacing(8);
    body.add(desc);

    const detail = this.add.text(46, 132, [
      `所属：${this._currentRegion.name} · ${this._currentRegion.climate}`,
      `坐标：[${location.x}, ${location.y}] · 路程：约 ${location.travelDays} 日 · 危险 ${location.danger}`,
      `产出：${location.goods.join('、')}`,
      `常见人物：${location.people.join('、')}`,
    ].join('\n'), {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#2f7774',
    });
    detail.setLineSpacing(8);
    body.add(detail);

    const title = this.add.text(46, 255, '本地随机任务', {
      fontFamily: SERIF_FONT,
      fontSize: '22px',
      color: '#986624',
      fontStyle: 'bold',
    });
    body.add(title);

    tasks.slice(0, 3).forEach((task, index) => {
      this._taskRow(body, 46, 294 + index * 48, 760, task, () => {
        this._trackTask(task);
        this._closeModal();
        this._openTaskPanel();
      });
    });

    this._modalAction(panel, 78, 422, '刷新本地任务', () => {
      this._tasks.set(location.id, this._generateTasks(location));
      this._closeModal();
      this._openLocationPanel(location);
    });
    this._modalAction(panel, 248, 422, '附近的人', () => {
      this._closeModal();
      this._openPeoplePanel();
    });
  }

  private _openTaskPanel(): void {
    const { panel, body } = this._createModal('任务', `${this._currentRegion.name} · ${this._currentLocation.name}`);
    const tasks = this._ensureTasks(this._currentLocation);
    const summary = this.add.text(46, 34, `当前追踪：${this._trackedTask ? this._trackedTask.title : '暂无'}\n点击任务可设为追踪，本地任务会随地点刷新。`, {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#3f635c',
      wordWrap: { width: 760 },
    });
    summary.setLineSpacing(8);
    body.add(summary);

    tasks.forEach((task, index) => {
      this._taskRow(body, 46, 118 + index * 66, 830, task, () => {
        this._trackTask(task);
        this._closeModal();
        this._openTaskPanel();
        this._showToast(`已追踪：${task.title}`);
      }, true);
    });

    this._modalAction(panel, 78, 422, '刷新任务', () => {
      this._tasks.set(this._currentLocation.id, this._generateTasks(this._currentLocation));
      this._closeModal();
      this._openTaskPanel();
    });
  }

  private _openPeoplePanel(): void {
    const { body } = this._createModal('附近的人', this._currentLocation.name);
    const people = this._currentLocation.people.length ? this._currentLocation.people : ['路过散修'];
    people.forEach((name, index) => {
      const card = this.add.container(48, 54 + index * 78);
      const g = this.add.graphics();
      g.fillStyle(index === 0 ? 0x2a8f82 : 0xc07a18, 0.86);
      g.fillRoundedRect(0, 0, 360, 58, { tl: 18, tr: 0, bl: 18, br: 0 });
      card.add(g);
      const text = this.add.text(20, 13, name, { fontFamily: SERIF_FONT, fontSize: '22px', color: '#fff4c8' });
      card.add(text);
      const sub = this.add.text(20, 38, `${this._currentLocation.name}常驻修士`, { fontFamily: FONT, fontSize: '14px', color: '#fff0bd' });
      card.add(sub);
      body.add(card);
    });

    const info = this.add.text(470, 70, `这些人物会随你所在地点变化。\n后续可继续接入好感、传闻、交易与支线。`, {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#5a4a2c',
      wordWrap: { width: 420 },
    });
    info.setLineSpacing(10);
    body.add(info);
  }

  private _createModal(titleText: string, subtitleText: string): { panel: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container } {
    this._closeModal();
    const overlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.48);
    overlay.setOrigin(0);
    overlay.setInteractive({ useHandCursor: false });
    overlay.setDepth(50);

    const panel = this.add.container(120, 122);
    panel.setDepth(55);
    const bg = this.add.graphics();
    bg.fillStyle(0xf1e8c3, 0.96);
    bg.fillRoundedRect(0, 0, 1040, 456, 22);
    bg.lineStyle(3, 0xd4af37, 0.38);
    bg.strokeRoundedRect(0, 0, 1040, 456, 22);
    panel.add(bg);

    const title = this.add.text(42, 25, titleText, {
      fontFamily: SERIF_FONT,
      fontSize: '30px',
      color: '#217b73',
      fontStyle: 'bold',
    });
    panel.add(title);
    const sub = this.add.text(42, 62, subtitleText, {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#8a6a35',
    });
    panel.add(sub);

    const close = this.add.text(992, 34, '×', {
      fontFamily: FONT,
      fontSize: '42px',
      color: '#2e817c',
      fontStyle: 'bold',
    });
    close.setOrigin(0.5);
    close.setInteractive({ useHandCursor: true });
    close.on(Phaser.Input.Events.POINTER_UP, () => this._closeModal());
    panel.add(close);

    const body = this.add.container(0, 0);
    panel.add(body);
    this._modalLayer = this.add.container(0, 0, [overlay, panel]);
    this._modalLayer.setDepth(50);
    return { panel, body };
  }

  private _modalAction(panel: Phaser.GameObjects.Container, x: number, y: number, label: string, onClick: () => void): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x238a82, 0.92);
    g.fillRoundedRect(0, 0, 150, 42, 12);
    c.add(g);
    const t = this.add.text(75, 21, label, { fontFamily: SERIF_FONT, fontSize: '18px', color: '#fff4c7' });
    t.setOrigin(0.5);
    c.add(t);
    const hit = this.add.zone(75, 21, 150, 42);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_UP, onClick);
    c.add(hit);
    panel.add(c);
  }

  private _taskRow(container: Phaser.GameObjects.Container, x: number, y: number, w: number, task: LocalTask, onClick: () => void, expanded = false): void {
    const row = this.add.container(x, y);
    const active = task.status === '已追踪';
    const g = this.add.graphics();
    g.fillStyle(active ? 0x238a82 : 0xd49629, active ? 0.92 : 0.86);
    g.fillRoundedRect(0, 0, w, expanded ? 58 : 38, { tl: 14, tr: 0, bl: 14, br: 0 });
    g.fillStyle(0xffe0a0, 0.24);
    g.fillTriangle(w - 38, 0, w, 0, w - 20, (expanded ? 58 : 38) / 2);
    g.fillTriangle(w - 38, expanded ? 58 : 38, w, expanded ? 58 : 38, w - 20, (expanded ? 58 : 38) / 2);
    row.add(g);
    const badge = this.add.text(18, expanded ? 18 : 9, task.badge, { fontFamily: SERIF_FONT, fontSize: '18px', color: '#fff8cf', fontStyle: 'bold' });
    row.add(badge);
    const title = this.add.text(48, expanded ? 9 : 9, `${task.title}  ·  ${task.difficulty}`, { fontFamily: FONT, fontSize: '16px', color: '#fff8cf' });
    row.add(title);
    if (expanded) {
      const desc = this.add.text(48, 32, `${task.desc}  奖励：${task.reward}`, { fontFamily: FONT, fontSize: '13px', color: '#fff0bd', wordWrap: { width: w - 90 } });
      row.add(desc);
    } else {
      const reward = this.add.text(330, 9, `${task.reward}`, { fontFamily: FONT, fontSize: '14px', color: '#fff0bd' });
      row.add(reward);
    }
    const hit = this.add.zone(w / 2, (expanded ? 58 : 38) / 2, w, expanded ? 58 : 38);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_UP, onClick);
    row.add(hit);
    container.add(row);
  }

  private _closeModal(): void {
    this._modalLayer?.destroy(true);
    this._modalLayer = undefined;
  }

  private _ensureTasks(location: RegionLocation, force = false): LocalTask[] {
    if (force || !this._tasks.has(location.id)) {
      this._tasks.set(location.id, this._generateTasks(location));
    }
    return this._tasks.get(location.id) ?? [];
  }

  private _generateTasks(location: RegionLocation): LocalTask[] {
    const pool = TASK_BLUEPRINTS[location.kind];
    const tasks: LocalTask[] = [];
    for (let i = 0; i < 3; i++) {
      const blueprint = pool[(Phaser.Math.Between(0, pool.length - 1) + i) % pool.length];
      const rewardItem = location.goods[Phaser.Math.Between(0, Math.max(0, location.goods.length - 1))] || '灵石';
      tasks.push({
        id: `${location.id}-${this._dateSerial}-${i}-${Phaser.Math.Between(100, 999)}`,
        badge: blueprint.badge,
        title: `${location.name}${blueprint.title}`,
        desc: `${blueprint.desc}此地地貌为${this._currentRegion.climate}。`,
        reward: `${rewardItem} x${Phaser.Math.Between(1, 3)} / 灵石 ${Phaser.Math.Between(80, 280)}`,
        deadline: this._formatDate(this._dateSerial + Phaser.Math.Between(20, 90)),
        difficulty: blueprint.difficulty,
        locationId: location.id,
        status: '可接取',
      });
    }
    return tasks;
  }

  private _trackTask(task: LocalTask): void {
    const tasks = this._ensureTasks(this._currentLocation);
    tasks.forEach(item => {
      item.status = item.id === task.id ? '已追踪' : '可接取';
    });
    task.status = '已追踪';
    this._trackedTask = task;
    this._updateHud();
  }

  private _updateHud(): void {
    this._dateText?.setText(this._formatDate(this._dateSerial));
    const placeLabel = this._viewMode === 'world' ? '十域世界图 ▼' : `${this._currentRegion.shortName} · ${this._currentLocation.name} ▼`;
    this._placeText?.setText(placeLabel);
    this._taskText?.setText(this._trackedTask ? `追踪：${this._trackedTask.title}  截止 ${this._trackedTask.deadline}` : '暂无追踪任务，可在地点内接取');
    this._modeButtonText?.setText(this._viewMode === 'world' ? '返回区域' : '世界图');
  }

  private _advanceDate(days: number): void {
    this._dateSerial += Math.max(0, days);
  }

  private _formatDate(serial: number): string {
    const year = Math.floor(serial / 360);
    const dayOfYear = serial % 360;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    return `${year}年${month}月${day}日`;
  }

  private _showToast(message: string): void {
    const toast = this.add.container(GAME_W / 2, GAME_H - 58);
    toast.setDepth(100);
    const g = this.add.graphics();
    g.fillStyle(0x112b28, 0.93);
    g.fillRoundedRect(-260, -24, 520, 48, 18);
    g.lineStyle(1.5, 0xd4af37, 0.52);
    g.strokeRoundedRect(-260, -24, 520, 48, 18);
    toast.add(g);
    const t = this.add.text(0, 0, message, { fontFamily: FONT, fontSize: '18px', color: '#fff4bd' });
    t.setOrigin(0.5);
    toast.add(t);
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: GAME_H - 90,
      delay: 1300,
      duration: 420,
      onComplete: () => toast.destroy(true),
    });
  }

  private _bar(container: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, fill: number, bg: number, label: string): void {
    const g = this.add.graphics();
    g.fillStyle(bg, 0.9);
    g.fillRoundedRect(x, y, w, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    g.fillStyle(fill, 0.94);
    g.fillRoundedRect(x + 3, y + 2, w - 6, h - 4, { tl: 0, tr: 10, bl: 0, br: 10 });
    container.add(g);
    const t = this.add.text(x + 10, y + h / 2, label, {
      fontFamily: FONT,
      fontSize: h >= 15 ? '13px' : '11px',
      color: '#fff5d4',
      stroke: '#14322c',
      strokeThickness: 2,
    });
    t.setOrigin(0, 0.5);
    container.add(t);
  }
}
