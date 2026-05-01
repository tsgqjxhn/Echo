// ============================================================
// Alchemy system — refine pills with mini-game
// ============================================================

class AlchemySystem {
  constructor(player) {
    this.player = player;
    this.refining = false;
    this.currentRecipe = null;
    this.heatLevel = 50;    // 0-100
    this.targetZone = [40, 60]; // ideal heat zone
    this.timer = 0;
    this.maxTime = 0;
    this.tickCount = 0;
  }

  // Check if player can refine a recipe
  canRefine(recipeId) {
    const recipe = GameData.recipes.find(r => r.id === recipeId);
    if (!recipe) return false;
    return BigNum.canAfford(this.player.inventory, recipe.materials);
  }

  // Start refining
  startRefine(recipeId) {
    const recipe = GameData.recipes.find(r => r.id === recipeId);
    if (!recipe || !this.canRefine(recipeId)) return false;

    BigNum.pay(this.player.inventory, recipe.materials);
    this.refining = true;
    this.currentRecipe = recipe;
    this.heatLevel = 50;
    this.targetZone = [
      Math.max(20, 50 - recipe.difficulty * 3),
      Math.min(80, 50 + recipe.difficulty * 3)
    ];
    this.maxTime = 8 + recipe.difficulty * 2; // seconds
    this.timer = 0;
    this.tickCount = 0;

    return true;
  }

  // Mini-game: adjust heat. Called by UI on click/hold
  adjustHeat(delta) {
    if (!this.refining) return;
    this.heatLevel = BigNum.clamp(this.heatLevel + delta, 0, 100);
  }

  // Tick during refining
  tick(dt) {
    if (!this.refining) return null;

    this.timer += dt;
    this.tickCount++;

    // Heat naturally drifts
    this.heatLevel = BigNum.clamp(this.heatLevel + (Math.random() - 0.5) * 2, 0, 100);

    // Check completion
    if (this.timer >= this.maxTime) {
      return this.completeRefine();
    }
    return null;
  }

  completeRefine() {
    // Calculate score based on time spent in target zone
    const inZone = this.heatLevel >= this.targetZone[0] && this.heatLevel <= this.targetZone[1];

    // Base success rate: alchemy level + zone bonus + birthplace bonus
    let successRate = 0.3 + this.player.alchemyLevel * 0.05;
    if (inZone) successRate += 0.3;
    const bp = this.player.birthplaceId ? GameData.birthplaces.find(b => b.id === this.player.birthplaceId) : null;
    if (bp && bp.bonus && bp.bonus.alchemy_bonus) successRate += bp.bonus.alchemy_bonus;

    // Difficulty penalty
    successRate -= this.currentRecipe.difficulty * 0.03;

    // Talent bonus
    if (this.player.talentModifiers) {
      successRate += this.player.talentModifiers.alchemyBonusRate || 0;
    }

    successRate = BigNum.clamp(successRate, 0.05, 0.95);

    const success = Math.random() < successRate;
    const result = { success, recipe: this.currentRecipe };

    if (success) {
      const quality = this.heatLevel >= this.targetZone[0] && this.heatLevel <= this.targetZone[1] ? 'high' : 'normal';
      const amount = quality === 'high' ? this.currentRecipe.amount + 1 : this.currentRecipe.amount;
      BigNum.give(this.player.inventory, { [this.currentRecipe.result]: amount });
      result.amount = amount;
      result.quality = quality;

      this.player.alchemyExp += this.currentRecipe.difficulty * 10;
      this.player.stats.pillsRefined++;

      // Level up alchemy
      const expNeeded = this.player.alchemyLevel * 100;
      if (this.player.alchemyExp >= expNeeded) {
        this.player.alchemyExp -= expNeeded;
        this.player.alchemyLevel++;
        result.levelUp = true;
      }
    } else {
      this.player.stats.pillsFailed++;
    }

    this.refining = false;
    this.currentRecipe = null;
    return result;
  }
}
