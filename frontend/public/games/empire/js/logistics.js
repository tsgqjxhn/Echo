// Logistics module: transport between farm, factory, shop
import { getUpgradeCost } from './data.js';
import { addInventory, hasGold, ensureTrucks } from './state.js';
import { notify } from './systems.js';

const TRANSPORT_TIME_BASE = 10; // seconds base transport time
const ROUTE_TYPES = [
  { id: 'farm_to_factory', name: '农场 → 工厂', from: 'farm', to: 'factory', icon: '🚛' },
  { id: 'factory_to_shop', name: '工厂 → 商店', from: 'factory', to: 'shop', icon: '🚚' },
];

export function getTransportTime(state) {
  const speedLevel = state.upgrades.truck_speed || 0;
  const base = TRANSPORT_TIME_BASE;
  return Math.max(2, base * (1 - 0.10 * speedLevel));
}

export function createShipment(state, routeType, productKey, quantity) {
  if (!state.logisticsUnlocked) return false;

  const route = ROUTE_TYPES.find(r => r.id === routeType);
  if (!route) return false;

  // Check available truck
  const truck = state.logistics.trucks.find(t => !t.busy);
  if (!truck) {
    notify(state, '没有空闲卡车！', 'warning');
    return false;
  }

  // Check inventory
  const available = state.inventory[productKey] || 0;
  if (available < quantity) return false;

  // Consume from inventory
  addInventory(state, productKey, -quantity);

  truck.busy = true;
  truck.route = { type: routeType, product: productKey, quantity };
  truck.progress = 0;
  truck.startTime = state.gameTime;

  return true;
}

export function updateLogistics(state, dt) {
  if (!state.logisticsUnlocked) return;

  const transportTime = getTransportTime(state);

  for (const truck of state.logistics.trucks) {
    if (!truck.busy || !truck.route) continue;

    truck.progress += dt / transportTime;

    if (truck.progress >= 1) {
      // Delivery complete
      const { product, quantity, type } = truck.route;
      addInventory(state, product, quantity);

      const route = ROUTE_TYPES.find(r => r.id === type);
      notify(state, `${route?.icon || '🚛'} 卡车送达 ${quantity}x ${product}`, 'success');

      truck.busy = false;
      truck.route = null;
      truck.progress = 0;
      truck.startTime = 0;
    }
  }

  // Process auto-routes
  processAutoRoutes(state);
}

function processAutoRoutes(state) {
  if (!state.logistics.autoRoutes) return;

  for (const autoRoute of state.logistics.autoRoutes) {
    if (!autoRoute.active) continue;

    const freeTruck = state.logistics.trucks.find(t => !t.busy);
    if (!freeTruck) continue;

    const qty = state.inventory[autoRoute.product] || 0;
    if (qty < autoRoute.minQuantity) continue;

    const sendQty = Math.min(qty, autoRoute.quantity);
    createShipment(state, autoRoute.routeType, autoRoute.product, sendQty);
  }
}

export function addAutoRoute(state, routeType, product, quantity, minQuantity) {
  const route = {
    id: Date.now(),
    routeType,
    product,
    quantity: quantity || 5,
    minQuantity: minQuantity || 3,
    active: true,
  };
  if (!state.logistics.autoRoutes) state.logistics.autoRoutes = [];
  state.logistics.autoRoutes.push(route);
  notify(state, '添加了自动运输路线', 'success');
  return true;
}

export function removeAutoRoute(state, routeId) {
  if (!state.logistics.autoRoutes) return;
  state.logistics.autoRoutes = state.logistics.autoRoutes.filter(r => r.id !== routeId);
}

export function buyTruck(state) {
  const current = state.upgrades.truck;
  const cost = getUpgradeCost('truck', current);
  if (!hasGold(state, cost)) return false;
  addGold(state, -cost);
  state.upgrades.truck++;
  ensureTrucks(state);
  notify(state, '购买了新卡车', 'success');
  return true;
}

