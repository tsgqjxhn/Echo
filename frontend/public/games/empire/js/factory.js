// Factory module: processing crops into products
import { CROP_DATA, RECIPE_DATA, getProductionSpeedMultiplier, getUpgradeCost } from './data.js';
import { addGold, addXP, addInventory, hasGold, hasInventory, ensureMachines } from './state.js';
import { notify } from './systems.js';

export function startProduction(state, machineId, recipeKey) {
  if (!state.factoryUnlocked) return false;
  const machine = state.factory.machines.find(m => m.id === machineId);
  if (!machine) return false;
  if (machine.recipe) return false;

  const recipe = RECIPE_DATA[recipeKey];
  if (!recipe) return false;
  if (state.level < recipe.unlockLevel) return false;

  // Check inputs
  for (const [input, qty] of Object.entries(recipe.inputs)) {
    if (!hasInventory(state, input, qty)) return false;
  }

  // Consume inputs
  for (const [input, qty] of Object.entries(recipe.inputs)) {
    addInventory(state, input, -qty);
  }

  machine.recipe = recipeKey;
  machine.startTime = state.gameTime;
  machine.progress = 0;
  return true;
}

export function collectProduct(state, machineId) {
  const machine = state.factory.machines.find(m => m.id === machineId);
  if (!machine || !machine.recipe) return false;
  if (machine.progress < 1) return false;

  const recipe = RECIPE_DATA[machine.recipe];
  const qty = 1;

  addInventory(state, machine.recipe, qty);
  addXP(state, Math.ceil(recipe.factorySell * 0.3));
  state.stats.totalProduced[machine.recipe] = (state.stats.totalProduced[machine.recipe] || 0) + qty;

  notify(state, `生产了 ${recipe.icon} ${recipe.name}`, 'success');

  machine.recipe = null;
  machine.startTime = 0;
  machine.progress = 0;
  return true;
}

export function collectAll(state) {
  let collected = 0;
  for (const machine of state.factory.machines) {
    if (machine.recipe && machine.progress >= 1) {
      if (collectProduct(state, machine.id)) collected++;
    }
  }
  return collected;
}

export function updateFactory(state, dt) {
  if (!state.factoryUnlocked) return;
  const prodMult = getProductionSpeedMultiplier(state);
  for (const machine of state.factory.machines) {
    if (!machine.recipe) continue;
    const recipe = RECIPE_DATA[machine.recipe];
    if (!recipe) continue;
    const effectiveTime = recipe.processTime * prodMult;
    machine.progress = Math.min(1, machine.progress + (dt / effectiveTime));
  }
}

export function getAvailableRecipes(state) {
  return Object.entries(RECIPE_DATA)
    .filter(([_, data]) => state.level >= data.unlockLevel)
    .map(([key, data]) => ({ key, ...data }));
}

export function canCraft(state, recipeKey) {
  const recipe = RECIPE_DATA[recipeKey];
  if (!recipe) return false;
  for (const [input, qty] of Object.entries(recipe.inputs)) {
    if (!hasInventory(state, input, qty)) return false;
  }
  return true;
}

export function sellFactoryProduct(state, productKey) {
  const recipe = RECIPE_DATA[productKey];
  if (!recipe) return false;
  const qty = state.inventory[productKey] || 0;
  if (qty <= 0) return false;

  const revenue = qty * recipe.factorySell;
  addGold(state, revenue);
  addXP(state, Math.ceil(revenue * 0.2));
  state.inventory[productKey] = 0;
  notify(state, `售出 ${qty}x ${recipe.icon} ${recipe.name}，获得 ${revenue}G`, 'gold');
  return true;
}

export function buyFactoryMachine(state) {
  const current = state.upgrades.factory_machine;
  const cost = getUpgradeCost('factory_machine', current);
  if (!hasGold(state, cost)) return false;
  addGold(state, -cost);
  state.upgrades.factory_machine++;
  ensureMachines(state);
  notify(state, '购买了新加工机器', 'success');
  return true;
}

