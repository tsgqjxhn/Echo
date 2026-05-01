// ============================================================
// Research System
// ============================================================

const ResearchManager = {
  ensureState() {
    if (!gameState.researchLevels || Array.isArray(gameState.researchLevels)) {
      gameState.researchLevels = {};
    }

    // Old saves stored one-time researched tech ids in completedTechs.
    // Treat those as Lv.1 so players can continue upgrading toward 100%.
    if (Array.isArray(gameState.completedTechs)) {
      for (const techId of gameState.completedTechs) {
        if (findTechById(techId) && !gameState.researchLevels[techId]) {
          gameState.researchLevels[techId] = 1;
        }
      }
    }
  },

  getLevel(techId) {
    this.ensureState();
    return Math.max(0, Number(gameState.researchLevels[techId] || 0));
  },

  getBonus(effectKey) {
    this.ensureState();
    let total = 0;
    for (const techs of Object.values(TECH_TREE)) {
      for (const tech of techs) {
        const perLevel = tech.effects?.[effectKey] || 0;
        if (perLevel) total += perLevel * this.getLevel(tech.id);
      }
    }
    return total;
  },

  getBattleBonus(stat) {
    switch (stat) {
      case 'attack':
        return this.getBonus('troopAtk') + this.getBonus('rogueAtk');
      case 'hp':
        return this.getBonus('troopHp') + this.getBonus('rogueHp');
      case 'speed':
        return this.getBonus('rogueSpeed');
      case 'crit':
        return this.getBonus('rogueCrit');
      case 'resource':
        return this.getBonus('rogueRes');
      case 'luck':
        return this.getBonus('rogueLuck');
      default:
        return 0;
    }
  },

  getProductionBonus(resourceKey) {
    return this.getBonus(`${resourceKey}Prod`);
  },

  calcPower() {
    let power = 0;
    power += getCompletedMajorCities() * 500;
    for (const h of gameState.heroes || []) power += h.level * 50 + h.stars * 100;
    power += gameState.player.level * 200;

    this.ensureState();
    for (const level of Object.values(gameState.researchLevels)) {
      power += Number(level || 0) * 35;
    }
    return power;
  },

  getSummary() {
    this.ensureState();
    let levels = 0;
    let maxLevels = 0;
    for (const techs of Object.values(TECH_TREE)) {
      for (const tech of techs) {
        levels += this.getLevel(tech.id);
        maxLevels += tech.maxLevel;
      }
    }
    return {
      levels,
      maxLevels,
      percent: maxLevels ? Math.floor((levels / maxLevels) * 100) : 0
    };
  },

  render() {
    const el = document.getElementById('research-screen');
    if (!el) return;
    this.ensureState();

    const summary = this.getSummary();
    const battleAtk = formatPct(this.getBattleBonus('attack'));
    const battleHp = formatPct(this.getBattleBonus('hp'));
    const battleRes = formatPct(this.getBattleBonus('resource'));

    el.innerHTML = `
      <div class="research-header">
        <div>
          <h2>研究院</h2>
          <p>把每项研究逐级提升到 100%，长期强化城市与战斗。</p>
        </div>
        <div class="research-total">
          <strong>${summary.percent}%</strong>
          <span>总进度</span>
        </div>
      </div>

      <div class="research-summary">
        <div><span>战斗攻击</span><strong>+${battleAtk}</strong></div>
        <div><span>战斗生命</span><strong>+${battleHp}</strong></div>
        <div><span>战斗收益</span><strong>+${battleRes}</strong></div>
      </div>

      ${Object.entries(TECH_TREE).map(([branchKey, techs]) => this.renderBranch(branchKey, techs)).join('')}
    `;
  },

  renderBranch(branchKey, techs) {
    const branch = TECH_BRANCHES[branchKey];
    return `
      <section class="research-branch">
        <div class="research-branch-title">
          <h3>${branch.name}</h3>
          <span>${branch.desc}</span>
        </div>
        <div class="research-grid">
          ${techs.map(tech => this.renderTechCard(tech)).join('')}
        </div>
      </section>
    `;
  },

  renderTechCard(tech) {
    const level = this.getLevel(tech.id);
    const maxLevel = tech.maxLevel || 1;
    const done = level >= maxLevel;
    const percent = Math.floor((level / maxLevel) * 100);
    const cost = getTechCost(tech, level);
    const effects = Object.entries(tech.effects || {});
    const current = effects.map(([key, value]) => {
      return `<span>${TECH_EFFECT_LABELS[key] || key}: +${formatPct(value * level)}</span>`;
    }).join('');
    const next = effects.map(([key, value]) => {
      return `<span>${TECH_EFFECT_LABELS[key] || key}: +${formatPct(value * Math.min(level + 1, maxLevel))}</span>`;
    }).join('');

    return `
      <article class="research-card ${done ? 'maxed' : ''}">
        <div class="research-card-main">
          ${icon(ASSETS.tech(tech.id), 34, tech.name)}
          <div>
            <h4>${tech.name}</h4>
            <p>${tech.desc}</p>
          </div>
          <strong>${percent}%</strong>
        </div>
        <div class="research-progress">
          <div style="width:${percent}%"></div>
        </div>
        <div class="research-effects">
          <div><b>当前</b>${current || '<span>暂无加成</span>'}</div>
          <div><b>下级</b>${done ? '<span>已达上限</span>' : next}</div>
        </div>
        <div class="research-actions">
          <span>Lv.${level}/${maxLevel}</span>
          ${done
            ? '<button class="btn-sm btn-secondary" disabled>已满级</button>'
            : `<button class="btn-sm btn-gold" onclick="ResearchManager.upgrade('${tech.id}')">研究 ${resIcon('gold')}${cost.gold}</button>`}
        </div>
      </article>
    `;
  },

  upgrade(techId) {
    this.ensureState();
    const tech = findTechById(techId);
    if (!tech) return;

    const level = this.getLevel(techId);
    if (level >= tech.maxLevel) {
      UI.showToast('该研究已达到100%');
      return;
    }

    const cost = getTechCost(tech, level);
    if (!canAfford(cost)) {
      UI.showToast('黄金不足');
      return;
    }

    spendResources(cost);
    gameState.researchLevels[techId] = level + 1;

    if (gameState.researchLevels[techId] >= tech.maxLevel && Array.isArray(gameState.completedTechs) && !gameState.completedTechs.includes(techId)) {
      gameState.completedTechs.push(techId);
    }

    gameState.researchQueue = null;
    saveGame();
    UI.showToast(`${tech.name} 提升至 ${Math.floor((gameState.researchLevels[techId] / tech.maxLevel) * 100)}%`);
    this.render();
    UI.updateTopBar();
  }
};
