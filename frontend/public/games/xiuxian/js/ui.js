// ============================================================
// UI Manager — render all panels, handle interaction
// ============================================================

class UIManager {
  constructor(game) {
    this.game = game;
    this.currentPanel = 'cultivation';
    this.alchemyInterval = null;

    this._initNavigation();
    this._initParticles();
    this._updateStatusVisibility("cultivation");
  }

  // ---- Navigation ----
  _initNavigation() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        const panel = el.dataset.panel;
        if (!panel) return;
        this.switchPanel(panel);
      });
    });
  }

  switchPanel(name) {
    this.currentPanel = name;
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.panel === name)
    );
    document.querySelectorAll('.panel').forEach(el =>
      el.classList.toggle('active', el.id === `panel-${name}`)
    );
    this._updateStatusVisibility(name);
    this.renderPanel(name);
  }

  _updateStatusVisibility(panel) {
    const allStats = ['stat-realm', 'stat-cultivation', 'stat-rate', 'stat-stones', 'stat-spirit'];
    const cultivationStats = ['stat-realm', 'stat-cultivation', 'stat-rate'];
    const hideStats = panel === 'cultivation' ? cultivationStats : allStats;
    allStats.forEach(cls => {
      const el = document.querySelector('.status-item.' + cls);
      if (el) el.classList.toggle('stat-hidden', hideStats.includes(cls));
    });
  }

  // ---- Status bar (updated every tick) ----
  updateStatusBar() {
    const p = this.game.player;
    const realm = p.getRealm();
    const rate = p.getCultivationRate();
    const next = p.getNextRealm();

    document.getElementById('sb-realm').textContent = realm.name;
    document.getElementById('sb-cultivation').textContent = BigNum.format(p.cultivation);
    document.getElementById('sb-rate').textContent = BigNum.formatRate(rate);
    document.getElementById('sb-stones').textContent = BigNum.format(p.spiritStones);
    document.getElementById('sb-spirit').textContent = `${Math.floor(p.spirit)}/${p.maxSpirit}`;
  }

  // ---- Render panel by name ----
  renderPanel(name) {
    const renderers = {
      cultivation: () => this.renderCultivation(),
      world: () => this.renderWorld(),
      cave: () => this.renderCave(),
      cave_alchemy: () => this.renderCaveAlchemy(),
      cave_forge: () => this.renderCaveForge(),
      techniques: () => this.renderTechniques(),
      exploration: () => this.renderExploration(),
      inventory: () => this.renderInventory(),
      shop: () => this.renderShop(),
      sect: () => this.renderSect(),
      favor: () => this.renderFavor(),
      auction: () => this.renderAuction(),
      settings: () => this.renderSettings(),
    };
    if (renderers[name]) renderers[name]();
  }

  // ---- Cultivation Panel ----
  renderCultivation() {
    const p = this.game.player;
    const realm = p.getRealm();
    const next = p.getNextRealm();
    const rate = p.getCultivationRate();

    let progressPercent = 0;
    let progressText = '';
    if (next) {
      progressPercent = Math.min(100, (p.cultivation / next.breakthroughCost) * 100);
      progressText = `${BigNum.format(p.cultivation)} / ${BigNum.format(next.breakthroughCost)}`;
    } else {
      progressPercent = 100;
      progressText = '已达巅峰';
    }

    const canBreakthrough = next && p.cultivation >= next.breakthroughCost;
    const needsPill = next && next.breakthroughItem;
    const hasPill = needsPill && (p.inventory[next.breakthroughItem] || 0) > 0;
    const pillName = needsPill ? GameData.items[next.breakthroughItem].name : '';
    const portrait = GameAssets.cultivator(p.realmIndex);
    const aura = GameAssets.realmAura(p.realmIndex);

    // Determine breakthrough type
    const isLarge = next ? GameData.isLargeBreakthrough(p.realmIndex) : false;
    const maxTreasures = isLarge ? 3 : 1;

    // Available treasures (at or below current period tier)
    const currentPeriod = GameData.getRealmPeriod(p.realmIndex);
    const currentPeriodIdx = GameData.realmPeriods.indexOf(currentPeriod);
    const availableTreasures = GameData.heavenlyTreasures.filter(t => {
      if ((p.inventory[t.id] || 0) <= 0) return false;
      const tPeriod = GameData.realmPeriods.find(p2 => p2.id === t.tier);
      return GameData.realmPeriods.indexOf(tPeriod) <= currentPeriodIdx;
    });

    const treasureBonusDisplay = Object.entries(p.treasureBonus || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => {
        const lbl = { attack: '攻击', defense: '防御', hp: '生命', critRate: '暴击率', critDamage: '暴击伤害', defenseBreak: '破甲', lifeSteal: '吸血' }[k] || k;
        const isPct = ['critRate', 'critDamage', 'defenseBreak', 'lifeSteal'].includes(k);
        return `${lbl}+${isPct ? (v * 100).toFixed(0) + '%' : BigNum.format(v)}`;
      }).join('、');

    let activeEffectsHtml = '';
    const now = Date.now();
    const activeBuffs = p.activeEffects.filter(e => e.endTime > now);
    if (activeBuffs.length > 0) {
      activeEffectsHtml = '<div class="card"><div class="card-title">当前增益</div>';
      for (const buff of activeBuffs) {
        const remaining = Math.ceil((buff.endTime - now) / 1000);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        activeEffectsHtml += `<div class="card-row" style="margin-top:6px">
          <span>${buff.source}</span>
          <span style="color:var(--accent-green)">${mins}:${secs.toString().padStart(2, '0')}</span>
        </div>`;
      }
      activeEffectsHtml += '</div>';
    }

    // Treasure selection HTML
    let treasureHtml = '';
    if (availableTreasures.length > 0 && next) {
      treasureHtml = `
        <div class="card-row" style="margin-top:8px">
          <span>天材地宝（可选${maxTreasures}个，+5%成功率/个）：</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${availableTreasures.map(t => {
            const bonusStr = Object.entries(t.bonus).map(([k, v]) => {
              const lbl = { attack: '攻', defense: '防', hp: '血', critRate: '暴击', critDamage: '暴伤', defenseBreak: '破甲', lifeSteal: '吸血' }[k] || k;
              return `${lbl}+${v}`;
            }).join(' ');
            return `<label style="display:flex;align-items:center;gap:4px;font-size:12px;padding:4px 8px;border:1px solid var(--border-color);border-radius:4px;cursor:pointer" class="treasure-option">
              <input type="checkbox" data-treasure="${t.id}" ${maxTreasures === 1 ? '' : ''}>
              <span style="color:var(--rarity-${t.rarity})">${t.name}</span>
              <span style="color:var(--text-muted);font-size:10px">(${bonusStr})</span>
            </label>`;
          }).join('')}
        </div>`;
    }

    document.getElementById('panel-cultivation').innerHTML = `
      <div class="panel-title">修行</div>
      <div class="cultivation-display">
        <div class="cultivation-hero">
          ${this._assetImg(aura, 'realm-aura', '')}
          ${this._assetImg(portrait, 'cultivator-portrait', realm.name)}
        </div>
        <div style="text-align:center;margin-top:8px;font-size:13px">
          <div>${BigNum.format(p.cultivation)} 修为 | +${BigNum.format(rate)}/秒</div>
        </div>
        <div class="cultivation-info">
          <div class="realm-name">${realm.name}</div>
          <div class="realm-en">${realm.nameEn}</div>
        </div>
        <div class="stat-row">
          <div class="stat-box">
            <div class="label">生命</div>
            <div class="value" style="color:var(--accent-red)">${BigNum.format(p.hp)}</div>
          </div>
          <div class="stat-box">
            <div class="label">攻击</div>
            <div class="value">${BigNum.format(p.attack)}</div>
          </div>
          <div class="stat-box">
            <div class="label">防御</div>
            <div class="value">${BigNum.format(p.defense)}</div>
          </div>
          <div class="stat-box">
            <div class="label">声望</div>
            <div class="value" style="color:var(--accent-purple)">${p.reputation}</div>
          </div>
        </div>
        ${treasureBonusDisplay ? `<div style="text-align:center;font-size:12px;color:var(--accent-cyan);margin-top:4px">天材加成：${treasureBonusDisplay}</div>` : ''}
      </div>

      ${next ? `
      <div class="card ${canBreakthrough ? 'breakthrough-ready' : ''}" style="margin-top:20px">
        <div class="card-title">突破至：${next.name} ${isLarge ? '<span style="color:var(--accent-gold)">【大境界突破】</span>' : ''}</div>
        <div class="progress-bar" style="margin:8px 0">
          <div class="progress-fill" style="width:${progressPercent}%"></div>
          <div class="progress-text">${progressText}</div>
        </div>
        <div class="card-row">
          <span>成功率：<strong id="bt-rate-display">${next.breakthroughRate >= 1 ? '100%' : Math.round(next.breakthroughRate * 100 + p.breakthroughPity * 5)}%</strong></span>
          ${p.breakthroughPity > 0 ? `<span style="color:var(--accent-cyan)">保底：+${p.breakthroughPity * 5}%</span>` : ''}
        </div>
        ${needsPill ? `<div class="card-row" style="margin-top:6px">
          <span>需要：${pillName}</span>
          <span class="${hasPill ? 'rarity-uncommon' : 'rarity-red'}">${hasPill ? '已拥有' : '未拥有'}</span>
          ${!hasPill ? `<button class="btn btn-sm" id="btn-buy-pill" data-pill="${next.breakthroughItem}">购买</button>` : ''}
        </div>` : ''}
        ${treasureHtml}
        <div style="text-align:center;margin-top:12px">
          <button class="btn btn-primary" id="btn-breakthrough"
            ${!canBreakthrough || (needsPill && !hasPill) ? 'disabled' : ''}>
            ${canBreakthrough ? '尝试突破' : '修为不足'}
          </button>
        </div>
      </div>` : '<div class="card" style="text-align:center;margin-top:20px;color:var(--accent-gold)">已证大道，等待飞升</div>'}

      ${activeEffectsHtml}

      ${this._buildTechniquesSection()}
    `;

    // Limit treasure selection to maxTreasures
    if (availableTreasures.length > 0) {
      document.querySelectorAll('.treasure-option input').forEach(cb => {
        cb.addEventListener('change', () => {
          const checked = document.querySelectorAll('.treasure-option input:checked');
          if (checked.length > maxTreasures) cb.checked = false;
          // Update rate display
          const selectedCount = document.querySelectorAll('.treasure-option input:checked').length;
          const baseRate = next.breakthroughRate >= 1 ? 100 : Math.round(next.breakthroughRate * 100 + p.breakthroughPity * 5);
          const treasureBonus = selectedCount * 5;
          const rateEl = document.getElementById('bt-rate-display');
          if (rateEl) rateEl.textContent = Math.min(100, baseRate + treasureBonus) + '%';
        });
      });
    }

    const btn = document.getElementById('btn-breakthrough');
    if (btn) {
      btn.addEventListener('click', () => {
        const selectedTreasures = Array.from(document.querySelectorAll('.treasure-option input:checked')).map(cb => cb.dataset.treasure);
        const result = this.game.cultivationSystem.attemptBreakthrough(selectedTreasures);
        if (result.success) {
          this._showEffectOverlay(GameAssets.successEffect(p.realmIndex));
          this.showToast(`突破成功！晋升${result.realm.name}！`, 'legendary');
        } else if (result.reason) {
          if (!result.reason.includes('不足')) this._showEffectOverlay(GameAssets.effects.failure);
          this.showToast(result.reason, result.reason.includes('不足') ? 'error' : 'info');
        }
        this.renderCultivation();
        this.updateStatusBar();
      });
    }

    // Buy pill button
    const buyBtn = document.getElementById('btn-buy-pill');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const pillId = buyBtn.dataset.pill;
        this._buyBreakthroughPill(pillId);
      });
    }

    // Bind technique actions
    this._bindTechniqueActions();
  }

  // ---- Techniques section (embedded in cultivation) ----
  _buildTechniquesSection() {
    const p = this.game.player;
    const ts = this.game.techniqueSystem;
    const maxOuter = ts.getMaxOuterSlots();
    const maxInner = ts.getMaxInnerSlots();
    const maxLegacy = ts.getMaxSlots();

    const currentPeriod = GameData.getRealmPeriod(p.realmIndex);
    const currentPeriodIdx = GameData.realmPeriods.findIndex(pp => pp.id === currentPeriod.id);

    const _periodNames = {
      lianqi:'炼气', zhuji:'筑基', jindan:'金丹', yuanying:'元婴',
      huashen:'化神', lianxu:'炼虚', heti:'合体', dacheng:'大乘', dujie:'渡劫'
    };

    // Build learned techniques
    let outerHtml = '', innerHtml = '';
    for (const [techId, level] of Object.entries(p.techniques)) {
      const tech = GameData.techniques.find(t => t.id === techId);
      if (!tech) continue;

      const kind = tech.kind || 'outer';
      const equippedOuter = (p.equippedOuterTechniques || []).includes(techId);
      const equippedInner = (p.equippedInnerTechniques || []).includes(techId);
      const equippedLegacy = (p.equippedTechniques || []).includes(techId);
      const equipped = equippedOuter || equippedInner || equippedLegacy;
      const effectDesc = ts.getEffectDesc(techId);
      const tierName = GameData.techniqueTierNames[tech.tier] || (tech.period ? _periodNames[tech.period] || '' : '');
      const kindName = GameData.techniqueKindNames[kind] || '';
      const schoolInfo = GameData.techniqueSchools.find(s => s.id === tech.school);
      const schoolName = schoolInfo ? schoolInfo.name : tech.school;
      const upgradeCost = ts.getUpgradeCost(techId);

      let equipBtn = '';
      if (kind === 'outer') {
        equipBtn = equippedOuter ?
          `<button class="btn btn-sm" data-action="unequip-outer" data-tech="${techId}">卸下</button>` :
          `<button class="btn btn-sm" data-action="equip-outer" data-tech="${techId}"
            ${(p.equippedOuterTechniques || []).length >= maxOuter ? 'disabled' : ''}>装备</button>`;
      } else if (kind === 'inner') {
        equipBtn = equippedInner ?
          `<button class="btn btn-sm" data-action="unequip-inner" data-tech="${techId}">卸下</button>` :
          `<button class="btn btn-sm" data-action="equip-inner" data-tech="${techId}"
            ${(p.equippedInnerTechniques || []).length >= maxInner ? 'disabled' : ''}>装备</button>`;
      } else {
        equipBtn = equippedLegacy ?
          `<button class="btn btn-sm" data-action="unequip" data-tech="${techId}">卸下</button>` :
          `<button class="btn btn-sm" data-action="equip" data-tech="${techId}"
            ${(p.equippedTechniques || []).length >= maxLegacy ? 'disabled' : ''}>装备</button>`;
      }

      const item = `
        <div class="tech-item ${equipped ? 'tech-equipped' : ''} tech-${kind}">
          ${this._assetImg(GameAssets.technique(tech.school), 'tech-icon', tech.name)}
          <div class="tech-info">
            <span class="tech-name">${tech.name}</span>
            <span class="tech-tier">${kindName}${tierName ? ' · ' + tierName : ''} · ${schoolName}</span>
            <span class="tech-level">Lv.${level}/${tech.maxLevel}</span>
            <div class="tech-effect">${effectDesc}</div>
          </div>
          <div class="btn-group">
            ${equipBtn}
            ${level < tech.maxLevel ?
              `<button class="btn btn-sm btn-primary" data-action="upgrade" data-tech="${techId}"
                ${p.spiritStones < upgradeCost ? 'disabled' : ''}>
                升级(${BigNum.format(upgradeCost)})
              </button>` : '<span style="color:var(--accent-gold);font-size:11px">已满</span>'
            }
          </div>
        </div>`;

      if (kind === 'inner') innerHtml += item;
      else outerHtml += item;
    }

    // Shop section: buyable techniques for current period
    const buyableTechs = GameData.techniques.filter(t =>
      t.source === 'technique_shop' && t.period &&
      !p.techniques[t.id]
    );
    const visibleTechs = buyableTechs.filter(t => {
      const techIdx = GameData.realmPeriods.findIndex(pp => pp.id === t.period);
      return techIdx <= currentPeriodIdx;
    });

    let shopHtml = '';
    for (const tech of visibleTechs.slice(0, 20)) {
      const schoolInfo = GameData.techniqueSchools.find(s => s.id === tech.school);
      const schoolName = schoolInfo ? schoolInfo.name : tech.school;
      const kindName = GameData.techniqueKindNames[tech.kind] || '';
      const costMult = (p.talentModifiers && p.talentModifiers.shopCostMult) || 1;
      const cost = Math.floor((tech.cost || 100) * costMult);
      const periodName = _periodNames[tech.period] || tech.period;

      shopHtml += `
        <div class="card tech-shop-item">
          <div class="card-row">
            <span class="card-title">${tech.name}</span>
            <span style="font-size:11px;color:var(--text-muted)">${kindName} · ${schoolName} · ${periodName}</span>
          </div>
          <button class="btn btn-sm btn-primary" data-action="learn" data-tech="${tech.id}"
            ${p.spiritStones < cost ? 'disabled' : ''}>
            学习(${BigNum.format(cost)}灵石)
          </button>
        </div>`;
    }

    return `
      <div class="panel-title" style="margin-top:24px">功法秘籍</div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-row">
          <span>外功槽位：${(p.equippedOuterTechniques || []).length} / ${maxOuter}</span>
          <span>内功槽位：${(p.equippedInnerTechniques || []).length} / ${maxInner}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">当前境界：${currentPeriod.name}期 · 更高境界解锁更多槽位</div>
      </div>
      ${outerHtml ? `<div class="card" style="margin-bottom:8px"><div class="card-title" style="color:var(--accent-red)">外功</div></div>${outerHtml}` : ''}
      ${innerHtml ? `<div class="card" style="margin-bottom:8px"><div class="card-title" style="color:var(--accent-cyan)">内功</div></div>${innerHtml}` : ''}
      ${!outerHtml && !innerHtml ? '<div class="card" style="text-align:center;color:var(--text-muted)">尚未习得任何功法，可在下方学习</div>' : ''}
      ${shopHtml ? `
        <div class="card" style="margin:16px 0 8px"><div class="card-title">可学功法</div></div>
        ${shopHtml}` : ''}
    `;
  }

  _bindTechniqueActions(reRenderFn) {
    const p = this.game.player;
    const ts = this.game.techniqueSystem;
    const reRender = reRenderFn || (() => this.renderCultivation());

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const techId = btn.dataset.tech;
        if (action === 'equip-outer') {
          if (ts.equipOuter(techId)) this.showToast('装备外功成功', 'success');
          else this.showToast('装备失败', 'error');
        } else if (action === 'unequip-outer') {
          ts.unequipOuter(techId); this.showToast('已卸下', 'info');
        } else if (action === 'equip-inner') {
          if (ts.equipInner(techId)) this.showToast('装备内功成功', 'success');
          else this.showToast('装备失败', 'error');
        } else if (action === 'unequip-inner') {
          ts.unequipInner(techId); this.showToast('已卸下', 'info');
        } else if (action === 'equip') {
          if (ts.equip(techId)) this.showToast('装备成功', 'success');
        } else if (action === 'unequip') {
          if (ts.unequip(techId)) this.showToast('已卸下', 'info');
        } else if (action === 'upgrade') {
          if (ts.upgrade(techId)) this.showToast('升级成功', 'success');
        } else if (action === 'learn') {
          if (ts.learn(techId)) {
            const tech = GameData.techniques.find(t => t.id === techId);
            const costMult = (p.talentModifiers && p.talentModifiers.shopCostMult) || 1;
            const cost = Math.floor((tech.cost || 100) * costMult);
            p.spiritStones -= cost;
            this.showToast(`习得${tech.name}！`, 'success');
          } else {
            this.showToast('学习失败', 'error');
          }
        }
        reRender();
      });
    });
  }

  _buyBreakthroughPill(pillId) {
    const p = this.game.player;
    const pill = GameData.items[pillId];
    if (!pill) return;

    // Determine cost and availability based on realm tier
    const pillTierIdx = ['juqi_dan', 'zhuji_dan', 'jiangchen_dan', 'dingshen_dan', 'butian_dan', 'lianxu_dan', 'heti_dan', 'feisheng_dan', 'dujie_dan'].indexOf(pillId);
    const baseCost = [500, 2000, 10000, 50000, 200000, 500000, 2000000, 10000000, 50000000][pillTierIdx] || 1000;

    // Check restrictions
    const realmIdx = p.realmIndex;
    const huashenIdx = 14; // 化神初期 index
    const dachengIdx = 23; // 大乘初期 index

    let source = '宗门商店';
    if (realmIdx >= dachengIdx) {
      source = '中央域';
      if (p.currentRegionId !== 'r_center') {
        this.showToast(`此丹药需前往中央域购买`, 'error');
        return;
      }
    } else if (realmIdx >= huashenIdx) {
      source = '坤元域';
      if (p.currentRegionId !== 'r_kunyuan') {
        this.showToast(`此丹药需前往坤元域购买`, 'error');
        return;
      }
    } else if (!p.sectId) {
      this.showToast('需加入宗门才能购买丹药', 'error');
      return;
    }

    const shopMult = p.talentModifiers ? (p.talentModifiers.shopCostMult || 1) : 1;
    const adjustedCost = Math.floor(baseCost * shopMult);
    if (p.spiritStones < adjustedCost) {
      this.showToast(`灵石不足，需要 ${BigNum.format(adjustedCost)} 灵石`, 'error');
      return;
    }

    p.spiritStones -= adjustedCost;
    p.inventory[pillId] = (p.inventory[pillId] || 0) + 1;
    this.showToast(`从${source}购买了 ${pill.name}`, 'success');
    this.renderCultivation();
    this.updateStatusBar();
  }

  // ---- Cave Panel ----
  renderCave() {
    const p = this.game.player;

    const arrayData = GameData.arrayUpgrades[p.arrayLevel - 1];
    const nextArray = GameData.arrayUpgrades[p.arrayLevel];
    const gardenData = GameData.gardenUpgrades[p.gardenLevel - 1];
    const nextGarden = GameData.gardenUpgrades[p.gardenLevel];
    const arrayArt = GameAssets.ui.arrays[Math.min(GameAssets.ui.arrays.length - 1, Math.floor((p.arrayLevel - 1) / 2))];
    const gardenArt = GameAssets.ui.herbGarden[Math.min(GameAssets.ui.herbGarden.length - 1, Math.floor((p.gardenLevel - 1) / 3))];

    const caveArt = GameAssets.ui.caveArt;

    document.getElementById('panel-cave').innerHTML = `
      <div style="position:relative;min-height:100%">
        ${caveArt ? `<div style="position:absolute;inset:0;background:url('${caveArt}') center/cover no-repeat;opacity:0.25;pointer-events:none;border-radius:8px"></div>` : ''}
        <div style="position:relative;z-index:1">
      <div class="panel-title">洞府</div>
      <div class="upgrade-grid">
        <div class="upgrade-card">
          ${this._assetImg(arrayArt, 'upgrade-art', '聚灵阵')}
          <div class="upgrade-title">聚灵阵 (Lv.${p.arrayLevel})</div>
          <div class="upgrade-desc">修炼速度加成：${(arrayData.bonus * 100).toFixed(0)}%</div>
          ${nextArray ? `
            <div class="upgrade-desc">下一级：${(nextArray.bonus * 100).toFixed(0)}%</div>
            <button class="btn btn-sm" id="btn-upgrade-array"
              ${p.spiritStones < nextArray.cost ? 'disabled' : ''}>
              升级 (${BigNum.format(nextArray.cost)} 灵石)
            </button>
          ` : '<div class="upgrade-desc" style="color:var(--accent-gold)">已满级</div>'}
        </div>

        <div class="upgrade-card">
          ${this._assetImg(gardenArt, 'upgrade-art wide', '灵植园')}
          <div class="upgrade-title">灵植园 (Lv.${p.gardenLevel})</div>
          <div class="upgrade-desc">每${gardenData.interval}秒产出 ${gardenData.yield} 灵草</div>
          <div class="upgrade-desc">距下次收获：${Math.max(0, Math.ceil(p.gardenTimer))}秒</div>
          ${nextGarden ? `
            <button class="btn btn-sm" id="btn-upgrade-garden"
              ${p.spiritStones < nextGarden.cost ? 'disabled' : ''}>
              升级 (${BigNum.format(nextGarden.cost)} 灵石)
            </button>
          ` : '<div class="upgrade-desc" style="color:var(--accent-gold)">已满级</div>'}
        </div>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <div class="card" style="flex:1;cursor:pointer" id="btn-cave-alchemy">
          <div style="text-align:center">${this._assetImg(GameAssets.ui.furnace, 'upgrade-art', '炼丹炉')}</div>
          <div style="text-align:center;font-weight:bold;margin-top:8px">炼丹</div>
          ${!p.alchemyUnlocked ? `<div style="text-align:center;color:var(--accent-gold);font-size:12px">解锁需 10,000 灵石</div>` :
            '<div style="text-align:center;color:var(--accent-green);font-size:12px">已解锁</div>'}
        </div>
        <div class="card" style="flex:1;cursor:pointer" id="btn-cave-forge">
          <div style="text-align:center">${this._assetImg(GameAssets.ui.forgeFurnace, 'upgrade-art', '器炉')}</div>
          <div style="text-align:center;font-weight:bold;margin-top:8px">炼器</div>
          ${!p.forgeUnlocked ? `<div style="text-align:center;color:var(--accent-gold);font-size:12px">解锁需 10,000 灵石</div>` :
            '<div style="text-align:center;color:var(--accent-green);font-size:12px">已解锁</div>'}
        </div>
      </div>

      <div class="auto-queue" style="margin-top:20px">
        <div class="card-title" style="margin-bottom:10px">自动化设置</div>
        <div class="queue-item">
          <span>自动突破（修为满 + 有丹药时）</span>
          <div class="queue-toggle ${this.game.autoBreakthrough ? 'active' : ''}" id="toggle-auto-break"></div>
        </div>
        <div class="queue-item">
          <span>自动升级聚灵阵（灵石充足时）</span>
          <div class="queue-toggle ${this.game.autoArray ? 'active' : ''}" id="toggle-auto-array"></div>
        </div>
        </div>
      </div>
    `;

    this._bindClick('btn-upgrade-array', () => {
      if (nextArray && p.spiritStones >= nextArray.cost) {
        p.spiritStones -= nextArray.cost;
        p.arrayLevel++;
        this.showToast('聚灵阵升级成功！', 'success');
        this.renderCave();
      }
    });

    this._bindClick('btn-upgrade-garden', () => {
      if (nextGarden && p.spiritStones >= nextGarden.cost) {
        p.spiritStones -= nextGarden.cost;
        p.gardenLevel++;
        this.showToast('灵植园升级成功！', 'success');
        this.renderCave();
      }
    });

    this._bindClick('btn-cave-alchemy', () => {
      if (!p.alchemyUnlocked) {
        if (p.spiritStones >= 10000) {
          p.spiritStones -= 10000;
          p.alchemyUnlocked = true;
          this.showToast('炼丹功能已解锁！', 'legendary');
          this.renderCaveAlchemy();
        } else {
          this.showToast('灵石不足，需要 10,000 灵石', 'error');
        }
      } else {
        this.renderCaveAlchemy();
      }
    });

    this._bindClick('btn-cave-forge', () => {
      if (!p.forgeUnlocked) {
        if (p.spiritStones >= 10000) {
          p.spiritStones -= 10000;
          p.forgeUnlocked = true;
          this.showToast('炼器功能已解锁！', 'legendary');
          this.renderCaveForge();
        } else {
          this.showToast('灵石不足，需要 10,000 灵石', 'error');
        }
      } else {
        this.renderCaveForge();
      }
    });

    this._bindClick('toggle-auto-break', (el) => {
      this.game.autoBreakthrough = !this.game.autoBreakthrough;
      el.classList.toggle('active');
    });

    this._bindClick('toggle-auto-array', (el) => {
      this.game.autoArray = !this.game.autoArray;
      el.classList.toggle('active');
    });
  }

  // ---- Techniques Panel (still accessible via nav) ----
  renderTechniques() {
    document.getElementById('panel-techniques').innerHTML = `
      <div class="panel-title">功法秘籍</div>
      ${this._buildTechniquesSection()}
    `;
    this._bindTechniqueActions(() => this.renderTechniques());
  }

  // ---- Alchemy (rendered inside cave panel) ----
  renderCaveAlchemy() {
    const p = this.game.player;
    const alchemy = this.game.alchemySystem;

    if (alchemy.refining) {
      this._renderAlchemyMiniGame();
      return;
    }

    let recipesHtml = '';
    for (const recipe of GameData.recipes) {
      const result = GameData.items[recipe.result];
      const canRefine = alchemy.canRefine(recipe.id);
      const mats = Object.entries(recipe.materials)
        .map(([id, count]) => {
          const item = GameData.items[id];
          const have = p.inventory[id] || 0;
          return `<span class="${have >= count ? 'rarity-uncommon' : 'rarity-red'}">${item.name} ${have}/${count}</span>`;
        }).join(' ');

      recipesHtml += `
        <div class="card">
          <div class="card-row">
            <span class="card-title item-title ${InventorySystem.rarityClass(result.rarity)}">
              ${this._assetImg(GameAssets.item(recipe.result), 'item-icon', result.name)}
              ${result.name} x${recipe.amount}
            </span>
            <span style="font-size:11px;color:var(--text-muted)">难度 ${recipe.difficulty}</span>
          </div>
          <div class="card-desc">${result.desc}</div>
          <div style="font-size:12px;margin-bottom:8px">材料：${mats}</div>
          <button class="btn btn-sm" id="btn-refine-${recipe.id}" ${!canRefine ? 'disabled' : ''}>
            开始炼制
          </button>
        </div>`;
    }

    document.getElementById('panel-cave').innerHTML = `
      <div class="panel-title">炼丹</div>
      <button class="btn btn-sm" id="btn-cave-back" style="margin-bottom:12px">返回洞府</button>
      <div class="alchemy-visual">${this._assetImg(GameAssets.ui.furnace, 'alchemy-furnace', '炼丹炉')}</div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-row">
          <span>炼丹等级：Lv.${p.alchemyLevel}</span>
          <span style="font-size:12px;color:var(--text-muted)">经验：${p.alchemyExp}/${p.alchemyLevel * 100}</span>
        </div>
      </div>
      <div class="grid-2">${recipesHtml}</div>
    `;

    this._bindClick('btn-cave-back', () => this.renderCave());

    for (const recipe of GameData.recipes) {
      this._bindClick(`btn-refine-${recipe.id}`, () => {
        if (alchemy.startRefine(recipe.id)) {
          this.renderCaveAlchemy();
          this._startAlchemyTicks();
        }
      });
    }
  }

  _renderAlchemyMiniGame() {
    const alchemy = this.game.alchemySystem;
    const targetLeft = alchemy.targetZone[0];
    const targetWidth = alchemy.targetZone[1] - alchemy.targetZone[0];
    const heatLeft = alchemy.heatLevel;

    document.getElementById('panel-cave').innerHTML = `
      <div class="panel-title">炼丹中...</div>
      <button class="btn btn-sm" id="btn-cave-back" style="margin-bottom:12px">返回洞府</button>
      <div class="alchemy-visual active">${this._assetImg(GameAssets.ui.furnace, 'alchemy-furnace', '炼丹炉')}</div>
      <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:8px">
        剩余时间：${Math.max(0, (alchemy.maxTime - alchemy.timer)).toFixed(1)}秒
      </div>
      <div class="alchemy-bar">
        <div class="alchemy-target-zone" style="left:${targetLeft}%;width:${targetWidth}%"></div>
        <div class="alchemy-heat-indicator" style="left:${heatLeft}%"></div>
      </div>
      <div class="alchemy-controls">
        <button class="btn" id="btn-heat-down">降温 (-10)</button>
        <button class="btn btn-primary" id="btn-heat-up">加火 (+10)</button>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted)">
        保持温度在绿色区域内以获得最佳品质
      </div>
    `;

    this._bindClick('btn-cave-back', () => this.renderCave());
    this._bindClick('btn-heat-down', () => alchemy.adjustHeat(-10));
    this._bindClick('btn-heat-up', () => alchemy.adjustHeat(10));
  }

  _startAlchemyTicks() {
    if (this.alchemyInterval) clearInterval(this.alchemyInterval);
    this.alchemyInterval = setInterval(() => {
      const alchemy = this.game.alchemySystem;
      if (!alchemy.refining) {
        clearInterval(this.alchemyInterval);
        this.alchemyInterval = null;
        return;
      }
      const result = alchemy.tick(0.1);
      if (result) {
        clearInterval(this.alchemyInterval);
        this.alchemyInterval = null;
        if (result.success) {
          this.showToast(`炼制成功！获得 ${GameData.items[result.recipe.result].name} x${result.amount}${result.quality === 'high' ? ' (优质)' : ''}`, 'success');
          if (result.levelUp) this.showToast('炼丹等级提升！', 'legendary');
        } else {
          this.showToast('炼制失败，材料已消耗', 'error');
        }
      }
      if (this.currentPanel === 'cave') this._renderAlchemyMiniGame();
    }, 100);
  }

  // ---- Exploration Panel ----
  renderExploration() {
    const p = this.game.player;
    const expl = this.game.explorationSystem;
    const combat = this.game.combatSystem;

    // In combat
    if (combat.inCombat) {
      this._renderCombat();
      return;
    }

    // In encounter
    if (expl.currentEvent) {
      this._renderEncounter();
      return;
    }

    // Currently exploring
    if (expl.active) {
      this._renderExplorationProgress();
      return;
    }

    // Zone selection
    this._renderZoneSelection();
  }

  _renderZoneSelection() {
    const p = this.game.player;
    let zonesHtml = '';
    for (const zone of GameData.zones) {
      const locked = p.realmIndex < zone.minRealm;
      const realmName = locked ? GameData.realms[zone.minRealm].name : '';
      const zoneArt = GameAssets.zones[zone.id];
      zonesHtml += `
        <div class="zone-card ${locked ? 'locked' : ''}" data-zone="${zone.id}" style="background-image:linear-gradient(rgba(10,10,18,.25),rgba(10,10,18,.88)),url('${zoneArt}')">
          <div class="zone-name">${zone.name}</div>
          <div class="zone-en">${zone.nameEn}</div>
          <div class="zone-cost">消耗 ${zone.spiritCost} 神识</div>
          ${locked ? `<div class="zone-lock">需要 ${realmName}</div>` : ''}
        </div>`;
    }

    document.getElementById('panel-exploration').innerHTML = `
      <div class="panel-title">探险</div>
      ${this._assetImg(GameAssets.zones.world, 'world-map', '修仙地图')}
      <div class="zone-grid">${zonesHtml}</div>
    `;

    document.querySelectorAll('.zone-card:not(.locked)').forEach(el => {
      el.addEventListener('click', () => {
        const zoneId = el.dataset.zone;
        if (this.game.explorationSystem.startZone(zoneId)) {
          this.renderExploration();
        } else {
          this.showToast('神识不足', 'error');
        }
      });
    });
  }

  _renderExplorationProgress() {
    const expl = this.game.explorationSystem;
    let nodesHtml = '';
    for (let i = 1; i <= expl.totalNodes; i++) {
      const cls = i < expl.currentNode ? 'completed' :
                  i === expl.currentNode ? 'current' : 'future';
      const nodeIcon = cls === 'completed' ? GameAssets.nodes.gather :
                       cls === 'current' ? GameAssets.nodes.event : GameAssets.nodes.fog;
      nodesHtml += `<div class="node-dot ${cls}" style="background-image:url('${nodeIcon}')"><span>${i}</span></div>`;
      if (i < expl.totalNodes) nodesHtml += '<div class="node-connector"></div>';
    }

    const lastNode = expl.completedNodes[expl.completedNodes.length - 1];
    let nodeResultHtml = '';
    if (lastNode) {
      if (lastNode.type === 'gather' && lastNode.loot) {
        const lootStr = Object.entries(lastNode.loot)
          .map(([id, count]) => `${GameData.items[id]?.name || id} x${count}`)
          .join(', ');
        let treasureNotice = '';
        if (lastNode.treasure) {
          treasureNotice = `<div style="color:var(--rarity-${lastNode.treasure.rarity});margin-top:4px">发现天材地宝：${lastNode.treasure.name}！</div>`;
        }
        nodeResultHtml = `<div class="card"><div class="card-desc" style="color:var(--accent-green)">采集获得：${lootStr}</div>${treasureNotice}</div>`;
      } else if (lastNode.type === 'complete') {
        nodeResultHtml = '<div class="card" style="text-align:center;color:var(--accent-gold)">探索完成！</div>';
      }
    }

    document.getElementById('panel-exploration').innerHTML = `
      <div class="panel-title">探索中 — ${expl.currentZone.name}</div>
      <div class="node-map">${nodesHtml}</div>
      ${nodeResultHtml}
      <div style="text-align:center;margin-top:16px">
        ${expl.currentNode < expl.totalNodes ?
          '<button class="btn btn-primary" id="btn-advance">前往下一节点</button>' :
          '<button class="btn btn-primary" id="btn-retreat-done">返回</button>'
        }
        <button class="btn btn-danger" id="btn-retreat" style="margin-left:8px">撤退</button>
      </div>
    `;

    this._bindClick('btn-advance', () => {
      const result = this.game.explorationSystem.advanceNode();
      if (result) {
        if (result.type === 'complete') {
          this.showToast('探索完成！', 'success');
        }
        this.renderExploration();
      }
    });

    this._bindClick('btn-retreat', () => {
      this.game.explorationSystem.retreat();
      this.renderExploration();
    });

    this._bindClick('btn-retreat-done', () => {
      this.game.explorationSystem.retreat();
      this.renderExploration();
    });
  }

  _renderEncounter() {
    const enc = this.game.explorationSystem.currentEvent;
    let choicesHtml = '';
    for (let i = 0; i < enc.choices.length; i++) {
      choicesHtml += `<button class="choice-btn" data-choice="${i}">${enc.choices[i].text}</button>`;
    }
    const eventArt = GameAssets.events[enc.id];
    const npcArt = GameAssets.npcPortraits[enc.id];

    document.getElementById('panel-exploration').innerHTML = `
      <div class="panel-title">奇遇</div>
      <div class="encounter-box">
        ${this._assetImg(eventArt, 'encounter-art', enc.name)}
        <div class="encounter-content">
          ${this._assetImg(npcArt, 'encounter-npc', enc.name)}
          <div>
            <div class="encounter-title">${enc.name}</div>
            <div class="encounter-desc">${enc.description}</div>
          </div>
        </div>
        ${choicesHtml}
      </div>
    `;

    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.choice);
        const result = this.game.explorationSystem.handleChoice(idx);
        if (result) {
          let msg = result.choice.outcome;
          if (!result.success && result.reason) msg = result.reason;

          if (Object.keys(result.rewards || {}).length > 0) {
            const rewardStr = Object.entries(result.rewards)
              .map(([k, v]) => `${GameData.items[k]?.name || k} x${v}`)
              .join(', ');
            msg += `\n获得：${rewardStr}`;
          }
          if (result.foundTechnique) {
            this.game.techniqueSystem.learn(result.foundTechnique.id);
            msg += `\n习得秘籍：${result.foundTechnique.name}！`;
            this.showToast(`习得秘籍：${result.foundTechnique.name}！`, 'legendary');
          }

          if (result.combat) {
            this.renderExploration();
            return;
          }

          this._showModal(enc.name, msg, () => this.renderExploration());
        }
      });
    });
  }

  _renderCombat() {
    const combat = this.game.combatSystem;
    const p = this.game.player;
    const playerHpPct = Math.max(0, (combat.playerHp / p.maxHp) * 100);
    const enemyHpPct = Math.max(0, (combat.enemyHp / combat.enemyMaxHp) * 100);
    const logHtml = combat.log.slice(-8).join('<br>');

    const outerTechs = (p.equippedOuterTechniques || []);
    const innerTechs = (p.equippedInnerTechniques || []);

    const outerBtns = outerTechs.map(tid => {
      const tech = GameData.techniques.find(t => t.id === tid);
      if (!tech) return '';
      const selected = combat.selectedOuter === tid;
      return `<button class="btn btn-tech ${selected ? 'btn-tech-selected' : ''}" data-tech-outer="${tid}">${tech.name}</button>`;
    }).join('');

    const innerBtns = innerTechs.map(tid => {
      const tech = GameData.techniques.find(t => t.id === tid);
      if (!tech) return '';
      const selected = combat.selectedInner === tid;
      return `<button class="btn btn-tech ${selected ? 'btn-tech-selected' : ''}" data-tech-inner="${tid}">${tech.name}</button>`;
    }).join('');

    const noOuter = outerTechs.length === 0;
    const noInner = innerTechs.length === 0;

    document.getElementById('panel-exploration').innerHTML = `
      <div class="panel-title">战斗 <span style="font-size:12px;color:var(--text-secondary)">第 ${combat.turnCount + 1} 回合</span></div>
      <div class="combat-arena">
        <div class="combat-field">
          <div class="combat-party combat-party-enemy">
            <div class="combat-unit combat-unit-enemy">
              <div class="combat-portrait-circle enemy-circle">${combat.enemy.name.charAt(0)}</div>
              <div class="combat-unit-info">
                <div class="combat-unit-name" style="color:var(--accent-red)">${combat.enemy.name}</div>
                <div class="progress-bar" style="margin-top:2px">
                  <div class="progress-fill" style="width:${enemyHpPct}%;background:var(--accent-red)"></div>
                  <div class="progress-text">${BigNum.format(combat.enemyHp)} / ${BigNum.format(combat.enemyMaxHp)}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="combat-vs">VS</div>
          <div class="combat-party combat-party-player">
            <div class="combat-unit combat-unit-player">
              <div class="combat-portrait-circle player-circle">你</div>
              <div class="combat-unit-info">
                <div class="combat-unit-name">你</div>
                <div class="progress-bar" style="margin-top:2px">
                  <div class="progress-fill" style="width:${playerHpPct}%;background:var(--accent-green)"></div>
                  <div class="progress-text">${BigNum.format(combat.playerHp)} / ${BigNum.format(p.maxHp)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="combat-tech-select">
          <div class="combat-tech-row">
            <span class="combat-tech-label">外功</span>
            <div class="combat-tech-btns">${noOuter ? '<span style="color:var(--text-secondary);font-size:12px">未装备</span>' : outerBtns}</div>
          </div>
          <div class="combat-tech-row">
            <span class="combat-tech-label">内功</span>
            <div class="combat-tech-btns">${noInner ? '<span style="color:var(--text-secondary);font-size:12px">未装备</span>' : innerBtns}</div>
          </div>
        </div>
        <div class="combat-log">${logHtml || '战斗开始...'}</div>
        <div class="combat-actions">
          <button class="btn btn-primary" id="btn-combat-tick">下一回合</button>
          <button class="btn" id="btn-combat-auto">自动战斗</button>
          <button class="btn" id="btn-combat-heal"
            ${(p.inventory.huixue_dan || 0) <= 0 ? 'disabled' : ''}>
            服用回血丹
          </button>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-tech-outer]').forEach(btn => {
      btn.addEventListener('click', () => {
        combat.selectedOuter = combat.selectedOuter === btn.dataset.techOuter ? null : btn.dataset.techOuter;
        this._renderCombat();
      });
    });
    document.querySelectorAll('[data-tech-inner]').forEach(btn => {
      btn.addEventListener('click', () => {
        combat.selectedInner = combat.selectedInner === btn.dataset.techInner ? null : btn.dataset.techInner;
        this._renderCombat();
      });
    });

    this._bindClick('btn-combat-tick', () => {
      this.game.combatSystem.tick();
      this._renderCombat();
      if (combat.result) this._handleCombatResult();
    });

    this._bindClick('btn-combat-auto', () => {
      const autoCombat = setInterval(() => {
        this.game.combatSystem.tick();
        if (this.game.combatSystem.result) {
          clearInterval(autoCombat);
          this._handleCombatResult();
        }
      }, 200);
    });

    this._bindClick('btn-combat-heal', () => {
      if (this.game.combatSystem.useHealPill()) {
        this.showToast('使用回血丹', 'success');
        this._renderCombat();
      }
    });

    if (combat.result) {
      this._handleCombatResult();
    }
  }

  _handleCombatResult() {
    const combat = this.game.combatSystem;
    if (!combat.result) return;

    if (combat.result === 'win') {
      // Check if defeated enemy matches a random NPC
      const ws = this.game.worldSystem;
      const enemyName = combat.enemy.name;
      const randomNpcs = this.game.player.randomNpcs || [];
      const killedNpc = randomNpcs.find(n => enemyName.includes(n.name.split(' · ')[1] || n.name));
      if (killedNpc) {
        const replacement = ws.replaceNpc(killedNpc.id);
        if (replacement) {
          this.showToast(`${killedNpc.name} 已被击杀，新人 ${replacement.name} 出现`, 'info');
        }
      }

      const loot = combat.getLoot();
      const lootStr = Object.entries(loot)
        .map(([id, count]) => `${GameData.items[id]?.name || id} x${count}`)
        .join(', ');
      this._showModal('战斗胜利',
        `你击败了 ${combat.enemy.name}！\n\n战利品：${lootStr || '无'}`,
        () => {
          this.game.explorationSystem.currentEvent = null;
          this.renderExploration();
        });
    } else {
      this._showModal('战斗失败',
        `你被 ${combat.enemy.name} 击败了...生命恢复至30%`,
        () => {
          this.game.explorationSystem.retreat();
          this.renderExploration();
        });
    }
  }

  // ---- Inventory Panel ----
  renderInventory() {
    const p = this.game.player;
    const inv = this.game.inventorySystem;
    const groups = inv.getGrouped();

    const typeNames = {
      pill: '丹药', consumable: '消耗品', herb: '草药', material: '材料', currency: '货币', treasure: '天材地宝'
    };

    let html = '<div class="panel-title">背包</div>';

    // Spirit stones
    html += `<div class="card" style="margin-bottom:16px">
      <div class="card-row">
        <span class="item-title">${this._assetImg(GameAssets.items.lingshi_large, 'item-icon', '灵石')}灵石</span>
        <span class="rarity-gold" style="font-weight:bold">${BigNum.format(p.spiritStones)}</span>
      </div>
    </div>`;

    for (const [type, items] of Object.entries(groups)) {
      if (Object.keys(items).length === 0) continue;
      html += `<h3 style="font-size:14px;color:var(--text-secondary);margin:12px 0 8px">${typeNames[type] || type}</h3>`;
      html += '<div class="inv-grid">';
      for (const [id, count] of Object.entries(items)) {
        const item = GameData.items[id];
        if (!item) continue;
        html += `
          <div class="inv-item">
            <div class="inv-icon ${InventorySystem.rarityClass(item.rarity)}">${this._assetImg(GameAssets.item(id), 'inv-img', item.name)}</div>
            <span class="inv-name ${InventorySystem.rarityClass(item.rarity)}">${item.name}</span>
            <span class="inv-count">x${count}</span>
            ${item.type === 'consumable' ? `<button class="btn btn-sm" data-use="${id}">使用</button>` : ''}
          </div>`;
      }
      html += '</div>';
    }

    if (Object.keys(p.inventory).length === 0) {
      html += '<div class="card" style="text-align:center;color:var(--text-muted)">背包为空</div>';
    }

    document.getElementById('panel-inventory').innerHTML = html;

    document.querySelectorAll('[data-use]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.use;
        if (this.game.cultivationSystem.usePill(id)) {
          this.showToast(`使用了 ${GameData.items[id].name}`, 'success');
          this.renderInventory();
        }
      });
    });
  }

  // ---- Shop Panel ----
  renderShop() {
    const p = this.game.player;

    // Techniques for purchase
    const shopTechs = GameData.techniques.filter(t => t.source === 'sect_shop');
    let techsHtml = shopTechs.map(t => {
      const owned = p.techniques[t.id] !== undefined;
      const tierName = GameData.techniqueTierNames[t.tier];
      return `
        <div class="shop-item">
          ${this._assetImg(GameAssets.technique(t.school), 'shop-icon', t.name)}
          <div style="font-weight:bold" class="${InventorySystem.rarityClass('uncommon')}">${t.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${tierName} · ${t.school === 'sword' ? '剑修' : t.school === 'body' ? '体修' : t.school === 'qi' ? '法修' : '符修'}</div>
          <div class="shop-price">${BigNum.format(t.cost)} 灵石</div>
          <button class="btn btn-sm" id="btn-buy-${t.id}"
            ${owned || p.spiritStones < t.cost ? 'disabled' : ''}>
            ${owned ? '已学习' : '购买'}
          </button>
        </div>`;
    }).join('');

    // Breakthrough pills for sale
    const realmIdx = p.realmIndex;
    const huashenIdx = 14;
    const dachengIdx = 23;
    const allPills = [
      { id: 'juqi_dan', cost: 500, minRealm: 0 },
      { id: 'zhuji_dan', cost: 2000, minRealm: 3 },
      { id: 'jiangchen_dan', cost: 10000, minRealm: 5 },
      { id: 'dingshen_dan', cost: 50000, minRealm: 8 },
      { id: 'butian_dan', cost: 200000, minRealm: 11 },
      { id: 'lianxu_dan', cost: 500000, minRealm: 14 },
      { id: 'heti_dan', cost: 2000000, minRealm: 17 },
      { id: 'feisheng_dan', cost: 10000000, minRealm: 20 },
      { id: 'dujie_dan', cost: 50000000, minRealm: 23 },
    ];
    const availablePills = allPills.filter(pill => realmIdx >= pill.minRealm);

    let pillsHtml = '';
    if (availablePills.length > 0) {
      pillsHtml = availablePills.map(pill => {
        const pillData = GameData.items[pill.id];
        let source = '宗门';
        let canBuy = p.sectId != null;
        if (realmIdx >= dachengIdx) {
          source = '中央域';
          canBuy = p.currentRegionId === 'r_center';
        } else if (realmIdx >= huashenIdx) {
          source = '坤元域';
          canBuy = p.currentRegionId === 'r_kunyuan';
        }
        return `
          <div class="shop-item">
            ${this._assetImg(GameAssets.item(pill.id), 'shop-icon', pillData.name)}
            <div style="font-weight:bold" class="${InventorySystem.rarityClass(pillData.rarity)}">${pillData.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${pillData.desc} · ${source}</div>
            <div class="shop-price">${BigNum.format(pill.cost)} 灵石</div>
            <button class="btn btn-sm" id="btn-buy-pill-${pill.id}"
              ${!canBuy || p.spiritStones < pill.cost ? 'disabled' : ''}>
              ${canBuy ? '购买' : (source === '宗门' ? '需加入宗门' : `需前往${source}`)}
            </button>
          </div>`;
      }).join('');
    }

    // Heavenly treasures for sale (rare, expensive)
    const currentPeriod = GameData.getRealmPeriod(realmIdx);
    const currentPeriodIdx = GameData.realmPeriods.indexOf(currentPeriod);
    const shopTreasures = GameData.heavenlyTreasures.filter(t => {
      const tPeriod = GameData.realmPeriods.find(p => p.id === t.tier);
      const tIdx = GameData.realmPeriods.indexOf(tPeriod);
      return tIdx <= currentPeriodIdx && t.rarity !== 'mythic';
    });
    let treasuresHtml = '';
    if (shopTreasures.length > 0) {
      const treasureCosts = { common: 5000, uncommon: 20000, rare: 100000, epic: 500000, legendary: 5000000 };
      treasuresHtml = shopTreasures.slice(0, 6).map(t => {
        const cost = treasureCosts[t.rarity] || 10000;
        const bonusStr = Object.entries(t.bonus).map(([k, v]) => {
          const lbl = { attack: '攻', defense: '防', hp: '血', critRate: '暴击', critDamage: '暴伤', defenseBreak: '破甲', lifeSteal: '吸血' }[k] || k;
          return `${lbl}+${v}`;
        }).join(' ');
        return `
          <div class="shop-item">
            <div style="font-weight:bold" class="${InventorySystem.rarityClass(t.rarity)}">${t.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${bonusStr}</div>
            <div class="shop-price">${BigNum.format(cost)} 灵石</div>
            <button class="btn btn-sm" id="btn-buy-treasure-${t.id}"
              ${p.spiritStones < cost ? 'disabled' : ''}>
              购买
            </button>
          </div>`;
      }).join('');
    }

    document.getElementById('panel-shop').innerHTML = `
      <div class="panel-title">商店</div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-row">
          <span>灵石</span>
          <span style="color:var(--accent-gold);font-weight:bold">${BigNum.format(p.spiritStones)}</span>
        </div>
      </div>
      <div class="panel-title" style="font-size:16px;margin-top:8px">功法秘籍</div>
      <div class="shop-grid">${techsHtml}</div>
      ${pillsHtml ? `<div class="panel-title" style="font-size:16px;margin-top:16px">突破丹药</div><div class="shop-grid">${pillsHtml}</div>` : ''}
      ${treasuresHtml ? `<div class="panel-title" style="font-size:16px;margin-top:16px">天材地宝</div><div class="shop-grid">${treasuresHtml}</div>` : ''}
    `;

    for (const t of shopTechs) {
      this._bindClick(`btn-buy-${t.id}`, () => {
        const techCost = Math.floor(t.cost * (p.talentModifiers?.shopCostMult || 1));
        if (p.spiritStones >= techCost && !p.techniques[t.id]) {
          p.spiritStones -= techCost;
          this.game.techniqueSystem.learn(t.id);
          this.showToast(`习得 ${t.name}！`, 'success');
          this.renderShop();
        }
      });
    }

    for (const pill of availablePills) {
      this._bindClick(`btn-buy-pill-${pill.id}`, () => {
        const pillCost = Math.floor(pill.cost * (p.talentModifiers?.shopCostMult || 1));
        if (p.spiritStones >= pillCost) {
          p.spiritStones -= pillCost;
          p.inventory[pill.id] = (p.inventory[pill.id] || 0) + 1;
          this.showToast(`购买了 ${GameData.items[pill.id].name}`, 'success');
          this.renderShop();
          this.updateStatusBar();
        }
      });
    }

    const treasureCosts = { common: 5000, uncommon: 20000, rare: 100000, epic: 500000, legendary: 5000000 };
    for (const t of shopTreasures.slice(0, 6)) {
      const cost = treasureCosts[t.rarity] || 10000;
      this._bindClick(`btn-buy-treasure-${t.id}`, () => {
        if (p.spiritStones >= cost) {
          p.spiritStones -= cost;
          p.inventory[t.id] = (p.inventory[t.id] || 0) + 1;
          this.showToast(`购买了 ${t.name}`, 'success');
          this.renderShop();
          this.updateStatusBar();
        }
      });
    }
  }

  // ---- Settings Panel ----
  renderSettings() {
    const p = this.game.player;
    const s = p.stats;

    const playTime = Math.floor(s.totalPlayTime / 3600);
    document.getElementById('panel-settings').innerHTML = `
      <div class="panel-title">设置</div>
      <div class="card">
        <div class="card-title">角色信息</div>
        <div class="card-row"><span>名字</span><span>${p.name}</span></div>
        <div class="card-row"><span>创建时间</span><span>${new Date(p.createdAt).toLocaleString()}</span></div>
      </div>
      <div class="card">
        <div class="card-title">统计</div>
        <div class="card-row"><span>总游玩时长</span><span>${playTime}小时</span></div>
        <div class="card-row"><span>总修为获取</span><span>${BigNum.format(s.totalCultivation)}</span></div>
        <div class="card-row"><span>突破成功/失败</span><span>${s.breakthroughs} / ${s.breakthroughFails}</span></div>
        <div class="card-row"><span>击败敌人</span><span>${s.enemiesDefeated}</span></div>
        <div class="card-row"><span>完成奇遇</span><span>${s.encountersCompleted}</span></div>
        <div class="card-row"><span>炼丹成功/失败</span><span>${s.pillsRefined} / ${s.pillsFailed}</span></div>
      </div>
      <div class="btn-group" style="margin-top:16px">
        <button class="btn" id="btn-save">手动保存</button>
        <button class="btn" id="btn-export">导出存档</button>
        <button class="btn" id="btn-import">导入存档</button>
        <button class="btn btn-danger" id="btn-reset">重置存档</button>
      </div>
      <input type="file" id="file-import" style="display:none" accept=".txt,.sav">
    `;

    this._bindClick('btn-save', () => {
      this.game.saveSystem.save(p);
      this.showToast('保存成功', 'success');
    });

    this._bindClick('btn-export', () => {
      const data = this.game.saveSystem.exportSave(p);
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cultivation_save_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('存档已导出', 'success');
    });

    this._bindClick('btn-import', () => {
      document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = this.game.saveSystem.importSave(ev.target.result);
        if (data) {
          this.game.player.deserialize(data);
          this.showToast('存档已导入', 'success');
          this.updateStatusBar();
          this.renderSettings();
        } else {
          this.showToast('导入失败：存档无效', 'error');
        }
      };
      reader.readAsText(file);
    });

    this._bindClick('btn-reset', () => {
      if (confirm('确定要重置存档吗？此操作不可恢复！')) {
        this.game.saveSystem.deleteSave();
        this.game.player = null;
        this.game.initNewGame();
        this.showToast('存档已重置', 'info');
        this.updateStatusBar();
        this.continueNewGameFlow();
      }
    });
  }

  // ===========================================================
  // SECT PANEL (宗门)
  // ===========================================================

  renderSect() {
    const p = this.game.player;
    const sect = this.game.sectSystem;

    if (!sect.hasSect()) {
      this._renderSectSelection();
      return;
    }

    // Tab state
    const tab = this._sectTab || 'overview';
    this._renderSectMain(tab);
  }

  _renderSectSelection() {
    const p = this.game.player;
    const cd = this.game.sectSystem.switchCooldown();

    // Check if player is in a trial flow
    if (p.sectTrial && !p.sectTrial.won) {
      this._renderSectTrial();
      return;
    }

    let html = '<div class="panel-title">加入宗门</div>';
    html += '<div class="card" style="margin-bottom:16px"><div class="card-desc">加入宗门需通过入宗试炼——击败所有试炼对手，夺得第一方可入宗。不同宗门对手实力差异巨大。</div></div>';
    if (cd > 0) {
      const m = Math.floor(cd / 60), s = cd % 60;
      html += `<div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent-red)"><div class="card-desc">换宗冷却中：${m}分${s}秒后可再次入宗</div></div>`;
    }

    // Difficulty labels
    const diffLabels = {
      'four_domain-true': '四域附属（练气级）',
      'four_domain-false': '四域非附属（金丹级）',
      'kunyuan-true': '坤元附属（元婴级）',
      'kunyuan-false': '坤元非附属（炼虚级）',
      'center-true': '中央附属（合体级）',
      'center-false': '中央非附属（大乘级）',
    };

    for (const sect of GameData.sects) {
      const locked = p.realmIndex < sect.minRealm;
      const reqRealm = GameData.realms[sect.minRealm].name;
      const bonusKey = Object.keys(sect.bonus)[0];
      const bonusLabel = bonusKey === 'cultivation_mult' ? '修炼速度' :
                         bonusKey === 'defense_mult' ? '防御' :
                         bonusKey === 'attack_mult' ? '攻击' : bonusKey;
      const rMap = GameData.sectRegionMap[sect.id] || {};
      const diffKey = `${rMap.region || 'four_domain'}-${rMap.affiliated}`;
      const diffLabel = diffLabels[diffKey] || '未知难度';

      html += `
        <div class="card" style="${locked ? 'opacity:0.5' : ''}">
          <div class="sect-card-head">
            ${this._assetImg(GameAssets.ui.badges[sect.id], 'sect-badge', sect.name)}
            <div>
              <div class="card-title">${sect.name} <span style="font-size:11px;color:var(--text-muted)">${sect.nameEn}</span></div>
              <div class="card-desc">${sect.desc}</div>
            </div>
          </div>
          <div class="card-row">
            <span>宗门加成：${bonusLabel} +${(Object.values(sect.bonus)[0] * 100).toFixed(0)}%</span>
          </div>
          <div class="card-row">
            <span>试炼难度</span><span style="color:var(--accent-gold);font-size:12px">${diffLabel}</span>
          </div>
          ${locked ? `<div style="font-size:12px;color:var(--accent-red)">需要 ${reqRealm}</div>` : `
            <button class="btn btn-sm btn-primary" id="btn-trial-${sect.id}">挑战入宗</button>
          `}
        </div>`;
    }

    document.getElementById('panel-sect').innerHTML = html;

    for (const sect of GameData.sects) {
      this._bindClick(`btn-trial-${sect.id}`, () => {
        if (cd > 0) {
          this.showToast('换宗冷却中', 'error');
          return;
        }
        const result = this.game.sectSystem.startTrial(sect.id);
        if (!result.ok) {
          this.showToast(result.reason, 'error');
          return;
        }
        this._renderSectTrial();
      });
    }
  }

  _renderSectTrial() {
    const p = this.game.player;
    const trial = p.sectTrial;
    if (!trial) { this._renderSectSelection(); return; }

    const sect = GameData.sects.find(s => s.id === trial.sectId);
    const trialData = this.game.sectSystem.getTrialData(trial.sectId);
    if (!sect || !trialData) { this._renderSectSelection(); return; }

    // If won, show join button
    if (trial.won) {
      document.getElementById('panel-sect').innerHTML = `
        <div class="panel-title">试炼通过！</div>
        <div class="card" style="text-align:center;border:2px solid var(--accent-gold)">
          <div style="font-size:18px;color:var(--accent-gold);margin-bottom:12px">恭喜击败所有对手！</div>
          <div class="card-desc">你已证明实力，可以正式加入${sect.name}。</div>
          <button class="btn btn-primary" id="btn-confirm-join" style="margin-top:16px">正式加入${sect.name}</button>
          <button class="btn btn-sm" id="btn-cancel-trial" style="margin-top:8px">放弃</button>
        </div>`;
      this._bindClick('btn-confirm-join', () => {
        if (this.game.sectSystem.joinSect(trial.sectId)) {
          this.showToast(`加入${sect.name}！`, 'legendary');
          this.renderSect();
        }
      });
      this._bindClick('btn-cancel-trial', () => {
        this.game.sectSystem.cancelTrial();
        this._renderSectSelection();
      });
      return;
    }

    // Show opponent ladder + current fight
    const opponent = this.game.sectSystem.getCurrentTrialOpponent();
    let ladderHtml = '';
    for (let i = 0; i < trialData.opponents.length; i++) {
      const opp = trialData.opponents[i];
      const isCurrent = i === trial.currentOpponent;
      const isDefeated = i < trial.currentOpponent;
      const cls = isCurrent ? 'trial-opp-current' : isDefeated ? 'trial-opp-defeated' : 'trial-opp-pending';
      ladderHtml += `<div class="trial-opponent ${cls}">
        <span>${isDefeated ? '✓' : isCurrent ? '▶' : '○'} ${opp.name}</span>
        <span style="font-size:11px;color:var(--text-muted)">HP:${BigNum.format(opp.hp)} ATK:${BigNum.format(opp.attack)}</span>
      </div>`;
    }

    document.getElementById('panel-sect').innerHTML = `
      <div class="panel-title">${sect.name} · 入宗试炼</div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-desc">击败所有对手，夺得第一方可入宗。</div>
        <div style="margin:8px 0;font-size:12px">进度：${trial.currentOpponent} / ${trialData.opponents.length}</div>
        ${ladderHtml}
      </div>
      <div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent-red)">
        <div class="card-title">当前对手：${opponent.name}</div>
        <div class="card-row"><span>生命</span><span>${BigNum.format(opponent.hp)}</span></div>
        <div class="card-row"><span>攻击</span><span>${BigNum.format(opponent.attack)}</span></div>
        <div class="card-row"><span>防御</span><span>${BigNum.format(opponent.defense)}</span></div>
      </div>
      <div style="text-align:center">
        <button class="btn btn-primary" id="btn-start-trial-fight">开始战斗</button>
        <button class="btn btn-sm" id="btn-cancel-trial" style="margin-left:8px">放弃试炼</button>
      </div>`;

    this._bindClick('btn-start-trial-fight', () => {
      const opp = this.game.sectSystem.getCurrentTrialOpponent();
      if (!opp) return;
      this._sectTrialCombat = true;
      this.game.combatSystem.start(opp);
      this._renderSectTrialCombat();
    });
    this._bindClick('btn-cancel-trial', () => {
      this.game.sectSystem.cancelTrial();
      this._renderSectSelection();
    });
  }

  _renderSectTrialCombat() {
    const combat = this.game.combatSystem;
    const p = this.game.player;
    const trial = p.sectTrial;
    const sect = trial ? GameData.sects.find(s => s.id === trial.sectId) : null;

    const playerHpPct = Math.max(0, (combat.playerHp / p.maxHp) * 100);
    const enemyHpPct = Math.max(0, (combat.enemyHp / combat.enemyMaxHp) * 100);

    let logHtml = combat.log.slice(-8).map(l => `<div class="combat-log-entry">${l}</div>`).join('');

    const outerTechs = (p.equippedOuterTechniques || []);
    const innerTechs = (p.equippedInnerTechniques || []);

    const outerBtns = outerTechs.map(tid => {
      const tech = GameData.techniques.find(t => t.id === tid);
      if (!tech) return '';
      const selected = combat.selectedOuter === tid;
      return `<button class="btn btn-tech ${selected ? 'btn-tech-selected' : ''}" data-tech-outer="${tid}">${tech.name}</button>`;
    }).join('');

    const innerBtns = innerTechs.map(tid => {
      const tech = GameData.techniques.find(t => t.id === tid);
      if (!tech) return '';
      const selected = combat.selectedInner === tid;
      return `<button class="btn btn-tech ${selected ? 'btn-tech-selected' : ''}" data-tech-inner="${tid}">${tech.name}</button>`;
    }).join('');

    const noOuter = outerTechs.length === 0;
    const noInner = innerTechs.length === 0;

    let resultHtml = '';
    if (combat.result === 'win') {
      resultHtml = `<div style="text-align:center;color:var(--accent-gold);margin:12px 0;font-size:16px">胜利！</div>
        <button class="btn btn-primary" id="btn-trial-next">继续</button>`;
    } else if (combat.result === 'lose') {
      resultHtml = `<div style="text-align:center;color:var(--accent-red);margin:12px 0;font-size:16px">败北...</div>
        <div class="card-desc" style="text-align:center">修整后可再次挑战</div>
        <div style="text-align:center;margin-top:8px">
          <button class="btn btn-primary" id="btn-trial-retry">重新挑战</button>
          <button class="btn btn-sm" id="btn-trial-giveup" style="margin-left:8px">放弃试炼</button>
        </div>`;
    }

    document.getElementById('panel-sect').innerHTML = `
      <div class="panel-title">${sect ? sect.name : ''}试炼 · 战斗 <span style="font-size:12px;color:var(--text-secondary)">第 ${combat.turnCount + 1} 回合</span></div>
      <div class="combat-arena">
        <div class="combat-field">
          <div class="combat-party combat-party-enemy">
            <div class="combat-unit combat-unit-enemy">
              <div class="combat-portrait-circle enemy-circle">${combat.enemy.name.charAt(0)}</div>
              <div class="combat-unit-info">
                <div class="combat-unit-name" style="color:var(--accent-red)">${combat.enemy.name}</div>
                <div class="progress-bar" style="margin-top:2px">
                  <div class="progress-fill" style="width:${enemyHpPct}%;background:var(--accent-red)"></div>
                  <div class="progress-text">${BigNum.format(combat.enemyHp)} / ${BigNum.format(combat.enemyMaxHp)}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="combat-vs">VS</div>
          <div class="combat-party combat-party-player">
            <div class="combat-unit combat-unit-player">
              <div class="combat-portrait-circle player-circle">你</div>
              <div class="combat-unit-info">
                <div class="combat-unit-name">你 · ${p.getRealm().name}</div>
                <div class="progress-bar" style="margin-top:2px">
                  <div class="progress-fill" style="width:${playerHpPct}%;background:var(--accent-green)"></div>
                  <div class="progress-text">${BigNum.format(combat.playerHp)} / ${BigNum.format(p.maxHp)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="combat-tech-select">
          <div class="combat-tech-row">
            <span class="combat-tech-label">外功</span>
            <div class="combat-tech-btns">${noOuter ? '<span style="color:var(--text-secondary);font-size:12px">未装备</span>' : outerBtns}</div>
          </div>
          <div class="combat-tech-row">
            <span class="combat-tech-label">内功</span>
            <div class="combat-tech-btns">${noInner ? '<span style="color:var(--text-secondary);font-size:12px">未装备</span>' : innerBtns}</div>
          </div>
        </div>
      </div>
      <div class="combat-log">${logHtml}</div>
      ${!combat.result ? `
        <div style="text-align:center;margin-top:12px">
          <button class="btn btn-primary" id="btn-combat-next">下一回合</button>
          <button class="btn btn-sm" id="btn-combat-auto" style="margin-left:8px">自动战斗</button>
          ${(p.inventory['huixue_dan'] || 0) > 0 ? `<button class="btn btn-sm" id="btn-combat-heal" style="margin-left:8px">回血丹(${p.inventory['huixue_dan']})</button>` : ''}
        </div>` : resultHtml}`;

    // Bind technique selection
    document.querySelectorAll('[data-tech-outer]').forEach(btn => {
      btn.addEventListener('click', () => {
        combat.selectedOuter = combat.selectedOuter === btn.dataset.techOuter ? null : btn.dataset.techOuter;
        this._renderSectTrialCombat();
      });
    });
    document.querySelectorAll('[data-tech-inner]').forEach(btn => {
      btn.addEventListener('click', () => {
        combat.selectedInner = combat.selectedInner === btn.dataset.techInner ? null : btn.dataset.techInner;
        this._renderSectTrialCombat();
      });
    });

    // Bind combat buttons
    this._bindClick('btn-combat-next', () => {
      combat.tick();
      this._renderSectTrialCombat();
    });
    this._bindClick('btn-combat-auto', () => {
      const autoFight = () => {
        if (!combat.inCombat || combat.result) {
          this._renderSectTrialCombat();
          return;
        }
        combat.tick();
        this._renderSectTrialCombat();
        if (!combat.result) setTimeout(autoFight, 150);
      };
      autoFight();
    });
    this._bindClick('btn-combat-heal', () => {
      combat.useHealPill();
      this._renderSectTrialCombat();
    });

    // Win: advance trial
    this._bindClick('btn-trial-next', () => {
      const result = this.game.sectSystem.advanceTrial();
      this._sectTrialCombat = false;
      if (result.complete) {
        this.showToast('试炼通过！击败了所有对手！', 'legendary');
      }
      this._renderSectTrial();
    });
    // Lose: retry or give up
    this._bindClick('btn-trial-retry', () => {
      this._sectTrialCombat = false;
      // Reset to same opponent
      this._renderSectTrial();
    });
    this._bindClick('btn-trial-giveup', () => {
      this.game.sectSystem.cancelTrial();
      this._sectTrialCombat = false;
      this._renderSectSelection();
    });
  }

  _renderSectMain(tab) {
    const p = this.game.player;
    const sect = this.game.sectSystem;
    const sectData = sect.getSect();
    const pos = sect.getPosition();
    const nextPos = GameData.sectPositions[(sect.getPositionIndex() + 1)] || null;

    // Tabs
    const tabs = ['overview', 'missions', 'shop'];
    const tabNames = { overview: '总览', missions: '任务堂', shop: '宗门商店' };
    let tabsHtml = tabs.map(t =>
      `<button class="btn btn-sm ${tab === t ? 'btn-primary' : ''}" data-sect-tab="${t}">${tabNames[t]}</button>`
    ).join('');

    let contentHtml = '';

    if (tab === 'overview') {
      const bonusKey = Object.keys(sectData.bonus)[0];
      const bonusLabel = bonusKey === 'cultivation_mult' ? '修炼速度' :
                         bonusKey === 'defense_mult' ? '防御' :
                         bonusKey === 'attack_mult' ? '攻击' : bonusKey;

      const canPromote = sect.canPromote();
      const salary = sect.getSalary();
      const commission = sect.getCommissionRate();

      contentHtml = `
        <div class="card">
          <div class="sect-card-head">
            ${this._assetImg(GameAssets.npcPortraits.sect_avatar, 'sect-badge', sectData.name)}
            <div>
              <div class="card-title">${sectData.name}</div>
              <div class="card-desc">${sectData.desc}</div>
            </div>
          </div>
          <div class="card-row"><span>宗门加成</span><span style="color:var(--accent-green)">${bonusLabel} +${(Object.values(sectData.bonus)[0] * 100).toFixed(0)}%</span></div>
        </div>

        <div class="card">
          <div class="card-title">当前职位：${pos.name}</div>
          <div class="card-desc">${pos.desc}</div>
          <div class="card-row"><span>贡献度</span><span style="color:var(--accent-gold)">${BigNum.format(p.sectContribution || 0)}</span></div>
          <div class="card-row"><span>累计贡献</span><span>${BigNum.format(p.sectTotalContribution || 0)}</span></div>
          <div class="card-row"><span>每日俸禄</span><span style="color:var(--accent-gold)">${BigNum.format(salary)} 灵石</span></div>
          ${commission > 0 ? `<div class="card-row"><span>弟子提成</span><span style="color:var(--accent-cyan)">${(commission * 100).toFixed(0)}%</span></div>` : ''}
          <div class="card-row"><span>任务栏位</span><span>${(p.activeMissions || []).length} / ${p.sectMissionSlots || 2}</span></div>

          ${nextPos ? `
            <div style="margin-top:10px">
              <div style="font-size:12px;color:var(--text-muted)">下一职位：${nextPos.name}（需要 ${BigNum.format(nextPos.contributionReq)} 累计贡献）</div>
              <div class="progress-bar" style="margin:6px 0">
                <div class="progress-fill" style="width:${Math.min(100, ((p.sectTotalContribution || 0) / nextPos.contributionReq) * 100)}%"></div>
                <div class="progress-text">${BigNum.format(p.sectTotalContribution || 0)} / ${BigNum.format(nextPos.contributionReq)}</div>
              </div>
              <button class="btn btn-sm btn-primary" id="btn-promote" ${!canPromote ? 'disabled' : ''}>
                ${canPromote ? `晋升为${nextPos.name}` : '贡献不足'}
              </button>
            </div>
          ` : '<div style="margin-top:8px;color:var(--accent-gold);font-size:12px">已达最高职位</div>'}
        </div>

        <div class="card">
          <div class="card-row">
            <span>每日俸禄</span>
            <button class="btn btn-sm" id="btn-salary" ${p.sectSalaryCollected ? 'disabled' : ''}>
              ${p.sectSalaryCollected ? '已领取' : `领取 ${BigNum.format(salary)} 灵石`}
            </button>
          </div>
        </div>

        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-danger btn-sm" id="btn-leave-sect">离开宗门（贡献清零）</button>
          <button class="btn btn-sm" id="btn-switch-sect">换宗 · 选择新宗门</button>
        </div>
      `;
    } else if (tab === 'missions') {
      contentHtml = this._renderMissionHall();
    } else if (tab === 'shop') {
      contentHtml = this._renderSectShop();
    }

    document.getElementById('panel-sect').innerHTML = `
      <div class="panel-title">宗门</div>
      <div class="btn-group" style="margin-bottom:16px">${tabsHtml}</div>
      ${contentHtml}
    `;

    // Bind tab switches
    document.querySelectorAll('[data-sect-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._sectTab = btn.dataset.sectTab;
        this.renderSect();
      });
    });

    // Bind overview actions
    this._bindClick('btn-promote', () => {
      if (sect.promote()) {
        this.showToast(`晋升成功！`, 'legendary');
        this.renderSect();
      }
    });

    this._bindClick('btn-salary', () => {
      const amount = sect.collectSalary();
      if (amount > 0) {
        this.showToast(`领取俸禄 ${BigNum.format(amount)} 灵石`, 'success');
        this.renderSect();
      }
    });

    this._bindClick('btn-leave-sect', () => {
      if (confirm('确定离开宗门？贡献度将被清零！')) {
        sect.leaveSect();
        this.showToast('已离开宗门，10分钟后可再次入宗', 'info');
        this.renderSect();
      }
    });

    this._bindClick('btn-switch-sect', () => {
      if (!confirm('换宗将清零当前宗门贡献，并冷却 10 分钟。继续？')) return;
      sect.leaveSect();
      this.showToast('已离开当前宗门，请选择新宗门', 'info');
      this.renderSect();
    });

    // Bind mission actions
    document.querySelectorAll('[data-accept-mission]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = sect.acceptMission(btn.dataset.acceptMission);
        if (result.ok) {
          this.showToast('接取任务成功', 'success');
          this.renderSect();
        } else {
          this.showToast(result.reason, 'error');
        }
      });
    });

    document.querySelectorAll('[data-complete-mission]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = sect.completeMission(btn.dataset.completeMission);
        if (result.ok) {
          const m = result.mission;
          let msg = `完成任务：${m.name}\n获得贡献：${m.contribution}`;
          if (m.reward) {
            const rStr = Object.entries(m.reward)
              .map(([k, v]) => `${GameData.items[k]?.name || k} x${v}`)
              .join(', ');
            msg += `\n奖励：${rStr}`;
          }
          if (result.commissionGain > 0) {
            msg += `\n职位提成：+${result.commissionGain} 贡献`;
          }
          this.showToast(`任务完成：${m.name}`, 'success');
          this.renderSect();
        } else {
          this.showToast(result.reason, 'error');
        }
      });
    });

    // Bind sect shop buy
    document.querySelectorAll('[data-buy-sect]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = sect.buyFromShop(btn.dataset.buySect);
        if (result.ok) {
          this.showToast(`购买成功：${result.item.name}`, 'success');
          this.renderSect();
        } else {
          this.showToast(result.reason, 'error');
        }
      });
    });
  }

  _renderMissionHall() {
    const p = this.game.player;
    const sect = this.game.sectSystem;
    const available = sect.getAvailableMissions();
    const active = p.activeMissions || [];

    // Active missions
    let html = '';
    if (active.length > 0) {
      html += '<div class="card" style="margin-bottom:12px"><div class="card-title">进行中的任务</div>';
      for (const am of active) {
        const m = GameData.sectMissions.find(x => x.id === am.id);
        if (!m) continue;
        html += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color)">
            <div>
              <div style="font-size:13px;font-weight:bold">${m.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${m.desc}</div>
            </div>
            <button class="btn btn-sm btn-primary" data-complete-mission="${m.id}">完成</button>
          </div>`;
      }
      html += '</div>';
    }

    // Required daily missions
    const dailies = available.filter(m => m.required);
    if (dailies.length > 0) {
      html += '<div style="font-size:14px;color:var(--accent-red);margin:10px 0 6px;font-weight:bold">弟子必做任务</div>';
      for (const m of dailies) {
        const check = sect.canAcceptMission(m.id);
        html += this._missionCard(m, check);
      }
    }

    // Contribution missions
    const contrib = available.filter(m => !m.required && m.type === 'contribution');
    if (contrib.length > 0) {
      html += '<div style="font-size:14px;color:var(--accent-blue);margin:10px 0 6px;font-weight:bold">贡献任务</div>';
      for (const m of contrib) {
        const check = sect.canAcceptMission(m.id);
        html += this._missionCard(m, check);
      }
    }

    // Special missions
    const special = available.filter(m => m.type === 'special');
    if (special.length > 0) {
      html += '<div style="font-size:14px;color:var(--accent-purple);margin:10px 0 6px;font-weight:bold">特殊任务</div>';
      for (const m of special) {
        const check = sect.canAcceptMission(m.id);
        html += this._missionCard(m, check);
      }
    }

    if (available.length === 0 && active.length === 0) {
      html += '<div class="card" style="text-align:center;color:var(--text-muted)">暂无可接任务</div>';
    }

    return html;
  }

  _missionCard(m, check) {
    const typeLabel = m.required ? '<span style="color:var(--accent-red)">[必做]</span>' :
                      m.type === 'special' ? '<span style="color:var(--accent-purple)">[特殊]</span>' :
                      '<span style="color:var(--accent-blue)">[贡献]</span>';
    return `
      <div class="card" style="margin-bottom:6px">
        <div class="card-row">
          <span>${typeLabel} <strong>${m.name}</strong></span>
          <span style="font-size:11px;color:var(--text-muted)">难度 ${m.difficulty}</span>
        </div>
        <div class="card-desc">${m.desc}</div>
        <div class="card-row">
          <span>贡献 +${m.contribution} ${m.spiritCost > 0 ? `| 神识 -${m.spiritCost}` : ''}</span>
          <button class="btn btn-sm" data-accept-mission="${m.id}" ${!check.ok ? 'disabled' : ''}>
            接取
          </button>
        </div>
        ${m.cost ? `<div style="font-size:11px;color:var(--text-muted)">消耗：${Object.entries(m.cost).map(([k,v]) => `${GameData.items[k]?.name||k} x${v}`).join(', ')}</div>` : ''}
      </div>`;
  }

  _renderSectShop() {
    const p = this.game.player;
    const sect = this.game.sectSystem;
    const access = sect.getShopAccess();
    const accessLevels = ['basic', 'outer', 'inner', 'core', 'deacon', 'elder', 'all'];

    let html = `<div class="card" style="margin-bottom:12px">
      <div class="card-row">
        <span>贡献度</span>
        <span style="color:var(--accent-gold);font-weight:bold">${BigNum.format(p.sectContribution || 0)}</span>
      </div>
    </div>`;

    html += '<div class="shop-grid">';
    for (const item of GameData.sectShopItems) {
      const locked = access !== 'all' && accessLevels.indexOf(access) < accessLevels.indexOf(item.access);
      const canBuy = !locked && (p.sectContribution || 0) >= item.cost;
      const itemData = GameData.items[item.itemId];

      html += `
        <div class="shop-item" style="${locked ? 'opacity:0.4' : ''}">
          ${this._assetImg(GameAssets.item(item.itemId), 'shop-icon', itemData?.name || item.itemId)}
          <div style="font-weight:bold" class="${InventorySystem.rarityClass(itemData?.rarity)}">${item.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${itemData?.desc || ''}</div>
          <div class="shop-price">${item.cost} 贡献${item.access !== 'basic' ? ` (${item.access})` : ''}</div>
          ${locked ? '<div style="font-size:11px;color:var(--accent-red)">职位不足</div>' :
            `<button class="btn btn-sm" data-buy-sect="${item.id}" ${!canBuy ? 'disabled' : ''}>购买</button>`}
        </div>`;
    }
    html += '</div>';

    return html;
  }

  // ===========================================================
  // AUCTION PANEL (拍卖会)
  // ===========================================================

  renderAuction() {
    const auction = this.game.auctionSystem;

    if (auction.active) {
      this._renderAuctionActive();
    } else {
      this._renderAuctionLobby();
    }
  }

  _renderAuctionLobby() {
    const auction = this.game.auctionSystem;
    const secondsLeft = auction.getSecondsUntilNext();
    const canStart = auction.canStartAuction();

    // Determine next auction tier based on region + sect affiliation
    const tierKey = auction.getAuctionTier();
    let nextTier = GameData.auctionItemPools.find(p => p.tier === tierKey) || GameData.auctionItemPools[0];

    let html = '<div class="panel-title">拍卖会</div>';

    html += `
      <div class="card auction-lobby-card" style="margin-bottom:16px">
        ${this._assetImg(GameAssets.npcPortraits.auction_host, 'auction-host', '拍卖主持')}
        <div class="card-title">拍卖章程</div>
        <div style="font-size:13px;line-height:1.8;color:var(--text-secondary)">
          <p>一、拍卖会每4小时开放一次，届时天下修士齐聚竞价。</p>
          <p>二、每次拍卖上拍4-6件珍品，以灵石竞价。</p>
          <p>三、竞拍倒计时最后30秒内有新出价，则倒计时重置为30秒（防秒杀机制）。</p>
          <p>四、出价不得低于当前最高价的105%。</p>
          <p>五、一口价功能：出价为当前价110%可快速竞拍。</p>
          <p>六、NPC修士将参与竞拍，各具性格——有人激进有人保守。</p>
          <p>七、拍卖结束且无人加价时，价高者得。灵石当场扣除。</p>
          <p>八、拍卖等级由所在地域及宗门归属决定。</p>
          <p>九、本次拍卖等级：<strong>${nextTier.name}</strong></p>
        </div>
      </div>`;

    if (canStart) {
      html += `
        <div class="card breakthrough-ready" style="text-align:center;padding:24px">
          <div style="font-size:18px;font-weight:bold;color:var(--accent-gold);margin-bottom:8px">${nextTier.name}即将开拍</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">各路修士已就座，等你入场</div>
          <button class="btn btn-primary" id="btn-start-auction" style="font-size:16px;padding:10px 24px">
            进入拍卖会
          </button>
        </div>`;
    } else {
      const hours = Math.floor(secondsLeft / 3600);
      const mins = Math.floor((secondsLeft % 3600) / 60);
      const secs = Math.floor(secondsLeft % 60);
      html += `
        <div class="card" style="text-align:center;padding:24px">
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">距下次拍卖会</div>
          <div style="font-size:28px;font-weight:bold;color:var(--accent-gold)">${hours}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">拍卖等级：${nextTier.name}</div>
        </div>`;
    }

    // Show last auction results
    if (auction.results && auction.results.length > 0) {
      html += '<div style="margin-top:16px"><div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">上次拍卖结果</div>';
      for (const r of auction.results) {
        const item = GameData.items[r.itemId];
        const won = r.winner === 'player';
        html += `
          <div class="card" style="margin-bottom:4px;padding:10px">
            <div class="card-row">
              <span class="item-title ${InventorySystem.rarityClass(item?.rarity)}">${this._assetImg(GameAssets.item(r.itemId), 'tiny-icon', item?.name || r.itemId)}${item?.name || r.itemId} x${r.amount}</span>
              <span style="font-size:12px">${BigNum.format(r.finalPrice)} 灵石</span>
            </div>
            <div style="font-size:11px;color:${won ? 'var(--accent-green)' : 'var(--text-muted)'}">
              ${won ? '你竞得此物' : `被 ${r.winner} 拍得`}
            </div>
          </div>`;
      }
      html += '</div>';
    }

    document.getElementById('panel-auction').innerHTML = html;

    this._bindClick('btn-start-auction', () => {
      if (auction.startAuction()) {
        this._startAuctionTicks();
        this.renderAuction();
      }
    });
  }

  _renderAuctionActive() {
    const p = this.game.player;
    const auction = this.game.auctionSystem;
    const current = auction.getCurrentItem();

    if (!current) {
      auction.active = false;
      this.renderAuction();
      return;
    }

    const item = GameData.items[current.itemId];
    const minBid = Math.ceil(current.currentBid * 1.05);
    const quickBid = Math.ceil(current.currentBid * 1.1);
    const isWinning = current.currentBidder === 'player';

    // Item list
    let itemsListHtml = '';
    for (let i = 0; i < auction.items.length; i++) {
      const ai = auction.items[i];
      const aItem = GameData.items[ai.itemId];
      const isCurrent = i === auction.currentItemIndex;
      itemsListHtml += `
        <div style="display:flex;justify-content:space-between;padding:6px 8px;font-size:12px;
          ${isCurrent ? 'background:rgba(212,168,83,0.1);border:1px solid var(--accent-gold);border-radius:4px' : ai.sold ? 'opacity:0.4' : ''}
          margin-bottom:2px">
          <span class="item-title ${InventorySystem.rarityClass(aItem?.rarity)}">${this._assetImg(GameAssets.item(ai.itemId), 'tiny-icon', aItem?.name || ai.itemId)}${aItem?.name || ai.itemId} x${ai.amount}</span>
          <span style="color:var(--text-muted)">${ai.sold ? (ai.currentBidder === 'player' ? '已竞得' : '已售') : (isCurrent ? '竞拍中' : '待拍')}</span>
        </div>`;
    }

    // NPC list
    let npcHtml = auction.npcBidders.map(npc =>
      `<span class="auction-npc-chip">${this._assetImg(GameAssets.auctionAvatars[npc.name], 'auction-avatar', npc.name)}${npc.name} (${npc.style === 'aggressive' ? '激进' : npc.style === 'conservative' ? '保守' : npc.style === 'moderate' ? '稳健' : '莫测'})</span>`
    ).join('');

    document.getElementById('panel-auction').innerHTML = `
      <div class="panel-title">拍卖会 — ${auction.tier.name}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">拍品列表</div>
          ${itemsListHtml}
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">参与竞拍者</div>
          <div style="font-size:12px;color:var(--accent-gold);margin-bottom:4px">你 (灵石: ${BigNum.format(p.spiritStones)})</div>
          ${npcHtml}
        </div>
      </div>

      <div class="card breakthrough-ready" style="padding:20px;margin-bottom:12px">
        <div style="text-align:center;margin-bottom:8px">
          <span class="auction-current-item ${InventorySystem.rarityClass(item?.rarity)}">${this._assetImg(GameAssets.item(current.itemId), 'auction-item-icon', item?.name || current.itemId)}${item?.name || current.itemId} x${current.amount}</span>
          <div style="font-size:12px;color:var(--text-muted)">${item?.desc || ''}</div>
        </div>

        <div style="text-align:center;font-size:36px;font-weight:bold;color:${isWinning ? 'var(--accent-green)' : 'var(--accent-red)'};margin:12px 0">
          ${BigNum.format(current.currentBid)} 灵石
        </div>

        <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:4px">
          当前最高出价者：${isWinning ? '<span style="color:var(--accent-green)">你</span>' : `<span style="color:var(--accent-red)">${current.currentBidder}</span>`}
        </div>

        <div style="text-align:center;font-size:24px;color:var(--accent-gold);margin:8px 0;font-weight:bold">
          ${auction.countdown}s
        </div>
        <div class="progress-bar" style="margin-bottom:12px">
          <div class="progress-fill" style="width:${(auction.countdown / auction.baseCountdown) * 100}%;background:var(--accent-gold)"></div>
        </div>

        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn" id="btn-bid-custom" ${p.spiritStones < minBid ? 'disabled' : ''}>
            出价 ${BigNum.format(minBid)}
          </button>
          <button class="btn btn-primary" id="btn-bid-quick" ${p.spiritStones < quickBid ? 'disabled' : ''}>
            一口价 ${BigNum.format(quickBid)}
          </button>
        </div>
        <div style="text-align:center;margin-top:6px;font-size:11px;color:var(--text-muted)">
          最后30秒内有出价将重置倒计时
        </div>
      </div>

      <div style="text-align:center">
        <button class="btn btn-danger btn-sm" id="btn-leave-auction">离开拍卖会</button>
      </div>
    `;

    this._bindClick('btn-bid-custom', () => {
      const result = auction.placeBid(minBid);
      if (result.ok) {
        this.showToast(`出价 ${BigNum.format(minBid)} 灵石`, 'info');
      } else {
        this.showToast(result.reason, 'error');
      }
      this._renderAuctionActive();
    });

    this._bindClick('btn-bid-quick', () => {
      const result = auction.quickBid();
      if (result.ok) {
        this.showToast(`一口价 ${BigNum.format(quickBid)} 灵石！`, 'success');
      } else {
        this.showToast(result.reason, 'error');
      }
      this._renderAuctionActive();
    });

    this._bindClick('btn-leave-auction', () => {
      if (confirm('确定离开拍卖会？当前竞拍将放弃。')) {
        auction.leaveAuction();
        this.renderAuction();
      }
    });
  }

  _startAuctionTicks() {
    if (this._auctionInterval) clearInterval(this._auctionInterval);
    this._auctionInterval = setInterval(() => {
      const auction = this.game.auctionSystem;
      if (!auction.active) {
        clearInterval(this._auctionInterval);
        this._auctionInterval = null;
        if (this.currentPanel === 'auction') this.renderAuction();
        return;
      }

      const result = auction.tick();
      if (result) {
        if (result.type === 'item_sold') {
          const r = result.result;
          const item = GameData.items[r.itemId];
          if (r.winner === 'player') {
            this.showToast(`竞得 ${item?.name || r.itemId} x${r.amount}！`, 'legendary');
          } else {
            this.showToast(`${item?.name || r.itemId} 被 ${r.winner} 拍走`, 'info');
          }
        } else if (result.type === 'auction_end') {
          this.showToast('拍卖会结束！', 'success');
          clearInterval(this._auctionInterval);
          this._auctionInterval = null;
        }
      }

      if (this.currentPanel === 'auction') this._renderAuctionActive();
    }, 1000);
  }

  // ---- Helpers ----
  _assetImg(src, className = '', alt = '') {
    return GameAssets.img(src, className, alt);
  }

  _playerCombatPortrait() {
    for (const techId of this.game.player.equippedTechniques) {
      const tech = GameData.techniques.find(t => t.id === techId);
      if (tech && GameAssets.combat[tech.school]) {
        return GameAssets.combat[tech.school];
      }
    }
    return GameAssets.combat.sword;
  }

  _showEffectOverlay(src) {
    if (!src) return;
    const overlay = document.createElement('div');
    overlay.className = 'effect-overlay';
    overlay.innerHTML = GameAssets.img(src, 'effect-overlay-img', '');
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2400);
  }

  _bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  _showModal(title, content, onClose) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    modal.innerHTML = `
      <div class="modal-title">${title}</div>
      <div style="font-size:14px;line-height:1.8;white-space:pre-wrap">${content}</div>
      <div style="text-align:center;margin-top:16px">
        <button class="btn btn-primary" id="btn-modal-close">确定</button>
      </div>
    `;
    overlay.classList.add('active');

    this._bindClick('btn-modal-close', () => {
      overlay.classList.remove('active');
      if (onClose) onClose();
    });
  }

  // Continue the new-game selection chain (profession → talent → birthplace)
  continueNewGameFlow() {
    setTimeout(() => {
      try {
        const p = this.game.player;
        if (!p.professions || p.professions.length === 0) {
          this.showProfessionSelection();
        } else if (!p.talents || p.talents.length === 0) {
          this.showTalentSelection();
        } else if (!this.game.worldSystem.hasBirthplace()) {
          this.showBirthplaceSelection();
        } else {
          this.updateStatusBar();
          this.renderPanel(this.currentPanel);
        }
      } catch (e) {
        console.error('New game flow error:', e);
      }
    }, 50);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  _initParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 4 + 's';
      p.style.animationDuration = (3 + Math.random() * 4) + 's';
      container.appendChild(p);
    }
  }

  // =========================================================
  // Talent selection (shown at new game, after professions)
  // =========================================================
  showTalentSelection() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    const selected = [];

    const categories = [...new Set(GameData.talents.map(t => t.category))];
    const rarityColors = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ff9800', mythic: '#f44336' };

    let activeCategory = categories[0];

    const render = () => {
      const filtered = GameData.talents.filter(t => t.category === activeCategory);
      const itemsHtml = filtered.map(t => {
        const isSelected = selected.includes(t.id);
        return `<div class="talent-card ${isSelected ? 'selected' : ''}" data-talent="${t.id}">
          <div class="talent-card-name" style="color:${rarityColors[t.rarity] || '#fff'}">${t.name}</div>
          <div class="talent-card-desc">${t.desc}</div>
          <div class="talent-card-rarity">${t.rarity}</div>
          ${isSelected ? '<div class="talent-check">&#10003;</div>' : ''}
        </div>`;
      }).join('');

      const catsHtml = categories.map(c =>
        `<button class="btn btn-sm ${c === activeCategory ? 'btn-primary' : ''}" data-tal-cat="${c}">${c}</button>`
      ).join('');

      modal.innerHTML = `
        <div class="talent-selection">
          <div class="talent-title">天赋觉醒</div>
          <div class="talent-subtitle">请选择五个天赋（共${GameData.talents.length}个可选）</div>
          <div class="talent-counter">已选 <strong>${selected.length}</strong> / 5</div>
          <div class="talent-selected-tags">
            ${selected.map(id => {
              const t = GameData.talents.find(t2 => t2.id === id);
              return `<span class="talent-tag" style="border-color:${rarityColors[t?.rarity] || '#fff'}">${t ? t.name : id}</span>`;
            }).join('')}
          </div>
          <div class="talent-cats">${catsHtml}</div>
          <div class="talent-grid">${itemsHtml}</div>
          <div class="talent-confirm">
            <button class="btn" id="btn-talent-back" style="margin-right:8px">← 上一步</button>
            <button class="btn btn-primary" id="btn-confirm-talent" ${selected.length !== 5 ? 'disabled' : ''}>
              确认天赋${selected.length === 5 ? ' → 选择出生地' : `（还需${5 - selected.length}个）`}
            </button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      // Category tabs
      document.querySelectorAll('[data-tal-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCategory = btn.dataset.talCat;
          render();
        });
      });

      // Talent selection
      document.querySelectorAll('.talent-card').forEach(el => {
        el.addEventListener('click', () => {
          const talId = el.dataset.talent;
          const idx = selected.indexOf(talId);
          if (idx >= 0) {
            selected.splice(idx, 1);
          } else if (selected.length < 5) {
            selected.push(talId);
          }
          render();
        });
      });

      // Back button — return to profession selection
      document.getElementById('btn-talent-back').addEventListener('click', () => {
        this.game.player.professions = [];
        this.continueNewGameFlow();
      });

      // Confirm
      document.getElementById('btn-confirm-talent').addEventListener('click', () => {
        if (selected.length !== 5) return;
        // Snapshot pre-talent stats so a "back from birthplace" can rollback
        // additive effects (e.g. startCultivation) without double-counting.
        this._preTalentSnapshot = {
          cultivation: this.game.player.cultivation,
          totalCultivation: this.game.player.stats.totalCultivation,
          spiritStones: this.game.player.spiritStones,
        };
        this.game.player.talents = [...selected];
        this.game.player.recalcTalentModifiers();
        // Apply one-time talent effects
        for (const talId of selected) {
          const tal = GameData.talents.find(t => t.id === talId);
          if (tal && tal.modifiers) {
            if (tal.modifiers.startStoneMult) {
              this.game.player.spiritStones = 100 * tal.modifiers.startStoneMult;
            }
            if (tal.modifiers.startCultivation) {
              this.game.player.cultivation += tal.modifiers.startCultivation;
              this.game.player.stats.totalCultivation += tal.modifiers.startCultivation;
            }
          }
        }
        this.game.player.recalcStats();
        this.showToast(`天赋觉醒：${selected.map(id => GameData.talents.find(t => t.id === id)?.name || id).join('、')}`, 'legendary');
        this.game.saveSystem.save(this.game.player);
        this.updateStatusBar();
        this.continueNewGameFlow();
      });
    }

    render();
  }

  // =========================================================
  // Profession selection (shown at new game, before birthplace)
  // =========================================================
  showProfessionSelection() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    const selected = [];

    const bonusLabels = {
      attack_pct: '攻击', defense_pct: '防御', max_hp_pct: '生命',
      cultivation_mult: '修炼速度', crit_rate: '暴击率', crit_damage: '暴击伤害',
      defense_break: '破甲', life_steal: '吸血', hp_regen_pct: '生命回复',
      maxSpirit: '神识',
    };

    const bonusStr = (b) => {
      return Object.entries(b).map(([k, v]) => {
        const lbl = bonusLabels[k] || k;
        const isPct = ['attack_pct', 'defense_pct', 'max_hp_pct', 'crit_rate', 'crit_damage', 'defense_break', 'life_steal', 'hp_regen_pct'].includes(k);
        return `${lbl}+${isPct ? (v * 100).toFixed(0) + '%' : v}`;
      }).join('  ');
    };

    const render = () => {
      let catsHtml = '';
      for (const cat of GameData.professionCategories) {
        const itemsHtml = cat.items.map(item => {
          const isSelected = selected.includes(item.id);
          return `<div class="prof-item ${isSelected ? 'selected' : ''}" data-prof="${item.id}">
            <div class="prof-item-name">${item.name}</div>
            <div class="prof-item-desc">${item.desc}</div>
            <div class="prof-item-bonus">${bonusStr(item.bonus)}</div>
            ${isSelected ? '<div class="prof-check">&#10003;</div>' : ''}
          </div>`;
        }).join('');

        catsHtml += `
          <div class="prof-category">
            <div class="prof-cat-header" data-cat="${cat.id}">
              <div class="prof-cat-name">${cat.name}</div>
              <div class="prof-cat-desc">${cat.desc}</div>
              <div class="prof-cat-arrow">&#9662;</div>
            </div>
            <div class="prof-cat-items" data-cat-items="${cat.id}" style="display:none">
              ${itemsHtml}
            </div>
          </div>`;
      }

      modal.innerHTML = `
        <div class="prof-selection">
          <div class="prof-title">选择修行之路</div>
          <div class="prof-subtitle">请选择三个职业（点击类别展开）</div>
          <div class="prof-counter">已选 <strong>${selected.length}</strong> / 3</div>
          <div class="prof-selected-tags">
            ${selected.map(id => {
              const p = GameData.getProfession(id);
              return `<span class="prof-tag">${p ? p.name : id}</span>`;
            }).join('')}
          </div>
          <div class="prof-categories">${catsHtml}</div>
          <div class="prof-confirm">
            <button class="btn btn-primary" id="btn-confirm-prof" ${selected.length !== 3 ? 'disabled' : ''}>
              确认选择${selected.length === 3 ? ' → 选择天赋' : `（还需${3 - selected.length}个）`}
            </button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      // Bind category expand/collapse
      document.querySelectorAll('.prof-cat-header').forEach(header => {
        header.addEventListener('click', () => {
          const catId = header.dataset.cat;
          const items = document.querySelector(`[data-cat-items="${catId}"]`);
          const arrow = header.querySelector('.prof-cat-arrow');
          if (items.style.display === 'none') {
            items.style.display = 'grid';
            arrow.innerHTML = '&#9652;';
          } else {
            items.style.display = 'none';
            arrow.innerHTML = '&#9662;';
          }
        });
      });

      // Bind profession item selection
      document.querySelectorAll('.prof-item').forEach(el => {
        el.addEventListener('click', () => {
          const profId = el.dataset.prof;
          const idx = selected.indexOf(profId);
          if (idx >= 0) {
            selected.splice(idx, 1);
          } else if (selected.length < 3) {
            selected.push(profId);
          }
          render();
        });
      });

      // Confirm button
      const confirmBtn = document.getElementById('btn-confirm-prof');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          if (selected.length !== 3) return;
          this.game.player.professions = [...selected];
          this.game.player.recalcStats();
          this.showToast(`已选择：${selected.map(id => GameData.getProfession(id)?.name || id).join('、')}`, 'legendary');
          this.game.saveSystem.save(this.game.player);
          this.continueNewGameFlow();
        });
      }
    }

    render();
  }

  // =========================================================
  // Birthplace selection (shown at new game)
  // =========================================================
  showBirthplaceSelection() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');

    let selectedBirthplaceId = null;
    let cards = '';
    for (const bp of GameData.birthplaces) {
      const region = GameData.worldRegions.find(r => r.id === bp.regionId);
      const items = bp.startItems ? Object.entries(bp.startItems)
        .map(([k, v]) => k === 'lingshi' ? `灵石 ${v}` : `${GameData.items[k]?.name || k} x${v}`)
        .join('、') : '';
      const bonusEntries = Object.entries(bp.bonus || {});
      const bonusStr = bonusEntries.map(([k, v]) => {
        const labels = { attack_pct: '攻击', defense_pct: '防御', max_hp_pct: '生命', cultivation_mult: '修炼速度',
                         alchemy_bonus: '炼丹成功率', forge_bonus: '炼器成功率', maxSpirit: '神识上限',
                         defense_break: '神念破防', crit_rate: '暴击率', crit_damage: '暴击伤害',
                         life_steal: '攻击回血', hp_regen_pct: '生命回复' };
        const isPct = k !== 'maxSpirit';
        return `${labels[k] || k} +${isPct ? (v * 100).toFixed(0) + '%' : v}`;
      }).join('、');
      cards += `
        <div class="card birthplace-card" role="button" tabindex="0" data-bp="${bp.id}" aria-pressed="false">
          <div class="birthplace-check">已选</div>
          <div class="card-title" style="color:${region?.color || '#ffd070'}">${bp.name} <span style="font-size:11px;color:var(--text-muted)">— ${region?.name || ''}</span></div>
          <div class="card-desc">${bp.desc}</div>
          <div class="card-row"><span style="color:var(--text-muted)">所属</span><span>${bp.faction}</span></div>
          <div class="card-row"><span style="color:var(--text-muted)">天赋</span><span style="color:var(--accent-green)">${bonusStr}</span></div>
          <div class="card-row"><span style="color:var(--text-muted)">起始物资</span><span style="color:var(--accent-gold)">${items}</span></div>
        </div>`;
    }

    modal.innerHTML = `
      <div class="modal-title">选择出生地</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">九宸衍道界，万象初分。请选择东西南北四域之一作为修途起点；中央域与坤元域不可作为初始出生地。</div>
      <div id="birthplace-list" style="max-height:55vh;overflow-y:auto">${cards}</div>
      <div class="birthplace-confirm-row">
        <button class="btn" id="btn-birthplace-back">← 上一步</button>
        <button class="btn btn-primary" id="btn-birthplace-confirm" disabled>确定</button>
      </div>
    `;
    overlay.classList.add('active');

    const confirmBtn = document.getElementById('btn-birthplace-confirm');
    const updateSelection = () => {
      modal.querySelectorAll('[data-bp]').forEach(el => {
        const isSelected = el.dataset.bp === selectedBirthplaceId;
        el.classList.toggle('selected', isSelected);
        el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
      if (confirmBtn) confirmBtn.disabled = !selectedBirthplaceId;
    };

    const birthplaceList = document.getElementById('birthplace-list');
    const selectBirthplace = (el) => {
      selectedBirthplaceId = el.dataset.bp;
      updateSelection();
    };

    if (birthplaceList) {
      birthplaceList.addEventListener('click', (ev) => {
        const el = ev.target.closest('[data-bp]');
        if (!el || !birthplaceList.contains(el)) return;
        selectBirthplace(el);
      });
      birthplaceList.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const el = ev.target.closest('[data-bp]');
        if (!el || !birthplaceList.contains(el)) return;
        ev.preventDefault();
        selectBirthplace(el);
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!selectedBirthplaceId) return;
        if (this.game.worldSystem.chooseBirthplace(selectedBirthplaceId)) {
          this._preTalentSnapshot = null;
          const birthplace = GameData.birthplaces.find(b => b.id === selectedBirthplaceId);
          this.showToast(`你诞生于${birthplace?.name || '此地'}！`, 'legendary');
          this.game.saveSystem.save(this.game.player);
          overlay.classList.remove('active');
          this.continueNewGameFlow();
        }
      });
    }

    // Back to talent selection: rollback additive talent stat changes.
    const backBtn = document.getElementById('btn-birthplace-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const snap = this._preTalentSnapshot;
        if (snap) {
          this.game.player.cultivation = snap.cultivation;
          this.game.player.stats.totalCultivation = snap.totalCultivation;
          this.game.player.spiritStones = snap.spiritStones;
        }
        this._preTalentSnapshot = null;
        this.game.player.talents = [];
        this.game.player.recalcTalentModifiers && this.game.player.recalcTalentModifiers();
        this.game.player.recalcStats();
        this.continueNewGameFlow();
      });
    }
  }

  // =========================================================
  // World panel (世界)
  // =========================================================
  renderWorld() {
    const p = this.game.player;
    const ws = this.game.worldSystem;
    const bp = ws.getBirthplace();
    const cur = ws.getCurrentRegion();
    const place = ws.getCurrentPlace();
    if (!this._worldMode) this._worldMode = 'world';
    if (!this._worldRegionId && cur) this._worldRegionId = cur.id;

    if (this._worldMode === 'region' && this._worldRegionId) {
      this._renderRegionMap(this._worldRegionId, bp, cur, place);
      return;
    }

    const markers = GameData.worldRegions.map(r => {
      const isCurrent = cur && cur.id === r.id;
      const cost = ws.getTravelCost(r.id);
      return `<button class="map-marker ${isCurrent ? 'current' : ''}" style="left:${r.x * 100}%;top:${r.y * 100}%;border-color:${r.color}" data-region="${r.id}" title="${r.name}">
        <span class="map-marker-dot" style="background:${r.color}"></span>
        <span class="map-marker-label">${r.name.split(' · ')[0]}</span>
        ${cost > 0 ? `<span class="map-marker-cost">${cost}</span>` : ''}
      </button>`;
    }).join('');

    const regionList = GameData.worldRegions.map(r => {
      const isCurrent = cur && cur.id === r.id;
      const isBirthplace = bp && bp.regionId === r.id;
      const cost = ws.getTravelCost(r.id);
      const canPay = p.spiritStones >= cost;
      return `
        <div class="card region-card" style="border-left:3px solid ${r.color}">
          <div class="card-title">${r.name} ${isBirthplace ? '<span style="color:var(--accent-gold);font-size:11px">· 出生域</span>' : ''}</div>
          <div class="card-desc">${this._regionTypeText(r.type)}${isCurrent && place ? ` · 当前：${place.name}` : ''}</div>
          <div class="card-row">
            <span>${isCurrent ? '<span style="color:var(--accent-green)">当前所在域</span>' : `<span style="color:var(--text-muted)">跨域传送：${cost} 灵石</span>`}</span>
            <button class="btn btn-sm" data-open-region="${r.id}" ${canPay ? '' : 'disabled'}>${isCurrent ? '进入区域地图' : `传送并进入（${cost}）`}</button>
          </div>
        </div>`;
    }).join('');

    document.getElementById('panel-world').innerHTML = `
      <div class="panel-title">九宸衍道界 · 世界地图</div>
      <div class="world-current card">
        <div>
          <div class="card-title">当前位置：${cur ? cur.name : '未定'}${place ? ` · ${place.name}` : ''}</div>
          <div class="card-desc">出生地：${bp ? bp.name : '未选择'}。跨域传送消耗 1000 灵石，区域内传送消耗 100 灵石。</div>
        </div>
        <div class="world-stones">灵石 ${BigNum.format(p.spiritStones)}</div>
      </div>
      <div class="world-map-wrap">
        <img src="${GameAssets.worldMaps.original}" class="world-map-img" alt="原始大陆">
        ${markers}
      </div>
      <div class="region-list">${regionList}</div>
    `;

    document.querySelectorAll('[data-region], [data-open-region]').forEach(el => {
      el.addEventListener('click', () => {
        const rid = el.dataset.region || el.dataset.openRegion;
        const target = GameData.worldRegions.find(r => r.id === rid);
        if (!target) return;
        const cost = ws.getTravelCost(rid);
        const isCrossRegion = rid !== p.currentRegionId;

        if (isCrossRegion && cost > 0 && (!p.disabledPrompts || !p.disabledPrompts.prompt_cross_region)) {
          this._showTravelConfirm({ name: target.name, targetRegionId: rid }, cost, true, 'prompt_cross_region', rid, null, ws);
          return;
        }

        this._executeTravel({ name: target.name, targetRegionId: rid }, rid, null, ws);
      });
    });
  }

  _renderRegionMap(regionId, bp, cur, currentPlace) {
    const p = this.game.player;
    const ws = this.game.worldSystem;
    const region = GameData.worldRegions.find(r => r.id === regionId);
    if (!region) {
      this._worldMode = 'world';
      this.renderWorld();
      return;
    }

    const places = ws.getRegionPlaces(regionId);
    const markers = places.map(place => {
      const isCurrent = cur && cur.id === regionId && currentPlace && currentPlace.id === place.id;
      const targetRegionId = place.targetRegionId || regionId;
      const cost = place.targetRegionId ? ws.getTravelCost(targetRegionId) : ws.getTravelCost(regionId, place.id);
      return `<button class="region-marker ${isCurrent ? 'current' : ''} ${place.targetRegionId ? 'portal' : ''}" style="left:${place.x * 100}%;top:${place.y * 100}%;--point-color:${region.color}" data-place="${place.id}" title="${place.name}">
        <span class="region-marker-dot"></span>
        <span class="region-marker-label">${place.name}${place.targetRegionId ? ' ↗' : ''}</span>
        ${cost > 0 ? `<span class="region-marker-cost">${cost}</span>` : ''}
      </button>`;
    }).join('');

    document.getElementById('panel-world').innerHTML = `
      <div class="panel-title">${region.name} · 区域地图</div>
      <div class="world-toolbar">
        <button class="btn btn-sm" id="btn-world-back">返回原始大陆</button>
        <span>当前位置：${cur ? cur.name : '未定'}${currentPlace ? ` · ${currentPlace.name}` : ''}</span>
        <span class="world-stones">灵石 ${BigNum.format(p.spiritStones)}</span>
      </div>
      <div class="region-map-wrap">
        <img src="${GameAssets.worldMaps[region.map || region.id]}" class="region-map-img" alt="${region.name}">
        ${markers}
      </div>
      <div class="card world-hint">
        <div class="card-title">传送规则</div>
        <div class="card-desc">点击发光点可移动到对应地点。同一域内传送消耗 100 灵石；从其他域传入该域消耗 1000 灵石。白色光点为当前位置。</div>
      </div>
    `;

    this._bindClick('btn-world-back', () => {
      this._worldMode = 'world';
      this.renderWorld();
    });

    document.querySelectorAll('[data-place]').forEach(el => {
      el.addEventListener('click', () => {
        const placeId = el.dataset.place;
        const place = places.find(pl => pl.id === placeId);
        if (!place) return;

        // Check for sect/秘境 keywords and show appropriate list
        if (place.name.includes('宗') || place.name.includes('门') || place.name.includes('阁')) {
          // Show sect list
          if (this.game.sectSystem.hasSect()) {
            this.showToast('你已加入宗门，不可再加入其他宗门', 'error');
            return;
          }
          this.switchPanel('sect');
          return;
        }
        if (place.name.includes('秘境') || place.name.includes('遗迹') || place.name.includes('禁地')) {
          this.showToast('进入探险界面探索秘境', 'info');
          this.switchPanel('exploration');
          return;
        }

        // Normal travel with confirmation
        const cost = place.targetRegionId ? ws.getTravelCost(place.targetRegionId) : ws.getTravelCost(regionId, placeId);
        if (cost > 0) {
          const isCrossRegion = !!place.targetRegionId || (regionId !== this.game.player.currentRegionId);
          const promptKey = isCrossRegion ? 'prompt_cross_region' : 'prompt_intra_region';

          // Check if user disabled this prompt
          if (!this.game.player.disabledPrompts || !this.game.player.disabledPrompts[promptKey]) {
            this._showTravelConfirm(place, cost, isCrossRegion, promptKey, regionId, placeId, ws);
            return;
          }
        }

        this._executeTravel(place, regionId, placeId, ws);
      });
    });
  }

  _regionTypeText(type) {
    const labels = { domain: '四域主域', pole: '四极禁地', center: '中央道源', inner: '厚土坤元' };
    return labels[type] || '九域节点';
  }

  _showTravelConfirm(place, cost, isCrossRegion, promptKey, regionId, placeId, ws) {
    const p = this.game.player;
    const typeLabel = isCrossRegion ? '跨域传送' : '区域内传送';
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    modal.innerHTML = `
      <div class="modal-title">${typeLabel}</div>
      <div style="font-size:14px;line-height:1.8">
        <p>前往 <strong>${place.name}</strong> 需要消耗 <span style="color:var(--accent-gold)">${cost} 灵石</span></p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">当前灵石：${BigNum.format(p.spiritStones)}</p>
      </div>
      <div style="margin-top:12px;font-size:12px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="chk-no-prompt" />
          <span>不再提示此类传送</span>
        </label>
      </div>
      <div style="text-align:center;margin-top:16px;display:flex;gap:8px;justify-content:center">
        <button class="btn" id="btn-travel-cancel">取消</button>
        <button class="btn btn-primary" id="btn-travel-confirm" ${p.spiritStones < cost ? 'disabled' : ''}>
          传送 (${cost}灵石)
        </button>
      </div>
    `;
    overlay.classList.add('active');

    this._bindClick('btn-travel-cancel', () => {
      overlay.classList.remove('active');
    });

    this._bindClick('btn-travel-confirm', () => {
      const chk = document.getElementById('chk-no-prompt');
      if (chk && chk.checked) {
        if (!p.disabledPrompts) p.disabledPrompts = {};
        p.disabledPrompts[promptKey] = true;
      }
      overlay.classList.remove('active');
      this._executeTravel(place, regionId, placeId, ws);
    });
  }

  _executeTravel(place, regionId, placeId, ws) {
    let result;
    if (place.targetRegionId) {
      result = ws.travelToRegion(place.targetRegionId);
      if (result) {
        this._worldMode = 'region';
        this._worldRegionId = place.targetRegionId;
      }
    } else if (placeId) {
      result = ws.travelToPlace(regionId, placeId);
    } else {
      // World map travel
      result = ws.travelToRegion(regionId);
      if (result) {
        this._worldMode = 'region';
        this._worldRegionId = regionId;
      }
    }
    if (result) {
      this.showToast(result.cost > 0 ? `消耗 ${result.cost} 灵石，抵达${result.region.name}${result.place ? ' · ' + result.place.name : ''}` : `已在${place.name}`, 'success');
      this.updateStatusBar();
      this.renderWorld();
    } else {
      const need = place.targetRegionId ? ws.getTravelCost(place.targetRegionId) : (placeId ? ws.getTravelCost(regionId, placeId) : ws.getTravelCost(regionId));
      this.showToast(`灵石不足，传送需要 ${need} 灵石`, 'error');
    }
  }

  // =========================================================
  // Forge (rendered inside cave panel)
  // =========================================================
  renderCaveForge() {
    const p = this.game.player;
    const fs = this.game.forgeSystem;

    const slots = ['weapon', 'armor', 'talisman'];
    const slotNames = { weapon: '武器', armor: '防具', talisman: '法器' };
    const equippedHtml = slots.map(s => {
      const aid = p.equippedArtifacts[s];
      const item = aid ? GameData.items[aid] : null;
      return `
        <div class="card-row">
          <span>${slotNames[s]}</span>
          <span>
            ${item ? `<span style="color:var(--rarity-${item.rarity || 'common'})">${item.name}</span>
              <button class="btn btn-sm btn-danger" data-unequip="${s}">卸下</button>` : '<span style="color:var(--text-muted)">未装备</span>'}
          </span>
        </div>`;
    }).join('');

    const ownedHtml = Object.entries(p.artifacts || {})
      .filter(([id, c]) => c > 0)
      .map(([id, c]) => {
        const item = GameData.items[id];
        if (!item) return '';
        const stats = Object.entries(item.stats || {}).map(([k, v]) => {
          const lbl = { attack: '攻击', defense: '防御', attack_pct: '攻击%', defense_pct: '防御%', cultivation_mult: '修炼速度', max_hp_pct: '生命%' }[k] || k;
          const isPct = k.endsWith('_pct') || k === 'cultivation_mult';
          return `${lbl}+${isPct ? (v * 100).toFixed(0) + '%' : v}`;
        }).join('、');
        return `
          <div class="card-row">
            <span style="color:var(--rarity-${item.rarity || 'common'})">${item.name} x${c}</span>
            <span style="color:var(--text-muted);font-size:11px">${stats}</span>
            <button class="btn btn-sm btn-primary" data-equip="${id}">装备</button>
          </div>`;
      }).join('');

    const recipesHtml = GameData.forgeRecipes.map(r => {
      const item = GameData.items[r.result];
      const matStr = Object.entries(r.materials).map(([k, v]) =>
        `${k === 'lingshi' ? '灵石' : (GameData.items[k]?.name || k)} x${v}`
      ).join('、');
      const can = fs.canForge(r.id);
      const realmLock = p.realmIndex < (r.minRealm || 0);
      return `
        <div class="card" style="opacity:${realmLock ? 0.5 : 1}">
          <div class="card-title">
            <span style="color:var(--rarity-${item.rarity || 'common'})">${item.name}</span>
            <span style="font-size:11px;color:var(--text-muted)">难度 ${r.difficulty}</span>
          </div>
          <div class="card-desc">${item.desc || ''}</div>
          <div class="card-row"><span>材料</span><span style="font-size:12px">${matStr}</span></div>
          ${realmLock ? `<div style="color:var(--accent-red);font-size:12px">需要 ${GameData.realms[r.minRealm].name}</div>` :
            `<button class="btn btn-sm btn-primary" data-forge="${r.id}" ${can ? '' : 'disabled'}>${can ? '炼制' : '材料不足'}</button>`}
        </div>`;
    }).join('');

    document.getElementById('panel-cave').innerHTML = `
      <div class="panel-title">炼器</div>
      <button class="btn btn-sm" id="btn-cave-back" style="margin-bottom:12px">返回洞府</button>
      <div class="card">
        <div class="card-title">器师等级 Lv.${p.forgeLevel || 1}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, ((p.forgeExp || 0) / ((p.forgeLevel || 1) * 120)) * 100)}%"></div></div>
      </div>
      <div class="card">
        <div class="card-title">当前装备</div>
        ${equippedHtml}
      </div>
      <div class="card">
        <div class="card-title">法宝库</div>
        ${ownedHtml || '<div style="color:var(--text-muted);font-size:13px">尚无法宝</div>'}
      </div>
      <div style="margin-top:12px"><div class="panel-title" style="font-size:18px">炼器图谱</div></div>
      ${recipesHtml}
    `;

    this._bindClick('btn-cave-back', () => this.renderCave());

    document.querySelectorAll('[data-forge]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = fs.forge(btn.dataset.forge);
        if (!result.ok) {
          this.showToast(result.reason, 'error');
          return;
        }
        if (result.success) {
          const item = GameData.items[result.itemId];
          this.showToast(`炼器成功！获得 ${item.name}`, 'legendary');
          if (result.levelUp) this.showToast('器师等级提升！', 'success');
        } else {
          this.showToast('炼器失败，材料损耗', 'error');
        }
        this.renderCaveForge();
      });
    });

    document.querySelectorAll('[data-equip]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (fs.equip(btn.dataset.equip)) {
          this.showToast('装备成功', 'success');
          this.renderCaveForge();
        }
      });
    });

    document.querySelectorAll('[data-unequip]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (fs.unequip(btn.dataset.unequip)) {
          this.showToast('已卸下', 'info');
          this.renderCaveForge();
        }
      });
    });
  }

  // =========================================================
  // Favor panel (人脉)
  // =========================================================
  renderFavor() {
    const p = this.game.player;
    const ws = this.game.worldSystem;

    let html = `<div class="panel-title">人脉 · 好感</div>
      <div class="card" style="margin-bottom:12px">
        <div class="card-desc">向他人赠送其偏爱的物品可提升好感。好感越高，宗门商店与商人的折扣越多，并解锁特殊任务与传承。</div>
      </div>`;

    for (const npc of ws.getAllNpcs()) {
      const fv = ws.getFavor(npc.id);
      if (fv <= 0) continue;
      const rank = ws.getRank(npc.id);
      const giftOpts = Object.entries(npc.gifts || {})
        .filter(([id]) => (p.inventory[id] || 0) > 0)
        .map(([id, gain]) => {
          const it = GameData.items[id];
          return `<button class="btn btn-sm" data-gift="${npc.id}" data-item="${id}">送 ${it.name} (+${gain})</button>`;
        }).join(' ');
      const sect = npc.sect ? GameData.sects.find(s => s.id === npc.sect) : null;
      html += `
        <div class="card">
          <div class="card-title">${npc.name} <span style="font-size:11px;color:var(--text-muted)">${npc.role}${sect ? ' · ' + sect.name : ''}</span></div>
          <div class="card-desc">${npc.desc}</div>
          <div class="card-row">
            <span>好感</span>
            <span style="color:${rank.color}">${rank.name} (${fv})</span>
          </div>
          <div class="card-row"><span style="color:var(--text-muted);font-size:11px">折扣系数</span><span>${rank.shopMult.toFixed(2)}x</span></div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${giftOpts || '<span style="font-size:12px;color:var(--text-muted)">无可赠物品</span>'}</div>
        </div>`;
    }

    document.getElementById('panel-favor').innerHTML = html;

    document.querySelectorAll('[data-gift]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = ws.giveGift(btn.dataset.gift, btn.dataset.item);
        if (r.ok) {
          this.showToast(`好感 +${r.gain}`, 'success');
          this.renderFavor();
        } else {
          this.showToast(r.reason, 'error');
        }
      });
    });
  }
}
