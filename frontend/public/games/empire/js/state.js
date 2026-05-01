// State management, save/load
import { LEVEL_XP, CROP_DATA } from './data.js';

const SAVE_KEY = 'vertical_farm_game_save';

export function createInitialState() {
  return {
    gold: 500,
    xp: 0,
    level: 1,
    totalEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    gameTime: 0,
    lastSaveTime: Date.now(),
    currentTab: 'farm',

    // Modules unlocked
    factoryUnlocked: false,
    shopUnlocked: false,
    logisticsUnlocked: false,

    // Farm state
    farm: {
      plots: [
        { id: 0, crop: null, plantedAt: 0, growthProgress: 0 },
        { id: 1, crop: null, plantedAt: 0, growthProgress: 0 },
        { id: 2, crop: null, plantedAt: 0, growthProgress: 0 },
      ],
    },

    // Factory state
    factory: {
      machines: [
        { id: 0, recipe: null, startTime: 0, progress: 0 },
      ],
    },

    // Shop state
    shop: {
      shelves: [
        { id: 0, product: null, quantity: 0, maxQuantity: 10 },
        { id: 1, product: null, quantity: 0, maxQuantity: 10 },
        { id: 2, product: null, quantity: 0, maxQuantity: 10 },
      ],
      customers: [],
      customerTimer: 0,
      customerInterval: 5, // seconds between customers
      totalCustomersServed: 0,
    },

    // Inventory
    inventory: {},

    // Logistics
    logistics: {
      trucks: [
        { id: 0, busy: false, route: null, progress: 0, startTime: 0 },
      ],
      routes: [],
      autoRoutes: [],
    },

    // Upgrades
    upgrades: {
      farm_plot: 3,    // starts with 3 plots
      irrigation: 0,
      fertilizer: 0,
      greenhouse: 0,
      tractor: 0,
      factory_machine: 1,
      speed_boost: 0,
      automation: 0,
      shop_shelf: 3,
      advertising: 0,
      decor: 0,
      truck: 1,
      truck_speed: 0,
    },

    // Buffs
    activeBuffs: [],

    // Stats
    stats: {
      totalHarvested: {},
      totalProduced: {},
      totalSold: {},
      totalRevenue: 0,
      totalSpent: 0,
    },

    // Settings
    notifications: [],
  };
}

export function getLevel(state) {
  return state.level;
}

export function getXPProgress(state) {
  const currentReq = LEVEL_XP[state.level] || LEVEL_XP[LEVEL_XP.length - 1];
  const prevReq = state.level > 0 ? (LEVEL_XP[state.level - 1] || 0) : 0;
  return (state.xp - prevReq) / (currentReq - prevReq);
}

export function addXP(state, amount) {
  state.xp += amount;
  while (state.level < 50 && state.xp >= LEVEL_XP[state.level]) {
    state.level++;
  }
}

export function addGold(state, amount) {
  state.gold += amount;
  if (amount > 0) {
    state.totalEarnings += amount;
    state.stats.totalRevenue += amount;
  } else {
    state.stats.totalSpent += Math.abs(amount);
  }
}

export function hasGold(state, amount) {
  return state.gold >= amount;
}

export function getInventory(state, item) {
  return state.inventory[item] || 0;
}

export function addInventory(state, item, amount) {
  if (!state.inventory[item]) state.inventory[item] = 0;
  state.inventory[item] += amount;
  if (state.inventory[item] <= 0) delete state.inventory[item];
}

export function hasInventory(state, item, amount) {
  return (state.inventory[item] || 0) >= amount;
}

export function saveGame(state, options = {}) {
  const force = options === true || options.force === true;
  if (!force) return true;

  state.lastSaveTime = Date.now();
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    return migrateState(state);
  } catch {
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

function migrateState(loaded) {
  const fresh = createInitialState();
  // Merge loaded onto fresh, preserving defaults for any new fields
  const result = { ...fresh, ...loaded };
  result.farm = { ...fresh.farm, ...loaded.farm };
  result.factory = { ...fresh.factory, ...loaded.factory };
  result.shop = { ...fresh.shop, ...loaded.shop };
  result.logistics = { ...fresh.logistics, ...loaded.logistics };
  result.upgrades = { ...fresh.upgrades, ...loaded.upgrades };
  result.stats = { ...fresh.stats, ...loaded.stats };
  result.inventory = { ...fresh.inventory, ...loaded.inventory };
  // Ensure arrays have proper length
  ensurePlots(result);
  ensureMachines(result);
  ensureShelves(result);
  ensureTrucks(result);
  return result;
}

function ensurePlots(state) {
  const target = state.upgrades.farm_plot;
  while (state.farm.plots.length < target) {
    state.farm.plots.push({
      id: state.farm.plots.length,
      crop: null,
      plantedAt: 0,
      growthProgress: 0,
    });
  }
}

function ensureMachines(state) {
  const target = state.upgrades.factory_machine;
  while (state.factory.machines.length < target) {
    state.factory.machines.push({
      id: state.factory.machines.length,
      recipe: null,
      startTime: 0,
      progress: 0,
    });
  }
}

function ensureShelves(state) {
  const target = state.upgrades.shop_shelf;
  while (state.shop.shelves.length < target) {
    state.shop.shelves.push({
      id: state.shop.shelves.length,
      product: null,
      quantity: 0,
      maxQuantity: 10 + (state.upgrades.decor || 0) * 2,
    });
  }
}

function ensureTrucks(state) {
  const target = state.upgrades.truck;
  while (state.logistics.trucks.length < target) {
    state.logistics.trucks.push({
      id: state.logistics.trucks.length,
      busy: false,
      route: null,
      progress: 0,
      startTime: 0,
    });
  }
}

export { ensurePlots, ensureMachines, ensureShelves, ensureTrucks };
