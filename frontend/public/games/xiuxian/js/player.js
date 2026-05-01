// ============================================================
// Player state model
// ============================================================

class Player {
  constructor() {
    this.name = '无名修士';
    this.realmIndex = 0;
    this.cultivation = 0;           // current cultivation points
    this.spiritStones = 100;        // starting money
    this.spirit = 100;              // exploration energy
    this.maxSpirit = 100;
    this.spiritRegenRate = 1;       // per minute
    this.reputation = 0;            // hidden reputation value
    this.hp = 100;
    this.maxHp = 100;
    this.attack = 10;
    this.defense = 5;
    this.critRate = 0;
    this.critDamage = 0.5;
    this.defenseBreak = 0;
    this.lifeSteal = 0;
    this.hpRegenPct = 0;

    // Inventory: { itemId: count }
    this.inventory = {};

    // Learned techniques: { techniqueId: currentLevel }
    this.techniques = {};

    // Equipped techniques (max 3): [techniqueId, ...]
    this.equippedTechniques = [];

    // Outer/inner technique equipped slots
    this.equippedOuterTechniques = [];
    this.equippedInnerTechniques = [];

    // Sect trial state
    this.sectTrial = null;  // { sectId, currentOpponent, won }

    // Active effects from pills: [{ effect, endTime }]
    this.activeEffects = [];

    // Cave upgrades
    this.arrayLevel = 1;
    this.gardenLevel = 1;
    this.gardenTimer = 0;           // seconds until next harvest
    this.alchemyUnlocked = false;   // unlock alchemy in cave (10k stones)
    this.forgeUnlocked = false;     // unlock forge in cave (10k stones)

    // Alchemy level (affects success rate)
    this.alchemyLevel = 1;
    this.alchemyExp = 0;

    // Exploration state
    this.currentZone = null;
    this.currentNode = 0;
    this.exploring = false;

    // Breakthrough pity counter
    this.breakthroughPity = 0;

    // Sect state
    this.sectId = null;               // joined sect id
    this.sectContribution = 0;        // spendable contribution
    this.sectTotalContribution = 0;   // lifetime total (for position)
    this.sectPositionIndex = 0;       // index into sectPositions
    this.sectMissionSlots = 2;
    this.sectSalaryCollected = false;
    this.completedDailyMissions = [];
    this.activeMissions = [];
    this.missionCooldowns = {};

    // Auction state
    this.lastAuctionTime = 0;

    // World / birthplace
    this.professions = [];          // chosen at new game (3 profession ids)
    this.talents = [];              // chosen at new game (5 talent ids)
    this.birthplaceId = null;       // chosen at new game
    this.currentRegionId = null;    // current location
    this.currentPlaceId = null;     // current point inside region map
    this.lastSectLeaveTime = 0;     // for sect switch cooldown

    // Favorability { npcId: value }
    this.favor = {};

    // Artifacts (法宝): owned + equipped per slot
    this.artifacts = {};            // { artifactId: count }
    this.equippedArtifacts = {};    // { slot: artifactId }

    // Forge stats
    this.forgeLevel = 1;
    this.forgeExp = 0;

    // Consumed heavenly treasures (permanent stat bonuses)
    this.treasureBonus = { attack: 0, defense: 0, hp: 0, critRate: 0, critDamage: 0, defenseBreak: 0, lifeSteal: 0 };

    // Talent modifiers (recalculated from talents array)
    this.talentModifiers = {
      stoneIncomeMult: 1,
      shopCostMult: 1,
      travelCostMult: 1,
      breakthroughBonusRate: 0,
      breakthroughPenaltyMult: 1,
      alchemyBonusRate: 0,
      forgeBonusRate: 0,
      exploreTreasureMult: 1,
      exploreLootMult: 1,
      offlineCapHours: 24,
      gardenYieldMult: 1,
      encounterRateMult: 1,
    };

    // Herb garden plots (multiple species)
    this.gardenPlots = [];          // [{ herbId, timer }]

    // Statistics
    this.stats = {
      totalCultivation: 0,
      totalPlayTime: 0,
      breakthroughs: 0,
      breakthroughFails: 0,
      enemiesDefeated: 0,
      encountersCompleted: 0,
      pillsRefined: 0,
      pillsFailed: 0,
    };

    // Timestamps
    this.lastSaveTime = Date.now();
    this.lastOnlineTime = Date.now();
    this.createdAt = Date.now();

    // UI preferences
    this.disabledPrompts = {};
  }

