/**
 * 《问道长生》Phaser 3 重构版 —— 炼丹系统
 * Phase 3C: 炼丹系统
 *
 * 核心玩法：温度控制小游戏。
 * - 温度在绿色区域时确认，成功率和品质最高
 * - 温度会随时间自然漂移
 * - 炼丹等级影响成功率和品质
 */

import { ITEMS, getItemConfig } from '../data/gameData';
import { clamp } from '../utils';

// ============================================================================
// 类型定义
// ============================================================================

/** 丹方定义 */
export interface Recipe {
  id: string;
  name: string;
  resultItemId: string;
  baseAmount: number;
  materials: Record<string, number>;
  difficulty: number; // 1-25
  minAlchemyLevel: number;
  description: string;
}

/** 炼丹游戏状态 */
export interface AlchemyGame {
  /** 目标温度 50-100 */
  targetHeat: number;
  /** 当前温度 */
  currentHeat: number;
  /** 温度漂移速度（每秒） */
  heatDrift: number;
  /** 漂移随机幅度 */
  driftVariance: number;
  /** 时间限制（秒） */
  timeLimit: number;
  /** 已用时间（秒） */
  elapsedTime: number;
  /** 当前配方 */
  recipe: Recipe;
  /** 绿色区域宽度（±范围） */
  greenZoneWidth: number;
  /** 黄色区域宽度（±范围） */
  yellowZoneWidth: number;
  /** 是否进行中 */
  active: boolean;
  /** 是否已经确认 */
  confirmed: boolean;
}

/** 成丹品质 */
export type PillQuality = 'waste' | 'low' | 'mid' | 'high' | 'perfect';

/** 炼丹结果 */
export interface AlchemyResult {
  success: boolean;
  quality: PillQuality;
  itemId: string;
  itemName: string;
  amount: number;
  experienceGained: number;
  message: string;
  /** 品质倍率（用于效果计算） */
  qualityMultiplier: number;
}

/** 炼丹系统状态 */
export interface AlchemySystemState {
  alchemyLevel: number;
  alchemyExp: number;
  totalPillsRefined: number;
  totalPillsFailed: number;
  currentGame: AlchemyGame | null;
}

// ============================================================================
// 丹方配置（16个，从聚气丹到渡劫丹）
// ============================================================================

