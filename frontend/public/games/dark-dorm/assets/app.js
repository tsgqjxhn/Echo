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
  altar:        { name: '祭坛',    baseCost: 180, color: '#E74C3C', hp: 100, aspdAura: 0.15, speedAura: 0.10, auraRange: 2.5 }
};

const BASE_DOOR_HP = 150;
const DOOR_UPGRADE_COST_BASE = 80;
const MAX_LEVEL = 10;
const PRESTIGE_COST_BASE = 1e6;
const SAVE_KEY = 'dark_dorm_save_v1';

/* ============================================================
   Level Wave Configurations
   ============================================================ */
const LEVEL_WAVES = [
  null,
  [{ monsters: [{ type: 'ghost', count: 2 }] }],
  [{ monsters: [{ type: 'ghost', count: 3 }] }, { monsters: [{ type: 'ghost', count: 2 }], delay: 8 }],
  [{ monsters: [{ type: 'ghost', count: 4 }] }, { monsters: [{ type: 'ghostfemale', count: 2 }], delay: 10 }],
  [{ monsters: [{ type: 'ghost', count: 3 }] }, { monsters: [{ type: 'zombie', count: 2 }], delay: 12 }],
  [{ monsters: [{ type: 'ghost', count: 4 }] }, { monsters: [{ type: 'ghostfemale', count: 3 }], delay: 8 }, { monsters: [{ type: 'ghost', count: 3 }], delay: 16 }],
  [{ monsters: [{ type: 'zombie', count: 3 }] }, { monsters: [{ type: 'ghostfemale', count: 3 }], delay: 10 }],
  [{ monsters: [{ type: 'shadow', count: 2 }] }, { monsters: [{ type: 'ghost', count: 5 }], delay: 8 }],
  [{ monsters: [{ type: 'ghostfemale', count: 4 }] }, { monsters: [{ type: 'zombie', count: 3 }], delay: 10 }, { monsters: [{ type: 'shadow', count: 2 }], delay: 18 }],
  [{ monsters: [{ type: 'zombie', count: 4 }] }, { monsters: [{ type: 'shadow', count: 3 }], delay: 10 }, { monsters: [{ type: 'ghostfemale', count: 4 }], delay: 20 }],
  [{ monsters: [{ type: 'ghost', count: 5 }] }, { monsters: [{ type: 'zombie', count: 4 }], delay: 8 }, { monsters: [{ type: 'shadow', count: 4 }, { type: 'ghostfemale', count: 3 }], delay: 16 }]
];

function defaultSave() {
  return { prestigePoints: 0, prestigeUpgrades: { goldMult: 0, doorHp: 0, towerDmg: 0 }, highestWave: 0, totalGames: 0, lastSaveTime: 0, unlockedLevel: MAX_LEVEL, completedLevels: [], endlessRun: null };
}

