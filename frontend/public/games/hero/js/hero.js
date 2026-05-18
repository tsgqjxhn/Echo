// ============================================================
// Hero Management System
// ============================================================

// ===== Hero Passive Skills =====
const HERO_PASSIVE_SKILLS = {
  // Commander passives
  commander: [
    { id: 'counter', name: '反击', desc: '受击时30%概率反击，造成50%攻击伤害', procChance: 0.30, dmgMult: 0.5 },
    { id: 'fortress', name: '坚韧', desc: 'HP低于30%时防御提升，受到的伤害减少25%', hpThreshold: 0.3, dmgReduce: 0.25 }
  ],
  // Defender passives
  defender: [
    { id: 'ironwill', name: '钢铁意志', desc: '最大HP+15%，受到的治疗效果+20%', hpBonus: 0.15, healBonus: 0.2 },
    { id: 'thorns', name: '荆棘反伤', desc: '受到伤害时反弹20%给攻击者', reflectDmg: 0.2 }
  ],
  // Support passives
  support: [
    { id: 'elemental', name: '元素亲和', desc: '魔法伤害+20%，技能冷却-15%', magicBonus: 0.2, cdr: 0.15 },
    { id: 'manaregen', name: '法力回流', desc: '击杀敌人时恢复3%最大HP并减少技能冷却1秒', hpRestore: 0.03, cdReduce: 1 }
  ],
  // Ranger passives
  ranger: [
    { id: 'headshot', name: '爆头', desc: '攻击时10%概率造成3倍暴击伤害', procChance: 0.1, critMult: 3.0 },
    { id: 'agility', name: '敏捷', desc: '闪避率+15%，移动速度+10%', dodgeBonus: 0.15, spdBonus: 0.1 }
  ]
};

const HeroPassives = {
  getPassives(heroClass) {
    return HERO_PASSIVE_SKILLS[heroClass] || [];
  },

  applyBattlePassives(heroClass, stats) {
    const passives = this.getPassives(heroClass);
    for (const p of passives) {
      if (p.hpBonus) stats.hp = Math.floor(stats.hp * (1 + p.hpBonus));
      if (p.spdBonus) stats.spd *= (1 + p.spdBonus);
      if (p.dodgeBonus) stats.dodgeRate = (stats.dodgeRate || 0) + p.dodgeBonus;
      if (p.magicBonus) stats.magicBonus = p.magicBonus;
      if (p.cdr) stats.cooldownReduction = p.cdr;
    }
    return stats;
  },

  checkCounterAttack(heroClass) {
    const passives = this.getPassives(heroClass);
    const counter = passives.find(p => p.id === 'counter');
    if (counter && Math.random() < counter.procChance) return counter.dmgMult;
    return 0;
  },

  checkHeadshot(heroClass) {
    const passives = this.getPassives(heroClass);
    const headshot = passives.find(p => p.id === 'headshot');
    if (headshot && Math.random() < headshot.procChance) return headshot.critMult;
    return 1;
  },

  checkDodge(heroClass) {
    const passives = this.getPassives(heroClass);
    const agility = passives.find(p => p.id === 'agility');
    if (agility && Math.random() < agility.dodgeBonus) return true;
    return false;
  },

  checkFortressMode(heroClass, hpPercent) {
    const passives = this.getPassives(heroClass);
    const fortress = passives.find(p => p.id === 'fortress');
    if (fortress && hpPercent < fortress.hpThreshold) return fortress.dmgReduce;
    return 0;
  },

  checkManaFlow(heroClass) {
    const passives = this.getPassives(heroClass);
    const manaregen = passives.find(p => p.id === 'manaregen');
    if (manaregen) return { hpRestore: manaregen.hpRestore, cdReduce: manaregen.cdReduce };
    return null;
  },

  checkThorns(heroClass) {
    const passives = this.getPassives(heroClass);
    const thorns = passives.find(p => p.id === 'thorns');
    if (thorns) return thorns.reflectDmg;
    return 0;
  },

  // Format passives for display
  getPassiveDescriptions(heroClass) {
    const passives = this.getPassives(heroClass);
    return passives.map(p => `<span style="color:var(--accent);font-size:11px;">[${p.name}]</span> <span style="color:var(--text-dim);font-size:11px;">${p.desc}</span>`).join('<br>');
  }
};

