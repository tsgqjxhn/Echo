(function() {
"use strict";

/* ============================================================
   Audio Engine
   ============================================================ */
const AudioEngine = {
  ctx: null, bgmNodes: [], _inited: false,
  init() {
    if (this._inited) return; this._inited = true;
    try { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } catch (e) {}
  },
  _tone(f, d, v) {
    if (window.__ddSoundEnabled === false) return;
    try { if (!this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.frequency.value = f; o.start();
      g.gain.setValueAtTime(v, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
      o.stop(this.ctx.currentTime + d);
    } catch(e) {}
  },
  _noise(f, d, v, ft) {
    if (window.__ddSoundEnabled === false) return;
    try { if (!this.ctx) return;
      const len = this.ctx.sampleRate * d, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
      s.buffer = buf; filter.type = ft || 'lowpass'; filter.frequency.value = f;
      s.connect(filter); filter.connect(g); g.connect(this.ctx.destination);
      g.gain.setValueAtTime(v, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
      s.start(); s.stop(this.ctx.currentTime + d);
    } catch(e) {}
  },
  _sweep(f1, f2, d, v) {
    if (window.__ddSoundEnabled === false) return;
    try { if (!this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.frequency.setValueAtTime(f1, this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + d);
      g.gain.setValueAtTime(v, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
      o.start(); o.stop(this.ctx.currentTime + d);
    } catch(e) {}
  },
  playBuildPlace() { this._noise(200, 0.15, 0.3, 'lowpass'); this._tone(800, 0.05, 0.1); },
  playBuildUpgrade() { this._sweep(400, 1200, 0.4, 0.2); this._tone(1500, 0.1, 0.15); },
  playBuildSell() { this._noise(300, 0.12, 0.2, 'bandpass'); },
  playBedCoin() { this._tone(1200, 0.05, 0.08); setTimeout(() => this._tone(1600, 0.05, 0.06), 50); },
  playTowerFire() { this._noise(600, 0.08, 0.15, 'highpass'); this._tone(200, 0.03, 0.1); },
  playMonsterHit() { this._noise(100, 0.1, 0.25, 'lowpass'); },
  playDoorHit() { this._noise(80, 0.12, 0.3, 'lowpass'); },
  playWaveStart() { this._sweep(200, 800, 0.6, 0.2); },
  playGameOver() { this._sweep(600, 100, 1.2, 0.3); }
};

/* ============================================================
   Constants
   ============================================================ */
const TILE_SIZE = 48;
const MAP_COLS = 9;
const MAP_ROWS = 13;
const DOOR_COL = 4;
const DOOR_ROW = 8;

const Tile = { EMPTY: 0, FLOOR: 1, WALL: 2, DOOR: 3, CORRIDOR: 4 };
const BuildingType = { BED: 'bed', TOWER: 'tower', GENERATOR: 'generator', REPAIRMAN: 'repairman', ICE_MAGE: 'ice_mage', BOMBER: 'bomber', SNIPER: 'sniper', ALTAR: 'altar' };
const Phase = { MENU: 'menu', DAY: 'day', NIGHT: 'night', WAVE_COMPLETE: 'wave_complete', GAME_OVER: 'game_over' };
const GameMode = { LEVELS: 'levels', ENDLESS: 'endless' };
const MonsterState = { IDLE: 'idle', MOVING: 'moving', ATTACKING: 'attacking', RETREATING: 'retreating', DEAD: 'dead' };

const BUILDING_DEFS = {
  bed:          { name: '床铺',    baseCost: 50,  color: '#F5DEB3', hp: 50,  income: 2,   incomeInc: 1.5 },
  tower:        { name: '防御塔',  baseCost: 100, color: '#4682B4', hp: 80,  dmg: 15,  dmgInc: 5,  range: 3.5, rangeInc: 0.3, interval: 1.0 },
  generator:    { name: '发电机',  baseCost: 150, color: '#DAA520', hp: 60,  boost: 0.50 },
  repairman:    { name: '修理工',  baseCost: 120, color: '#44AA44', hp: 60,  repair: 1,  repairInc: 1 },
  ice_mage:     { name: '冰冻师',  baseCost: 150, color: '#88CCFF', hp: 70,  dmg: 15,  dmgInc: 5,  range: 3.5, rangeInc: 0.3, interval: 1.2, slow: 0.30 },
  bomber:       { name: '爆破塔',  baseCost: 200, color: '#FF6B35', hp: 70,  dmg: 8,   dmgInc: 3,  range: 2.5, rangeInc: 0.2, interval: 2.0, splash: 0.5, splashRange: 1 },
  sniper:       { name: '狙击塔',  baseCost: 250, color: '#9B59B6', hp: 50,  dmg: 30,  dmgInc: 8,  range: 4.5, rangeInc: 0.3, interval: 3.5, critRate: 0.30, critMult: 2 },
  altar:        { name: '祭坛',    baseCost: 180, color: '#E74C3C', hp: 100, aspdAura: 0.15, speedAura: 0.10, auraRange: 2.5 },
  electric_coil:{ name: '电弧线圈', baseCost: 220, color: '#55C7FF', hp: 65,  dmg: 12,  dmgInc: 4,  range: 3.2, rangeInc: 0.25, interval: 1.4, chainCount: 2, chainDamage: 0.55, chainRange: 1.4 },
  flame_turret: { name: '火焰喷灯', baseCost: 180, color: '#FF9A3D', hp: 75,  dmg: 6,   dmgInc: 2,  range: 2.2, rangeInc: 0.15, interval: 0.7, burn: 4, burnInc: 1.2, burnDuration: 3 },
  purifier:     { name: '净化灯',  baseCost: 210, color: '#BFFBFF', hp: 60,  dmg: 18,  dmgInc: 5,  range: 3.8, rangeInc: 0.2, interval: 1.8, pierceReduction: 0.35 }
};

const ATTACK_BUILDING_TYPES = new Set(['tower', 'ice_mage', 'bomber', 'sniper', 'electric_coil', 'flame_turret', 'purifier']);

const BASE_DOOR_HP = 150;
const DOOR_UPGRADE_COST_BASE = 80;
const MAX_LEVEL = 10;
const PRESTIGE_COST_BASE = 1e6;
const SAVE_KEY = 'dark_dorm_save_v1';
const BASE_GOLD_INCOME = 2;

/* ============================================================
   Level Wave Configurations
   ============================================================ */
const LEVEL_WAVES = [
  null,
  [{ monsters: [{ type: 'ghost', count: 2 }] }],
  [{ monsters: [{ type: 'ghost', count: 3 }] }, { monsters: [{ type: 'ghost', count: 2 }], delay: 8 }],
  [{ monsters: [{ type: 'ghost', count: 4 }] }, { monsters: [{ type: 'ghostfemale', count: 2 }], delay: 10 }],
  [{ monsters: [{ type: 'ghost', count: 3 }] }, { monsters: [{ type: 'zombie', count: 2 }], delay: 12 }],
  [{ monsters: [{ type: 'ghost', count: 4 }] }, { monsters: [{ type: 'ghostfemale', count: 2 }, { type: 'zombie_runner', count: 2 }], delay: 8 }, { monsters: [{ type: 'ghost', count: 3 }], delay: 16 }],
  [{ monsters: [{ type: 'zombie', count: 2 }, { type: 'zombie_runner', count: 2 }] }, { monsters: [{ type: 'ghostfemale', count: 3 }], delay: 10 }],
  [{ monsters: [{ type: 'shadow', count: 2 }] }, { monsters: [{ type: 'zombie_toxic', count: 2 }, { type: 'ghost', count: 4 }], delay: 8 }],
  [{ monsters: [{ type: 'ghostfemale', count: 4 }] }, { monsters: [{ type: 'zombie_brute', count: 1 }, { type: 'zombie', count: 2 }], delay: 10 }, { monsters: [{ type: 'shadow', count: 2 }, { type: 'zombie_toxic', count: 2 }], delay: 18 }],
  [{ monsters: [{ type: 'zombie_brute', count: 2 }, { type: 'zombie', count: 3 }] }, { monsters: [{ type: 'shadow', count: 3 }, { type: 'zombie_runner', count: 3 }], delay: 10 }, { monsters: [{ type: 'ghostfemale', count: 4 }, { type: 'zombie_toxic', count: 2 }], delay: 20 }],
  [{ monsters: [{ type: 'ghost', count: 5 }, { type: 'zombie_runner', count: 3 }] }, { monsters: [{ type: 'zombie_brute', count: 2 }, { type: 'zombie', count: 3 }], delay: 8 }, { monsters: [{ type: 'shadow', count: 4 }, { type: 'ghostfemale', count: 3 }, { type: 'zombie_toxic', count: 3 }], delay: 16 }]
];

function defaultSave() {
  return { prestigePoints: 0, prestigeUpgrades: { goldMult: 0, doorHp: 0, towerDmg: 0 }, highestWave: 0, totalGames: 0, lastSaveTime: 0, unlockedLevel: MAX_LEVEL, completedLevels: [], endlessRun: null };
}

function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const d = JSON.parse(raw); const data = Object.assign(defaultSave(), d); data.prestigeUpgrades = { goldMult: 0, doorHp: 0, towerDmg: 0, ...(data.prestigeUpgrades || {}) }; return data; } } catch (_) {}
  return defaultSave();
}

function saveSave(data) {
  try { data.lastSaveTime = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (_) {}
}

/* ============================================================
   Utilities
   ============================================================ */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }

/* ============================================================
   TileMap
   ============================================================ */
class TileMap {
  constructor() {
    this.width = MAP_COLS; this.height = MAP_ROWS; this.tiles = [];
    for (let r = 0; r < MAP_ROWS; r++) { this.tiles[r] = []; for (let c = 0; c < MAP_COLS; c++) this.tiles[r][c] = this.classify(c, r); }
  }
  classify(c, r) {
    if (c === 0 || c === MAP_COLS - 1 || r === 0) return Tile.WALL;
    if (r >= 1 && r <= 7) return Tile.FLOOR;
    if (r === DOOR_ROW) return c === DOOR_COL ? Tile.DOOR : Tile.WALL;
    if (r > DOOR_ROW) return Tile.CORRIDOR;
    return Tile.WALL;
  }
  getTile(c, r) { if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return Tile.WALL; return this.tiles[r][c]; }
  isBuildable(c, r) { return this.getTile(c, r) === Tile.FLOOR; }
  isWalkable(c, r) { const t = this.getTile(c, r); return t === Tile.CORRIDOR || t === Tile.DOOR; }
}

/* ============================================================
   Building
   ============================================================ */
class Building {
  constructor(type, pos, prestigeUpgrades) {
    this.type = type; this.pos = { ...pos }; this.level = 1;
    const def = BUILDING_DEFS[type];
    this.maxHp = def.hp; this.hp = this.maxHp;
    this.totalInvested = def.baseCost;
    this.fireTimer = 0; this.incomeTimer = 0; this.animTimer = 0; this.upgradeTimer = 0; this.target = null;
    this.prestigeUpgrades = prestigeUpgrades || { towerDmg: 0 };
  }
  getUpgradeCost() { return Math.floor(BUILDING_DEFS[this.type].baseCost * Math.pow(1.6, this.level - 1)); }
  upgrade() { this.level++; this.maxHp += Math.floor(this.maxHp * 0.2); this.hp = this.maxHp; }
  getIncomeRate() { return BUILDING_DEFS[this.type].income + (this.level - 1) * BUILDING_DEFS[this.type].incomeInc; }
  getDamage() { const base = BUILDING_DEFS[this.type].dmg + (this.level - 1) * BUILDING_DEFS[this.type].dmgInc; return Math.floor(base * (1 + this.prestigeUpgrades.towerDmg * 0.15)); }
  getRange() { return BUILDING_DEFS[this.type].range + (this.level - 1) * BUILDING_DEFS[this.type].rangeInc; }
  getInterval() { return BUILDING_DEFS[this.type].interval; }
  getRepairRate() { return BUILDING_DEFS[this.type].repair + (this.level - 1) * BUILDING_DEFS[this.type].repairInc; }
  getSlowFactor() { return BUILDING_DEFS[this.type].slow || 0; }
  getSplash() { return BUILDING_DEFS[this.type].splash || 0; }
  getSplashRange() { return BUILDING_DEFS[this.type].splashRange || 0; }
  getCritRate() { return BUILDING_DEFS[this.type].critRate || 0; }
  getCritMult() { return BUILDING_DEFS[this.type].critMult || 1; }
  getChainCount() { return BUILDING_DEFS[this.type].chainCount || 0; }
  getChainDamage() { return BUILDING_DEFS[this.type].chainDamage || 0; }
  getChainRange() { return BUILDING_DEFS[this.type].chainRange || 0; }
  getBurnDamage() { return (BUILDING_DEFS[this.type].burn || 0) + (this.level - 1) * (BUILDING_DEFS[this.type].burnInc || 0); }
  getBurnDuration() { return BUILDING_DEFS[this.type].burnDuration || 0; }
  getPierceReduction() { return BUILDING_DEFS[this.type].pierceReduction || 0; }
  getBoostMultiplier() {
    if (this.type !== 'generator') return 0;
    return BUILDING_DEFS.generator.boost + (this.level - 1) * 0.08;
  }
  getAuraASPD() { return BUILDING_DEFS[this.type].aspdAura || 0; }
  getAuraSpeed() { return BUILDING_DEFS[this.type].speedAura || 0; }
  getAuraRange() { return BUILDING_DEFS[this.type].auraRange || 0; }
}

/* ============================================================
   Monster Base Class
   ============================================================ */
class Monster {
  constructor(wave, difficultyMult) {
    this.wave = wave; this.difficultyMult = difficultyMult;
    this.state = MonsterState.MOVING;
    this.pos = { x: DOOR_COL + rand(-0.3, 0.3), y: MAP_ROWS - 0.5 };
    this.targetPos = { x: DOOR_COL + 0.5, y: DOOR_ROW + 0.5 };
    this.hp = 0; this.maxHp = 0; this.atk = 0; this.speed = 1.8;
    this.attackInterval = 0.8; this.attackTimer = 0;
    this.retreatThreshold = 0.08; this.retreatRegen = 0.04;
    this.damageReduction = 0; this.type = 'ghost';
    this.flashTimer = 0; this.slowTimer = 0; this.slowFactor = 1;
    this.burnTimer = 0; this.burnDps = 0;
    this.deadTimer = 0; this.animFrame = 0; this.animTimer2 = 0;
    this._initStats();
    this.hp = this.maxHp;
  }
  _initStats() {
    this.maxHp = (200 + (this.wave - 1) * 80) * this.difficultyMult;
    this.atk = (10 + (this.wave - 1) * 3) * this.difficultyMult;
    this.speed = 1.8; this.attackInterval = 0.8;
    this.retreatThreshold = 0.08; this.retreatRegen = 0.04;
  }
  getEffectiveSpeed() { return this.speed * (this.state === MonsterState.RETREATING ? 1.5 : 1) * this.slowFactor; }
  update(dt, game) {
    if (this.state === MonsterState.DEAD) { this.deadTimer += dt; return; }
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.slowTimer > 0) { this.slowTimer -= dt; if (this.slowTimer <= 0) this.slowFactor = 1; }
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= this.burnDps * dt;
      this.flashTimer = Math.max(this.flashTimer, 0.05);
      if (this.hp <= 0) {
        this.hp = 0; this.state = MonsterState.DEAD; this.deadTimer = 0;
        game._onMonsterKill(this);
        return;
      }
    }
    // Apply altar slow aura globally via game calculation, handled separately
    if (this.state === MonsterState.MOVING) {
      const s = this.getEffectiveSpeed() * game.getGlobalMonsterSpeedMult();
      const dx = this.targetPos.x - this.pos.x, dy = this.targetPos.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= s * dt) { this.pos.x = this.targetPos.x; this.pos.y = this.targetPos.y; this.state = MonsterState.ATTACKING; }
      else { this.pos.x += (dx / d) * s * dt; this.pos.y += (dy / d) * s * dt; }
    } else if (this.state === MonsterState.ATTACKING) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackInterval) { this.attackTimer = 0; this._attackDoor(game); }
      if (this.hp / this.maxHp <= this.retreatThreshold) this.state = MonsterState.RETREATING;
    } else if (this.state === MonsterState.RETREATING) {
      const s = this.getEffectiveSpeed() * game.getGlobalMonsterSpeedMult();
      const retreatTarget = { x: DOOR_COL + 0.5, y: MAP_ROWS - 0.5 };
      const dx = retreatTarget.x - this.pos.x, dy = retreatTarget.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.retreatRegen * dt);
      if (this.hp / this.maxHp >= 0.5) { this.state = MonsterState.MOVING; }
      else if (d > 0.1) { this.pos.x += (dx / d) * s * dt; this.pos.y += (dy / d) * s * dt; }
    }
    this.animTimer2 += dt;
    if (this.animTimer2 > 0.25) { this.animTimer2 -= 0.25; this.animFrame = (this.animFrame + 1) % 4; }
  }
  _attackDoor(game) {
    const dmg = this.atk;
    game.damageDoor(dmg);
    AudioEngine.playDoorHit();
  }
  takeDamage(rawDmg) {
    const dmg = rawDmg * (1 - this.damageReduction);
    this.hp -= dmg; this.flashTimer = 0.1;
    if (this.hp <= 0) { this.hp = 0; this.state = MonsterState.DEAD; this.deadTimer = 0; return true; }
    return false;
  }
  applySlow(factor, duration) { if (factor < this.slowFactor) { this.slowFactor = factor; this.slowTimer = duration; } }
  applyBurn(dps, duration) { if (dps >= this.burnDps || duration > this.burnTimer) { this.burnDps = Math.max(this.burnDps, dps); this.burnTimer = Math.max(this.burnTimer, duration); } }
}