export function renderLogistics(state) {
  if (!state.logisticsUnlocked) {
    const cost = 2000;
    return `
      <div class="module-header">
        <h2>物流中心</h2>
        <p class="module-desc">自动化运输，连接全产业链</p>
      </div>
      <div class="locked-module">
        <div class="lock-icon">🚛</div>
        <p>物流中心尚未建造</p>
        <button class="btn-action btn-large" onclick="window.game.buildLogistics()"
          ${state.gold < cost ? 'disabled' : ''}>
          建造物流中心 (${cost}G)
        </button>
      </div>
    `;
  }

  const transportTime = getTransportTime(state);

  // Trucks
  const trucksHTML = state.logistics.trucks.map(truck => {
    if (!truck.busy) {
      return `<div class="truck idle">
        <span class="truck-icon">🚛</span>
        <span class="truck-status">空闲</span>
      </div>`;
    }
    const route = ROUTE_TYPES.find(r => r.id === truck.route?.type);
    const pct = Math.floor(truck.progress * 100);
    return `<div class="truck busy">
      <span class="truck-icon">${route?.icon || '🚛'}</span>
      <span class="truck-route">${route?.name || '运输中'}</span>
      <span class="truck-cargo">${truck.route.product} x${truck.route.quantity}</span>
      <div class="progress-bar small">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');

  // Manual shipment form
  const inventoryItems = Object.entries(state.inventory)
    .filter(([_, qty]) => qty > 0)
    .map(([key, qty]) => `<option value="${key}">${key} (x${qty})</option>`)
    .join('');

  const routeOptions = ROUTE_TYPES.map(r =>
    `<option value="${r.id}">${r.icon} ${r.name}</option>`
  ).join('');

  // Auto routes
  const autoRoutesHTML = (state.logistics.autoRoutes || []).map(ar => {
    const route = ROUTE_TYPES.find(r => r.id === ar.routeType);
    return `<div class="auto-route">
      <span>${route?.icon || '🔄'} ${route?.name || ar.routeType}: ${ar.product} x${ar.quantity} (库存>${ar.minQuantity})</span>
      <button class="btn-remove" onclick="window.game.removeAutoRoute(${ar.id})">删除</button>
    </div>`;
  }).join('');

  // Buy truck
  const truckCost = getUpgradeCost('truck', state.upgrades.truck);
  const buyTruckBtn = state.upgrades.truck < 8
    ? `<button class="btn-action" onclick="window.game.buyTruck()" ${state.gold < truckCost ? 'disabled' : ''}>
        购买卡车 (${truckCost}G)
      </button>`
    : '';

  return `
    <div class="module-header">
      <h2>物流中心</h2>
      <p class="module-desc">管理运输车队，连接全产业链</p>
    </div>
    <div class="farm-controls">
      ${buyTruckBtn}
    </div>
    <div class="section-title">车队 (运输时间: ${Math.ceil(transportTime)}秒)</div>
    <div class="trucks-grid">${trucksHTML}</div>
    <div class="section-title">手动发货</div>
    <div class="shipment-form">
      <select id="ship-route">${routeOptions}</select>
      <select id="ship-product">${inventoryItems || '<option value="">无库存</option>'}</select>
      <input type="number" id="ship-qty" value="5" min="1" max="100" />
      <button class="btn-action" onclick="window.game.manualShipment()">发货</button>
    </div>
    <div class="section-title">自动路线</div>
    <div class="auto-routes">
      ${autoRoutesHTML || '<div class="empty-text-sm">暂无自动路线</div>'}
    </div>
    <div class="shipment-form">
      <select id="auto-route-type">${routeOptions}</select>
      <input type="text" id="auto-route-product" placeholder="商品名称" />
      <input type="number" id="auto-route-qty" value="5" min="1" />
      <button class="btn-action" onclick="window.game.addAutoRouteFromUI()">添加自动路线</button>
    </div>
  `;
}
