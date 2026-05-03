// ============================================================
// Game Data Definitions
// ============================================================

const CIVILIZATIONS = {
  china:    { name: '华夏', icon: '🏯', bonus: { researchSpeed: 0.05, foodProd: 0.10 }, desc: '研究速度+5%，粮食产量+10%' },
  europe:   { name: '欧洲', icon: '🏰', bonus: { troopAtk: 0.05, troopHp: 0.05 }, desc: '部队攻击+5%，部队生命+5%' },
  america:  { name: '美洲', icon: '🗽', bonus: { goldProd: 0.10, troopHp: 0.05 }, desc: '黄金产量+10%，部队生命+5%' },
  russia:   { name: '俄罗斯', icon: '⛄', bonus: { troopHp: 0.10, stoneProd: 0.05 }, desc: '部队生命+10%，石料产量+5%' },
  korea:    { name: '韩国', icon: '📿', bonus: { researchSpeed: 0.08, heroExp: 0.05 }, desc: '研究速度+8%，英雄经验+5%' },
  arabia:   { name: '阿拉伯', icon: '🕌', bonus: { goldProd: 0.05, troopAtk: 0.08 }, desc: '黄金产量+5%，部队攻击+8%' },
  japan:    { name: '日本', icon: '⛩️', bonus: { troopAtk: 0.08, woodProd: 0.05 }, desc: '部队攻击+8%，木材产量+5%' }
};

const RESOURCES = {
  wood:  { name: '木材', icon: '🪵' },
  food:  { name: '粮食', icon: '🌾' },
  stone: { name: '石料', icon: '🪨' },
  gold:  { name: '黄金', icon: '💰' },
  gems:  { name: '钻石', icon: '💎' }
};

const BUILDING_TYPES = {
  castle: {
    name: '主城', icon: '🏰', maxLevel: 20,
    desc: '提升人口上限并解锁其他建筑',
    cost: lvl => ({ wood: 100 * lvl * lvl, stone: 80 * lvl * lvl, gold: 50 * lvl }),
    time: lvl => 30 + lvl * 15,
    effects: lvl => ({ population: lvl * 500 })
  },
  barracks: {
    name: '兵营', icon: '⚔️', maxLevel: 15,
    desc: '训练步兵、骑兵、弓兵',
    cost: lvl => ({ wood: 60 * lvl, stone: 40 * lvl, gold: 30 * lvl }),
    time: lvl => 20 + lvl * 10,
    effects: lvl => ({ troopCapacity: lvl * 200 })
  },
  academy: {
    name: '学院', icon: '📚', maxLevel: 15,
    desc: '研究军事、经济和生存科技',
    cost: lvl => ({ wood: 50 * lvl, stone: 60 * lvl, gold: 40 * lvl }),
    time: lvl => 25 + lvl * 12,
    effects: lvl => ({ researchSlots: Math.ceil(lvl / 3) })
  },
  farm: {
    name: '农田', icon: '🌾', maxLevel: 20,
    desc: '生产粮食',
    cost: lvl => ({ wood: 30 * lvl, stone: 20 * lvl }),
    time: lvl => 10 + lvl * 5,
    effects: lvl => ({ foodProd: 10 + lvl * 5 })
  },
  lumbermill: {
    name: '伐木场', icon: '🪓', maxLevel: 20,
    desc: '生产木材',
    cost: lvl => ({ stone: 20 * lvl, gold: 10 * lvl }),
    time: lvl => 10 + lvl * 5,
    effects: lvl => ({ woodProd: 10 + lvl * 5 })
  },
  quarry: {
    name: '采石场', icon: '⛏️', maxLevel: 20,
    desc: '生产石料',
    cost: lvl => ({ wood: 20 * lvl, gold: 10 * lvl }),
    time: lvl => 10 + lvl * 5,
    effects: lvl => ({ stoneProd: 10 + lvl * 5 })
  },
  goldmine: {
    name: '金矿', icon: '💰', maxLevel: 20,
    desc: '生产黄金',
    cost: lvl => ({ wood: 40 * lvl, stone: 30 * lvl }),
    time: lvl => 15 + lvl * 8,
    effects: lvl => ({ goldProd: 5 + lvl * 3 })
  },
  warehouse: {
    name: '仓库', icon: '🏚️', maxLevel: 10,
    desc: '增加资源存储上限',
    cost: lvl => ({ wood: 50 * lvl, stone: 50 * lvl }),
    time: lvl => 15 + lvl * 8,
    effects: lvl => ({ storage: lvl * 5000 })
  },
  tavern: {
    name: '酒馆', icon: '🍺', maxLevel: 10,
    desc: '招募英雄，提升招募品质',
    cost: lvl => ({ wood: 80 * lvl, stone: 60 * lvl, gold: 40 * lvl }),
    time: lvl => 30 + lvl * 15,
    effects: lvl => ({ summonBonus: lvl * 0.02 })
  }
};

