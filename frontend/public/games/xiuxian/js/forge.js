// ============================================================
// Forge system — craft artifacts (法宝、武器、防具、法器)
// ============================================================

class ForgeSystem {
  constructor(player) {
    this.player = player;
  }

  canForge(recipeId) {
    const r = GameData.forgeRecipes.find(x => x.id === recipeId);
    if (!r) return false;
    if (this.player.realmIndex < (r.minRealm || 0)) return false;
    return BigNum.canAfford(this.player.inventory, r.materials) &&
           this.player.spiritStones >= (r.materials.lingshi || 0);
  }

  forge(recipeId) {
    const r = GameData.forgeRecipes.find(x => x.id === recipeId);
    if (!r) return { ok: false, reason: '配方不存在' };
    if (this.player.realmIndex < (r.minRealm || 0)) {
      return { ok: false, reason: `境界不足（需${GameData.realms[r.minRealm].name}）` };
    }

    // Check materials
    const mats = { ...r.materials };
    const needStones = mats.lingshi || 0;
    delete mats.lingshi;
    if (!BigNum.canAfford(this.player.inventory, mats)) return { ok: false, reason: '材料不足' };
    if (this.player.spiritStones < needStones) return { ok: false, reason: '灵石不足' };

    // Pay
    BigNum.pay(this.player.inventory, mats);
    this.player.spiritStones -= needStones;

    // Birthplace forge bonus
    const bp = this.player.birthplaceId ? GameData.birthplaces.find(b => b.id === this.player.birthplaceId) : null;
    const forgeBonus = (bp && bp.bonus && bp.bonus.forge_bonus) || 0;

    // Success rate
    let rate = 0.35 + this.player.forgeLevel * 0.04 + forgeBonus;
    rate -= r.difficulty * 0.025;

    // Talent bonus
    if (this.player.talentModifiers) {
      rate += this.player.talentModifiers.forgeBonusRate || 0;
    }

    rate = BigNum.clamp(rate, 0.10, 0.95);

    const success = Math.random() < rate;
    const result = { ok: true, success, recipe: r };

    if (success) {
      BigNum.give(this.player.artifacts, { [r.result]: r.amount });
      this.player.forgeExp += r.difficulty * 12;
      result.itemId = r.result;
      result.amount = r.amount;

      const expNeeded = this.player.forgeLevel * 120;
      if (this.player.forgeExp >= expNeeded) {
        this.player.forgeExp -= expNeeded;
        this.player.forgeLevel++;
        result.levelUp = true;
      }
    }
    return result;
  }

  equip(artifactId) {
    const item = GameData.items[artifactId];
    if (!item || item.type !== 'artifact') return false;
    if (!(this.player.artifacts[artifactId] > 0)) return false;
    this.player.equippedArtifacts[item.slot] = artifactId;
    this.player.recalcStats();
    return true;
  }

  unequip(slot) {
    if (this.player.equippedArtifacts[slot]) {
      delete this.player.equippedArtifacts[slot];
      this.player.recalcStats();
      return true;
    }
    return false;
  }
}