export const ALCHEMY_RECIPES: Recipe[] = [
  {
    id: 'r_juqi',
    name: '聚气丹',
    resultItemId: 'juqi_dan',
    baseAmount: 1,
    materials: { lingcao: 3 },
    difficulty: 1,
    minAlchemyLevel: 0,
    description: '凝聚灵气，炼气圆满突破筑基必备',
  },
  {
    id: 'r_xiulian',
    name: '修炼丹',
    resultItemId: 'xiulian_dan',
    baseAmount: 1,
    materials: { lingcao: 5 },
    difficulty: 1,
    minAlchemyLevel: 0,
    description: '服用后获得500点修为',
  },
  {
    id: 'r_huixue',
    name: '回血丹',
    resultItemId: 'huixue_dan',
    baseAmount: 2,
    materials: { lingcao: 4 },
    difficulty: 1,
    minAlchemyLevel: 0,
    description: '战斗中恢复30%生命值',
  },
  {
    id: 'r_huti',
    name: '护体丹',
    resultItemId: 'huti_dan',
    baseAmount: 1,
    materials: { lingcao: 6, kuangmai: 2 },
    difficulty: 2,
    minAlchemyLevel: 1,
    description: '防御提升50%，持续1场战斗',
  },
  {
    id: 'r_qixue',
    name: '气血丹',
    resultItemId: 'xiulian_dan',
    baseAmount: 1,
    materials: { lingcao: 3, kuangmai: 1 },
    difficulty: 2,
    minAlchemyLevel: 1,
    description: '补充气血，获得300点修为',
  },
  {
    id: 'r_zhuji',
    name: '筑基丹',
    resultItemId: 'zhuji_dan',
    baseAmount: 1,
    materials: { lingcao: 10, tiannian_lingyao: 1 },
    difficulty: 3,
    minAlchemyLevel: 2,
    description: '奠定道基，筑基期修士梦寐以求的丹药',
  },
  {
    id: 'r_julingshi',
    name: '聚灵丹',
    resultItemId: 'julingshi_dan',
    baseAmount: 1,
    materials: { tiannian_lingyao: 3 },
    difficulty: 3,
    minAlchemyLevel: 2,
    description: '提升修炼速度30%，持续1小时',
  },
  {
    id: 'r_jiedu',
    name: '解毒丹',
    resultItemId: 'huixue_dan',
    baseAmount: 2,
    materials: { lingcao: 6, tiannian_lingyao: 1 },
    difficulty: 3,
    minAlchemyLevel: 2,
    description: '祛除毒素，恢复20%生命值',
  },
  {
    id: 'r_jiangchen',
    name: '降尘丹',
    resultItemId: 'jiangchen_dan',
    baseAmount: 1,
    materials: { tiannian_lingyao: 5, kuangmai: 3 },
    difficulty: 5,
    minAlchemyLevel: 3,
    description: '洗去凡尘，突破金丹必备',
  },
  {
    id: 'r_dingshen',
    name: '定神丹',
    resultItemId: 'dingshen_dan',
    baseAmount: 1,
    materials: { tiannian_lingyao: 10, longwen_heijin: 1 },
    difficulty: 8,
    minAlchemyLevel: 4,
    description: '稳固神魂，元婴突破之关键',
  },
  {
    id: 'r_butian',
    name: '补天丹',
    resultItemId: 'butian_dan',
    baseAmount: 1,
    materials: { longwen_heijin: 3, hundun_yuanshi: 1 },
    difficulty: 12,
    minAlchemyLevel: 5,
    description: '补全道痕，化神突破之圣药',
  },
  {
    id: 'r_lianxu',
    name: '炼虚丹',
    resultItemId: 'lianxu_dan',
    baseAmount: 1,
    materials: { tiannian_lingyao: 5, longwen_heijin: 2, hundun_yuanshi: 1 },
    difficulty: 14,
    minAlchemyLevel: 6,
    description: '炼虚期突破之珍奇丹药',
  },
  {
    id: 'r_heti',
    name: '合体丹',
    resultItemId: 'heti_dan',
    baseAmount: 1,
    materials: { tiannian_lingyao: 8, hundun_yuanshi: 2 },
    difficulty: 16,
    minAlchemyLevel: 7,
    description: '合体期突破之稀世丹药',
  },
  {
    id: 'r_feisheng',
    name: '飞升丹',
    resultItemId: 'feisheng_dan',
    baseAmount: 1,
    materials: { hundun_yuanshi: 3, longwen_heijin: 2 },
    difficulty: 18,
    minAlchemyLevel: 8,
    description: '大乘突破渡劫之无上丹药',
  },
  {
    id: 'r_yanghun',
    name: '养魂丹',
    resultItemId: 'xiulian_dan',
    baseAmount: 2,
    materials: { lingcao: 5, tiannian_lingyao: 2 },
    difficulty: 4,
    minAlchemyLevel: 3,
    description: '温养神魂，获得800点修为',
  },
  {
    id: 'r_dujie',
    name: '渡劫丹',
    resultItemId: 'dujie_dan',
    baseAmount: 1,
    materials: { hundun_yuanshi: 5, longwen_heijin: 3 },
    difficulty: 22,
    minAlchemyLevel: 9,
    description: '渡劫飞升真仙之唯一必需',
  },
];

/** 品质倍率（影响丹药效果） */
const QUALITY_MULTIPLIER: Record<PillQuality, number> = {
  waste: 0,
  low: 0.6,
  mid: 1.0,
  high: 1.3,
  perfect: 1.8,
};

/** 品质名称 */
const QUALITY_NAMES: Record<PillQuality, string> = {
  waste: '废丹',
  low: '下品',
  mid: '中品',
  high: '上品',
  perfect: '极品',
};

/** 品质颜色 */
const QUALITY_COLORS: Record<PillQuality, string> = {
  waste: '#808080',
  low: '#7ED957',
  mid: '#5BCEFA',
  high: '#C77DFF',
  perfect: '#FF9E00',
};

