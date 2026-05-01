// Farm module: planting, growing, harvesting
import { CROP_DATA, getGrowthSpeedMultiplier, getUpgradeCost } from './data.js';
import { addGold, addXP, addInventory, hasGold, ensurePlots } from './state.js';
import { notify } from './systems.js';

export function plantCrop(state, plotId, cropKey) {
  const plot = state.farm.plots.find(p => p.id === plotId);
  if (!plot) return false;
  if (plot.crop) return false;

  const cropData = CROP_DATA[cropKey];
  if (!cropData) return false;
  if (state.level < cropData.unlockLevel) return false;
  if (!hasGold(state, cropData.seedCost)) return false;

  addGold(state, -cropData.seedCost);
  plot.crop = cropKey;
  plot.plantedAt = state.gameTime;
  plot.growthProgress = 0;
  return true;
}

export function harvestCrop(state, plotId) {
  const plot = state.farm.plots.find(p => p.id === plotId);
  if (!plot || !plot.crop) return false;
  if (plot.growthProgress < 1) return false;

  const cropKey = plot.crop;
  const cropData = CROP_DATA[cropKey];
  const yieldAmount = 1 + Math.floor(Math.random() * 2); // 1-2 units

  addInventory(state, cropKey, yieldAmount);
  addXP(state, Math.ceil(cropData.rawSell * 0.5));
  state.stats.totalHarvested[cropKey] = (state.stats.totalHarvested[cropKey] || 0) + yieldAmount;

  notify(state, `收获了 ${yieldAmount}x ${cropData.icon} ${cropData.name}`, 'success');

  plot.crop = null;
  plot.plantedAt = 0;
  plot.growthProgress = 0;
  return true;
}

export function harvestAll(state) {
  let harvested = 0;
  for (const plot of state.farm.plots) {
    if (plot.crop && plot.growthProgress >= 1) {
      if (harvestCrop(state, plot.id)) harvested++;
    }
  }
  return harvested;
}

/**
 * One-click plant: pick the most expensive crop the player has unlocked,
 * plant on every empty plot. If gold runs out partway through, leave the
 * remaining plots empty and return a summary so the UI can notify the user.
 */
export function plantAllBest(state) {
  const empties = state.farm.plots.filter(p => !p.crop);
  if (empties.length === 0) {
    return { planted: 0, skipped: 0, cropKey: null, reason: 'no-empty' };
  }

  // Available = unlocked. Sort by seedCost desc → most expensive first.
  const unlocked = Object.entries(CROP_DATA)
    .filter(([_, d]) => state.level >= d.unlockLevel)
    .sort(([, a], [, b]) => b.seedCost - a.seedCost);

  if (unlocked.length === 0) {
    return { planted: 0, skipped: empties.length, cropKey: null, reason: 'no-unlocked' };
  }

  const [cropKey, cropData] = unlocked[0];

  if (state.gold < cropData.seedCost) {
    return {
      planted: 0,
      skipped: empties.length,
      cropKey,
      cropName: cropData.name,
      cropIcon: cropData.icon,
      seedCost: cropData.seedCost,
      reason: 'not-enough-for-one',
    };
  }

  let planted = 0;
  for (const plot of empties) {
    if (state.gold < cropData.seedCost) break;
    if (plantCrop(state, plot.id, cropKey)) planted++;
  }
  const skipped = empties.length - planted;

  if (planted > 0) {
    if (skipped > 0) {
      notify(state, `已种植 ${planted} 块 ${cropData.icon} ${cropData.name}，金币不足，剩余 ${skipped} 块空着`, 'warning');
    } else {
      notify(state, `全部种上了 ${cropData.icon} ${cropData.name}（共 ${planted} 块）`, 'success');
    }
  }

  return { planted, skipped, cropKey, cropName: cropData.name, cropIcon: cropData.icon, seedCost: cropData.seedCost, reason: skipped > 0 ? 'partial' : 'ok' };
}

export function sellRawCrop(state, cropKey) {
  const cropData = CROP_DATA[cropKey];
  if (!cropData) return false;
  const qty = state.inventory[cropKey] || 0;
  if (qty <= 0) return false;

  const revenue = qty * cropData.rawSell;
  addGold(state, revenue);
  addXP(state, Math.ceil(revenue * 0.2));
  state.inventory[cropKey] = 0;
  notify(state, `售出 ${qty}x ${cropData.icon} ${cropData.name}，获得 ${revenue}G`, 'gold');
  return true;
}

export function updateFarm(state, dt) {
  const growMult = getGrowthSpeedMultiplier(state);
  for (const plot of state.farm.plots) {
    if (!plot.crop) continue;
    const cropData = CROP_DATA[plot.crop];
    if (!cropData) continue;
    const effectiveGrowTime = cropData.growTime * growMult;
    plot.growthProgress = Math.min(1, plot.growthProgress + (dt / effectiveGrowTime));
  }
}

