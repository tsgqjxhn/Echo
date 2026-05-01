// ============================================================
// BigInt utility — handles large numbers with formatting
// ============================================================

const BigNum = {
  // Display a large number in human-readable form
  format(n) {
    if (n === Infinity) return '∞';
    if (n === undefined || n === null) return '0';

    const num = typeof n === 'bigint' ? Number(n) : Number(n);
    if (isNaN(num)) return '0';
    if (num < 0) return '-' + this.format(-num);

    const suffixes = ['', '万', '亿', '万亿', '兆', '京', '垓'];
    const thresholds = [1, 1e4, 1e8, 1e12, 1e16, 1e20, 1e24];

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (num >= thresholds[i]) {
        const val = num / thresholds[i];
        if (i === 0) return Math.floor(val).toLocaleString();
        return val.toFixed(val < 10 ? 2 : (val < 100 ? 1 : 0)) + suffixes[i];
      }
    }
    return '0';
  },

  // Short format for rates (per second)
  formatRate(n) {
    return this.format(n) + '/s';
  },

  // Clamp between min and max
  clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  },

  // Random integer in range [min, max]
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Random float in range [min, max]
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  // Weighted random selection from array of { ..., weight }
  weightedRandom(items) {
    const total = items.reduce((s, i) => s + (i.weight || 1), 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= (item.weight || 1);
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  },

  // Check if player can afford cost object { itemId: amount, ... }
  canAfford(inventory, costs) {
    for (const [id, amount] of Object.entries(costs)) {
      if ((inventory[id] || 0) < amount) return false;
    }
    return true;
  },

  // Deduct costs from inventory
  pay(inventory, costs) {
    for (const [id, amount] of Object.entries(costs)) {
      inventory[id] = (inventory[id] || 0) - amount;
      if (inventory[id] <= 0) delete inventory[id];
    }
  },

  // Add rewards to inventory
  give(inventory, rewards) {
    for (const [id, amount] of Object.entries(rewards)) {
      inventory[id] = (inventory[id] || 0) + amount;
    }
  }
};
