/**
 * 《问道长生》Phaser 3 重构版 —— 探索系统
 * Phase 3C: 探索系统
 *
 * 负责区域探索、节点推进、事件处理。
 * - 6个区域，每个区域多层节点
 * - 节点类型：战斗(35%)、采集(20%)、奇遇(45%)
 * - 奇遇事件：受伤修士、灵泉、门派试炼、妖兽拦路、隐秘洞府等
 * - 消耗行动力
 */

import { REGIONS, getRegionConfig, getEnemyConfig, ITEMS } from '../data/gameData';
import { EventBus, GameEventType } from '../managers/EventBus';
import { clamp, randomInt } from '../utils';

// ============================================================================
// 类型定义
// ============================================================================

/** 节点类型 */
export type ExplorationNodeType = 'combat' | 'gather' | 'encounter';

/** 探索状态 */
export interface ExplorationState {
  active: boolean;
  regionId: string | null;
  regionName: string;
  currentNode: number;
  totalNodes: number;
  completedNodes: ExploredNode[];
  currentEvent: ExplorationEvent | null;
  actionCost: number;
}

/** 已探索节点记录 */
export interface ExploredNode {
  nodeIndex: number;
  type: ExplorationNodeType;
  result: string;
  loot?: Record<string, number>;
  enemyId?: string;
  eventId?: string;
}

/** 探索事件 */
export interface ExplorationEvent {
  id: string;
  name: string;
  description: string;
  choices: EventChoice[];
}

/** 事件选项 */
export interface EventChoice {
  index: number;
  text: string;
  description: string;
  effects: EventEffect;
  condition?: (player: { realmIndex: number; stats: { hp: number; maxHp: number } }) => boolean;
}

/** 事件效果 */
export interface EventEffect {
  /** 获得物品 */
  items?: Record<string, number>;
  /** 获得修为 */
  cultivation?: number;
  /** 获得灵石 */
  lingshi?: number;
  /** 触发战斗的敌人ID */
  combatEnemyId?: string;
  /** 受伤（百分比） */
  damagePercent?: number;
  /** 触发秘境探索 */
  caveExplore?: boolean;
}

/** 探索结果 */
export interface ExplorationResult {
  success: boolean;
  message: string;
  state?: ExplorationState;
  costActionPoints: number;
}

/** 节点事件结果 */
export interface NodeEvent {
  type: ExplorationNodeType;
  nodeIndex: number;
  description: string;
  enemyId?: string;
  loot?: Record<string, number>;
  event?: ExplorationEvent;
  /** 如果是最终节点 */
  isBoss?: boolean;
  /** 战斗类型，用于 BattlePrepScene */
  battleType?: 'normal' | 'boss';
}

/** 事件选择结果 */
export interface EventResult {
  success: boolean;
  message: string;
  effects: EventEffect;
  combatEnemyId?: string;
  caveExplore?: boolean;
  loot?: Record<string, number>;
}

/** 探索系统状态 */
export interface ExplorationSystemState {
  exploration: ExplorationState;
  totalExplorations: number;
  totalNodesExplored: number;
  totalEncounters: number;
  totalCombats: number;
  totalGathers: number;
}

// ============================================================================
// 奇遇事件配置
// ============================================================================

