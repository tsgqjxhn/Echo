// ============================================================
// Combat system — turn-based auto-battle
// ============================================================

class CombatSystem {
  constructor(player) {
    this.player = player;
    this.inCombat = false;
    this.enemy = null;
    this.log = [];
    this.playerHp = 0;
    this.enemyHp = 0;
    this.enemyMaxHp = 0;
    this.result = null;
    this.selectedOuter = null;
    this.selectedInner = null;
    this.turnCount = 0;
  }

  start(enemyData) {
    this.inCombat = true;
    this.enemy = { ...enemyData };
    this.enemyMaxHp = enemyData.hp;
    this.enemyHp = enemyData.hp;
    this.playerHp = this.player.hp;
    this.log = [];
    this.result = null;
    this.selectedOuter = null;
    this.selectedInner = null;
    this.turnCount = 0;
  }

  selectTechnique(outerId, innerId) {
    this.selectedOuter = outerId;
    this.selectedInner = innerId;
  }

  _getActiveTechIds() {
    const all = [
      ...(this.player.equippedOuterTechniques || []),
      ...(this.player.equippedInnerTechniques || []),
      ...(this.player.equippedTechniques || []),
    ];
    const active = [...all];
    if (this.selectedOuter && all.includes(this.selectedOuter)) {
      // prioritize selected outer
    }
    return [...new Set(all)];
  }