const HERO_RARITIES = {
  normal:    { name: '普通', color: '#9e9e9e', stars: 1, baseStat: 10 },
  rare:      { name: '稀有', color: '#2196f3', stars: 2, baseStat: 20 },
  epic:      { name: '史诗', color: '#9c27b0', stars: 3, baseStat: 35 },
  legendary: { name: '传说', color: '#ff9800', stars: 4, baseStat: 55 }
};

const HERO_CLASSES = {
  commander: { name: '统帅', icon: '👑', bonus: '部队攻击+X%' },
  defender:  { name: '防御', icon: '🛡️', bonus: '部队生命+X%' },
  support:   { name: '支援', icon: '💚', bonus: '治疗和增益' },
  ranger:    { name: '游侠', icon: '🏹', bonus: 'Roguelike射程+X%' }
};

const HERO_TEMPLATES = [
  // Legendary
  { id: 'arthur',    name: '亚瑟王',     rarity: 'legendary', heroClass: 'commander', weapon: 'sword',    skill: 'Excalibur',  skillDesc: '对周围敌人造成大范围伤害', baseHp: 120, baseAtk: 25, baseSpd: 3.0 },
  { id: 'caesar',    name: '凯撒',       rarity: 'legendary', heroClass: 'commander', weapon: 'sword',    skill: '帝国荣光',   skillDesc: '召唤罗马方阵，击退所有敌人', baseHp: 110, baseAtk: 28, baseSpd: 2.8 },
  { id: 'genghis',   name: '成吉思汗',   rarity: 'legendary', heroClass: 'ranger',    weapon: 'bow',      skill: '蒙古铁骑',   skillDesc: '释放箭雨覆盖全屏', baseHp: 90, baseAtk: 32, baseSpd: 3.5 },
  { id: 'charles',   name: '查理大帝',   rarity: 'legendary', heroClass: 'defender',  weapon: 'spear',    skill: '圣盾',       skillDesc: '生成无敌护盾持续5秒', baseHp: 150, baseAtk: 18, baseSpd: 2.5 },
  // Epic
  { id: 'lincoln',   name: '林肯',       rarity: 'epic', heroClass: 'support',    weapon: 'staff',    skill: '解放宣言',   skillDesc: '回复30%最大生命值', baseHp: 80, baseAtk: 15, baseSpd: 3.0 },
  { id: 'washington',name: '华盛顿',     rarity: 'epic', heroClass: 'commander',  weapon: 'sword',    skill: '独立之战',   skillDesc: '攻击力提升50%持续10秒', baseHp: 95, baseAtk: 22, baseSpd: 3.2 },
  { id: 'joan',      name: '圣女贞德',   rarity: 'epic', heroClass: 'support',    weapon: 'spear',    skill: '神启',       skillDesc: '回复生命并提升移速', baseHp: 85, baseAtk: 14, baseSpd: 3.8 },
  { id: 'sultan',    name: '苏莱曼',     rarity: 'epic', heroClass: 'ranger',     weapon: 'crossbow', skill: '新月弯刀',   skillDesc: '发射穿透敌人的刀刃', baseHp: 80, baseAtk: 24, baseSpd: 3.3 },
  // Rare
  { id: 'robin',     name: '罗宾汉',     rarity: 'rare', heroClass: 'ranger',     weapon: 'bow',      skill: '精准射击',   skillDesc: '射出高伤害箭矢', baseHp: 70, baseAtk: 20, baseSpd: 3.5 },
  { id: 'spartan',   name: '斯巴达勇士', rarity: 'rare', heroClass: 'defender',   weapon: 'spear',    skill: '战吼',       skillDesc: '击退周围敌人并造成眩晕', baseHp: 100, baseAtk: 16, baseSpd: 2.8 },
  { id: 'ninja',     name: '忍者',       rarity: 'rare', heroClass: 'ranger',     weapon: 'dagger',   skill: '影分身',     skillDesc: '召唤分身协同攻击', baseHp: 60, baseAtk: 22, baseSpd: 4.0 },
  { id: 'priest',    name: '牧师',       rarity: 'rare', heroClass: 'support',    weapon: 'staff',    skill: '圣光术',     skillDesc: '持续回复生命', baseHp: 65, baseAtk: 10, baseSpd: 3.0 },
  // Normal
  { id: 'soldier',   name: '步兵',       rarity: 'normal', heroClass: 'defender', weapon: 'spear',   skill: '坚守',       skillDesc: '短暂提升防御力', baseHp: 80, baseAtk: 10, baseSpd: 2.5 },
  { id: 'archer',    name: '弓手',       rarity: 'normal', heroClass: 'ranger',   weapon: 'bow',     skill: '连射',       skillDesc: '快速射出3支箭', baseHp: 50, baseAtk: 14, baseSpd: 3.2 },
  { id: 'scout',     name: '斥候',       rarity: 'normal', heroClass: 'ranger',   weapon: 'dagger',  skill: '疾跑',       skillDesc: '短暂大幅提升移速', baseHp: 45, baseAtk: 12, baseSpd: 4.2 },
  { id: 'page',      name: '侍从',       rarity: 'normal', heroClass: 'support',  weapon: 'staff',   skill: '治疗',       skillDesc: '回复少量生命', baseHp: 55, baseAtk: 8, baseSpd: 3.0 }
];

