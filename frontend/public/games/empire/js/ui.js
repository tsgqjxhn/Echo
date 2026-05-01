// Shared UI components and overview screen
import { CROP_DATA, RECIPE_DATA, UPGRADE_DATA, BUFF_DATA, getUpgradeCost } from './data.js';
import { getXPProgress } from './state.js';
import { canPrestige, calculatePrestigePoints, getPrestigeMultiplier } from './systems.js';

export function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export function renderHeader(state) {
  const xpPct = Math.floor(getXPProgress(state) * 100);
  const prestigeMult = getPrestigeMultiplier(state);

  return `
    <div class="header">
      <div class="header-left">
        <span class="game-title">圣王国</span>
        <span class="gold-display">💰 ${formatNumber(state.gold)} G</span>
      </div>
      <div class="header-center">
        <div class="level-display">
          <span class="level-badge">Lv.${state.level}</span>
          <div class="xp-bar">
            <div class="xp-fill" style="width:${xpPct}%"></div>
          </div>
          <span class="xp-text">${xpPct}%</span>
        </div>
      </div>
      <div class="header-right">
        ${state.prestigeCount > 0 ? `<span class="prestige-badge" title="转生加成">🌟 x${prestigeMult.toFixed(2)}</span>` : ''}
        <span class="time-display">⏱ ${formatTime(state.gameTime)}</span>
        <button class="btn-icon" onclick="window.game.save()" title="保存">💾</button>
        <button class="btn-icon" onclick="window.game.showSettings()" title="设置">⚙️</button>
      </div>
    </div>
  `;
}

export function renderTabBar(state) {
  const tabs = [
    { id: 'farm', name: '农场', icon: '🌾' },
    { id: 'factory', name: '工厂', icon: '🏭', locked: !state.factoryUnlocked },
    { id: 'shop', name: '商店', icon: '🏪', locked: !state.shopUnlocked },
    { id: 'logistics', name: '物流', icon: '🚛', locked: !state.logisticsUnlocked },
    { id: 'upgrades', name: '升级', icon: '⬆️' },
    { id: 'buffs', name: '增益', icon: '✨' },
    { id: 'overview', name: '总览', icon: '📊' },
  ];

  return `<div class="tab-bar">
    ${tabs.map(t => `<button class="tab ${state.currentTab === t.id ? 'active' : ''} ${t.locked ? 'locked' : ''}"
      onclick="window.game.switchTab('${t.id}')" title="${t.locked ? '未解锁' : t.name}">
      <span class="tab-icon">${t.icon}</span>
      <span class="tab-name">${t.name}</span>
    </button>`).join('')}
  </div>`;
}

export function renderUpgrades(state) {
  const categories = {
    farm: '农场升级',
    factory: '工厂升级',
    shop: '商店升级',
    logistics: '物流升级',
  };

  let html = `
    <div class="module-header">
      <h2>升级中心</h2>
      <p class="module-desc">投资升级，提升全产业链效率</p>
    </div>
  `;

  for (const [catKey, catName] of Object.entries(categories)) {
    const upgrades = Object.entries(UPGRADE_DATA)
      .filter(([_, d]) => d.category === catKey)
      .map(([key, data]) => {
        const current = state.upgrades[key] || 0;
        const cost = getUpgradeCost(key, current);
        const maxed = current >= data.maxLevel;
        return `<div class="upgrade-item ${maxed ? 'maxed' : ''}">
          <span class="upgrade-icon">${data.icon}</span>
          <div class="upgrade-info">
            <span class="upgrade-name">${data.name}</span>
            <span class="upgrade-level">Lv.${current}/${data.maxLevel}</span>
          </div>
          ${maxed
            ? '<span class="upgrade-maxed">已满级</span>'
            : `<button class="btn-upgrade" onclick="window.game.buyUpgrade('${key}')"
                ${state.gold < cost ? 'disabled' : ''}>
                升级 (${formatNumber(cost)}G)
              </button>`
          }
        </div>`;
      }).join('');

    html += `
      <div class="section-title">${catName}</div>
      <div class="upgrades-list">${upgrades}</div>
    `;
  }

  // Prestige section
  const canP = canPrestige(state);
  const ppGain = calculatePrestigePoints(state);

  html += `
    <div class="section-title prestige-title">转生系统</div>
    <div class="prestige-section">
      <div class="prestige-info">
        <p>累计收入: ${formatNumber(state.totalEarnings)} G</p>
        <p>当前转生点数: ${state.prestigePoints}</p>
        <p>转生加成: x${getPrestigeMultiplier(state).toFixed(2)}</p>
        <p>转生次数: ${state.prestigeCount}</p>
        ${ppGain > 0 ? `<p class="prestige-gain">可获转生点数: +${ppGain}</p>` : ''}
      </div>
      <button class="btn-prestige" onclick="window.game.doPrestige()"
        ${!canP ? 'disabled' : ''}>
        ${canP ? `转生 (+${ppGain}点)` : `需累计收入 ${formatNumber(100000)}G`}
      </button>
      <p class="prestige-warning">⚠️ 转生将重置所有进度，但永久保留转生加成</p>
    </div>
  `;

  return html;
}

