// ============================================================
// Sect system — positions, mission hall, contributions, perks
// ============================================================

class SectSystem {
  constructor(player) {
    this.player = player;
  }

  // ---- Sect membership ----
  hasSect() {
    return this.player.sectId != null;
  }

  getSect() {
    if (!this.player.sectId) return null;
    return GameData.sects.find(s => s.id === this.player.sectId);
  }

  joinSect(sectId) {
    const sect = GameData.sects.find(s => s.id === sectId);
    if (!sect) return false;
    if (this.player.realmIndex < sect.minRealm) return false;
    if (this.hasSect()) return false;

    // Require completed trial
    const trial = this.player.sectTrial;
    if (!trial || trial.sectId !== sectId || !trial.won) return false;

    this.player.sectId = sectId;
    this.player.sectContribution = 0;
    this.player.sectTotalContribution = 0;
    this.player.sectPositionIndex = 0;
    this.player.sectDailySalary = 0;
    this.player.sectMissionSlots = GameData.sectPositions[0].perks.missionSlots;
    this.player.completedDailyMissions = [];
    this.player.activeMissions = [];
    this.player.missionCooldowns = {};
    this.player.sectTrial = null; // clear trial after joining
    return true;
  }

  leaveSect() {
    if (!this.hasSect()) return;
    this.player.sectId = null;
    this.player.sectContribution = 0;
    this.player.sectPositionIndex = 0;
    this.player.activeMissions = [];
    this.player.completedDailyMissions = [];
    this.player.lastSectLeaveTime = Date.now();
  }

  // Returns 0 if can rejoin/switch immediately, else seconds remaining
  switchCooldown() {
    const cd = (GameData.sectSwitchCooldown || 600) * 1000;
    const since = Date.now() - (this.player.lastSectLeaveTime || 0);
    return Math.max(0, Math.ceil((cd - since) / 1000));
  }

  // Switch to a new sect: leave current then attempt join (respects cooldown)
  switchSect(newSectId) {
    if (this.hasSect()) {
      const sect = GameData.sects.find(s => s.id === newSectId);
      if (!sect) return { ok: false, reason: '宗门不存在' };
      if (sect.id === this.player.sectId) return { ok: false, reason: '已在该宗门' };
      this.leaveSect();
    }
    if (this.switchCooldown() > 0) {
      return { ok: false, reason: `换宗冷却中 (${this.switchCooldown()}s)` };
    }
    if (!this.joinSect(newSectId)) return { ok: false, reason: '加入失败（境界或资格不足）' };
    return { ok: true };
  }

  // ---- Position ----
  getPosition() {
    return GameData.sectPositions[this.player.sectPositionIndex || 0];
  }

  getPositionIndex() {
    return this.player.sectPositionIndex || 0;
  }

  canPromote() {
    const nextIdx = (this.player.sectPositionIndex || 0) + 1;
    if (nextIdx >= GameData.sectPositions.length) return false;
    const next = GameData.sectPositions[nextIdx];
    return (this.player.sectTotalContribution || 0) >= next.contributionReq;
  }

  promote() {
    if (!this.canPromote()) return false;
    this.player.sectPositionIndex++;
    const pos = this.getPosition();
    this.player.sectMissionSlots = pos.perks.missionSlots;
    return true;
  }

  // Commission rate for elder+ positions
  getCommissionRate() {
    const pos = this.getPosition();
    return pos.commission || 0;
  }

  // Salary per day
  getSalary() {
    return this.getPosition().perks.salary;
  }

  // Collect daily salary
  collectSalary() {
    if (!this.hasSect()) return 0;
    if (this.player.sectSalaryCollected) return 0; // already collected today
    const salary = this.getSalary();
    this.player.spiritStones += salary;
    this.player.sectSalaryCollected = true;
    return salary;
  }

  // ---- Missions ----
  getAvailableMissions() {
    const posIdx = this.player.sectPositionIndex || 0;
    const now = Date.now();

    return GameData.sectMissions.filter(m => {
      if (m.minPosition > posIdx) return false;

      // Daily missions: show if not completed today
      if (m.type === 'daily') {
        return !(this.player.completedDailyMissions || []).includes(m.id);
      }

      // Contribution/special: check cooldown
      const cd = this.player.missionCooldowns || {};
      if (cd[m.id] && cd[m.id] > now) return false;

      return true;
    });
  }

  // Check if player can accept mission
  canAcceptMission(missionId) {
    const mission = GameData.sectMissions.find(m => m.id === missionId);
    if (!mission) return { ok: false, reason: '任务不存在' };

    const activeCount = (this.player.activeMissions || []).length;
    if (activeCount >= (this.player.sectMissionSlots || 2)) {
      return { ok: false, reason: `任务栏已满 (${activeCount}/${this.player.sectMissionSlots || 2})` };
    }

    if (this.player.spirit < mission.spiritCost) {
      return { ok: false, reason: '神识不足' };
    }

    // Check material cost
    if (mission.cost) {
      for (const [itemId, amount] of Object.entries(mission.cost)) {
        if ((this.player.inventory[itemId] || 0) < amount) {
          const item = GameData.items[itemId];
          return { ok: false, reason: `${item ? item.name : itemId}不足` };
        }
      }
    }

    return { ok: true };
  }

  acceptMission(missionId) {
    const check = this.canAcceptMission(missionId);
    if (!check.ok) return check;

    const mission = GameData.sectMissions.find(m => m.id === missionId);
    this.player.spirit -= mission.spiritCost;

    if (mission.cost) {
      BigNum.pay(this.player.inventory, mission.cost);
    }

    this.player.activeMissions = this.player.activeMissions || [];
    this.player.activeMissions.push({
      id: mission.id,
      acceptedAt: Date.now(),
      progress: 0,
    });

    return { ok: true };
  }

