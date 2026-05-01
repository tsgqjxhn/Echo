// ============================================================
// Game State Management
// ============================================================

const SAVE_KEY = 'evony_roguelike_save';

function createDefaultState() {
  return {
    version: 1,
    player: {
      name: '领主',
      level: 1,
      exp: 0,
      civilization: null,
      gems: 100,
      wood: 500,
      food: 500,
      stone: 300,
      gold: 200,
      energy: 100,
      maxEnergy: 100,
      energyRefillTime: null,
      lastLogin: Date.now()
    },
    city: {
      buildings: []
    },
    salary: {
      lastClaimAt: 0,
      lastClaimRank: 0
    },
    inventory: {
      battleItems: {}
    },
    heroes: [],
    selectedHero: null,
    roguelike: {
      highestStage: 0,
      totalBossKills: 0,
      totalRuns: 0,
      bestInfiniteWave: 0,
      selectedMap: 'veloria',
      summonPity: 0,
      legendPity: 0
    },
    researchLevels: {},
    completedTechs: [],
    researchQueue: null,
    achievements: [],
    dailyTasks: {
      date: null,
      progress: {}
    },
    buildQueue: [],
    settings: {
      sfx: true,
      music: true,
      language: 'zh'
    },
    tutorialDone: false
  };
}

