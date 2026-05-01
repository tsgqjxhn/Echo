// Shop module: retail sales, customers, pricing
import { RECIPE_DATA, getCustomerRateMultiplier, getPriceMultiplier, getUpgradeCost } from './data.js';
import { addGold, addXP, addInventory, hasGold, ensureShelves } from './state.js';
import { notify } from './systems.js';

const CUSTOMER_NAMES = [
  '小明', '小红', '老王', '阿花', '大壮', '小李', '美美', '阿强',
  '小芳', '建国', '丽丽', '志明', '春花', '国庆', '小雪', '大海',
];

const CUSTOMER_ICONS = ['👨', '👩', '👴', '👵', '👦', '👧', '🧑', '👱', '👲', '🧔', '👳', '🧓'];

export function stockShelf(state, shelfId, productKey) {
  if (!state.shopUnlocked) return false;
  const shelf = state.shop.shelves.find(s => s.id === shelfId);
  if (!shelf) return false;

  const qty = state.inventory[productKey] || 0;
  if (qty <= 0) return false;

  const space = shelf.maxQuantity - shelf.quantity;
  if (space <= 0) return false;

  const amount = Math.min(qty, space);
  addInventory(state, productKey, -amount);
  shelf.product = productKey;
  shelf.quantity += amount;
  return true;
}

export function autoStockShelves(state) {
  for (const shelf of state.shop.shelves) {
    if (shelf.quantity > 0) continue;
    // Find products in inventory to stock
    for (const [key, qty] of Object.entries(state.inventory)) {
      if (qty > 0 && RECIPE_DATA[key]) {
        stockShelf(state, shelf.id, key);
        break;
      }
    }
  }
}

function generateCustomer(state) {
  const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
  const icon = CUSTOMER_ICONS[Math.floor(Math.random() * CUSTOMER_ICONS.length)];
  const patience = 10 + Math.random() * 20;

  // Customer wants a random product that's on shelves
  const stockedProducts = state.shop.shelves
    .filter(s => s.quantity > 0 && s.product)
    .map(s => s.product);

  const target = stockedProducts.length > 0
    ? stockedProducts[Math.floor(Math.random() * stockedProducts.length)]
    : null;

  return {
    id: Date.now() + Math.random(),
    name,
    icon,
    target,
    patience,
    waitTime: 0,
    satisfied: false,
  };
}

export function updateShop(state, dt) {
  if (!state.shopUnlocked) return;

  const shop = state.shop;

  // Customer generation
  const rateMult = getCustomerRateMultiplier(state);
  const effectiveInterval = shop.customerInterval / rateMult;

  shop.customerTimer += dt;
  if (shop.customerTimer >= effectiveInterval) {
    shop.customerTimer = 0;
    const customer = generateCustomer(state);
    if (customer.target) {
      shop.customers.push(customer);
    }
  }

  // Process customers
  const priceMult = getPriceMultiplier(state);
  const toRemove = [];

  for (let i = 0; i < shop.customers.length; i++) {
    const customer = shop.customers[i];
    customer.waitTime += dt;

    if (customer.target) {
      // Find shelf with target product
      const shelf = shop.shelves.find(s => s.product === customer.target && s.quantity > 0);
      if (shelf) {
        // Buy!
        shelf.quantity--;
        const recipe = RECIPE_DATA[customer.target];
        if (recipe) {
          const revenue = Math.floor(recipe.shopSell * priceMult);
          addGold(state, revenue);
          addXP(state, Math.ceil(revenue * 0.1));
          state.stats.totalSold[customer.target] = (state.stats.totalSold[customer.target] || 0) + 1;
          state.stats.totalRevenue += revenue;
          shop.totalCustomersServed++;
          notify(state, `${customer.icon}${customer.name} 购买了 ${recipe.icon}${recipe.name} +${revenue}G`, 'gold');
        }
        if (shelf.quantity <= 0) {
          shelf.product = null;
          shelf.quantity = 0;
        }
        customer.satisfied = true;
        toRemove.push(i);
      } else if (customer.waitTime >= customer.patience) {
        // Customer leaves angry
        notify(state, `${customer.icon}${customer.name} 等不及离开了...`, 'warning');
        toRemove.push(i);
      }
    } else if (customer.waitTime >= customer.patience) {
      toRemove.push(i);
    }
  }

  // Remove processed customers (reverse order to preserve indices)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    shop.customers.splice(toRemove[i], 1);
  }
}

