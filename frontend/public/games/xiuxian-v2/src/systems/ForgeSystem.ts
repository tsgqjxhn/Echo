/**
 * 《问道长生》Phaser 3 重构版 —— 炼器系统
 * Phase 3C: 炼器系统
 *
 * 负责法宝锻造、装备强化、符文铭刻、材料融合。
 * - 10个法宝配方，从青锋剑到诛仙剑
 * - 3个装备槽：武器、防具、法器
 * - 炼器等级影响成功率和品质
 * - 装备属性：攻击/防御/修炼速度/生命百分比加成
 */

import { getItemConfig, ITEMS } from '../data/gameData';
import { clamp } from '../utils';

// ============================================================================
// 类型定义
// ============================================================================

/** 装备槽位 */
export type EquipmentSlot = 'weapon' | 'armor' | 'talisman';

/** 装备属性定义 */
export interface EquipmentStats {
  attack?: number;
  attackPercent?: number;
  defense?: number;
  defensePercent?: number;
  hpPercent?: number;
  cultivationSpeed?: number;
  critRate?: number;
  critDamage?: number;
}

/** 符文定义 */
export interface RuneDef {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  effects: EquipmentStats;
  materialCost: Record<string, number>;
}

/** 锻造配方 */
export interface ForgeRecipe {
  id: string;
  name: string;
  resultItemId: string;
  slot: EquipmentSlot;
  materials: Record<string, number>;
  difficulty: number;
  minRealmIndex: number;
  baseStats: EquipmentStats;
  description: string;
}

/** 装备品质 */
export type EquipmentQuality = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** 锻造结果 */
export interface ForgeResult {
  success: boolean;
  quality: EquipmentQuality;
  itemId: string;
  itemName: string;
  stats: EquipmentStats;
  experienceGained: number;
  message: string;
}

/** 强化结果 */
export interface EnhanceResult {
  success: boolean;
  itemId: string;
  oldLevel: number;
  newLevel: number;
  statBonus: EquipmentStats;
  message: string;
}

/** 符文铭刻结果 */
export interface InscribeResult {
  success: boolean;
  itemId: string;
  runeId: string;
  message: string;
  effects?: EquipmentStats;
}

/** 材料融合结果 */
export interface FuseResult {
  success: boolean;
  resultItemId: string;
  resultName: string;
  amount: number;
  message: string;
}

/** 已装备物品 */
export interface EquippedItem {
  itemId: string;
  slot: EquipmentSlot;
  enhanceLevel: number;
  runes: string[];
}

/** 炼器系统状态 */
export interface ForgeSystemState {
  forgeLevel: number;
  forgeExp: number;
  totalForged: number;
  totalFailed: number;
  equipped: Partial<Record<EquipmentSlot, EquippedItem>>;
}

// ============================================================================
// 静态配置
// ============================================================================

/** 装备品质倍率（基础属性乘数） */
const QUALITY_MULTIPLIER: Record<EquipmentQuality, number> = {
  common: 0.8,
  uncommon: 1.0,
  rare: 1.2,
  epic: 1.5,
  legendary: 1.8,
  mythic: 2.2,
};

/** 品质名称 */
const QUALITY_NAMES: Record<EquipmentQuality, string> = {
  common: '凡品',
  uncommon: '良品',
  rare: '上品',
  epic: '极品',
  legendary: '仙品',
  mythic: '神品',
};

