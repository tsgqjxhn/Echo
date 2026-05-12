/**
 * 《问道长生》Phaser 3 重构版 —— 门派系统
 * Phase 3C: 门派系统 + 悟道系统 + 炼丹/炼器系统
 *
 * 负责门派加入、职位晋升、俸禄、任务、商店等全部宗门相关逻辑。
 * 状态由 GameStateManager 托管，本类只负责规则计算与结果生成。
 */

import type { Item, SectMembership, PlayerData } from '../types';
import { SECTS, getSectConfig, ITEMS } from '../data/gameData';
import { EventBus, GameEventType } from '../managers/EventBus';
import { clamp, generateId } from '../utils';

// ============================================================================
// 类型定义
// ============================================================================

/** 门派任务类型 */
export type SectTaskType = 'daily' | 'contribution' | 'special';

/** 门派任务定义 */
export interface SectTaskDef {
  id: string;
  name: string;
  type: SectTaskType;
  description: string;
  requiredPosition: number;
  requiredRealmIndex: number;
  contributionReward: number;
  actionCost: number;
  materialCost?: Record<string, number>;
  rewards: { itemId: string; amount: number }[];
  lingshiReward: number;
}

/** 门派商店物品定义 */
export interface SectShopItemDef {
  id: string;
  name: string;
  itemId: string;
  amount: number;
  cost: number;
  requiredPosition: number;
  stock: number;
  description: string;
}

/** 完整职位定义（7级通用体系） */
export interface SectPositionDef {
  index: number;
  id: string;
  name: string;
  requiredRep: number;
  requiredRealmIndex: number;
  salaryLingshi: number;
  salaryItems: { itemId: string; amount: number }[];
  benefits: string[];
}

/** 门派系统内部状态 */
export interface SectSystemState {
  /** 门派成员信息 */
  membership: SectMembership | null;
  /** 活跃任务ID列表 */
  activeTasks: string[];
  /** 已完成日常任务ID列表 */
  completedDailyTasks: string[];
  /** 任务冷却（贡献/特殊任务） */
  missionCooldowns: Record<string, number>;
  /** 今日俸禄是否已领取 */
  salaryClaimed: boolean;
  /** 上次离开门派时间（游戏内年份） */
  lastLeaveYear: number;
  /** 每日刷新计数 */
  dailyRefreshCount: number;
  /** 商店库存 */
  shopStock: Record<string, number>;
}

/** 加入门派结果 */
export interface SectJoinResult {
  success: boolean;
  message: string;
  sectName?: string;
  positionName?: string;
}

/** 职位晋升结果 */
export interface PromotionResult {
  success: boolean;
  message: string;
  oldPosition?: string;
  newPosition?: string;
  newBenefits?: string[];
}

/** 俸禄结果 */
export interface SalaryResult {
  success: boolean;
  message: string;
  lingshi?: number;
  items?: { itemId: string; name: string; amount: number }[];
}

/** 任务奖励 */
export interface TaskReward {
  success: boolean;
  message: string;
  contributionGained?: number;
  items?: { itemId: string; name: string; amount: number }[];
  lingshi?: number;
}

/** 商店购买结果 */
export interface ShopResult {
  success: boolean;
  message: string;
  item?: { itemId: string; name: string; amount: number };
  cost?: number;
}

/** 离开门派结果 */
export interface LeaveResult {
  success: boolean;
  message: string;
  cooldownYears?: number;
}

/** 宗门加成 */
export interface SectBonus {
  cultivationSpeed: number;
  attackBonus: number;
  defenseBonus: number;
  shopDiscount: number;
}

// ============================================================================
// 静态配置
// ============================================================================