const WEAPONS = {
  sword:   { name: '长剑',   icon: '🗡️', range: 60,  dmg: 15, speed: 0.4, color: '#e0e0e0', type: 'melee' },
  bow:     { name: '长弓',   icon: '🏹', range: 200, dmg: 10, speed: 0.6, color: '#8bc34a', type: 'projectile' },
  staff:   { name: '法杖',   icon: '🪄', range: 150, dmg: 12, speed: 0.8, color: '#7c4dff', type: 'aoe' },
  crossbow:{ name: '弩',     icon: '⚙️', range: 180, dmg: 18, speed: 1.0, color: '#ff5722', type: 'projectile' },
  dagger:  { name: '匕首',   icon: '🗡️', range: 40,  dmg: 8,  speed: 0.2, color: '#90a4ae', type: 'melee' },
  spear:   { name: '长矛',   icon: '🔱', range: 55,  dmg: 16, speed: 0.5, color: '#ffeb3b', type: 'melee' }
};

const UPGRADES = [
  { id: 'atk_up',      name: '攻击力提升',  icon: '⚔️', desc: '攻击力+15%',     apply: s => { s.attack *= 1.15; } },
  { id: 'spd_up',      name: '移动加速',    icon: '👟', desc: '移速+12%',       apply: s => { s.speed *= 1.12; } },
  { id: 'hp_up',       name: '生命强化',    icon: '❤️', desc: '最大HP+20%',     apply: s => { s.maxHp *= 1.20; s.hp = Math.min(s.hp + s.maxHp * 0.2, s.maxHp); } },
  { id: 'hp_regen',    name: '生命回复',    icon: '💚', desc: '每秒回复1%HP',   apply: s => { s.hpRegen += 0.01; } },
  { id: 'range_up',    name: '射程增加',    icon: '🎯', desc: '攻击范围+20%',   apply: s => { s.range *= 1.20; } },
  { id: 'cooldown',    name: '攻速提升',    icon: '⚡', desc: '攻击间隔-15%',   apply: s => { s.attackSpeed *= 0.85; } },
  { id: 'crit',        name: '暴击之心',    icon: '💥', desc: '暴击率+10%，暴击伤害+50%', apply: s => { s.critRate += 0.10; s.critDmg += 0.50; } },
  { id: 'magnet',      name: '磁力吸引',    icon: '🧲', desc: '拾取范围+50%',   apply: s => { s.pickupRange *= 1.50; } },
  { id: 'shield',      name: '能量护盾',    icon: '🛡️', desc: '每30秒抵挡一次伤害', apply: s => { s.shieldCount += 1; } },
  { id: 'xp_bonus',    name: '经验加成',    icon: '📖', desc: '经验获取+25%',   apply: s => { s.xpMult *= 1.25; } }
];

const ENEMY_TYPES = {
  skeleton:  { name: '骷髅',  hp: 20,  atk: 5,  speed: 1.2, size: 14, color: '#e0e0e0', xp: 5 },
  goblin:    { name: '哥布林', hp: 15,  atk: 4,  speed: 1.8, size: 12, color: '#4caf50', xp: 4 },
  archer_e:  { name: '暗影弓', hp: 12,  atk: 8,  speed: 1.0, size: 12, color: '#795548', xp: 6, ranged: true, range: 150 },
  knight_e:  { name: '黑骑士', hp: 50,  atk: 10, speed: 0.8, size: 18, color: '#424242', xp: 12 },
  mage_e:    { name: '暗法师', hp: 25,  atk: 12, speed: 0.9, size: 14, color: '#9c27b0', xp: 10, ranged: true, range: 180 },
  orc:       { name: '兽人',   hp: 40,  atk: 8,  speed: 1.0, size: 20, color: '#8bc34a', xp: 8 },
  wolf:       { name: '魔兽',    hp: 18,  atk: 6,  speed: 2.5, size: 12, color: '#607d8b', xp: 5 },
  // --- New enemy types ---
  shadow_assassin: { name: '暗影刺客', hp: 22, atk: 9, speed: 2.8, size: 13, color: '#311b92', xp: 8, dodgeRate: 0.25 },
  elemental:  { name: '元素精灵', hp: 30, atk: 14, speed: 1.3, size: 14, color: '#00bcd4', xp: 11, ranged: true, range: 160, elementType: 'ice' },
  troll:      { name: '巨魔',    hp: 80, atk: 15, speed: 0.5, size: 24, color: '#33691e', xp: 14, slowAttack: true },
  necromancer:{ name: '亡灵法师', hp: 35, atk: 7,  speed: 0.7, size: 15, color: '#880e4f', xp: 12, ranged: true, range: 200, summonSkill: true },
  berserker:  { name: '狂战士',  hp: 45, atk: 9,  speed: 1.5, size: 19, color: '#b71c1c', xp: 10, berserkMode: true }
};

