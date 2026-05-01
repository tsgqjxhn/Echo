// Main entry point - game loop and initialization
import { createInitialState, loadGame, saveGame, deleteSave, hasGold, addGold } from './state.js';
import { calculateOfflineEarnings, applyOfflineEarnings, doPrestige as performPrestige, updateBuffs, activateBuff as doActivateBuff, notify } from './systems.js';
import { updateFarm, plantCrop, harvestCrop, harvestAll, plantAllBest, sellRawCrop, buyFarmPlot, renderFarm } from './farm.js';
import { updateFactory, startProduction, collectProduct, collectAll as collectAllFactory, sellFactoryProduct, buyFactoryMachine, renderFactory } from './factory.js';
import { updateShop, stockShelf, autoStockShelves, buyShopShelf, renderShop } from './shop.js';
import { updateLogistics, createShipment, addAutoRoute, removeAutoRoute, buyTruck, renderLogistics } from './logistics.js';
import {
  renderHeader, renderTabBar, renderUpgrades, renderBuffs, renderOverview,
  renderNotifications, renderSettingsModal, renderOfflineModal,
} from './ui.js';
import { getUpgradeCost } from './data.js';

const TICK_RATE = 100; // ms per tick
const SAVE_INTERVAL = 30000; // auto-save every 30s
const UI_UPDATE_INTERVAL = 250; // update UI every 250ms

class Game {
  constructor() {
    this.state = null;
    this.lastTick = 0;
    this.lastSave = 0;
    this.lastUIUpdate = 0;
    this.modalHTML = '';
    this.offlineEarnings = null;
    this.running = false;
  }

  init() {
    // Try to load saved game
    const saved = loadGame();
    if (saved) {
      this.state = saved;
      // Calculate offline earnings
      const earnings = calculateOfflineEarnings(this.state);
      if (earnings.duration > 60 && (earnings.gold > 0 || earnings.xp > 0)) {
        this.offlineEarnings = earnings;
      }
    } else {
      this.state = createInitialState();
    }

    this.running = true;
    this.lastTick = performance.now();
    this.lastSave = Date.now();

    // Initial render
    this.render();

    // Start game loop
    this.loop();

    // Expose to window for onclick handlers
    window.game = this;
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Cap delta time to prevent huge jumps
    const cappedDt = Math.min(dt, 0.5);

    // Update game state
    this.update(cappedDt);

    // Auto-save
    if (Date.now() - this.lastSave >= SAVE_INTERVAL) {
      saveGame(this.state);
      this.lastSave = Date.now();
    }

    // Update UI at lower rate
    if (now - this.lastUIUpdate >= UI_UPDATE_INTERVAL) {
      this.render();
      this.lastUIUpdate = now;
    }
  }

  update(dt) {
    this.state.gameTime += dt;
    updateFarm(this.state, dt);
    if (this.state.factoryUnlocked) updateFactory(this.state, dt);
    if (this.state.shopUnlocked) updateShop(this.state, dt);
    if (this.state.logisticsUnlocked) updateLogistics(this.state, dt);
    updateBuffs(this.state);
  }

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    const header = renderHeader(this.state);
    const tabBar = renderTabBar(this.state);

    let content = '';
    switch (this.state.currentTab) {
      case 'farm': content = renderFarm(this.state); break;
      case 'factory': content = renderFactory(this.state); break;
      case 'shop': content = renderShop(this.state); break;
      case 'logistics': content = renderLogistics(this.state); break;
      case 'upgrades': content = renderUpgrades(this.state); break;
      case 'buffs': content = renderBuffs(this.state); break;
      case 'overview': content = renderOverview(this.state); break;
      default: content = renderFarm(this.state);
    }

    const notifs = renderNotifications(this.state);
    const modal = this.modalHTML;

