// ============================================================
// Auction system — timed events, NPC bidders, countdown
// ============================================================

class AuctionSystem {
  constructor(player) {
    this.player = player;
    this.active = false;
    this.items = [];           // [{itemId, amount, basePrice, currentBid, currentBidder, sold}]
    this.currentItemIndex = 0;
    this.countdown = 0;        // seconds remaining for current item
    this.baseCountdown = 30;   // base bidding time per item
    this.npcBidders = [];      // active NPCs for this auction
    this.results = [];         // completed auction results
    this.tier = null;
    this.auctionTimer = null;
  }

  // ---- Auction availability ----
  getSecondsUntilNext() {
    const lastAuction = this.player.lastAuctionTime || 0;
    const elapsed = (Date.now() - lastAuction) / 1000;
    return Math.max(0, GameData.auctionSchedule - elapsed);
  }

  canStartAuction() {
    return this.getSecondsUntilNext() <= 0 && !this.active;
  }

  // ---- Determine auction tier based on current region + sect affiliation ----
  getAuctionTier() {
    const regionId = this.player.currentRegionId;
    const sectId = this.player.sectId;

    // Map current region to region group
    const region = GameData.worldRegions.find(r => r.id === regionId);
    const regionType = region ? region.type : 'pole'; // default lowest

    // Determine affiliation from player's sect
    let affiliated = false;
    if (sectId) {
      const mapping = GameData.sectRegionMap[sectId];
      if (mapping) affiliated = mapping.affiliated;
    }

    // Determine auction tier: region group + affiliation
    if (regionType === 'center') {
      return affiliated ? 'huge' : 'top';
    } else if (regionType === 'inner') { // r_kunyuan
      return affiliated ? 'medium' : 'large';
    } else {
      // domain (四域) or pole
      return affiliated ? 'micro' : 'small';
    }
  }

  // ---- Start auction ----
  startAuction() {
    if (this.active) return false;

    // Determine tier based on region + sect affiliation
    const tierKey = this.getAuctionTier();

    // Find matching pool by tier key, fallback to first pool
    let pool = GameData.auctionItemPools.find(p => p.tier === tierKey) || GameData.auctionItemPools[0];

    this.tier = pool;

    // Generate items: item count scales with tier
    const tierCounts = { micro: [2, 3], small: [3, 5], medium: [4, 6], large: [5, 7], huge: [6, 8], top: [7, 9] };
    const [minCount, maxCount] = tierCounts[tierKey] || [4, 6];
    const count = BigNum.randInt(minCount, maxCount);
    const selected = [];
    const poolCopy = [...pool.items];

    for (let i = 0; i < count && poolCopy.length > 0; i++) {
      const item = BigNum.weightedRandom(poolCopy);
      // Remove selected to avoid duplicates
      const idx = poolCopy.indexOf(item);
      if (idx >= 0) poolCopy.splice(idx, 1);

      selected.push({
        itemId: item.itemId,
        amount: item.amount,
        basePrice: item.basePrice,
        currentBid: item.basePrice,
        currentBidder: null,
        sold: false,
      });
    }

    this.items = selected;
    this.currentItemIndex = 0;
    this.countdown = this.baseCountdown;
    this.results = [];
    this.active = true;

    // Select NPC bidders: count scales with tier
    const npcTierCounts = { micro: [2, 3], small: [3, 4], medium: [3, 5], large: [4, 5], huge: [4, 6], top: [5, 6] };
    const [minNpc, maxNpc] = npcTierCounts[tierKey] || [3, 5];
    const npcCount = BigNum.randInt(minNpc, maxNpc);
    const available = [...GameData.auctionNPCs];
    this.npcBidders = [];
    for (let i = 0; i < npcCount && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      this.npcBidders.push(available.splice(idx, 1)[0]);
    }

    this.player.lastAuctionTime = Date.now();
    return true;
  }

  // ---- Current item ----
  getCurrentItem() {
    if (this.currentItemIndex >= this.items.length) return null;
    return this.items[this.currentItemIndex];
  }

  // ---- Player bid ----
  placeBid(amount) {
    const item = this.getCurrentItem();
    if (!item || item.sold) return { ok: false, reason: '当前无拍品' };

    const minBid = Math.floor(item.currentBid * 1.05);
    if (amount < minBid) {
      return { ok: false, reason: `出价不能低于 ${BigNum.format(minBid)} 灵石` };
    }

    if (this.player.spiritStones < amount) {
      return { ok: false, reason: '灵石不足' };
    }

    item.currentBid = amount;
    item.currentBidder = 'player';

    // Reset countdown to 30s if < 30s remaining
    if (this.countdown < 30) {
      this.countdown = 30;
    }

    return { ok: true, bid: amount };
  }

  // Quick bid: current bid * 1.1
  quickBid() {
    const item = this.getCurrentItem();
    if (!item) return { ok: false, reason: '无拍品' };
    const amount = Math.ceil(item.currentBid * 1.1);
    return this.placeBid(amount);
  }

  // ---- NPC bidding logic (called per tick) ----
  _npcBid() {
    const item = this.getCurrentItem();
    if (!item || item.sold) return;

    // Only NPCs who haven't exceeded budget
    const eligible = this.npcBidders.filter(npc => npc.maxBudget > item.currentBid);
    if (eligible.length === 0) return;

    for (const npc of eligible) {
      let willBid = false;

      switch (npc.style) {
        case 'aggressive':
          willBid = Math.random() < 0.4;
          break;
        case 'conservative':
          willBid = Math.random() < 0.15;
          break;
        case 'moderate':
          willBid = Math.random() < 0.25;
          break;
        case 'random':
          willBid = Math.random() < 0.3;
          break;
      }

      if (willBid) {
        const newBid = Math.ceil(item.currentBid * npc.bidIncrement);
        if (newBid <= npc.maxBudget) {
          item.currentBid = newBid;
          item.currentBidder = npc.name;

          // Reset countdown to 30s
          if (this.countdown < 30) {
            this.countdown = 30;
          }
          return; // one NPC bid per tick
        }
      }
    }
  }

  // ---- Tick (called every second during auction) ----
  tick() {
    if (!this.active) return null;

    this.countdown--;

    // NPC may bid (random chance each second)
    if (this.countdown > 3 && this.countdown % 3 === 0) {
      this._npcBid();
    }

    if (this.countdown <= 0) {
      return this._resolveCurrentItem();
    }

    return null;
  }

  _resolveCurrentItem() {
    const item = this.getCurrentItem();
    if (!item) return null;

    item.sold = true;
    const result = {
      itemId: item.itemId,
      amount: item.amount,
      finalPrice: item.currentBid,
      winner: item.currentBidder,
    };

    // If player won, deduct spirit stones and give item
    if (item.currentBidder === 'player') {
      this.player.spiritStones -= item.currentBid;
      BigNum.give(this.player.inventory, { [item.itemId]: item.amount });
    }

    this.results.push(result);
    this.currentItemIndex++;

    // Move to next item or end auction
    if (this.currentItemIndex >= this.items.length) {
      this.active = false;
      return { type: 'auction_end', results: this.results };
    } else {
      this.countdown = this.baseCountdown;
      return { type: 'item_sold', result };
    }
  }

  // ---- Leave auction early ----
  leaveAuction() {
    this.active = false;
    this.items = [];
    this.npcBidders = [];
  }
}