/** 通用7级职位体系 */
export const SECT_POSITIONS: SectPositionDef[] = [
  {
    index: 0, id: 'outer_disciple', name: '外门弟子',
    requiredRep: 0, requiredRealmIndex: 0,
    salaryLingshi: 10, salaryItems: [],
    benefits: ['基础功法借阅', '外门修炼室'],
  },
  {
    index: 1, id: 'inner_disciple', name: '内门弟子',
    requiredRep: 500, requiredRealmIndex: 1,
    salaryLingshi: 50, salaryItems: [{ itemId: 'xiulian_dan', amount: 2 }],
    benefits: ['进阶功法', '内门剑池/药园'],
  },
  {
    index: 2, id: 'core_disciple', name: '真传弟子',
    requiredRep: 2000, requiredRealmIndex: 2,
    salaryLingshi: 200, salaryItems: [{ itemId: 'xiulian_dan', amount: 5 }],
    benefits: ['核心神通', '秘境资格'],
  },
  {
    index: 3, id: 'deacon', name: '执事',
    requiredRep: 8000, requiredRealmIndex: 3,
    salaryLingshi: 500, salaryItems: [{ itemId: 'huixue_dan', amount: 3 }, { itemId: 'huti_dan', amount: 2 }],
    benefits: ['任务发布权', '2%贡献提成'],
  },
  {
    index: 4, id: 'elder', name: '长老',
    requiredRep: 20000, requiredRealmIndex: 4,
    salaryLingshi: 1500, salaryItems: [{ itemId: 'tiannian_lingyao', amount: 3 }],
    benefits: ['门派决策权', '5%贡献提成'],
  },
  {
    index: 5, id: 'grand_elder', name: '大长老',
    requiredRep: 50000, requiredRealmIndex: 5,
    salaryLingshi: 4000, salaryItems: [{ itemId: 'longwen_heijin', amount: 1 }],
    benefits: ['核心决策层', '8%贡献提成'],
  },
  {
    index: 6, id: 'sect_master', name: '掌门',
    requiredRep: 100000, requiredRealmIndex: 7,
    salaryLingshi: 10000, salaryItems: [{ itemId: 'hundun_yuanshi', amount: 1 }],
    benefits: ['一宗之主', '12%贡献提成', '发布宗门公告'],
  },
];

