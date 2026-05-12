import { BaseScene } from './BaseScene';
import {
  PROFESSIONS,
  TALENTS,
  WORLD_INTRO,
  WORLD_REGIONS,
  type CreationResult,
  type ProfessionOption,
  type RegionDefinition,
  type RegionId,
  type TalentOption,
} from '../data/world';

const FONT = '"Microsoft YaHei", "SimHei", sans-serif';
const SERIF_FONT = '"Microsoft YaHei", "KaiTi", "SimSun", serif';

export class CreationScene extends BaseScene {
  private _professionId = PROFESSIONS[0].id;
  private _talentId = TALENTS[0].id;
  private _birthRegionId: RegionId = 'central';
  private _professionCards: Phaser.GameObjects.Container[] = [];
  private _talentCards: Phaser.GameObjects.Container[] = [];
  private _regionCards: Phaser.GameObjects.Container[] = [];
  private _summaryText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CreationScene' });
  }

  create(): void {
    super.create();
    this._drawBackground();
    this._drawIntro();
    this._drawChoiceColumns();
    this._drawStartBar();
    this._refreshSelection();
  }

  private _drawBackground(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.add.rectangle(0, 0, w, h, 0x0a1713, 1).setOrigin(0);
    const map = this.add.image(w / 2, h / 2, 'world_ten_domains');
    map.setDisplaySize(w, h);
    map.setAlpha(0.32);

    const veil = this.add.graphics();
    veil.fillStyle(0x08130f, 0.62);
    veil.fillRect(0, 0, w, h);
    veil.fillStyle(0xf2df9a, 0.08);
    veil.fillRoundedRect(38, 34, w - 76, h - 68, 24);
    veil.lineStyle(2, 0xe5c66c, 0.28);
    veil.strokeRoundedRect(38, 34, w - 76, h - 68, 24);
  }

  private _drawIntro(): void {
    const title = this.add.text(70, 54, '十域开局', {
      fontFamily: SERIF_FONT,
      fontSize: '34px',
      color: '#f7e6a5',
      stroke: '#12342e',
      strokeThickness: 4,
    });
    const intro = this.add.text(70, 102, WORLD_INTRO, {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#dfebca',
      wordWrap: { width: 760 },
    });
    intro.setLineSpacing(7);

    const hint = this.add.text(920, 70, '选择职业、天赋与出生地后，将直接进入对应区域地图。世界地图需要进游戏后从“地图”按钮打开。', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#f1d98d',
      wordWrap: { width: 290 },
      align: 'left',
    });
    hint.setLineSpacing(8);
  }

  private _drawChoiceColumns(): void {
    this._drawColumnTitle(70, 215, '职业');
    PROFESSIONS.forEach((item, index) => {
      this._professionCards.push(this._choiceCard(70, 252 + index * 80, 285, 64, item.name, item.bonus, () => {
        this._professionId = item.id;
        this._refreshSelection();
      }));
    });

    this._drawColumnTitle(382, 215, '天赋');
    TALENTS.forEach((item, index) => {
      this._talentCards.push(this._choiceCard(382, 252 + index * 80, 285, 64, item.name, item.bonus, () => {
        this._talentId = item.id;
        this._refreshSelection();
      }));
    });

    this._drawColumnTitle(704, 215, '出生地');
    WORLD_REGIONS.forEach((region, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this._regionCards.push(this._choiceCard(704 + col * 238, 252 + row * 80, 220, 64, region.name, region.climate, () => {
        this._birthRegionId = region.id;
        this._refreshSelection();
      }));
    });
  }

  private _drawStartBar(): void {
    const panel = this.add.container(70, 640);
    const g = this.add.graphics();
    g.fillStyle(0x102d29, 0.92);
    g.fillRoundedRect(0, -48, 860, 78, 18);
    g.lineStyle(1.5, 0xd4af37, 0.42);
    g.strokeRoundedRect(0, -48, 860, 78, 18);
    panel.add(g);

    this._summaryText = this.add.text(22, -28, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#e9f1cf',
      wordWrap: { width: 660 },
    });
    panel.add(this._summaryText);

    const start = this._solidButton(990, 610, 220, 56, '入世修行', () => {
      const result: CreationResult = {
        professionId: this._professionId,
        talentId: this._talentId,
        birthRegionId: this._birthRegionId,
      };
      localStorage.setItem('xiuxian_v2_creation', JSON.stringify(result));
      this.switchScene('MapScene', result);
    });
    start.setDepth(20);
  }

  private _drawColumnTitle(x: number, y: number, text: string): void {
    const t = this.add.text(x, y, text, {
      fontFamily: SERIF_FONT,
      fontSize: '24px',
      color: '#f2d37f',
    });
    t.setOrigin(0, 0.5);
  }

  private _choiceCard(x: number, y: number, w: number, h: number, title: string, desc: string, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.setSize(w, h);
    const g = this.add.graphics();
    g.fillStyle(0x173f38, 0.72);
    g.fillRoundedRect(0, 0, w, h, 12);
    g.lineStyle(1.5, 0xd4af37, 0.18);
    g.strokeRoundedRect(0, 0, w, h, 12);
    c.add(g);

    const titleText = this.add.text(16, 11, title, {
      fontFamily: SERIF_FONT,
      fontSize: '20px',
      color: '#f7e8b2',
    });
    c.add(titleText);

    const descText = this.add.text(16, 36, desc, {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#b9cfb6',
      wordWrap: { width: w - 32 },
    });
    c.add(descText);

    const hit = this.add.zone(w / 2, h / 2, w, h);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_UP, onClick);
    c.add(hit);
    return c;
  }

  private _solidButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xd4a342, 0.96);
    g.fillRoundedRect(0, 0, w, h, 14);
    g.lineStyle(2, 0xffe0a0, 0.55);
    g.strokeRoundedRect(0, 0, w, h, 14);
    c.add(g);
    const t = this.add.text(w / 2, h / 2, label, {
      fontFamily: SERIF_FONT,
      fontSize: '24px',
      color: '#14342f',
      fontStyle: 'bold',
    });
    t.setOrigin(0.5);
    c.add(t);
    const hit = this.add.zone(w / 2, h / 2, w, h);
    hit.setInteractive({ useHandCursor: true });
    hit.on(Phaser.Input.Events.POINTER_UP, onClick);
    c.add(hit);
    return c;
  }

  private _refreshSelection(): void {
    this._highlightCards(this._professionCards, PROFESSIONS.findIndex(item => item.id === this._professionId));
    this._highlightCards(this._talentCards, TALENTS.findIndex(item => item.id === this._talentId));
    this._highlightCards(this._regionCards, WORLD_REGIONS.findIndex(item => item.id === this._birthRegionId));

    const profession = PROFESSIONS.find(item => item.id === this._professionId) as ProfessionOption;
    const talent = TALENTS.find(item => item.id === this._talentId) as TalentOption;
    const region = WORLD_REGIONS.find(item => item.id === this._birthRegionId) as RegionDefinition;
    this._summaryText?.setText(`${profession.name} · ${talent.name} · 出生于${region.name}\n${region.birthDesc}`);
  }

  private _highlightCards(cards: Phaser.GameObjects.Container[], activeIndex: number): void {
    cards.forEach((card, index) => {
      const g = card.getAt(0) as Phaser.GameObjects.Graphics;
      g.clear();
      const active = index === activeIndex;
      g.fillStyle(active ? 0x2a8f82 : 0x173f38, active ? 0.92 : 0.72);
      g.fillRoundedRect(0, 0, card.width || 1, card.height || 1, 12);
      g.lineStyle(active ? 2.4 : 1.5, active ? 0xffd36b : 0xd4af37, active ? 0.72 : 0.18);
      g.strokeRoundedRect(0, 0, card.width || 1, card.height || 1, 12);
    });
  }
}