function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const d = JSON.parse(raw); return Object.assign(defaultSave(), d); } } catch (_) {}
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
    this.fireTimer = 0; this.incomeTimer = 0; this.animTimer = 0; this.upgradeTimer = 0;
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
  constructor(wave, difficultyMult, level) { super(wave, difficultyMult); this.type = 'zombie'; this.zombieLevel = level || 1; }
  _initStats() {
    super._initStats(); this.maxHp *= 2; this.atk *= 0.8; this.speed = 1.4;
    this.damageReduction = Math.min(0.30 + this.zombieLevel * 0.02, 0.50);
    this.retreatRegen = 0.05 + Math.min((this.wave - 1) * 0.005, 0.15);
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
  constructor(from, to, damage, type, extra) {
    this.from = { ...from }; this.to = { ...to }; this.damage = damage; this.type = type;
    this.pos = { ...from }; this.speed = 10; this.dead = false; this.extra = extra || {};
    const dx = to.x - from.x, dy = to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vel = { x: (dx / d) * this.speed, y: (dy / d) * this.speed };
  }
  update(dt) {
    this.pos.x += this.vel.x * TILE_SIZE * dt; this.pos.y += this.vel.y * TILE_SIZE * dt;
    const dx = this.to.x * TILE_SIZE + TILE_SIZE / 2 - this.pos.x;
    const dy = this.to.y * TILE_SIZE + TILE_SIZE / 2 - this.pos.y;
    if (Math.hypot(dx, dy) < 10) this.dead = true;
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
  startLevelWave(level) { this.wave = 1; this.active = true; this.killedThisWave = 0; this._prepareSubWaves(LEVEL_WAVES[level]); }
  startEndlessWave(wave) { this.wave = wave; this.active = true; this.killedThisWave = 0; const cfg = this._generateEndless(wave); this._prepareSubWaves(cfg); }
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
    else if (wave <= 6) { monsters = [{ type: 'ghost', count: 3 + wave }, { type: 'zombie', count: 1 + Math.floor(wave / 2) }]; }
    else if (wave <= 9) { monsters = [{ type: 'ghost', count: 3 + wave }, { type: 'zombie', count: 1 + Math.floor(wave / 2) }, { type: 'shadow', count: Math.floor(wave / 3) }]; }
    else {
      const density = Math.min(3 + Math.floor((wave - 10) / 2), 8);
      monsters = [{ type: 'ghost', count: density + 2 }, { type: 'zombie', count: density }, { type: 'shadow', count: Math.floor(density / 2) }, { type: 'ghostfemale', count: Math.floor(density / 2) }];
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
    // Countdown before first spawn
    if (this.countdown > 0) { this.countdown -= dt; this.game.ui.setWaveInfoText('下一波 ' + Math.ceil(this.countdown) + 's'); return; }
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
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.nightAlpha = 0; }
  resize() {
    const wrap = document.getElementById('canvas-wrap');
    const w = Math.min(wrap.clientWidth, MAP_COLS * TILE_SIZE);
    const h = Math.min(wrap.clientHeight, MAP_ROWS * TILE_SIZE);
    this.canvas.width = w; this.canvas.height = h;
  }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  drawMap(game) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = game.map.getTile(c, r);
        const x = c * TILE_SIZE, y = r * TILE_SIZE;
        if (t === Tile.WALL) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#2a2a4a'; ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1); }
        else if (t === Tile.FLOOR) { ctx.fillStyle = '#252540'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#333355'; ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1); }
        else if (t === Tile.DOOR) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4); ctx.fillStyle = '#8b6914'; ctx.fillRect(x + 8, y + 10, TILE_SIZE - 16, TILE_SIZE - 20); ctx.strokeStyle = '#aa8844'; ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4); }
        else if (t === Tile.CORRIDOR) { ctx.fillStyle = '#1e1e30'; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#2a2a45'; ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1); }
      }
    }
  }
  drawBuildings(game) {
    const ctx = this.ctx;
    for (const b of game.buildings) {
      const x = b.pos.x * TILE_SIZE, y = b.pos.y * TILE_SIZE;
      const def = BUILDING_DEFS[b.type];
      ctx.fillStyle = def.color; ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
      ctx.strokeStyle = '#fff8'; ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
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
    for (const m of game.monsters) {
      if (m.state === MonsterState.DEAD) continue;
      const cx = m.pos.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = m.pos.y * TILE_SIZE + TILE_SIZE / 2;
      const color = m.type === 'ghost' ? '#ccf' : m.type === 'ghostfemale' ? '#f8c' : m.type === 'zombie' ? '#8f8' : '#a6f';
      if (m.flashTimer > 0) ctx.fillStyle = '#fff';
      else ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      // HP bar
      const hpPct = m.hp / m.maxHp;
      ctx.fillStyle = '#333'; ctx.fillRect(cx - 12, cy - 18, 24, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#4a4' : hpPct > 0.25 ? '#cc4' : '#c44';
      ctx.fillRect(cx - 12, cy - 18, 24 * hpPct, 4);
    }
  }
  drawProjectiles(game) {
    const ctx = this.ctx;
    for (const p of game.projectiles) {
      ctx.fillStyle = p.type === 'ice' ? '#8cf' : p.type === 'sniper' ? '#a6f' : p.type === 'bomber' ? '#f84' : '#ff4';
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
    this.wcTitle && (this.wcTitle.textContent = '第 ' + wave + ' 夜完成!');
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
    this.shopItems && this.shopItems.forEach(item => {
      const key = item.dataset.upgrade;
      const level = ups[key] || 0;
      item.querySelector('.shop-level').textContent = '(' + level + ')';
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
    const map = { ghost: '幽灵', ghostfemale: '女鬼', zombie: '丧尸', shadow: '暗影' };
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
    if (type === 'bed' || type === 'tower' || type === 'repairman' || type === 'ice_mage' || type === 'bomber' || type === 'sniper' || type === 'altar') {
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
    this.ui.showWaveBanner('第 ' + level + ' 关 - 准备就绪');
    this._startWave(level);
    if (!this.running) this.startLoop();
    if (this._firstRun) { this._firstRun = false; this.ui.showTutorial(); }
  }
  startEndless() {
    AudioEngine.init(); this.mode = GameMode.ENDLESS; this.phase = Phase.DAY; this.currentLevel = 0; this.wave = 1;
    this.gold = 100 + (this.saveData.prestigeUpgrades.goldMult || 0) * 20;
    this.maxGold = this.gold; this.doorHp = BASE_DOOR_HP * (1 + this.saveData.prestigeUpgrades.doorHp * 0.20); this.doorMaxHp = this.doorHp; this.doorLevel = 1;
    this.buildings = []; this.monsters = []; this.projectiles = []; this.particles = [];
    this.ui.hideMenu(); this.ui.showPlayerInfo(); this.ui.showBuildMenu(); this.ui.setGold(this.gold); this.ui.setDoorHp(this.doorHp, this.doorMaxHp);
    this.ui.showWaveBanner('无尽模式 - 第 1 夜');
    this.waveManager.startEndlessWave(1); this.phase = Phase.NIGHT; AudioEngine.playWaveStart();
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
      this.ui.showWaveBanner('无尽模式 - 第 ' + this.wave + ' 夜');
      this.waveManager.startEndlessWave(this.wave); this.phase = Phase.NIGHT; AudioEngine.playWaveStart();
      if (!this.running) this.startLoop();
    } catch (_) {}
  }
  _startWave(level) { this.waveManager.startLevelWave(level); this.phase = Phase.NIGHT; AudioEngine.playWaveStart(); }
  onWaveComplete(wave) {
    this.phase = Phase.WAVE_COMPLETE;
    const bonus = Math.floor((50 + wave * 10) * this.rewardMult);
    this.gold += bonus; this.maxGold = Math.max(this.maxGold, this.gold);
    if (this.mode === GameMode.LEVELS) {
      const sw = LEVEL_WAVES[this.currentLevel];
      const isLastWave = wave >= sw.length;
      if (isLastWave) {
        this.ui.showWaveComplete(wave, bonus, this.doorHp, this.doorMaxHp, this.gold);
        if (!this.saveData.completedLevels.includes(this.currentLevel)) this.saveData.completedLevels.push(this.currentLevel);
        if (this.currentLevel >= this.saveData.unlockedLevel) this.saveData.unlockedLevel = Math.min(MAX_LEVEL, this.currentLevel + 1);
        saveSave(this.saveData);
      } else {
        this.wave++; this.ui.showWaveBanner('第 ' + this.wave + ' 夜'); this.waveManager.startLevelWave(this.currentLevel); this.phase = Phase.NIGHT; AudioEngine.playWaveStart();
      }
    } else {
      this.ui.showWaveComplete(wave, bonus, this.doorHp, this.doorMaxHp, this.gold);
    }
  }
  onContinueNextWave() {
    this.ui.hideWaveComplete();
    if (this.mode === GameMode.ENDLESS) {
      this.wave++; this.ui.showWaveBanner('第 ' + this.wave + ' 夜'); this.waveManager.startEndlessWave(this.wave); this.phase = Phase.NIGHT; AudioEngine.playWaveStart();
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
    if (this.phase === Phase.NIGHT) {
      this.waveManager.update(dt);
      // Income
      for (const b of this.buildings) {
        if (b.type === 'bed') { b.incomeTimer += dt; const rate = b.getIncomeRate(); while (b.incomeTimer >= 1) { b.incomeTimer -= 1; const amt = rate * (1 + this.saveData.prestigeUpgrades.goldMult * 0.10); this.gold += amt; this.maxGold = Math.max(this.maxGold, this.gold); } }
        else if (b.type === 'repairman') { b.fireTimer += dt; const r = b.getRepairRate(); while (b.fireTimer >= 1) { b.fireTimer -= 1; for (const o of this.buildings) { if (o !== b && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + r); } } } }
      }
      // Generator boost calculation is dynamic during attacks
      // Monsters
      for (const m of this.monsters) { m.update(dt, this); }
      this.monsters = this.monsters.filter(m => m.state !== MonsterState.DEAD || m.deadTimer < 1);
      // Buildings attack
      for (const b of this.buildings) {
        if (b.hp <= 0) continue;
        if (b.type === 'tower' || b.type === 'ice_mage' || b.type === 'bomber' || b.type === 'sniper') {
          const iv = b.getInterval() / this.getAttackSpeedMult(b);
          b.fireTimer += dt;
          if (b.fireTimer >= iv) {
            b.fireTimer -= iv;
            const target = this._findTarget(b);
            if (target) {
              b.fireTimer = 0;
              const dmg = b.type === 'sniper' && Math.random() < b.getCritRate() ? Math.floor(b.getDamage() * b.getCritMult()) : b.getDamage();
              this.projectiles.push(new Projectile({ x: b.pos.x + 0.5, y: b.pos.y + 0.5 }, { x: target.pos.x, y: target.pos.y }, dmg, b.type === 'ice_mage' ? 'ice' : b.type === 'sniper' ? 'sniper' : b.type === 'bomber' ? 'bomber' : 'normal'));
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
    const reward = Math.floor((5 + this.wave) * this.rewardMult);
    this.gold += reward; this.maxGold = Math.max(this.maxGold, this.gold);
    this.addParticle(m.pos.x * TILE_SIZE + TILE_SIZE / 2, m.pos.y * TILE_SIZE + TILE_SIZE / 2, '#ffd740', 0.6);
    AudioEngine.playMonsterHit();
  }
}

/* ============================================================
   Initialize
   ============================================================ */
const game = new DarkDormGame();
window.darkDormGame = game;
AudioEngine.init();

})();