/** 门派任务池 */
export const SECT_TASKS: SectTaskDef[] = [
  // ---- 日常任务（每日刷新3个） ----
  {
    id: 'st_sweep', name: '打扫山门', type: 'daily',
    description: '清晨打扫宗门山门，维持宗门整洁',
    requiredPosition: 0, requiredRealmIndex: 0,
    contributionReward: 10, actionCost: 1,
    rewards: [{ itemId: 'lingcao', amount: 2 }], lingshiReward: 20,
  },
  {
    id: 'st_water', name: '浇灌灵植', type: 'daily',
    description: '为灵植园浇灌灵泉水',
    requiredPosition: 0, requiredRealmIndex: 0,
    contributionReward: 15, actionCost: 1,
    rewards: [{ itemId: 'lingcao', amount: 3 }], lingshiReward: 30,
  },
  {
    id: 'st_patrol', name: '巡逻外山', type: 'daily',
    description: '巡逻外山区域，驱逐入侵妖兽',
    requiredPosition: 1, requiredRealmIndex: 0,
    contributionReward: 20, actionCost: 1,
    rewards: [], lingshiReward: 50,
  },
  {
    id: 'st_meditate', name: '宗门打坐', type: 'daily',
    description: '在宗门聚灵阵中打坐修炼',
    requiredPosition: 1, requiredRealmIndex: 1,
    contributionReward: 25, actionCost: 1,
    rewards: [{ itemId: 'xiulian_dan', amount: 1 }], lingshiReward: 40,
  },
  {
    id: 'st_teach', name: '指点新人', type: 'daily',
    description: '为外门弟子指点修炼疑惑',
    requiredPosition: 2, requiredRealmIndex: 2,
    contributionReward: 30, actionCost: 1,
    rewards: [{ itemId: 'xiulian_dan', amount: 2 }], lingshiReward: 60,
  },

  // ---- 贡献任务（不限次数但有材料成本） ----
  {
    id: 'st_herbs', name: '采集灵草', type: 'contribution',
    description: '前往灵草谷采集指定灵草上交宗门',
    requiredPosition: 1, requiredRealmIndex: 0,
    contributionReward: 30, actionCost: 2,
    rewards: [{ itemId: 'lingcao', amount: 5 }], lingshiReward: 80,
  },
  {
    id: 'st_mine', name: '开采灵矿', type: 'contribution',
    description: '深入矿脉开采灵石矿上交宗门',
    requiredPosition: 1, requiredRealmIndex: 1,
    contributionReward: 40, actionCost: 2,
    rewards: [{ itemId: 'kuangmai', amount: 2 }], lingshiReward: 120,
  },
  {
    id: 'st_pills', name: '炼丹供奉', type: 'contribution',
    description: '炼制指定丹药上交宗门',
    requiredPosition: 2, requiredRealmIndex: 2,
    contributionReward: 60, actionCost: 2,
    materialCost: { xiulian_dan: 3 },
    rewards: [{ itemId: 'lingcao', amount: 5 }], lingshiReward: 200,
  },
  {
    id: 'st_hunt', name: '猎杀妖兽', type: 'contribution',
    description: '前往指定区域猎杀危害宗门的妖兽',
    requiredPosition: 2, requiredRealmIndex: 2,
    contributionReward: 50, actionCost: 3,
    rewards: [{ itemId: 'tiannian_lingyao', amount: 1 }], lingshiReward: 150,
  },
  {
    id: 'st_guard', name: '镇守山门', type: 'contribution',
    description: '镇守宗门要隘，抵御外敌入侵',
    requiredPosition: 2, requiredRealmIndex: 3,
    contributionReward: 80, actionCost: 3,
    rewards: [{ itemId: 'lingcao', amount: 8 }], lingshiReward: 300,
  },

  // ---- 特殊任务（每日刷新1个，高难度高回报） ----
  {
    id: 'st_explore', name: '探查秘境', type: 'special',
    description: '探查宗门新发现的秘境入口',
    requiredPosition: 3, requiredRealmIndex: 3,
    contributionReward: 150, actionCost: 5,
    rewards: [{ itemId: 'tiannian_lingyao', amount: 3 }], lingshiReward: 800,
  },
  {
    id: 'st_diplomacy', name: '出使他宗', type: 'special',
    description: '代表宗门出访友好宗门',
    requiredPosition: 3, requiredRealmIndex: 3,
    contributionReward: 120, actionCost: 4,
    rewards: [{ itemId: 'longwen_heijin', amount: 1 }], lingshiReward: 600,
  },
  {
    id: 'st_teach_advanced', name: '传道授业', type: 'special',
    description: '为内门弟子授课讲道',
    requiredPosition: 4, requiredRealmIndex: 4,
    contributionReward: 200, actionCost: 4,
    rewards: [{ itemId: 'tiannian_lingyao', amount: 5 }], lingshiReward: 1000,
  },
  {
    id: 'st_demon', name: '镇压魔潮', type: 'special',
    description: '魔气暴动，需长老级修士前往镇压',
    requiredPosition: 4, requiredRealmIndex: 5,
    contributionReward: 350, actionCost: 6,
    rewards: [{ itemId: 'longwen_heijin', amount: 2 }, { itemId: 'hundun_yuanshi', amount: 1 }], lingshiReward: 3000,
  },
  {
    id: 'st_war', name: '宗门大战', type: 'special',
    description: '宗门间爆发大战，需全力出击',
    requiredPosition: 5, requiredRealmIndex: 6,
    contributionReward: 600, actionCost: 8,
    rewards: [{ itemId: 'hundun_yuanshi', amount: 2 }, { itemId: 'longwen_heijin', amount: 3 }], lingshiReward: 8000,
  },
];

