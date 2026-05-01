// ============================================================
// Technique system — learn, equip, upgrade
// ============================================================

class TechniqueSystem {
  constructor(player) {
    this.player = player;
  }

  // Learn a new technique (from scroll drop or shop)
  learn(techId) {
    if (this.player.techniques[techId] !== undefined) return false;
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech) return false;

    // Period restriction: can only learn techniques for current period or below
    if (tech.period) {
      const currentPeriod = GameData.getRealmPeriod(this.player.realmIndex);
      const currentIdx = GameData.realmPeriods.findIndex(p => p.id === currentPeriod.id);
      const techIdx = GameData.realmPeriods.findIndex(p => p.id === tech.period);
      if (techIdx > currentIdx) return false;
    }

    this.player.techniques[techId] = 1;
    return true;
  }

  // Check if player has technique
  has(techId) {
    return this.player.techniques[techId] !== undefined;
  }

  // Get current level
  getLevel(techId) {
    return this.player.techniques[techId] || 0;
  }

  // Upgrade technique level (costs spirit stones)
  upgrade(techId) {
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech) return false;
    const level = this.player.techniques[techId] || 0;
    if (level === 0) return false; // not learned
    if (level >= tech.maxLevel) return false; // maxed

    const cost = this.getUpgradeCost(techId);
    if (this.player.spiritStones < cost) return false;

    this.player.spiritStones -= cost;
    this.player.techniques[techId] = level + 1;
    this.player.recalcStats();
    return true;
  }

  getUpgradeCost(techId) {
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech) return Infinity;
    const level = this.player.techniques[techId] || 1;

    // New techniques have explicit cost field
    if (tech.cost) {
      return Math.floor(tech.cost * Math.pow(1.4, level - 1));
    }

    // Legacy techniques
    const tierMult = { fragment: 1, earth: 5, heaven: 20, forbidden: 50 };
    return Math.floor(100 * (tierMult[tech.tier] || 1) * Math.pow(1.5, level - 1));
  }

  // Equip technique (max 3 slots, unlock more at higher realms)
  getMaxSlots() {
    if (this.player.realmIndex >= 15) return 6; // Deity Transform
    if (this.player.realmIndex >= 11) return 5; // Nascent Soul
    if (this.player.realmIndex >= 8) return 4;  // Golden Core
    if (this.player.realmIndex >= 5) return 3;  // Foundation
    return 2;
  }

  getMaxOuterSlots() {
    const period = GameData.getRealmPeriod(this.player.realmIndex);
    const limits = GameData.techniqueSlotLimits[period.id];
    return limits ? limits.outer : 2;
  }

  getMaxInnerSlots() {
    const period = GameData.getRealmPeriod(this.player.realmIndex);
    const limits = GameData.techniqueSlotLimits[period.id];
    return limits ? limits.inner : 1;
  }

  equipOuter(techId) {
    if (!this.has(techId)) return false;
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech || tech.kind !== 'outer') return false;
    if ((this.player.equippedOuterTechniques || []).includes(techId)) return false;
    if ((this.player.equippedOuterTechniques || []).length >= this.getMaxOuterSlots()) return false;

    this.player.equippedOuterTechniques = this.player.equippedOuterTechniques || [];
    this.player.equippedOuterTechniques.push(techId);
    this.player.recalcStats();
    return true;
  }

  unequipOuter(techId) {
    const arr = this.player.equippedOuterTechniques || [];
    const idx = arr.indexOf(techId);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    this.player.recalcStats();
    return true;
  }

  equipInner(techId) {
    if (!this.has(techId)) return false;
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech || tech.kind !== 'inner') return false;
    if ((this.player.equippedInnerTechniques || []).includes(techId)) return false;
    if ((this.player.equippedInnerTechniques || []).length >= this.getMaxInnerSlots()) return false;

    this.player.equippedInnerTechniques = this.player.equippedInnerTechniques || [];
    this.player.equippedInnerTechniques.push(techId);
    this.player.recalcStats();
    return true;
  }

  unequipInner(techId) {
    const arr = this.player.equippedInnerTechniques || [];
    const idx = arr.indexOf(techId);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    this.player.recalcStats();
    return true;
  }

  equip(techId) {
    if (!this.has(techId)) return false;
    if (this.player.equippedTechniques.includes(techId)) return false;
    if (this.player.equippedTechniques.length >= this.getMaxSlots()) return false;

    this.player.equippedTechniques.push(techId);
    this.player.recalcStats();
    return true;
  }

  unequip(techId) {
    const idx = this.player.equippedTechniques.indexOf(techId);
    if (idx === -1) return false;
    this.player.equippedTechniques.splice(idx, 1);
    this.player.recalcStats();
    return true;
  }

  // Get technique effect description
  getEffectDesc(techId) {
    const tech = GameData.techniques.find(t => t.id === techId);
    if (!tech) return '';
    const level = this.player.techniques[techId] || 0;
    const eff = tech.effect;
    const current = level > 0 ? eff.base + eff.perLevel * (level - 1) : eff.base;
    const next = eff.base + eff.perLevel * level;

    const statNames = {
      attack: '攻击', defense: '防御', cultivation_mult: '修炼速度',
      attack_pct: '攻击%', defense_pct: '防御%', max_hp_pct: '生命%',
      crit_rate: '暴击率', crit_damage: '暴击伤害', defense_break: '破甲',
      life_steal: '吸血', hp_regen_pct: '生命回复', maxSpirit: '神识',
    };
    const typeNames = { flat: '+', percent: '+' };

    let desc = `${statNames[eff.stat] || eff.stat} ${typeNames[eff.type]}${eff.type === 'percent' ? (current * 100).toFixed(1) + '%' : current.toFixed(eff.stat === 'cultivation_mult' ? 2 : 0)}`;
    if (level > 0 && level < tech.maxLevel) {
      desc += ` → ${eff.type === 'percent' ? (next * 100).toFixed(1) + '%' : next.toFixed(eff.stat === 'cultivation_mult' ? 2 : 0)}`;
    }
    return desc;
  }
}
