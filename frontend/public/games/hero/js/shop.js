// ============================================================
// Shop & Gacha System
// ============================================================

const ShopManager = {
  buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { ok: false, msg: '物品不存在' };

    const cost = {};
    cost[item.currency] = item.cost;

    if (!canAfford(cost)) return { ok: false, msg: '货币不足' };

    spendResources(cost);

    const r = item.reward;
    const resReward = {};
    if (r.wood)  resReward.wood  = r.wood;
    if (r.food)  resReward.food  = r.food;
    if (r.stone) resReward.stone = r.stone;
    if (r.gold)  resReward.gold  = r.gold;
    if (r.gems)  resReward.gems  = r.gems;
    if (Object.keys(resReward).length > 0) addResources(resReward, true);
    if (r.energyFull) {
      gameState.player.energy = gameState.player.maxEnergy;
      gameState.player.energyRefillTime = Date.now();
    } else if (r.energy) {
      gameState.player.energy = Math.min(gameState.player.maxEnergy, gameState.player.energy + r.energy);
      gameState.player.energyRefillTime = Date.now();
    }
    if (r.heroExp && gameState.selectedHero) {
      HeroManager.addExp(gameState.selectedHero, r.heroExp);
    }
    if (r.item) {
      addInventoryItem(r.item, r.qty || 1);
    }

    saveGame();
    return { ok: true, msg: `购买了${item.name}` };
  },

  pickSummonTemplate(rarity) {
    const pool = HERO_TEMPLATES.filter(t => t.rarity === rarity);
    const unownedPool = pool.filter(t => !HeroManager.hasHero(t.id));
    const pickPool = unownedPool.length > 0 ? unownedPool : pool;
    return pickPool[Math.floor(Math.random() * pickPool.length)];
  },

  rollSummonRarity() {
    gameState.roguelike.summonPity = (gameState.roguelike.summonPity || 0) + 1;
    gameState.roguelike.legendPity = (gameState.roguelike.legendPity || 0) + 1;

    let rarity;
    // Guaranteed legendary at 50 pulls (PITY_THRESHOLD * 2.5)
    if (gameState.roguelike.legendPity >= 50) {
      rarity = 'legendary';
      gameState.roguelike.legendPity = 0;
      gameState.roguelike.summonPity = 0;
    } else if (gameState.roguelike.summonPity >= PITY_THRESHOLD) {
      rarity = 'epic';
      gameState.roguelike.summonPity = 0;
    } else {
      const roll = Math.random();
      let cumulative = 0;
      rarity = 'normal';
      for (const [r, rate] of Object.entries(SUMMON_RATES)) {
        cumulative += rate;
        if (roll < cumulative) { rarity = r; break; }
      }
    }

    if (rarity === 'legendary') gameState.roguelike.legendPity = 0;
    if (rarity === 'epic') gameState.roguelike.summonPity = 0;
    return rarity;
  },

  createSummonResult(rarity) {
    const template = this.pickSummonTemplate(rarity);
    const hero = HeroManager.addHero(template.id);
    const existingHero = hero || gameState.heroes.find(h => h.templateId === template.id) || null;
    // Record summon history
    if (!gameState.summonHistory) gameState.summonHistory = [];
    gameState.summonHistory.unshift({
      heroName: template.name,
      rarity: rarity,
      isNew: !!hero,
      date: Date.now()
    });
    if (gameState.summonHistory.length > 100) gameState.summonHistory = gameState.summonHistory.slice(0, 100);
    return {
      template,
      hero: existingHero,
      isNew: !!hero,
      rarity
    };
  },

  summonHero() {
    if (gameState.player.gems < SUMMON_COST.gems) return { ok: false, msg: '钻石不足' };
    gameState.player.gems -= SUMMON_COST.gems;

    const rarity = this.rollSummonRarity();
    const result = this.createSummonResult(rarity);

    saveGame();
    return {
      ok: true,
      ...result
    };
  },

  summonTen() {
    if (gameState.player.gems < SUMMON_COST.tenGems) return { ok: false, msg: '钻石不足' };
    gameState.player.gems -= SUMMON_COST.tenGems;

    const results = [];
    for (let i = 0; i < 10; i++) {
      const rarity = this.rollSummonRarity();
      results.push(this.createSummonResult(rarity));
    }

    saveGame();
    return { ok: true, results };
  },

  renderShop() {
    const container = document.getElementById('shop-content');
    if (!container) return;

    let html = `
      <div class="shop-tabs">
        <button class="tab-btn active" data-tab="normal" onclick="ShopManager.showTab('normal')">普通商店</button>
        <button class="tab-btn" data-tab="battle" onclick="ShopManager.showTab('battle')">战斗道具</button>
        <button class="tab-btn" data-tab="premium" onclick="ShopManager.showTab('premium')">高级商店</button>
        <button class="tab-btn" data-tab="summon" onclick="ShopManager.showTab('summon')">英雄召唤</button>
      </div>
      <div id="shop-tab-content"></div>
    `;
    container.innerHTML = html;
    this.showTab('normal');
  },

  showTab(tab) {
    const content = document.getElementById('shop-tab-content');
    if (!content) return;
    this.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.shop-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    switch (tab) {
      case 'normal':
        this.renderNormalShop(content);
        break;
      case 'battle':
        this.renderBattleItemShop(content);
        break;
      case 'premium':
        this.renderPremiumShop(content);
        break;
      case 'summon':
        this.renderSummonShop(content);
        break;
    }
  },

  renderNormalShop(container) {
    const items = SHOP_ITEMS.filter(i => i.currency === 'gold' && !['battle', 'premium'].includes(i.category));
    this.renderShopItems(container, items);
  },

  renderPremiumShop(container) {
    const items = SHOP_ITEMS.filter(i => i.category === 'premium');
    this.renderShopItems(container, items);
  },

  renderBattleItemShop(container) {
    const items = SHOP_ITEMS.filter(i => i.category === 'battle');
    this.renderShopItems(container, items);
  },

  renderShopItems(container, items) {
    let html = '<div class="shop-grid">';
    for (const item of items) {
      const owned = item.reward?.item ? getItemCount(item.reward.item) : null;
      const assetId = item.assetId || item.id;
      html += `<div class="shop-item" onclick="ShopManager.buyAndRefresh('${item.id}')">
        <div class="shop-item-icon">${icon(ASSETS.shopItem(assetId), 28)}</div>
        <div class="shop-item-name">${item.name}</div>
        ${item.desc ? `<div class="shop-item-desc">${item.desc}</div>` : ''}
        ${owned !== null ? `<div class="shop-item-owned">持有 x${owned}</div>` : ''}
        <div class="shop-item-price">${resIcon(item.currency)} ${item.cost}</div>
      </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  },

  buyAndRefresh(itemId) {
    const result = this.buyItem(itemId);
    if (typeof UI !== 'undefined') UI.showToast(result.msg);
    if (typeof UI !== 'undefined') UI.updateTopBar();
    this.showTab(this.currentTab || 'normal');
  },

  renderSummonHistory() {
    const history = gameState.summonHistory || [];
    if (history.length === 0) return '';
    const recent = history.slice(0, 10);
    const rows = recent.map(h => {
      const r = HERO_RARITIES[h.rarity];
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;">
        <span style="color:${r.color};font-weight:bold;">${r.name}</span>
        <span style="color:var(--text);">${h.heroName}</span>
        <span style="color:var(--text-dim);font-size:10px;">${h.isNew ? '<span style="color:var(--success);">NEW</span>' : '重复'}</span>
      </div>`;
    }).join('');
    return `<div style="margin-top:12px;padding:10px;background:var(--bg-card);border-radius:8px;">
      <h4 style="color:var(--gold);font-size:12px;margin-bottom:8px;">最近召唤记录</h4>
      ${rows}
    </div>`;
  },

  renderSummonShop(container) {
    const historyHtml = this.renderSummonHistory();
    let html = `
      <div class="summon-info">
        <h3>英雄召唤</h3>
        <div class="summon-circle-wrap">
          <img src="${ASSETS.shopItem('summon_circle')}" class="summon-circle-anim" alt="" style="animation: summonGlow 2s ease-in-out infinite, summonSpin 8s linear infinite;">
        </div>
        <div class="summon-rates">
          <p>传说: ${(SUMMON_RATES.legendary * 100).toFixed(1)}% | 史诗: ${(SUMMON_RATES.epic * 100).toFixed(0)}% | 稀有: ${(SUMMON_RATES.rare * 100).toFixed(0)}% | 普通: ${(SUMMON_RATES.normal * 100).toFixed(0)}%</p>
          <p>史诗保底: ${PITY_THRESHOLD}次 | 传说保底: 50次</p>
          <p>当前史诗保底: ${gameState.roguelike.summonPity || 0}/${PITY_THRESHOLD}</p>
          <p>当前传说保底: ${gameState.roguelike.legendPity || 0}/50</p>
        </div>
        <div class="summon-resources">
          <span>${resIcon('gems')}${gameState.player.gems}</span>
        </div>
      </div>
      <div class="summon-buttons">
        <button class="btn-primary" onclick="ShopManager.doSummon(false)" style="min-height:44px;touch-action:manipulation;">
          召唤 1 次 (${resIcon('gems')}${SUMMON_COST.gems})
        </button>
        <button class="btn-gold" onclick="ShopManager.doSummon(true)" style="min-height:44px;touch-action:manipulation;">
          十连召唤 (${resIcon('gems')}${SUMMON_COST.tenGems})
        </button>
      </div>
      <div id="summon-result"></div>
      ${historyHtml}
    `;
    container.innerHTML = html;
  },

  doSummon(tenPull) {
    // Play gacha reveal sound
    if (typeof HeroAudio !== 'undefined') HeroAudio.playGachaReveal();

    const result = tenPull ? this.summonTen() : this.summonHero();

    if (!result.ok) {
      this.showSummonResult([{ template: null, msg: result.msg }]);
      return;
    }

    // Check if legendary was pulled
    const hasLegendary = tenPull
      ? result.results.some(r => r.rarity === 'legendary')
      : result.rarity === 'legendary';

    if (typeof UI !== 'undefined') UI.updateTopBar();
    this.renderSummonShop(document.getElementById('shop-tab-content'));
    if (tenPull) {
      this.showSummonResult(result.results.map(r => ({ template: r.template, isNew: r.isNew, rarity: r.rarity })));
    } else {
      this.showSummonResult([{ template: result.template, isNew: result.isNew, rarity: result.rarity }]);
    }
  },

  showSummonResult(results) {
    const el = document.getElementById('summon-result');
    if (!el) return;

    let html = '<div class="summon-results">';
    for (const r of results) {
      if (!r.template) {
        html += `<div class="summon-msg">${r.msg}</div>`;
        continue;
      }
      const rarity = HERO_RARITIES[r.rarity];
      const cls = HERO_CLASSES[r.template.heroClass];
      // Use animated rarity SVG for epic+
      const rarityBg = (r.rarity === 'epic' || r.rarity === 'legendary')
        ? `<img src="${ASSETS.rarity(r.rarity + '_anim')}" class="summon-rarity-anim">`
        : '';
      html += `<div class="summon-card summon-reveal" style="border-color: ${rarity.color}">
        ${rarityBg}
        <div style="color: ${rarity.color}; font-weight: bold; position:relative; z-index:1;">${rarity.name}</div>
        <div class="summon-hero-icon" style="position:relative; z-index:1;">${icon(ASSETS.hero(r.template.id), 48)}</div>
        <div style="position:relative; z-index:1;">${r.template.name}</div>
        <div style="font-size:11px;color:#aaa;position:relative;z-index:1;">${cls.name}</div>
        ${r.isNew ? '<div class="new-badge">NEW!</div>' : '<div class="dupe-badge">重复</div>'}
      </div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }
};
