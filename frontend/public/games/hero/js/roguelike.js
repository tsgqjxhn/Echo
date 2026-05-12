// ============================================================
// Roguelike Combat Engine
// Enhanced with screen shake, flash overlays, slow-motion,
// spawn animations, boss warning telegraphs, trail particles,
// and procedural audio cues for every combat event.
// ============================================================

class RoguelikeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.mapWidth = 2000;
    this.mapHeight = 2000;

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.particles = [];
    this.damageNumbers = [];
    this.decoys = [];
    this.itemEffects = { skillReadyCharges: 0, smokeTimer: 0, rebirthUsed: false, rebirthArmed: false };
    this.itemToast = null;

    // Screen shake: random camera offset that decays over time for impact feel
    this.screenShake = { intensity: 0, duration: 0, dx: 0, dy: 0 };

    // Full-screen color flash overlay (white on crit, red on player hit, gold on level-up)
    this.screenFlash = { color: null, alpha: 0 };

    // Slow-motion: briefly reduces dt multiplier for dramatic boss deaths / crits
    this.slowMotion = { factor: 1.0, timer: 0 };

    // Wave announcement text that fades in/out at the start of each wave
    this.waveAnnounce = { text: '', alpha: 0, timer: 0 };

    this.wave = 0;
    this.waveTimer = 0;
    this.waveEnemiesLeft = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveConfig = null;
    this.loopCount = 0;

    this.boss = null;
    this.bossSkillTimer = 0;
    this.bossSkillCooldowns = {};

    // Boss attack telegraph lines/warning circles drawn before skills fire
    this.bossWarnings = [];

    this.kills = 0;
    this.runTime = 0;
    this.rewards = { wood: 0, food: 0, stone: 0, gold: 0 };

    this.camera = { x: 0, y: 0 };
    this.joystick = { active: false, dx: 0, dy: 0, startX: 0, startY: 0, baseX: 0, baseY: 0 };
    this.skillButton = { x: 0, y: 0, radius: 42 };  // +20% larger for mobile
    this.backButton = { x: 0, y: 0, w: 36, h: 36 };
    this.bagButton = { x: 0, y: 0, w: 56, h: 56 };  // +17% larger for mobile
    this.bagOpen = false;
    this.bagItemSlots = [];
    this.skillReady = true;
    this.skillCooldown = 0;
    this.skillMaxCooldown = 15;

    this.levelUpChoices = null;
    this.gameOver = false;
    this.victory = false;
    this.onEnd = null;

    this._animFrame = null;
    this._inputBound = false;

    this.sprites = {};
    this.itemImg = {};
    this.backpackImg = null;
    this._loadSprites();
  }

  _loadSprites() {
    const base = 'assets/sprites/player/';
    const defs = {
      idle:        { src: 'idle.webp',        frames: 4 },
      walk_down:   { src: 'walk_down.webp',   frames: 6 },
      walk_up:     { src: 'walk_up.webp',     frames: 6 },
      walk_left:   { src: 'walk_left.webp',   frames: 6 },
      walk_right:  { src: 'walk_right.webp',  frames: 6 },
      attack:      { src: 'attack.webp',      frames: 6 },
      hurt:        { src: 'hurt.webp',        frames: 2 },
      death:       { src: 'death.webp',       frames: 8 }
    };
    for (const [key, def] of Object.entries(defs)) {
      const img = new Image();
      img.src = base + def.src;
      this.sprites[key] = { img, frames: def.frames, ready: false };
      img.onload = () => { this.sprites[key].ready = true; };
    }

    // Enemy sprite sheets
    this.enemySprites = {};
    for (const [eid, meta] of Object.entries(ENEMY_SPRITES)) {
      const set = { size: meta.size };
      for (const [action, frames] of Object.entries(meta)) {
        if (action === 'size') continue;
        const img = new Image();
        img.src = ASSETS.enemy(eid, action);
        set[action] = { img, frames, ready: false };
        img.onload = () => { set[action].ready = true; };
      }
      this.enemySprites[eid] = set;
    }

    // Boss sprite sheets (idle + death + skill animations)
    this.bossSprites = {};
    for (const [name, sid] of Object.entries(BOSS_SPRITE_IDS)) {
      const tmpl = BOSS_TYPES.find(b => b.name === name);
      const skills = (tmpl && tmpl.skills) || [];
      const set = { size: BOSS_SPRITE_SIZE[sid] };
      const wantedActions = new Set(['idle', 'death']);
      for (const sk of skills) {
        const meta = BOSS_SKILL_ANIM[sk];
        if (meta) wantedActions.add(meta.action);
      }
      for (const action of wantedActions) {
        let frames = 6;
        if (action === 'death') frames = sid === 'shadow_dragon' ? 10 : 8;
        else if (action === 'idle') frames = 6;
        else {
          const skKey = Object.entries(BOSS_SKILL_ANIM).find(([_, v]) => v.action === action);
          if (skKey) frames = skKey[1].frames;
        }
        const img = new Image();
        img.src = ASSETS.boss(sid, action);
        set[action] = { img, frames, ready: false };
        img.onload = () => { set[action].ready = true; };
      }
      this.bossSprites[sid] = set;
    }

    // Static FX images (single-frame textures used as projectiles/drops/auras)
    this.fxImg = {};
    const fxList = ['arrow', 'magicBolt', 'spear', 'slash', 'enemyBolt',
      'fireball', 'aoe', 'ice', 'stomp', 'breath', 'charge',
      'hitWhite', 'hitYellow', 'xpOrb', 'resOrb', 'arrowRain',
      'healAura', 'shieldAura', 'cmdAura'];
    for (const k of fxList) {
      const img = new Image();
      img.src = ASSETS.fx[k];
      this.fxImg[k] = { img, ready: false };
      img.onload = () => { this.fxImg[k].ready = true; };
    }
    this.fxDeath = {};
    for (const eid of Object.keys(ENEMY_SPRITES)) {
      const img = new Image();
      img.src = ASSETS.fx.deathParticle(eid);
      this.fxDeath[eid] = { img, ready: false, frames: 4 };
      img.onload = () => { this.fxDeath[eid].ready = true; };
    }

    // HUD images
    this.hudImg = {};
    for (const [k, src] of Object.entries(ASSETS.hud)) {
      const img = new Image();
      img.src = src;
      this.hudImg[k] = { img, ready: false };
      img.onload = () => { this.hudImg[k].ready = true; };
    }

    if (typeof BATTLE_ITEMS !== 'undefined') {
      for (const id of Object.keys(BATTLE_ITEMS)) {
        const img = new Image();
        img.src = ASSETS.battleItem(id);
        this.itemImg[id] = { img, ready: false };
        img.onload = () => { this.itemImg[id].ready = true; };
      }
    }
    const bag = new Image();
    bag.src = ASSETS.backpack;
    this.backpackImg = { img: bag, ready: false };
    bag.onload = () => { this.backpackImg.ready = true; };

    // Battlefield tile (rotates by stage)
    this.bgTile = { img: new Image(), ready: false };
    this.bgTile.img.onload = () => { this.bgTile.ready = true; };
    this.bgTile.img.src = ASSETS.bg('grass');
    this.boundaryTile = { img: new Image(), ready: false };
    this.boundaryTile.img.onload = () => { this.boundaryTile.ready = true; };
    this.boundaryTile.img.src = ASSETS.boundary;
  }

  _bossSpriteId(boss) {
    return BOSS_SPRITE_IDS[boss.name];
  }

  _setBattlefieldByStage(stageIndex, themeOverride = null) {
    const stageConfig = WAVE_CONFIGS[Math.min(stageIndex, WAVE_CONFIGS.length - 1)];
    const themes = ['rainforest', 'swamp', 'desert', 'snow', 'volcano'];
    const t = themeOverride || stageConfig?.theme || themes[Math.floor(stageIndex / 10) % themes.length];
    this.bgTile.ready = false;
    const img = new Image();
    img.onload = () => { this.bgTile.img = img; this.bgTile.ready = true; };
    img.src = ASSETS.bg(t);
  }

  _facingDir(angle) {
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a < Math.PI / 4 || a >= Math.PI * 7 / 4) return 'right';
    if (a < Math.PI * 3 / 4) return 'down';
    if (a < Math.PI * 5 / 4) return 'left';
    return 'up';
  }

  _drawSpriteFrame(ctx, key, frameIdx, cx, cy) {
    const s = this.sprites[key];
    if (!s || !s.ready) return false;
    const size = 64;
    const i = ((frameIdx % s.frames) + s.frames) % s.frames;
    ctx.drawImage(s.img, i * size, 0, size, size, cx - size / 2, cy - size / 2, size, size);
    return true;
  }

  start(heroTemplate, stageIndex, options = {}) {
    this.infiniteMode = !!options.infinite;
    const stage = this.infiniteMode ? Math.max(0, stageIndex || 0) : Math.min(stageIndex, WAVE_CONFIGS.length - 1);
    const civBonus = CIVILIZATIONS[gameState.player.civilization]?.bonus || {};
    const researchAtk = ResearchManager.getBattleBonus('attack');
    const researchHp = ResearchManager.getBattleBonus('hp');
    const researchSpeed = ResearchManager.getBattleBonus('speed');
    const researchCrit = ResearchManager.getBattleBonus('crit');
    const cityAtkBuff = getCityBuffValue('atkMult').value;
    const cityHpBuff = getCityBuffValue('hpMult').value;
    const cityXpBuff = getCityBuffValue('xpMult').value;
    const cityGoldBuff = getCityBuffValue('goldMult').value;
    const cityResDouble = getCityBuffValue('resDouble').double;

    // Use hero's unique weapon, fallback to class default
    const heroWeaponKey = heroTemplate.weapon ||
      (heroTemplate.heroClass === 'ranger' ? 'bow'
      : heroTemplate.heroClass === 'defender' ? 'spear'
      : heroTemplate.heroClass === 'support' ? 'staff'
      : 'sword');
    const heroWeapon = WEAPONS[heroWeaponKey];

    // Apply passive skill bonuses
    const passiveStats = (typeof HeroPassives !== 'undefined')
      ? HeroPassives.applyBattlePassives(heroTemplate.heroClass, {
          hp: (heroTemplate.baseHp || 100) * (1 + (civBonus.troopHp || 0) + researchHp + cityHpBuff),
          spd: (heroTemplate.baseSpd || 3.0) * (1 + researchSpeed),
          dodgeRate: 0
        })
      : { hp: (heroTemplate.baseHp || 100) * (1 + (civBonus.troopHp || 0) + researchHp + cityHpBuff), spd: (heroTemplate.baseSpd || 3.0) * (1 + researchSpeed), dodgeRate: 0 };

    this.player = {
      x: this.mapWidth / 2,
      y: this.mapHeight / 2,
      radius: 16,
      hp: passiveStats.hp,
      maxHp: passiveStats.hp,
      maxHp: (heroTemplate.baseHp || 100) * (1 + (civBonus.troopHp || 0) + researchHp + cityHpBuff),
      speed: passiveStats.spd,
      attack: (heroTemplate.baseAtk || 15) * (1 + (civBonus.troopAtk || 0) + researchAtk + cityAtkBuff),
      range: heroWeapon.range,
      attackSpeed: heroWeapon.speed,
      critRate: 0.05 + researchCrit,
      critDmg: 1.5,
      pickupRange: 60,
      hpRegen: 0,
      shieldCount: 0,
      xpMult: 1.0 + cityXpBuff,
      resourceMultiplier: (1 + ResearchManager.getBattleBonus('resource') + cityGoldBuff) * (cityResDouble ? 2 : 1),
      dropBonus: ResearchManager.getBattleBonus('luck'),
      xp: 0,
      xpToNext: 20,
      level: 1,
      weapon: heroWeaponKey,
      heroId: heroTemplate.id,
      heroClass: heroTemplate.heroClass,
      heroName: heroTemplate.name,
      skill: heroTemplate.skill,
      skillDesc: heroTemplate.skillDesc,
      invincible: 0,
      facing: 0,
      animState: 'idle',
      animTime: 0,
      attackAnim: 0,
      hurtAnim: 0,
      deathAnim: 0,
      moving: false,
      dir: 'down'
    };

    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.particles = [];
    this.damageNumbers = [];
    this.decoys = [];
    this.itemEffects = { skillReadyCharges: 0, smokeTimer: 0, rebirthUsed: false, rebirthArmed: false };
    this.itemToast = null;
    this.bagOpen = false;
    this.bagItemSlots = [];
    this.wave = 0;
    this.loopCount = 0;
    this.kills = 0;
    this.runTime = 0;
    this.rewards = { wood: 0, food: 0, stone: 0, gold: 0 };
    this.gameOver = false;
    this.victory = false;
    this.levelUpChoices = null;
    this.boss = null;
    this.spawnQueue = [];
    this.skillReady = true;
    this.skillCooldown = 0;
    this.running = true;
    this.paused = false;

    this._setBattlefieldByStage(stage, this.infiniteMode ? 'dungeon' : null);
    this.startWave(stage);
    this.bindInput();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  startWave(stageIndex) {
    const configIndex = this.infiniteMode ? stageIndex % WAVE_CONFIGS.length : Math.min(stageIndex, WAVE_CONFIGS.length - 1);
    const config = WAVE_CONFIGS[configIndex] || WAVE_CONFIGS[WAVE_CONFIGS.length - 1];
    this.waveConfig = config;
    this.wave = stageIndex + 1;
    this.spawnQueue = [];
    this.spawnTimer = 0;

    const loopBonus = this.infiniteMode ? Math.floor(stageIndex / WAVE_CONFIGS.length) * 0.65 : 0;
    const loopMult = 1 + this.loopCount * 0.5;
    const hpMult = ((config.hpMult || (1 + stageIndex * 0.15)) + loopBonus) * loopMult;
    const atkMult = ((config.atkMult || (1 + stageIndex * 0.15)) + loopBonus) * loopMult;
    const xpMult = (config.xpMult || hpMult);

    // Wave announcement - shows large centered text that fades out over 2 seconds
    const loopLabel = this.loopCount > 0 ? ` [循环 ${this.loopCount + 1}]` : '';
    this.waveAnnounce = {
      text: (config.boss ? `${config.mapName || 'BOSS'} - ${config.localStage || this.wave}` : (config.stageName || `第 ${this.wave} 关`)) + loopLabel,
      alpha: 1.0,
      timer: 2.0
    };
    sfx.waveStart();

    for (const group of config.enemies) {
      const template = ENEMY_TYPES[group.type];
      if (!template) continue;
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          ...template,
          hp: Math.floor(template.hp * hpMult),
          atk: Math.floor(template.atk * atkMult),
          xp: Math.floor(template.xp * xpMult)
        });
      }
    }

    this.waveEnemiesLeft = this.spawnQueue.length;

    if (config.boss || (this.infiniteMode && stageIndex > 0 && (stageIndex + 1) % 5 === 0)) {
      const bossTemplate = BOSS_TYPES[Math.min(config.bossIndex || 0, BOSS_TYPES.length - 1)];
      this.boss = {
        ...bossTemplate,
        hp: Math.floor(bossTemplate.hp * hpMult),
        maxHp: Math.floor(bossTemplate.hp * hpMult),
        atk: Math.floor(bossTemplate.atk * atkMult),
        x: this.mapWidth / 2 + (Math.random() - 0.5) * 400,
        y: this.mapHeight / 2 + (Math.random() - 0.5) * 400,
        radius: bossTemplate.size,
        isBoss: true,
        skillIndex: 0,
        skillTimer: 3 + Math.random() * 2,
        flash: 0,
        animAction: 'idle',
        animTime: 0,
        actionTimer: 0,
        deathAnim: 0,
        dying: false,
        // Spawn animation: boss fades in from large transparent circle
        spawnAnim: 1.0
      };
      // Boss entrance: screen shake + red flash + BGM
      this._shake(8, 0.5);
      this._flash('rgba(255,0,0,0.3)', 0.5);
      if (typeof HeroAudio !== 'undefined') HeroAudio.setBGM('boss');
    }
  }

  // --- Effect helpers ---

  // Apply screen shake: camera randomly offsets by intensity pixels, decays over duration seconds
  _shake(intensity, duration) {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    this.screenShake.duration = Math.max(this.screenShake.duration, duration);
  }

  // Flash the entire screen with a color overlay that fades over duration seconds
  _flash(color, duration) {
    this.screenFlash = { color, alpha: 1.0, decay: 1.0 / duration };
  }

  // Enter slow-motion: factor < 1 slows time, recovers after timer seconds
  _slowMo(factor, timer) {
    this.slowMotion.factor = factor;
    this.slowMotion.timer = timer;
  }

  stop() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.unbindInput();
  }

  loop(now) {
    if (!this.running) return;
    let dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Apply slow-motion factor to game tick rate (not render rate)
    if (this.slowMotion.timer > 0) {
      this.slowMotion.timer -= dt;
      if (this.slowMotion.timer <= 0) this.slowMotion.factor = 1.0;
    }
    const gameDt = dt * this.slowMotion.factor;

    if (!this.paused && !this.levelUpChoices && !this.gameOver) {
      this.update(gameDt);
    }

    // Always update visual effects at full speed so they remain smooth during slow-mo
    this._updateEffects(dt);

    this.render();
    this._animFrame = requestAnimationFrame(t => this.loop(t));
  }

  // Update visual-only effects (shake, flash, wave announce, boss warnings) at full framerate
  _updateEffects(dt) {
    // Screen shake decay
    const shake = this.screenShake;
    if (shake.duration > 0) {
      shake.duration -= dt;
      shake.dx = (Math.random() - 0.5) * 2 * shake.intensity;
      shake.dy = (Math.random() - 0.5) * 2 * shake.intensity;
      shake.intensity *= 0.92; // exponential decay for natural feel
      if (shake.duration <= 0) { shake.intensity = 0; shake.dx = 0; shake.dy = 0; }
    }

    // Screen flash decay
    if (this.screenFlash.alpha > 0) {
      this.screenFlash.alpha -= this.screenFlash.decay * dt;
      if (this.screenFlash.alpha < 0) this.screenFlash.alpha = 0;
    }

    // Wave announcement fade-out
    if (this.waveAnnounce.timer > 0) {
      this.waveAnnounce.timer -= dt;
      this.waveAnnounce.alpha = Math.min(1.0, this.waveAnnounce.timer / 0.5);
      if (this.waveAnnounce.timer <= 0) this.waveAnnounce.alpha = 0;
    }

    // Boss warning indicators decay
    for (let i = this.bossWarnings.length - 1; i >= 0; i--) {
      this.bossWarnings[i].timer -= dt;
      if (this.bossWarnings[i].timer <= 0) this.bossWarnings.splice(i, 1);
    }

    if (this.itemToast) {
      this.itemToast.timer -= dt;
      if (this.itemToast.timer <= 0) this.itemToast = null;
    }
  }

  update(dt) {
    this.runTime += dt;
    const p = this.player;

    // Player movement
    p.moving = false;
    if (this.joystick.active) {
      const len = Math.sqrt(this.joystick.dx * this.joystick.dx + this.joystick.dy * this.joystick.dy);
      if (len > 0) {
        const nx = this.joystick.dx / len;
        const ny = this.joystick.dy / len;
        p.x += nx * p.speed * 60 * dt;
        p.y += ny * p.speed * 60 * dt;
        p.facing = Math.atan2(ny, nx);
        p.moving = true;
        p.dir = this._facingDir(p.facing);
      }
      p.x = Math.max(p.radius, Math.min(this.mapWidth - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(this.mapHeight - p.radius, p.y));
    }

    // Animation state machine
    p.attackAnim = Math.max(0, p.attackAnim - dt);
    p.hurtAnim = Math.max(0, p.hurtAnim - dt);
    let nextState;
    if (this.gameOver) {
      nextState = 'death';
      p.deathAnim += dt;
    } else if (p.hurtAnim > 0) {
      nextState = 'hurt';
    } else if (p.attackAnim > 0) {
      nextState = 'attack';
    } else if (p.moving) {
      nextState = 'walk';
    } else {
      nextState = 'idle';
    }
    if (nextState !== p.animState) { p.animState = nextState; p.animTime = 0; }
    else { p.animTime += dt; }

    // Camera follow
    this.camera.x = p.x - this.canvas.width / 2;
    this.camera.y = p.y - this.canvas.height / 2;

    // Auto-shoot
    p.invincible = Math.max(0, p.invincible - dt);
    this.shootTimer = (this.shootTimer || 0) - dt;
    if (this.shootTimer <= 0) {
      this.autoShoot();
      this.shootTimer = p.attackSpeed;
    }

    // Skill cooldown
    if (!this.skillReady) {
      this.skillCooldown -= dt;
      if (this.skillCooldown <= 0) {
        this.skillReady = true;
        this.skillCooldown = 0;
      }
    }

    // HP regen
    if (p.hpRegen > 0) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.hpRegen * dt);
    }

    if (this.itemEffects.smokeTimer > 0) {
      this.itemEffects.smokeTimer = Math.max(0, this.itemEffects.smokeTimer - dt);
    }

    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.flash = Math.max(0, d.flash - dt);
      d.animTime = (d.animTime || 0) + dt;
      if (d.hp <= 0) this.decoys.splice(i, 1);
    }

    // Spawn enemies with entrance animation (fade-in + scale-up from 0 over 0.3s)
    this.spawnTimer -= dt;
    if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
      const template = this.spawnQueue.shift();
      const angle = Math.random() * Math.PI * 2;
      const dist = 400 + Math.random() * 100;
      this.enemies.push({
        ...template,
        maxHp: template.hp,
        x: p.x + Math.cos(angle) * dist,
        y: p.y + Math.sin(angle) * dist,
        radius: template.size,
        flash: 0,
        attackTimer: 0,
        // Spawn animation: enemy starts transparent and small, grows to full size
        spawnAnim: 0.3
      });
      this.spawnTimer = this.waveConfig.spawnInterval * (0.8 + Math.random() * 0.4);
    }

    // Update enemies (spawn animation, movement, flash decay)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.flash = Math.max(0, e.flash - dt);
      // Tick down spawn animation timer; enemy is invulnerable while spawning
      if (e.spawnAnim > 0) { e.spawnAnim -= dt; continue; }

      // Berserker: attack doubles when HP < 50%
      let effectiveAtk = e.atk;
      if (e.berserkMode && e.hp < e.maxHp * 0.5) {
        effectiveAtk = Math.floor(e.atk * 2);
      }

      const target = this._getEnemyTarget(e);
      if (!target) {
        this._wanderEntity(e, dt);
        continue;
      }

      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));

      // Necromancer: summon skeletons periodically
      if (e.summonSkill) {
        e.summonTimer = (e.summonTimer || 0) - dt;
        if (e.summonTimer <= 0 && this.enemies.length < 80) {
          e.summonTimer = 6 + Math.random() * 4;
          for (let si = 0; si < 2; si++) {
            const angle = Math.random() * Math.PI * 2;
            this.enemies.push({
              ...ENEMY_TYPES.skeleton,
              hp: 20, maxHp: 20, atk: 4,
              x: e.x + Math.cos(angle) * 40,
              y: e.y + Math.sin(angle) * 40,
              radius: 12, flash: 0, attackTimer: 0,
              xp: 2, color: '#b0bec5', spawnAnim: 0.3
            });
          }
          this.spawnDamageNumber(e.x, e.y - 20, 'SUMMON', '#9c27b0');
        }
        // Also ranged attack
        if (dist > (e.range || 150) * 0.8) {
          e.x += (dx / dist) * e.speed * 60 * dt;
          e.y += (dy / dist) * e.speed * 60 * dt;
        } else {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            this.projectiles.push({
              x: e.x, y: e.y,
              dx: (dx / dist) * 180, dy: (dy / dist) * 180,
              damage: effectiveAtk, radius: 5, color: '#880e4f',
              enemy: true, life: 3, fxKey: 'enemyBolt'
            });
            e.attackTimer = 2.0;
          }
        }
        continue;
      }

      if (e.ranged && dist > (e.range || 150) * 0.8) {
        // Move toward target
        e.x += (dx / dist) * e.speed * 60 * dt;
        e.y += (dy / dist) * e.speed * 60 * dt;
      } else if (e.ranged) {
        // Shoot
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          let projColor = '#ff4444';
          let projFx = 'enemyBolt';
          if (e.elementType === 'ice') { projColor = '#80d8ff'; projFx = 'ice'; }
          this.projectiles.push({
            x: e.x, y: e.y,
            dx: (dx / dist) * 200, dy: (dy / dist) * 200,
            damage: effectiveAtk, radius: 4, color: projColor,
            enemy: true, life: 3, fxKey: projFx
          });
          e.attackTimer = 1.5;
        }
      } else {
        // Melee: move toward target
        let moveSpeed = e.speed;
        // Troll is slow but hits hard
        if (e.slowAttack) { moveSpeed *= 0.7; }
        // Shadow assassin is extra fast
        if (e.dodgeRate) { moveSpeed *= 1.2; }
        e.x += (dx / dist) * moveSpeed * 60 * dt;
        e.y += (dy / dist) * moveSpeed * 60 * dt;

        if (dist < target.radius + e.radius) {
          this.damageTarget(target, effectiveAtk);
          // Knockback
          e.x -= (dx / dist) * 20;
          e.y -= (dy / dist) * 20;
        }
      }
    }

    // Update boss
    if (this.boss && this.boss.hp > 0) {
      this.updateBoss(dt);
    } else if (this.boss && this.boss.dying) {
      this.boss.deathAnim += dt;
      this.boss.animTime += dt;
      if (this.boss.deathAnim > 1.0) {
        this.boss = null;
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.dx * dt;
      proj.y += proj.dy * dt;
      proj.life -= dt;

      if (proj.life <= 0) { this.projectiles.splice(i, 1); continue; }

      if (proj.enemy) {
        let hitDecoy = false;
        for (let d = this.decoys.length - 1; d >= 0; d--) {
          const decoy = this.decoys[d];
          const ddx = proj.x - decoy.x;
          const ddy = proj.y - decoy.y;
          if (Math.sqrt(ddx * ddx + ddy * ddy) < decoy.radius + proj.radius) {
            this.damageDecoy(decoy, proj.damage);
            this.projectiles.splice(i, 1);
            hitDecoy = true;
            break;
          }
        }
        if (hitDecoy) continue;

        // Hit player
        const dx = proj.x - p.x;
        const dy = proj.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + proj.radius) {
          this.damagePlayer(proj.damage);
          this.projectiles.splice(i, 1);
        }
      } else {
        // Hit enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dx = proj.x - e.x;
          const dy = proj.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < e.radius + proj.radius) {
            this.damageEnemy(e, proj.damage, j);
            if (!proj.pierce) { this.projectiles.splice(i, 1); break; }
          }
        }
        // Hit boss
        if (this.boss && this.boss.hp > 0 && i < this.projectiles.length) {
          const proj2 = this.projectiles[i];
          if (proj2 && !proj2.enemy) {
            const dx = proj2.x - this.boss.x;
            const dy = proj2.y - this.boss.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.boss.radius + proj2.radius) {
              this.boss.hp -= proj2.damage;
              this.boss.flash = 0.1;
              this.spawnDamageNumber(this.boss.x, this.boss.y, proj2.damage, '#ffeb3b');
              this.projectiles.splice(i, 1);
              if (this.boss.hp <= 0) this.onBossDeath();
            }
          }
        }
      }
    }

    // Update drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.pickupRange) {
        // Magnet pull
        const speed = 300;
        d.x += (dx / dist) * speed * dt;
        d.y += (dy / dist) * speed * dt;
      }
      if (dist < p.radius + 10) {
        this.collectDrop(d);
        this.drops.splice(i, 1);
      } else {
        d.life -= dt;
        if (d.life <= 0) this.drops.splice(i, 1);
      }
    }

    // Update particles (with gravity support for death bursts and trail spawning)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      if (pt.followPlayer) {
        pt.x = this.player.x;
        pt.y = this.player.y;
      } else {
        pt.x += pt.dx * dt;
        pt.y += pt.dy * dt;
        // Gravity: particles with gravity field accelerate downward (e.g. death debris)
        if (pt.gravity) pt.dy += pt.gravity * dt;
      }
      // Trail: spawn small fading dots behind moving particles for streak effect
      if (pt.trail && pt.life > 0.1) {
        this.particles.push({
          x: pt.x, y: pt.y, dx: 0, dy: 0,
          life: 0.15, color: pt.color, size: pt.size * 0.4
        });
      }
      pt.life -= dt;
      pt.totalLife = pt.totalLife || pt.life + dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Update damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y -= 30 * dt;
      dn.life -= dt;
      if (dn.life <= 0) this.damageNumbers.splice(i, 1);
    }

    // Check wave completion (wait for boss death animation if any)
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && !this.boss) {
      if (this.infiniteMode) {
        // Infinite mode: loop with increasing difficulty
        this.loopCount++;
        this.player.x = this.mapWidth / 2;
        this.player.y = this.mapHeight / 2;
        this.enemies = [];
        this.projectiles = [];
        this.drops = [];
        this.particles = [];
        this.damageNumbers = [];
        this._setBattlefieldByStage(0, 'dungeon');
        this.startWave(0);
      } else {
        // Normal mode: clear all monsters = victory
        this.victory = true;
        this.running = false;
        sfx.victory();
        this.render();
        if (this.onEnd) this.onEnd(true, this.kills, this.runTime, this.rewards, this.wave);
      }
    }
  }

  autoShoot() {
    const p = this.player;
    const weapon = WEAPONS[p.weapon] || WEAPONS.sword;

    // Find nearest enemy (or boss)
    let nearest = null;
    let nearestDist = Infinity;

    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearest = e; nearestDist = dist; }
    }

    if (this.boss && this.boss.hp > 0) {
      const dx = this.boss.x - p.x;
      const dy = this.boss.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearest = this.boss; nearestDist = dist; }
    }

    if (!nearest || nearestDist > p.range + weapon.range) return;

    const dx = nearest.x - p.x;
    const dy = nearest.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Trigger attack animation + face target
    p.facing = Math.atan2(ny, nx);
    p.dir = this._facingDir(p.facing);
    p.attackAnim = 0.36;

    p.facing = Math.atan2(ny, nx);

    const isCrit = Math.random() < p.critRate;
    const dmg = Math.floor(p.attack * weapon.dmg / 10 * (isCrit ? p.critDmg : 1));

    // Weapon-specific sound via HeroAudio
    if (typeof HeroAudio !== 'undefined') {
      HeroAudio.playAttack(p.weapon || 'sword');
    } else if (weapon.type === 'projectile') {
      if (p.weapon === 'bow') sfx.shootBow();
      else sfx.shoot();
    } else if (weapon.type === 'aoe') {
      sfx.shootMagic();
    } else {
      sfx.shoot();
    }

    if (isCrit) {
      sfx.critHit();
      // Crit impact: stronger screen shake and brief slow-motion
      this._shake(3, 0.15);
      this._slowMo(0.5, 0.1);
    }

    if (weapon.type === 'aoe') {
      // AoE: shoot in spread pattern
      for (let a = -0.3; a <= 0.3; a += 0.3) {
        const cos = Math.cos(a), sin = Math.sin(a);
        const rdx = nx * cos - ny * sin;
        const rdy = nx * sin + ny * cos;
        this.projectiles.push({
          x: p.x, y: p.y,
          dx: rdx * 300, dy: rdy * 300,
          damage: Math.floor(dmg * 0.7), radius: 6, color: weapon.color,
          life: 0.5, aoe: true, fxKey: 'magicBolt',
        });
      }
    } else if (weapon.type === 'melee') {
      // Melee: instant hit in cone
      for (const e of this.enemies) {
        const ex = e.x - p.x, ey = e.y - p.y;
        const ed = Math.sqrt(ex * ex + ey * ey);
        if (ed < weapon.range) {
          const angle = Math.atan2(ey, ex) - p.facing;
          if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < 0.8) {
            const idx = this.enemies.indexOf(e);
            this.damageEnemy(e, dmg, idx);
          }
        }
      }
      if (this.boss && this.boss.hp > 0) {
        const bx = this.boss.x - p.x, by = this.boss.y - p.y;
        if (Math.sqrt(bx * bx + by * by) < weapon.range) {
          this.boss.hp -= dmg;
          this.boss.flash = 0.1;
          this.spawnDamageNumber(this.boss.x, this.boss.y, dmg, '#ffeb3b');
          if (this.boss.hp <= 0) this.onBossDeath();
        }
      }
      // Melee visual
      this.particles.push({
        x: p.x + Math.cos(p.facing) * 30,
        y: p.y + Math.sin(p.facing) * 30,
        dx: Math.cos(p.facing) * 100, dy: Math.sin(p.facing) * 100,
        life: 0.15, color: weapon.color, size: 20,
        spriteKey: 'slash', spriteAngle: p.facing,
      });
    } else {
      // Projectile — pick visual based on weapon
      let fxKey = 'arrow';
      if (p.weapon === 'spear') fxKey = 'spear';
      else if (p.weapon === 'staff') fxKey = 'magicBolt';
      else if (p.weapon === 'crossbow') fxKey = 'arrow';
      this.projectiles.push({
        x: p.x, y: p.y,
        dx: nx * 350, dy: ny * 350,
        damage: dmg, radius: 4, color: weapon.color,
        life: 1.0, pierce: weapon.type === 'crossbow',
        fxKey, angle: Math.atan2(ny, nx),
      });
    }

    if (isCrit) {
      this.spawnDamageNumber(nearest.x, nearest.y - 20, dmg, '#ff5722');
    }
  }

  damageEnemy(e, dmg, idx) {
    // Shadow assassin dodge chance
    if (e.dodgeRate && Math.random() < e.dodgeRate) {
      this.spawnDamageNumber(e.x, e.y - 15, 'MISS', '#4caf50');
      return;
    }
    e.hp -= dmg;
    e.flash = 0.08;
    this.spawnDamageNumber(e.x, e.y, dmg, '#ffffff');
    sfx.hit();

    if (e.hp <= 0 && idx >= 0) {
      this.kills++;
      sfx.enemyDeath();
      // Check mana flow passive (support)
      if (typeof HeroPassives !== 'undefined') {
        const manaFlow = HeroPassives.checkManaFlow(this.player.heroClass);
        if (manaFlow) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * manaFlow.hpRestore);
          this.skillCooldown = Math.max(0, this.skillCooldown - manaFlow.cdReduce);
          this.spawnDamageNumber(this.player.x, this.player.y - 25, 'MANA+' , '#4fc3f7');
        }
        // Check headshot passive proc display (ranger crit bonus already applied)
        if (this.player.heroClass === 'ranger' && dmg >= this.player.attack * 2.5) {
          this.spawnDamageNumber(e.x, e.y - 35, 'HEADSHOT', '#ff9800');
        }
      }
      // Drop XP orb that pulses and drifts slightly
      this.drops.push({ x: e.x, y: e.y, type: 'xp', value: Math.floor(e.xp * this.player.xpMult), life: 15, color: '#00e5ff' });
      if (Math.random() < 0.15 * (1 + (this.player.dropBonus || 0))) {
        const resTypes = ['wood', 'food', 'stone', 'gold'];
        this.drops.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y + (Math.random() - 0.5) * 20, type: 'resource', resource: resTypes[Math.floor(Math.random() * 4)], value: Math.floor((3 + Math.random() * 8) * (window.__difficultyRewardMult || 1)), life: 15, color: '#ffd740' });
      }
      // Death burst: themed particles scatter outward with gravity-like deceleration
      const ek = this._enemyKeyFor(e);
      for (let k = 0; k < 8; k++) {
        this.particles.push({
          x: e.x, y: e.y,
          dx: (Math.random() - 0.5) * 200, dy: (Math.random() - 0.5) * 200 - 50,
          life: 0.5 + Math.random() * 0.3, color: e.color || '#fff', size: 3 + Math.random() * 3,
          spriteKey: ek ? `death_${ek}` : null,
          gravity: 120, // particles fall slightly
        });
      }
      this.enemies.splice(idx, 1);
    }
  }

  _enemyKeyFor(e) {
    // Look up by name match to keys in ENEMY_TYPES.
    for (const [k, t] of Object.entries(ENEMY_TYPES)) {
      if (t.name === e.name) return k;
    }
    return null;
  }

  _getEnemyTarget(actor) {
    if (this.itemEffects.smokeTimer > 0) return null;
    const aliveDecoys = this.decoys.filter(d => d.hp > 0);
    if (aliveDecoys.length === 0) return this.player;

    let nearest = aliveDecoys[0];
    let nearestDist = Infinity;
    for (const d of aliveDecoys) {
      const dx = d.x - actor.x;
      const dy = d.y - actor.y;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearest = d;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  _wanderEntity(entity, dt, speedScale = 0.85) {
    entity.wanderTimer = (entity.wanderTimer || 0) - dt;
    if (entity.wanderTimer <= 0) {
      entity.wanderAngle = Math.random() * Math.PI * 2;
      entity.wanderTimer = 0.5 + Math.random() * 0.9;
    }
    const speed = (entity.speed || 1) * 60 * speedScale;
    entity.x += Math.cos(entity.wanderAngle) * speed * dt;
    entity.y += Math.sin(entity.wanderAngle) * speed * dt;
    entity.x = Math.max(entity.radius, Math.min(this.mapWidth - entity.radius, entity.x));
    entity.y = Math.max(entity.radius, Math.min(this.mapHeight - entity.radius, entity.y));
  }

  damageTarget(target, dmg) {
    if (target?.isDecoy) {
      this.damageDecoy(target, dmg);
    } else {
      this.damagePlayer(dmg);
    }
  }

  damageDecoy(decoy, dmg) {
    decoy.hp -= dmg;
    decoy.flash = 0.12;
    this.spawnDamageNumber(decoy.x, decoy.y - 18, dmg, '#d09a52');
    if (decoy.hp <= 0) {
      decoy.hp = 0;
      this._shake(4, 0.15);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push({
          x: decoy.x, y: decoy.y,
          dx: Math.cos(a) * (80 + Math.random() * 80),
          dy: Math.sin(a) * (80 + Math.random() * 80),
          life: 0.45 + Math.random() * 0.25,
          color: i % 2 ? '#d09a52' : '#8d5a2b',
          size: 3 + Math.random() * 3
        });
      }
    }
  }

  damagePlayer(dmg) {
    const p = this.player;
    if (p.invincible > 0) return;

    // Check dodge (ranger agility passive)
    if (typeof HeroPassives !== 'undefined' && HeroPassives.checkDodge(p.heroClass)) {
      p.invincible = 0.3;
      this.spawnDamageNumber(p.x, p.y, 'DODGE', '#4caf50');
      sfx.shieldBlock();
      return;
    }

    // Check shield
    if (p.shieldCount > 0) {
      p.shieldCount--;
      p.invincible = 0.5;
      this.spawnDamageNumber(p.x, p.y, 'BLOCK', '#4fc3f7');
      sfx.shieldBlock();
      this._flash('rgba(79,195,247,0.2)', 0.2);
      return;
    }

    // Check fortress mode (commander passive - reduce damage when HP < 30%)
    let actualDmg = dmg;
    if (typeof HeroPassives !== 'undefined') {
      const dmgReduce = HeroPassives.checkFortressMode(p.heroClass, p.hp / p.maxHp);
      if (dmgReduce > 0) {
        actualDmg = Math.floor(dmg * (1 - dmgReduce));
        this.spawnDamageNumber(p.x, p.y - 15, 'RESIST', '#ffd740');
      }
      // Check thorns (defender passive - reflect damage)
      const reflectPct = HeroPassives.checkThorns(p.heroClass);
      if (reflectPct > 0 && this.enemies.length > 0) {
        const nearestEnemy = this.enemies.reduce((a, b) => {
          const da = Math.hypot(a.x - p.x, a.y - p.y);
          const db = Math.hypot(b.x - p.x, b.y - p.y);
          return da < db ? a : b;
        });
        const reflectDmg = Math.floor(dmg * reflectPct);
        nearestEnemy.hp -= reflectDmg;
        this.spawnDamageNumber(nearestEnemy.x, nearestEnemy.y, reflectDmg, '#ff9800');
        if (nearestEnemy.hp <= 0) {
          const idx = this.enemies.indexOf(nearestEnemy);
          if (idx >= 0) {
            this.kills++;
            sfx.enemyDeath();
            this.drops.push({ x: nearestEnemy.x, y: nearestEnemy.y, type: 'xp', value: Math.floor(nearestEnemy.xp * p.xpMult), life: 15, color: '#00e5ff' });
            this.enemies.splice(idx, 1);
          }
        }
      }
    }

    p.hp -= actualDmg;
    p.invincible = 0.3;
    p.hurtAnim = 0.2;
    this.spawnDamageNumber(p.x, p.y, actualDmg, '#ff1744');
    sfx.playerHurt();
    // Player hit: red edge flash + mild screen shake
    this._flash('rgba(255,23,68,0.25)', 0.3);
    this._shake(4, 0.2);

    // Counter attack (commander passive)
    if (typeof HeroPassives !== 'undefined') {
      const counterDmgMult = HeroPassives.checkCounterAttack(p.heroClass);
      if (counterDmgMult > 0 && this.enemies.length > 0) {
        const nearest = this.enemies.reduce((a, b) => {
          const da = Math.hypot(a.x - p.x, a.y - p.y);
          const db = Math.hypot(b.x - p.x, b.y - p.y);
          return da < db ? a : b;
        });
        if (Math.hypot(nearest.x - p.x, nearest.y - p.y) < 120) {
          const counterDmg = Math.floor(p.attack * counterDmgMult);
          nearest.hp -= counterDmg;
          this.spawnDamageNumber(nearest.x, nearest.y, counterDmg, '#4fc3f7');
          nearest.flash = 0.1;
          if (nearest.hp <= 0) {
            const idx = this.enemies.indexOf(nearest);
            if (idx >= 0) {
              this.kills++;
              sfx.enemyDeath();
              this.drops.push({ x: nearest.x, y: nearest.y, type: 'xp', value: Math.floor(nearest.xp * p.xpMult), life: 15, color: '#00e5ff' });
              this.enemies.splice(idx, 1);
            }
          }
        }
      }
    }

    if (p.hp <= 0) {
      if (this.tryRebirth()) return;
      p.hp = 0;
      this.gameOver = true;
      this.running = false;
      sfx.gameOver();
      // Death: strong shake + slow-motion + deep red overlay
      this._shake(12, 0.6);
      this._flash('rgba(255,0,0,0.5)', 0.8);
      this._slowMo(0.3, 1.0);
      if (this.onEnd) this.onEnd(false, this.kills, this.runTime, this.rewards, this.wave);
    }
  }

  tryRebirth() {
    if (this.itemEffects.rebirthUsed) return false;
    if (getItemCount('rebirth_charm') <= 0) return false;
    if (!consumeInventoryItem('rebirth_charm', 1)) return false;

    const p = this.player;
    this.itemEffects.rebirthUsed = true;
    this.itemEffects.rebirthArmed = false;
    p.hp = p.maxHp;
    p.invincible = 3;
    p.hurtAnim = 0;
    this.showItemToast('重生符触发，生命已回满');
    this.spawnDamageNumber(p.x, p.y - 35, 'REBIRTH', '#ffd166');
    this._flash('rgba(255,209,102,0.42)', 0.65);
    this._shake(10, 0.45);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      this.particles.push({
        x: p.x, y: p.y,
        dx: Math.cos(a) * 180,
        dy: Math.sin(a) * 180 - 40,
        life: 0.8,
        color: i % 2 ? '#ffd166' : '#d94b2b',
        size: 4,
        trail: true
      });
    }
    return true;
  }

  updateBoss(dt) {
    const b = this.boss;
    const p = this.player;
    b.flash = Math.max(0, b.flash - dt);
    b.animTime = (b.animTime || 0) + dt;
    b.actionTimer = Math.max(0, (b.actionTimer || 0) - dt);
    // Boss spawn animation: boss is immobile during entrance
    if (b.spawnAnim > 0) { b.spawnAnim -= dt; return; }
    if (b.actionTimer <= 0 && b.animAction !== 'idle') {
      b.animAction = 'idle';
      b.animTime = 0;
    }

    const target = this._getEnemyTarget(b);
    if (!target) {
      this._wanderEntity(b, dt, 0.65);
      return;
    }

    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));

    // Move toward target
    if (dist > b.radius + target.radius + 30) {
      b.x += (dx / dist) * b.speed * 60 * dt;
      b.y += (dy / dist) * b.speed * 60 * dt;
    }

    // Melee contact
    if (dist < b.radius + target.radius + 10) {
      this.damageTarget(target, b.atk);
    }

    // Boss skills
    b.skillTimer -= dt;
    if (b.skillTimer <= 0 && b.skills && b.skills.length > 0) {
      const skill = b.skills[b.skillIndex % b.skills.length];
      b.skillIndex++;
      this.executeBossSkill(b, skill);
      const meta = BOSS_SKILL_ANIM[skill];
      if (meta) {
        b.animAction = meta.action;
        b.animTime = 0;
        b.actionTimer = 0.6;
      }
      b.skillTimer = 3 + Math.random() * 2;
    }
  }

  executeBossSkill(boss, skill) {
    const p = this.player;
    const target = this._getEnemyTarget(boss) || p;
    sfx.bossSkill();
    // Boss skill warning: brief red telegraph line from boss to player
    this.bossWarnings.push({
      x1: boss.x, y1: boss.y,
      x2: target.x, y2: target.y,
      timer: 0.4, color: 'rgba(255,23,68,0.5)'
    });
    switch (skill) {
      case 'charge':
        const dx = target.x - boss.x, dy = target.y - boss.y;
        const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        this.projectiles.push({
          x: boss.x, y: boss.y,
          dx: (dx / dist) * 500, dy: (dy / dist) * 500,
          damage: boss.atk * 2, radius: 20, color: '#ff1744',
          enemy: true, life: 1.5, fxKey: 'charge'
        });
        break;
      case 'summon':
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.enemies.push({
            ...ENEMY_TYPES.skeleton,
            hp: 30, maxHp: 30, atk: 5,
            x: boss.x + Math.cos(angle) * 60,
            y: boss.y + Math.sin(angle) * 60,
            radius: 12, flash: 0, attackTimer: 0,
            xp: 3, color: '#b0bec5'
          });
        }
        break;
      case 'fireball':
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2;
          this.projectiles.push({
            x: boss.x, y: boss.y,
            dx: Math.cos(angle) * 200, dy: Math.sin(angle) * 200,
            damage: boss.atk, radius: 8, color: '#ff6e40',
            enemy: true, life: 2, fxKey: 'fireball'
          });
        }
        break;
      case 'aoe':
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          this.projectiles.push({
            x: boss.x, y: boss.y,
            dx: Math.cos(angle) * 150, dy: Math.sin(angle) * 150,
            damage: boss.atk * 0.8, radius: 10, color: '#ff9100',
            enemy: true, life: 2.5, fxKey: 'aoe'
          });
        }
        break;
      case 'ice_wall':
        for (let i = 0; i < 6; i++) {
          const x = target.x + (Math.random() - 0.5) * 200;
          const y = target.y + (Math.random() - 0.5) * 200;
          this.projectiles.push({
            x, y, dx: 0, dy: 0,
            damage: boss.atk, radius: 25, color: '#80d8ff',
            enemy: true, life: 3, fxKey: 'ice'
          });
        }
        break;
      case 'stomp':
        const pdx = target.x - boss.x, pdy = target.y - boss.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < 200) this.damageTarget(target, boss.atk * 1.5);
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          this.particles.push({
            x: boss.x, y: boss.y,
            dx: Math.cos(angle) * 200, dy: Math.sin(angle) * 200,
            life: 0.5, color: '#03a9f4', size: 8,
            spriteKey: 'stomp'
          });
        }
        break;
      case 'breath':
        const angle2 = Math.atan2(target.y - boss.y, target.x - boss.x);
        for (let i = 0; i < 15; i++) {
          const spread = angle2 + (Math.random() - 0.5) * 0.6;
          this.projectiles.push({
            x: boss.x, y: boss.y,
            dx: Math.cos(spread) * (200 + Math.random() * 100),
            dy: Math.sin(spread) * (200 + Math.random() * 100),
            damage: boss.atk * 0.6, radius: 6, color: '#6a1b9a',
            enemy: true, life: 2, fxKey: 'breath'
          });
        }
        break;
      case 'fly':
        boss.x += (Math.random() - 0.5) * 300;
        boss.y += (Math.random() - 0.5) * 300;
        boss.x = Math.max(100, Math.min(this.mapWidth - 100, boss.x));
        boss.y = Math.max(100, Math.min(this.mapHeight - 100, boss.y));
        break;
    }
  }

  onBossDeath() {
    const b = this.boss;
    b.dying = true;
    b.animAction = 'death';
    b.animTime = 0;
    sfx.bossDeath();
    if (typeof HeroAudio !== 'undefined') HeroAudio.setBGM('battle');
    // Boss death: heavy screen shake + slow-motion + golden flash
    this._shake(15, 0.8);
    this._flash('rgba(255,215,64,0.4)', 0.6);
    this._slowMo(0.25, 1.2);
    // Massive golden particle explosion with trails
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 150 + Math.random() * 250;
      this.particles.push({
        x: b.x, y: b.y,
        dx: Math.cos(a) * spd, dy: Math.sin(a) * spd - 80,
        life: 1.2 + Math.random() * 0.5, color: i % 3 === 0 ? '#ff9800' : '#ffd740',
        size: 4 + Math.random() * 4, trail: true, gravity: 80
      });
    }
    // Big rewards
    this.drops.push({ x: b.x, y: b.y, type: 'xp', value: Math.floor(b.xp * this.player.xpMult), life: 20, color: '#00e5ff' });
    for (let i = 0; i < 5; i++) {
      const resTypes = ['wood', 'food', 'stone', 'gold'];
      this.drops.push({
        x: b.x + (Math.random() - 0.5) * 40,
        y: b.y + (Math.random() - 0.5) * 40,
        type: 'resource', resource: resTypes[Math.floor(Math.random() * 4)],
        value: Math.floor((15 + Math.floor(Math.random() * 20)) * (window.__difficultyRewardMult || 1)), life: 20, color: '#ffd740'
      });
    }
    gameState.roguelike.totalBossKills++;
  }

  collectDrop(drop) {
    sfx.pickup();
    if (drop.type === 'xp') {
      this.player.xp += drop.value;
      while (this.player.xp >= this.player.xpToNext) {
        this.player.xp -= this.player.xpToNext;
        this.player.level++;
        this.player.xpToNext = Math.floor(this.player.xpToNext * 1.3);
        this.showLevelUp();
        // Level-up: gold flash + ascending sparkle particles + chime
        sfx.levelUp();
        this._flash('rgba(255,215,64,0.3)', 0.4);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          this.particles.push({
            x: this.player.x, y: this.player.y,
            dx: Math.cos(a) * 120, dy: Math.sin(a) * 120 - 60,
            life: 0.6, color: '#ffd740', size: 3, trail: true
          });
        }
      }
    } else if (drop.type === 'resource') {
      const value = Math.floor(drop.value * (this.player.resourceMultiplier || 1));
      this.rewards[drop.resource] = (this.rewards[drop.resource] || 0) + value;
    }
  }

  showLevelUp() {
    const choices = [];
    const pool = [...UPGRADES];
    // Also offer weapon changes
    const weaponKeys = Object.keys(WEAPONS).filter(w => w !== this.player.weapon);
    if (weaponKeys.length > 0) {
      const wk = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
      pool.push({ id: 'weapon_' + wk, name: WEAPONS[wk].name, icon: WEAPONS[wk].icon, desc: `切换为${WEAPONS[wk].name}`, apply: s => { s.weapon = wk; s.range = WEAPONS[wk].range; s.attackSpeed = WEAPONS[wk].speed; } });
    }

    // Pick 3 random
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    this.levelUpChoices = choices;
    this.paused = true;
  }

  selectUpgrade(choice) {
    const hpBefore = this.player.hp;
    choice.apply(this.player);
    this.levelUpChoices = null;
    this.paused = false;
    // Heal on level up
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.1);
    const healed = this.player.hp - hpBefore;
    if (healed > 0) this.spawnDamageNumber(this.player.x, this.player.y - 28, healed, '#4caf50', 'heal');
  }

  togglePause() {
    if (this.gameOver || this.levelUpChoices) return;
    this.paused = !this.paused;
  }

  resumeFromPause() {
    this.paused = false;
  }

  useSkill() {
    if (!this.skillReady) return;
    const p = this.player;
    const hero = HERO_TEMPLATES.find(h => h.id === p.heroId);
    if (!hero) return;

    this.skillReady = false;
    this.skillCooldown = this.skillMaxCooldown;
    sfx.skillUse();
    // Skill activation: brief golden flash
    this._flash('rgba(255,215,64,0.15)', 0.3);
    this._shake(5, 0.3);

    // Simple skill effects based on hero class
    switch (hero.heroClass) {
      case 'commander':
        // Damage boost
        p.attack *= 1.5;
        setTimeout(() => { p.attack /= 1.5; }, 10000);
        // AoE damage
        for (const e of [...this.enemies]) {
          const dx = e.x - p.x, dy = e.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < 200) {
            const idx = this.enemies.indexOf(e);
            this.damageEnemy(e, p.attack * 3, idx);
          }
        }
        this.particles.push({ x: p.x, y: p.y, dx: 0, dy: 0, life: 1.2, size: 60,
          color: '#ffd740', spriteKey: 'cmdAura' });
        break;
      case 'defender':
        p.invincible = 5;
        p.shieldCount += 3;
        this.particles.push({ x: p.x, y: p.y, dx: 0, dy: 0, life: 2, size: 32,
          color: '#4fc3f7', spriteKey: 'shieldAura', followPlayer: true });
        break;
      case 'support':
        const hpBefore = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
        const healed = p.hp - hpBefore;
        if (healed > 0) this.spawnDamageNumber(p.x, p.y - 28, healed, '#4caf50', 'heal');
        p.speed *= 1.3;
        setTimeout(() => { p.speed /= 1.3; }, 10000);
        this.particles.push({ x: p.x, y: p.y, dx: 0, dy: 0, life: 1.5, size: 32,
          color: '#4caf50', spriteKey: 'healAura', followPlayer: true });
        break;
      case 'ranger':
        // Full screen arrow rain
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 50 + Math.random() * 300;
          const dxv = (Math.random() - 0.5) * 50;
          const dyv = (Math.random() - 0.5) * 50;
          this.projectiles.push({
            x: p.x + Math.cos(angle) * dist,
            y: p.y + Math.sin(angle) * dist,
            dx: dxv, dy: dyv,
            damage: p.attack * 2, radius: 8, color: '#ffeb3b',
            life: 0.8, fxKey: 'arrowRain', angle: Math.atan2(dyv, dxv) || Math.PI / 4,
          });
        }
        break;
    }
    this.consumeSkillReadyCharge();
  }

  consumeSkillReadyCharge() {
    if (this.itemEffects.skillReadyCharges <= 0) return;
    this.itemEffects.skillReadyCharges--;
    this.skillReady = true;
    this.skillCooldown = 0;
    this.showItemToast(`镇定剂生效，剩余 ${this.itemEffects.skillReadyCharges} 次`);
  }

  useBattleItem(itemId) {
    const item = BATTLE_ITEMS[itemId];
    if (!item) return false;
    if (getItemCount(itemId) <= 0) {
      this.showItemToast(`${item.name}不足`);
      return false;
    }

    const p = this.player;
    switch (itemId) {
      case 'blood_pack': {
        if (p.hp >= p.maxHp) {
          this.showItemToast('生命已满');
          return false;
        }
        if (!consumeInventoryItem(itemId, 1)) return false;
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.45);
        const healed = p.hp - before;
        this.spawnDamageNumber(p.x, p.y - 30, healed, '#4caf50', 'heal');
        this._flash('rgba(76,175,80,0.18)', 0.25);
        this.showItemToast('血包生效');
        break;
      }
      case 'sedative':
        if (!consumeInventoryItem(itemId, 1)) return false;
        this.itemEffects.skillReadyCharges += 3;
        if (!this.skillReady) this.consumeSkillReadyCharge();
        this.showItemToast(`技能速冷 +3，剩余 ${this.itemEffects.skillReadyCharges} 次`);
        break;
      case 'puppet': {
        if (!consumeInventoryItem(itemId, 1)) return false;
        const angle = p.facing || -Math.PI / 2;
        const decoy = {
          id: `decoy_${Date.now()}`,
          isDecoy: true,
          name: '傀儡木偶',
          x: Math.max(40, Math.min(this.mapWidth - 40, p.x + Math.cos(angle) * 55)),
          y: Math.max(40, Math.min(this.mapHeight - 40, p.y + Math.sin(angle) * 55)),
          radius: 20,
          hp: Math.floor(p.maxHp * 0.3),
          maxHp: Math.floor(p.maxHp * 0.3),
          flash: 0,
          animTime: 0
        };
        this.decoys.push(decoy);
        this._flash('rgba(208,154,82,0.18)', 0.25);
        this.showItemToast('傀儡木偶已召唤');
        break;
      }
      case 'smoke_bomb':
        if (!consumeInventoryItem(itemId, 1)) return false;
        this.itemEffects.smokeTimer = Math.max(this.itemEffects.smokeTimer, 6);
        this.projectiles = this.projectiles.filter(pj => !pj.enemy);
        this._flash('rgba(151,240,199,0.2)', 0.35);
        this.showItemToast('烟雾弹生效，敌人失去锁定');
        break;
      case 'rebirth_charm':
        this.itemEffects.rebirthArmed = true;
        this.showItemToast(this.itemEffects.rebirthUsed ? '本场重生已使用' : '重生符将自动触发');
        break;
      default:
        return false;
    }

    saveGame();
    this.bagOpen = false;
    return true;
  }

  showItemToast(text) {
    this.itemToast = { text, timer: 1.8 };
  }

  spawnDamageNumber(x, y, text, color, kind) {
    if (window.__heroDamageDisplayEnabled === false) return;
    const displayText = typeof text === 'number' ? String(Math.max(0, Math.floor(text))) : String(text);
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      text: displayText,
      color,
      kind: kind || this._damageNumberKind(displayText, color),
      life: 0.8
    });
  }

  _damageNumberKind(text, color) {
    if (!/^\d+$/.test(text)) return null;
    const c = String(color || '').toLowerCase();
    if (c === '#ff5722' || c === '#ff6e40') return 'crit';
    if (c === '#4caf50' || c === '#66bb6a' || c === '#62eb84') return 'heal';
    return 'normal';
  }

  _drawDamageNumberSprite(ctx, dn, sx, sy) {
    const meta = dn.kind ? DAMAGE_DIGIT_SPRITES[dn.kind] : null;
    if (!meta || !/^\d+$/.test(dn.text)) return false;
    const rec = ImageCache.get(meta.src);
    if (!rec || !rec.ready) return false;

    const totalW = dn.text.length * meta.digitW + Math.max(0, dn.text.length - 1) * meta.gap;
    let x = sx - totalW / 2;
    const y = sy - meta.digitH;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, dn.life));
    for (const ch of dn.text) {
      const digit = Number(ch);
      ctx.drawImage(
        rec.img,
        digit * meta.digitW, 0,
        meta.digitW, meta.digitH,
        x, y,
        meta.digitW, meta.digitH
      );
      x += meta.digitW + meta.gap;
    }
    ctx.restore();
    return true;
  }

  // ---- Rendering ----

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cam = this.camera;

    // Apply screen shake offset to entire frame
    ctx.save();
    ctx.translate(this.screenShake.dx, this.screenShake.dy);

    // Battlefield tiled background (fallback to flat color while loading)
    if (this.bgTile && this.bgTile.ready) {
      const tile = this.bgTile.img;
      const tw = tile.width, th = tile.height;
      const ox = -((cam.x % tw + tw) % tw);
      const oy = -((cam.y % th + th) % th);
      for (let y = oy; y < h; y += th) {
        for (let x = ox; x < w; x += tw) {
          ctx.drawImage(tile, x, y);
        }
      }
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
    }

    // Map boundary — dashed warning border using sprite
    if (this.boundaryTile && this.boundaryTile.ready) {
      const t = this.boundaryTile.img;
      const tw = t.width, th = t.height;
      const left = -cam.x;
      const top = -cam.y;
      const right = left + this.mapWidth;
      const bottom = top + this.mapHeight;
      const drawHoriz = (y) => {
        for (let x = Math.max(0, left); x < Math.min(w, right); x += tw) {
          if (y >= -th && y <= h) ctx.drawImage(t, x, y);
        }
      };
      const drawVert = (x) => {
        for (let y = Math.max(0, top); y < Math.min(h, bottom); y += th) {
          if (x >= -tw && x <= w) ctx.drawImage(t, x, y);
        }
      };
      drawHoriz(top - th / 2);
      drawHoriz(bottom - th / 2);
      drawVert(left - tw / 2);
      drawVert(right - tw / 2);
    }

    // Drops (XP / resource orbs as sprites)
    for (const d of this.drops) {
      const sx = d.x - cam.x, sy = d.y - cam.y;
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
      ctx.globalAlpha = Math.min(1, d.life / 2);
      const fxKey = d.type === 'xp' ? 'xpOrb' : 'resOrb';
      const fx = this.fxImg[fxKey];
      if (fx && fx.ready) {
        const s = 14 + Math.sin(this.runTime * 6 + d.x) * 1.5;
        ctx.drawImage(fx.img, sx - s / 2, sy - s / 2, s, s);
      } else {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Particles (sprite-based when spriteKey set)
    for (const pt of this.particles) {
      const sx = pt.x - cam.x, sy = pt.y - cam.y;
      const fade = Math.min(1, pt.life / Math.max(0.001, pt.totalLife || pt.life));
      ctx.globalAlpha = fade;
      if (pt.spriteKey) {
        // death_<enemy> uses fxDeath frames; otherwise look up in fxImg
        if (pt.spriteKey.startsWith('death_')) {
          const ekey = pt.spriteKey.replace('death_', '');
          const rec = this.fxDeath[ekey];
          if (rec && rec.ready) {
            const f = Math.min(rec.frames - 1, Math.floor((1 - fade) * rec.frames));
            ctx.drawImage(rec.img, f * 8, 0, 8, 8, sx - 6, sy - 6, 12, 12);
            continue;
          }
        } else if (this.fxImg[pt.spriteKey] && this.fxImg[pt.spriteKey].ready) {
          const fx = this.fxImg[pt.spriteKey];
          const s = pt.size * 2;
          if (pt.spriteAngle != null) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(pt.spriteAngle);
            ctx.drawImage(fx.img, -s / 2, -s / 2, s, s);
            ctx.restore();
          } else {
            ctx.drawImage(fx.img, sx - s / 2, sy - s / 2, s, s);
          }
          continue;
        }
      }
      // Fallback: solid circle
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pt.size || 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.renderDecoys(ctx, cam, w, h);

    // Enemies — sprite by id + facing direction, with spawn animation
    for (const e of this.enemies) {
      const sx = e.x - cam.x, sy = e.y - cam.y;
      if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;

      // Spawn animation: enemy fades in and scales up over 0.3s
      if (e.spawnAnim > 0) {
        const t = 1 - (e.spawnAnim / 0.3);
        ctx.globalAlpha = t;
        const scale = 0.3 + t * 0.7;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);
        ctx.translate(-sx, -sy);
      }
      const ekey = this._enemyKeyFor(e);
      const set = ekey ? this.enemySprites[ekey] : null;
      let drew = false;
      if (set) {
        // pick action
        const action = set.shoot ? (e.attackTimer < 0.4 ? 'shoot' : 'walk')
          : set.attack ? 'walk'
          : set.cast ? 'walk'
          : set.run ? 'run'
          : 'walk';
        const rec = set[action];
        if (rec && rec.ready) {
          const fr = Math.floor(this.runTime * 8 + e.x * 0.01) % rec.frames;
          const sz = set.size;
          ctx.save();
          // Mirror sprite when target is to the left for some flavor
          const flip = (this.player.x < e.x);
          if (flip) {
            ctx.translate(sx, sy);
            ctx.scale(-1, 1);
            ctx.translate(-sx, -sy);
          }
          if (e.flash > 0) {
            ctx.filter = 'brightness(2.5)';
          }
          ctx.drawImage(rec.img, fr * sz, 0, sz, sz, sx - sz / 2, sy - sz / 2, sz, sz);
          ctx.filter = 'none';
          ctx.restore();
          drew = true;
        }
      }
      if (!drew) {
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : (e.color || '#e0e0e0');
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      // HP bar (sprite-based)
      if (e.hp < e.maxHp) {
        const barW = Math.max(28, e.radius * 2);
        const by = sy - e.radius - 12;
        const bg = this.hudImg.hpBg;
        const lowHP = e.hp / e.maxHp < 0.3;
        const fill = lowHP ? this.hudImg.hpFillRed : this.hudImg.hpFillGreen;
        if (bg && bg.ready && fill && fill.ready) {
          ctx.drawImage(bg.img, sx - barW / 2, by, barW, 6);
          ctx.save();
          ctx.beginPath();
          ctx.rect(sx - barW / 2, by, barW * (e.hp / e.maxHp), 6);
          ctx.clip();
          ctx.drawImage(fill.img, sx - barW / 2, by, barW, 6);
          ctx.restore();
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(sx - barW / 2, by, barW, 4);
          ctx.fillStyle = '#4caf50';
          ctx.fillRect(sx - barW / 2, by, barW * (e.hp / e.maxHp), 4);
        }
      }
      // Close spawn animation transform
      if (e.spawnAnim > 0) {
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // Boss
    if (this.boss) {
      const b = this.boss;
      const sx = b.x - cam.x, sy = b.y - cam.y;
      const sid = this._bossSpriteId(b);
      const set = sid ? this.bossSprites[sid] : null;

      // Boss spawn animation: pulsing grow-in effect
      if (b.spawnAnim > 0) {
        const t = 1 - (b.spawnAnim / 1.0);
        ctx.globalAlpha = t;
        ctx.save();
        ctx.translate(sx, sy);
        const s = 0.5 + t * 0.5;
        ctx.scale(s, s);
        ctx.translate(-sx, -sy);
      }

      let drew = false;
      if (set) {
        const action = b.dying ? 'death' : (b.animAction || 'idle');
        const rec = set[action] || set.idle;
        if (rec && rec.ready) {
          const fps = action === 'idle' ? 8 : 12;
          let fr = Math.floor(b.animTime * fps);
          if (action === 'death') fr = Math.min(rec.frames - 1, fr);
          else fr = fr % rec.frames;
          const sz = set.size;
          ctx.save();
          if (b.flash > 0) ctx.filter = 'brightness(2.5)';
          // scale sprite to boss radius range
          const desired = b.radius * 3;
          ctx.drawImage(rec.img, fr * sz, 0, sz, sz, sx - desired / 2, sy - desired / 2, desired, desired);
          ctx.filter = 'none';
          ctx.restore();
          drew = true;
        }
      }
      if (!drew) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = b.flash > 0 ? '#ffffff' : b.color;
        ctx.beginPath();
        ctx.arc(sx, sy, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (!b.dying) {
        // Boss HP bar — sprite version
        const barW = 240;
        const barH = 14;
        const bg = this.hudImg.bossHpBg;
        const fill = this.hudImg.bossHpFill;
        const by = sy - b.radius * 1.6 - 28;
        const bx = sx - barW / 2;
        if (bg && bg.ready) ctx.drawImage(bg.img, bx, by, barW, barH);
        if (fill && fill.ready) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(bx + 2, by + 2, (barW - 4) * (b.hp / b.maxHp), barH - 4);
          ctx.clip();
          ctx.drawImage(fill.img, bx, by, barW, barH);
          ctx.restore();
        }
        ctx.fillStyle = '#fff';
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(b.name, sx, by - 4);
      }
      // Close boss spawn animation transform
      if (b.spawnAnim > 0) {
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // Projectiles
    for (const proj of this.projectiles) {
      const sx = proj.x - cam.x, sy = proj.y - cam.y;
      const fx = proj.fxKey ? this.fxImg[proj.fxKey] : null;
      if (fx && fx.ready) {
        const sz = Math.max(12, proj.radius * 3);
        const angle = proj.angle != null ? proj.angle :
          (proj.dx || proj.dy ? Math.atan2(proj.dy, proj.dx) : 0);
        ctx.save();
        ctx.translate(sx, sy);
        if (['arrow', 'spear', 'arrowRain'].includes(proj.fxKey)) {
          ctx.rotate(angle);
        }
        ctx.drawImage(fx.img, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      } else {
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, proj.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // Player
    const p = this.player;
    if (p) {
      const px = p.x - cam.x, py = p.y - cam.y;

      // Shield glow
      if (p.shieldCount > 0) {
        ctx.strokeStyle = 'rgba(79,195,247,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, p.radius + 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Invincibility flash
      if (p.invincible > 0 && Math.floor(p.invincible * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      // Pick sheet + frame
      let key = 'idle';
      let fps = 6;
      let loop = true;
      let frameCount = 4;
      switch (p.animState) {
        case 'walk':
          key = 'walk_' + p.dir; fps = 10; frameCount = 6; break;
        case 'attack':
          key = 'attack'; fps = 6 / 0.36; frameCount = 6; loop = false; break;
        case 'hurt':
          key = 'hurt'; fps = 12; frameCount = 2; break;
        case 'death':
          key = 'death'; fps = 8; frameCount = 8; loop = false; break;
        default:
          key = 'idle'; fps = 5; frameCount = 4; break;
      }
      let frameIdx = Math.floor(p.animTime * fps);
      if (!loop) frameIdx = Math.min(frameIdx, frameCount - 1);
      else frameIdx = frameIdx % frameCount;

      const drew = this._drawSpriteFrame(ctx, key, frameIdx, px, py);
      if (!drew) {
        // Fallback while sprites still loading
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    // Damage numbers with scale-up pop and outline for readability
    if (window.__heroDamageDisplayEnabled !== false) {
      for (const dn of this.damageNumbers) {
        const sx = dn.x - cam.x, sy = dn.y - cam.y;
        if (this._drawDamageNumberSprite(ctx, dn, sx, sy)) continue;
        ctx.globalAlpha = dn.life;
        // Pop effect: damage numbers start larger and shrink to normal size
        const popScale = 1 + Math.max(0, (dn.life - 0.5)) * 0.8;
        const fontSize = Math.floor(14 * popScale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        // Dark outline for readability against any background
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(dn.text, sx, sy);
        ctx.fillStyle = dn.color;
        ctx.fillText(dn.text, sx, sy);
      }
      ctx.globalAlpha = 1;
    }

    // HUD
    this.renderHUD(ctx, w, h);

    // Joystick
    this.renderJoystick(ctx, w, h);

    // Level up overlay
    if (this.levelUpChoices) this.renderLevelUp(ctx, w, h);

    // Boss warning telegraph lines (red dashed line from boss toward player)
    for (const warn of this.bossWarnings) {
      const sx1 = warn.x1 - cam.x, sy1 = warn.y1 - cam.y;
      const sx2 = warn.x2 - cam.x, sy2 = warn.y2 - cam.y;
      ctx.strokeStyle = warn.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.globalAlpha = Math.min(1, warn.timer * 3);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Restore the screen shake translate
    ctx.restore();

    // Screen flash overlay (drawn after restore so it's not offset by shake)
    if (this.screenFlash.alpha > 0 && this.screenFlash.color) {
      ctx.fillStyle = this.screenFlash.color;
      ctx.globalAlpha = this.screenFlash.alpha;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Wave announcement (large centered text that fades out)
    if (this.waveAnnounce.alpha > 0) {
      ctx.globalAlpha = this.waveAnnounce.alpha;
      ctx.fillStyle = this.waveAnnounce.text.includes('BOSS') ? '#f44336' : '#ffd740';
      ctx.font = `bold ${this.waveAnnounce.text.includes('BOSS') ? 36 : 28}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.fillText(this.waveAnnounce.text, w / 2, h * 0.35);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  renderDecoys(ctx, cam, w, h) {
    for (const d of this.decoys) {
      const sx = d.x - cam.x;
      const sy = d.y - cam.y;
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
      const bob = Math.sin((d.animTime || 0) * 6) * 2;
      const img = this.itemImg.puppet;
      if (img && img.ready) {
        ctx.save();
        if (d.flash > 0) ctx.filter = 'brightness(2)';
        ctx.drawImage(img.img, sx - 24, sy - 28 + bob, 48, 48);
        ctx.filter = 'none';
        ctx.restore();
      } else {
        ctx.fillStyle = d.flash > 0 ? '#ffffff' : '#b97a3c';
        ctx.beginPath();
        ctx.arc(sx, sy + bob, d.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const barW = 46;
      const by = sy - 34;
      ctx.fillStyle = '#2b1b12';
      ctx.fillRect(sx - barW / 2, by, barW, 5);
      ctx.fillStyle = '#d09a52';
      ctx.fillRect(sx - barW / 2, by, barW * Math.max(0, d.hp / d.maxHp), 5);
    }
  }

  renderHUD(ctx, w, h) {
    const p = this.player;
    if (!p) return;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, 50);

    // Back button (top-left)
    this.backButton.x = w - 44;
    this.backButton.y = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(this.backButton.x + 16, this.backButton.y + 16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.backButton.x + 20, this.backButton.y + 10);
    ctx.lineTo(this.backButton.x + 12, this.backButton.y + 16);
    ctx.lineTo(this.backButton.x + 20, this.backButton.y + 22);
    ctx.stroke();
    ctx.lineWidth = 1;

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 8, 120, 10);
    ctx.fillStyle = p.hp > p.maxHp * 0.3 ? '#4caf50' : '#f44336';
    ctx.fillRect(10, 8, 120 * (p.hp / p.maxHp), 10);

    // XP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 22, 120, 6);
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(10, 22, 120 * (p.xp / p.xpToNext), 6);

    // Level + hero name + weapon
    ctx.fillStyle = '#fff';
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = 'left';
    const weapon = WEAPONS[p.weapon] || WEAPONS.sword;
    ctx.fillText(`Lv.${p.level} ${p.heroName || ''} ${weapon.icon}`, 10, 42);

    // Wave
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${this.wave} 关`, w / 2, 25);

    // Kill count
    ctx.textAlign = 'right';
    ctx.fillText(`击杀: ${this.kills}`, w - 10, 20);

    // Timer
    const mins = Math.floor(this.runTime / 60);
    const secs = Math.floor(this.runTime % 60);
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, w - 10, 38);

    // Pause button
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(w / 2 - 15, 34, 30, 14);
    ctx.fillStyle = '#fff';
    ctx.font = "10px sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('暂停', w / 2, 44);

    // Pause overlay
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd740';
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('暂停', w / 2, h / 2 - 30);
      // Resume button
      const rbx = w / 2 - 60, rby = h / 2, rbw = 120, rbh = 40;
      ctx.fillStyle = 'rgba(76,175,80,0.85)';
      this.roundRect(ctx, rbx, rby, rbw, rbh, 10, true, false);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 16px sans-serif";
      ctx.fillText('继续', w / 2, rby + 26);
      this._resumeBtn = { x: rbx, y: rby, w: rbw, h: rbh };
      // Quit button
      const qbx = w / 2 - 60, qby = h / 2 + 55, qbw = 120, qbh = 40;
      ctx.fillStyle = 'rgba(244,67,54,0.75)';
      this.roundRect(ctx, qbx, qby, qbw, qbh, 10, true, false);
      ctx.fillStyle = '#fff';
      ctx.fillText('退出', w / 2, qby + 26);
      this._quitBtn = { x: qbx, y: qby, w: qbw, h: qbh };
    }

    // Skill button (bottom right)
    if (!this.gameOver) {
      const sx = w - 55, sy = h - 55;
      this.skillButton.x = sx;
      this.skillButton.y = sy;

      ctx.fillStyle = this.skillReady ? 'rgba(76,175,80,0.7)' : 'rgba(100,100,100,0.5)';
      ctx.beginPath();
      ctx.arc(sx, sy, this.skillButton.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(this.skillReady ? '技能' : `${Math.ceil(this.skillCooldown)}s`, sx, sy + 4);
    }

    this.renderBattleBag(ctx, w, h);
    this.renderItemStatus(ctx, w, h);
  }

  renderBattleBag(ctx, w, h) {
    const size = 48;
    const bx = w - 132;
    const by = h - 78;
    this.bagButton = { x: bx, y: by, w: size, h: size };

    ctx.save();
    ctx.fillStyle = this.bagOpen ? 'rgba(255,215,64,0.28)' : 'rgba(0,0,0,0.45)';
    this.roundRect(ctx, bx, by, size, size, 10, true, false);
    if (this.backpackImg && this.backpackImg.ready) {
      ctx.drawImage(this.backpackImg.img, bx + 5, by + 5, size - 10, size - 10);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('背包', bx + size / 2, by + 29);
    }
    ctx.fillStyle = '#fff';
    ctx.font = "9px sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('背包', bx + size / 2, by + size + 10);
    ctx.restore();

    this.bagItemSlots = [];
    if (!this.bagOpen) return;

    const ids = Object.keys(BATTLE_ITEMS);
    const panelW = Math.min(w - 16, 286);
    const panelH = 76;
    const panelX = Math.max(8, Math.min(w - panelW - 8, bx - panelW + size));
    const panelY = Math.max(58, by - panelH - 10);
    ctx.fillStyle = 'rgba(5,7,14,0.9)';
    ctx.strokeStyle = 'rgba(255,215,64,0.45)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 8, true, true);

    const slotW = Math.floor((panelW - 16) / ids.length);
    ids.forEach((id, idx) => {
      const x = panelX + 8 + idx * slotW;
      const y = panelY + 8;
      const count = getItemCount(id);
      const disabled = count <= 0 || (id === 'rebirth_charm' && this.itemEffects.rebirthUsed);
      this.bagItemSlots.push({ id, x, y, w: slotW - 4, h: 58, disabled });

      ctx.globalAlpha = disabled ? 0.38 : 1;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      this.roundRect(ctx, x, y, slotW - 4, 58, 7, true, false);
      const img = this.itemImg[id];
      if (img && img.ready) ctx.drawImage(img.img, x + (slotW - 36) / 2, y + 4, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.font = "8px sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(BATTLE_ITEMS[id].shortName, x + (slotW - 4) / 2, y + 45);
      ctx.fillStyle = count > 0 ? '#ffd740' : '#8a8f98';
      ctx.fillText(`x${count}`, x + (slotW - 4) / 2, y + 56);
      ctx.globalAlpha = 1;
    });
  }

  renderItemStatus(ctx, w, h) {
    const tags = [];
    if (this.itemEffects.skillReadyCharges > 0) tags.push(`速冷x${this.itemEffects.skillReadyCharges}`);
    if (this.itemEffects.smokeTimer > 0) tags.push(`烟雾${Math.ceil(this.itemEffects.smokeTimer)}s`);
    if (getItemCount('rebirth_charm') > 0 && !this.itemEffects.rebirthUsed) tags.push('重生待命');
    if (this.decoys.length > 0) tags.push(`木偶x${this.decoys.length}`);

    if (tags.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      this.roundRect(ctx, 10, 52, Math.min(w - 20, 76 * tags.length), 22, 8, true, false);
      ctx.fillStyle = '#ffd740';
      ctx.font = "10px sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(tags.join('  '), 18, 67);
    }

    if (this.itemToast) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.itemToast.timer);
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      const tw = Math.min(w - 40, Math.max(130, ctx.measureText(this.itemToast.text).width + 34));
      this.roundRect(ctx, (w - tw) / 2, h * 0.22, tw, 28, 14, true, false);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(this.itemToast.text, w / 2, h * 0.22 + 18);
      ctx.restore();
    }
  }

  renderJoystick(ctx, w, h) {
    if (!this.joystick.active) {
      // Show static joystick base
      const bx = 80, by = h - 80;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(bx, by, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Active joystick
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(this.joystick.baseX, this.joystick.baseY, 45, 0, Math.PI * 2);
    ctx.fill();

    const maxDist = 40;
    let dx = this.joystick.dx, dy = this.joystick.dy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(this.joystick.baseX + dx, this.joystick.baseY + dy, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  renderLevelUp(ctx, w, h) {
    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    const count = this.levelUpChoices.length || 1;
    // Choose row vs column based on aspect: portrait/narrow → vertical stack,
    // landscape/wide → horizontal row. Keeps cards inside viewport.
    const horizontal = w >= h * 0.95;

    const titleY = Math.max(28, h * 0.08);
    ctx.fillStyle = '#ffd740';
    const titleSize = Math.min(22, Math.max(14, Math.floor(h * 0.045)));
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('升级！选择一项强化', w / 2, titleY);

    const margin = 16;
    const gap = 10;
    const availW = w - margin * 2;
    const availH = h - titleY - margin - 12;

    let cardW, cardH, startX, startY, stepX, stepY;
    if (horizontal) {
      cardW = Math.min(180, Math.floor((availW - gap * (count - 1)) / count));
      cardH = Math.min(200, Math.max(140, availH));
      startX = (w - (cardW * count + gap * (count - 1))) / 2;
      startY = titleY + 12;
      stepX = cardW + gap; stepY = 0;
    } else {
      cardW = Math.min(availW, 320);
      cardH = Math.max(70, Math.floor((availH - gap * (count - 1)) / count));
      startX = (w - cardW) / 2;
      startY = titleY + 12;
      stepX = 0; stepY = cardH + gap;
    }

    for (let i = 0; i < count; i++) {
      const choice = this.levelUpChoices[i];
      const cx = startX + i * stepX;
      const cy = startY + i * stepY;

      // Card background
      ctx.fillStyle = 'rgba(40,40,60,0.95)';
      ctx.strokeStyle = '#ffd740';
      ctx.lineWidth = 2;
      this.roundRect(ctx, cx, cy, cardW, cardH, 10, true, true);

      if (horizontal) {
        const iconSize = Math.min(36, Math.floor(cardH * 0.22));
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(choice.icon, cx + cardW / 2, cy + iconSize + 12);

        const nameSize = Math.min(14, Math.max(11, Math.floor(cardH * 0.075)));
        ctx.font = `bold ${nameSize}px sans-serif`;
        ctx.fillStyle = '#ffd740';
        ctx.fillText(choice.name, cx + cardW / 2, cy + iconSize + 36);

        ctx.font = "11px sans-serif";
        ctx.fillStyle = '#bbb';
        this.wrapText(ctx, choice.desc, cx + cardW / 2, cy + iconSize + 56, cardW - 16, 14);
      } else {
        // Vertical: icon left, text right — fits in short cards on narrow screens
        const padX = 14;
        const iconSize = Math.min(28, Math.floor(cardH * 0.55));
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(choice.icon, cx + padX + iconSize / 2, cy + cardH / 2 + iconSize / 3);

        const textX = cx + padX * 2 + iconSize;
        const textW = cardW - (padX * 3 + iconSize);
        ctx.textAlign = 'left';
        const nameSize = Math.min(14, Math.max(12, Math.floor(cardH * 0.22)));
        ctx.font = `bold ${nameSize}px sans-serif`;
        ctx.fillStyle = '#ffd740';
        ctx.fillText(choice.name, textX, cy + nameSize + 8);

        ctx.font = "11px sans-serif";
        ctx.fillStyle = '#bbb';
        this.wrapText(ctx, choice.desc, textX, cy + nameSize + 24, textW, 13);
        ctx.textAlign = 'center';
      }

      // Store bounds for click detection
      choice._bounds = { x: cx, y: cy, w: cardW, h: cardH };
    }
  }

  roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let ly = y;
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, ly);
        line = ch;
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, ly);
  }

  // ---- Input ----

  bindInput() {
    if (this._inputBound) return;
    this._inputBound = true;

    this._onTouchStart = e => this.handleTouchStart(e);
    this._onTouchMove = e => this.handleTouchMove(e);
    this._onTouchEnd = e => this.handleTouchEnd(e);
    this._onClick = e => this.handleClick(e);
    this._onMouseDown = e => this.handleMouseDown(e);
    this._onMouseMove = e => this.handleMouseMove(e);
    this._onMouseUp = e => this.handleMouseUp(e);
    this._onResize = () => this.resizeCanvasToContainer();

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
  }

  unbindInput() {
    if (!this._inputBound) return;
    this._inputBound = false;
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('orientationchange', this._onResize);
    }
  }

  resizeCanvasToContainer() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    // skillButton / bagButton are repositioned every render frame from canvas
    // dimensions, so no manual sync needed here.
  }

  getCanvasPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);

    // Level-up choice taps: touchstart preventDefault swallows the synthetic
    // click event, so we must resolve the upgrade selection here on touch.
    if (this.levelUpChoices) {
      this._touchTapStart = { x: pos.x, y: pos.y, t: performance.now() };
      return;
    }
    this._touchTapStart = null;

    if (this.handleBagClick(pos.x, pos.y)) return;

    // Pause button (mirrors handleClick logic for touch input)
    if (pos.x >= this.canvas.width / 2 - 15 && pos.x <= this.canvas.width / 2 + 15 && pos.y >= 34 && pos.y <= 48) {
      this.togglePause();
      return;
    }

    // Pause overlay buttons
    if (this.paused) {
      if (this._resumeBtn && pos.x >= this._resumeBtn.x && pos.x <= this._resumeBtn.x + this._resumeBtn.w &&
          pos.y >= this._resumeBtn.y && pos.y <= this._resumeBtn.y + this._resumeBtn.h) {
        this.resumeFromPause();
        return;
      }
      if (this._quitBtn && pos.x >= this._quitBtn.x && pos.x <= this._quitBtn.x + this._quitBtn.w &&
          pos.y >= this._quitBtn.y && pos.y <= this._quitBtn.y + this._quitBtn.h) {
        this.paused = false;
        if (this.onEnd) this.onEnd(false, this.kills, this.runTime, this.rewards, this.wave, true);
        return;
      }
    }

    this.handlePointerDown(pos.x, pos.y);
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (this._touchTapStart) return;
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.handlePointerMove(pos.x, pos.y);
  }

  handleTouchEnd(e) {
    if (this._touchTapStart && this.levelUpChoices) {
      const start = this._touchTapStart;
      this._touchTapStart = null;
      // Use changedTouches for the released touch position
      const t = e.changedTouches && e.changedTouches[0];
      const endPos = t ? this.getCanvasPos(t.clientX, t.clientY) : start;
      const moved = Math.hypot(endPos.x - start.x, endPos.y - start.y);
      if (moved < 24) {
        for (const choice of this.levelUpChoices) {
          const b = choice._bounds;
          if (b && endPos.x >= b.x && endPos.x <= b.x + b.w && endPos.y >= b.y && endPos.y <= b.y + b.h) {
            this.selectUpgrade(choice);
            return;
          }
        }
      }
      return;
    }
    this._touchTapStart = null;
    this.handlePointerUp();
  }

  handleMouseDown(e) {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerDown(pos.x, pos.y);
  }

  handleMouseMove(e) {
    if (!this.joystick.active) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerMove(pos.x, pos.y);
  }

  handleMouseUp(e) {
    this.handlePointerUp();
  }

  handleClick(e) {
    const pos = this.getCanvasPos(e.clientX, e.clientY);

    // Level up choice
    if (this.levelUpChoices) {
      for (const choice of this.levelUpChoices) {
        const b = choice._bounds;
        if (b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
          this.selectUpgrade(choice);
          return;
        }
      }
      return;
    }

    if (this.handleBagClick(pos.x, pos.y)) return;

    // Back button
    const bb = this.backButton;
    if (pos.x >= bb.x && pos.x <= bb.x + bb.w && pos.y >= bb.y && pos.y <= bb.y + bb.h) {
      if (this.onEnd) this.onEnd(false, this.kills, this.runTime, this.rewards, this.wave, true);
      return;
    }

    // Skill button
    const dx = pos.x - this.skillButton.x;
    const dy = pos.y - this.skillButton.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.skillButton.radius) {
      this.useSkill();
      return;
    }

    // Pause button
    if (pos.x >= this.canvas.width / 2 - 15 && pos.x <= this.canvas.width / 2 + 15 && pos.y >= 34 && pos.y <= 48) {
      this.togglePause();
      return;
    }

    // Pause overlay buttons
    if (this.paused) {
      if (this._resumeBtn && pos.x >= this._resumeBtn.x && pos.x <= this._resumeBtn.x + this._resumeBtn.w &&
          pos.y >= this._resumeBtn.y && pos.y <= this._resumeBtn.y + this._resumeBtn.h) {
        this.resumeFromPause();
        return;
      }
      if (this._quitBtn && pos.x >= this._quitBtn.x && pos.x <= this._quitBtn.x + this._quitBtn.w &&
          pos.y >= this._quitBtn.y && pos.y <= this._quitBtn.y + this._quitBtn.h) {
        this.paused = false;
        if (this.onEnd) this.onEnd(false, this.kills, this.runTime, this.rewards, this.wave, true);
        return;
      }
    }
  }

  handlePointerDown(x, y) {
    // If level up or game over, ignore joystick
    if (this.levelUpChoices || this.gameOver) return;

    if (this.isBagUiPoint(x, y)) return;

    // Back button
    const bb = this.backButton;
    if (x >= bb.x && x <= bb.x + bb.w && y >= bb.y && y <= bb.y + bb.h) {
      if (this.onEnd) this.onEnd(false, this.kills, this.runTime, this.rewards, this.wave, true);
      return;
    }

    // Check skill button first
    const dx = x - this.skillButton.x;
    const dy = y - this.skillButton.y;
    if (Math.sqrt(dx * dx + dy * dy) < this.skillButton.radius + 10) {
      this.useSkill();
      return;
    }

    // Check if in left half (joystick area)
    if (x < this.canvas.width * 0.5) {
      this.joystick.active = true;
      this.joystick.baseX = x;
      this.joystick.baseY = y;
      this.joystick.startX = x;
      this.joystick.startY = y;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    }
  }

  handleBagClick(x, y) {
    const b = this.bagButton;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.bagOpen = !this.bagOpen;
      return true;
    }

    if (!this.bagOpen) return false;
    for (const slot of this.bagItemSlots) {
      if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
        if (slot.disabled) {
          const item = BATTLE_ITEMS[slot.id];
          this.showItemToast(item ? `${item.name}不可用` : '道具不可用');
          return true;
        }
        this.useBattleItem(slot.id);
        return true;
      }
    }
    return false;
  }

  isBagUiPoint(x, y) {
    const b = this.bagButton;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    if (!this.bagOpen) return false;
    return this.bagItemSlots.some(slot => x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h);
  }

  handlePointerMove(x, y) {
    if (!this.joystick.active) return;
    this.joystick.dx = x - this.joystick.baseX;
    this.joystick.dy = y - this.joystick.baseY;
  }

  handlePointerUp() {
    this.joystick.active = false;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
  }
}
