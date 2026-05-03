// ============================================================
// Tutorial System — guides new players through first play
// ============================================================

const TutorialSystem = {
  // Steps definition. `panel` will switch the in-game panel for the step,
  // `highlight` is the CSS selector to pulse so the player sees what to look at.
  steps: [
    {
      id: 'welcome',
      title: '欢迎来到问道长生',
      content: '这是一款修仙放置游戏。你将从一个普通凡人开始，通过修炼、探险、炼丹，逐步提升境界，最终追求长生大道。',
      panel: 'cultivation',
      highlight: null,
      action: '点击"下一步"开始你的修仙之旅',
    },
    {
      id: 'cultivation',
      title: '修炼系统',
      content: '这是你的修炼界面。修为会自动增长，当前境界和修炼速度显示在顶部状态栏。当修为积累到一定程度，就可以尝试突破到下一个境界。',
      panel: 'cultivation',
      highlight: '#panel-cultivation',
      action: '修为会自动增长，留意顶部的状态栏',
    },
    {
      id: 'breakthrough',
      title: '境界突破',
      content: '当修为达到当前境界的上限时，可以消耗对应的突破丹药尝试突破。突破成功率受多种因素影响，失败后会积累保底几率。大境界突破（如炼气→筑基）时，可使用天材地宝提升成功率。',
      panel: 'cultivation',
      highlight: '#btn-breakthrough',
      action: '当修为足够时，点击"尝试突破"按钮',
    },
    {
      id: 'cave',
      title: '洞府系统',
      content: '洞府是你的修炼基地。在这里可以升级聚灵阵（提升修炼速度）、经营灵植园（产出灵草），还能解锁炼丹和炼器功能。',
      panel: 'cave',
      highlight: '.nav-item[data-panel="cave"]',
      action: '已为你切换到洞府界面',
    },
    {
      id: 'alchemy',
      title: '炼丹系统',
      content: '解锁炼丹功能后，你可以收集材料炼制各种丹药。炼制过程中需要控制火候，保持在绿色区域可以获得最佳品质。丹药可用于突破、恢复生命、提升修炼速度等。',
      panel: 'cave',
      highlight: '#btn-cave-alchemy',
      action: '在洞府界面找到"炼丹"按钮',
    },
    {
      id: 'exploration',
      title: '探险系统',
      content: '探险是获取材料的主要途径。选择适合你当前境界的区域进行探险，消耗神识探索各个节点。途中可能遇到采集点、奇遇事件和妖兽战斗。',
      panel: 'exploration',
      highlight: '.nav-item[data-panel="exploration"]',
      action: '已为你切换到探险界面',
    },
    {
      id: 'combat',
      title: '战斗系统',
      content: '战斗中你可以装备外功和内功来增强战斗力。外功主要提升攻击，内功增强防御或提供特殊效果。合理使用回血丹，在战斗中恢复生命。击败妖兽可获得材料和灵石。',
      panel: 'exploration',
      highlight: '#panel-exploration',
      action: '战斗中选择功法后点击"下一回合"',
    },
    {
      id: 'sect',
      title: '宗门系统',
      content: '加入宗门可以获得修炼加成、俸禄和宗门商店。通过完成宗门任务提升贡献度和职位，从杂役弟子一步步晋升为宗门掌门。',
      panel: 'sect',
      highlight: '.nav-item[data-panel="sect"]',
      action: '已为你切换到宗门界面',
    },
  ],

  currentStep: 0,
  active: false,
  completed: false,
  _highlightedEl: null,
  _resizeHandler: null,

  // Check if tutorial should be shown — always once per device, never repeats.
  shouldShow() {
    if (this.completed) return false;
    try {
      const raw = localStorage.getItem('xiuxian_tutorial');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && (data.completed || data.skipped)) {
          this.completed = true;
          return false;
        }
      }
    } catch (e) {}
    return true;
  },

  // Start tutorial
  start() {
    if (!this.shouldShow()) return false;
    this.active = true;
    this.currentStep = 0;
    this._render();
    return true;
  },

  // Mark tutorial as completed and give newbie gift
  complete() {
    this.active = false;
    this.completed = true;
    try {
      localStorage.setItem('xiuxian_tutorial', JSON.stringify({ completed: true, completedAt: Date.now() }));
    } catch (e) {}
    // Give newbie gift
    if (window.game && window.game.player) {
      const p = window.game.player;
      p.spiritStones = (p.spiritStones || 0) + 500;
      p.inventory = p.inventory || {};
      p.inventory['xiulian_dan'] = (p.inventory['xiulian_dan'] || 0) + 5;
      p.inventory['huixue_dan'] = (p.inventory['huixue_dan'] || 0) + 3;
      p.inventory['lingcao'] = (p.inventory['lingcao'] || 0) + 20;
      // Show completion message with gift info
      setTimeout(() => {
        if (window.game.ui) {
          window.game.ui.showToast('完成新手引导！获得新手礼包：灵石x500、修炼丹x5、回血丹x3、灵草x20', 'legendary');
        }
      }, 300);
    }
    this._remove();
  },

  // Skip tutorial
  skip() {
    this.active = false;
    this.completed = true;
    try {
      localStorage.setItem('xiuxian_tutorial', JSON.stringify({ completed: true, skipped: true, completedAt: Date.now() }));
    } catch (e) {}
    this._remove();
  },

  // Next step
  next() {
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.complete();
      return;
    }
    this._render();
  },

  // Previous step
  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._render();
    }
  },

  // Switch the in-game panel for the current step so the player actually sees it.
  _navigateForStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    // Switch panels via the UI manager
    if (step.panel && window.game && window.game.ui && typeof window.game.ui.switchPanel === 'function') {
      try {
        if (window.game.ui.currentPanel !== step.panel) {
          window.game.ui.switchPanel(step.panel);
        }
      } catch (_) {}
    }
  },

  // Apply pulsing highlight to the relevant element after the panel is rendered.
  _applyHighlight() {
    this._clearHighlight();
    const step = this.steps[this.currentStep];
    if (!step || !step.highlight) return;

    // Wait one frame for the panel to be re-rendered before highlighting.
    requestAnimationFrame(() => {
      try {
        const el = document.querySelector(step.highlight);
        if (!el) return;
        el.classList.add('tutorial-highlight');
        this._highlightedEl = el;
        // Bring it into view smoothly so the user actually sees what's pulsing.
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (_) {}
      } catch (_) {}
    });
  },

  _clearHighlight() {
    if (this._highlightedEl) {
      try { this._highlightedEl.classList.remove('tutorial-highlight'); } catch (_) {}
      this._highlightedEl = null;
    }
  },

  // Render tutorial overlay
  _render() {
    this._remove();
    const step = this.steps[this.currentStep];
    if (!step) return;

    // Step navigation must run BEFORE rendering the card so the right panel is showing.
    this._navigateForStep();

    const total = this.steps.length;
    const progressPct = Math.round(((this.currentStep + 1) / total) * 100);

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-backdrop"></div>
      <div class="tutorial-card" role="dialog" aria-modal="true" aria-label="新手引导">
        <div class="tutorial-progress"><i style="width:${progressPct}%"></i></div>
        <div class="tutorial-header">
          <span class="tutorial-badge">新手引导</span>
          <span class="tutorial-step">${this.currentStep + 1} / ${total}</span>
        </div>
        <div class="tutorial-title">${step.title}</div>
        <div class="tutorial-content">${step.content}</div>
        ${step.action ? `<div class="tutorial-action">${step.action}</div>` : ''}
        <div class="tutorial-buttons">
          ${this.currentStep > 0 ? '<button class="btn btn-sm" id="tutorial-prev">上一步</button>' : '<span></span>'}
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" id="tutorial-skip">跳过</button>
            <button class="btn btn-primary btn-sm" id="tutorial-next">${this.currentStep === total - 1 ? '完成' : '下一步'}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Bind buttons
    document.getElementById('tutorial-prev')?.addEventListener('click', () => this.prev());
    document.getElementById('tutorial-next')?.addEventListener('click', () => this.next());
    document.getElementById('tutorial-skip')?.addEventListener('click', () => this.skip());

    // Apply pulsing highlight on the relevant target
    this._applyHighlight();
  },

  // Remove tutorial overlay
  _remove() {
    this._clearHighlight();
    const existing = document.getElementById('tutorial-overlay');
    if (existing) existing.remove();
  },

  // Check if tutorial is currently active
  isActive() {
    return this.active;
  },
};