const HeroManager = {
  getHero(id) {
    if (!gameState || !gameState.heroes) return null;
    return gameState.heroes.find(h => h.id === id);
  },

  getTemplate(heroId) {
    return HERO_TEMPLATES.find(t => t.id === heroId);
  },

  hasHero(templateId) {
    if (!gameState || !gameState.heroes) return false;
    return gameState.heroes.some(h => h.templateId === templateId);
  },

  addHero(templateId) {
    if (this.hasHero(templateId)) return null;

    const template = this.getTemplate(templateId);
    if (!template) return null;

    const hero = {
      id: 'hero_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      templateId: template.id,
      name: template.name,
      rarity: template.rarity,
      heroClass: template.heroClass,
      level: 1,
      exp: 0,
      stars: HERO_RARITIES[template.rarity].stars,
      maxStars: 5,
      hp: template.baseHp,
      atk: template.baseAtk,
      spd: template.baseSpd,
      skill: template.skill,
      skillLevel: 1,
      equipped: { weapon: null, armor: null, accessory: null }
    };

    gameState.heroes.push(hero);
    saveGame();
    return hero;
  },

  getExpToNext(level) {
    return Math.floor(50 * Math.pow(1.3, level - 1));
  },

  addExp(heroId, amount) {
    const hero = this.getHero(heroId);
    if (!hero) return;

    hero.exp += amount;
    let leveled = false;

    while (hero.exp >= this.getExpToNext(hero.level)) {
      hero.exp -= this.getExpToNext(hero.level);
      hero.level++;
      leveled = true;

      // Stat growth
      const template = this.getTemplate(hero.templateId);
      const growthRate = HERO_RARITIES[hero.rarity].baseStat / 10;
      hero.hp += Math.floor(template.baseHp * 0.08 + hero.level * growthRate);
      hero.atk += Math.floor(template.baseAtk * 0.06 + hero.level * growthRate * 0.5);
      hero.spd += 0.02;
    }

    saveGame();
    return leveled;
  },

  starUp(heroId) {
    const hero = this.getHero(heroId);
    if (!hero || hero.stars >= hero.maxStars) return { ok: false, msg: '已达最高星级' };

    const cost = {
      gold: hero.stars * 200,
      gems: hero.stars * 20
    };

    if (!canAfford(cost)) return { ok: false, msg: '资源不足' };

    spendResources(cost);
    hero.stars++;

    // Stat boost
    const template = this.getTemplate(hero.templateId);
    hero.hp += Math.floor(template.baseHp * 0.15);
    hero.atk += Math.floor(template.baseAtk * 0.12);

    saveGame();
    return { ok: true, msg: `${hero.name}升至${hero.stars}星` };
  },

  upgradeSkill(heroId) {
    const hero = this.getHero(heroId);
    if (!hero) return { ok: false, msg: '英雄不存在' };

    const cost = { gold: hero.skillLevel * 300 };
    if (!canAfford(cost)) return { ok: false, msg: '黄金不足' };

    spendResources(cost);
    hero.skillLevel++;
    saveGame();
    return { ok: true, msg: `${hero.skill}升至${hero.skillLevel}级` };
  },

  selectHeroForBattle(heroId) {
    const hero = this.getHero(heroId);
    if (!hero) return;
    if (!gameState) return;
    gameState.selectedHero = heroId;
    saveGame();
  },

  getBattleStats(heroId) {
    const hero = this.getHero(heroId);
    if (!hero) return null;

    const template = this.getTemplate(hero.templateId);
    const starBonus = 1 + (hero.stars - 1) * 0.08;
    const skillBonus = 1 + (hero.skillLevel - 1) * 0.05;

    return {
      hp: Math.floor(hero.hp * starBonus),
      atk: Math.floor(hero.atk * starBonus * skillBonus),
      spd: hero.spd,
      skill: hero.skill,
      skillDesc: template.skillDesc,
      skillLevel: hero.skillLevel,
      heroClass: hero.heroClass,
      rarity: hero.rarity,
      level: hero.level,
      name: hero.name,
      templateId: hero.templateId
    };
  },

  getSortedHeroes(sortBy) {
    if (!gameState || !gameState.heroes) return [];
    const heroes = [...gameState.heroes];
    switch (sortBy || 'rarity') {
      case 'rarity':
        const order = { legendary: 0, epic: 1, rare: 2, normal: 3 };
        heroes.sort((a, b) => order[a.rarity] - order[b.rarity] || b.level - a.level);
        break;
      case 'level':
        heroes.sort((a, b) => b.level - a.level);
        break;
      case 'class':
        heroes.sort((a, b) => a.heroClass.localeCompare(b.heroClass));
        break;
    }
    return heroes;
  },

  renderHeroList() {
    if (!gameState) return;
    const container = document.getElementById('hero-list');
    if (!container) return;

    // Show hero list again if it was hidden by detail view
    container.style.display = '';
    const detailEl = document.getElementById('hero-detail');
    if (detailEl) detailEl.innerHTML = '';

    const heroes = this.getSortedHeroes();
    if (heroes.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>还没有英雄</p><p>前往酒馆招募英雄吧！</p></div>';
      return;
    }

    let html = '<div class="hero-grid">';
    for (const hero of heroes) {
      const rarity = HERO_RARITIES[hero.rarity];
      const cls = HERO_CLASSES[hero.heroClass];
      const isSelected = gameState.selectedHero === hero.id;
      const template = this.getTemplate(hero.templateId);

      html += `<div class="hero-card ${isSelected ? 'selected' : ''}" style="border-color: ${rarity.color}" onclick="HeroManager.renderHeroDetail('${hero.id}')">
        <div class="hero-rarity" style="background:${rarity.color}">${rarity.name}</div>
        <div class="hero-avatar" style="background:${rarity.color}33">${icon(ASSETS.hero(template.id), 40)}</div>
        <div class="hero-card-name">${hero.name}</div>
        <div class="hero-stars">${'★'.repeat(hero.stars)}${'☆'.repeat(hero.maxStars - hero.stars)}</div>
        <div class="hero-card-level">Lv.${hero.level}</div>
        ${isSelected ? '<div class="hero-selected-badge">出战</div>' : ''}
      </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  },

  renderHeroDetail(heroId) {
    if (!gameState) return;
    const hero = this.getHero(heroId);
    if (!hero) return;

    // Hide hero list so detail + buttons are visible without scrolling
    const listEl = document.getElementById('hero-list');
    if (listEl) listEl.style.display = 'none';

    const template = this.getTemplate(hero.templateId);
    const rarity = HERO_RARITIES[hero.rarity];
    const cls = HERO_CLASSES[hero.heroClass];
    const stats = this.getBattleStats(heroId);
    const expToNext = this.getExpToNext(hero.level);
    const isSelected = gameState.selectedHero === heroId;
    const weapon = WEAPONS[template.weapon] || WEAPONS.sword;

    const attackTypeLabel = { melee: '近战', projectile: '远程', aoe: '范围' }[weapon.type] || weapon.type;
    const classDesc = { commander: '提升全军攻击，适合带领部队正面突破', defender: '高生命高防御，近战抗伤先锋', support: '治疗增益辅助，保障队伍续航', ranger: '远程高输出，灵活游走击杀' }[hero.heroClass] || cls.bonus;

    let html = `
      <div class="hero-detail" style="border-color: ${rarity.color}">
        <button class="btn-back" id="btn-hero-back">返回</button>

        <div class="hero-detail-header" style="background: ${rarity.color}22">
          <div class="hero-detail-avatar" style="background: ${rarity.color}44">${icon(ASSETS.hero(hero.templateId), 56)}</div>
          <div class="hero-detail-info">
            <h2 style="color: ${rarity.color}">${hero.name}</h2>
            <div class="hero-stars">${'★'.repeat(hero.stars)}${'☆'.repeat(hero.maxStars - hero.stars)}</div>
            <div>${rarity.name} · ${cls.name} · Lv.${hero.level}</div>
            <div class="exp-bar">
              <div class="exp-fill" style="width: ${(hero.exp / expToNext) * 100}%"></div>
              <span>${hero.exp}/${expToNext}</span>
            </div>
          </div>
        </div>

        <div class="hero-stats">
          <h3>属性</h3>
          <div class="stat-row"><span>生命</span><span>${stats.hp}</span></div>
          <div class="stat-row"><span>攻击</span><span>${stats.atk}</span></div>
          <div class="stat-row"><span>速度</span><span>${stats.spd.toFixed(1)}</span></div>
        </div>

        <div class="hero-stats">
          <h3>战斗信息</h3>
          <div class="stat-row"><span>职业</span><span>${cls.name} — ${classDesc}</span></div>
          <div class="stat-row"><span>武器</span><span>${weapon.name}</span></div>
          <div class="stat-row"><span>攻击方式</span><span>${attackTypeLabel}</span></div>
          <div class="stat-row"><span>攻击范围</span><span>${weapon.range}</span></div>
          <div class="stat-row"><span>攻击速度</span><span>${weapon.speed}s</span></div>
        </div>

        <div class="hero-skill">
          <h3>${hero.skill} (Lv.${hero.skillLevel})</h3>
          <p>${template.skillDesc}</p>
        </div>

        <div class="hero-passives" style="margin:12px 0;padding:10px;background:rgba(79,195,247,0.08);border-radius:6px;border:1px solid rgba(79,195,247,0.2);">
          <h3 style="color:var(--accent);font-size:13px;margin-bottom:6px;">被动技能</h3>
          <p style="font-size:12px;color:var(--text-dim);line-height:1.6;">${HeroPassives.getPassiveDescriptions(hero.heroClass)}</p>
        </div>

        <div class="hero-actions">
          <button class="btn-primary" id="btn-select-hero">
            ${isSelected ? '当前出战中' : '设为出战英雄'}
          </button>
          <button class="btn-secondary" id="btn-star-up">
            升星 (${hero.stars * 200}${resIcon('gold')} + ${hero.stars * 20}${resIcon('gems')})
          </button>
          <button class="btn-secondary" id="btn-upgrade-skill">
            升级技能 (${hero.skillLevel * 300}${resIcon('gold')})
          </button>
        </div>
      </div>
    `;

    const container = document.getElementById('hero-detail');
    if (container) {
      container.innerHTML = html;
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Bind upgrade buttons after render
    const btnBack = document.getElementById('btn-hero-back');
    if (btnBack) btnBack.addEventListener('click', () => {
      this.renderHeroList();
      UI.renderScreen('hero');
    });

    const btnSelect = document.getElementById('btn-select-hero');
    const btnStarUp = document.getElementById('btn-star-up');
    const btnUpgradeSkill = document.getElementById('btn-upgrade-skill');

    if (btnSelect) btnSelect.addEventListener('click', () => {
      this.selectHeroForBattle(heroId);
      UI.renderScreen('hero');
    });
    if (btnStarUp) btnStarUp.addEventListener('click', () => {
      const r = this.starUp(heroId);
      UI.showToast(r.msg);
      this.renderHeroDetail(heroId);
    });
    if (btnUpgradeSkill) btnUpgradeSkill.addEventListener('click', () => {
      const r = this.upgradeSkill(heroId);
      UI.showToast(r.msg);
      this.renderHeroDetail(heroId);
    });
  }
};