export const EXPLORATION_EVENTS: ExplorationEvent[] = [
  {
    id: 'e_wounded_cultivator',
    name: '受伤的修士',
    description: '你发现一位重伤倒地的修士，气息奄奄。他身上散发着微弱的灵力波动……',
    choices: [
      {
        index: 0, text: '施以援手',
        description: '为伤者输送灵力，获得回报',
        effects: { items: { xiulian_dan: 2 }, lingshi: 100 },
      },
      {
        index: 1, text: '搜刮财物',
        description: '趁人之危掠夺储物袋',
        effects: { items: { lingcao: 5 }, lingshi: 200, damagePercent: 0.05 },
      },
      {
        index: 2, text: '默默离去',
        description: '不干涉，继续前行',
        effects: {},
      },
    ],
  },
  {
    id: 'e_spirit_spring',
    name: '灵泉',
    description: '一处灵气充沛的泉眼出现在眼前，泉水清澈透亮，灵气氤氲。',
    choices: [
      {
        index: 0, text: '原地修炼',
        description: '在灵泉旁修炼，获得修为',
        effects: { cultivation: 500 },
      },
      {
        index: 1, text: '收集泉水',
        description: '收集灵泉水，获得材料',
        effects: { items: { lingcao: 5, tiannian_lingyao: 1 } },
      },
    ],
  },
  {
    id: 'e_sect_trial',
    name: '门派试炼',
    description: '你遇到了一位门派长老，他提出要考验你的修为。',
    choices: [
      {
        index: 0, text: '接受考验',
        description: '接受长老的考验',
        effects: { combatEnemyId: 'spirit_rabbit', items: { xiulian_dan: 3 } },
        condition: (p) => p.realmIndex >= 0,
      },
      {
        index: 1, text: '婉言谢绝',
        description: '恭敬地谢过长老，继续前行',
        effects: {},
      },
    ],
  },
  {
    id: 'e_demonic_beast',
    name: '妖兽拦路',
    description: '一头凶猛的妖兽挡住了去路，散发着令人窒息的妖气！',
    choices: [
      {
        index: 0, text: '正面战斗',
        description: '与妖兽正面交锋',
        effects: { combatEnemyId: 'wild_wolf' },
      },
      {
        index: 1, text: '绕路而行',
        description: '选择避开妖兽，消耗了一些体力',
        effects: { damagePercent: 0.03 },
      },
    ],
  },
  {
    id: 'e_hidden_cave',
    name: '隐秘洞府',
    description: '你发现了一处隐蔽的洞府入口，里面隐约有光芒闪烁。',
    choices: [
      {
        index: 0, text: '进入探索',
        description: '进入洞府探索',
        effects: { caveExplore: true },
      },
      {
        index: 1, text: '标记位置后离开',
        description: '在地图上标记了这个位置，日后再来探索',
        effects: {},
      },
    ],
  },
  {
    id: 'e_trader',
    name: '神秘商贩',
    description: '一个蒙面商贩出现在你面前，他的摊位上摆满了奇珍异宝。',
    choices: [
      {
        index: 0, text: '购买丹药（500灵石）',
        description: '购买商贩的丹药',
        effects: { lingshi: -500, items: { xiulian_dan: 3 } },
        condition: () => true,
      },
      {
        index: 1, text: '购买材料（300灵石）',
        description: '购买一些材料',
        effects: { lingshi: -300, items: { lingcao: 10 } },
      },
      {
        index: 2, text: '离开',
        description: '没有找到心仪之物',
        effects: {},
      },
    ],
  },
  {
    id: 'e_heavenly_tribulation',
    name: '天机异象',
    description: '天空中突然出现异象，一道金光降落在你面前，蕴含着不可思议的力量。',
    choices: [
      {
        index: 0, text: '吸收金光',
        description: '强行吸收天降金光',
        effects: { cultivation: 2000, damagePercent: 0.05 },
      },
      {
        index: 1, text: '谨慎观察',
        description: '仔细观察后发现这是一次罕见的天机眷顾',
        effects: { cultivation: 500 },
      },
    ],
  },
  {
    id: 'e_demonic_cultivator',
    name: '魔修来袭',
    description: '一名浑身散发黑气的魔修拦住了你的去路，"交出你的储物袋！"',
    choices: [
      {
        index: 0, text: '迎头痛击',
        description: '与魔修战斗',
        effects: { combatEnemyId: 'red_fox' },
      },
      {
        index: 1, text: '交出灵石脱身',
        description: '丢出一袋灵石，趁魔修捡拾时逃走',
        effects: { lingshi: -200 },
      },
    ],
  },
  {
    id: 'e_ancient_tomb',
    name: '古修洞府',
    description: '你偶然发现了一处上古修士的坐化之地，残存的禁制若隐若现。',
    choices: [
      {
        index: 0, text: '强行破阵',
        description: '强行突破禁制',
        effects: { caveExplore: true, damagePercent: 0.10 },
      },
      {
        index: 1, text: '小心解阵',
        description: '花费时间小心翼翼地解除禁制',
        effects: { items: { longwen_heijin: 1, tiannian_lingyao: 3 } },
      },
    ],
  },
  {
    id: 'e_lost_child',
    name: '迷路童子',
    description: '一个看上去只有七八岁的童子独自在山林中哭泣，说是找不到回家的路了。',
    choices: [
      {
        index: 0, text: '护送回家',
        description: '你护送童子回到附近的村庄，他的父母赠予你谢礼',
        effects: { items: { xiulian_dan: 2, huixue_dan: 2 }, lingshi: 150 },
      },
      {
        index: 1, text: '教导功法',
        description: '你教了童子几句口诀，他开心地蹦蹦跳跳离开了',
        effects: { cultivation: 300 },
      },
      {
        index: 2, text: '不予理会',
        description: '在这凶险之地，一个童子单独出现本就蹊跷',
        effects: {},
      },
    ],
  },
  {
    id: 'e_sword_grave',
    name: '剑冢遗迹',
    description: '一片荒芜的山谷中插满了断剑残刃，其中一把散发着微弱的剑意。',
    choices: [
      {
        index: 0, text: '感悟剑意',
        description: '你闭目感悟，剑意入体',
        effects: { cultivation: 800 },
      },
      {
        index: 1, text: '拔取残剑',
        description: '你尝试拔出那把尚有灵气的残剑',
        effects: { items: { xuantie: 5 }, damagePercent: 0.05 },
      },
      {
        index: 2, text: '恭敬退离',
        description: '你向剑冢行了一礼，默默退离',
        effects: { cultivation: 200 },
      },
    ],
  },
];