function createDefaultState(): AlchemySystemState {
  return {
    alchemyLevel: 0,
    alchemyExp: 0,
    totalPillsRefined: 0,
    totalPillsFailed: 0,
    currentGame: null,
  };
}

// ============================================================================
// 炼丹系统
// ============================================================================

export class AlchemySystem {
  private _state: AlchemySystemState;

  constructor(savedState?: Partial<AlchemySystemState>) {
    this._state = { ...createDefaultState(), ...savedState };
  }

  /** 序列化 */
  public serialize(): AlchemySystemState {
    return {
      alchemyLevel: this._state.alchemyLevel,
      alchemyExp: this._state.alchemyExp,
      totalPillsRefined: this._state.totalPillsRefined,
      totalPillsFailed: this._state.totalPillsFailed,
      currentGame: null, // 不序列化进行中的游戏
    };
  }

  /** 恢复 */
  public restore(state: Partial<AlchemySystemState>): void {
    this._state = { ...createDefaultState(), ...state, currentGame: null };
  }

  /** 获取状态 */
  public getState(): Readonly<AlchemySystemState> {
    return { ...this._state };
  }

  /** 获取炼丹等级 */
  public getAlchemyLevel(): number {
    return this._state.alchemyLevel;
  }

  /** 获取炼丹经验 */
  public getAlchemyExp(): number {
    return this._state.alchemyExp;
  }

  // ==========================================================================
  // 丹方查询
  // ==========================================================================

  /** 获取所有丹方 */
  public getAllRecipes(): Recipe[] {
    return ALCHEMY_RECIPES;
  }

  /** 获取当前可炼制的丹方（满足等级） */
  public getAvailableRecipes(): Recipe[] {
    return ALCHEMY_RECIPES.filter((r) => r.minAlchemyLevel <= this._state.alchemyLevel);
  }

  /** 获取丹方详情 */
  public getRecipe(recipeId: string): Recipe | null {
    return ALCHEMY_RECIPES.find((r) => r.id === recipeId) ?? null;
  }

  /** 检查是否有足够材料 */
  public canCraft(
    recipeId: string,
    hasItemFn: (itemId: string, amount: number) => boolean
  ): { can: boolean; reason: string } {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { can: false, reason: '丹方不存在' };
    }

