// ============================================================
// Main Controller & UI
// ============================================================

let gameState = null;
let roguelikeGame = null;

const UI = {
  currentScreen: 'city',
  modalStack: [],
  _autoSaveInterval: null,
  _timerInterval: null,

  init() {
    const saved = loadGame();
    if (saved) {
      gameState = saved;
      refillEnergy();
      checkDailyReset();
      CityManager.init();
      this.showGame();
    } else {
      this.showWelcome();
    }
  },

  showWelcome() {
    const app = document.getElementById('app');
    const hasExisting = typeof hasSave === 'function' && hasSave();
    app.innerHTML = `
      <div class="welcome-screen" id="welcome-screen">
        <div style="font-size:48px; margin-bottom:20px;">⚔️🏰🏹</div>
        <button class="btn-start" onclick="UI.showCivSelect()">开始冒险</button>
        ${hasExisting ? `<button class="btn-secondary btn-sm" style="margin-top:14px;" onclick="UI.confirmResetSave()">重置存档</button>` : ''}
      </div>
    `;
  },

  showCivSelect() {
    const el = document.getElementById('welcome-screen');
    if (!el) return;

    let html = `
      <div class="civ-select" id="civ-select">
        <div class="civ-panel">
          <h1>选择文明</h1>
          <p>每种文明拥有独特加成</p>
          <div class="civ-grid">
    `;
    for (const [key, civ] of Object.entries(CIVILIZATIONS)) {
      html += `<div class="civ-card" onclick="UI.selectCiv('${key}')">
        <div class="civ-icon">${icon(ASSETS.civ(key), 40)}</div>
        <div class="civ-name">${civ.name}</div>
        <div class="civ-bonus">${civ.desc}</div>
      </div>`;
    }
    html += '</div></div></div>';
    el.innerHTML = html;
  },

  selectCiv(civKey) {
    gameState = createDefaultState();
    gameState.player.civilization = civKey;
    CityManager.init();

    // Give a starter hero
    const starter = HERO_TEMPLATES.find(t => t.rarity === 'normal');
    if (starter) {
      HeroManager.addHero(starter.id);
      gameState.selectedHero = gameState.heroes[0].id;
    }

    saveGame();

    const el = document.getElementById('civ-select');
    if (el) el.remove();
    this.showGame();
  },

  showGame() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="top-bar" id="top-bar"></div>
      <div class="screen-container" id="screen-container">
        <div class="screen" id="city-screen"></div>
        <div class="screen" id="hero-screen"></div>
        <div class="screen" id="roguelike-screen"></div>
        <div class="screen" id="research-screen"></div>
        <div class="screen" id="shop-screen"></div>
        <div class="screen" id="menu-screen"></div>
      </div>
    `;

    this.updateTopBar();
    this.renderScreen('city');
    this.startAutoSave();
    this.startTimerUpdates();
  },

  updateTopBar() {
    const bar = document.getElementById('top-bar');
    if (!bar) return;
    const p = gameState.player;
    const active = this.currentScreen || 'city';
    // 5 nav tabs are now hosted in the outer Vue top-bar (play.vue) so they
    // remain visible even when this in-iframe top-bar is hidden during battle.
    bar.innerHTML = `
      <div class="top-bar-resources">
        <div class="resource-item">${resIcon('wood')}<span class="amount">${Math.floor(p.wood)}</span></div>
        <div class="resource-item">${resIcon('food')}<span class="amount">${Math.floor(p.food)}</span></div>
        <div class="resource-item">${resIcon('stone')}<span class="amount">${Math.floor(p.stone)}</span></div>
        <div class="resource-item">${resIcon('gold')}<span class="amount">${Math.floor(p.gold)}</span></div>
        <div class="resource-item">${resIcon('gems')}<span class="amount">${p.gems}</span></div>
        <div class="energy-bar">
          ${resIcon('energy')}<span>${p.energy}/${p.maxEnergy}</span>
          <div class="energy-fill-mini"><div style="width:${(p.energy / p.maxEnergy) * 100}%"></div></div>
          <button class="energy-buy-btn" onclick="UI.buyEnergyWithGold()" ${p.energy >= p.maxEnergy ? 'disabled' : ''} title="花费 100 金币立即回满体力">
            ${resIcon('gold')}100
          </button>
        </div>
      </div>
    `;
    // Tell the outer wrapper which tab is active so it can highlight it.
    this._notifyOuterScreen(active);
  },

  _notifyOuterScreen(screen) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: 'hero-game', type: 'screen', screen }, '*');
      }
    } catch (_) { /* cross-origin guard */ }
  },

  renderScreen(screen) {
    // Stop any running game
    if (roguelikeGame && screen !== 'roguelike') {
      // Don't destroy - just note we left
    }
    this.currentScreen = screen;

    // Restore nav bar and top bar when leaving battle
    const navBar = document.getElementById('bottom-nav');
    const topBar = document.getElementById('top-bar');
    if (navBar) navBar.style.display = '';
    if (topBar) topBar.style.display = '';

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screen);
    });

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const screenEl = document.getElementById(`${screen}-screen`);
    if (screenEl) screenEl.classList.add('active');

    switch (screen) {
      case 'city':
        CityManager.renderCity();
        break;
      case 'hero':
        this.renderHeroScreen();
        break;
      case 'roguelike':
        this.renderRoguelikeScreen();
        break;
      case 'research':
        ResearchManager.render();
        break;
      case 'shop':
        this.renderShopScreen();
        break;
      case 'menu':
        this.renderMenuScreen();
        break;
    }

    this.updateTopBar();
  },

  renderHeroScreen() {
    const el = document.getElementById('hero-screen');
    el.innerHTML = '<div id="hero-list"></div><div id="hero-detail"></div>';
    HeroManager.renderHeroList();
  },

  renderRoguelikeScreen() {
    this.renderScreen('city');
  },

  selectBattleMap(mapId) {
    const mapIndex = BATTLE_MAPS.findIndex(m => m.id === mapId);
    if (mapIndex < 0) return;
    if (mapIndex * 10 > (gameState.roguelike.highestStage || 0)) {
      this.showToast('请先通关前一座城市');
      return;
    }
    gameState.roguelike.selectedMap = mapId;
    saveGame();
    CityManager.renderCity();
  },

  startBattle(stageIndex) {
    const infiniteMode = stageIndex === 'infinite';
    const cost = getBattleStageEnergyCost(stageIndex);
    if (gameState.player.energy < cost) {
      this.showToast('体力不足！');
      return;
    }
    if (!gameState.selectedHero) {
      this.showToast('请先选择出战英雄！');
      return;
    }

    const hero = gameState.heroes.find(h => h.id === gameState.selectedHero);
    if (!hero) {
      this.showToast('出战英雄不存在');
      return;
    }

    const template = HeroManager.getTemplate(hero.templateId);
    if (!template) {
      this.showToast('英雄配置缺失');
      return;
    }

    if (typeof consumeEnergy === 'function') {
      consumeEnergy(cost);
    } else {
      gameState.player.energy -= cost;
    }

    this.currentScreen = 'roguelike';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Hide nav bar and top bar during battle
    const navBar = document.getElementById('bottom-nav');
    const topBar = document.getElementById('top-bar');
    if (navBar) navBar.style.display = 'none';
    if (topBar) topBar.style.display = 'none';

    const el = document.getElementById('roguelike-screen');
    el.classList.add('active');
    el.style.padding = '0';
    el.innerHTML = '<canvas id="game-canvas" style="display:block;width:100%;height:100%"></canvas>';

    const canvas = document.getElementById('game-canvas');
    // Use full viewport for battle
    canvas.width = Math.max(320, window.innerWidth || 360);
    canvas.height = Math.max(320, window.innerHeight || 640);

    roguelikeGame = new RoguelikeGame(canvas);
    roguelikeGame.onEnd = (win, kills, time, rewards, wave, isPaused) => {
      if (isPaused) {
        roguelikeGame.stop();
        UI.renderScreen('city');
        return;
      }
      roguelikeGame.stop();

      // Apply rewards
      addResources(rewards);

      // Per-stage clear bonus: every cleared stage grants a flat reward that
      // scales with stage number, regardless of in-battle drops. Skipped on
      // loss (so death isn't rewarded). Infinite mode only rewards on the
      // final wave reached (handled by passing `wave`).
      const stageClearBonus = win
        ? {
            gold: 30 + wave * 12,
            gems: 2 + Math.floor(wave / 3),
            food: 10 + wave * 3,
            wood: 10 + wave * 3,
            stone: 5 + wave * 2,
          }
        : null;
      if (stageClearBonus) {
        addResources(stageClearBonus);
        const expGain = 8 + wave * 4;
        if (gameState.selectedHero && typeof HeroManager !== 'undefined') {
          HeroManager.addExp(gameState.selectedHero, expGain);
        }
        // Stash for showBattleResult to display
        this._lastStageClearBonus = { ...stageClearBonus, exp: expGain };
      } else {
        this._lastStageClearBonus = null;
      }

      const previousRankLevel = getCurrentNobilityRank().level;
      if (!infiniteMode && win && wave > gameState.roguelike.highestStage) {
        gameState.roguelike.highestStage = Math.max(gameState.roguelike.highestStage, wave);
      }
      const currentRank = getCurrentNobilityRank();
      const promotedRank = currentRank.level > previousRankLevel ? currentRank : null;
      if (infiniteMode) {
        gameState.roguelike.bestInfiniteWave = Math.max(gameState.roguelike.bestInfiniteWave || 0, wave);
      }
      gameState.roguelike.totalRuns++;

      // Daily task progress
      if (!gameState.dailyTasks.progress.dt1) gameState.dailyTasks.progress.dt1 = 0;
      gameState.dailyTasks.progress.dt1++;

      saveGame();
      this.showBattleResult(win, kills, time, rewards, wave, infiniteMode, promotedRank);
    };

    const battleStats = HeroManager.getBattleStats(hero.id);
    const battleStage = infiniteMode ? Math.max(0, gameState.roguelike.highestStage) : stageIndex;
    try {
      roguelikeGame.start({ ...template, baseHp: battleStats.hp, baseAtk: battleStats.atk, baseSpd: battleStats.spd }, battleStage, { infinite: infiniteMode });
      saveGame();
      this.updateTopBar();
    } catch (err) {
      console.error('Battle start failed:', err);
      gameState.player.energy += cost;
      if (roguelikeGame) roguelikeGame.stop();
      roguelikeGame = null;
      this.showToast('战斗启动失败，已返还体力');
      this.renderScreen('city');
      this.updateTopBar();
    }
  },

  showBattleResult(win, kills, time, rewards, wave, infiniteMode = false, promotedRank = null) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const title = infiniteMode ? '无限模式结束' : (win ? '胜利！' : '战败');

    const overlay = document.createElement('div');
    overlay.className = 'battle-result';
    overlay.innerHTML = `
      <div class="result-panel">
        <div class="result-title ${win || infiniteMode ? 'win' : 'lose'}">${title}</div>
        <div class="result-stats">
          <div>到达关卡: 第 ${wave} 关</div>
          ${infiniteMode ? `<div>最高纪录: 第 ${gameState.roguelike.bestInfiniteWave || wave} 关</div>` : ''}
          <div>击杀数: ${kills}</div>
          <div>用时: ${mins}:${secs.toString().padStart(2, '0')}</div>
        </div>
        ${promotedRank ? `<div class="result-promotion">晋爵：${promotedRank.name} · ${promotedRank.title}<br>新俸禄已可在主城领取</div>` : ''}
        <div class="result-rewards">
          ${rewards.wood ? `<span>${resIcon('wood')}${rewards.wood}</span>` : ''}
          ${rewards.food ? `<span>${resIcon('food')}${rewards.food}</span>` : ''}
          ${rewards.stone ? `<span>${resIcon('stone')}${rewards.stone}</span>` : ''}
          ${rewards.gold ? `<span>${resIcon('gold')}${rewards.gold}</span>` : ''}
        </div>
        ${this._lastStageClearBonus ? `
          <div class="stage-clear-bonus" style="margin-top:10px;padding:8px 10px;border:1px solid rgba(255,215,64,0.45);border-radius:8px;background:rgba(255,215,64,0.08);">
            <div style="color:var(--gold);font-size:12px;font-weight:bold;margin-bottom:4px;">通关奖励 · 第 ${wave} 关</div>
            <div class="result-rewards" style="font-size:13px;">
              ${this._lastStageClearBonus.gold ? `<span>${resIcon('gold')}+${this._lastStageClearBonus.gold}</span>` : ''}
              ${this._lastStageClearBonus.gems ? `<span>${resIcon('gems')}+${this._lastStageClearBonus.gems}</span>` : ''}
              ${this._lastStageClearBonus.wood ? `<span>${resIcon('wood')}+${this._lastStageClearBonus.wood}</span>` : ''}
              ${this._lastStageClearBonus.food ? `<span>${resIcon('food')}+${this._lastStageClearBonus.food}</span>` : ''}
              ${this._lastStageClearBonus.stone ? `<span>${resIcon('stone')}+${this._lastStageClearBonus.stone}</span>` : ''}
              ${this._lastStageClearBonus.exp ? `<span>EXP +${this._lastStageClearBonus.exp}</span>` : ''}
            </div>
          </div>` : ''}
        <button class="btn-gold" onclick="this.closest('.battle-result').remove(); UI.renderScreen('city');">返回主城</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  renderShopScreen() {
    const el = document.getElementById('shop-screen');
    el.innerHTML = '<div id="shop-content"></div>';
    ShopManager.renderShop();
  },

  renderMenuScreen() {
    const el = document.getElementById('menu-screen');
    const p = gameState.player;
    const civ = CIVILIZATIONS[p.civilization];

    // Achievements
    const achHtml = ACHIEVEMENTS.map(a => {
      const done = gameState.achievements.includes(a.id);
      return `<div class="stat-row" style="${done ? 'color:var(--success)' : ''}">
        <span>${icon(ASSETS.ach(a.id), 16)} ${a.name}</span>
        <span style="font-size:10px;">${a.desc}</span>
      </div>`;
    }).join('');

    // Daily tasks
    checkDailyReset();
    const taskHtml = DAILY_TASKS.map(t => {
      const progress = gameState.dailyTasks.progress[t.id] || 0;
      const done = progress >= t.target;
      return `<div class="stat-row" style="${done ? 'color:var(--success)' : ''}">
        <span>${done ? '✓' : '○'} ${t.name}</span>
        <span>${progress}/${t.target}</span>
      </div>`;
    }).join('');
    const activeBuffs = getActiveCityBuffs();
    const buffHtml = CITY_CLEAR_BUFFS.map(b => {
      const active = activeBuffs.includes(b);
      return `<div class="stat-row" style="${active ? 'color:var(--success)' : 'color:#666'}">
        <span>${active ? '✓' : '○'} ${b.name}</span>
        <span style="font-size:10px;">${b.desc}</span>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="game-panel">
        <h3>领主信息</h3>
        <div class="stat-row"><span>名称</span><span>${p.name}</span></div>
        <div class="stat-row"><span>等级</span><span>Lv.${p.level}</span></div>
        <div class="stat-row"><span>文明</span><span>${civ ? icon(ASSETS.civ(p.civilization), 16) + civ.name : '-'}</span></div>
        <div class="stat-row"><span>战力</span><span>${ResearchManager.calcPower()}</span></div>
        <div class="stat-row"><span>总Boss击杀</span><span>${gameState.roguelike.totalBossKills}</span></div>
        <div class="stat-row"><span>总战斗次数</span><span>${gameState.roguelike.totalRuns}</span></div>
        <div class="stat-row"><span>无限最高关卡</span><span>${gameState.roguelike.bestInfiniteWave || 0}</span></div>
      </div>

      <div class="game-panel">
        <h3>日常任务</h3>
        ${taskHtml}
      </div>

      <div class="game-panel">
        <h3>成就</h3>
        ${achHtml}
      </div>

      <div class="game-panel">
        <h3>通关加成</h3>
        ${buffHtml}
      </div>

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn-secondary btn-sm" onclick="UI.renderScreen('city')">查看俸禄</button>
        <button class="btn-danger btn-sm" onclick="UI.confirmResetSave()">重置存档</button>
      </div>
    `;
  },

  confirmResetSave() {
    // Some hosts (sandboxed iframes, automation) block window.confirm and the
    // reset would silently no-op. Use an in-DOM modal so it always works.
    const existing = document.getElementById('reset-save-modal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'reset-save-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="max-width:340px;background:#1a1a2e;border:2px solid var(--gold,#ffd740);border-radius:10px;padding:18px;color:#e0e0e0;text-align:center;font-size:14px;line-height:1.6;">
        <div style="color:#ffd740;font-size:16px;font-weight:bold;margin-bottom:10px;">确认重置存档？</div>
        <div>所有英雄、资源、研究进度都会清空，<br>操作不可恢复。</div>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
          <button id="reset-cancel" class="btn-secondary btn-sm" style="padding:8px 18px;">取消</button>
          <button id="reset-ok" class="btn-danger btn-sm" style="padding:8px 18px;">确认重置</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('reset-cancel').addEventListener('click', close);
    document.getElementById('reset-ok').addEventListener('click', () => {
      close();
      if (typeof resetGameAndReload === 'function') {
        resetGameAndReload();
      } else {
        try { deleteSave(); } catch (_) {}
        location.reload();
      }
    });
  },

  collectAllResources() {
    const result = claimSalary();
    this.showToast(result.msg);
    this.updateTopBar();
  },

  showBuildingMenu(buildingId) {
    this.showToast('主城建设已替换为爵位俸禄');
  },

  showBuildMenu(gridX, gridY) {
    this.showToast('主城建设已替换为爵位俸禄');
  },

  closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    if (modals.length > 0) modals[modals.length - 1].remove();
  },

  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = 'position:fixed; top:60px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#fff; padding:8px 20px; border-radius:20px; font-size:13px; z-index:1000; animation:fadeInUp 0.3s ease; white-space:nowrap;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  },

  startAutoSave() {
    if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
    this._autoSaveInterval = setInterval(() => {
      if (!gameState || window.__heroResetting) return;
      saveGame({ force: true });
    }, 60000);
  },

  startTimerUpdates() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    let lastEnergy = gameState?.player?.energy;
    this._timerInterval = setInterval(() => {
      if (!gameState || window.__heroResetting) return;
      // Energy refill (1 per minute)
      refillEnergy();
      // Refresh top bar / energy display when energy changed
      if (gameState?.player && gameState.player.energy !== lastEnergy) {
        lastEnergy = gameState.player.energy;
        try { this.updateTopBar(); } catch (_) {}
      }
      if (this.currentScreen === 'city') {
        const salaryBtn = document.querySelector('.salary-claim[disabled]');
        if (salaryBtn && getSalaryStatus().canClaim) this.renderScreen('city');
      }
    }, 1000);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});

// Accept screen-switch commands from the outer Vue wrapper (play.vue).
// Allowed screens mirror the original 5-tab nav.
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.source !== 'hero-host') return;
  if (data.type === 'switch-screen') {
    const allowed = ['city', 'hero', 'research', 'shop', 'menu'];
    if (allowed.includes(data.screen)) {
      try { UI.renderScreen(data.screen); } catch (_) {}
    }
  } else if (data.type === 'request-state') {
    UI._notifyOuterScreen(UI.currentScreen || 'city');
  } else if (data.type === 'save-now') {
    let ok = false;
    try { ok = Boolean(saveGame({ force: true })); } catch (_) {}
    try {
      window.parent.postMessage({ source: 'hero-game', type: 'save-complete', requestId: data.requestId, ok }, '*');
    } catch (_) {}
  }
});
