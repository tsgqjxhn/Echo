// ============================================================
// Exploration system — zones, nodes, encounters, rewards
// ============================================================

class ExplorationSystem {
  constructor(player, combatSystem) {
    this.player = player;
    this.combat = combatSystem;
    this.currentZone = null;
    this.currentNode = 0;
    this.totalNodes = 0;
    this.active = false;
    this.currentEvent = null;
    this.completedNodes = [];
  }

  // Start exploring a zone
  startZone(zoneId) {
    const zone = GameData.zones.find(z => z.id === zoneId);
    if (!zone) return false;
    if (this.player.realmIndex < zone.minRealm) return false;
    if (this.player.spirit < zone.spiritCost) return false;

    this.player.spirit -= zone.spiritCost;
    this.currentZone = zone;
    this.currentNode = 0;
    this.totalNodes = zone.nodes;
    this.active = true;
    this.currentEvent = null;
    this.completedNodes = [];

    return true;
  }

  // Move to next node
  advanceNode() {
    if (!this.active) return null;
    if (this.combat.inCombat) return null;
    if (this.currentEvent) return null;

    this.currentNode++;

    if (this.currentNode > this.totalNodes) {
      this.active = false;
      return { type: 'complete', zone: this.currentZone };
    }

    // Determine event type
    const roll = Math.random();
    let eventType;
    if (roll < 0.35) {
      eventType = 'combat';
    } else if (roll < 0.55) {
      eventType = 'gather';
    } else {
      eventType = 'encounter';
    }

    // Boss on last node
    if (this.currentNode === this.totalNodes) {
      eventType = 'combat';
    }

    const nodeData = { type: eventType, node: this.currentNode };

    if (eventType === 'combat') {
      const enemies = GameData.enemies[this.currentZone.id] || [];
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      if (enemy) {
        // Scale enemy slightly with progress
        const scaledEnemy = {
          ...enemy,
          hp: Math.floor(enemy.hp * (1 + this.currentNode * 0.05)),
          attack: Math.floor(enemy.attack * (1 + this.currentNode * 0.03)),
        };
        this.combat.start(scaledEnemy);
        nodeData.enemy = scaledEnemy;
      }
    } else if (eventType === 'gather') {
      const zone = this.currentZone;
      const loot = {};
      for (let i = 0; i < zone.drops.length; i++) {
        if (Math.random() < zone.dropRates[i]) {
          const amount = BigNum.randInt(1, 3);
          loot[zone.drops[i]] = amount;
        }
      }
      BigNum.give(this.player.inventory, loot);
      nodeData.loot = loot;

      // Small chance to find heavenly treasure
      const currentPeriod = GameData.getRealmPeriod(this.player.realmIndex);
      const currentPeriodIdx = GameData.realmPeriods.indexOf(currentPeriod);
      const eligibleTreasures = GameData.heavenlyTreasures.filter(t => {
        const tPeriod = GameData.realmPeriods.find(p => p.id === t.tier);
        return GameData.realmPeriods.indexOf(tPeriod) <= currentPeriodIdx;
      });
      if (eligibleTreasures.length > 0 && Math.random() < 0.08 * (this.player.talentModifiers?.exploreTreasureMult || 1)) {
        const treasure = eligibleTreasures[Math.floor(Math.random() * eligibleTreasures.length)];
        this.player.inventory[treasure.id] = (this.player.inventory[treasure.id] || 0) + 1;
        nodeData.treasure = treasure;
      }
    } else {
      // Random encounter
      const eligible = GameData.encounters.filter(e =>
        this.player.realmIndex >= e.minRealm
      );
      if (eligible.length > 0) {
        const encounter = BigNum.weightedRandom(eligible);
        this.currentEvent = encounter;
        nodeData.encounter = encounter;
      } else {
        // Fallback to gathering
        const loot = {};
        for (let i = 0; i < this.currentZone.drops.length; i++) {
          if (Math.random() < this.currentZone.dropRates[i]) {
            loot[this.currentZone.drops[i]] = BigNum.randInt(1, 2);
          }
        }
        BigNum.give(this.player.inventory, loot);
        nodeData.type = 'gather';
        nodeData.loot = loot;
      }
    }

    this.completedNodes.push(nodeData);
    return nodeData;
  }

