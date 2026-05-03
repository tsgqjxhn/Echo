// ============================================================
// Main game loop — initialization, tick, auto-save
// ============================================================

class Game {
  constructor() {
    this.player = new Player();
    this.cultivationSystem = new CultivationSystem(this.player);
    this.techniqueSystem = new TechniqueSystem(this.player);
    this.alchemySystem = new AlchemySystem(this.player);
    this.combatSystem = new CombatSystem(this.player);
    this.inventorySystem = new InventorySystem(this.player);
    this.explorationSystem = new ExplorationSystem(this.player, this.combatSystem);
    this.sectSystem = new SectSystem(this.player);
    this.auctionSystem = new AuctionSystem(this.player);
    this.worldSystem = new WorldSystem(this.player);
    this.forgeSystem = new ForgeSystem(this.player);
    this.saveSystem = new SaveSystem();
    this.ui = new UIManager(this);

    // Automation toggles
    this.autoBreakthrough = false;
    this.autoArray = false;

    this.tickInterval = null;
    this.saveInterval = null;
    this.lastTickTime = Date.now();
    this._lastDay = new Date().getDate();

    this.init();
  }

  init() {
    // Try to load save
    const savedData = this.saveSystem.load();
    if (savedData) {
      this.player.deserialize(savedData);
      this._handleOfflineEarnings(savedData.lastOnlineTime);
      // Backfill random NPCs for existing saves
      if (!this.player.randomNpcs || this.player.randomNpcs.length === 0) {
        this.worldSystem.populateSectNpcs();
      }
    } else {
      this.initNewGame();
    }

    // Start game tick (1 second)
    this.tickInterval = setInterval(() => this.tick(), 1000);

    // Auto-save every 60 seconds
    this.saveInterval = setInterval(() => {
      this.saveSystem.save(this.player, { force: true });
      document.getElementById('sidebar-footer').textContent =
        `已保存 ${new Date().toLocaleTimeString()}`;
    }, 60000);

    // Initial render
    this.ui.updateStatusBar();
    this.ui.renderPanel(this.ui.currentPanel);

    // Start tutorial for first-time players (after new game flow)
    setTimeout(() => {
      if (typeof TutorialSystem !== 'undefined' && TutorialSystem.shouldShow && TutorialSystem.shouldShow()) {
        TutorialSystem.start();
      }
    }, 2000);

    // First-time players: profession → talents → birthplace
    this.ui.continueNewGameFlow();

  }

  initNewGame() {
    this.player = new Player();
    this.player.hp = this.player.maxHp;
    this.player.recalcStats();

    // Re-link systems
    this.cultivationSystem = new CultivationSystem(this.player);
    this.techniqueSystem = new TechniqueSystem(this.player);
    this.alchemySystem = new AlchemySystem(this.player);
    this.combatSystem = new CombatSystem(this.player);
    this.inventorySystem = new InventorySystem(this.player);
    this.explorationSystem = new ExplorationSystem(this.player, this.combatSystem);
    this.sectSystem = new SectSystem(this.player);
    this.auctionSystem = new AuctionSystem(this.player);
    this.worldSystem = new WorldSystem(this.player);
    this.forgeSystem = new ForgeSystem(this.player);

    // Populate sects with random NPCs
    this.worldSystem.populateSectNpcs();
  }