const BOSS_TYPES = [
  { name: '骷髅王',   hp: 500,  atk: 20, speed: 0.6, size: 35, color: '#b0bec5', xp: 100, skills: ['charge', 'summon'] },
  { name: '火焰恶魔', hp: 800,  atk: 25, speed: 0.7, size: 40, color: '#ff5722', xp: 150, skills: ['fireball', 'aoe'] },
  { name: '冰霜巨人', hp: 1200, atk: 30, speed: 0.4, size: 50, color: '#03a9f4', xp: 200, skills: ['ice_wall', 'stomp'] },
  { name: '暗影龙',   hp: 2000, atk: 35, speed: 0.5, size: 45, color: '#4a148c', xp: 300, skills: ['breath', 'fly', 'summon'] }
];

const BATTLE_MAPS = [
  {
    id: 'veloria', name: '藤影城', terrain: '雨林', theme: 'tengying',
    desc: '藤蔓覆盖的远征城邦，敌人数量稳定增加，适合作为开局战役。',
    enemies: ['skeleton', 'goblin', 'wolf', 'shadow_assassin'], miniBoss: 0, finalBoss: 1
  },
  {
    id: 'mireholt', name: '雾泽城', terrain: '沼泽', theme: 'swamp',
    desc: '腐雾与浅水拖慢行军，高血量敌人与法师开始混编。',
    enemies: ['goblin', 'wolf', 'mage_e', 'orc', 'berserker'], miniBoss: 1, finalBoss: 2
  },
  {
    id: 'saharun', name: '砂冠城', terrain: '沙漠', theme: 'desert',
    desc: '遗迹间的开阔战场，远程单位增多，敌人攻击成长更明显。',
    enemies: ['skeleton', 'archer_e', 'orc', 'knight_e', 'necromancer'], miniBoss: 0, finalBoss: 2
  },
  {
    id: 'frostspire', name: '霜穹城', terrain: '极地雪原', theme: 'snow',
    desc: '寒风中的北境要塞，精英怪比例提升，Boss 血量更厚。',
    enemies: ['wolf', 'mage_e', 'knight_e', 'archer_e', 'elemental'], miniBoss: 2, finalBoss: 3
  },
  {
    id: 'emberfall', name: '熔渊城', terrain: '火山', theme: 'volcano',
    desc: '熔岩环绕的终局城池，敌人数量、生命和攻击全面提升。',
    enemies: ['orc', 'knight_e', 'mage_e', 'wolf', 'troll'], miniBoss: 1, finalBoss: 3
  }
];

function makeBattleStage(map, mapIndex, localIndex) {
  const globalIndex = mapIndex * 10 + localIndex;
  const stageNo = localIndex + 1;
  const primary = map.enemies[localIndex % map.enemies.length];
  const secondary = map.enemies[(localIndex + 1) % map.enemies.length];
  const elite = map.enemies[(localIndex + 2) % map.enemies.length];
  const baseCount = 5 + localIndex * 2 + mapIndex * 2;
  const enemies = [{ type: primary, count: baseCount }];

  if (stageNo >= 3) enemies.push({ type: secondary, count: 3 + localIndex + mapIndex });
  if (stageNo >= 7) enemies.push({ type: elite, count: 2 + Math.floor(localIndex / 2) + mapIndex });

  const isMiniBoss = stageNo === 5;
  const isFinalBoss = stageNo === 10;

  return {
    mapId: map.id,
    mapName: map.name,
    terrain: map.terrain,
    theme: map.theme,
    stageName: `${map.name} ${stageNo}`,
    globalStage: globalIndex,
    localStage: stageNo,
    enemies,
    spawnInterval: Math.max(0.32, 1.45 - localIndex * 0.08 - mapIndex * 0.06),
    hpMult: 1 + mapIndex * 0.38 + localIndex * 0.11,
    atkMult: 1 + mapIndex * 0.32 + localIndex * 0.09,
    xpMult: 1 + mapIndex * 0.18 + localIndex * 0.06,
    boss: isMiniBoss || isFinalBoss,
    bossIndex: isFinalBoss ? map.finalBoss : map.miniBoss,
    difficultyLabel: isFinalBoss ? '终关' : isMiniBoss ? '精英' : '普通'
  };
}