  // Complete an active mission instantly (idle game simplification)
  completeMission(missionId) {
    const activeIdx = (this.player.activeMissions || []).findIndex(m => m.id === missionId);
    if (activeIdx === -1) return { ok: false, reason: '任务未接取' };

    const mission = GameData.sectMissions.find(m => m.id === missionId);
    if (!mission) return { ok: false, reason: '任务不存在' };

    // Remove from active
    this.player.activeMissions.splice(activeIdx, 1);

    // Award contribution
    this.player.sectContribution = (this.player.sectContribution || 0) + mission.contribution;
    this.player.sectTotalContribution = (this.player.sectTotalContribution || 0) + mission.contribution;

    // Award rewards
    if (mission.reward) {
      for (const [itemId, amount] of Object.entries(mission.reward)) {
        if (itemId === 'lingshi') {
          this.player.spiritStones += amount;
        } else {
          BigNum.give(this.player.inventory, { [itemId]: amount });
        }
      }
    }

    // Track daily completion
    if (mission.type === 'daily') {
      this.player.completedDailyMissions = this.player.completedDailyMissions || [];
      this.player.completedDailyMissions.push(mission.id);
    }

    // Set cooldown for contribution/special missions
    if (mission.type === 'contribution') {
      this.player.missionCooldowns = this.player.missionCooldowns || {};
      this.player.missionCooldowns[mission.id] = Date.now() + 3600000; // 1h CD
    } else if (mission.type === 'special') {
      this.player.missionCooldowns = this.player.missionCooldowns || {};
      this.player.missionCooldowns[mission.id] = Date.now() + 7200000; // 2h CD
    }

    // Elder commission: distribute to higher position members (simulated)
    const commission = this.getCommissionRate();
    const commissionGain = Math.floor(mission.contribution * commission);
    if (commissionGain > 0 && this.player.sectPositionIndex > 0) {
      // In single player, commission goes to self as "earnings from managing"
      this.player.sectContribution += commissionGain;
      this.player.sectTotalContribution += commissionGain;
    }

    return { ok: true, mission, commissionGain };
  }

  // Reset daily missions (called at day boundary)
  resetDailies() {
    this.player.completedDailyMissions = [];
    this.player.sectSalaryCollected = false;
  }

  // Check shop access level
  getShopAccess() {
    const pos = this.getPosition();
    return pos.perks.shopAccess;
  }

  // Buy from sect shop using contribution points
  buyFromShop(shopItemId) {
    const item = GameData.sectShopItems.find(i => i.id === shopItemId);
    if (!item) return { ok: false, reason: '物品不存在' };

    const access = this.getShopAccess();
    const accessLevels = ['basic', 'outer', 'inner', 'core', 'deacon', 'elder', 'all'];
    if (access !== 'all' && accessLevels.indexOf(access) < accessLevels.indexOf(item.access)) {
      return { ok: false, reason: '职位不足，无法购买' };
    }

    // Apply favor-based discount (掌门 NPC 好感)
    const npc = GameData.npcs.find(n => n.sect === this.player.sectId);
    let mult = 1.0;
    if (npc) {
      const fv = this.player.favor[npc.id] || 0;
      let cur = GameData.favorRanks[0];
      for (const r of GameData.favorRanks) if (fv >= r.min) cur = r;
      mult = cur.shopMult;
    }
    const finalCost = Math.ceil(item.cost * mult);

    if ((this.player.sectContribution || 0) < finalCost) {
      return { ok: false, reason: '贡献度不足' };
    }

    this.player.sectContribution -= finalCost;
    BigNum.give(this.player.inventory, { [item.itemId]: item.amount });
    return { ok: true, item, paid: finalCost };
  }

  // ---- Sect Trial ----
  getTrialData(sectId) {
    return GameData.sectTrialOpponents.find(t => t.sectId === sectId) || null;
  }

  startTrial(sectId) {
    const sect = GameData.sects.find(s => s.id === sectId);
    if (!sect) return { ok: false, reason: '宗门不存在' };
    if (this.player.realmIndex < sect.minRealm) return { ok: false, reason: '境界不足' };
    if (this.hasSect()) return { ok: false, reason: '已加入宗门' };

    const trialData = this.getTrialData(sectId);
    if (!trialData) return { ok: false, reason: '无试炼数据' };

    this.player.sectTrial = { sectId, currentOpponent: 0, won: false };
    return { ok: true, opponents: trialData.opponents };
  }

  getCurrentTrialOpponent() {
    const trial = this.player.sectTrial;
    if (!trial) return null;
    const data = this.getTrialData(trial.sectId);
    if (!data) return null;
    return data.opponents[trial.currentOpponent] || null;
  }

  advanceTrial() {
    const trial = this.player.sectTrial;
    if (!trial) return { complete: false };
    const data = this.getTrialData(trial.sectId);
    if (!data) return { complete: false };

    trial.currentOpponent++;
    if (trial.currentOpponent >= data.opponents.length) {
      trial.won = true;
      return { complete: true };
    }
    return { complete: false, nextOpponent: data.opponents[trial.currentOpponent] };
  }

  isTrialComplete(sectId) {
    const trial = this.player.sectTrial;
    return trial && trial.sectId === sectId && trial.won;
  }

  cancelTrial() {
    this.player.sectTrial = null;
  }
}
