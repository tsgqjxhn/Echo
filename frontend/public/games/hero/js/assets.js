// ============================================================
// Centralized asset paths and small helpers for inline images.
// Keeps all emoji → image replacements in one place so swapping
// icons elsewhere is a single-line change.
// ============================================================

const ASSETS = {
  buildings: (type, level) => {
    const tier = level <= 4 ? 1 : level <= 9 ? 2 : level <= 14 ? 3 : 4;
    return `assets/images/buildings/${type}_t${tier}.svg`;
  },
  weapon:   (id) => `assets/images/weapons/${id}.svg`,
  upgrade:  (id) => `assets/images/upgrades/${id}.svg`,
  resource: (id) => `assets/images/resources/${id}.svg`,
  civ:      (id) => `assets/images/civilizations/${id}.svg`,
  shopItem: (id) => (typeof BATTLE_ITEMS !== 'undefined' && BATTLE_ITEMS[id])
    ? `assets/images/shop/${id}.webp`
    : `assets/images/shop/${id}.svg`,
  battleItem: (id) => `assets/images/shop/${id}.webp`,
  hero:     (id) => `assets/images/heroes/${id}.webp`,
  rarity:   (id) => `assets/images/rarity/${id}.svg`,
  navIdle:  (n)  => `assets/ui/nav/${n}_idle.svg`,
  navActive:(n)  => `assets/ui/nav/${n}_active.svg`,
  tech:     (id) => `assets/images/tech/${id}.svg`,
  ach:      (id) => `assets/images/achievements/${id}.svg`,
  hud: {
    hpBg:        'assets/ui/hud/hp_bg.webp',
    hpFillGreen: 'assets/ui/hud/hp_fill_green.webp',
    hpFillRed:   'assets/ui/hud/hp_fill_red.webp',
    xpFill:      'assets/ui/hud/xp_fill.webp',
    joyBase:     'assets/ui/hud/joystick_base.webp',
    joyKnob:     'assets/ui/hud/joystick_knob.webp',
    skillReady:  'assets/ui/hud/skill_ready.webp',
    skillCool:   'assets/ui/hud/skill_cooldown.webp',
    pause:       'assets/ui/hud/pause_btn.webp',
    cardBg:      'assets/ui/hud/card_bg.webp',
    cardSelected:'assets/ui/hud/card_bg_selected.webp',
    bossHpBg:    'assets/ui/hud/boss_hp_bg.webp',
    bossHpFill:  'assets/ui/hud/boss_hp_fill.webp',
    damageNormal:'assets/ui/hud/damage_normal.webp',
    damageCrit:  'assets/ui/hud/damage_crit.webp',
    damageHeal:  'assets/ui/hud/damage_heal.webp',
  },
  bg: (theme) => `assets/backgrounds/battlefield_${theme}.webp`,
  campaignMap: (theme) => `assets/backgrounds/level_avatar_${theme}.webp`,
  boundary: 'assets/backgrounds/boundary.webp',
  backpack: 'assets/ui/hud/backpack.webp',
  puzzle: {
    ball: 'assets/images/puzzle/ball.webp',
    goal: 'assets/images/puzzle/goal.webp',
    lava: 'assets/images/puzzle/lava.webp',
    pinH: 'assets/images/puzzle/pin_h.webp',
    pinV: 'assets/images/puzzle/pin_v.webp',
    spike: 'assets/images/puzzle/spike.webp',
  },
  // FX
  fx: {
    arrow:      'assets/sprites/fx/arrow.webp',
    magicBolt:  'assets/sprites/fx/magic_bolt.webp',
    spear:      'assets/sprites/fx/spear.webp',
    slash:      'assets/sprites/fx/slash.webp',
    enemyBolt:  'assets/sprites/fx/enemy_bolt.webp',
    fireball:   'assets/sprites/fx/boss_fireball.webp',
    aoe:        'assets/sprites/fx/boss_aoe.webp',
    ice:        'assets/sprites/fx/boss_ice.webp',
    stomp:      'assets/sprites/fx/boss_stomp.webp',
    breath:     'assets/sprites/fx/boss_breath.webp',
    charge:     'assets/sprites/fx/boss_charge.webp',
    hitWhite:   'assets/sprites/fx/hit_white.webp',
    hitYellow:  'assets/sprites/fx/hit_yellow.webp',
    xpOrb:      'assets/sprites/fx/xp_orb.webp',
    resOrb:     'assets/sprites/fx/resource_orb.webp',
    arrowRain:  'assets/sprites/fx/arrow_rain.webp',
    healAura:   'assets/sprites/fx/heal_aura.webp',
    shieldAura: 'assets/sprites/fx/shield_aura.webp',
    cmdAura:    'assets/sprites/fx/command_aura.webp',
    deathParticle: (enemyType) => `assets/sprites/fx/death_${enemyType}.webp`,
  },
  // Enemy sprite sheets (referenced by data.js ENEMY_TYPES keys).
  enemy: (id, action) => `assets/sprites/enemies/${id}_${action}.webp`,
  // Boss sprite sheets keyed by stable english id.
  boss: (id, action) => `assets/sprites/bosses/${id}_${action}.webp`,
};