class Ghost extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'ghost'; }
}

class GhostFemale extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'ghostfemale'; }
  _initStats() {
    super._initStats();
    this.maxHp *= 2 / 3; this.atk *= 2; this.speed = 1.8;
    this.retreatRegen = 0.01; // 1% regen all time, handled in update via extra tick
  }
  update(dt, game) {
    if (this.state !== MonsterState.DEAD) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.01 * dt); }
    super.update(dt, game);
  }
  takeDamage(rawDmg) { return super.takeDamage(rawDmg * 2); }
}

class ZombieGhost extends Monster {
  constructor(wave, difficultyMult, level) { super(wave, difficultyMult); this.type = 'zombie'; this.zombieLevel = level || 1; this.damageReduction = Math.min(0.30 + this.zombieLevel * 0.02, 0.50); }
  _initStats() {
    super._initStats(); this.maxHp *= 2; this.atk *= 0.8; this.speed = 1.4;
    const level = this.zombieLevel || 1;
    this.damageReduction = Math.min(0.30 + level * 0.02, 0.50);
    this.retreatRegen = 0.05 + Math.min((this.wave - 1) * 0.005, 0.15);
  }
}

class ZombieRunner extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'zombie_runner'; }
  _initStats() {
    super._initStats();
    this.maxHp *= 0.75; this.atk *= 1.15; this.speed = 2.45;
    this.damageReduction = 0.10; this.retreatThreshold = 0.12; this.retreatRegen = 0.03;
  }
}

class ZombieBrute extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'zombie_brute'; }
  _initStats() {
    super._initStats();
    this.maxHp *= 3.1; this.atk *= 1.45; this.speed = 0.95;
    this.damageReduction = 0.45; this.attackInterval = 1.15; this.retreatThreshold = 0.05; this.retreatRegen = 0.035;
  }
}

class ZombieToxic extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'zombie_toxic'; }
  _initStats() {
    super._initStats();
    this.maxHp *= 1.45; this.atk *= 0.9; this.speed = 1.35;
    this.damageReduction = 0.22; this.retreatRegen = 0.045;
  }
  _attackDoor(game) {
    super._attackDoor(game);
    game.damageDoor(Math.max(2, this.atk * 0.25));
    game.addParticle(this.pos.x * TILE_SIZE + TILE_SIZE / 2, this.pos.y * TILE_SIZE + TILE_SIZE / 2, '#baff3d', 0.8);
  }
}