/** 门派商店商品 */
export const SECT_SHOP_ITEMS: SectShopItemDef[] = [
  { id: 'ss_xiulian', name: '修炼丹x5', itemId: 'xiulian_dan', amount: 5, cost: 50, requiredPosition: 0, stock: 99, description: '服用后获得500点修为' },
  { id: 'ss_lingcao', name: '灵草x10', itemId: 'lingcao', amount: 10, cost: 30, requiredPosition: 0, stock: 99, description: '炼丹基础材料' },
  { id: 'ss_huixue', name: '回血丹x3', itemId: 'huixue_dan', amount: 3, cost: 60, requiredPosition: 1, stock: 50, description: '战斗中恢复30%生命值' },
  { id: 'ss_huti', name: '护体丹x2', itemId: 'huti_dan', amount: 2, cost: 100, requiredPosition: 1, stock: 50, description: '防御提升50%，持续1场战斗' },
  { id: 'ss_juqi', name: '聚气丹x1', itemId: 'juqi_dan', amount: 1, cost: 150, requiredPosition: 2, stock: 20, description: '炼气圆满突破筑基必备' },
  { id: 'ss_zhuji', name: '筑基丹x1', itemId: 'zhuji_dan', amount: 1, cost: 400, requiredPosition: 2, stock: 10, description: '筑基期修士梦寐以求的丹药' },
  { id: 'ss_tianling', name: '千年灵药x3', itemId: 'tiannian_lingyao', amount: 3, cost: 300, requiredPosition: 2, stock: 30, description: '炼制中级丹药之珍品' },
  { id: 'ss_jiangchen', name: '降尘丹x1', itemId: 'jiangchen_dan', amount: 1, cost: 1200, requiredPosition: 3, stock: 5, description: '突破金丹必备' },
  { id: 'ss_heijin', name: '龙纹黑金x1', itemId: 'longwen_heijin', amount: 1, cost: 2000, requiredPosition: 4, stock: 3, description: '打造本命法宝之稀世材料' },
  { id: 'ss_dingshen', name: '定神丹x1', itemId: 'dingshen_dan', amount: 1, cost: 5000, requiredPosition: 4, stock: 2, description: '稳固神魂，元婴突破之关键' },
  { id: 'ss_hundun', name: '混沌原石x1', itemId: 'hundun_yuanshi', amount: 1, cost: 15000, requiredPosition: 6, stock: 1, description: '提升法宝品质上限之神物' },
  { id: 'ss_butian', name: '补天丹x1', itemId: 'butian_dan', amount: 1, cost: 30000, requiredPosition: 6, stock: 1, description: '补全道痕，化神突破之圣药' },
];

/** 离开门派冷却（游戏内年数） */
const SECT_LEAVE_COOLDOWN_YEARS = 10;

/** 默认状态 */
function createDefaultState(): SectSystemState {
  return {
    membership: null,
    activeTasks: [],
    completedDailyTasks: [],
    missionCooldowns: {},
    salaryClaimed: false,
    lastLeaveYear: 0,
    dailyRefreshCount: 0,
    shopStock: {},
  };
}

// ============================================================================
// 门派系统
// ============================================================================

export class SectSystem {
  private _state: SectSystemState;
  private _eventBus: EventBus;

  constructor(savedState?: Partial<SectSystemState>) {
    this._state = { ...createDefaultState(), ...savedState };
    this._eventBus = EventBus.getInstance();
    this._initShopStock();
  }

  /** 序列化状态 */
  public serialize(): SectSystemState {
    return {
      membership: this._state.membership,
      activeTasks: [...this._state.activeTasks],
      completedDailyTasks: [...this._state.completedDailyTasks],
      missionCooldowns: { ...this._state.missionCooldowns },
      salaryClaimed: this._state.salaryClaimed,
      lastLeaveYear: this._state.lastLeaveYear,
      dailyRefreshCount: this._state.dailyRefreshCount,
      shopStock: { ...this._state.shopStock },
    };
  }

  /** 恢复状态 */
  public restore(state: Partial<SectSystemState>): void {
    this._state = { ...createDefaultState(), ...state };
    this._initShopStock();
  }

  /** 获取当前状态快照 */
  public getState(): Readonly<SectSystemState> {
    return { ...this._state };
  }

  /** 是否已加入门派 */
  public get hasSect(): boolean {
    return this._state.membership !== null;
  }

  /** 获取当前门派ID */
  public get currentSectId(): string | null {
    return this._state.membership?.sectId ?? null;
  }

  /** 获取当前职位索引 */
  public get currentPositionIndex(): number {
    return this._state.membership?.positionId
      ? SECT_POSITIONS.findIndex((p) => p.id === this._state.membership!.positionId)
      : -1;
  }

  // ==========================================================================
  // 门派信息查询
  // ==========================================================================

  /** 获取所有可选门派 */
  public getAvailableSects(): typeof SECTS {
    return SECTS;
  }

  /** 获取当前门派配置 */
  public getCurrentSect() {
    if (!this._state.membership) return null;
    return getSectConfig(this._state.membership.sectId) ?? null;
  }