  getRealm() {
    return GameData.realms[this.realmIndex];
  }

  getNextRealm() {
    if (this.realmIndex < GameData.realms.length - 1) {
      return GameData.realms[this.realmIndex + 1];
    }
    return null;
  }

  // Recalculate derived stats from realm + equipped techniques
  recalcStats() {
    const realm = this.getRealm();
    this.maxHp = realm.hp;
    this.hp = Math.min(this.hp, this.maxHp);
    this.attack = realm.attack;
    this.defense = realm.defense;
    this.maxSpirit = 100;
    this.critRate = 0;
    this.critDamage = 0.5;
    this.defenseBreak = 0;
    this.lifeSteal = 0;
    this.hpRegenPct = 0;

    // Apply equipped technique bonuses (combined from outer + inner + legacy)
    const allEquipped = [...new Set([
      ...(this.equippedOuterTechniques || []),
      ...(this.equippedInnerTechniques || []),
      ...(this.equippedTechniques || []),
    ])];
    for (const techId of allEquipped) {
      const level = this.techniques[techId] || 0;
      if (level === 0) continue;
      const tech = GameData.techniques.find(t => t.id === techId);
      if (!tech) continue;

      const eff = tech.effect;
      const value = eff.base + eff.perLevel * (level - 1);
      if (eff.type === 'flat') {
        if (eff.stat === 'attack') this.attack += value;
        else if (eff.stat === 'defense') this.defense += value;
      } else if (eff.type === 'percent') {
        if (eff.stat === 'attack') this.attack = Math.floor(this.attack * (1 + value));
        else if (eff.stat === 'defense') this.defense = Math.floor(this.defense * (1 + value));
      }
      // cultivation_mult is handled in CultivationSystem
    }

    // Equipped artifacts
    let attackPct = 0, defensePct = 0, hpPct = 0;
    for (const slot of Object.keys(this.equippedArtifacts || {})) {
      const aid = this.equippedArtifacts[slot];
      const item = GameData.items[aid];
      if (!item || item.type !== 'artifact' || !item.stats) continue;
      const s = item.stats;
      if (s.attack)       this.attack += s.attack;
      if (s.defense)      this.defense += s.defense;
      if (s.attack_pct)   attackPct += s.attack_pct;
      if (s.defense_pct)  defensePct += s.defense_pct;
      if (s.max_hp_pct)   hpPct += s.max_hp_pct;
    }

    // Talent stat bonuses
    for (const talId of (this.talents || [])) {
      const tal = GameData.talents.find(t => t.id === talId);
      if (!tal || !tal.stats) continue;
      const s = tal.stats;
      if (s.attack_pct)    attackPct += s.attack_pct;
      if (s.defense_pct)   defensePct += s.defense_pct;
      if (s.max_hp_pct)    hpPct += s.max_hp_pct;
      if (s.crit_rate)     this.critRate += s.crit_rate;
      if (s.crit_damage)   this.critDamage += s.crit_damage;
      if (s.defense_break) this.defenseBreak += s.defense_break;
      if (s.life_steal)    this.lifeSteal += s.life_steal;
      if (s.hp_regen_pct)  this.hpRegenPct += s.hp_regen_pct;
      if (s.maxSpirit)     this.maxSpirit += s.maxSpirit;
    }

    // Profession bonuses
    for (const profId of (this.professions || [])) {
      const prof = GameData.getProfession(profId);
      if (!prof || !prof.bonus) continue;
      const b = prof.bonus;
      if (b.attack_pct)    attackPct += b.attack_pct;
      if (b.defense_pct)   defensePct += b.defense_pct;
      if (b.max_hp_pct)    hpPct += b.max_hp_pct;
      if (b.crit_rate)     this.critRate += b.crit_rate;
      if (b.crit_damage)   this.critDamage += b.crit_damage;
      if (b.defense_break) this.defenseBreak += b.defense_break;
      if (b.life_steal)    this.lifeSteal += b.life_steal;
      if (b.hp_regen_pct)  this.hpRegenPct += b.hp_regen_pct;
      if (b.maxSpirit)     this.maxSpirit += b.maxSpirit;
    }

    // Birthplace bonus
    const bp = this.birthplaceId ? GameData.birthplaces.find(b => b.id === this.birthplaceId) : null;
    if (bp && bp.bonus) {
      if (bp.bonus.attack_pct)   attackPct += bp.bonus.attack_pct;
      if (bp.bonus.defense_pct)  defensePct += bp.bonus.defense_pct;
      if (bp.bonus.max_hp_pct)   hpPct += bp.bonus.max_hp_pct;
      if (bp.bonus.crit_rate)    this.critRate += bp.bonus.crit_rate;
      if (bp.bonus.crit_damage)  this.critDamage += bp.bonus.crit_damage;
      if (bp.bonus.defense_break) this.defenseBreak += bp.bonus.defense_break;
      if (bp.bonus.life_steal)   this.lifeSteal += bp.bonus.life_steal;
      if (bp.bonus.hp_regen_pct) this.hpRegenPct += bp.bonus.hp_regen_pct;
      if (bp.bonus.maxSpirit) {
        this.maxSpirit = 100 + bp.bonus.maxSpirit;
      }
    }

    // Sect bonuses (attack_mult, defense_mult)
    const sect = this.sectId ? GameData.sects.find(s => s.id === this.sectId) : null;
    if (sect && sect.bonus) {
      if (sect.bonus.attack_mult)  attackPct += sect.bonus.attack_mult;
      if (sect.bonus.defense_mult) defensePct += sect.bonus.defense_mult;
    }

    if (attackPct)  this.attack = Math.floor(this.attack * (1 + attackPct));
    if (defensePct) this.defense = Math.floor(this.defense * (1 + defensePct));
    if (hpPct)      this.maxHp = Math.floor(this.maxHp * (1 + hpPct));
    this.hp = Math.min(this.hp, this.maxHp);

    // Consumed heavenly treasure bonuses
    const tb = this.treasureBonus || {};
    if (tb.attack)       this.attack += tb.attack;
    if (tb.defense)      this.defense += tb.defense;
    if (tb.hp)           this.maxHp += tb.hp;
    if (tb.critRate)     this.critRate += tb.critRate;
    if (tb.critDamage)   this.critDamage += tb.critDamage;
    if (tb.defenseBreak) this.defenseBreak += tb.defenseBreak;
    if (tb.lifeSteal)    this.lifeSteal += tb.lifeSteal;
    this.hp = Math.min(this.hp, this.maxHp);

    // Spirit regen: base 1/min, apply talent multiplier
    let spiritRegenMult = 1;
    for (const talId of (this.talents || [])) {
      const tal = GameData.talents.find(t => t.id === talId);
      if (tal && tal.stats && tal.stats.spiritRegenMult) spiritRegenMult += tal.stats.spiritRegenMult;
    }
    for (const profId of (this.professions || [])) {
      const prof = GameData.getProfession(profId);
      if (prof && prof.bonus && prof.bonus.spiritRegenMult) spiritRegenMult += prof.bonus.spiritRegenMult;
    }
    this.spiritRegenRate = spiritRegenMult; // 1 point per minute * mult
  }