// Boss name (Chinese) → english id used in sprite filenames.
const BOSS_SPRITE_IDS = {
  '骷髅王':   'skull_king',
  '火焰恶魔': 'fire_demon',
  '冰霜巨人': 'ice_giant',
  '暗影龙':   'shadow_dragon',
};

// Map boss skill names → english animation keys with frame counts.
const BOSS_SKILL_ANIM = {
  charge:    { action: 'charge',    frames: 4 },
  summon:    { action: 'summon',    frames: 4 },
  fireball:  { action: 'fireball',  frames: 4 },
  aoe:       { action: 'aoe',       frames: 4 },
  ice_wall:  { action: 'ice_wall',  frames: 4 },
  stomp:     { action: 'stomp',     frames: 6 },
  breath:    { action: 'breath',    frames: 6 },
  fly:       { action: 'fly',       frames: 4 },
};

// Per-boss sprite size for canvas drawing (matches generator output).
const BOSS_SPRITE_SIZE = {
  skull_king:    128,
  fire_demon:    128,
  ice_giant:     160,
  shadow_dragon: 160,
};

// Enemy sprite metadata: which actions exist + frames each, and sprite size.
const ENEMY_SPRITES = {
  skeleton: { size: 48, walk: 4, death: 4 },
  goblin:   { size: 48, walk: 4, death: 4 },
  archer_e: { size: 48, walk: 4, shoot: 2, death: 4 },
  knight_e: { size: 64, walk: 4, attack: 4, death: 4 },
  mage_e:   { size: 48, walk: 4, cast: 3, death: 4 },
  orc:      { size: 64, walk: 4, attack: 3, death: 4 },
  wolf:     { size: 48, run: 4, bite: 3, death: 4 },
};

const DAMAGE_DIGIT_SPRITES = {
  normal: { src: ASSETS.hud.damageNormal, digitW: 24, digitH: 32, gap: -4 },
  crit:   { src: ASSETS.hud.damageCrit,   digitW: 30, digitH: 38, gap: -5 },
  heal:   { src: ASSETS.hud.damageHeal,   digitW: 24, digitH: 32, gap: -4 },
};

// Cache + simple loader for canvas-rendered sprites.
const ImageCache = {
  _cache: new Map(),
  get(src) {
    if (!this._cache.has(src)) {
      const img = new Image();
      img.src = src;
      const rec = { img, ready: false };
      img.onload = () => { rec.ready = true; };
      this._cache.set(src, rec);
    }
    return this._cache.get(src);
  },
};

// HTML helper: renders an inline icon image at a given size (CSS class still apply).
function icon(src, size = 16, alt = '') {
  return `<img src="${src}" alt="${alt}" class="ic" style="width:${size}px;height:${size}px;vertical-align:middle;">`;
}

function navIcon(name, size = 22) {
  return `<span class="nav-icon-img-wrap">
    <img src="${ASSETS.navIdle(name)}" alt="" class="nav-icon-img nav-icon-idle" style="width:${size}px;height:${size}px;">
    <img src="${ASSETS.navActive(name)}" alt="" class="nav-icon-img nav-icon-active" style="width:${size}px;height:${size}px;">
  </span>`;
}

// Resource icon helpers used in HTML strings.
function resIcon(key, size = 16) {
  return icon(ASSETS.resource(key), size, key);
}
