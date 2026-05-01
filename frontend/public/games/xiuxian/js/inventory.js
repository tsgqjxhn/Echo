// ============================================================
// Inventory system
// ============================================================

class InventorySystem {
  constructor(player) {
    this.player = player;
  }

  add(itemId, count = 1) {
    this.player.inventory[itemId] = (this.player.inventory[itemId] || 0) + count;
  }

  remove(itemId, count = 1) {
    if ((this.player.inventory[itemId] || 0) < count) return false;
    this.player.inventory[itemId] -= count;
    if (this.player.inventory[itemId] <= 0) delete this.player.inventory[itemId];
    return true;
  }

  count(itemId) {
    return this.player.inventory[itemId] || 0;
  }

  // Get all items grouped by type
  getGrouped() {
    const groups = { pill: {}, consumable: {}, herb: {}, material: {}, treasure: {}, currency: {} };
    for (const [id, count] of Object.entries(this.player.inventory)) {
      const item = GameData.items[id];
      if (!item) continue;
      const type = item.type === 'pill' ? 'pill' :
                   item.type === 'consumable' ? 'consumable' :
                   item.type === 'herb' ? 'herb' :
                   item.type === 'treasure' ? 'treasure' :
                   item.type === 'material' ? 'material' : 'currency';
      groups[type][id] = count;
    }
    return groups;
  }

  // Get rarity color class
  static rarityClass(rarity) {
    return `rarity-${rarity || 'common'}`;
  }
}