  // Get total cultivation rate per second
  getCultivationRate() {
    const realm = this.getRealm();
    if (realm.baseRate === 0) return 0;

    let passiveSum = 0;
    let activeMult = 1;

    // Passive from equipped techniques (combined)
    const allEquipped = [...new Set([
      ...(this.equippedOuterTechniques || []),
      ...(this.equippedInnerTechniques || []),
      ...(this.equippedTechniques || []),
    ])];
    for (const techId of allEquipped) {
      const level = this.techniques[techId] || 0;
      if (level === 0) continue;
      const tech = GameData.techniques.find(t => t.id === techId);
      if (!tech || tech.effect.stat !== 'cultivation_mult') continue;

      const value = tech.effect.base + tech.effect.perLevel * (level - 1);
      if (tech.effect.type === 'flat') passiveSum += value;
      else if (tech.effect.type === 'percent') activeMult *= (1 + value);
    }

    // Array bonus
    const arrayData = GameData.arrayUpgrades[this.arrayLevel - 1];
    const arrayBonus = arrayData ? arrayData.bonus : 0;

    // Active pill effects
    const now = Date.now();
    for (const eff of this.activeEffects) {
      if (eff.endTime > now && eff.effect.type === 'cultivation_mult') {
        activeMult *= eff.effect.value;
      }
    }

    // Artifact cultivation_mult
    for (const slot of Object.keys(this.equippedArtifacts || {})) {
      const aid = this.equippedArtifacts[slot];
      const item = GameData.items[aid];
      if (!item || item.type !== 'artifact' || !item.stats) continue;
      if (item.stats.cultivation_mult) passiveSum += item.stats.cultivation_mult;
    }

    // Talent cultivation_mult
    for (const talId of (this.talents || [])) {
      const tal = GameData.talents.find(t => t.id === talId);
      if (tal && tal.stats && tal.stats.cultivation_mult) passiveSum += tal.stats.cultivation_mult;
    }

    // Profession cultivation_mult
    for (const profId of (this.professions || [])) {
      const prof = GameData.getProfession(profId);
      if (prof && prof.bonus && prof.bonus.cultivation_mult) passiveSum += prof.bonus.cultivation_mult;
    }

    // Birthplace cultivation_mult
    const bp = this.birthplaceId ? GameData.birthplaces.find(b => b.id === this.birthplaceId) : null;
    if (bp && bp.bonus && bp.bonus.cultivation_mult) passiveSum += bp.bonus.cultivation_mult;

    // Sect bonus (cultivation_mult)
    const sect = this.sectId ? GameData.sects.find(s => s.id === this.sectId) : null;
    if (sect && sect.bonus && sect.bonus.cultivation_mult) passiveSum += sect.bonus.cultivation_mult;

    const arrayMult = this.talentModifiers ? this.talentModifiers.arrayBonusMult || 1 : 1;
    return realm.baseRate * (1 + passiveSum) * activeMult * (1 + arrayBonus * arrayMult);
  }