/** 10个法宝配方 */
export const FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: 'f_qingfeng', name: '青锋剑',
    resultItemId: 'aw_qingfeng', slot: 'weapon',
    materials: { xuantie: 5, lingshi: 500 },
    difficulty: 1, minRealmIndex: 0,
    baseStats: { attack: 30, attackPercent: 0.05 },
    description: '入门飞剑，剑气凌厉',
  },
  {
    id: 'f_juling', name: '聚灵珠',
    resultItemId: 'at_juling', slot: 'talisman',
    materials: { xuantie: 3, kuangmai: 2, lingshi: 800 },
    difficulty: 2, minRealmIndex: 0,
    baseStats: { cultivationSpeed: 0.08 },
    description: '修炼速度+8%',
  },
  {
    id: 'f_xuanguang', name: '玄光甲',
    resultItemId: 'ar_xuanguang', slot: 'armor',
    materials: { xuantie: 8, kuangmai: 3, lingshi: 1500 },
    difficulty: 3, minRealmIndex: 3,
    baseStats: { defense: 80, defensePercent: 0.10 },
    description: '韧性极佳的护甲',
  },
  {
    id: 'f_liehuo', name: '烈火剑',
    resultItemId: 'aw_liehuo', slot: 'weapon',
    materials: { huoxin_jin: 4, kuangmai: 6, lingshi: 5000 },
    difficulty: 5, minRealmIndex: 5,
    baseStats: { attack: 200, attackPercent: 0.12, critRate: 0.03 },
    description: '南域名剑，烈火焚天',
  },
  {
    id: 'f_qixing', name: '七星罗盘',
    resultItemId: 'at_qixing', slot: 'talisman',
    materials: { kuangmai: 8, leiyin_shi: 2, lingshi: 8000 },
    difficulty: 6, minRealmIndex: 5,
    baseStats: { cultivationSpeed: 0.18, critRate: 0.02 },
    description: '修炼速度+18%，可感应七星之力',
  },
  {
    id: 'f_jingang', name: '金刚甲',
    resultItemId: 'ar_jingang', slot: 'armor',
    materials: { huoxin_jin: 5, kuangmai: 10, lingshi: 12000 },
    difficulty: 7, minRealmIndex: 8,
    baseStats: { defense: 400, defensePercent: 0.18, hpPercent: 0.05 },
    description: '万法不侵的金刚战甲',
  },
  {
    id: 'f_zhanlong', name: '斩龙刃',
    resultItemId: 'aw_zhanlong', slot: 'weapon',
    materials: { longwen_heijin: 3, leiyin_shi: 5, huoxin_jin: 5, lingshi: 50000 },
    difficulty: 12, minRealmIndex: 11,
    baseStats: { attack: 2500, attackPercent: 0.25, critDamage: 0.20 },
    description: '可斩天蛟的传世神兵',
  },
  {
    id: 'f_huanglong', name: '黄龙铠',
    resultItemId: 'ar_huanglong', slot: 'armor',
    materials: { longwen_heijin: 4, huoxin_jin: 8, lingshi: 80000 },
    difficulty: 14, minRealmIndex: 14,
    baseStats: { defense: 4000, defensePercent: 0.30, hpPercent: 0.10 },
    description: '土系传世重铠，防御无双',
  },
  {
    id: 'f_taiji', name: '太极图',
    resultItemId: 'at_taiji', slot: 'talisman',
    materials: { hundun_yuanshi: 2, longwen_heijin: 5, lingshi: 200000 },
    difficulty: 18, minRealmIndex: 17,
    baseStats: { cultivationSpeed: 0.45, hpPercent: 0.05 },
    description: '修炼速度+45%，蕴含太极真意',
  },
  {
    id: 'f_zhuxian', name: '诛仙剑',
    resultItemId: 'aw_zhuxian', slot: 'weapon',
    materials: { xianjin: 3, hundun_yuanshi: 5, longwen_heijin: 10, lingshi: 1000000 },
    difficulty: 25, minRealmIndex: 23,
    baseStats: { attack: 25000, attackPercent: 0.5, critRate: 0.08, critDamage: 0.30 },
    description: '上古杀伐至宝，诛仙灭神',
  },
];