const WAVE_CONFIGS = BATTLE_MAPS.flatMap((map, mapIndex) =>
  Array.from({ length: 10 }, (_, localIndex) => makeBattleStage(map, mapIndex, localIndex))
);

function getBattleMapByStage(stageIndex) {
  const idx = Math.max(0, Math.min(BATTLE_MAPS.length - 1, Math.floor(Number(stageIndex || 0) / 10)));
  return BATTLE_MAPS[idx];
}

function getBattleStageEnergyCost(stageIndex) {
  if (stageIndex === 'infinite') return 15;
  const idx = Number(stageIndex || 0);
  const mapIndex = Math.floor(idx / 10);
  const localIndex = idx % 10;
  return 10 + mapIndex * 3 + Math.floor(localIndex / 5) * 5;
}

const NOBILITY_RANKS = [
  {
    level: 0, name: '平民', title: '无爵位',
    salary: { wood: 0, food: 0, stone: 0, gold: 0, gems: 0 },
    desc: '尚未攻下一座主城，暂无固定俸禄。'
  },
  {
    level: 1, name: '骑士', title: '藤影骑士',
    salary: { wood: 220, food: 220, stone: 120, gold: 180, gems: 5 },
    desc: '通关藤影城后受封，获得入门级远征俸禄。'
  },
  {
    level: 2, name: '男爵', title: '雾泽男爵',
    salary: { wood: 420, food: 420, stone: 260, gold: 360, gems: 10 },
    desc: '两座主城纳入版图，俸禄提升为地方领主级。'
  },
  {
    level: 3, name: '子爵', title: '砂冠子爵',
    salary: { wood: 720, food: 660, stone: 520, gold: 620, gems: 16 },
    desc: '横穿沙海后晋升，远征军补给更加稳定。'
  },
  {
    level: 4, name: '伯爵', title: '霜穹伯爵',
    salary: { wood: 1100, food: 980, stone: 860, gold: 980, gems: 24 },
    desc: '极地防线归入麾下，获得高阶贵族俸禄。'
  },
  {
    level: 5, name: '侯爵', title: '熔渊侯爵',
    salary: { wood: 1600, food: 1400, stone: 1280, gold: 1500, gems: 35 },
    desc: '攻破熔渊城后的最高爵位，享有完整远征封赏。'
  }
];

function getCompletedMajorCities() {
  const highest = gameState?.roguelike?.highestStage || 0;
  return Math.max(0, Math.min(BATTLE_MAPS.length, Math.floor(highest / 10)));
}

function getNobilityRank(level) {
  const idx = Math.max(0, Math.min(NOBILITY_RANKS.length - 1, Number(level || 0)));
  return NOBILITY_RANKS[idx];
}

function getCurrentNobilityRank() {
  return getNobilityRank(getCompletedMajorCities());
}

function getNextNobilityRank() {
  const completed = getCompletedMajorCities();
  return completed < BATTLE_MAPS.length ? getNobilityRank(completed + 1) : null;
}

const BATTLE_ITEMS = {
  blood_pack: {
    name: '血包',
    shortName: '回血',
    desc: '战斗中立即恢复 45% 最大生命。',
    shopDesc: '立即回血，适合 Boss 战前准备。',
    effect: 'heal'
  },
  sedative: {
    name: '镇定剂',
    shortName: '速冷',
    desc: '让技能冷却立即完成 3 次。',
    shopDesc: '获得 3 次技能冷却秒好次数。',
    effect: 'skill_ready'
  },
  puppet: {
    name: '傀儡木偶',
    shortName: '木偶',
    desc: '召唤自身最大生命 30% 的木偶，并吸引敌人攻击。',
    shopDesc: '召唤嘲讽木偶替英雄承伤。',
    effect: 'decoy'
  },
  smoke_bomb: {
    name: '烟雾弹',
    shortName: '烟雾',
    desc: '取消敌人锁定，敌人短时间无目的随机移动。',
    shopDesc: '打断敌人追击并清空敌方飞行弹幕。',
    effect: 'smoke'
  },
  rebirth_charm: {
    name: '重生符',
    shortName: '重生',
    desc: '死亡后自动重生并恢复满血，每场战斗最多触发一次。',
    shopDesc: '战斗内首次死亡时自动满血复活。',
    effect: 'rebirth'
  }
};