  // Recalculate talent modifiers from talents array
  recalcTalentModifiers() {
    const defaults = {
      stoneIncomeMult: 1, shopCostMult: 1, travelCostMult: 1,
      breakthroughBonusRate: 0, breakthroughPenaltyMult: 1,
      alchemyBonusRate: 0, forgeBonusRate: 0,
      exploreTreasureMult: 1, exploreLootMult: 1,
      offlineCapHours: 24, gardenYieldMult: 1, encounterRateMult: 1,
      arrayBonusMult: 1,
    };
    this.talentModifiers = { ...defaults };
    for (const talId of (this.talents || [])) {
      const tal = GameData.talents.find(t => t.id === talId);
      if (!tal || !tal.modifiers) continue;
      for (const [k, v] of Object.entries(tal.modifiers)) {
        if (k === 'startStoneMult' || k === 'startCultivation') continue; // one-time, not a modifier
        if (typeof v === 'number') {
          if (k.includes('Mult') && k !== 'breakthroughPenaltyMult') {
            this.talentModifiers[k] = (this.talentModifiers[k] || 1) * v;
          } else {
            this.talentModifiers[k] = (this.talentModifiers[k] || 0) + v;
          }
        }
      }
    }
  }

  // Serialize to plain object
  serialize() {
    return JSON.parse(JSON.stringify({
      version: 2,
      name: this.name,
      realmIndex: this.realmIndex,
      cultivation: this.cultivation,
      spiritStones: this.spiritStones,
      spirit: this.spirit,
      maxSpirit: this.maxSpirit,
      reputation: this.reputation,
      hp: this.hp,
      inventory: this.inventory,
      techniques: this.techniques,
      equippedTechniques: this.equippedTechniques,
      equippedOuterTechniques: this.equippedOuterTechniques,
      equippedInnerTechniques: this.equippedInnerTechniques,
      sectTrial: this.sectTrial,
      activeEffects: this.activeEffects,
      arrayLevel: this.arrayLevel,
      gardenLevel: this.gardenLevel,
      gardenTimer: this.gardenTimer,
      gardenPlots: this.gardenPlots,
      alchemyUnlocked: this.alchemyUnlocked,
      forgeUnlocked: this.forgeUnlocked,
      alchemyLevel: this.alchemyLevel,
      alchemyExp: this.alchemyExp,
      forgeLevel: this.forgeLevel,
      forgeExp: this.forgeExp,
      breakthroughPity: this.breakthroughPity,
      sectId: this.sectId,
      sectContribution: this.sectContribution,
      sectTotalContribution: this.sectTotalContribution,
      sectPositionIndex: this.sectPositionIndex,
      sectMissionSlots: this.sectMissionSlots,
      sectSalaryCollected: this.sectSalaryCollected,
      completedDailyMissions: this.completedDailyMissions,
      activeMissions: this.activeMissions,
      missionCooldowns: this.missionCooldowns,
      lastAuctionTime: this.lastAuctionTime,
      professions: this.professions,
      talents: this.talents,
      talentModifiers: this.talentModifiers,
      birthplaceId: this.birthplaceId,
      currentRegionId: this.currentRegionId,
      currentPlaceId: this.currentPlaceId,
      lastSectLeaveTime: this.lastSectLeaveTime,
      favor: this.favor,
      randomNpcs: this.randomNpcs,
      artifacts: this.artifacts,
      equippedArtifacts: this.equippedArtifacts,
      stats: this.stats,
      treasureBonus: this.treasureBonus,
      lastSaveTime: Date.now(),
      lastOnlineTime: Date.now(),
      createdAt: this.createdAt,
      disabledPrompts: this.disabledPrompts,
    }));
  }