    if (this._state.alchemyLevel < recipe.minAlchemyLevel) {
      return {
        can: false,
        reason: `炼丹等级不足（需要${recipe.minAlchemyLevel}级，当前${this._state.alchemyLevel}级）`,
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

  // ==========================================================================
  // 温度控制小游戏
  // ==========================================================================

  /**
   * 开始炼制丹药
   * @param recipeId 丹方ID
   * @param hasItemFn 检查材料是否足够的回调
   * @param removeItemFn 消耗材料的回调
   */
  public startAlchemy(
    recipeId: string,
    hasItemFn: (itemId: string, amount: number) => boolean,
    removeItemFn: (itemId: string, amount: number) => boolean
  ): { success: boolean; game?: AlchemyGame; message: string } {
    // 检查是否已有进行中的炼制
    if (this._state.currentGame?.active && !this._state.currentGame.confirmed) {
      return { success: false, message: '当前有炼制进行中' };
    }

    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      return { success: false, message: '丹方不存在' };
    }

    const check = this.canCraft(recipeId, hasItemFn);
    if (!check.can) {
      return { success: false, message: check.reason };
    }

    // 消耗材料
    for (const [itemId, amount] of Object.entries(recipe.materials)) {
      if (!removeItemFn(itemId, amount)) {
        return { success: false, message: '材料消耗失败' };
      }
    }

    // 初始化温度游戏
    // 目标温度随机 50-100
    const targetHeat = Math.floor(Math.random() * 41) + 50; // 50-90，留有余地

    // 绿色区域宽度：难度越高越窄
    const greenZoneWidth = Math.max(5, 20 - recipe.difficulty);

    // 黄色区域宽度：比绿色区域宽
    const yellowZoneWidth = greenZoneWidth + 10;

    // 时间限制：8 + difficulty * 2 秒
    const timeLimit = 8 + recipe.difficulty * 2;

    // 漂移速度：难度越高漂移越快
    const heatDrift = 1 + recipe.difficulty * 0.3;
    const driftVariance = 2 + recipe.difficulty * 0.2;

    const game: AlchemyGame = {
      targetHeat,
      currentHeat: 50, // 初始温度居中
      heatDrift,
      driftVariance,
      timeLimit,
      elapsedTime: 0,
      recipe,
      greenZoneWidth,
      yellowZoneWidth,
      active: true,
      confirmed: false,
    };

    this._state.currentGame = game;

    return {
      success: true,
      game,
      message: `开始炼制${recipe.name}，请控制温度在绿色区域！`,
    };
  }

  /**
   * 更新温度（每帧调用）
   * @param deltaTime 秒
   * @returns 如果超时自动完成，返回结果；否则返回 null
   */
  public updateHeat(deltaTime: number): AlchemyResult | null {
    const game = this._state.currentGame;
    if (!game || !game.active || game.confirmed) return null;

    game.elapsedTime += deltaTime;

    // 温度自然漂移：随机方向 + 难度相关幅度
    const drift = (Math.random() - 0.5) * 2 * game.heatDrift * deltaTime
                + (Math.random() - 0.5) * game.driftVariance * deltaTime;
    game.currentHeat = clamp(game.currentHeat + drift, 0, 100);

    // 超时自动确认
    if (game.elapsedTime >= game.timeLimit) {
      return this.confirmAlchemy();
    }

    return null;
  }

  /** 获取当前温度游戏状态 */
  public getCurrentGame(): Readonly<AlchemyGame> | null {
    return this._state.currentGame ? { ...this._state.currentGame } : null;
  }

  /** 获取当前温度区域类型 */
  public getHeatZone(): 'green' | 'yellow' | 'red' {
    const game = this._state.currentGame;
    if (!game) return 'red';

    const diff = Math.abs(game.currentHeat - game.targetHeat);
    if (diff <= game.greenZoneWidth) return 'green';
    if (diff <= game.yellowZoneWidth) return 'yellow';
    return 'red';
  }

  /**
   * 调整火候
   * @param direction 'up' 升温 / 'down' 降温
   * @param amount 调整幅度，默认 5
   */
  public adjustHeat(direction: 'up' | 'down', amount: number = 5): void {
    const game = this._state.currentGame;
    if (!game || !game.active || game.confirmed) return;

    const delta = direction === 'up' ? amount : -amount;
    game.currentHeat = clamp(game.currentHeat + delta, 0, 100);
  }

  // ==========================================================================
  // 确认炼制
  // ==========================================================================

  /**
   * 确认炼制，计算结果
   * 在绿色区域确认成功率最高
   */
  public confirmAlchemy(): AlchemyResult {
    const game = this._state.currentGame;
    if (!game || !game.active) {
      return {
        success: false,
        quality: 'waste',
        itemId: '',
        itemName: '',
        amount: 0,
        experienceGained: 0,
        message: '没有进行中的炼制',
        qualityMultiplier: 0,
      };
    }

    if (game.confirmed) {
      return {
        success: false,
        quality: 'waste',
        itemId: '',
        itemName: '',
        amount: 0,
        experienceGained: 0,
        message: '已确认过',
        qualityMultiplier: 0,
      };
    }

    game.confirmed = true;
    game.active = false;

    const recipe = game.recipe;
    const diff = Math.abs(game.currentHeat - game.targetHeat);
    const zone = this.getHeatZone();

    // 计算成功率
    const baseRate = 0.30 + this._state.alchemyLevel * 0.05;
    let zoneBonus = 0;
    switch (zone) {
      case 'green':
        zoneBonus = 0.30;
        break;
      case 'yellow':
        zoneBonus = 0.15;
        break;
      case 'red':
        zoneBonus = 0;
        break;
    }
    const difficultyPenalty = recipe.difficulty * 0.025;
    const successRate = clamp(baseRate + zoneBonus - difficultyPenalty, 0.05, 0.95);

    // 随机判定
    const roll = Math.random();
    const success = roll < successRate;

    if (!success) {
      this._state.totalPillsFailed++;
      // 失败时部分返还材料（50%概率返还一种材料的一半）
      this._state.currentGame = null;
      return {
        success: false,
        quality: 'waste',
        itemId: recipe.resultItemId,
        itemName: getItemConfig(recipe.resultItemId)?.name ?? recipe.resultItemId,
        amount: 0,
        experienceGained: Math.floor(recipe.difficulty * 2),
        message: `炼制失败，丹药化为废丹（成功率${(successRate * 100).toFixed(1)}%，判定${(roll * 100).toFixed(1)}%）`,
        qualityMultiplier: 0,
      };
    }

    // 计算品质
    let quality: PillQuality;
    if (diff <= 3) {
      quality = 'perfect';
    } else if (diff <= game.greenZoneWidth) {
      quality = 'high';
    } else if (diff <= game.yellowZoneWidth) {
      quality = 'mid';
    } else {
      quality = 'low';
    }

    // 计算数量
    let amount = recipe.baseAmount;
    if (quality === 'perfect') amount += 1;
    if (quality === 'low') amount = Math.max(1, amount - 1);

    // 经验
    const expGain = recipe.difficulty * 10;
    this._state.alchemyExp += expGain;
    this._state.totalPillsRefined++;

    // 检查升级
    const expNeeded = this._state.alchemyLevel * 100;
    let leveledUp = false;
    if (this._state.alchemyExp >= expNeeded && this._state.alchemyLevel < 20) {
      this._state.alchemyExp -= expNeeded;
      this._state.alchemyLevel++;
      leveledUp = true;
    }

    this._state.currentGame = null;

    const itemCfg = getItemConfig(recipe.resultItemId);
    const qualityName = QUALITY_NAMES[quality];

    return {
      success: true,
      quality,
      itemId: recipe.resultItemId,
      itemName: itemCfg?.name ?? recipe.resultItemId,
      amount,
      experienceGained: expGain,
      message: `炼制成功！获得${qualityName}${itemCfg?.name ?? recipe.resultItemId} ×${amount}${leveledUp ? '，炼丹等级提升！' : ''}`,
      qualityMultiplier: QUALITY_MULTIPLIER[quality],
    };
  }

  // ==========================================================================
  // 成功率和品质预览
  // ==========================================================================

  /**
   * 预览当前温度下的成功率和可能品质
   */
  public previewResult(): {
    successRate: number;
    possibleQuality: PillQuality;
    zone: 'green' | 'yellow' | 'red';
  } {
    const game = this._state.currentGame;
    if (!game || !game.active) {
      return { successRate: 0, possibleQuality: 'waste', zone: 'red' };
    }

    const recipe = game.recipe;
    const diff = Math.abs(game.currentHeat - game.targetHeat);
    const zone = this.getHeatZone();

    const baseRate = 0.30 + this._state.alchemyLevel * 0.05;
    let zoneBonus = 0;
    switch (zone) {
      case 'green':
        zoneBonus = 0.30;
        break;
      case 'yellow':
        zoneBonus = 0.15;
        break;
      case 'red':
        zoneBonus = 0;
        break;
    }
    const successRate = clamp(baseRate + zoneBonus - recipe.difficulty * 0.025, 0.05, 0.95);

    let possibleQuality: PillQuality;
    if (diff <= 3) possibleQuality = 'perfect';
    else if (diff <= game.greenZoneWidth) possibleQuality = 'high';
    else if (diff <= game.yellowZoneWidth) possibleQuality = 'mid';
    else possibleQuality = 'low';

    return { successRate, possibleQuality, zone };
  }

  // ==========================================================================
  // 计算成功率（通用公式）
  // ==========================================================================

  /**
   * 计算指定丹方在指定温度准确度下的成功率
   * @param recipeId 丹方ID
   * @param heatAccuracy 温度准确度 0-1（1为完美）
   */
  public calculateSuccessRate(recipeId: string, heatAccuracy: number): number {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return 0;

    const baseRate = 0.30 + this._state.alchemyLevel * 0.05;
    const zoneBonus = heatAccuracy * 0.30; // 最高+30%
    const difficultyPenalty = recipe.difficulty * 0.025;

    return clamp(baseRate + zoneBonus - difficultyPenalty, 0.05, 0.95);
  }
}