class ShadowGhost extends Monster {
  constructor(wave, difficultyMult) { super(wave, difficultyMult); this.type = 'shadow'; }
  _initStats() {
    super._initStats(); this.maxHp *= 0.9; this.atk *= 1.1; this.speed = 2.0; this.damageReduction = 0.30;
    this.retreatRegen = 0.04; this.sabotageTimer = 5;
  }
  update(dt, game) {
    if (this.state !== MonsterState.DEAD) {
      this.sabotageTimer -= dt;
      if (this.sabotageTimer <= 0) { this.sabotageTimer = 5; this._sabotage(game); }
    }
    super.update(dt, game);
  }
  _sabotage(game) {
    // Try to destroy a bed first, then random building
    const beds = game.buildings.filter(b => b.type === 'bed');
    let target = beds.length > 0 ? beds[Math.floor(Math.random() * beds.length)] : (game.buildings.length > 0 ? game.buildings[Math.floor(Math.random() * game.buildings.length)] : null);
    if (target) {
      target.hp -= target.maxHp * 0.3;
      game.addParticle(target.pos.x * TILE_SIZE + TILE_SIZE / 2, target.pos.y * TILE_SIZE + TILE_SIZE / 2, '#e74c3c', 10);
      if (target.hp <= 0) game.removeBuildingAt(target.pos.x, target.pos.y);
    }
  }
}

/* ============================================================
   Projectile
   ============================================================ */
class Projectile {
  constructor(from, to, damage, type, extra, target = null) {
    this.from = { ...from }; this.to = { ...to }; this.damage = damage; this.type = type;
    this.pos = { x: from.x * TILE_SIZE, y: from.y * TILE_SIZE }; this.speed = 20; this.dead = false; this.extra = extra || {};
    this.target = target;
    const toCx = to.x + 0.5, toCy = to.y + 0.5;
    const dx = toCx - from.x, dy = toCy - from.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vel = { x: (dx / d) * this.speed, y: (dy / d) * this.speed };
  }
  update(dt) {
    const lastPos = { x: this.pos.x, y: this.pos.y };
    if (this.target && this.target.state !== MonsterState.DEAD) {
      this.to = { ...this.target.pos };
      this.from = { x: this.pos.x / TILE_SIZE, y: this.pos.y / TILE_SIZE };
      const targetCx = this.to.x + 0.5, targetCy = this.to.y + 0.5;
      const dx = targetCx - this.from.x, dy = targetCy - this.from.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vel = { x: (dx / d) * this.speed, y: (dy / d) * this.speed };
    }
    this.pos.x += this.vel.x * TILE_SIZE * dt; this.pos.y += this.vel.y * TILE_SIZE * dt;
    const targetPxX = (this.to.x + 0.5) * TILE_SIZE;
    const targetPxY = (this.to.y + 0.5) * TILE_SIZE;
    const dx = targetPxX - this.pos.x;
    const dy = targetPxY - this.pos.y;
    const distNow = Math.hypot(dx, dy);
    if (distNow < 10) {
      this.dead = true;
    } else {
      const dxLast = targetPxX - lastPos.x;
      const dyLast = targetPxY - lastPos.y;
      const distLast = Math.hypot(dxLast, dyLast);
      const maxMovePerFrame = this.speed * TILE_SIZE * dt;
      if (distNow > distLast && distLast < maxMovePerFrame * 1.5) {
        this.dead = true;
        this.pos.x = targetPxX;
        this.pos.y = targetPxY;
      }
    }
  }
}

/* ============================================================
   Particle
   ============================================================ */
class Particle {
  constructor(x, y, color, life) {
    this.x = x; this.y = y; this.color = color; this.life = life; this.maxLife = life;
    this.vx = rand(-30, 30); this.vy = rand(-30, 30); this.size = rand(2, 5);
  }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; this.size *= 0.98; }
}

/* ============================================================
   WaveManager
   ============================================================ */
class WaveManager {
  constructor(game) { this.game = game; this.wave = 0; this.subWaves = []; this.active = false; this.spawnQueue = []; this.spawnTimer = 0; this.countdown = 0; this.totalMonstersThisWave = 0; this.killedThisWave = 0; }
  startLevelWave(level) { this.wave = level; this.active = true; this.killedThisWave = 0; this.countdown = 30 + (level - 1) * 5; this._prepareSubWaves(LEVEL_WAVES[level]); }
  startEndlessWave(wave) { this.wave = wave; this.active = true; this.killedThisWave = 0; this.countdown = 30 + (wave - 1) * 5; const cfg = this._generateEndless(wave); this._prepareSubWaves(cfg); }
  _prepareSubWaves(cfg) { this.subWaves = []; this.spawnQueue = []; this.totalMonstersThisWave = 0;
    let baseDelay = 0;
    for (const sw of cfg) {
      const delay = (sw.delay || 0) + baseDelay;
      for (const m of sw.monsters) { this.totalMonstersThisWave += m.count; }
      this.subWaves.push({ monsters: sw.monsters, delay: delay, spawned: false });
      baseDelay = delay;
    }
  }
  _generateEndless(wave) {
    const diff = window.__difficultyMonsterMult || 1;
    let monsters = [];
    if (wave <= 3) { monsters = [{ type: 'ghost', count: 2 + wave }]; }
    else if (wave <= 6) { monsters = [{ type: 'ghost', count: 3 + wave }, { type: 'zombie', count: 1 + Math.floor(wave / 2) }, { type: 'zombie_runner', count: Math.max(1, wave - 4) }]; }
    else if (wave <= 9) { monsters = [{ type: 'ghost', count: 3 + wave }, { type: 'zombie', count: 1 + Math.floor(wave / 2) }, { type: 'zombie_runner', count: Math.floor(wave / 2) }, { type: 'zombie_toxic', count: Math.floor(wave / 3) }, { type: 'shadow', count: Math.floor(wave / 3) }]; }
    else {
      const density = Math.min(3 + Math.floor((wave - 10) / 2), 8);
      monsters = [{ type: 'ghost', count: density + 2 }, { type: 'zombie', count: density }, { type: 'zombie_runner', count: density }, { type: 'zombie_toxic', count: Math.floor(density * 0.75) }, { type: 'zombie_brute', count: Math.max(1, Math.floor(density / 3)) }, { type: 'shadow', count: Math.floor(density / 2) }, { type: 'ghostfemale', count: Math.floor(density / 2) }];
    }
    // Split into up to 3 sub-waves
    const result = [];
    const chunkSize = Math.ceil(monsters.length / 3);
    for (let i = 0; i < monsters.length; i += chunkSize) {
      const chunk = monsters.slice(i, i + chunkSize);
      result.push({ monsters: chunk, delay: i === 0 ? 0 : 8 + (i / chunkSize) * 8 });
    }
    return result;
  }
  update(dt) {
    if (!this.active) return;
    // Countdown before first spawn (DAY preparation)
    if (this.countdown > 0) {
      this.countdown -= dt;
      const remaining = Math.max(0, Math.ceil(this.countdown));
      this.game.ui.setWaveInfoText('白天准备中 ' + remaining + 's');
      this.game.ui.setCountdown(remaining + 's');
      if (this.countdown <= 0) {
        this.game.phase = Phase.NIGHT;
        const label = this.game.mode === GameMode.LEVELS ? ('第 ' + this.game.currentLevel + ' 关开始') : ('第 ' + this.wave + ' 夜');
        this.game.ui.showWaveBanner(label);
        AudioEngine.playWaveStart();
      }
      return;
    }
    // Spawn logic
    for (const sw of this.subWaves) {
      if (sw.spawned) continue;
      sw.delay -= dt;
      if (sw.delay <= 0) {
        sw.spawned = true;
        for (const m of sw.monsters) {
          for (let i = 0; i < m.count; i++) this.spawnQueue.push({ type: m.type, timer: i * 0.6 });
        }
      }
    }
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].timer <= this.spawnTimer) {
        const entry = this.spawnQueue.shift(); this.spawnTimer = 0;
        this._spawn(entry.type);
      }
    }
    // Check wave complete
    const allSpawned = this.subWaves.every(sw => sw.spawned);
    const alive = this.game.monsters.filter(m => m.state !== MonsterState.DEAD).length;
    if (allSpawned && this.spawnQueue.length === 0 && alive === 0) { this._waveComplete(); }
  }
  _spawn(type) {
    const diff = window.__difficultyMonsterMult || 1;
    let m;
    switch (type) {
      case 'ghostfemale': m = new GhostFemale(this.wave, diff); break;
      case 'zombie': m = new ZombieGhost(this.wave, diff, this.game.currentLevel || 1); break;
      case 'zombie_runner': m = new ZombieRunner(this.wave, diff); break;
      case 'zombie_brute': m = new ZombieBrute(this.wave, diff); break;
      case 'zombie_toxic': m = new ZombieToxic(this.wave, diff); break;
      case 'shadow': m = new ShadowGhost(this.wave, diff); break;
      default: m = new Ghost(this.wave, diff);
    }
    this.game.monsters.push(m);
  }
  _waveComplete() {
    this.active = false;
    this.game.onWaveComplete(this.wave);
  }
}