  _handleOfflineEarnings(lastTimestamp) {
    if (!lastTimestamp) return;

    const result = this.cultivationSystem.calculateOffline(lastTimestamp);
    if (result.cheated) {
      this.ui.showToast('检测到时间异常，离线收益已取消', 'error');
      return;
    }

    if (result.earned > 0 || result.earnedStones > 0) {
      const hours = Math.floor(result.seconds / 3600);
      const mins = Math.floor((result.seconds % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;

      let msg = `闭关 ${timeStr}\n\n获得修为：${BigNum.format(result.earned)}`;
      if (result.earnedStones > 0) {
        msg += `\n获得灵石：${BigNum.format(result.earnedStones)}`;
      }

      setTimeout(() => {
        this.ui._showModal('离线收益', msg, null);
      }, 500);
    }
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    // Cultivation tick
    this.cultivationSystem.tick();

    // Garden tick
    if (this.player.gardenLevel > 0) {
      const gardenData = GameData.gardenUpgrades[this.player.gardenLevel - 1];
      if (gardenData) {
        this.player.gardenTimer -= dt;
        if (this.player.gardenTimer <= 0) {
          this.player.gardenTimer = gardenData.interval;
          BigNum.give(this.player.inventory, { lingcao: gardenData.yield });
        }
      }
    }

    // Spirit regen
    if (this.player.spirit < this.player.maxSpirit) {
      this.player.spirit = Math.min(
        this.player.maxSpirit,
        this.player.spirit + this.player.spiritRegenRate / 60
      );
    }

    if (this.player.hp < this.player.maxHp && this.player.hpRegenPct > 0) {
      this.player.hp = Math.min(
        this.player.maxHp,
        this.player.hp + this.player.maxHp * this.player.hpRegenPct / 60
      );
    }

    // Passive spirit stone income: half of current cultivation rate
    const rate = this.player.getCultivationRate();
    if (rate > 0) {
      const stoneMult = this.player.talentModifiers ? (this.player.talentModifiers.stoneIncomeMult || 1) : 1;
      this.player.spiritStones += Math.max(1, Math.floor(rate / 2 * stoneMult));
    }

    // Auto-breakthrough
    if (this.autoBreakthrough) {
      const next = this.player.getNextRealm();
      if (next && this.player.cultivation >= next.breakthroughCost) {
        const needsPill = next.breakthroughItem;
        const hasPill = !needsPill || (this.player.inventory[next.breakthroughItem] || 0) > 0;
        if (hasPill) {
          const result = this.cultivationSystem.attemptBreakthrough([]);
          if (result.success) {
            this.ui.showToast(`自动突破成功！晋升${result.realm.name}！`, 'legendary');
          }
        }
      }
    }

    // Auto-upgrade array
    if (this.autoArray) {
      const nextArray = GameData.arrayUpgrades[this.player.arrayLevel];
      if (nextArray && this.player.spiritStones >= nextArray.cost * 2) {
        this.player.spiritStones -= nextArray.cost;
        this.player.arrayLevel++;
      }
    }

    // Stats
    this.player.stats.totalPlayTime += dt;

    // Daily reset for sect dailies
    const today = new Date().getDate();
    if (today !== this._lastDay) {
      this._lastDay = today;
      if (this.sectSystem.hasSect()) {
        this.sectSystem.resetDailies();
      }
    }

    // Update UI
    this.ui.updateStatusBar();

    // Update current panel (throttled for performance)
    if (Math.random() < 0.2) { // ~every 5 seconds on average
      this.ui.renderPanel(this.ui.currentPanel);
    }
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

// Accept screen-switch commands from the outer Vue wrapper (play.vue).
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.source !== 'xiuxian-host') return;
  if (data.type === 'switch-screen') {
    const allowed = ['cultivation', 'world', 'cave', 'exploration', 'inventory', 'shop', 'sect', 'favor', 'auction', 'settings'];
    if (allowed.includes(data.screen)) {
      try { window.game && window.game.ui && window.game.ui.switchPanel(data.screen); } catch (_) {}
    }
  } else if (data.type === 'request-state') {
    try {
      const cur = (window.game && window.game.ui && window.game.ui.currentPanel) || 'cultivation';
      window.game.ui._notifyOuterScreen(cur);
    } catch (_) {}
  } else if (data.type === 'save-now') {
    let ok = false;
    try {
      ok = Boolean(window.game && window.game.saveSystem && window.game.saveSystem.save(window.game.player, { force: true }));
    } catch (_) {}
    try {
      window.parent.postMessage({ source: 'xiuxian-game', type: 'save-complete', requestId: data.requestId, ok }, '*');
    } catch (_) {}
  }
});