function createDefaultState(): ExplorationSystemState {
  return {
    exploration: {
      active: false,
      regionId: null,
      regionName: '',
      currentNode: 0,
      totalNodes: 0,
      completedNodes: [],
      currentEvent: null,
      actionCost: 0,
    },
    totalExplorations: 0,
    totalNodesExplored: 0,
    totalEncounters: 0,
    totalCombats: 0,
    totalGathers: 0,
  };
}

// ============================================================================
// 探索系统
// ============================================================================

export class ExplorationSystem {
  private _state: ExplorationSystemState;
  private _eventBus: EventBus;

  constructor(savedState?: Partial<ExplorationSystemState>) {
    this._state = { ...createDefaultState(), ...savedState };
    this._eventBus = EventBus.getInstance();
  }

  /** 序列化 */
  public serialize(): ExplorationSystemState {
    return {
      exploration: { ...this._state.exploration },
      totalExplorations: this._state.totalExplorations,
      totalNodesExplored: this._state.totalNodesExplored,
      totalEncounters: this._state.totalEncounters,
      totalCombats: this._state.totalCombats,
      totalGathers: this._state.totalGathers,
    };
  }

  /** 恢复 */
  public restore(state: Partial<ExplorationSystemState>): void {
    this._state = { ...createDefaultState(), ...state };
  }

  /** 获取当前状态 */
  public getState(): Readonly<ExplorationSystemState> {
    return { ...this._state };
  }

  /** 获取探索状态 */
  public getExplorationState(): Readonly<ExplorationState> {
    return { ...this._state.exploration };
  }

  // ==========================================================================
  // 开始探索
  // ==========================================================================

  /**
   * 开始探索区域
   * @param regionId 区域ID
   * @param playerRealmIndex 玩家境界索引
   * @param actionPoints 当前行动力
   */
  public exploreRegion(
    regionId: string,
    playerRealmIndex: number,
    actionPoints: number
  ): ExplorationResult {
    const region = getRegionConfig(regionId);
    if (!region) {
      return { success: false, message: '区域不存在', costActionPoints: 0 };
    }

    // 检查是否已在探索中
    if (this._state.exploration.active) {
      return { success: false, message: '当前已有探索进行中', costActionPoints: 0 };
    }

    // 检查境界要求
    if (playerRealmIndex < region.recommendedRealm) {
      return {
        success: false,
        message: `境界不足，推荐${region.recommendedRealm}阶以上（当前${playerRealmIndex}阶）`,
        costActionPoints: 0,
      };
    }

    // 计算节点数：5-15 随机
    const totalNodes = randomInt(5, 15);
    const actionCost = Math.max(1, Math.floor(totalNodes * 0.5));

    if (actionPoints < actionCost) {
      return {
        success: false,
        message: `行动力不足（需要${actionCost}，当前${actionPoints}）`,
        costActionPoints: 0,
      };
    }

    this._state.exploration = {
      active: true,
      regionId,
      regionName: region.name,
      currentNode: 0,
      totalNodes,
      completedNodes: [],
      currentEvent: null,
      actionCost,
    };

    this._state.totalExplorations++;

    // Phase 8: 首次探索该区域时解锁图鉴
    const regionCodexId = `region_${regionId}`;
    this._eventBus.emit(GameEventType.CODEX_UNLOCKED, {
      codexId: regionCodexId,
      codexName: region.name,
      category: '地点',
    });

    return {
      success: true,
      message: `开始探索${region.name}，共${totalNodes}个节点，消耗${actionCost}行动力`,
      state: { ...this._state.exploration },
      costActionPoints: actionCost,
    };
  }