/** 符文配置 */
export const RUNES: RuneDef[] = [
  {
    id: 'rune_attack', name: '锐金符文',
    description: '攻击力+5%',
    slot: 'weapon',
    effects: { attackPercent: 0.05 },
    materialCost: { kuangmai: 2, lingshi: 500 },
  },
  {
    id: 'rune_crit', name: '破军符文',
    description: '暴击率+3%',
    slot: 'weapon',
    effects: { critRate: 0.03 },
    materialCost: { longwen_heijin: 1, lingshi: 2000 },
  },
  {
    id: 'rune_defense', name: '厚土符文',
    description: '防御力+5%',
    slot: 'armor',
    effects: { defensePercent: 0.05 },
    materialCost: { kuangmai: 2, lingshi: 500 },
  },
  {
    id: 'rune_hp', name: '长生符文',
    description: '生命上限+5%',
    slot: 'armor',
    effects: { hpPercent: 0.05 },
    materialCost: { tiannian_lingyao: 2, lingshi: 1000 },
  },
  {
    id: 'rune_cult', name: '聚灵符文',
    description: '修炼速度+3%',
    slot: 'talisman',
    effects: { cultivationSpeed: 0.03 },
    materialCost: { kuangmai: 1, lingshi: 800 },
  },
  {
    id: 'rune_speed', name: '疾风符文',
    description: '攻击速度提升',
    slot: 'weapon',
    effects: { attackPercent: 0.03, critRate: 0.02 },
    materialCost: { longwen_heijin: 1, leiyin_shi: 2, lingshi: 3000 },
  },
];

/** 强化消耗表（每级） */
const ENHANCE_COSTS: Record<number, { materials: Record<string, number>; lingshi: number }> = {
  1: { materials: { kuangmai: 1 }, lingshi: 200 },
  2: { materials: { kuangmai: 2 }, lingshi: 400 },
  3: { materials: { kuangmai: 3, xuantie: 2 }, lingshi: 800 },
  4: { materials: { kuangmai: 4, xuantie: 3 }, lingshi: 1500 },
  5: { materials: { longwen_heijin: 1, kuangmai: 5 }, lingshi: 3000 },
  6: { materials: { longwen_heijin: 2, kuangmai: 6 }, lingshi: 6000 },
  7: { materials: { longwen_heijin: 3, hundun_yuanshi: 1 }, lingshi: 12000 },
  8: { materials: { hundun_yuanshi: 2, longwen_heijin: 3 }, lingshi: 25000 },
  9: { materials: { hundun_yuanshi: 3, xianjin: 1 }, lingshi: 50000 },
};

/** 强化属性加成表（每级） */
function getEnhanceBonus(slot: EquipmentSlot, level: number): EquipmentStats {
  const multiplier = level * 0.05;
  switch (slot) {
    case 'weapon':
      return { attackPercent: multiplier };
    case 'armor':
      return { defensePercent: multiplier, hpPercent: multiplier * 0.5 };
    case 'talisman':
      return { cultivationSpeed: multiplier * 0.5 };
  }
}

function createDefaultState(): ForgeSystemState {
  return {
    forgeLevel: 0,
    forgeExp: 0,
    totalForged: 0,
    totalFailed: 0,
    equipped: {},
  };
}

// ============================================================================
// 炼器系统
// ============================================================================

export class ForgeSystem {
  private _state: ForgeSystemState;

  constructor(savedState?: Partial<ForgeSystemState>) {
    this._state = { ...createDefaultState(), ...savedState };
  }

  /** 序列化 */
  public serialize(): ForgeSystemState {
    return {
      forgeLevel: this._state.forgeLevel,
      forgeExp: this._state.forgeExp,
      totalForged: this._state.totalForged,
      totalFailed: this._state.totalFailed,
      equipped: { ...this._state.equipped },
    };
  }

  /** 恢复 */
  public restore(state: Partial<ForgeSystemState>): void {
    this._state = { ...createDefaultState(), ...state };
  }

  /** 获取状态 */
  public getState(): Readonly<ForgeSystemState> {
    return { ...this._state };
  }