export function renderFactory(state) {
  if (!state.factoryUnlocked) {
    const cost = 1000;
    return `
      <div class="module-header">
        <h2>加工厂</h2>
        <p class="module-desc">将农产品加工为高价值商品</p>
      </div>
      <div class="locked-module">
        <div class="lock-icon">🏭</div>
        <p>加工厂尚未建造</p>
        <button class="btn-action btn-large" onclick="window.game.buildFactory()"
          ${state.gold < cost ? 'disabled' : ''}>
          建造加工厂 (${cost}G)
        </button>
      </div>
    `;
  }

  const availableRecipes = getAvailableRecipes(state);
  const prodMult = getProductionSpeedMultiplier(state);

  // Machines
  let machinesHTML = state.factory.machines.map(machine => {
    if (!machine.recipe) {
      // Idle machine - show recipe selection
      const recipeOptions = availableRecipes.map(r => {
        const canMake = canCraft(state, r.key);
        const inputText = Object.entries(r.inputs)
          .map(([k, v]) => {
            const rd = RECIPE_DATA[k];
            const icon = rd ? rd.icon : (CROP_DATA?.[k]?.icon || '📦');
            return `${icon}${v}`;
          }).join(' + ');
        return `<button class="btn-recipe ${canMake ? '' : 'disabled'}"
          onclick="window.game.startProduction(${machine.id}, '${r.key}')"
          ${canMake ? '' : 'disabled'}
          title="${r.name}: ${Object.entries(r.inputs).map(([k,v]) => `${v}x${k}`).join(', ')} → ${r.processTime}s">
          <span class="recipe-icon">${r.icon}</span>
          <span class="recipe-name">${r.name}</span>
          <span class="recipe-inputs">${inputText}</span>
          <span class="recipe-time">${Math.ceil(r.processTime * prodMult)}s</span>
        </button>`;
      }).join('');

      return `<div class="machine idle">
        <div class="machine-label">机器 #${machine.id + 1} - 空闲</div>
        <div class="recipe-options">${recipeOptions}</div>
      </div>`;
    }

    const recipe = RECIPE_DATA[machine.recipe];
    const progress = Math.min(1, machine.progress);
    const pct = Math.floor(progress * 100);
    const canCollect = progress >= 1;

    return `<div class="machine working ${canCollect ? 'ready' : ''}">
      <div class="machine-header">
        <span class="machine-label">机器 #${machine.id + 1}</span>
        <span class="machine-product">${recipe.icon} ${recipe.name}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${canCollect ? 'complete' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="machine-timer">${canCollect ? '完成!' : Math.ceil((1 - progress) * recipe.processTime * prodMult) + '秒'}</div>
      ${canCollect ? `<button class="btn-collect" onclick="window.game.collectProduct(${machine.id})">收取 ${recipe.icon}</button>` : ''}
    </div>`;
  }).join('');

  // Collect all button
  const readyMachines = state.factory.machines.filter(m => m.recipe && m.progress >= 1).length;
  const collectAllBtn = readyMachines > 1
    ? `<button class="btn-action" onclick="window.game.collectAllFactory()">全部收取 (${readyMachines})</button>`
    : '';

  // Buy machine
  const machineCost = getUpgradeCost('factory_machine', state.upgrades.factory_machine);
  const buyMachineBtn = state.upgrades.factory_machine < 10
    ? `<button class="btn-action" onclick="window.game.buyFactoryMachine()" ${state.gold < machineCost ? 'disabled' : ''}>
        购买机器 (${machineCost}G)
      </button>`
    : '';

  // Factory products inventory
  const factoryInv = Object.entries(state.inventory)
    .filter(([key]) => RECIPE_DATA[key])
    .map(([key, qty]) => {
      const data = RECIPE_DATA[key];
      return `<div class="inv-item">
        <span class="inv-icon">${data.icon}</span>
        <span class="inv-name">${data.name}</span>
        <span class="inv-qty">x${qty}</span>
        <button class="btn-sell" onclick="window.game.sellFactoryProduct('${key}')" ${qty <= 0 ? 'disabled' : ''}>
          出售 ${data.factorySell}G/个
        </button>
      </div>`;
    }).join('');

  return `
    <div class="module-header">
      <h2>加工厂</h2>
      <p class="module-desc">将原材料加工为高价值商品</p>
    </div>
    <div class="farm-controls">
      ${collectAllBtn}
      ${buyMachineBtn}
    </div>
    <div class="machines-grid">${machinesHTML}</div>
    <div class="section-title">仓库 - 加工品</div>
    <div class="inventory-list">
      ${factoryInv || '<div class="empty-text">暂无加工品，请选择配方开始生产</div>'}
    </div>
  `;
}