/* ============================================================
   Renderer
   ============================================================ */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nightAlpha = 0;
    this.monsterImgs = {};
    this.buildingImgs = {};
    this.wallPattern = null;
    const monsterImgMap = { ghost: './assets/sprites/ghost_portrait.webp', ghostfemale: './assets/sprites/ghostfemale_portrait.webp', zombie: './assets/sprites/zombie_portrait.webp', zombie_runner: './assets/sprites/ghost_variant_zombie_runner.webp', zombie_brute: './assets/sprites/ghost_variant_zombie_brute.webp', zombie_toxic: './assets/sprites/ghost_variant_zombie_toxic.webp', shadow: './assets/sprites/shadow_portrait.webp' };
    for (const type in monsterImgMap) { const img = new Image(); img.onerror = () => { console.warn('Failed to load monster sprite:', type, monsterImgMap[type]); }; img.src = monsterImgMap[type]; this.monsterImgs[type] = img; }
    const buildingImgMap = { bed: './assets/buildings/building_bed.webp', tower: './assets/buildings/building_tower.webp', generator: './assets/buildings/building_generator.webp', repairman: './assets/buildings/building_repairman.webp', ice_mage: './assets/buildings/building_ice_mage.webp', bomber: './assets/buildings/building_bomber.webp', sniper: './assets/buildings/building_sniper.webp', altar: './assets/buildings/building_altar.webp', electric_coil: './assets/buildings/building_electric_coil.webp', flame_turret: './assets/buildings/building_flame_turret.webp', purifier: './assets/buildings/building_purifier.webp' };
    for (const type in buildingImgMap) { const img = new Image(); img.onerror = () => { console.warn('Failed to load building sprite:', type, buildingImgMap[type]); }; img.src = buildingImgMap[type]; this.buildingImgs[type] = img; }
    this._createWallPattern();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  _createWallPattern() {
    const size = 48;
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const octx = off.getContext('2d');
    // base grey
    octx.fillStyle = '#808080';
    octx.fillRect(0, 0, size, size);
    // random gravel dots and rects
    const shades = ['#666666', '#999999', '#555555', '#aaaaaa', '#777777'];
    for (let i = 0; i < 28; i++) {
      octx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      const w = 1 + Math.random() * 3;
      const h = 1 + Math.random() * 3;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      if (Math.random() < 0.5) { octx.fillRect(x, y, w, h); }
      else { octx.beginPath(); octx.arc(x, y, Math.max(1, w / 2), 0, Math.PI * 2); octx.fill(); }
    }
    this.wallPattern = this.ctx.createPattern(off, 'repeat');
  }
  resize() {
    this.canvas.width = MAP_COLS * TILE_SIZE;
    this.canvas.height = MAP_ROWS * TILE_SIZE;
  }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  drawMap(game) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = game.map.getTile(c, r);
        const x = c * TILE_SIZE, y = r * TILE_SIZE;
        if (t === Tile.WALL) {
          if (this.wallPattern) { ctx.fillStyle = this.wallPattern; } else { ctx.fillStyle = '#808080'; }
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#555555'; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
        else if (t === Tile.FLOOR) { ctx.fillStyle = '#C4956A'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#a87b56'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1); }
        else if (t === Tile.DOOR) { ctx.fillStyle = '#6b5b4f'; ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4); ctx.fillStyle = '#8b7355'; ctx.fillRect(x + 8, y + 10, TILE_SIZE - 16, TILE_SIZE - 20); ctx.strokeStyle = '#a09080'; ctx.lineWidth = 1; ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4); }
        else if (t === Tile.CORRIDOR) { ctx.fillStyle = '#0d1b3e'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#1a2a55'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1); }
      }
    }
  }
  drawBuildings(game) {
    const ctx = this.ctx;
    for (const b of game.buildings) {
      const x = b.pos.x * TILE_SIZE, y = b.pos.y * TILE_SIZE;
      const def = BUILDING_DEFS[b.type];
      const img = this.buildingImgs[b.type];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
      } else {
        ctx.fillStyle = def.color; ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.strokeStyle = '#fff8'; ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
      }
      // Level badge
      ctx.fillStyle = '#000a'; ctx.fillRect(x + 6, y + 6, 14, 14);
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(String(b.level), x + 9, y + 17);
      // HP bar
      const hpPct = b.hp / b.maxHp;
      ctx.fillStyle = '#333'; ctx.fillRect(x + 6, y + TILE_SIZE - 10, TILE_SIZE - 12, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#4a4' : hpPct > 0.25 ? '#cc4' : '#c44';
      ctx.fillRect(x + 6, y + TILE_SIZE - 10, (TILE_SIZE - 12) * hpPct, 4);
    }
  }
  drawMonsters(game) {
    const ctx = this.ctx;
    const monsterSizes = { ghost: 36, ghostfemale: 36, zombie: 38, zombie_runner: 36, zombie_brute: 48, zombie_toxic: 38, shadow: 36 };
    for (const m of game.monsters) {
      if (m.state === MonsterState.DEAD) continue;
      const cx = m.pos.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = m.pos.y * TILE_SIZE + TILE_SIZE / 2;
      const img = this.monsterImgs[m.type];
      const size = monsterSizes[m.type] || 36;
      let drawn = false;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        drawn = true;
      }
      if (!drawn) {
        // Fallback: procedural drawing
        const colors = { ghost: '#ccf', ghostfemale: '#f8c', zombie: '#8f8', zombie_runner: '#b6ff86', zombie_brute: '#d0ff9c', zombie_toxic: '#c7ff4a', shadow: '#a6f' };
        const color = colors[m.type] || '#ccf';
        const radius = size / 3;
        // Body
        ctx.fillStyle = m.flashTimer > 0 ? '#fff' : color;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
        // Glow effect
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - radius * 0.3, cy - radius * 0.15, radius * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + radius * 0.3, cy - radius * 0.15, radius * 0.15, 0, Math.PI * 2); ctx.fill();
      }
      // HP bar (positioned relative to monster size)
      const hpPct = m.hp / m.maxHp;
      const barW = size * 0.7;
      const barY = cy - size / 2 - 6;
      ctx.fillStyle = '#333'; ctx.fillRect(cx - barW / 2, barY, barW, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#4a4' : hpPct > 0.25 ? '#cc4' : '#c44';
      ctx.fillRect(cx - barW / 2, barY, barW * hpPct, 4);
    }
  }
  drawProjectiles(game) {
    const ctx = this.ctx;
    for (const p of game.projectiles) {
      ctx.fillStyle = p.type === 'ice' ? '#8cf' : p.type === 'sniper' ? '#a6f' : p.type === 'bomber' ? '#f84' : p.type === 'electric' ? '#74e8ff' : p.type === 'flame' ? '#ffb13d' : p.type === 'purifier' ? '#dfffff' : '#ff4';
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawParticles(game) {
    const ctx = this.ctx;
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  drawNightOverlay(game) {
    if (game.phase === Phase.NIGHT) this.nightAlpha = Math.min(this.nightAlpha + 0.02, 0.35);
    else this.nightAlpha = Math.max(this.nightAlpha - 0.02, 0);
    if (this.nightAlpha > 0) {
      this.ctx.fillStyle = `rgba(0,0,40,${this.nightAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  drawFenceOverlay(game) {
    // Draw a decorative fence around the buildable area (rows 1-7)
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 3;
    ctx.strokeRect(TILE_SIZE + 1, TILE_SIZE + 1, (MAP_COLS - 2) * TILE_SIZE - 2, 7 * TILE_SIZE - 2);
    ctx.restore();
  }
  render(game) {
    this.clear();
    this.drawMap(game);
    this.drawBuildings(game);
    this.drawMonsters(game);
    this.drawProjectiles(game);
    this.drawParticles(game);
    this.drawNightOverlay(game);
    this.drawFenceOverlay(game);
  }
}

/* ============================================================
   UIController
   ============================================================ */
class UIController {
  constructor(game) {
    this.game = game;
    this.buildType = null; this.selectedBuilding = null;
    this._bindElements();
    this._bindEvents();
    this._refreshResumeBtn();
  }
  _bindElements() {
    this.playerInfo = document.getElementById('player-info');
    this.goldDisplay = document.getElementById('gold-display');
    this.doorHpFill = document.getElementById('door-hp-fill');
    this.doorHpText = document.getElementById('door-hp-text');
    this.waveInfo = document.getElementById('wave-info');
    this.waveInfoText = document.getElementById('wave-info-text');
    this.buildMenu = document.getElementById('build-menu');
    this.buildMenuToggle = document.getElementById('build-menu-toggle');
    this.infoPanel = document.getElementById('info-panel');
    this.infoName = document.getElementById('info-name');
    this.infoStats = document.getElementById('info-stats');
    this.upgradeBtn = document.getElementById('upgrade-btn');
    this.sellBtn = document.getElementById('sell-btn');
    this.waveBanner = document.getElementById('wave-banner');
    this.waveBannerText = document.getElementById('wave-banner-text');
    this.waveCompletePopup = document.getElementById('wave-complete-popup');
    this.wcTitle = document.getElementById('wc-title');
    this.wcBonus = document.getElementById('wc-bonus');
    this.wcDoorHp = document.getElementById('wc-door-hp');
    this.wcGold = document.getElementById('wc-gold');
    this.wcContinueBtn = document.getElementById('wc-continue-btn');
    this.menuScreen = document.getElementById('menu-screen');
    this.menuContent = document.getElementById('menu-content');
    this.startLevelsBtn = document.getElementById('start-levels-btn');
    this.startEndlessBtn = document.getElementById('start-endless-btn');
    this.resumeEndlessBtn = document.getElementById('resume-endless-btn');
    this.resumeWaveVal = document.getElementById('resume-wave-val');
    this.prestigeBtn = document.getElementById('prestige-btn');
    this.menuPrestigeVal = document.getElementById('menu-prestige-val');
    this.levelSelectScreen = document.getElementById('level-select-screen');
    this.levelGrid = document.getElementById('level-grid');
    this.levelSelectBackBtn = document.getElementById('level-select-back-btn');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.goWaves = document.getElementById('go-waves');
    this.goMaxGold = document.getElementById('go-maxgold');
    this.goPrestige = document.getElementById('go-prestige');
    this.restartBtn = document.getElementById('restart-btn');
    this.goMenuBtn = document.getElementById('go-menu-btn');
    this.prestigeShop = document.getElementById('prestige-shop');
    this.shopPointsVal = document.getElementById('shop-points-val');
    this.shopItems = document.querySelectorAll('.shop-item');
    this.shopClose = document.getElementById('shop-close');
    this.topPrestigeVal = document.getElementById('top-prestige-val');
    // Extended DOM elements (added in new index.html)
    this.infoBar = document.getElementById('info-bar');
    this.infoBarGold = document.getElementById('info-bar-gold');
    this.infoBarPrestige = document.getElementById('info-bar-prestige');
    this.infoBarWave = document.getElementById('info-bar-wave');
    this.infoBarCountdown = document.getElementById('info-bar-countdown');
    this.monsterPreview = document.getElementById('monster-preview');
    this.monsterHudList = document.getElementById('monster-hud-list');
    this.codexScreen = document.getElementById('codex-screen');
    this.tutorialOverlay = document.getElementById('tutorial-overlay');
    this.settingsScreen = document.getElementById('settings-screen');
    this.settingsBgm = document.getElementById('settings-bgm');
    this.settingsDifficulty = document.getElementById('settings-difficulty');
    this.settingsClose = document.getElementById('settings-close');
    this.settingsBtn = document.getElementById('settings-btn');
  }
  _bindEvents() {
    this.startLevelsBtn && this.startLevelsBtn.addEventListener('click', () => this.showLevelSelect());
    this.startEndlessBtn && this.startEndlessBtn.addEventListener('click', () => this.game.startEndless());
    this.resumeEndlessBtn && this.resumeEndlessBtn.addEventListener('click', () => this.game.resumeEndless());
    this.prestigeBtn && this.prestigeBtn.addEventListener('click', () => this.openPrestigeShop());
    this.levelSelectBackBtn && this.levelSelectBackBtn.addEventListener('click', () => this.hideLevelSelect());
    this.restartBtn && this.restartBtn.addEventListener('click', () => this.game.restart());
    this.goMenuBtn && this.goMenuBtn.addEventListener('click', () => this.game.showMenu());
    this.shopClose && this.shopClose.addEventListener('click', () => this.closePrestigeShop());
    this.wcContinueBtn && this.wcContinueBtn.addEventListener('click', () => this.game.onContinueNextWave());
    document.getElementById('info-close') && document.getElementById('info-close').addEventListener('click', () => this.hideInfoPanel());
    this.upgradeBtn && this.upgradeBtn.addEventListener('click', () => this.game.upgradeSelected());
    this.sellBtn && this.sellBtn.addEventListener('click', () => this.game.sellSelected());
    document.getElementById('upgrade-door-btn') && document.getElementById('upgrade-door-btn').addEventListener('click', () => this.game.upgradeDoor());
    if (this.buildMenuToggle) this.buildMenuToggle.addEventListener('click', () => this.toggleBuildMenuExpanded());
    document.querySelectorAll('.build-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', () => { this.setBuildType(btn.dataset.type); });
    });
    this.shopItems && this.shopItems.forEach(item => {
      item.querySelector('.buy-btn').addEventListener('click', () => this.game.buyPrestigeUpgrade(item.dataset.upgrade));
    });
    const codexBtn = document.getElementById('codex-btn');
    if (codexBtn) codexBtn.addEventListener('click', () => this.showCodex());
    const codexClose = document.getElementById('codex-close');
    if (codexClose) codexClose.addEventListener('click', () => this.hideCodex());
    const tutorialClose = document.getElementById('tutorial-close');
    if (tutorialClose) tutorialClose.addEventListener('click', () => this.hideTutorial());
    if (this.settingsBtn) this.settingsBtn.addEventListener('click', () => this.openSettings());
    if (this.settingsClose) this.settingsClose.addEventListener('click', () => this.closeSettings());
    if (this.settingsBgm) this.settingsBgm.addEventListener('change', () => this._applySettings());
    if (this.settingsDifficulty) this.settingsDifficulty.addEventListener('change', () => this._applySettings());
  }
  setGold(v) { if (this.goldDisplay) this.goldDisplay.textContent = String(Math.floor(v)); if (this.infoBarGold) this.infoBarGold.textContent = String(Math.floor(v)); }
  setDoorHp(cur, max) {
    const pct = max > 0 ? (cur / max) * 100 : 0;
    if (this.doorHpFill) { this.doorHpFill.style.width = pct + '%'; this.doorHpFill.className = pct < 20 ? 'critical' : pct < 50 ? 'warning' : ''; }
    if (this.doorHpText) this.doorHpText.textContent = Math.ceil(cur) + '/' + Math.ceil(max);
  }
  setWaveInfoText(t) { if (this.waveInfoText) this.waveInfoText.textContent = t; if (this.infoBarWave) this.infoBarWave.textContent = t; }
  setCountdown(t) { if (this.infoBarCountdown) this.infoBarCountdown.textContent = t; }
  showBuildMenu() { this.buildMenu && this.buildMenu.classList.remove('hidden'); }
  hideBuildMenu() { this.buildMenu && this.buildMenu.classList.add('hidden'); }
  toggleBuildMenuExpanded() {
    if (!this.buildMenu) return;
    const expanded = this.buildMenu.classList.toggle('expanded');
    if (this.buildMenuToggle) {
      this.buildMenuToggle.textContent = expanded ? '收起' : '展开';
      this.buildMenuToggle.title = expanded ? '收起建筑栏' : '展开建筑栏';
      this.buildMenuToggle.setAttribute('aria-label', expanded ? '收起建筑栏' : '展开建筑栏');
    }
  }
  showPlayerInfo() { this.playerInfo && this.playerInfo.classList.remove('hidden'); this.waveInfo && this.waveInfo.classList.remove('hidden'); this.infoBar && this.infoBar.classList.remove('hidden'); }
  hidePlayerInfo() { this.playerInfo && this.playerInfo.classList.add('hidden'); this.waveInfo && this.waveInfo.classList.add('hidden'); this.infoBar && this.infoBar.classList.add('hidden'); }
  showMenu() { this.menuScreen && this.menuScreen.classList.remove('hidden'); this.hideBuildMenu(); this.hidePlayerInfo(); this.hideInfoPanel(); this._refreshResumeBtn(); }
  hideMenu() { this.menuScreen && this.menuScreen.classList.add('hidden'); this.menuContent && this.menuContent.classList.remove('hidden'); this.levelSelectScreen && this.levelSelectScreen.classList.add('hidden'); }
  showGameOver(waves, maxGold, prestige) {
    this.goWaves && (this.goWaves.textContent = String(waves));
    this.goMaxGold && (this.goMaxGold.textContent = String(maxGold));
    this.goPrestige && (this.goPrestige.textContent = String(prestige));
    this.gameoverScreen && this.gameoverScreen.classList.remove('hidden');
  }
  hideGameOver() { this.gameoverScreen && this.gameoverScreen.classList.add('hidden'); }
  showWaveBanner(text) {
    if (!this.waveBanner) return;
    this.waveBannerText.textContent = text; this.waveBanner.classList.remove('hidden');
    setTimeout(() => this.waveBanner.classList.add('hidden'), 2000);
  }
  showWaveComplete(wave, bonus, doorHp, doorMax, gold) {
    this.wcTitle && (this.wcTitle.textContent = typeof wave === 'string' ? wave : '第 ' + wave + ' 夜完成!');
    this.wcBonus && (this.wcBonus.textContent = String(bonus));
    this.wcDoorHp && (this.wcDoorHp.textContent = Math.ceil(doorHp) + '/' + Math.ceil(doorMax));
    this.wcGold && (this.wcGold.textContent = String(Math.floor(gold)));
    this.waveCompletePopup && this.waveCompletePopup.classList.remove('hidden');
  }
  hideWaveComplete() { this.waveCompletePopup && this.waveCompletePopup.classList.add('hidden'); }
  showInfoPanel(building, gold) {
    this.selectedBuilding = building; this.infoPanel && this.infoPanel.classList.remove('hidden');
    const def = BUILDING_DEFS[building.type];
    let stats = def.name + ' Lv.' + building.level + '\nHP: ' + Math.ceil(building.hp) + '/' + building.maxHp + '\n';
    if (building.type === 'bed') stats += '收入: ' + building.getIncomeRate().toFixed(1) + '/s\n';
    else if (building.type === 'tower') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n';
    else if (building.type === 'generator') stats += '增幅: +' + (building.getBoostMultiplier() * 100).toFixed(0) + '%\n';
    else if (building.type === 'repairman') stats += '修复: ' + building.getRepairRate().toFixed(0) + ' HP/s\n';
    else if (building.type === 'ice_mage') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n减速: ' + (building.getSlowFactor() * 100).toFixed(0) + '%\n';
    else if (building.type === 'bomber') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n溅射: ' + (building.getSplash() * 100).toFixed(0) + '%\n';
    else if (building.type === 'sniper') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n暴击: ' + (building.getCritRate() * 100).toFixed(0) + '%\n';
    else if (building.type === 'altar') stats += '攻速 aura: +' + (building.getAuraASPD() * 100).toFixed(0) + '%\n减速 aura: -' + (building.getAuraSpeed() * 100).toFixed(0) + '%\n';
    else if (building.type === 'electric_coil') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n连锁: ' + building.getChainCount() + ' 个\n';
    else if (building.type === 'flame_turret') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n燃烧: ' + building.getBurnDamage().toFixed(1) + '/s\n';
    else if (building.type === 'purifier') stats += '伤害: ' + building.getDamage() + '\n射程: ' + building.getRange().toFixed(1) + '\n穿透减伤: ' + (building.getPierceReduction() * 100).toFixed(0) + '%\n';
    this.infoName && (this.infoName.textContent = def.name + ' Lv.' + building.level);
    this.infoStats && (this.infoStats.textContent = stats.trim());
    const cost = building.getUpgradeCost();
    if (this.upgradeBtn) { this.upgradeBtn.disabled = gold < cost; this.upgradeBtn.textContent = '升级 (' + cost + 'G)'; }
  }
  hideInfoPanel() { this.infoPanel && this.infoPanel.classList.add('hidden'); this.selectedBuilding = null; }
  getSelectedBuilding() { return this.selectedBuilding; }
  getBuildType() { return this.buildType; }
  setBuildType(t) {
    this.buildType = t; this.hideInfoPanel();
    document.querySelectorAll('.build-btn[data-type]').forEach(b => { b.style.borderColor = (b.dataset.type === t) ? '#fc0' : ''; });
  }
  clearBuildType() { this.buildType = null; document.querySelectorAll('.build-btn[data-type]').forEach(b => { b.style.borderColor = ''; }); }
  openPrestigeShop() {
    if (!this.prestigeShop) return;
    this.prestigeShop.classList.remove('hidden');
    this.shopPointsVal && (this.shopPointsVal.textContent = String(this.game.saveData.prestigePoints));
    this._refreshShopItems();
  }
  closePrestigeShop() { this.prestigeShop && this.prestigeShop.classList.add('hidden'); }
  _refreshShopItems() {
    const ups = this.game.saveData.prestigeUpgrades;
    const gainMap = { goldMult: 10, doorHp: 20, towerDmg: 15 };
    this.shopItems && this.shopItems.forEach(item => {
      const key = item.dataset.upgrade;
      const level = ups[key] || 0;
      const gain = (gainMap[key] || 0) * (level + 1);
      const totalGain = (gainMap[key] || 0) * level;
      item.querySelector('.shop-level').textContent = '当前增益: +' + totalGain + '%';
      const costs = { goldMult: 5, doorHp: 3, towerDmg: 4 };
      const cost = costs[key];
      const btn = item.querySelector('.buy-btn');
      btn.textContent = '升级 (' + cost + ')';
      btn.disabled = this.game.saveData.prestigePoints < cost;
    });
  }
  flashPrestige(amt, source) {
    if (this.topPrestigeVal) { const cur = parseInt(this.topPrestigeVal.textContent || '0', 10) || 0; this.topPrestigeVal.textContent = String(cur + amt); }
    const tip = document.createElement('div');
    tip.textContent = '+' + amt + ' 声望' + (source === 'survival' ? ' (坚守)' : '');
    tip.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:rgba(255,215,64,0.92);color:#1a1a2e;font-weight:bold;padding:6px 14px;border-radius:14px;font-size:13px;z-index:200;pointer-events:none;animation:bannerIn .25s ease-out';
    document.body.appendChild(tip);
    setTimeout(() => { tip.style.transition = 'opacity .4s, transform .4s'; tip.style.opacity = '0'; tip.style.transform = 'translate(-50%,-20px)'; }, 900);
    setTimeout(() => tip.remove(), 1400);
  }
  showLevelSelect() {
    this.levelGrid.innerHTML = '';
    const save = this.game.saveData;
    for (let i = 1; i <= MAX_LEVEL; i++) {
      const btn = document.createElement('button'); btn.className = 'level-btn unlocked'; btn.textContent = String(i);
      if (save.completedLevels.includes(i)) btn.classList.add('selected');
      btn.addEventListener('click', () => this.onSelectLevel(i));
      this.levelGrid.appendChild(btn);
    }
    this.menuContent.classList.add('hidden'); this.levelSelectScreen.classList.remove('hidden');
    // Ensure settings button exists in level select
    if (!document.getElementById('level-select-settings-btn')) {
      const settingsBtn = document.createElement('button');
      settingsBtn.id = 'level-select-settings-btn';
      settingsBtn.className = 'menu-btn secondary';
      settingsBtn.textContent = '设置';
      settingsBtn.style.marginTop = '8px';
      settingsBtn.addEventListener('click', () => this.openSettings());
      this.levelSelectScreen.appendChild(settingsBtn);
    }
  }
  hideLevelSelect() { this.levelSelectScreen.classList.add('hidden'); this.menuContent.classList.remove('hidden'); }
  onSelectLevel(level) { this.game.startLevel(level); }
  _refreshResumeBtn() {
    if (!this.resumeEndlessBtn) return;
    try { const raw = localStorage.getItem(SAVE_KEY); const sd = raw ? JSON.parse(raw) : null; const er = sd && sd.endlessRun;
      if (er && er.wave) { this.resumeEndlessBtn.classList.remove('hidden'); this.resumeWaveVal && (this.resumeWaveVal.textContent = String(er.wave)); }
      else { this.resumeEndlessBtn.classList.add('hidden'); }
    } catch (_) { this.resumeEndlessBtn.classList.add('hidden'); }
  }
  showCodex() { if (this.codexScreen) this.codexScreen.classList.remove('hidden'); }
  hideCodex() { if (this.codexScreen) this.codexScreen.classList.add('hidden'); }
  showTutorial() { if (this.tutorialOverlay) this.tutorialOverlay.classList.remove('hidden'); }
  hideTutorial() { if (this.tutorialOverlay) this.tutorialOverlay.classList.add('hidden'); }
  openSettings() {
    if (!this.settingsScreen) return;
    try {
      const raw = localStorage.getItem('xiang_game_settings');
      const s = raw ? JSON.parse(raw) : {};
      if (this.settingsBgm) this.settingsBgm.checked = s.bgm !== false;
      if (this.settingsDifficulty) this.settingsDifficulty.value = s.difficultyLevel || 'normal';
    } catch (_) {}
    this.settingsScreen.classList.remove('hidden');
  }
  closeSettings() { if (this.settingsScreen) this.settingsScreen.classList.add('hidden'); }
  _applySettings() {
    try {
      const s = {
        bgm: this.settingsBgm ? this.settingsBgm.checked : true,
        difficultyLevel: this.settingsDifficulty ? this.settingsDifficulty.value : 'normal'
      };
      localStorage.setItem('xiang_game_settings', JSON.stringify(s));
      window.__difficultyMonsterMult = s.difficultyLevel === 'easy' ? 0.5 : s.difficultyLevel === 'hard' ? 2 : 1;
      window.__difficultyRewardMult = s.difficultyLevel === 'easy' ? 0.5 : s.difficultyLevel === 'hard' ? 2 : 1;
    } catch (_) {}
  }
  updateMonsterPreview() {
    if (!this.monsterPreview) return;
    // Show upcoming monster types in current/next wave
    let types = [];
    if (this.game.waveManager && this.game.waveManager.active) {
      for (const sw of this.game.waveManager.subWaves) {
        if (!sw.spawned && sw.monsters) { for (const m of sw.monsters) if (!types.includes(m.type)) types.push(m.type); }
      }
    }
    this.monsterPreview.innerHTML = types.map(t => `<span class="preview-tag ${t}">${this._monsterName(t)}</span>`).join('');
  }
  updateMonsterHud() {
    if (!this.monsterHudList) return;
    this.monsterHudList.innerHTML = '';
    const alive = this.game.monsters.filter(m => m.state !== MonsterState.DEAD);
    if (alive.length > 6) return; // Too many, skip HUD
    for (const m of alive) {
      const el = document.createElement('div'); el.className = 'monster-hud';
      const pct = (m.hp / m.maxHp) * 100;
      el.innerHTML = `<div class="mh-name">${this._monsterName(m.type)}</div><div class="mh-bar"><div class="mh-fill" style="width:${pct}%"></div></div>`;
      this.monsterHudList.appendChild(el);
    }
  }
  _monsterName(type) {
    const map = { ghost: '幽灵', ghostfemale: '女鬼', zombie: '丧尸', zombie_runner: '奔袭丧尸', zombie_brute: '巨臂丧尸', zombie_toxic: '腐毒丧尸', shadow: '暗影' };
    return map[type] || type;
  }
}

/* ============================================================
   DarkDormGame
   ============================================================ */
class DarkDormGame {
  constructor() {
    this.map = new TileMap();
    this.buildings = [];
    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.waveManager = new WaveManager(this);
    this.renderer = new Renderer(document.getElementById('canvas'));
    this.ui = new UIController(this);
    this.saveData = loadSave();
    this.mode = null; this.phase = Phase.MENU;
    this.gold = 0; this.maxGold = 0; this.doorHp = BASE_DOOR_HP; this.doorMaxHp = BASE_DOOR_HP; this.doorLevel = 1;
    this.currentLevel = 0; this.wave = 0; this.running = false; this.lastTime = 0;
    this.difficultyMult = window.__difficultyMonsterMult || 1;
    this.rewardMult = window.__difficultyRewardMult || 1;
    this.tileSize = TILE_SIZE;
    this.ctx = this.renderer.ctx;
    this._lastAutoSaveTick = 0;
    this._initCanvasEvents();
    this._firstRun = !this.saveData.totalGames;
  }
  _initCanvasEvents() {
    const c = this.renderer.canvas;
    c.addEventListener('click', e => this._onCanvasClick(e));
    c.addEventListener('mousemove', e => this._onCanvasMove(e));
  }
  _getCanvasPos(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);
    return { c: Math.floor(x / TILE_SIZE), r: Math.floor(y / TILE_SIZE) };
  }
  _onCanvasClick(e) {
    if (this.phase !== Phase.DAY && this.phase !== Phase.NIGHT) return;
    const p = this._getCanvasPos(e);
    const b = this.buildings.find(b => b.pos.x === p.c && b.pos.y === p.r);
    if (b) { this.ui.showInfoPanel(b, this.gold); this.ui.clearBuildType(); return; }
    const type = this.ui.getBuildType();
    if (type && this.map.isBuildable(p.c, p.r)) {
      const def = BUILDING_DEFS[type]; const cost = def.baseCost;
      if (this.gold >= cost) { this.gold -= cost; this._addBuilding(type, p.c, p.r); AudioEngine.playBuildPlace(); this.ui.setGold(this.gold); this.ui.clearBuildType(); }
    } else { this.ui.hideInfoPanel(); }
  }
  _onCanvasMove(e) {
    // Optional: hover effects
  }
  _addBuilding(type, c, r) {
    const b = new Building(type, { x: c, y: r }, this.saveData.prestigeUpgrades);
    // Apply door HP prestige
    if (type === 'bed' || type === 'tower' || type === 'repairman' || type === 'ice_mage' || type === 'bomber' || type === 'sniper' || type === 'altar' || type === 'electric_coil' || type === 'flame_turret' || type === 'purifier') {
      b.maxHp = Math.floor(b.maxHp * (1 + this.saveData.prestigeUpgrades.doorHp * 0.20));
      b.hp = b.maxHp;
    }
    this.buildings.push(b);
  }
  removeBuildingAt(c, r) {
    const idx = this.buildings.findIndex(b => b.pos.x === c && b.pos.y === r);
    if (idx >= 0) this.buildings.splice(idx, 1);
  }
  getGlobalMonsterSpeedMult() {
    let mult = 1;
    for (const b of this.buildings) {
      if (b.type === 'altar') {
        const aura = b.getAuraSpeed();
        // Simple: altar slows all monsters globally for performance
        mult *= (1 - aura);
      }
    }
    return mult;
  }
  getAttackSpeedMult(b) {
    let mult = 1;
    for (const a of this.buildings) {
      if (a.type === 'altar') {
        const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
        if (d <= a.getAuraRange()) mult *= (1 + a.getAuraASPD());
      }
    }
    return mult;
  }
  damageDoor(dmg) { this.doorHp -= dmg; if (this.doorHp <= 0) { this.doorHp = 0; this._gameOver(); } this.ui.setDoorHp(this.doorHp, this.doorMaxHp); }
  addParticle(x, y, color, life) { this.particles.push(new Particle(x, y, color, life)); }
  startLevel(level) {
    AudioEngine.init(); this.mode = GameMode.LEVELS; this.phase = Phase.DAY; this.currentLevel = level; this.wave = 1;
    this.gold = 100 + (this.saveData.prestigeUpgrades.goldMult || 0) * 20;
    this.maxGold = this.gold; this.doorHp = BASE_DOOR_HP * (1 + this.saveData.prestigeUpgrades.doorHp * 0.20); this.doorMaxHp = this.doorHp; this.doorLevel = 1;
    this.buildings = []; this.monsters = []; this.projectiles = []; this.particles = [];
    this.ui.hideMenu(); this.ui.showPlayerInfo(); this.ui.showBuildMenu(); this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
    this.ui.showWaveBanner('第 ' + level + ' 关 - 白天准备');
    this.waveManager.startLevelWave(level);
    if (!this.running) this.startLoop();
    if (this._firstRun) { this._firstRun = false; this.ui.showTutorial(); }
  }
  startEndless() {
    AudioEngine.init(); this.mode = GameMode.ENDLESS; this.phase = Phase.DAY; this.currentLevel = 0; this.wave = 1;
    this.gold = 100 + (this.saveData.prestigeUpgrades.goldMult || 0) * 20;
    this.maxGold = this.gold; this.doorHp = BASE_DOOR_HP * (1 + this.saveData.prestigeUpgrades.doorHp * 0.20); this.doorMaxHp = this.doorHp; this.doorLevel = 1;
    this.buildings = []; this.monsters = []; this.projectiles = []; this.particles = [];
    this.ui.hideMenu(); this.ui.showPlayerInfo(); this.ui.showBuildMenu(); this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
    this.ui.showWaveBanner('无尽模式 - 白天准备');
    this.waveManager.startEndlessWave(1);
    if (!this.running) this.startLoop();
  }
  resumeEndless() {
    try { const raw = localStorage.getItem(SAVE_KEY); const sd = raw ? JSON.parse(raw) : null; const er = sd && sd.endlessRun;
      if (!er) return;
      AudioEngine.init(); this.mode = GameMode.ENDLESS; this.phase = Phase.DAY; this.currentLevel = 0; this.wave = er.wave || 1;
      this.gold = er.gold || 100; this.maxGold = this.gold; this.doorHp = er.doorHp || BASE_DOOR_HP; this.doorMaxHp = er.doorMaxHp || BASE_DOOR_HP; this.doorLevel = er.doorLevel || 1;
      this.buildings = (er.buildings || []).map(bd => { const b = new Building(bd.type, { x: bd.x, y: bd.y }, this.saveData.prestigeUpgrades); b.level = bd.level || 1; b.hp = bd.hp || b.maxHp; b.totalInvested = bd.totalInvested || BUILDING_DEFS[bd.type].baseCost; return b; });
      this.monsters = []; this.projectiles = []; this.particles = [];
      this.ui.hideMenu(); this.ui.showPlayerInfo(); this.ui.showBuildMenu(); this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
      this.ui.showWaveBanner('无尽模式 - 白天准备');
      this.waveManager.startEndlessWave(this.wave);
      if (!this.running) this.startLoop();
    } catch (_) {}
  }
  onWaveComplete(wave) {
    this.phase = Phase.WAVE_COMPLETE;
    const rewardWave = this.mode === GameMode.LEVELS ? this.currentLevel : wave;
    const bonus = Math.floor((50 + rewardWave * 10) * this.rewardMult);
    this.gold += bonus; this.maxGold = Math.max(this.maxGold, this.gold);
    if (this.mode === GameMode.LEVELS) {
      this.ui.showWaveComplete('第 ' + this.currentLevel + ' 关完成!', bonus, this.doorHp, this.doorMaxHp, this.gold);
      if (!this.saveData.completedLevels.includes(this.currentLevel)) this.saveData.completedLevels.push(this.currentLevel);
      if (this.currentLevel >= this.saveData.unlockedLevel) this.saveData.unlockedLevel = Math.min(MAX_LEVEL, this.currentLevel + 1);
      saveSave(this.saveData);
    } else {
      this.ui.showWaveComplete(wave, bonus, this.doorHp, this.doorMaxHp, this.gold);
    }
  }
  onContinueNextWave() {
    this.ui.hideWaveComplete();
    if (this.mode === GameMode.ENDLESS) {
      this.wave++; this.phase = Phase.DAY; this.ui.showWaveBanner('第 ' + this.wave + ' 夜 - 白天准备'); this.waveManager.startEndlessWave(this.wave);
      this._saveEndlessSnapshot();
    } else {
      // Next level or back to menu for level mode after final wave
      this.showMenu();
    }
  }
  _gameOver() {
    this.phase = Phase.GAME_OVER; this.saveData.totalGames++;
    const prestige = this._calcPrestige(this.maxGold);
    this.saveData.prestigePoints += prestige;
    this.saveData.highestWave = Math.max(this.saveData.highestWave, this.wave);
    if (this.mode === GameMode.ENDLESS) this.saveData.endlessRun = null;
    saveSave(this.saveData);
    this.ui.showGameOver(this.wave, Math.floor(this.maxGold), prestige);
    this.ui.flashPrestige(prestige, 'survival');
    AudioEngine.playGameOver();
    this.ui.hideBuildMenu();
  }
  _calcPrestige(maxGold) {
    return Math.floor((Math.sqrt(1 + 8 * maxGold / PRESTIGE_COST_BASE) - 1) / 2);
  }
  _saveEndlessSnapshot() {
    if (this.mode !== GameMode.ENDLESS) return;
    this.saveData.endlessRun = {
      wave: this.wave, gold: this.gold, doorHp: this.doorHp, doorMaxHp: this.doorMaxHp, doorLevel: this.doorLevel,
      buildings: this.buildings.map(b => ({ type: b.type, x: b.pos.x, y: b.pos.y, level: b.level, hp: b.hp, totalInvested: b.totalInvested }))
    };
    saveSave(this.saveData);
  }
  restart() {
    this.ui.hideGameOver();
    if (this.mode === GameMode.ENDLESS) this.startEndless();
    else this.startLevel(this.currentLevel || 1);
  }
  showMenu(points) {
    this.phase = Phase.MENU; this.mode = null; this.running = false;
    if (typeof points === 'number' && Number.isFinite(points)) {
      this.saveData.prestigePoints = points;
    }
    this.ui.hideGameOver();
    this.ui.showMenu();
    this.ui.setGold(0); this.ui.setDoorHp(1, 1);
    if (this.ui.menuPrestigeVal) this.ui.menuPrestigeVal.textContent = String(this.saveData.prestigePoints);
  }
  upgradeSelected() {
    const b = this.ui.getSelectedBuilding(); if (!b) return;
    const cost = b.getUpgradeCost(); if (this.gold < cost) return;
    this.gold -= cost; b.upgrade(); b.totalInvested += cost; AudioEngine.playBuildUpgrade();
    this.ui.setGold(this.gold); this.ui.showInfoPanel(b, this.gold);
  }
  sellSelected() {
    const b = this.ui.getSelectedBuilding(); if (!b) return;
    const refund = Math.floor(b.totalInvested * 0.5); this.gold += refund;
    this.removeBuildingAt(b.pos.x, b.pos.y); AudioEngine.playBuildSell();
    this.ui.setGold(this.gold); this.ui.hideInfoPanel();
  }
  upgradeDoor() {
    const cost = Math.floor(DOOR_UPGRADE_COST_BASE * Math.pow(1.5, this.doorLevel - 1));
    if (this.gold < cost) return;
    this.gold -= cost; this.doorLevel++;
    const inc = 50 * Math.pow(1.2, this.doorLevel - 1);
    this.doorMaxHp += inc; this.doorHp += inc; AudioEngine.playBuildUpgrade();
    this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
  }
  buyPrestigeUpgrade(key) {
    const costs = { goldMult: 5, doorHp: 3, towerDmg: 4 };
    const cost = costs[key];
    if (this.saveData.prestigePoints < cost) return;
    this.saveData.prestigePoints -= cost; this.saveData.prestigeUpgrades[key] = (this.saveData.prestigeUpgrades[key] || 0) + 1;
    saveSave(this.saveData); this.ui._refreshShopItems(); this.ui.shopPointsVal && (this.ui.shopPointsVal.textContent = String(this.saveData.prestigePoints));
  }
  drawMap(ctx) { this.renderer.drawMap(this); }
  render() { this.renderer.render(this); }
  startLoop() { if (this.running) return; this.running = true; this.lastTime = performance.now(); requestAnimationFrame(t => this._loop(t)); }
  stopLoop() { this.running = false; }
  _loop(t) { if (!this.running) return; const dt = Math.min((t - this.lastTime) / 1000, 0.1); this.lastTime = t; this.update(dt); this.render(); requestAnimationFrame(t2 => this._loop(t2)); }
  update(dt) {
    if (this.phase === Phase.DAY) {
      this.waveManager.update(dt);
      // Day income: once per second
      if (this.waveManager.countdown > 0) {
        this.dayIncomeTimer = (this.dayIncomeTimer || 0) + dt;
        const goldMult = 1 + (this.saveData.prestigeUpgrades.goldMult || 0) * 0.10;
        while (this.dayIncomeTimer >= 1) {
          this.dayIncomeTimer -= 1;
          let income = BASE_GOLD_INCOME * goldMult;
          for (const b of this.buildings) {
            if (b.type === 'bed') income += b.getIncomeRate() * goldMult;
          }
          const levelExtra = (this.mode === GameMode.LEVELS ? this.currentLevel : this.waveManager.wave) * 2;
          income += levelExtra;
          this.gold += income;
          this.maxGold = Math.max(this.maxGold, this.gold);
        }
      }
      this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
      this.ui.updateMonsterPreview(); this.ui.updateMonsterHud();
      return;
    }
    if (this.phase === Phase.NIGHT) {
      this.waveManager.update(dt);
      // Base + bed income: once per second
      this.nightIncomeTimer = (this.nightIncomeTimer || 0) + dt;
      const goldMult = 1 + (this.saveData.prestigeUpgrades.goldMult || 0) * 0.10;
      while (this.nightIncomeTimer >= 1) {
        this.nightIncomeTimer -= 1;
        let income = BASE_GOLD_INCOME * goldMult;
        for (const b of this.buildings) {
          if (b.type === 'bed') income += b.getIncomeRate() * goldMult;
        }
        this.gold += income;
        this.maxGold = Math.max(this.maxGold, this.gold);
      }
      for (const b of this.buildings) {
        if (b.type === 'repairman') {
          b.fireTimer += dt; const r = b.getRepairRate(); while (b.fireTimer >= 1) { b.fireTimer -= 1; for (const o of this.buildings) { if (o !== b && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + r); } } }
        }
      }
      // Generator boost calculation is dynamic during attacks
      // Monsters
      for (const m of this.monsters) { m.update(dt, this); }
      this.monsters = this.monsters.filter(m => m.state !== MonsterState.DEAD || m.deadTimer < 1);
      // Buildings attack
      for (const b of this.buildings) {
        if (b.hp <= 0) continue;
        if (ATTACK_BUILDING_TYPES.has(b.type)) {
          const iv = b.getInterval() / this.getAttackSpeedMult(b);
          b.fireTimer += dt;
          if (b.fireTimer >= iv) {
            b.fireTimer -= iv;
            let target = b.target;
            if (!target || target.state === MonsterState.DEAD || Math.hypot(target.pos.x - (b.pos.x + 0.5), target.pos.y - (b.pos.y + 0.5)) > b.getRange()) {
              target = this._findTarget(b);
              b.target = target;
            }
            if (target) {
              b.fireTimer = 0;
              // Muzzle flash
              const mx = b.pos.x * TILE_SIZE + TILE_SIZE / 2;
              const my = b.pos.y * TILE_SIZE + TILE_SIZE / 2;
              const flash = new Particle(mx, my, '#fff', 0.25);
              flash.size = 8; this.particles.push(flash);
              const flash2 = new Particle(mx, my, '#ffd740', 0.2);
              flash2.size = 6; this.particles.push(flash2);
              const dmg = b.type === 'sniper' && Math.random() < b.getCritRate() ? Math.floor(b.getDamage() * b.getCritMult()) : b.getDamage();
              const projectileType = b.type === 'ice_mage' ? 'ice' : b.type === 'sniper' ? 'sniper' : b.type === 'bomber' ? 'bomber' : b.type === 'electric_coil' ? 'electric' : b.type === 'flame_turret' ? 'flame' : b.type === 'purifier' ? 'purifier' : 'normal';
              this.projectiles.push(new Projectile({ x: b.pos.x + 0.5, y: b.pos.y + 0.5 }, { x: target.pos.x, y: target.pos.y }, dmg, projectileType, { chainCount: b.getChainCount(), chainDamage: b.getChainDamage(), chainRange: b.getChainRange(), burnDps: b.getBurnDamage(), burnDuration: b.getBurnDuration(), pierceReduction: b.getPierceReduction() }, target));
              AudioEngine.playTowerFire();
            }
          }
        }
      }
      // Projectiles hit
      for (const p of this.projectiles) {
        p.update(dt);
        if (p.dead) {
          const targets = this.monsters.filter(m => m.state !== MonsterState.DEAD);
          if (p.type === 'bomber') {
            for (const m of targets) { const d = Math.hypot(m.pos.x - p.to.x, m.pos.y - p.to.y); if (d <= 1) { const killed = m.takeDamage(p.damage * (d < 0.5 ? 1 : 0.5)); if (killed) this._onMonsterKill(m); } }
            this.addParticle(p.to.x * TILE_SIZE + TILE_SIZE / 2, p.to.y * TILE_SIZE + TILE_SIZE / 2, '#f84', 0.5);
          } else if (p.type === 'electric') {
            const primary = targets.find(m => Math.hypot(m.pos.x - p.to.x, m.pos.y - p.to.y) < 0.6);
            if (primary) {
              if (primary.takeDamage(p.damage)) this._onMonsterKill(primary);
              const chained = targets
                .filter(m => m !== primary && m.state !== MonsterState.DEAD && Math.hypot(m.pos.x - primary.pos.x, m.pos.y - primary.pos.y) <= (p.extra.chainRange || 1.4))
                .sort((a, b) => Math.hypot(a.pos.x - primary.pos.x, a.pos.y - primary.pos.y) - Math.hypot(b.pos.x - primary.pos.x, b.pos.y - primary.pos.y))
                .slice(0, p.extra.chainCount || 0);
              for (const m of chained) { if (m.takeDamage(p.damage * (p.extra.chainDamage || 0.5))) this._onMonsterKill(m); }
              this.addParticle(primary.pos.x * TILE_SIZE + TILE_SIZE / 2, primary.pos.y * TILE_SIZE + TILE_SIZE / 2, '#74e8ff', 0.45);
            }
          } else if (p.type === 'flame') {
            for (const m of targets) {
              if (Math.hypot(m.pos.x - p.to.x, m.pos.y - p.to.y) < 0.85) {
                if (m.takeDamage(p.damage)) this._onMonsterKill(m);
                if (m.state !== MonsterState.DEAD) m.applyBurn(p.extra.burnDps || 0, p.extra.burnDuration || 0);
              }
            }
            this.addParticle(p.to.x * TILE_SIZE + TILE_SIZE / 2, p.to.y * TILE_SIZE + TILE_SIZE / 2, '#ff9a3d', 0.35);
          } else if (p.type === 'purifier') {
            for (const m of targets) {
              if (Math.hypot(m.pos.x - p.to.x, m.pos.y - p.to.y) < 0.6) {
                const originalReduction = m.damageReduction;
                m.damageReduction = Math.max(0, originalReduction - (p.extra.pierceReduction || 0));
                const killed = m.takeDamage(p.damage);
                m.damageReduction = originalReduction;
                if (killed) this._onMonsterKill(m);
                break;
              }
            }
          } else {
            for (const m of targets) { if (Math.hypot(m.pos.x - p.to.x, m.pos.y - p.to.y) < 0.6) { const killed = m.takeDamage(p.damage); if (killed) this._onMonsterKill(m); if (p.type === 'ice') m.applySlow(1 - 0.30, 2); break; } }
          }
        }
      }
      this.projectiles = this.projectiles.filter(p => !p.dead);
      // Particles
      for (const p of this.particles) p.update(dt);
      this.particles = this.particles.filter(p => p.life > 0);
      // Update HUD
      this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
      this.ui.updateMonsterPreview(); this.ui.updateMonsterHud();
      // Auto-save endless every 10s
      if (this.mode === GameMode.ENDLESS && Math.floor(performance.now() / 10000) !== this._lastAutoSaveTick) { this._lastAutoSaveTick = Math.floor(performance.now() / 10000); this._saveEndlessSnapshot(); }
    }
  }
  _findTarget(b) {
    const range = b.getRange();
    let best = null, bestD = Infinity;
    for (const m of this.monsters) {
      if (m.state === MonsterState.DEAD) continue;
      const d = Math.hypot(m.pos.x - (b.pos.x + 0.5), m.pos.y - (b.pos.y + 0.5));
      if (d <= range && d < bestD) { bestD = d; best = m; }
    }
    return best;
  }
  _onMonsterKill(m) {
    for (const b of this.buildings) { if (b.target === m) b.target = null; }
    const reward = Math.floor((5 + this.wave) * this.rewardMult);
    this.gold += reward; this.maxGold = Math.max(this.maxGold, this.gold);
    this.addParticle(m.pos.x * TILE_SIZE + TILE_SIZE / 2, m.pos.y * TILE_SIZE + TILE_SIZE / 2, '#ffd740', 0.6);
    AudioEngine.playMonsterHit();
  }
}

/* ============================================================
   Initialize
   ============================================================ */
window.__ddSoundEnabled = true;
window.__ddBgmEnabled = true;

const game = new DarkDormGame();
window.darkDormGame = game;
AudioEngine.init();

// Echo Game Settings Bridge
window.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'game-settings-changed') {
    var p = e.data.payload || {};
    if (typeof p.globalSoundEnabled === 'boolean') window.__ddSoundEnabled = p.globalSoundEnabled;
    if (typeof p.globalBgmEnabled === 'boolean') window.__ddBgmEnabled = p.globalBgmEnabled;
  }
  if (e.data.type === 'game-export-request') {
    var saveData = null;
    try { saveData = localStorage.getItem('dark_dorm_save_v1'); } catch (_) {}
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'game-export-data', requestId: e.data.requestId, data: { saveData: saveData } }, '*');
    }
  }
  if (e.data.type === 'game-import-request') {
    var success = false;
    try {
      if (e.data.saveData) {
        localStorage.setItem('dark_dorm_save_v1', e.data.saveData);
        success = true;
        setTimeout(function() { location.reload(); }, 100);
      }
    } catch (_) {}
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'game-import-result', requestId: e.data.requestId, success: success }, '*');
    }
  }
});

})();