export function buyShopShelf(state) {
  const current = state.upgrades.shop_shelf;
  const cost = getUpgradeCost('shop_shelf', current);
  if (!hasGold(state, cost)) return false;
  addGold(state, -cost);
  state.upgrades.shop_shelf++;
  ensureShelves(state);
  notify(state, '购买了新货架', 'success');
  return true;
}

export function renderShop(state) {
  if (!state.shopUnlocked) {
    const cost = 3000;
    return `
      <div class="module-header">
        <h2>商店</h2>
        <p class="module-desc">零售商品，获取最高利润</p>
      </div>
      <div class="locked-module">
        <div class="lock-icon">🏪</div>
        <p>商店尚未建造</p>
        <button class="btn-action btn-large" onclick="window.game.buildShop()"
          ${state.gold < cost ? 'disabled' : ''}>
          建造商店 (${cost}G)
        </button>
      </div>
    `;
  }

  const shop = state.shop;
  const priceMult = getPriceMultiplier(state);

  // Shelves
  const shelvesHTML = shop.shelves.map(shelf => {
    if (shelf.quantity > 0 && shelf.product) {
      const recipe = RECIPE_DATA[shelf.product];
      const pct = Math.floor((shelf.quantity / shelf.maxQuantity) * 100);
      const sellPrice = Math.floor(recipe.shopSell * priceMult);
      return `<div class="shelf stocked">
        <div class="shelf-product">${recipe.icon} ${recipe.name}</div>
        <div class="shelf-quantity">${shelf.quantity}/${shelf.maxQuantity}</div>
        <div class="progress-bar small">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="shelf-price">售价: ${sellPrice}G</div>
      </div>`;
    }

    // Empty shelf - show stocking options
    const products = Object.entries(state.inventory)
      .filter(([key, qty]) => qty > 0 && RECIPE_DATA[key])
      .map(([key, qty]) => {
        const r = RECIPE_DATA[key];
        return `<button class="btn-stock" onclick="window.game.stockShelf(${shelf.id}, '${key}')">
          ${r.icon} ${r.name} (x${qty})
        </button>`;
      }).join('');

    return `<div class="shelf empty">
      <div class="shelf-label">货架 #${shelf.id + 1} - 空</div>
      <div class="stock-options">${products || '<span class="empty-text-sm">无可上架商品</span>'}</div>
    </div>`;
  }).join('');

  // Customers
  const customersHTML = shop.customers.length > 0
    ? shop.customers.slice(0, 8).map(c =>
      `<div class="customer ${c.satisfied ? 'happy' : ''}">
        <span class="customer-icon">${c.icon}</span>
        <span class="customer-name">${c.name}</span>
        ${c.target ? `<span class="customer-target">想要 ${RECIPE_DATA[c.target]?.icon || '?'}</span>` : '<span class="customer-target">在逛...</span>'}
      </div>`
    ).join('')
    : '<div class="empty-text-sm">等待顾客光临...</div>';

  // Buy shelf
  const shelfCost = getUpgradeCost('shop_shelf', state.upgrades.shop_shelf);
  const buyShelfBtn = state.upgrades.shop_shelf < 15
    ? `<button class="btn-action" onclick="window.game.buyShopShelf()" ${state.gold < shelfCost ? 'disabled' : ''}>
        购买货架 (${shelfCost}G)
      </button>`
    : '';

  // Auto-stock button
  const autoStockBtn = `<button class="btn-action" onclick="window.game.autoStockShelves()">自动上架</button>`;

  // Stats
  const rateMult = getCustomerRateMultiplier(state);

  return `
    <div class="module-header">
      <h2>商店</h2>
      <p class="module-desc">零售终端 - 利润最大化的关键</p>
    </div>
    <div class="shop-stats">
      <div class="stat-card"><span class="stat-value">${shop.totalCustomersServed}</span><span class="stat-label">已服务顾客</span></div>
      <div class="stat-card"><span class="stat-value">${rateMult.toFixed(1)}x</span><span class="stat-label">客流倍率</span></div>
      <div class="stat-card"><span class="stat-value">${priceMult.toFixed(2)}x</span><span class="stat-label">价格倍率</span></div>
      <div class="stat-card"><span class="stat-value">${shop.customers.length}</span><span class="stat-label">当前顾客</span></div>
    </div>
    <div class="farm-controls">
      ${autoStockBtn}
      ${buyShelfBtn}
    </div>
    <div class="section-title">货架</div>
    <div class="shelves-grid">${shelvesHTML}</div>
    <div class="section-title">顾客</div>
    <div class="customers-list">${customersHTML}</div>
  `;
}