const SHOP_ITEMS = [
  { id: 'energy_refill_gold', name: '金币回满体力', icon: '🔋', assetId: 'energy_refill', cost: 100, currency: 'gold', category: 'premium', reward: { energyFull: true }, desc: '花费金币立即恢复全部体力，适合继续挑战关卡。' },
  { id: 'energy_refill_gems', name: '钻石回满体力', icon: '💎', assetId: 'energy_refill', cost: 20, currency: 'gems', category: 'premium', reward: { energyFull: true }, desc: '20钻石立即恢复全部体力。' },
  { id: 'wood_pack',    name: '木材包',   icon: '🪵', cost: 100,  currency: 'gold',   reward: { wood: 500 },  desc: '一次性获得 500 木材，建造与升级城建必备资源。' },
  { id: 'food_pack',    name: '粮食包',   icon: '🌾', cost: 100,  currency: 'gold',   reward: { food: 500 },  desc: '一次性获得 500 粮食，维持军队补给的关键资源。' },
  { id: 'stone_pack',   name: '石料包',   icon: '🪨', cost: 120,  currency: 'gold',   reward: { stone: 500 }, desc: '一次性获得 500 石料，加固城防与升级建筑的硬通货。' },
  { id: 'exp_book_s',   name: '经验书(小)',icon: '📕', cost: 200,  currency: 'gold',   reward: { heroExp: 100 }, desc: '为当前出战英雄追加 100 点经验，加速升级。' },
  { id: 'exp_book_l',   name: '经验书(大)',icon: '📗', cost: 50,   currency: 'gems', category: 'premium', reward: { heroExp: 500 }, desc: '为当前出战英雄追加 500 点经验，是普通经验书 5 倍效率。' },
  { id: 'blood_pack',   name: '血包',     icon: '', cost: 300,  currency: 'gold', category: 'battle', desc: BATTLE_ITEMS.blood_pack.shopDesc, reward: { item: 'blood_pack', qty: 1 } },
  { id: 'sedative',     name: '镇定剂',   icon: '', cost: 45,   currency: 'gems', category: 'battle', desc: BATTLE_ITEMS.sedative.shopDesc, reward: { item: 'sedative', qty: 1 } },
  { id: 'puppet',       name: '傀儡木偶', icon: '', cost: 520,  currency: 'gold', category: 'battle', desc: BATTLE_ITEMS.puppet.shopDesc, reward: { item: 'puppet', qty: 1 } },
  { id: 'smoke_bomb',   name: '烟雾弹',   icon: '', cost: 420,  currency: 'gold', category: 'battle', desc: BATTLE_ITEMS.smoke_bomb.shopDesc, reward: { item: 'smoke_bomb', qty: 1 } },
  { id: 'rebirth_charm',name: '重生符',   icon: '', cost: 120,  currency: 'gems', category: 'battle', desc: BATTLE_ITEMS.rebirth_charm.shopDesc, reward: { item: 'rebirth_charm', qty: 1 } }
];

const SUMMON_RATES = {
  normal:    0.50,
  rare:      0.30,
  epic:      0.15,
  legendary: 0.05
};

const SUMMON_COST = { gems: 100, tenGems: 900 };
const PITY_THRESHOLD = 20; // guaranteed epic at 20 pulls, legendary at 50

const TECH_BRANCHES = {
  military: { name: '军事', desc: '提升英雄在战斗中的攻击、生存和推进能力' },
  economy: { name: '经济', desc: '提升城市木材、粮食、石料、黄金产出' },
  survival: { name: '生存', desc: '强化 Roguelike 模式的续航、收益和掉落' }
};

const TECH_TREE = {
  military: [
    {
      id: 'm1', name: '攻击训练', maxLevel: 20, costBase: 200, costGrowth: 1.16,
      effects: { troopAtk: 0.05 }, desc: '攻击每级+5%，最高+100%'
    },
    {
      id: 'm2', name: '生命护甲', maxLevel: 20, costBase: 220, costGrowth: 1.16,
      effects: { troopHp: 0.05 }, desc: '生命每级+5%，最高+100%'
    },
    {
      id: 'm3', name: '急行军', maxLevel: 20, costBase: 260, costGrowth: 1.15,
      effects: { rogueSpeed: 0.03 }, desc: '战斗移速每级+3%，最高+60%'
    },
    {
      id: 'm4', name: '破甲演练', maxLevel: 20, costBase: 320, costGrowth: 1.17,
      effects: { rogueCrit: 0.02 }, desc: '暴击率每级+2%，最高+40%'
    }
  ],
  economy: [
    {
      id: 'e1', name: '农耕术', maxLevel: 20, costBase: 180, costGrowth: 1.14,
      effects: { foodProd: 0.05 }, desc: '粮食产量每级+5%，最高+100%'
    },
    {
      id: 'e2', name: '伐木术', maxLevel: 20, costBase: 180, costGrowth: 1.14,
      effects: { woodProd: 0.05 }, desc: '木材产量每级+5%，最高+100%'
    },
    {
      id: 'e3', name: '采石术', maxLevel: 20, costBase: 200, costGrowth: 1.15,
      effects: { stoneProd: 0.05 }, desc: '石料产量每级+5%，最高+100%'
    },
    {
      id: 'e4', name: '炼金术', maxLevel: 20, costBase: 240, costGrowth: 1.16,
      effects: { goldProd: 0.05 }, desc: '黄金产量每级+5%，最高+100%'
    }
  ],
  survival: [
    {
      id: 's1', name: '求生本能', maxLevel: 20, costBase: 240, costGrowth: 1.16,
      effects: { rogueHp: 0.05 }, desc: '战斗生命每级+5%，最高+100%'
    },
    {
      id: 's2', name: '拾荒者', maxLevel: 20, costBase: 260, costGrowth: 1.16,
      effects: { rogueRes: 0.05 }, desc: '战斗资源收益每级+5%，最高+100%'
    },
    {
      id: 's3', name: '战意', maxLevel: 20, costBase: 280, costGrowth: 1.17,
      effects: { rogueAtk: 0.05 }, desc: 'Roguelike 攻击每级+5%，最高+100%'
    },
    {
      id: 's4', name: '命运之轮', maxLevel: 20, costBase: 360, costGrowth: 1.18,
      effects: { rogueLuck: 0.05 }, desc: '掉落概率每级+5%，最高+100%'
    }
  ]
};