  /** 获取当前职位定义 */
  public getCurrentPosition(): SectPositionDef | null {
    const idx = this.currentPositionIndex;
    if (idx < 0) return null;
    return SECT_POSITIONS[idx] ?? null;
  }

  /** 获取门派加成 */
  public getSectBonus(): SectBonus {
    const sect = this.getCurrentSect();
    if (!sect) {
      return { cultivationSpeed: 0, attackBonus: 0, defenseBonus: 0, shopDiscount: 1.0 };
    }

    const pos = this.getCurrentPosition();
    const posBonus = pos ? pos.index * 0.01 : 0;

    // 根据门派五行计算战斗加成
    let attackBonus = 0;
    let defenseBonus = 0;
    switch (sect.element) {
      case 'metal':
        attackBonus = 0.05 + posBonus;
        break;
      case 'wood':
        defenseBonus = 0.03;
        break;
      case 'water':
        attackBonus = 0.02;
        defenseBonus = 0.02;
        break;
      case 'fire':
        attackBonus = 0.08;
        break;
      case 'earth':
        defenseBonus = 0.06 + posBonus;
        break;
    }

    return {
      cultivationSpeed: sect.cultivationBonus + posBonus,
      attackBonus,
      defenseBonus,
      shopDiscount: sect.shopDiscount,
    };
  }

  // ==========================================================================
  // 加入/离开门派
  // ==========================================================================

  /**
   * 加入门派
   * @param sectId 门派ID
   * @param playerRealmIndex 玩家当前境界索引
   * @param currentYear 当前游戏年份
   */
  public joinSect(sectId: string, playerRealmIndex: number, currentYear: number): SectJoinResult {
    const sect = getSectConfig(sectId);
    if (!sect) {
      return { success: false, message: '该门派不存在' };
    }

    if (this._state.membership) {
      return { success: false, message: '已加入门派，需先离开当前门派' };
    }

    // 检查冷却
    const cooldown = this.getLeaveCooldown(currentYear);
    if (cooldown > 0) {
      return { success: false, message: `离开门派冷却中，还需${cooldown}年` };
    }

    // 检查境界
    if (playerRealmIndex < sect.minRealmIndex) {
      return { success: false, message: `境界不足，需达到${sect.minRealmIndex}阶以上` };
    }

    // 设置成员信息
    this._state.membership = {
      sectId,
      positionId: SECT_POSITIONS[0].id,
      reputation: 0,
      joinedYear: currentYear,
    };

    this._state.activeTasks = [];
    this._state.completedDailyTasks = [];
    this._state.salaryClaimed = false;

    // Phase 8: 加入宗门触发消息 + 声望初始化
    this._eventBus.emit(GameEventType.MESSAGE_RECEIVED, {
      messageId: `msg_${Date.now()}_sect_join`,
      sender: sect.name,
      title: `欢迎加入${sect.name}`,
      content: `欢迎加入${sect.name}！请努力修炼，为宗门争光。当前身份：${SECT_POSITIONS[0].name}`,
      type: 'sect',
    });

    return {
      success: true,
      message: `成功加入${sect.name}，当前身份：${SECT_POSITIONS[0].name}`,
      sectName: sect.name,
      positionName: SECT_POSITIONS[0].name,
    };
  }

  /**
   * 离开门派
   * @param currentYear 当前游戏年份
   */
  public leaveSect(currentYear: number): LeaveResult {
    if (!this._state.membership) {
      return { success: false, message: '当前未加入任何门派' };
    }

    const sectName = this.getCurrentSect()?.name ?? '门派';
    this._state.membership = null;
    this._state.activeTasks = [];
    this._state.completedDailyTasks = [];
    this._state.salaryClaimed = false;
    this._state.lastLeaveYear = currentYear;
    this._state.missionCooldowns = {};

    return {
      success: true,
      message: `已离开${sectName}，${SECT_LEAVE_COOLDOWN_YEARS}年内无法加入新门派`,
      cooldownYears: SECT_LEAVE_COOLDOWN_YEARS,
    };
  }

  /** 获取离开冷却剩余年数 */
  public getLeaveCooldown(currentYear: number): number {
    const elapsed = currentYear - this._state.lastLeaveYear;
    return Math.max(0, SECT_LEAVE_COOLDOWN_YEARS - elapsed);
  }