function saveGame(options = {}) {
  const force = options === true || options.force === true;
  if (!force) return true;

  try {
    if (typeof window !== 'undefined' && window.__heroResetting) return true;
    if (!gameState) return false;
    const data = JSON.parse(JSON.stringify(gameState));
    data.player.lastLogin = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const defaultState = createDefaultState();
    // Merge missing keys from default
    return mergeDeep(defaultState, data);
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

function mergeDeep(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

function deleteSave() {
  try {
    if (typeof window !== 'undefined') window.__heroResetting = true;
    localStorage.removeItem(SAVE_KEY);
    // Also clear any auxiliary keys that this game scope may have written
    // (defensive: only touch keys with our prefix to avoid wiping other apps).
    const prefix = 'evony_';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) localStorage.removeItem(key);
    }
    // Drop in-memory state so pending autosave/timer callbacks cannot recreate the save.
    if (typeof gameState !== 'undefined') {
      try { gameState = null; } catch (_) {}
    }
    return true;
  } catch (e) {
    console.error('Reset save failed:', e);
    return false;
  }
}

function resetGameAndReload() {
  const ok = deleteSave();
  const fallbackWelcome = () => {
    try {
      if (typeof window !== 'undefined') window.__heroResetting = false;
      if (typeof gameState !== 'undefined') gameState = null;
      if (typeof UI !== 'undefined' && UI.showWelcome) UI.showWelcome();
    } catch (_) {}
  };
  // Force a clean restart of the iframe / page. Some embedded hosts can block
  // reload, so fall back to rendering the fresh welcome screen in-place.
  try {
    location.reload();
    setTimeout(fallbackWelcome, 300);
  } catch (_) {
    fallbackWelcome();
  }
  return ok;
}

// Resource helpers
function canAfford(costs) {
  const p = gameState.player;
  if (costs.wood && p.wood < costs.wood) return false;
  if (costs.food && p.food < costs.food) return false;
  if (costs.stone && p.stone < costs.stone) return false;
  if (costs.gold && p.gold < costs.gold) return false;
  if (costs.gems && p.gems < costs.gems) return false;
  return true;
}

function spendResources(costs) {
  const p = gameState.player;
  if (!canAfford(costs)) return false;
  if (costs.wood)  p.wood  -= costs.wood;
  if (costs.food)  p.food  -= costs.food;
  if (costs.stone) p.stone -= costs.stone;
  if (costs.gold)  p.gold  -= costs.gold;
  if (costs.gems)  p.gems  -= costs.gems;
  saveGame();
  return true;
}

function addResources(rewards) {
  if (!rewards) return;
  const p = gameState.player;
  const gemsBuff = getCityBuffValue('gemsMult');
  const resDouble = getCityBuffValue('resDouble').double;
  for (const key of ['wood', 'food', 'stone', 'gold', 'gems']) {
    if (!rewards[key]) continue;
    let val = rewards[key];
    if (key === 'gems') val = Math.floor(val * (1 + gemsBuff.value));
    if (resDouble) val *= 2;
    p[key] += val;
  }
  saveGame();
}

function ensureInventory() {
  if (!gameState.inventory) gameState.inventory = {};
  if (!gameState.inventory.battleItems) gameState.inventory.battleItems = {};
  return gameState.inventory.battleItems;
}

function getItemCount(itemId) {
  const bag = ensureInventory();
  return bag[itemId] || 0;
}

function addInventoryItem(itemId, qty = 1) {
  const bag = ensureInventory();
  bag[itemId] = (bag[itemId] || 0) + qty;
  saveGame();
  return bag[itemId];
}

function consumeInventoryItem(itemId, qty = 1) {
  const bag = ensureInventory();
  if ((bag[itemId] || 0) < qty) return false;
  bag[itemId] -= qty;
  if (bag[itemId] <= 0) delete bag[itemId];
  saveGame();
  return true;
}

const SALARY_CLAIM_COOLDOWN = 24 * 60 * 60 * 1000;

function getSalaryStatus() {
  if (!gameState.salary) gameState.salary = { lastClaimAt: 0, lastClaimRank: 0 };
  const completed = getCompletedMajorCities();
  const rank = getNobilityRank(completed);
  const nextRank = getNextNobilityRank();
  const now = Date.now();
  const lastClaimAt = gameState.salary.lastClaimAt || 0;
  const lastClaimRank = gameState.salary.lastClaimRank || 0;
  const upgraded = rank.level > lastClaimRank;
  const cooldownReady = !lastClaimAt || now - lastClaimAt >= SALARY_CLAIM_COOLDOWN;
  const canClaim = rank.level > 0 && (upgraded || cooldownReady);
  const readyAt = lastClaimAt + SALARY_CLAIM_COOLDOWN;
  return {
    completed,
    rank,
    nextRank,
    canClaim,
    upgraded,
    remainingMs: canClaim ? 0 : Math.max(0, readyAt - now)
  };
}

function getSalaryRewardWithBonuses(rank) {
  const reward = {};
  const civBonus = CIVILIZATIONS[gameState.player.civilization]?.bonus || {};
  for (const [key, value] of Object.entries(rank.salary || {})) {
    if (!value) {
      reward[key] = value;
      continue;
    }
    const productionKey = `${key}Prod`;
    const researchBonus = ['wood', 'food', 'stone', 'gold'].includes(key) && typeof ResearchManager !== 'undefined'
      ? ResearchManager.getProductionBonus(key)
      : 0;
    const bonus = (civBonus[productionKey] || 0) + researchBonus;
    const cityKey = key === 'gems' ? 'gemsMult' : (key === 'gold' ? 'goldMult' : null);
    const cityBonus = cityKey ? getCityBuffValue(cityKey).value : 0;
    reward[key] = Math.floor(value * (1 + bonus + cityBonus));
  }
  return reward;
}

function claimSalary() {
  const status = getSalaryStatus();
  if (status.rank.level <= 0) return { ok: false, msg: '先通关一座主城才能领取俸禄' };
  if (!status.canClaim) return { ok: false, msg: '俸禄尚未刷新' };

  const reward = getSalaryRewardWithBonuses(status.rank);
  addResources(reward);
  if (!gameState.dailyTasks.progress.dt3) gameState.dailyTasks.progress.dt3 = 0;
  gameState.dailyTasks.progress.dt3++;
  gameState.salary.lastClaimAt = Date.now();
  gameState.salary.lastClaimRank = status.rank.level;
  saveGame();
  return { ok: true, msg: `领取了${status.rank.name}俸禄`, reward, rank: status.rank };
}

// City-clear permanent buff system
const CITY_CLEAR_BUFFS = [
  { cities: 1, name: '攻击强化', desc: '攻击力永久+10%', apply: { atkMult: 0.10 } },
  { cities: 2, name: '体魄强化', desc: '最大体力永久+10%', apply: { hpMult: 0.10 } },
  { cities: 3, name: '经验大师', desc: '经验获取永久+10%', apply: { xpMult: 0.10 } },
  { cities: 4, name: '黄金矿主', desc: '金币收获永久+10%', apply: { goldMult: 0.10 } },
  { cities: 5, name: '宝石猎人', desc: '钻石收获永久+10%', apply: { gemsMult: 0.10 } },
  { cities: 5, name: '资源翻倍', desc: '通关全部主城，所有资源收益翻倍', apply: { resDouble: true }, requireAll: true },
];

function getActiveCityBuffs() {
  const completed = getCompletedMajorCities();
  const all = BATTLE_MAPS.length;
  return CITY_CLEAR_BUFFS.filter(b => {
    if (b.requireAll) return completed >= all;
    return completed >= b.cities;
  });
}

function getCityBuffValue(key) {
  let total = 0;
  let hasDouble = false;
  for (const b of getActiveCityBuffs()) {
    if (b.apply[key]) total += b.apply[key];
    if (b.apply.resDouble) hasDouble = true;
  }
  return { value: total, double: hasDouble };
}

// Energy system: 1 point per minute, only ticks while energy < max.
const ENERGY_REGEN_INTERVAL_SEC = 60;

function refillEnergy() {
  if (!gameState || !gameState.player) return;
  const p = gameState.player;
  const now = Date.now();

  if (p.energy >= p.maxEnergy) {
    p.energyRefillTime = now;
    return;
  }

  // First-time / migrated saves: use lastLogin if present so offline recovery
  // still works after older saves that did not store energyRefillTime.
  if (!p.energyRefillTime || p.energyRefillTime > now) {
    p.energyRefillTime = Math.min(p.lastLogin || now, now);
  }

  const elapsed = (now - p.energyRefillTime) / 1000;
  const recovered = Math.floor(elapsed / ENERGY_REGEN_INTERVAL_SEC);
  if (recovered > 0) {
    p.energy = Math.min(p.maxEnergy, p.energy + recovered);
    // Advance anchor by exactly the consumed slots so fractional time isn't
    // discarded — keeps regen accurate across long ticks (offline).
    p.energyRefillTime = p.energyRefillTime + recovered * ENERGY_REGEN_INTERVAL_SEC * 1000;
    saveGame();
  }
}

function consumeEnergy(amount) {
  const p = gameState.player;
  if (p.energy < amount) return false;
  // If this drop takes us below max for the first time, start the regen clock.
  if (p.energy >= p.maxEnergy) {
    p.energyRefillTime = Date.now();
  }
  p.energy -= amount;
  saveGame();
  return true;
}

// Offline resource production
function calcOfflineProduction() {
  const p = gameState.player;
  const now = Date.now();
  const elapsed = (now - p.lastLogin) / 1000; // seconds
  if (elapsed < 60) return null; // less than 1 minute, skip

  let production = { wood: 0, food: 0, stone: 0, gold: 0 };
  const buildings = gameState.city.buildings || [];
  for (const b of buildings) {
    const bt = BUILDING_TYPES[b.type];
    if (!bt) continue;
    const effects = bt.effects(b.level);
    const bonus = typeof ResearchManager !== 'undefined' ? ResearchManager : null;
    if (effects.woodProd)  production.wood  += Math.floor(effects.woodProd * elapsed / 60 * (1 + (bonus ? bonus.getProductionBonus('wood') : 0)));
    if (effects.foodProd)  production.food  += Math.floor(effects.foodProd * elapsed / 60 * (1 + (bonus ? bonus.getProductionBonus('food') : 0)));
    if (effects.stoneProd) production.stone += Math.floor(effects.stoneProd * elapsed / 60 * (1 + (bonus ? bonus.getProductionBonus('stone') : 0)));
    if (effects.goldProd)  production.gold  += Math.floor(effects.goldProd * elapsed / 60 * (1 + (bonus ? bonus.getProductionBonus('gold') : 0)));
  }

  // Cap at 8 hours max
  const cap = 8 * 3600;
  const factor = Math.min(elapsed, cap) / elapsed;
  production.wood  = Math.floor(production.wood * factor);
  production.food  = Math.floor(production.food * factor);
  production.stone = Math.floor(production.stone * factor);
  production.gold  = Math.floor(production.gold * factor);

  return production;
}

// Process build queue on load
function processBuildQueue() {
  const queue = gameState.buildQueue || [];
  const now = Date.now();
  const completed = [];
  const remaining = [];

  for (const task of queue) {
    if (now >= task.endTime) {
      completed.push(task);
    } else {
      remaining.push(task);
    }
  }

  gameState.buildQueue = remaining;

  for (const task of completed) {
    const building = gameState.city.buildings.find(b => b.id === task.buildingId);
    if (building) {
      building.level += 1;
    }
  }

  if (completed.length > 0) saveGame();
  return completed;
}

// Daily tasks reset
function checkDailyReset() {
  const today = new Date().toDateString();
  if (gameState.dailyTasks.date !== today) {
    gameState.dailyTasks = { date: today, progress: {} };
    saveGame();
  }
}