const TECH_EFFECT_LABELS = {
  troopAtk: '攻击',
  troopHp: '生命',
  rogueSpeed: '移速',
  rogueCrit: '暴击率',
  foodProd: '粮食产量',
  woodProd: '木材产量',
  stoneProd: '石料产量',
  goldProd: '黄金产量',
  rogueHp: '战斗生命',
  rogueRes: '战斗收益',
  rogueAtk: 'Roguelike攻击',
  rogueLuck: '掉落概率'
};

function findTechById(techId) {
  for (const [branchKey, techs] of Object.entries(TECH_TREE)) {
    const tech = techs.find(t => t.id === techId);
    if (tech) return { ...tech, branchKey };
  }
  return null;
}

function getTechCost(tech, level) {
  const nextLevel = Math.max(1, level + 1);
  return { gold: Math.floor(tech.costBase * Math.pow(tech.costGrowth || 1.15, nextLevel - 1)) };
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

const ACHIEVEMENTS = [
  { id: 'first_build',    name: '初授爵位',   desc: '攻下一座主城并获得爵位', reward: { gems: 10 } },
  { id: 'first_battle',   name: '初次战斗',   desc: '完成第一场Roguelike关卡', reward: { gems: 20 } },
  { id: 'boss_slayer_10', name: '屠戮者',     desc: '击败10个Boss',          reward: { gems: 50 } },
  { id: 'boss_slayer_100',name: '传奇猎手',   desc: '击败100个Boss',         reward: { gems: 200 } },
  { id: 'castle_10',      name: '封疆贵胄',   desc: '晋升至侯爵',             reward: { gems: 100 } },
  { id: 'hero_legendary', name: '命运眷顾',   desc: '获得第一个传说英雄',     reward: { gems: 50 } },
  { id: 'heroes_10',      name: '英雄云集',   desc: '拥有10名英雄',           reward: { gems: 30 } },
  { id: 'stage_10',       name: '勇者之路',   desc: '通关第10关',             reward: { gems: 50 } },
  { id: 'stage_20',       name: '无双战神',   desc: '通关第20关',             reward: { gems: 150 } }
];

const DAILY_TASKS = [
  { id: 'dt1', name: '日常战斗',  desc: '完成3次Roguelike关卡', target: 3, reward: { gold: 300, gems: 10 } },
  { id: 'dt2', name: '资源采集',  desc: '收集500资源',          target: 500, reward: { gems: 5 } },
  { id: 'dt3', name: '领取俸禄',  desc: '领取1次爵位俸禄',      target: 1, reward: { wood: 200, stone: 200 } },
  { id: 'dt4', name: '英雄培养',  desc: '升级1次英雄',          target: 1, reward: { gold: 200 } }
];


// ============================================================
// Story & Narrative Data
// ============================================================

const STORY_DATA = {
  heroBackstories: {
    arthur: '出身于边境小村的战士，为了保卫家园踏上征程。在一次远古遗迹的探险中，拔出了传说中的石中剑，从此肩负起统一王国的使命...',
    caesar: '罗马帝国最年轻的将军，凭借卓越的战术才能征服了高卢全境。当黑暗势力从东方入侵时，他毅然率军远征，誓要守护文明的火种...',
    genghis: '草原上的雄鹰，自幼在马背上长大。 unified the warring tribes and forged the mightiest cavalry the world had ever seen. His arrows blot out the sun...',
    charles: '法兰克的守护者，手持圣枪隆基努斯。在亡灵大军席卷大陆之际，他以生命为代价筑起圣盾结界，保护了最后的避难所...',
    lincoln: '从平民中走出的魔法师，掌握着远古禁忌的解放魔法。他坚信真正的力量不在于毁灭，而在于守护每一个弱小的生命...',
    washington: '独立军团的领袖，在绝境中带领人民赢得了自由。他的剑锋所指，即是自由之光照耀的地方...',
    joan: '农家少女却在教堂中听到了神谕。披上铠甲、拿起长枪，她成为了战场上的启明星，照亮了联军胜利的道路...',
    sultan: '新月帝国的天才统帅，精通弩箭与弯刀的双重技艺。他在沙漠中建立了庞大的学院，培养了无数传奇射手...',
    robin: '雪伍德森林的义贼之王，箭无虚发。他用劫富济贫的方式对抗暴政，成为了平民心中的传奇英雄...',
    spartan: '温泉关最后的勇士，以三百人之力抵挡了万军之师。他的战吼能让敌人肝胆俱裂，闻风丧胆...',
    ninja: '来自东方岛国的暗影大师，掌握着分身与瞬移的秘术。没人见过他的真面目，因为见过的敌人都已经倒下了...',
    priest: '圣光教会最虔诚的治疗者，行走于战场之上挽救生命。他相信即使在最黑暗的时刻，希望之光也永远不会熄灭...',
    soldier: '王国军中最普通的步兵，没有耀眼的背景，只有钢铁般的意志。正是千千万万像他这样的战士，筑起了王国的防线...',
    archer: '精灵族边境巡逻队的射手，天生拥有超凡的视力。她的连射技巧能在三息之内射出九箭，箭箭命中要害...',
    scout: '王国最出色的斥候，身手敏捷如风。在敌后侦查时从未失手，为大军提供了无数关键情报...',
    page: '贵族城堡中的年轻侍从，暗中学习治疗魔法。虽然身份卑微，但他的治愈之手挽救过无数战友的生命...'
  },

  levelStories: [
    { level: 1, title: '启程', text: '王国边境出现异动，作为王国勇士，你奉命前往调查。前方的道路充满未知，但你心中燃烧着守护家园的决心...' },
    { level: 3, title: '初战告捷', text: '你击败了第一批入侵者，发现他们身上带有黑暗力量的印记。这股力量似乎来自遥远的北方荒原...' },
    { level: 5, title: '暗影初现', text: '在森林深处，你发现了黑暗势力的踪迹。奇怪的符文遍布树干，空气中弥漫着腐朽的气息...' },
    { level: 7, title: '盟友的呼唤', text: '附近的村庄遭到袭击，幸存的村民告诉你，一支亡灵军队正在向王都进发。你必须加快速度了...' },
    { level: 10, title: '骷髅王的威胁', text: '古老的骷髅王从沉睡中苏醒，率领亡灵大军向人类世界发起了进攻。这是对你实力的第一次真正考验...' },
    { level: 13, title: '沼泽迷踪', text: '穿越迷雾沼泽的途中，你遭遇了前所未见的变异怪物。黑暗力量正在扭曲这片土地上的生灵...' },
    { level: 15, title: '火焰试炼', text: '沙漠深处的遗迹中，传说封印着远古的火焰恶魔。你所经过的地方，只剩下焦黑的痕迹...' },
    { level: 17, title: '冰原行者', text: '北境的寒冰无法冻结你心中的热血。在这片永恒冻土之下，沉睡着足以毁灭世界的远古巨兽...' },
    { level: 20, title: '熔渊之心', text: '你来到了世界的尽头——熔渊城。这里是黑暗力量的源头，最终的决战即将展开。王国的命运，就掌握在你的手中...' },
    { level: 25, title: '无尽征途', text: '传说在通关所有主城之后，隐藏在时空裂隙中的无尽试炼将向你敞开。只有真正的英雄，才能在这条路上走得更远...' }
  ],

  bossStories: {
    '骷髅王': '曾经的最强骑士，死后被黑暗力量复活，成为亡灵军团的首领。他挥舞着生锈的巨剑，率领不死大军践踏生者的土地...',
    '火焰恶魔': '来自地狱深渊的恶魔，所过之处皆为焦土。千年前被英雄封印于火山之中，如今封印破裂，它再次降临人间...',
    '冰霜巨人': '远古时代存活至今的巨人之王，拥有操控寒冰的力量。他的每一次呼吸都能冻结河流，每一步都让大地颤抖...',
    '暗影龙': '混沌时代的遗民，是暗影与恐惧的化身。传说它的龙息能够腐蚀灵魂，被它凝视的人将永远陷入噩梦之中...'
  }
};

// Apply difficulty multipliers
(function(){
  const dm = window.__difficultyMonsterMult || 1;
  for (const k in ENEMY_TYPES) {
    ENEMY_TYPES[k].hp = Math.max(1, Math.floor(ENEMY_TYPES[k].hp * dm));
    ENEMY_TYPES[k].atk = Math.max(1, Math.floor(ENEMY_TYPES[k].atk * dm));
  }
  for (const b of BOSS_TYPES) {
    b.hp = Math.max(1, Math.floor(b.hp * dm));
    b.atk = Math.max(1, Math.floor(b.atk * dm));
  }
})();