export function renderBuffs(state) {
  const activeBuffsHTML = state.activeBuffs.length > 0
    ? state.activeBuffs.map(b => {
      const remaining = Math.max(0, Math.ceil((b.expiresAt - Date.now()) / 1000));
      return `<div class="buff-active">
        <span class="buff-icon">${b.icon}</span>
        <span class="buff-name">${b.name}</span>
        <span class="buff-timer">${formatTime(remaining)}</span>
        <div class="progress-bar small">
          <div class="progress-fill complete" style="width:${Math.floor((remaining / 120) * 100)}%"></div>
        </div>
      </div>`;
    }).join('')
    : '<div class="empty-text">暂无激活的增益效果</div>';

  const shopBuffs = Object.entries(BUFF_DATA).map(([key, data]) => {
    const isActive = state.activeBuffs.some(b => b.key === key);
    return `<div class="buff-item ${isActive ? 'active' : ''}">
      <span class="buff-icon">${data.icon}</span>
      <div class="buff-info">
        <span class="buff-name">${data.name}</span>
        <span class="buff-desc">${data.description}</span>
        <span class="buff-duration">持续 ${data.duration}秒</span>
      </div>
      <button class="btn-buff" onclick="window.game.activateBuff('${key}')"
        ${state.gold < data.cost || isActive ? 'disabled' : ''}>
        ${data.cost}G
      </button>
    </div>`;
  }).join('');

  return `
    <div class="module-header">
      <h2>增益商店</h2>
      <p class="module-desc">购买临时增益，大幅提升效率</p>
    </div>
    <div class="section-title">激活中的增益</div>
    <div class="buffs-active">${activeBuffsHTML}</div>
    <div class="section-title">增益商店</div>
    <div class="buffs-shop">${shopBuffs}</div>
  `;
}