  // ==========================================================================
  // 职位晋升
  // ==========================================================================

  /**
   * 检查是否可以晋升
   * @param playerRealmIndex 玩家境界索引
   */
  public canPromote(playerRealmIndex: number): { can: boolean; reason: string } {
    if (!this._state.membership) {
      return { can: false, reason: '未加入门派' };
    }

    const currentIdx = this.currentPositionIndex;
    if (currentIdx >= SECT_POSITIONS.length - 1) {
      return { can: false, reason: '已是最高职位' };
    }

    const nextPos = SECT_POSITIONS[currentIdx + 1];
    const rep = this._state.membership.reputation;

    if (rep < nextPos.requiredRep) {
      return { can: false, reason: `声望不足，需要${nextPos.requiredRep}（当前${rep}）` };
    }

    if (playerRealmIndex < nextPos.requiredRealmIndex) {
      return { can: false, reason: `境界不足，需要${nextPos.requiredRealmIndex}阶以上` };
    }

    return { can: true, reason: '' };
  }

  /**
   * 职位晋升
   * @param playerRealmIndex 玩家境界索引
   */
  public promotePosition(playerRealmIndex: number): PromotionResult {
    const check = this.canPromote(playerRealmIndex);
    if (!check.can) {
      return { success: false, message: check.reason };
    }

    const currentIdx = this.currentPositionIndex;
    const oldPos = SECT_POSITIONS[currentIdx];
    const newPos = SECT_POSITIONS[currentIdx + 1];

    this._state.membership!.positionId = newPos.id;

    // Phase 8: 晋升触发消息
    this._eventBus.emit(GameEventType.MESSAGE_RECEIVED, {
      messageId: `msg_${Date.now()}_sect_promote`,
      sender: '宗门执事',
      title: `晋升 —— ${newPos.name}`,
      content: `恭喜晋升为${newPos.name}！享受更多宗门福利。`,
      type: 'sect',
    });

    return {
      success: true,
      message: `恭喜晋升为${newPos.name}！`,
      oldPosition: oldPos.name,
      newPosition: newPos.name,
      newBenefits: newPos.benefits,
    };
  }

  // ==========================================================================
  // 俸禄
  // ==========================================================================

  /**
   * 领取俸禄
   * @param inventory 当前背包（用于添加物品）
   * @param addItemFn 添加物品的回调函数
   */
  public claimSalary(
    addItemFn: (itemId: string, amount: number) => void
  ): SalaryResult {
    if (!this._state.membership) {
      return { success: false, message: '未加入门派，无俸禄可领' };
    }

    if (this._state.salaryClaimed) {
      return { success: false, message: '今日俸禄已领取' };
    }

    const pos = this.getCurrentPosition();
    if (!pos) {
      return { success: false, message: '职位信息异常' };
    }

    const items: { itemId: string; name: string; amount: number }[] = [];

    for (const si of pos.salaryItems) {
      const cfg = ITEMS[si.itemId];
      if (cfg) {
        addItemFn(si.itemId, si.amount);
        items.push({ itemId: si.itemId, name: cfg.name, amount: si.amount });
      }
    }

    this._state.salaryClaimed = true;

    return {
      success: true,
      message: `领取${pos.name}俸禄成功`,
      lingshi: pos.salaryLingshi,
      items,
    };
  }

  // ==========================================================================
  // 任务系统
  // ==========================================================================

  /**
   * 获取可用任务列表
   * @param currentYear 当前年份
   * @param currentMonth 当前月份
   */
  public getAvailableTasks(currentYear: number, currentMonth: number): SectTaskDef[] {
    if (!this._state.membership) return [];

    const posIdx = this.currentPositionIndex;

    return SECT_TASKS.filter((task) => {
      // 职位要求
      if (task.requiredPosition > posIdx) return false;

      // 日常任务：检查是否已完成
      if (task.type === 'daily') {
        return !this._state.completedDailyTasks.includes(task.id);
      }

      // 贡献/特殊任务：检查冷却
      const key = `${task.id}_${currentYear}_${currentMonth}`;
      const cd = this._state.missionCooldowns[key];
      if (cd && cd > 0) return false;

      return true;
    });
  }

