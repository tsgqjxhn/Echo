// ============================================================
// Cultivation system — tick, offline calc, breakthrough
// ============================================================

class CultivationSystem {
  constructor(player) {
    this.player = player;
  }

  // Main tick — called every second
  tick() {
    const rate = this.player.getCultivationRate();
    if (rate <= 0) return;

    this.player.cultivation += rate;
    this.player.stats.totalCultivation += rate;

    // Clean up expired effects
    const now = Date.now();
    this.player.activeEffects = this.player.activeEffects.filter(e => e.endTime > now);
  }

  // Calculate offline earnings
  calculateOffline(lastTimestamp) {
    const now = Date.now();

    // Anti-cheat: reject if clock went backwards
    if (now < lastTimestamp) {
      return { cheated: true, earned: 0, seconds: 0 };
    }

    const totalSeconds = Math.floor((now - lastTimestamp) / 1000);
    if (totalSeconds <= 0) return { cheated: false, earned: 0, seconds: 0 };

    // Cap at offline hours from talent modifier
    const offlineCap = this.player.talentModifiers ? (this.player.talentModifiers.offlineCapHours || 24) : 24;
    const cappedSeconds = Math.min(totalSeconds, offlineCap * 3600);

    // Use current rate (could be more sophisticated with step-based calc)
    const rate = this.player.getCultivationRate();
    const earned = Math.floor(rate * cappedSeconds);

    this.player.cultivation += earned;
    this.player.stats.totalCultivation += earned;

    // Spirit stones earned during offline: half of cultivation rate
    const stoneMult = this.player.talentModifiers ? (this.player.talentModifiers.stoneIncomeMult || 1) : 1;
    const spiritStoneRate = Math.floor(rate / 2 * stoneMult);
    const earnedStones = Math.floor(spiritStoneRate * cappedSeconds);
    if (earnedStones > 0) {
      this.player.spiritStones += earnedStones;
    }

    // Regen spirit during offline
    const spiritGain = Math.floor(cappedSeconds * this.player.spiritRegenRate / 60);
    this.player.spirit = Math.min(this.player.maxSpirit, this.player.spirit + spiritGain);

    // Garden harvest during offline
    if (this.player.gardenLevel > 0) {
      const gardenData = GameData.gardenUpgrades[this.player.gardenLevel - 1];
      if (gardenData) {
        const harvests = Math.floor(cappedSeconds / gardenData.interval);
        if (harvests > 0) {
          BigNum.give(this.player.inventory, { lingcao: gardenData.yield * harvests });
        }
      }
    }

    this.player.lastOnlineTime = now;

    return { cheated: false, earned, earnedStones, seconds: cappedSeconds, actualSeconds: totalSeconds };
  }

  // Attempt breakthrough with optional heavenly treasures
  attemptBreakthrough(selectedTreasures = []) {
    const next = this.player.getNextRealm();
    if (!next) return { success: false, reason: '已达最高境界' };

    if (this.player.cultivation < next.breakthroughCost) {
      return { success: false, reason: '修为不足' };
    }

    const isLarge = GameData.isLargeBreakthrough(this.player.realmIndex);

    // Check for required pill
    if (next.breakthroughItem) {
      const count = this.player.inventory[next.breakthroughItem] || 0;
      if (count <= 0) {
        return { success: false, reason: `需要 ${GameData.items[next.breakthroughItem].name}` };
      }
    }

    // Validate treasures
    const currentPeriod = GameData.getRealmPeriod(this.player.realmIndex);
    for (const tId of selectedTreasures) {
      const treasure = GameData.heavenlyTreasures.find(t => t.id === tId);
      if (!treasure) return { success: false, reason: `未知天材地宝: ${tId}` };
      if ((this.player.inventory[tId] || 0) <= 0) return { success: false, reason: `未拥有 ${treasure.name}` };
      // Tier restriction: can only use treasures at or below current period
      const treasurePeriod = GameData.realmPeriods.find(p => p.id === treasure.tier);
      const currentPeriodIdx = GameData.realmPeriods.indexOf(currentPeriod);
      const treasurePeriodIdx = GameData.realmPeriods.indexOf(treasurePeriod);
      if (treasurePeriodIdx > currentPeriodIdx) {
        return { success: false, reason: `${treasure.name} 品阶过高，${currentPeriod.name}期无法使用` };
      }
    }

    // Deduct cultivation
    this.player.cultivation -= next.breakthroughCost;

    // Deduct pill
    if (next.breakthroughItem) {
      this.player.inventory[next.breakthroughItem]--;
      if (this.player.inventory[next.breakthroughItem] <= 0) {
        delete this.player.inventory[next.breakthroughItem];
      }
    }

    // Deduct treasures and apply bonuses
    for (const tId of selectedTreasures) {
      this.player.inventory[tId]--;
      if (this.player.inventory[tId] <= 0) delete this.player.inventory[tId];
      const treasure = GameData.heavenlyTreasures.find(t => t.id === tId);
      if (treasure && treasure.bonus) {
        for (const [stat, val] of Object.entries(treasure.bonus)) {
          this.player.treasureBonus[stat] = (this.player.treasureBonus[stat] || 0) + val;
        }
      }
    }

    // Roll for success with pity
    let rate = next.breakthroughRate;
    rate += this.player.breakthroughPity * 0.05;
    rate = Math.min(rate, 1.0);

    // Treasures boost breakthrough rate
    if (selectedTreasures.length > 0) {
      rate += selectedTreasures.length * 0.05;
      rate = Math.min(rate, 1.0);
    }

    // Talent breakthrough bonus
    const talentBonus = this.player.talentModifiers ? (this.player.talentModifiers.breakthroughBonusRate || 0) : 0;
    rate += talentBonus;
    rate = Math.min(rate, 1.0);

    const roll = Math.random();
    if (roll < rate) {
      // Success
      this.player.realmIndex++;
      this.player.breakthroughPity = 0;
      this.player.stats.breakthroughs++;
      this.player.recalcStats();
      this.player.hp = this.player.maxHp;

      return { success: true, realm: this.player.getRealm() };
    } else {
      // Failure
      this.player.breakthroughPity++;
      this.player.stats.breakthroughFails++;

      const penaltyMult = this.player.talentModifiers ? (this.player.talentModifiers.breakthroughPenaltyMult || 1) : 1;
      const penalty = Math.floor(this.player.cultivation * 0.1 * penaltyMult);
      this.player.cultivation = Math.max(0, this.player.cultivation - penalty);

      return { success: false, reason: '突破失败！天意未至，损失部分修为。', penalty, roll, rate };
    }
  }

  // Use a consumable pill
  usePill(itemId) {
    const item = GameData.items[itemId];
    if (!item || item.type !== 'consumable') return false;
    if ((this.player.inventory[itemId] || 0) <= 0) return false;

    this.player.inventory[itemId]--;
    if (this.player.inventory[itemId] <= 0) delete this.player.inventory[itemId];

    const eff = item.effect;

    if (eff.type === 'cultivation') {
      // Instant cultivation gain
      this.player.cultivation += eff.value;
      this.player.stats.totalCultivation += eff.value;
    } else if (eff.type === 'cultivation_mult') {
      // Timed buff
      this.player.activeEffects.push({
        effect: eff,
        endTime: Date.now() + eff.duration * 1000,
        source: item.name
      });
    } else if (eff.type === 'heal_percent') {
      this.player.hp = Math.min(this.player.maxHp, Math.floor(this.player.hp + this.player.maxHp * eff.value));
    }
    // defense_mult handled in combat

    return true;
  }
}