  /** 获取炼器等级 */
  public getForgeLevel(): number {
    return this._state.forgeLevel;
  }

  // ==========================================================================
  // 锻造
  // ==========================================================================

  /** 获取所有配方 */
  public getAllRecipes(): ForgeRecipe[] {
    return FORGE_RECIPES;
  }

  /** 获取可锻造配方 */
  public getAvailableRecipes(playerRealmIndex: number): ForgeRecipe[] {
    return FORGE_RECIPES.filter(
      (r) => r.minRealmIndex <= playerRealmIndex
    );
  }

  /** 获取配方详情 */
  public getRecipe(recipeId: string): ForgeRecipe | null {
    return FORGE_RECIPES.find((r) => r.id === recipeId) ?? null;
  }

  /** 检查是否可以锻造 */
  public canForge(
    recipeId: string,
    playerRealmIndex: number,
    hasItemFn: (itemId: string, amount: number) => boolean
  ): { can: boolean; reason: string } {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { can: false, reason: '配方不存在' };
    }

    if (playerRealmIndex < recipe.minRealmIndex) {
      return {
        can: false,
        reason: `境界不足（需要${recipe.minRealmIndex}阶以上）`,
      };
    }

    for (const [itemId, amount] of Object.entries(recipe.materials)) {
      if (!hasItemFn(itemId, amount)) {
        const cfg = getItemConfig(itemId);
        return { can: false, reason: `${cfg?.name ?? itemId}不足` };
      }
    }