  /**
   * 接取任务
   * @param taskId 任务ID
   * @param currentYear 当前年份
   * @param currentMonth 当前月份
   * @param hasItemFn 检查是否拥有物品的回调
   */
  public acceptTask(
    taskId: string,
    currentYear: number,
    currentMonth: number,
    hasItemFn: (itemId: string, amount: number) => boolean
  ): { success: boolean; message: string } {
    if (!this._state.membership) {
      return { success: false, message: '未加入门派' };
    }

    const task = SECT_TASKS.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    // 检查是否已接取
    if (this._state.activeTasks.includes(taskId)) {
      return { success: false, message: '该任务已接取' };
    }

    // 检查职位
    const posIdx = this.currentPositionIndex;
    if (task.requiredPosition > posIdx) {
      return { success: false, message: '职位不足，无法接取该任务' };
    }

    // 检查材料
    if (task.materialCost) {
      for (const [itemId, amount] of Object.entries(task.materialCost)) {
        if (!hasItemFn(itemId, amount)) {
          const cfg = ITEMS[itemId];
          return { success: false, message: `${cfg?.name ?? itemId}不足` };
        }
      }
    }

    // 接取任务
    this._state.activeTasks.push(taskId);

    return { success: true, message: `接取任务「${task.name}」成功` };
  }