  // ==========================================================================
  // 推进节点
  // ==========================================================================

  /**
   * 推进到下一个节点
   * @returns 节点事件，如果探索完成返回 null
   */
  public advanceNode(): NodeEvent | null {
    if (!this._state.exploration.active) return null;

    // 如果有未处理的事件，先返回
    if (this._state.exploration.currentEvent) {
      return null;
    }

    this._state.exploration.currentNode++;
    const nodeIndex = this._state.exploration.currentNode;
    const total = this._state.exploration.totalNodes;
    const regionId = this._state.exploration.regionId!;
    const region = getRegionConfig(regionId)!;

    // 检查是否完成
    if (nodeIndex > total) {
      this._finishExploration();
      return null;
    }

    // Boss 节点（最后一个节点）
    if (nodeIndex === total) {
      const bossEnemies = ['stone_demon', 'puppet_guard', 'abyss_spider', 'chaos_behemoth'];
      const enemyId = bossEnemies[clamp(region.recommendedRealm, 0, bossEnemies.length - 1)];
      this._state.totalCombats++;
      this._state.totalNodesExplored++;

      return {
        type: 'combat',
        nodeIndex,
        description: `遭遇${region.name}守护兽！`,
        enemyId,
        isBoss: true,
        battleType: 'boss',
      };
    }

    // 确定节点类型（基于区域配置的概率）
    const [combatProb, gatherProb] = region.nodeDistribution;
    const roll = Math.random();

    let type: ExplorationNodeType;
    if (roll < combatProb) {
      type = 'combat';
    } else if (roll < combatProb + gatherProb) {
      type = 'gather';
    } else {
      type = 'encounter';
    }

    return this._generateNodeEvent(type, nodeIndex, region);
  }

  /** 生成节点事件 */
  private _generateNodeEvent(
    type: ExplorationNodeType,
    nodeIndex: number,
    region: ReturnType<typeof getRegionConfig>
  ): NodeEvent {
    if (!region) throw new Error('Region not found');

    switch (type) {
      case 'combat': {
        this._state.totalCombats++;
        this._state.totalNodesExplored++;

        // 根据区域获取敌人
        const enemyPool = ['spirit_rabbit', 'wild_wolf', 'poison_snake', 'red_fox'];
        const enemyId = enemyPool[randomInt(0, enemyPool.length - 1)];

        return {
          type: 'combat',
          nodeIndex,
          description: `遭遇${getEnemyConfig(enemyId)?.name ?? '妖兽'}！`,
          enemyId,
          battleType: 'normal',
        };
      }

      case 'gather': {
        this._state.totalGathers++;
        this._state.totalNodesExplored++;

        // 采集获得材料
        const loot: Record<string, number> = {};
        for (const itemId of region.availableItems) {
          if (Math.random() < 0.4) {
            loot[itemId] = randomInt(1, 3);
          }
        }

        // 小概率获得天材地宝
        if (Math.random() < 0.08) {
          const treasures = ['ht_qi_grass', 'ht_zhu_essence', 'ht_jin_flame'];
          const t = treasures[randomInt(0, treasures.length - 1)];
          loot[t] = 1;
        }

        return {
          type: 'gather',
          nodeIndex,
          description: `在${region.name}采集到了一些材料`,
          loot,
        };
      }

      case 'encounter': {
        this._state.totalEncounters++;

        const event = this._selectRandomEvent();
        this._state.exploration.currentEvent = event;

        // Phase 8: 遇到新事件时触发消息通知
        this._eventBus.emit(GameEventType.MESSAGE_RECEIVED, {
          messageId: `msg_${Date.now()}_explore`,
          sender: '探索见闻',
          title: `发现：${event.name}`,
          content: event.description,
          type: 'event',
        });

        return {
          type: 'encounter',
          nodeIndex,
          description: event.description,
          event,
        };
      }
    }
  }

  /** 随机选择事件 */
  private _selectRandomEvent(): ExplorationEvent {
    const idx = randomInt(0, EXPLORATION_EVENTS.length - 1);
    const evt = EXPLORATION_EVENTS[idx];
    return { ...evt, choices: [...evt.choices] };
  }

  // ==========================================================================
  // 事件处理
  // ==========================================================================