  // Handle encounter choice
  handleChoice(choiceIndex) {
    if (!this.currentEvent) return null;

    const choice = this.currentEvent.choices[choiceIndex];
    if (!choice) return null;

    const result = {
      choice: choice,
      encounter: this.currentEvent,
      rewards: {},
      success: true
    };

    // Check if can afford cost
    if (choice.cost && !BigNum.canAfford(this.player.inventory, choice.cost)) {
      if (choice.cost.lingshi && this.player.spiritStones < (choice.cost.lingshi || 0)) {
        result.success = false;
        result.reason = '资源不足';
        this.currentEvent = null;
        return result;
      }
    }

    // Apply costs
    if (choice.cost) {
      if (choice.cost.lingshi) {
        this.player.spiritStones -= choice.cost.lingshi;
      }
      if (choice.cost.spirit) {
        this.player.spirit -= choice.cost.spirit;
      }
      BigNum.pay(this.player.inventory, choice.cost);
    }

    // Apply reputation effects
    if (choice.effects && choice.effects.reputation !== undefined) {
      this.player.reputation += choice.effects.reputation;
    }

    // Handle special outcomes
    if (choice.outcome === 'combat' || choice.outcome === 'combat_demonic') {
      const enemies = GameData.enemies[this.currentZone?.id || 'z_forest'] || [];
      if (enemies.length > 0) {
        const enemy = { ...enemies[Math.floor(Math.random() * enemies.length)] };
        enemy.hp = Math.floor(enemy.hp * 1.5);
        enemy.attack = Math.floor(enemy.attack * 1.3);
        enemy.name = choice.outcome === 'combat_demonic' ? '魔修' : enemy.name;
        this.combat.start(enemy);
        result.combat = true;
        result.enemy = enemy;
      }
    } else if (choice.outcome === 'cave_explore' || choice.outcome === 'cave_explore_hard') {
      // Cave exploration gives random loot
      const difficulty = choice.outcome === 'cave_explore_hard' ? 3 : 1;
      const loot = {};
      if (Math.random() < 0.3 * difficulty) { loot.tiannian_lingyao = BigNum.randInt(1, 2 * difficulty); }
      if (Math.random() < 0.15 * difficulty) { loot.kuangmai = BigNum.randInt(1, 3); }
      if (Math.random() < 0.05 * difficulty) { loot.longwen_heijin = 1; }
      BigNum.give(this.player.inventory, loot);
      result.rewards = loot;

      // Chance to find a technique scroll
      if (Math.random() < 0.15 * difficulty) {
        const available = GameData.techniques.filter(t =>
          t.source === 'adventure' && !this.player.techniques[t.id]
        );
        if (available.length > 0) {
          const found = available[Math.floor(Math.random() * available.length)];
          result.foundTechnique = found;
        }
      }
    } else {
      // Normal reward
      if (choice.rewards) {
        for (const [key, value] of Object.entries(choice.rewards)) {
          if (key === 'cultivation') {
            // Special: add cultivation based on rate * seconds
            if (typeof value === 'string' && value.startsWith('current_rate_')) {
              const seconds = parseInt(value.replace('current_rate_', ''));
              const amount = Math.floor(this.player.getCultivationRate() * seconds);
              this.player.cultivation += amount;
              this.player.stats.totalCultivation += amount;
              result.rewards.cultivation = amount;
            }
          } else if (key === 'technique_scroll') {
            // Random technique
            if (value === 'random_earth') {
              const available = GameData.techniques.filter(t =>
                t.tier === 'earth' && !this.player.techniques[t.id]
              );
              if (available.length > 0) {
                result.foundTechnique = available[Math.floor(Math.random() * available.length)];
              }
            }
          } else if (GameData.items[key]) {
            const amount = typeof value === 'number' ? value : 1;
            BigNum.give(this.player.inventory, { [key]: amount });
            result.rewards[key] = amount;
          }
        }
      }
    }

    this.player.stats.encountersCompleted++;
    this.currentEvent = null;
    return result;
  }

  // Retreat from exploration
  retreat() {
    this.active = false;
    this.currentEvent = null;
    this.currentZone = null;
  }
}