  // Restore from plain object
  deserialize(data) {
    // Migrate v1 → v2 realm indices (old: 17=dacheng, 18=feisheng)
    const ver = data.version || 1;
    if (ver < 2 && typeof data.realmIndex === 'number') {
      if (data.realmIndex === 17) data.realmIndex = 23;       // dacheng → 大乘初期
      else if (data.realmIndex === 18) data.realmIndex = 29;  // feisheng → 真仙
    }
    for (const key of Object.keys(data)) {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    }
    this.favor = this.favor || {};
    this.randomNpcs = this.randomNpcs || [];
    this.artifacts = this.artifacts || {};
    this.equippedArtifacts = this.equippedArtifacts || {};
    this.gardenPlots = this.gardenPlots || [];
    this.professions = this.professions || [];
    this.talents = this.talents || [];
    this.disabledPrompts = this.disabledPrompts || {};
    this.equippedOuterTechniques = this.equippedOuterTechniques || [];
    this.equippedInnerTechniques = this.equippedInnerTechniques || [];
    this.sectTrial = this.sectTrial || null;
    this.treasureBonus = this.treasureBonus || { attack: 0, defense: 0, hp: 0, critRate: 0, critDamage: 0, defenseBreak: 0, lifeSteal: 0 };
    this.alchemyUnlocked = this.alchemyUnlocked || false;
    this.forgeUnlocked = this.forgeUnlocked || false;
    if (this.currentRegionId === 'r_polar') this.currentRegionId = 'r_south_pole';
    const places = GameData.regionPlaces && GameData.regionPlaces[this.currentRegionId];
    if (this.currentRegionId && (!places || !places.some(p => p.id === this.currentPlaceId))) {
      const fallback = places && (places.find(p => p.primary) || places[0]);
      this.currentPlaceId = fallback ? fallback.id : null;
    }
    this.recalcStats();
  }
}