    app.innerHTML = `
      ${header}
      ${tabBar}
      <div class="main-content">${content}</div>
      <div class="notification-area">${notifs}</div>
      ${modal}
    `;
  }

  // Actions
  switchTab(tab) {
    this.state.currentTab = tab;
    this.render();
  }

  // Farm
  plantCrop(plotId, cropKey) {
    if (plantCrop(this.state, plotId, cropKey)) this.render();
  }

  harvestCrop(plotId) {
    if (harvestCrop(this.state, plotId)) this.render();
  }

  harvestAll() {
    harvestAll(this.state);
    this.render();
  }

  plantAllBest() {
    const r = plantAllBest(this.state);
    if (r.reason === 'no-empty') {
      notify(this.state, '没有空闲地块可种植', 'info');
    } else if (r.reason === 'no-unlocked') {
      notify(this.state, '当前等级没有可种植的作物', 'warning');
    } else if (r.reason === 'not-enough-for-one') {
      notify(this.state, `金币不足！${r.cropIcon} ${r.cropName} 单粒种子需要 ${r.seedCost}G`, 'warning');
    }
    this.render();
  }

  sellRawCrop(cropKey) {
    if (sellRawCrop(this.state, cropKey)) this.render();
  }

  buyFarmPlot() {
    if (buyFarmPlot(this.state)) this.render();
  }

  // Factory
  buildFactory() {
    if (hasGold(this.state, 1000)) {
      addGold(this.state, -1000);
      this.state.factoryUnlocked = true;
      notify(this.state, '加工厂建造完成！', 'success');
      this.render();
    }
  }

  startProduction(machineId, recipeKey) {
    if (startProduction(this.state, machineId, recipeKey)) this.render();
  }

  collectProduct(machineId) {
    if (collectProduct(this.state, machineId)) this.render();
  }

  collectAllFactory() {
    collectAllFactory(this.state);
    this.render();
  }

  sellFactoryProduct(productKey) {
    if (sellFactoryProduct(this.state, productKey)) this.render();
  }

  buyFactoryMachine() {
    if (buyFactoryMachine(this.state)) this.render();
  }

  // Shop
  buildShop() {
    if (hasGold(this.state, 3000)) {
      addGold(this.state, -3000);
      this.state.shopUnlocked = true;
      notify(this.state, '商店建造完成！', 'success');
      this.render();
    }
  }

  stockShelf(shelfId, productKey) {
    if (stockShelf(this.state, shelfId, productKey)) this.render();
  }

  autoStockShelves() {
    autoStockShelves(this.state);
    this.render();
  }

  buyShopShelf() {
    if (buyShopShelf(this.state)) this.render();
  }

  // Logistics
  buildLogistics() {
    if (hasGold(this.state, 2000)) {
      addGold(this.state, -2000);
      this.state.logisticsUnlocked = true;
      notify(this.state, '物流中心建造完成！', 'success');
      this.render();
    }
  }

  manualShipment() {
    const routeEl = document.getElementById('ship-route');
    const productEl = document.getElementById('ship-product');
    const qtyEl = document.getElementById('ship-qty');
    if (!routeEl || !productEl || !qtyEl) return;

    const route = routeEl.value;
    const product = productEl.value;
    const qty = parseInt(qtyEl.value) || 1;

    if (createShipment(this.state, route, product, qty)) this.render();
  }

  addAutoRouteFromUI() {
    const routeEl = document.getElementById('auto-route-type');
    const productEl = document.getElementById('auto-route-product');
    const qtyEl = document.getElementById('auto-route-qty');
    if (!routeEl || !productEl || !qtyEl) return;

    const routeType = routeEl.value;
    const product = productEl.value;
    const qty = parseInt(qtyEl.value) || 5;

    if (product) {
      addAutoRoute(this.state, routeType, product, qty, Math.max(1, qty - 2));
      this.render();
    }
  }

  removeAutoRoute(id) {
    removeAutoRoute(this.state, id);
    this.render();
  }

  buyTruck() {
    if (buyTruck(this.state)) this.render();
  }

  // Upgrades
  buyUpgrade(key) {
    const current = this.state.upgrades[key] || 0;
    const cost = getUpgradeCost(key, current);
    if (hasGold(this.state, cost)) {
      addGold(this.state, -cost);
      this.state.upgrades[key]++;
      notify(this.state, `升级了 ${key.replace(/_/g, ' ')}！`, 'success');
      this.render();
    }
  }

  // Buffs
  activateBuff(key) {
    if (doActivateBuff(this.state, key)) this.render();
  }

  // Prestige
  doPrestige() {
    const result = performPrestige(this.state);
    if (result) {
      this.modalHTML = `
        <div class="modal-overlay">
          <div class="modal">
            <h3>转生成功！</h3>
            <p>获得 ${result.newPoints} 转生点数</p>
            <p>当前总点数: ${result.totalPoints}</p>
            <button class="btn-action btn-large" onclick="window.game.closeModal()">继续</button>
          </div>
        </div>
      `;
      this.render();
    }
  }

  // Save/Load
  save() {
    if (saveGame(this.state)) {
      notify(this.state, '游戏已保存！', 'success');
      this.render();
    }
  }

  showSettings() {
    this.modalHTML = renderSettingsModal(this.state);
    this.render();
  }

  closeModal() {
    this.modalHTML = '';
    this.render();
  }

  hardReset() {
    if (confirm('确定要重置所有进度吗？此操作不可撤销！')) {
      if (confirm('真的确定吗？所有数据将永久删除！')) {
        deleteSave();
        this.state = createInitialState();
        this.modalHTML = '';
        this.render();
      }
    }
  }

  dismissOffline() {
    if (this.offlineEarnings) {
      applyOfflineEarnings(this.state, this.offlineEarnings);
      this.offlineEarnings = null;
    }
    this.modalHTML = '';
    this.render();
  }
}

// Initialize
const game = new Game();
document.addEventListener('DOMContentLoaded', () => {
  game.init();
  // Show offline earnings modal if any
  if (game.offlineEarnings) {
    game.modalHTML = renderOfflineModal(game.offlineEarnings);
    game.render();
  }
});
