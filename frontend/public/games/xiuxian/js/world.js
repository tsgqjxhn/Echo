// ============================================================
// World system — birthplace, regions, favorability (好感)
// ============================================================

class WorldSystem {
  constructor(player) {
    this.player = player;
  }

  // ---- Birthplace ----
  hasBirthplace() {
    return !!this.getBirthplace();
  }

  getBirthplace() {
    if (!this.player.birthplaceId) return null;
    return GameData.birthplaces.find(b => b.id === this.player.birthplaceId);
  }

  chooseBirthplace(birthplaceId) {
    const bp = GameData.birthplaces.find(b => b.id === birthplaceId);
    if (!bp) return false;

    this.player.birthplaceId = bp.id;
    this.player.currentRegionId = bp.regionId;
    const startPlace = this.getDefaultPlace(bp.regionId);
    this.player.currentPlaceId = startPlace ? startPlace.id : null;

    if (bp.startItems) {
      for (const [k, v] of Object.entries(bp.startItems)) {
        if (k === 'lingshi') this.player.spiritStones += v;
        else BigNum.give(this.player.inventory, { [k]: v });
      }
    }

    if (bp.startFavor) {
      for (const [sectId, v] of Object.entries(bp.startFavor)) {
        const npc = GameData.npcs.find(n => n.sect === sectId);
        if (npc) this.addFavor(npc.id, v);
      }
    }

    this.player.recalcStats();
    return true;
  }

  // ---- Regions ----
  getRegions() {
    return GameData.worldRegions;
  }

  getCurrentRegion() {
    if (!this.player.currentRegionId) return null;
    return GameData.worldRegions.find(r => r.id === this.player.currentRegionId);
  }

  getRegionPlaces(regionId) {
    return (GameData.regionPlaces && GameData.regionPlaces[regionId]) || [];
  }

  getDefaultPlace(regionId) {
    const places = this.getRegionPlaces(regionId);
    return places.find(p => p.primary) || places[0] || null;
  }

  getCurrentPlace() {
    const places = this.getRegionPlaces(this.player.currentRegionId);
    return places.find(p => p.id === this.player.currentPlaceId) || this.getDefaultPlace(this.player.currentRegionId);
  }

  getTravelCost(regionId, placeId = null) {
    if (!this.player.currentRegionId) return 0;
    const travelMult = this.player.talentModifiers ? (this.player.talentModifiers.travelCostMult || 1) : 1;
    if (this.player.currentRegionId !== regionId) return Math.floor(1000 * travelMult);
    if (placeId && this.player.currentPlaceId !== placeId) return Math.floor(100 * travelMult);
    return 0;
  }

  canAffordTravel(regionId, placeId = null) {
    return this.player.spiritStones >= this.getTravelCost(regionId, placeId);
  }

  travelTo(regionId) {
    return this.travelToRegion(regionId);
  }

  travelToRegion(regionId) {
    const r = GameData.worldRegions.find(rg => rg.id === regionId);
    if (!r) return false;

    const cost = this.getTravelCost(regionId);
    if (this.player.spiritStones < cost) return false;
    this.player.spiritStones -= cost;
    this.player.currentRegionId = regionId;

    const currentPlaceValid = this.getRegionPlaces(regionId).some(p => p.id === this.player.currentPlaceId);
    if (!currentPlaceValid) {
      const place = this.getDefaultPlace(regionId);
      this.player.currentPlaceId = place ? place.id : null;
    }
    return { ok: true, cost, region: r, place: this.getCurrentPlace() };
  }

  travelToPlace(regionId, placeId) {
    const r = GameData.worldRegions.find(rg => rg.id === regionId);
    const place = this.getRegionPlaces(regionId).find(p => p.id === placeId);
    if (!r || !place) return false;

    const cost = this.getTravelCost(regionId, placeId);
    if (this.player.spiritStones < cost) return false;
    this.player.spiritStones -= cost;
    this.player.currentRegionId = regionId;
    this.player.currentPlaceId = placeId;
    return { ok: true, cost, region: r, place };
  }

  // ---- Favorability ----
  getFavor(npcId) {
    return this.player.favor[npcId] || 0;
  }