  /**
   * 完成任务
   * @param taskId 任务ID
   * @param removeItemFn 消耗物品的回调
   * @param addItemFn 添加物品的回调
   * @param currentYear 当前年份
   * @param currentMonth 当前月份
   */
  public completeTask(
    taskId: string,
    removeItemFn: (itemId: string, amount: number) => boolean,
    addItemFn: (itemId: string, amount: number) => void,
    currentYear: number,
    currentMonth: number
  ): TaskReward {
    if (!this._state.membership) {
      return { success: false, message: '未加入门派' };
    }

    const taskIdx = this._state.activeTasks.indexOf(taskId);
    if (taskIdx === -1) {
      return { success: false, message: '未接取该任务' };
    }

    const task = SECT_TASKS.find((t) => t.id === taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    // 消耗材料
    if (task.materialCost) {
      for (const [itemId, amount] of Object.entries(task.materialCost)) {
        if (!removeItemFn(itemId, amount)) {
          return { success: false, message: `${ITEMS[itemId]?.name ?? itemId}不足` };
        }
      }
    }

    // 移除活跃任务
    this._state.activeTasks.splice(taskIdx, 1);

    // 增加声望
    this._state.membership.reputation += task.contributionReward;
    this._state.membership.reputation = Math.max(0, this._state.membership.reputation);

    // 发放奖励
    const items: { itemId: string; name: string; amount: number }[] = [];
    for (const r of task.rewards) {
      const cfg = ITEMS[r.itemId];
      if (cfg) {
        addItemFn(r.itemId, r.amount);
        items.push({ itemId: r.itemId, name: cfg.name, amount: r.amount });
      }
    }

    // 记录完成
    if (task.type === 'daily') {
      this._state.completedDailyTasks.push(taskId);
    } else {
      const key = `${task.id}_${currentYear}_${currentMonth}`;
      this._state.missionCooldowns[key] = task.type === 'special' ? 3 : 1;
    }

    // Phase 8: 完成任务触发消息 + 声望变化
    this._eventBus.emit(GameEventType.MESSAGE_RECEIVED, {
      messageId: `msg_${Date.now()}_sect_task`,
      sender: '宗门任务',
      title: `任务完成 —— ${task.name}`,
      content: `完成「${task.name}」，获得${task.contributionReward}贡献度${task.lingshiReward > 0 ? `、${task.lingshiReward}灵石` : ''}。`,
      type: 'sect',
    });

    // 触发外部声望变化（宗门声望）
    const sect = this.getCurrentSect();
    if (sect) {
      this._eventBus.emit(GameEventType.REPUTATION_CHANGED, {
        factionId: sect.id,
        factionName: sect.name,
        oldValue: this._state.membership!.reputation - task.contributionReward,
        newValue: this._state.membership!.reputation,
        level: 'neutral',
      });
    }

    return {
      success: true,
      message: `完成「${task.name}」，获得${task.contributionReward}贡献度`,
      contributionGained: task.contributionReward,
      items,
      lingshi: task.lingshiReward,
    };
  }

  // ==========================================================================
  // 宗门商店
  // ==========================================================================

  /**
   * 获取可购买的商店物品
   */
  public getAvailableShopItems(): SectShopItemDef[] {
    if (!this._state.membership) return [];

    const posIdx = this.currentPositionIndex;
    const sect = this.getCurrentSect();
    const discount = sect?.shopDiscount ?? 1.0;

    return SECT_SHOP_ITEMS.filter((item) => {
      if (item.requiredPosition > posIdx) return false;
      const stock = this._state.shopStock[item.id] ?? 0;
      return stock > 0;
    }).map((item) => ({
      ...item,
      cost: Math.ceil(item.cost * discount),
    }));
  }

  /**
   * 购买商店物品
   * @param itemId 商店物品ID
   * @param reputation 当前贡献度
   * @param addItemFn 添加物品回调
   */
  public buyFromShop(
    itemId: string,
    reputation: number,
    addItemFn: (itemId: string, amount: number) => void
  ): ShopResult {
    if (!this._state.membership) {
      return { success: false, message: '未加入门派' };
    }

    const shopItem = SECT_SHOP_ITEMS.find((s) => s.id === itemId);
    if (!shopItem) {
      return { success: false, message: '商品不存在' };
    }

    const posIdx = this.currentPositionIndex;
    if (shopItem.requiredPosition > posIdx) {
      return { success: false, message: '职位不足，无法购买该商品' };
    }

    const sect = this.getCurrentSect();
    const discount = sect?.shopDiscount ?? 1.0;
    const finalCost = Math.ceil(shopItem.cost * discount);

    if (reputation < finalCost) {
      return { success: false, message: `贡献度不足（需要${finalCost}，当前${reputation}）` };
    }

    const stock = this._state.shopStock[itemId] ?? 0;
    if (stock <= 0) {
      return { success: false, message: '该商品已售罄' };
    }

    // 扣除贡献度
    this._state.membership.reputation -= finalCost;
    this._state.membership.reputation = Math.max(0, this._state.membership.reputation);

    // 扣除库存
    this._state.shopStock[itemId] = stock - 1;

    // 发放物品
    addItemFn(shopItem.itemId, shopItem.amount);

    const cfg = ITEMS[shopItem.itemId];

    return {
      success: true,
      message: `购买${shopItem.name}成功`,
      item: { itemId: shopItem.itemId, name: cfg?.name ?? shopItem.itemId, amount: shopItem.amount },
      cost: finalCost,
    };
  }

  // ==========================================================================
  // 每日刷新
  // ==========================================================================

  /**
   * 每日刷新任务和商店
   * @param currentYear 当前年份
   * @param currentMonth 当前月份
   */
  public refreshDaily(currentYear: number, currentMonth: number): void {
    this._state.completedDailyTasks = [];
    this._state.salaryClaimed = false;

    // 减少任务冷却
    for (const key of Object.keys(this._state.missionCooldowns)) {
      this._state.missionCooldowns[key]--;
      if (this._state.missionCooldowns[key] <= 0) {
        delete this._state.missionCooldowns[key];
      }
    }

    // 刷新商店库存
    this._initShopStock();

    this._state.dailyRefreshCount++;
  }

  // ==========================================================================
  // 声望操作
  // ==========================================================================

  /** 增加声望 */
  public addReputation(amount: number): void {
    if (this._state.membership) {
      this._state.membership.reputation += amount;
      this._state.membership.reputation = Math.max(0, this._state.membership.reputation);
    }
  }

  /** 获取当前声望 */
  public getReputation(): number {
    return this._state.membership?.reputation ?? 0;
  }

  // ==========================================================================
  // 内部方法
  // ==========================================================================

  /** 初始化商店库存 */
  private _initShopStock(): void {
    for (const item of SECT_SHOP_ITEMS) {
      if (this._state.shopStock[item.id] === undefined) {
        this._state.shopStock[item.id] = item.stock;
      }
    }
  }
}
