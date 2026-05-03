// ============================================================
// City Building System
// ============================================================

const CityManager = {
  GRID_COLS: 6,
  GRID_ROWS: 6,

  init() {
    if (!gameState.city) gameState.city = {};
    if ((gameState.city.buildings || []).length > 0 || (gameState.buildQueue || []).length > 0) {
      gameState.city.buildings = [];
      gameState.buildQueue = [];
      saveGame();
    }
  },

  getBuildingAt(gridX, gridY) {
    return gameState.city.buildings.find(b => b.gridX === gridX && b.gridY === gridY);
  },

  canPlace(gridX, gridY) {
    if (gridX < 0 || gridX >= this.GRID_COLS || gridY < 0 || gridY >= this.GRID_ROWS) return false;
    return !this.getBuildingAt(gridX, gridY);
  },

  build(type, gridX, gridY) {
    if (!this.canPlace(gridX, gridY)) return { ok: false, msg: '无法在此位置建造' };

    const bt = BUILDING_TYPES[type];
    if (!bt) return { ok: false, msg: '未知建筑类型' };

    // Check castle level requirements
    const castle = gameState.city.buildings.find(b => b.type === 'castle');
    if (castle && type !== 'castle') {
      const maxLevel = Math.floor(castle.level / 2) + 1;
    }

    const cost = bt.cost(1);
    if (!canAfford(cost)) return { ok: false, msg: '资源不足' };

    spendResources(cost);

    const building = {
      id: 'b_' + type + '_' + Date.now(),
      type,
      level: 0, // starts at 0, will be 1 when build completes
      gridX,
      gridY,
      buildStart: Date.now(),
      buildTime: bt.time(1)
    };

    gameState.city.buildings.push(building);
    gameState.buildQueue.push({
      buildingId: building.id,
      endTime: Date.now() + bt.time(1) * 1000
    });

    saveGame();
    return { ok: true, msg: `${bt.name}开始建造` };
  },

  upgrade(buildingId) {
    const building = gameState.city.buildings.find(b => b.id === buildingId);
    if (!building) return { ok: false, msg: '建筑不存在' };

    const bt = BUILDING_TYPES[building.type];
    if (!bt) return { ok: false, msg: '未知建筑类型' };

    const nextLevel = building.level + 1;
    if (nextLevel > bt.maxLevel) return { ok: false, msg: '已达最高等级' };

    // Check if already in queue
    if (gameState.buildQueue.some(q => q.buildingId === buildingId)) {
      return { ok: false, msg: '该建筑正在升级中' };
    }

    const cost = bt.cost(nextLevel);
    if (!canAfford(cost)) return { ok: false, msg: '资源不足' };

    spendResources(cost);

    gameState.buildQueue.push({
      buildingId,
      endTime: Date.now() + bt.time(nextLevel) * 1000
    });

    saveGame();
    return { ok: true, msg: `${bt.name}升级至${nextLevel}级` };
  },

  speedUp(buildingId) {
    const queueIdx = gameState.buildQueue.findIndex(q => q.buildingId === buildingId);
    if (queueIdx < 0) return { ok: false, msg: '该建筑不在队列中' };

    const remaining = (gameState.buildQueue[queueIdx].endTime - Date.now()) / 1000;
    const gemCost = Math.ceil(remaining / 60) * 5;

    if (gameState.player.gems < gemCost) return { ok: false, msg: '钻石不足' };

    gameState.player.gems -= gemCost;
    const task = gameState.buildQueue.splice(queueIdx, 1)[0];
    const building = gameState.city.buildings.find(b => b.id === task.buildingId);
    if (building) building.level++;

    saveGame();
    return { ok: true, msg: '加速完成' };
  },

  collectResources() {
    let collected = { wood: 0, food: 0, stone: 0, gold: 0 };
    const buildings = gameState.city.buildings || [];

    for (const b of buildings) {
      if (b.level <= 0) continue;
      const bt = BUILDING_TYPES[b.type];
      if (!bt) continue;
      const effects = bt.effects(b.level);

      if (b._lastCollect) {
        const elapsed = (Date.now() - b._lastCollect) / 1000 / 60; // minutes
        if (effects.woodProd)  collected.wood  += Math.floor(effects.woodProd * elapsed * (1 + ResearchManager.getProductionBonus('wood')));
        if (effects.foodProd)  collected.food  += Math.floor(effects.foodProd * elapsed * (1 + ResearchManager.getProductionBonus('food')));
        if (effects.stoneProd) collected.stone += Math.floor(effects.stoneProd * elapsed * (1 + ResearchManager.getProductionBonus('stone')));
        if (effects.goldProd)  collected.gold  += Math.floor(effects.goldProd * elapsed * (1 + ResearchManager.getProductionBonus('gold')));
      }
      b._lastCollect = Date.now();
    }

    addResources(collected);
    return collected;
  },

  getProductionRates() {
    const rates = { wood: 0, food: 0, stone: 0, gold: 0 };
    for (const b of gameState.city.buildings) {
      if (b.level <= 0) continue;
      const bt = BUILDING_TYPES[b.type];
      if (!bt) continue;
      const effects = bt.effects(b.level);
      if (effects.woodProd)  rates.wood  += effects.woodProd * (1 + ResearchManager.getProductionBonus('wood'));
      if (effects.foodProd)  rates.food  += effects.foodProd * (1 + ResearchManager.getProductionBonus('food'));
      if (effects.stoneProd) rates.stone += effects.stoneProd * (1 + ResearchManager.getProductionBonus('stone'));
      if (effects.goldProd)  rates.gold  += effects.goldProd * (1 + ResearchManager.getProductionBonus('gold'));
    }
    return rates;
  },

  renderCity() {
    const container = document.getElementById('city-screen');
    if (!container) return;

    let html = this.renderBattlePortal();
    html += '<div class="city-section-title">爵位与俸禄</div>';
    html += this.renderSalaryPanel();

    container.innerHTML = html;
  },

  renderSalaryPanel() {
    const status = getSalaryStatus();
    const rank = status.rank;
    const reward = getSalaryRewardWithBonuses(rank);
    const salary = Object.entries(reward)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `<span>${resIcon(k, 14)}${v}</span>`)
      .join('');
    const completedNames = BATTLE_MAPS.slice(0, status.completed).map(m => m.name).join('、') || '暂无';
    const nextCity = BATTLE_MAPS[status.completed];
    const nextText = status.nextRank && nextCity
      ? `下一爵位：${status.nextRank.name}，通关${nextCity.name}后晋升。`
      : '已攻下全部主城，爵位已达当前最高。';
    const remaining = status.remainingMs > 0 ? formatTime(Math.ceil(status.remainingMs / 1000)) : '';

    return `
      <div class="salary-panel">
        <div class="salary-rank">
          <div>
            <div class="salary-eyebrow">当前爵位</div>
            <h3>${rank.name}</h3>
            <p>${rank.title}</p>
          </div>
          <div class="salary-medal">${status.completed}/${BATTLE_MAPS.length}</div>
        </div>
        <div class="salary-desc">${rank.desc}</div>
        <div class="salary-rewards">
          <strong>每日俸禄</strong>
          <div>${salary || '<span>通关第一座主城后解锁</span>'}</div>
        </div>
        <div class="salary-progress">
          <span>已通关主城：${completedNames}</span>
          <span>${nextText}</span>
        </div>
        <button class="btn-gold salary-claim" ${status.canClaim ? 'onclick="CityManager.collectSalary()"' : 'disabled'}>
          ${status.canClaim ? (status.upgraded ? '领取晋爵俸禄' : '领取今日俸禄') : (rank.level > 0 ? `俸禄刷新 ${remaining}` : '尚未解锁俸禄')}
        </button>
      </div>
    `;
  },

  collectSalary() {
    const result = claimSalary();
    if (typeof HeroAudio !== 'undefined') HeroAudio.playBuildComplete();
    UI.showToast(result.msg);
    UI.updateTopBar();
    this.renderCity();
  },

  renderBattlePortal() {
    const highest = gameState.roguelike.highestStage || 0;
    let selectedId = gameState.roguelike.selectedMap || BATTLE_MAPS[0].id;
    let selectedIndex = BATTLE_MAPS.findIndex(m => m.id === selectedId);
    if (selectedIndex < 0 || selectedIndex * 10 > highest) {
      selectedIndex = Math.max(0, Math.min(BATTLE_MAPS.length - 1, Math.floor(highest / 10)));
      selectedId = BATTLE_MAPS[selectedIndex].id;
      gameState.roguelike.selectedMap = selectedId;
    }
    const selected = BATTLE_MAPS[selectedIndex];

    const mapCards = BATTLE_MAPS.map((map, mapIndex) => {
      const firstStage = mapIndex * 10;
      const unlocked = firstStage <= highest;
      const clearedCount = Math.max(0, Math.min(10, highest - firstStage));
      return `<button class="campaign-map-card ${map.id === selectedId ? 'active' : ''} ${unlocked ? '' : 'locked'}"
        ${unlocked ? `onclick="UI.selectBattleMap('${map.id}')"` : 'disabled'}
        style="background-image: linear-gradient(180deg, rgba(5,7,14,0.08), rgba(5,7,14,0.78)), url('${ASSETS.campaignMap(map.theme)}');">
        <span class="campaign-map-name">${map.name}</span>
        <span class="campaign-map-terrain">${map.terrain}</span>
        <span class="campaign-map-progress">${clearedCount}/10</span>
      </button>`;
    }).join('');

    const stages = Array.from({ length: 10 }, (_, i) => {
      const globalStage = selectedIndex * 10 + i;
      const config = WAVE_CONFIGS[globalStage];
      const unlocked = globalStage <= highest;
      const cleared = globalStage < highest;
      const isBoss = config?.boss;
      const cost = getBattleStageEnergyCost(globalStage);
      return `<button class="stage-btn campaign-stage-btn ${unlocked ? '' : 'locked'} ${cleared ? 'cleared' : ''} ${isBoss ? 'boss' : ''}"
        ${unlocked ? `onclick="UI.startBattle(${globalStage})"` : 'disabled'}>
        ${i + 1}
        <span class="stage-label">${isBoss ? config.difficultyLabel : `${resIcon('energy')}${cost}`}</span>
      </button>`;
    }).join('');

    return `
      <div class="campaign-panel">
        <div class="campaign-header campaign-header-centered">
          <p class="campaign-tagline">选择尝试地图进入关卡、每座城市十关</p>
          <button class="btn-gold btn-sm" onclick="UI.startBattle('infinite')">无限模式 ${resIcon('energy')}15</button>
        </div>
        <div class="campaign-map-strip">${mapCards}</div>
        <div class="campaign-detail">
          <div class="campaign-detail-copy">
            <strong>${selected.name}</strong>
            <span>${selected.desc}</span>
          </div>
          ${gameState.selectedHero ? (() => {
            const h = gameState.heroes.find(h2 => h2.id === gameState.selectedHero);
            return h ? `<div class="campaign-hero">出战：${h.name} Lv.${h.level} · ${resIcon('energy')}${gameState.player.energy}</div>` : '';
          })() : '<div class="campaign-hero danger">请先在英雄界面选择出战英雄</div>'}
        </div>
        <div class="stage-grid campaign-stage-grid">${stages}</div>
      </div>
    `;
  }
};

function formatTime(seconds) {
  if (seconds <= 0) return '完成';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${s}s`;
}