  getRank(npcId) {
    const v = this.getFavor(npcId);
    let current = GameData.favorRanks[0];
    for (const r of GameData.favorRanks) {
      if (v >= r.min) current = r;
    }
    return current;
  }

  addFavor(npcId, delta) {
    this.player.favor[npcId] = Math.max(-100, Math.min(1000, this.getFavor(npcId) + delta));
    return this.player.favor[npcId];
  }

  // Give a gift item to an NPC. Returns { ok, gain }
  giveGift(npcId, itemId) {
    const npc = this._findNpc(npcId);
    if (!npc) return { ok: false, reason: 'NPC不存在' };
    const item = GameData.items[itemId];
    if (!item) return { ok: false, reason: '物品不存在' };

    const have = this.player.inventory[itemId] || 0;
    if (have <= 0) return { ok: false, reason: '物品不足' };

    const baseGain = npc.gifts && npc.gifts[itemId] ? npc.gifts[itemId] : 1;
    BigNum.pay(this.player.inventory, { [itemId]: 1 });

    const gain = baseGain;
    this.addFavor(npcId, gain);
    return { ok: true, gain };
  }

  // ---- Random NPC Generation ----

  // Find NPC in either static or random lists
  _findNpc(npcId) {
    return GameData.npcs.find(n => n.id === npcId) ||
           (this.player.randomNpcs || []).find(n => n.id === npcId) || null;
  }

  // Get all NPCs (static + random), for rendering
  getAllNpcs() {
    return [...GameData.npcs, ...(this.player.randomNpcs || [])];
  }

  // Generate a single random NPC assigned to a sect
  generateRandomNpc(sectId) {
    const sect = GameData.sects.find(s => s.id === sectId);
    const sectName = sect ? sect.name : '';

    const surnames = GameData.npcSurnames;
    const givenNames = GameData.npcGivenNames;
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
    const name = `${sectName} · ${surname}${givenName}`;

    const roles = GameData.npcRoles;
    const role = roles[Math.floor(Math.random() * roles.length)];

    const descs = GameData.npcDescs;
    const desc = descs[Math.floor(Math.random() * descs.length)];

    // Pick 1-3 random gift items
    const poolEntries = Object.entries(GameData.npcGiftPool);
    const giftCount = 1 + Math.floor(Math.random() * 3);
    const gifts = {};
    const used = new Set();
    for (let i = 0; i < giftCount && i < poolEntries.length; i++) {
      let idx;
      do { idx = Math.floor(Math.random() * poolEntries.length); } while (used.has(idx));
      used.add(idx);
      const [itemId, gain] = poolEntries[idx];
      gifts[itemId] = gain;
    }

    const id = `npc_rnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return { id, name, sect: sectId, role, desc, gifts, random: true };
  }

  // Populate each sect with random NPCs on new game
  populateSectNpcs() {
    if (!this.player.randomNpcs) this.player.randomNpcs = [];
    for (const sect of GameData.sects) {
      const count = 3 + Math.floor(Math.random() * 3); // 3-5
      for (let i = 0; i < count; i++) {
        this.player.randomNpcs.push(this.generateRandomNpc(sect.id));
      }
    }
  }

  // Remove a random NPC by id and generate a replacement in the same sect
  replaceNpc(npcId) {
    const list = this.player.randomNpcs;
    if (!list) return;
    const idx = list.findIndex(n => n.id === npcId);
    if (idx === -1) return;
    const old = list[idx];
    list.splice(idx, 1);
    // Remove favor record
    delete this.player.favor[npcId];
    // Generate replacement with a new name
    const replacement = this.generateRandomNpc(old.sect);
    list.push(replacement);
    return replacement;
  }

  // Apply favor to a sect's shop discount: returns multiplier on price (1.0 default)
  sectShopMultiplier(sectId) {
    const npc = this._findNpcBySect(sectId);
    if (!npc) return 1.0;
    return this.getRank(npc.id).shopMult || 1.0;
  }

  _findNpcBySect(sectId) {
    return GameData.npcs.find(n => n.sect === sectId) ||
           (this.player.randomNpcs || []).find(n => n.sect === sectId) || null;
  }
}