export function getAvailableCrops(state) {
  return Object.entries(CROP_DATA)
    .filter(([_, data]) => state.level >= data.unlockLevel)
    .map(([key, data]) => ({ key, ...data }));
}

export function buyFarmPlot(state) {
  const current = state.upgrades.farm_plot;
  const cost = getUpgradeCost('farm_plot', current);
  if (!hasGold(state, cost)) return false;
  addGold(state, -cost);
  state.upgrades.farm_plot++;
  ensurePlots(state);
  notify(state, `购买了新农田地块`, 'success');
  return true;
}

export function renderFarm(state) {
  const availableCrops = getAvailableCrops(state);
  const growMult = getGrowthSpeedMultiplier(state);

  let plotsHTML = state.farm.plots.map(plot => {
    if (!plot.crop) {
      // Empty plot - show planting options
      const cropOptions = availableCrops.map(c =>
        `<button class="btn-plant" onclick="window.game.plantCrop(${plot.id}, '${c.key}')"
          ${state.gold < c.seedCost ? 'disabled' : ''}
          title="种植 ${c.name} - ${c.seedCost}G">
          ${c.icon}<span class="cost">${c.seedCost}G</span>
        </button>`
      ).join('');
      return `<div class="plot empty">
        <div class="plot-label">空地 #${plot.id + 1}</div>
        <div class="plant-options">${cropOptions}</div>
      </div>`;
    }

    const cropData = CROP_DATA[plot.crop];
    const progress = Math.min(1, plot.growthProgress);
    const pct = Math.floor(progress * 100);
    const stageIndex = Math.min(4, Math.floor(progress * 5));
    const stages = ['🌱', '🌿', '🪴', cropData.icon, cropData.icon];
    const stageIcon = stages[stageIndex];
    const canHarvest = progress >= 1;

    return `<div class="plot growing ${canHarvest ? 'ready' : ''}">
      <div class="plot-crop">${stageIcon}</div>
      <div class="plot-name">${cropData.name}</div>
      <div class="progress-bar">
        <div class="progress-fill ${canHarvest ? 'complete' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="plot-timer">${canHarvest ? '可收获!' : Math.ceil((1 - progress) * cropData.growTime * growMult) + '秒'}</div>
      ${canHarvest ? `<button class="btn-harvest" onclick="window.game.harvestCrop(${plot.id})">收获 ${cropData.icon}</button>` : ''}
    </div>`;
  }).join('');

  // Harvest all button
  const readyCount = state.farm.plots.filter(p => p.crop && p.growthProgress >= 1).length;
  const harvestAllBtn = readyCount > 1
    ? `<button class="btn-action" onclick="window.game.harvestAll()">全部收获 (${readyCount})</button>`
    : '';

  // Plant all best (most expensive unlocked crop)
  const emptyCount = state.farm.plots.filter(p => !p.crop).length;
  const bestCrop = availableCrops.slice().sort((a, b) => b.seedCost - a.seedCost)[0];
  const plantAllBtn = emptyCount > 0 && bestCrop
    ? `<button class="btn-action" onclick="window.game.plantAllBest()" title="一键种植 ${bestCrop.name}（${bestCrop.seedCost}G/粒），金币不足则部分种植">
        一键种植 ${bestCrop.icon} (${emptyCount})
      </button>`
    : '';

  // Inventory section
  const farmInventory = Object.entries(state.inventory)
    .filter(([key]) => CROP_DATA[key])
    .map(([key, qty]) => {
      const data = CROP_DATA[key];
      return `<div class="inv-item">
        <span class="inv-icon">${data.icon}</span>
        <span class="inv-name">${data.name}</span>
        <span class="inv-qty">x${qty}</span>
        <button class="btn-sell" onclick="window.game.sellRawCrop('${key}')" ${qty <= 0 ? 'disabled' : ''}>
          出售 ${data.rawSell}G/个
        </button>
      </div>`;
    }).join('');

  // Buy plot button
  const plotCost = getUpgradeCost('farm_plot', state.upgrades.farm_plot);
  const buyPlotBtn = state.upgrades.farm_plot < 20
    ? `<button class="btn-action" onclick="window.game.buyFarmPlot()" ${state.gold < plotCost ? 'disabled' : ''}>
        购买农田 (${plotCost}G)
      </button>`
    : '';

  return `
    <div class="module-header">
      <h2>农场</h2>
      <p class="module-desc">种植作物，为工厂提供原材料</p>
    </div>
    <div class="farm-controls">
      ${plantAllBtn}
      ${harvestAllBtn}
      ${buyPlotBtn}
    </div>
    <div class="plots-grid">${plotsHTML}</div>
    <div class="section-title">仓库 - 农产品</div>
    <div class="inventory-list">
      ${farmInventory || '<div class="empty-text">暂无农产品，请先种植作物</div>'}
    </div>
  `;
}