    return { can: true, reason: '' };
  }

  /**
   * 锻造装备
   * @param recipeId 配方ID
   * @param playerRealmIndex 玩家境界
   * @param hasItemFn 检查材料
   * @param removeItemFn 消耗材料
   */
  public forgeEquipment(
    recipeId: string,
    playerRealmIndex: number,
    hasItemFn: (itemId: string, amount: number) => boolean,
    removeItemFn: (itemId: string, amount: number) => boolean
  ): ForgeResult {
    const check = this.canForge(recipeId, playerRealmIndex, hasItemFn);
    if (!check.can) {
      return {
        success: false, quality: 'common',
        itemId: '', itemName: '', stats: {}, experienceGained: 0,
        message: check.reason,
      };
    }

    const recipe = this.getRecipe(recipeId)!;

    // 消耗材料
    for (const [itemId, amount] of Object.entries(recipe.materials)) {
      if (!removeItemFn(itemId, amount)) {
        return {
          success: false, quality: 'common',
          itemId: '', itemName: '', stats: {}, experienceGained: 0,
          message: '材料消耗失败',
        };
      }
    }

    // 计算成功率
    let successRate = 0.35 + this._state.forgeLevel * 0.04;
    successRate -= recipe.difficulty * 0.025;
    successRate = clamp(successRate, 0.10, 0.95);

    // 随机判定
    const roll = Math.random();
    if (roll >= successRate) {
      this._state.totalFailed++;
      return {
        success: false,
        quality: 'common',
        itemId: recipe.resultItemId,
        itemName: getItemConfig(recipe.resultItemId)?.name ?? recipe.resultItemId,
        stats: {},
        experienceGained: Math.floor(recipe.difficulty * 2),
        message: `锻造失败，材料损耗（成功率${(successRate * 100).toFixed(1)}%，判定${(roll * 100).toFixed(1)}%）`,
      };
    }

    // 计算品质
    const qualityRoll = Math.random();
    let quality: EquipmentQuality;
    // 炼器等级提升高品质概率
    const levelBonus = this._state.forgeLevel * 0.02;
    if (qualityRoll < 0.05 + levelBonus) quality = 'mythic';
    else if (qualityRoll < 0.15 + levelBonus) quality = 'legendary';
    else if (qualityRoll < 0.30 + levelBonus) quality = 'epic';
    else if (qualityRoll < 0.50 + levelBonus) quality = 'rare';
    else if (qualityRoll < 0.75) quality = 'uncommon';
    else quality = 'common';

    // 应用品质倍率
    const multiplier = QUALITY_MULTIPLIER[quality];
    const stats: EquipmentStats = {};
    for (const [key, value] of Object.entries(recipe.baseStats)) {
      (stats as Record<string, number>)[key] = Math.floor(
        value * multiplier
      );
    }

    // 经验
    const expGain = recipe.difficulty * 12;
    this._state.forgeExp += expGain;
    this._state.totalForged++;

    // 检查升级
    const expNeeded = this._state.forgeLevel * 120;
    let leveledUp = false;
    if (this._state.forgeExp >= expNeeded && this._state.forgeLevel < 20) {
      this._state.forgeExp -= expNeeded;
      this._state.forgeLevel++;
      leveledUp = true;
    }

    const itemCfg = getItemConfig(recipe.resultItemId);

    return {
      success: true,
      quality,
      itemId: recipe.resultItemId,
      itemName: itemCfg?.name ?? recipe.resultItemId,
      stats,
      experienceGained: expGain,
      message: `锻造成功！获得${QUALITY_NAMES[quality]}${itemCfg?.name ?? recipe.resultItemId}${leveledUp ? '，炼器等级提升！' : ''}`,
    };
  }

  // ==========================================================================
  // 装备/卸下
  // ==========================================================================

  /** 装备物品 */
  public equipItem(itemId: string, slot: EquipmentSlot): { success: boolean; message: string } {
    // 卸下旧装备
    const old = this._state.equipped[slot];

    this._state.equipped[slot] = {
      itemId,
      slot,
      enhanceLevel: 0,
      runes: [],
    };

    return {
      success: true,
      message: old
        ? `卸下${old.itemId}，装备${itemId}`
        : `装备${itemId}成功`,
    };
  }

  /** 卸下物品 */
  public unequipItem(slot: EquipmentSlot): { success: boolean; message: string } {
    const item = this._state.equipped[slot];
    if (!item) {
      return { success: false, message: '该槽位没有装备' };
    }

    delete this._state.equipped[slot];
    return { success: true, message: `卸下${item.itemId}成功` };
  }

  /** 获取当前装备 */
  public getEquipped(): Readonly<Partial<Record<EquipmentSlot, EquippedItem>>> {
    return { ...this._state.equipped };
  }

  /** 获取装备总属性加成 */
  public getEquipmentStats(): EquipmentStats {
    const total: EquipmentStats = {};
    const add = (key: keyof EquipmentStats, value: number) => {
      (total as Record<string, number>)[key] = ((total as Record<string, number>)[key] ?? 0) + value;
    };

    for (const [slot, equip] of Object.entries(this._state.equipped)) {
      if (!equip) continue;

      // 基础属性
      const recipe = FORGE_RECIPES.find((r) => r.resultItemId === equip.itemId);
      if (recipe) {
        for (const [key, val] of Object.entries(recipe.baseStats)) {
          add(key as keyof EquipmentStats, val as number);
        }
      }

      // 强化加成
      const enhanceBonus = getEnhanceBonus(slot as EquipmentSlot, equip.enhanceLevel);
      for (const [key, val] of Object.entries(enhanceBonus)) {
        add(key as keyof EquipmentStats, val as number);
      }

      // 符文加成
      for (const runeId of equip.runes) {
        const rune = RUNES.find((r) => r.id === runeId);
        if (rune) {
          for (const [key, val] of Object.entries(rune.effects)) {
            add(key as keyof EquipmentStats, val as number);
          }
        }
      }
    }

    return total;
  }

  // ==========================================================================
  // 装备强化
  // ==========================================================================

  /** 获取强化消耗 */
  public getEnhanceCost(slot: EquipmentSlot, currentLevel: number): { materials: Record<string, number>; lingshi: number } | null {
    const cost = ENHANCE_COSTS[currentLevel + 1];
    if (!cost) return null;
    return cost;
  }

  /** 检查是否可以强化 */
  public canEnhance(
    slot: EquipmentSlot,
    hasItemFn: (itemId: string, amount: number) => boolean,
    lingshi: number
  ): { can: boolean; reason: string } {
    const equip = this._state.equipped[slot];
    if (!equip) {
      return { can: false, reason: '该槽位没有装备' };
    }

    const cost = this.getEnhanceCost(slot, equip.enhanceLevel);
    if (!cost) {
      return { can: false, reason: '已达到最高强化等级' };
    }

    if (lingshi < cost.lingshi) {
      return { can: false, reason: `灵石不足（需要${cost.lingshi}）` };
    }

    for (const [itemId, amount] of Object.entries(cost.materials)) {
      if (!hasItemFn(itemId, amount)) {
        const cfg = getItemConfig(itemId);
        return { can: false, reason: `${cfg?.name ?? itemId}不足` };
      }
    }

    return { can: true, reason: '' };
  }

  /**
   * 强化装备
   * @param slot 装备槽位
   * @param lingshi 当前灵石
   * @param hasItemFn 检查材料
   * @param removeItemFn 消耗材料
   */
  public enhanceEquipment(
    slot: EquipmentSlot,
    lingshi: number,
    hasItemFn: (itemId: string, amount: number) => boolean,
    removeItemFn: (itemId: string, amount: number) => boolean
  ): EnhanceResult {
    const check = this.canEnhance(slot, hasItemFn, lingshi);
    if (!check.can) {
      return {
        success: false, itemId: '', oldLevel: 0, newLevel: 0,
        statBonus: {}, message: check.reason,
      };
    }

    const equip = this._state.equipped[slot]!;
    const cost = this.getEnhanceCost(slot, equip.enhanceLevel)!;

    // 消耗材料
    if (lingshi < cost.lingshi) {
      return {
        success: false, itemId: equip.itemId, oldLevel: equip.enhanceLevel,
        newLevel: equip.enhanceLevel, statBonus: {}, message: '灵石不足',
      };
    }

    for (const [itemId, amount] of Object.entries(cost.materials)) {
      if (!removeItemFn(itemId, amount)) {
        return {
          success: false, itemId: equip.itemId, oldLevel: equip.enhanceLevel,
          newLevel: equip.enhanceLevel, statBonus: {}, message: '材料消耗失败',
        };
      }
    }

    const oldLevel = equip.enhanceLevel;
    equip.enhanceLevel++;
    const bonus = getEnhanceBonus(slot, equip.enhanceLevel);

    return {
      success: true,
      itemId: equip.itemId,
      oldLevel,
      newLevel: equip.enhanceLevel,
      statBonus: bonus,
      message: `${equip.itemId}强化成功！等级 ${oldLevel} → ${equip.enhanceLevel}`,
    };
  }

  // ==========================================================================
  // 符文铭刻
  // ==========================================================================

  /** 获取可用符文 */
  public getAvailableRunes(): RuneDef[] {
    return RUNES;
  }

  /** 获取装备可铭刻的符文 */
  public getInscribableRunes(slot: EquipmentSlot): RuneDef[] {
    return RUNES.filter((r) => r.slot === slot);
  }

  /**
   * 铭刻符文
   * @param slot 装备槽位
   * @param runeId 符文ID
   * @param hasItemFn 检查材料
   * @param removeItemFn 消耗材料
   */
  public inscribeRune(
    slot: EquipmentSlot,
    runeId: string,
    hasItemFn: (itemId: string, amount: number) => boolean,
    removeItemFn: (itemId: string, amount: number) => boolean
  ): InscribeResult {
    const equip = this._state.equipped[slot];
    if (!equip) {
      return { success: false, itemId: '', runeId, message: '该槽位没有装备' };
    }

    const rune = RUNES.find((r) => r.id === runeId);
    if (!rune) {
      return { success: false, itemId: equip.itemId, runeId, message: '符文不存在' };
    }

    if (rune.slot !== slot) {
      return { success: false, itemId: equip.itemId, runeId, message: '符文与装备类型不匹配' };
    }

    // 检查是否已铭刻
    if (equip.runes.includes(runeId)) {
      return { success: false, itemId: equip.itemId, runeId, message: '该符文已铭刻' };
    }

    // 符文上限
    if (equip.runes.length >= 3) {
      return { success: false, itemId: equip.itemId, runeId, message: '该装备已铭刻3个符文，达到上限' };
    }

    // 消耗材料
    for (const [itemId, amount] of Object.entries(rune.materialCost)) {
      if (!hasItemFn(itemId, amount)) {
        const cfg = getItemConfig(itemId);
        return { success: false, itemId: equip.itemId, runeId, message: `${cfg?.name ?? itemId}不足` };
      }
    }

    for (const [itemId, amount] of Object.entries(rune.materialCost)) {
      if (!removeItemFn(itemId, amount)) {
        return { success: false, itemId: equip.itemId, runeId, message: '材料消耗失败' };
      }
    }

    equip.runes.push(runeId);

    return {
      success: true,
      itemId: equip.itemId,
      runeId,
      message: `铭刻「${rune.name}」成功！${rune.description}`,
      effects: rune.effects,
    };
  }

  // ==========================================================================
  // 材料融合
  // ==========================================================================

  /**
   * 融合材料（低品质→高品质）
   * @param materialIds 材料ID列表
   * @param hasItemFn 检查材料
   * @param removeItemFn 消耗材料
   */
  public fuseMaterials(
    materialIds: string[],
    hasItemFn: (itemId: string, amount: number) => boolean,
    removeItemFn: (itemId: string, amount: number) => boolean
  ): FuseResult {
    if (materialIds.length < 3) {
      return { success: false, resultItemId: '', resultName: '', amount: 0, message: '至少需要3个材料进行融合' };
    }

    // 检查是否同一种材料
    const first = materialIds[0];
    if (!materialIds.every((id) => id === first)) {
      return { success: false, resultItemId: '', resultName: '', amount: 0, message: '只能融合同种材料' };
    }

    // 检查材料数量
    if (!hasItemFn(first, materialIds.length)) {
      return { success: false, resultItemId: '', resultName: '', amount: 0, message: '材料数量不足' };
    }

    // 定义融合规则：3个低品质 → 1个高品质
    const fusionRules: Record<string, { result: string; ratio: number }> = {
      lingcao: { result: 'tiannian_lingyao', ratio: 5 },
      kuangmai: { result: 'longwen_heijin', ratio: 8 },
      xuantie: { result: 'huoxin_jin', ratio: 6 },
      huoxin_jin: { result: 'leiyin_shi', ratio: 4 },
      leiyin_shi: { result: 'hundun_yuanshi', ratio: 3 },
    };

    const rule = fusionRules[first];
    if (!rule) {
      return { success: false, resultItemId: '', resultName: '', amount: 0, message: '该材料不可融合' };
    }

    const needCount = rule.ratio;
    if (materialIds.length < needCount) {
      return {
        success: false, resultItemId: '', resultName: '', amount: 0,
        message: `融合${first}需要${needCount}个`,
      };
    }

    // 消耗材料
    if (!removeItemFn(first, needCount)) {
      return { success: false, resultItemId: '', resultName: '', amount: 0, message: '材料消耗失败' };
    }

    const resultCfg = getItemConfig(rule.result);

    return {
      success: true,
      resultItemId: rule.result,
      resultName: resultCfg?.name ?? rule.result,
      amount: 1,
      message: `融合成功！${needCount}个${getItemConfig(first)?.name ?? first} → 1个${resultCfg?.name ?? rule.result}`,
    };
  }
}