export function renderOverview(state) {
  const farmPlots = state.farm.plots.filter(p => p.crop).length;
  const totalPlots = state.farm.plots.length;
  const growing = state.farm.plots.filter(p => p.crop && p.growthProgress < 1).length;
  const ready = state.farm.plots.filter(p => p.crop && p.growthProgress >= 1).length;

  const factoryActive = state.factory.machines.filter(m => m.recipe).length;
  const totalMachines = state.factory.machines.length;

  const shopStocked = state.shop.shelves.filter(s => s.quantity > 0).length;
  const totalShelves = state.shop.shelves.length;

  const truckBusy = state.logistics.trucks.filter(t => t.busy).length;
  const totalTrucks = state.logistics.trucks.length;

  // Full inventory
  const allInventory = Object.entries(state.inventory)
    .filter(([_, qty]) => qty > 0)
    .map(([key, qty]) => {
      const cropD = CROP_DATA[key];
      const recipeD = RECIPE_DATA[key];
      const icon = cropD?.icon || recipeD?.icon || '📦';
      const name = cropD?.name || recipeD?.name || key;
      return `<div class="inv-item-sm"><span>${icon}</span> ${name} x${qty}</div>`;
    }).join('');

  // Chain visualization
  const chainHTML = `
    <div class="chain-visual">
      <div class="chain-node ${farmPlots > 0 ? 'active' : ''}">
        <div class="chain-icon">🌾</div>
        <div class="chain-label">农场</div>
        <div class="chain-stat">${farmPlots}/${totalPlots} 地块</div>
        <div class="chain-detail">${growing} 生长中 / ${ready} 可收获</div>
      </div>
      <div class="chain-arrow ${state.factoryUnlocked ? 'active' : ''}">→</div>
      <div class="chain-node ${state.factoryUnlocked ? 'active' : ''}">
        <div class="chain-icon">🏭</div>
        <div class="chain-label">工厂</div>
        <div class="chain-stat">${factoryActive}/${totalMachines} 运转</div>
        <div class="chain-detail">${state.factoryUnlocked ? '已建造' : '未建造'}</div>
      </div>
      <div class="chain-arrow ${state.shopUnlocked ? 'active' : ''}">→</div>
      <div class="chain-node ${state.shopUnlocked ? 'active' : ''}">
        <div class="chain-icon">🏪</div>
        <div class="chain-label">商店</div>
        <div class="chain-stat">${shopStocked}/${totalShelves} 货架</div>
        <div class="chain-detail">${state.shopUnlocked ? `${state.shop.customers.length} 顾客` : '未建造'}</div>
      </div>
    </div>
  `;

  return `
    <div class="module-header">
      <h2>产业总览</h2>
      <p class="module-desc">全局视角查看你的圣王国</p>
    </div>
    <div class="overview-stats">
      <div class="stat-card large">
        <span class="stat-icon">💰</span>
        <span class="stat-value">${formatNumber(state.gold)}</span>
        <span class="stat-label">当前金币</span>
      </div>
      <div class="stat-card large">
        <span class="stat-icon">📈</span>
        <span class="stat-value">${formatNumber(state.totalEarnings)}</span>
        <span class="stat-label">累计收入</span>
      </div>
      <div class="stat-card large">
        <span class="stat-icon">⭐</span>
        <span class="stat-value">Lv.${state.level}</span>
        <span class="stat-label">玩家等级</span>
      </div>
      <div class="stat-card large">
        <span class="stat-icon">🌟</span>
        <span class="stat-value">${state.prestigePoints}</span>
        <span class="stat-label">转生点数</span>
      </div>
    </div>
    <div class="section-title">产业链</div>
    ${chainHTML}
    <div class="section-title">物流状态</div>
    <div class="logistics-overview">
      <span>卡车: ${truckBusy}/${totalTrucks} 使用中</span>
    </div>
    <div class="section-title">全部库存</div>
    <div class="full-inventory">
      ${allInventory || '<div class="empty-text">仓库空空如也</div>'}
    </div>
    <div class="section-title">统计数据</div>
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-value">${formatNumber(state.stats.totalRevenue)}</span><span class="stat-label">总收入</span></div>
      <div class="stat-card"><span class="stat-value">${formatNumber(state.stats.totalSpent)}</span><span class="stat-label">总支出</span></div>
      <div class="stat-card"><span class="stat-value">${state.shop.totalCustomersServed || 0}</span><span class="stat-label">服务顾客</span></div>
      <div class="stat-card"><span class="stat-value">${state.prestigeCount}</span><span class="stat-label">转生次数</span></div>
    </div>
  `;
}

export function renderNotifications(state) {
  const notifs = state.notifications
    .filter(n => Date.now() - n.time < 4000)
    .slice(-5);
  return notifs.map(n =>
    `<div class="notification ${n.type}">${n.message}</div>`
  ).join('');
}

export function renderSettingsModal(state) {
  return `
    <div class="modal-overlay" onclick="window.game.closeModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>设置</h3>
        <div class="modal-actions">
          <button class="btn-action" onclick="window.game.save()">保存游戏</button>
          <button class="btn-action" onclick="window.game.hardReset()">重置存档</button>
          <button class="btn-action" onclick="window.game.closeModal()">关闭</button>
        </div>
        <div class="modal-info">
          <p>游戏自动保存于浏览器本地</p>
          <p>上次保存: ${new Date(state.lastSaveTime).toLocaleString()}</p>
        </div>
      </div>
    </div>
  `;
}

export function renderOfflineModal(earnings) {
  return `
    <div class="modal-overlay">
      <div class="modal offline-modal">
        <h3>欢迎回来！</h3>
        <p class="offline-duration">你离开了 ${formatTime(earnings.duration)}</p>
        <div class="offline-rewards">
          <div class="offline-reward">💰 +${formatNumber(earnings.gold)} G</div>
          <div class="offline-reward">⭐ +${formatNumber(earnings.xp)} XP</div>
          ${Object.entries(earnings.items).map(([item, qty]) => {
            const cropD = CROP_DATA[item];
            const recipeD = RECIPE_DATA[item];
            const icon = cropD?.icon || recipeD?.icon || '📦';
            return `<div class="offline-reward">${icon} ${item} x${qty}</div>`;
          }).join('')}
        </div>
        <button class="btn-action btn-large" onclick="window.game.dismissOffline()">收取</button>
      </div>
    </div>
  `;
}
