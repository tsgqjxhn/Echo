// Core game systems: economy, offline earnings, prestige, buffs
import {
  CROP_DATA, RECIPE_DATA, BUFF_DATA, PRESTIGE_THRESHOLD,
  getGrowthSpeedMultiplier, getProductionSpeedMultiplier,
  getCustomerRateMultiplier, getPriceMultiplier,
} from './data.js';
import { addGold, addXP, addInventory, getInventory, hasInventory } from './state.js';

// Offline earnings calculation
export function calculateOfflineEarnings(state) {
  const now = Date.now();
  const offlineMs = now - (state.lastSaveTime || now);
  const offlineSec = offlineMs / 1000;

  if (offlineSec < 60) return { gold: 0, xp: 0, items: {}, duration: 0 };

  const duration = Math.min(offlineSec, 8 * 3600); // cap at 8 hours
  const decayFactor = 0.7; // 70% efficiency offline

  let goldEarned = 0;
  const itemsProduced = {};

  // Simulate farm production
  for (const plot of state.farm.plots) {
    if (!plot.crop) continue;
    const cropData = CROP_DATA[plot.crop];
    if (!cropData) continue;
    const growMult = getGrowthSpeedMultiplier(state);
    const effectiveGrowTime = cropData.growTime * growMult;
    const harvests = Math.floor(duration / effectiveGrowTime);
    const harvested = harvests * 1; // 1 unit per harvest
    if (harvested > 0) {
      itemsProduced[plot.crop] = (itemsProduced[plot.crop] || 0) + harvested;
      goldEarned += harvested * cropData.rawSell * 0.3 * decayFactor; // reduced offline value
    }
  }

  // Simulate factory production (if unlocked)
  if (state.factoryUnlocked) {
    for (const machine of state.factory.machines) {
      if (!machine.recipe) continue;
      const recipeData = RECIPE_DATA[machine.recipe];
      if (!recipeData) continue;
      const prodMult = getProductionSpeedMultiplier(state);
      const effectiveTime = recipeData.processTime * prodMult;
      const batches = Math.floor(duration / effectiveTime);
      // Check if we had enough input materials (simplified)
      let canProduce = batches;
      for (const [input, qty] of Object.entries(recipeData.inputs)) {
        const available = (itemsProduced[input] || 0) + (getInventory(state, input) || 0);
        canProduce = Math.min(canProduce, Math.floor(available / qty));
      }
      if (canProduce > 0) {
        itemsProduced[machine.recipe] = (itemsProduced[machine.recipe] || 0) + canProduce;
        goldEarned += canProduce * recipeData.factorySell * 0.5 * decayFactor;
      }
    }
  }

  // Simulate shop sales (if unlocked)
  if (state.shopUnlocked) {
    const priceMult = getPriceMultiplier(state);
    for (const [product, qty] of Object.entries(itemsProduced)) {
      const recipeData = RECIPE_DATA[product];
      if (recipeData) {
        const shopQty = Math.floor(qty * 0.6 * decayFactor);
        goldEarned += shopQty * recipeData.shopSell * priceMult * 0.4;
      }
    }
  }

  goldEarned = Math.floor(goldEarned);
  const xpEarned = Math.floor(goldEarned * 0.5);

  return { gold: goldEarned, xp: xpEarned, items: itemsProduced, duration };
}

// Apply offline earnings
export function applyOfflineEarnings(state, earnings) {
  if (earnings.gold > 0) addGold(state, earnings.gold);
  if (earnings.xp > 0) addXP(state, earnings.xp);
  for (const [item, qty] of Object.entries(earnings.items)) {
    addInventory(state, item, qty);
  }
  state.gameTime += earnings.duration;
}

// Prestige calculations
export function canPrestige(state) {
  return state.totalEarnings >= PRESTIGE_THRESHOLD;
}

export function calculatePrestigePoints(state) {
  if (state.totalEarnings < PRESTIGE_THRESHOLD) return 0;
  return Math.max(0, Math.floor(Math.pow(state.totalEarnings / PRESTIGE_THRESHOLD, 0.43) - state.prestigePoints));
}

export function getPrestigeMultiplier(state) {
  return 1 + 0.05 * state.prestigePoints;
}

export function doPrestige(state) {
  const newPoints = calculatePrestigePoints(state);
  if (newPoints <= 0) return false;

  const points = state.prestigePoints + newPoints;
  const prestigeCount = state.prestigeCount + 1;

  // Reset most state but keep prestige info
  const freshState = {
    ...state,
    gold: 500 + prestigeCount * 100,
    xp: 0,
    level: 1,
    totalEarnings: 0,
    prestigePoints: points,
    prestigeCount: prestigeCount,
    gameTime: 0,

    factoryUnlocked: false,
    shopUnlocked: false,
    logisticsUnlocked: false,

    farm: {
      plots: Array.from({ length: 3 }, (_, i) => ({ id: i, crop: null, plantedAt: 0, growthProgress: 0 })),
    },
    factory: {
      machines: [{ id: 0, recipe: null, startTime: 0, progress: 0 }],
    },
    shop: {
      shelves: Array.from({ length: 3 }, (_, i) => ({ id: i, product: null, quantity: 0, maxQuantity: 10 })),
      customers: [],
      customerTimer: 0,
      customerInterval: 5,
      totalCustomersServed: 0,
    },
    inventory: {},
    logistics: {
      trucks: [{ id: 0, busy: false, route: null, progress: 0, startTime: 0 }],
      routes: [],
      autoRoutes: [],
    },
    upgrades: {
      farm_plot: 3, irrigation: 0, fertilizer: 0, greenhouse: 0, tractor: 0,
      factory_machine: 1, speed_boost: 0, automation: 0,
      shop_shelf: 3, advertising: 0, decor: 0,
      truck: 1, truck_speed: 0,
    },
    activeBuffs: [],
    notifications: [],
  };

  Object.assign(state, freshState);
  return { newPoints, totalPoints: points };
}

// Buff system
export function activateBuff(state, buffKey) {
  const buffData = BUFF_DATA[buffKey];
  if (!buffData) return false;
  if (state.gold < buffData.cost) return false;

  addGold(state, -buffData.cost);

  const existing = state.activeBuffs.find(b => b.key === buffKey);
  if (existing) {
    existing.expiresAt = Date.now() + buffData.duration * 1000;
  } else {
    state.activeBuffs.push({
      key: buffKey,
      name: buffData.name,
      icon: buffData.icon,
      effect: buffData.effect,
      value: buffData.value,
      expiresAt: Date.now() + buffData.duration * 1000,
    });
  }
  return true;
}

export function updateBuffs(state) {
  const now = Date.now();
  state.activeBuffs = state.activeBuffs.filter(b => b.expiresAt > now);
}

// Notification system
let notifId = 0;
export function notify(state, message, type = 'info') {
  state.notifications.push({
    id: ++notifId,
    message,
    type,
    time: Date.now(),
  });
  // Keep only last 20
  if (state.notifications.length > 20) {
    state.notifications = state.notifications.slice(-20);
  }
}

export function getNotifications(state) {
  const cutoff = Date.now() - 5000;
  return state.notifications.filter(n => n.time > cutoff);
}