  // Execute one round of combat
  tick() {
    if (!this.inCombat || this.result) return;
    this.turnCount++;

    const activeTechIds = this._getActiveTechIds();

    // Determine technique bonuses for this turn
    let outerMult = 1;
    let innerDefMult = 1;
    const outerTech = this.selectedOuter
      ? GameData.techniques.find(t => t.id === this.selectedOuter)
      : null;
    const innerTech = this.selectedInner
      ? GameData.techniques.find(t => t.id === this.selectedInner)
      : null;

    if (outerTech) {
      const level = this.player.techniques[this.selectedOuter] || 0;
      outerMult = 1 + (level * 0.05);
    }
    if (innerTech) {
      const level = this.player.techniques[this.selectedInner] || 0;
      innerDefMult = 1 + (level * 0.03);
    }

    // Player attacks
    const enemyDefense = this.enemy.defense * (1 - Math.max(0, Math.min(0.8, this.player.defenseBreak || 0)));
    let pDmg = Math.max(1, (this.player.attack - enemyDefense * 0.5) * outerMult);
    pDmg = Math.floor(pDmg * BigNum.randFloat(0.85, 1.15));
    const critRate = Math.max(0, Math.min(0.95, this.player.critRate || 0));
    const crit = Math.random() < critRate;
    if (crit) {
      pDmg = Math.floor(pDmg * (1 + (this.player.critDamage || 0.5)));
    }
    this.enemyHp -= pDmg;

    const outerName = outerTech ? outerTech.name : '普通攻击';
    this.log.push(`${crit ? '暴击！' : ''}${outerName}造成 ${BigNum.format(pDmg)} 点伤害`);

    if (this.player.lifeSteal > 0) {
      const heal = Math.max(1, Math.floor(pDmg * this.player.lifeSteal));
      this.playerHp = Math.min(this.player.maxHp, this.playerHp + heal);
      this.log.push(`木灵回春，恢复 ${BigNum.format(heal)} 生命`);
    }

    // Check active effects for defense buff
    let defenseMult = 1 * innerDefMult;
    const now = Date.now();
    for (const eff of this.player.activeEffects) {
      if (eff.endTime > now && eff.effect.type === 'defense_mult') {
        defenseMult *= eff.effect.value;
      }
    }

    // Sword school bonus: chance for double strike
    for (const techId of activeTechIds) {
      const tech = GameData.techniques.find(t => t.id === techId);
      if (tech && tech.school === 'sword') {
        const level = this.player.techniques[techId] || 0;
        if (Math.random() < 0.1 + level * 0.02) {
          const extraDmg = Math.floor(pDmg * 0.5);
          this.enemyHp -= extraDmg;
          this.log.push(`剑气爆发！额外 ${BigNum.format(extraDmg)} 伤害`);
        }
      }
    }

    // Inner technique special effects
    if (innerTech) {
      const level = this.player.techniques[this.selectedInner] || 0;
      if (innerTech.school === 'qi' && Math.random() < 0.15 + level * 0.03) {
        const bonusDmg = Math.floor(pDmg * 0.3);
        this.enemyHp -= bonusDmg;
        this.log.push(`${innerTech.name}灵气爆发！额外 ${BigNum.format(bonusDmg)} 伤害`);
      }
      if (innerTech.school === 'talisman' && Math.random() < 0.1 + level * 0.02) {
        const seal = Math.floor(this.enemyMaxHp * 0.02 * (1 + level * 0.1));
        this.enemyHp -= seal;
        this.log.push(`${innerTech.name}封印之力！额外 ${BigNum.format(seal)} 伤害`);
      }
    }

    if (this.enemyHp <= 0) {
      this.enemyHp = 0;
      this.result = 'win';
      this.inCombat = false;
      this.player.stats.enemiesDefeated++;
      this.player.hp = this.playerHp;
      return;
    }

    // Enemy attacks
    let eDmg = Math.max(1, this.enemy.attack - this.player.defense * defenseMult * 0.5);
    eDmg = Math.floor(eDmg * BigNum.randFloat(0.85, 1.15));
    this.playerHp -= eDmg;
    this.log.push(`${this.enemy.name} 造成了 ${BigNum.format(eDmg)} 点伤害`);

    // Body school bonus: chance to reflect damage
    for (const techId of activeTechIds) {
      const tech = GameData.techniques.find(t => t.id === techId);
      if (tech && tech.school === 'body') {
        const level = this.player.techniques[techId] || 0;
        if (Math.random() < 0.05 + level * 0.02) {
          const reflect = Math.floor(eDmg * 0.3);
          this.enemyHp -= reflect;
          this.log.push(`体修反震！反弹 ${BigNum.format(reflect)} 伤害`);
        }
      }
    }

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.result = 'lose';
      this.inCombat = false;
      this.player.hp = Math.floor(this.player.maxHp * 0.3);
      return;
    }
  }

  // Get loot from defeated enemy
  getLoot() {
    if (this.result !== 'win') return {};
    const loot = {};
    if (this.enemy.drops) {
      for (const [item, [min, max]] of Object.entries(this.enemy.drops)) {
        const amount = BigNum.randInt(min, max);
        if (amount > 0) {
          loot[item] = amount;
          BigNum.give(this.player.inventory, { [item]: amount });
        }
      }
    }

    // Small chance for heavenly treasure drop
    if (Math.random() < 0.05 * (this.player.talentModifiers?.exploreTreasureMult || 1)) {
      const currentPeriod = GameData.getRealmPeriod(this.player.realmIndex);
      const currentPeriodIdx = GameData.realmPeriods.indexOf(currentPeriod);
      const eligible = GameData.heavenlyTreasures.filter(t => {
        const tPeriod = GameData.realmPeriods.find(p => p.id === t.tier);
        return GameData.realmPeriods.indexOf(tPeriod) <= currentPeriodIdx;
      });
      if (eligible.length > 0) {
        const treasure = eligible[Math.floor(Math.random() * eligible.length)];
        this.player.inventory[treasure.id] = (this.player.inventory[treasure.id] || 0) + 1;
        loot[treasure.id] = 1;
        loot._treasure = treasure;
      }
    }

    return loot;
  }

  // Heal during combat using pill
  useHealPill() {
    const count = this.player.inventory['huixue_dan'] || 0;
    if (count <= 0) return false;
    this.player.inventory['huixue_dan']--;
    if (this.player.inventory['huixue_dan'] <= 0) delete this.player.inventory['huixue_dan'];
    const heal = Math.floor(this.player.maxHp * 0.3);
    this.playerHp = Math.min(this.player.maxHp, this.playerHp + heal);
    this.log.push(`使用回血丹，恢复 ${BigNum.format(heal)} 生命`);
    return true;
  }
}