  /**
   * 处理事件选择
   * @param choiceIndex 选项索引
   * @param playerInfo 玩家信息（用于条件判断）
   */
  public makeChoice(
    choiceIndex: number,
    playerInfo: { realmIndex: number; stats: { hp: number; maxHp: number }; lingshi: number }
  ): EventResult {
    const event = this._state.exploration.currentEvent;
    if (!event) {
      return { success: false, message: '当前没有奇遇事件', effects: {} };
    }

    const choice = event.choices.find((c) => c.index === choiceIndex);
    if (!choice) {
      return { success: false, message: '无效的选择', effects: {} };
    }

    // 检查条件
    if (choice.condition && !choice.condition(playerInfo)) {
      return { success: false, message: '不满足选择条件', effects: {} };
    }

    // 检查灵石消耗
    if (choice.effects.lingshi && choice.effects.lingshi < 0) {
      if (playerInfo.lingshi < Math.abs(choice.effects.lingshi)) {
        return { success: false, message: '灵石不足', effects: {} };
      }
    }

    const effects = { ...choice.effects };

    // 清理负值灵石为正值（消耗）
    if (effects.lingshi && effects.lingshi < 0) {
      effects.lingshi = Math.abs(effects.lingshi);
    }

    // 计算受伤
    if (effects.damagePercent) {
      const damage = Math.floor(playerInfo.stats.maxHp * effects.damagePercent);
      effects.damagePercent = damage; // 转为具体伤害值
    }

    // 处理秘境探索
    if (effects.caveExplore) {
      // 生成秘境奖励
      const caveLoot: Record<string, number> = {};
      if (Math.random() < 0.5) caveLoot.tiannian_lingyao = randomInt(1, 3);
      if (Math.random() < 0.3) caveLoot.kuangmai = randomInt(1, 3);
      if (Math.random() < 0.15) caveLoot.longwen_heijin = 1;
      effects.items = { ...(effects.items ?? {}), ...caveLoot };
    }

    // 记录节点完成
    this._state.exploration.completedNodes.push({
      nodeIndex: this._state.exploration.currentNode,
      type: 'encounter',
      result: choice.text,
      loot: effects.items,
      eventId: event.id,
    });
    this._state.totalNodesExplored++;

    // 清除当前事件
    this._state.exploration.currentEvent = null;

    return {
      success: true,
      message: `${choice.description}`,
      effects,
      combatEnemyId: effects.combatEnemyId,
      caveExplore: effects.caveExplore,
      loot: effects.items,
    };
  }

  /** 处理战斗节点完成 */
  public completeCombatNode(victory: boolean, loot?: Record<string, number>): void {
    if (!this._state.exploration.active) return;

    this._state.exploration.completedNodes.push({
      nodeIndex: this._state.exploration.currentNode,
      type: 'combat',
      result: victory ? '战斗胜利' : '战斗失败',
      loot,
    });
  }

  /** 处理采集节点完成 */
  public completeGatherNode(loot: Record<string, number>): void {
    if (!this._state.exploration.active) return;

    this._state.exploration.completedNodes.push({
      nodeIndex: this._state.exploration.currentNode,
      type: 'gather',
      result: '采集完成',
      loot,
    });
  }

  // ==========================================================================
  // 完成探索
  // ==========================================================================

  /** 完成探索 */
  private _finishExploration(): void {
    this._state.exploration.active = false;
    this._state.exploration.currentEvent = null;
  }

  /** 主动撤退 */
  public retreat(): { success: boolean; message: string } {
    if (!this._state.exploration.active) {
      return { success: false, message: '当前没有探索' };
    }

    this._finishExploration();
    return { success: true, message: '已从探索区域撤退' };
  }

  // ==========================================================================
  // 区域查询
  // ==========================================================================

  /** 获取所有区域 */
  public getAllRegions(): typeof REGIONS {
    return REGIONS;
  }

  /** 获取已解锁区域 */
  public getUnlockedRegions(unlockedRegionIds: string[]): typeof REGIONS {
    return REGIONS.filter((r) => unlockedRegionIds.includes(r.id));
  }

  /** 获取区域信息 */
  public getRegionInfo(regionId: string) {
    return getRegionConfig(regionId);
  }

  /** 获取探索统计 */
  public getStats(): {
    totalExplorations: number;
    totalNodesExplored: number;
    totalEncounters: number;
    totalCombats: number;
    totalGathers: number;
  } {
    return {
      totalExplorations: this._state.totalExplorations,
      totalNodesExplored: this._state.totalNodesExplored,
      totalEncounters: this._state.totalEncounters,
      totalCombats: this._state.totalCombats,
      totalGathers: this._state.totalGathers,
    };
  }
}
