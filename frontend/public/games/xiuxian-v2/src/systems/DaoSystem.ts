/**
 * 《问道长生》Phaser 3 重构版 —— 悟道系统
 * Phase 3C: 悟道系统
 *
 * 负责五行大道、衍生大道的节点激活/升级，悟道点管理，
 * 大道组合效果计算，突破加成等核心玩法逻辑。
 */

import { DAO_PATHS, getDaoPathConfig, REALMS, getRealmIndex } from '../data/gameData';
import { clamp } from '../utils';

// ============================================================================
// 类型定义
// ============================================================================

/** 玩家激活的单个节点状态 */
export interface ActivatedDaoNode {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
}

/** 玩家的大道进度 */
export interface PlayerDaoProgress {
  /** 已激活的节点：key = daoId_nodeId */
  activatedNodes: Record<string, ActivatedDaoNode>;
  /** 悟道点总量 */
  totalPoints: number;
  /** 已消耗悟道点 */
  spentPoints: number;
  /** 悟道点上限 */
  pointsCap: number;
  /** 上次重置时间戳 */
  lastResetTime: number;
}

/** 节点激活结果 */
export interface NodeActivationResult {
  success: boolean;
  message: string;
  nodeId?: string;
  newLevel?: number;
  cost?: number;
}

/** 节点升级结果 */
export interface NodeUpgradeResult {
  success: boolean;
  message: string;
  nodeId?: string;
  oldLevel?: number;
  newLevel?: number;
  cost?: number;
}

/** 重置结果 */
export interface ResetResult {
  success: boolean;
  message: string;
  refundedPoints?: number;
  cooldownDays?: number;
}

/** 组合效果 */
export interface ComboEffect {
  id: string;
  name: string;
  description: string;
  active: boolean;
  effects: Record<string, number>;
}

/** 悟道系统状态 */
export interface DaoSystemState {
  progress: PlayerDaoProgress;
}

// ============================================================================
// 常量与工具
// ============================================================================

/** 五行元素顺序，用于相生/相克判断 */
const ELEMENT_CYCLE: string[] = ['metal', 'wood', 'water', 'fire', 'earth'];

/** 五行相生关系：key 生 value */
const GENERATING_CYCLE: Record<string, string> = {
  metal: 'water',
  water: 'wood',
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
};

/** 五行相克关系：key 克 value */
const OVERCOMING_CYCLE: Record<string, string> = {
  metal: 'wood',
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
};

/** 斐波那契数列用于悟道点消耗：1,2,3,5,8,13,21... */
function fibonacci(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return b;
}

/** 计算节点升级到目标等级所需的总悟道点 */
function calculateNodeUpgradeCost(currentLevel: number, targetLevel: number): number {
  let cost = 0;
  for (let lv = currentLevel + 1; lv <= targetLevel; lv++) {
    cost += fibonacci(lv);
  }
  return cost;
}

/** 获取某条大道的总等级（模块级工具函数） */
function calcDaoTotalLevel(activated: Record<string, ActivatedDaoNode>, daoId: string): number {
  let total = 0;
  const dao = getDaoPathConfig(daoId);
  if (!dao) return 0;
  for (const node of dao.nodes) {
    const key = `${daoId}_${node.id}`;
    total += activated[key]?.level ?? 0;
  }
  return total;
}

/** 各境界对应的悟道点上限（模块级工具函数） */
function calcPointsCapByRealm(realmIndex: number): number {
  const caps = [10, 20, 40, 80, 120, 160, 200, 250, 320];
  return caps[clamp(realmIndex, 0, caps.length - 1)];
}

/** 悟道玉简ID */
const DAO_RESET_ITEM_ID = 'dao_reset_scroll';

/** 重置冷却（毫秒）：7天 */
const RESET_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function createDefaultState(): DaoSystemState {
  return {
    progress: {
      activatedNodes: {},
      totalPoints: 0,
      spentPoints: 0,
      pointsCap: 10,
      lastResetTime: 0,
    },
  };
}

// ============================================================================
// 悟道系统
// ============================================================================

export class DaoSystem {
  private _state: DaoSystemState;

  constructor(savedState?: Partial<DaoSystemState>) {
    this._state = { ...createDefaultState(), ...savedState };
  }

  /** 序列化 */
  public serialize(): DaoSystemState {
    return {
      progress: {
        activatedNodes: { ...this._state.progress.activatedNodes },
        totalPoints: this._state.progress.totalPoints,
        spentPoints: this._state.progress.spentPoints,
        pointsCap: this._state.progress.pointsCap,
        lastResetTime: this._state.progress.lastResetTime,
      },
    };
  }

  /** 恢复 */
  public restore(state: Partial<DaoSystemState>): void {
    this._state = { ...createDefaultState(), ...state };
  }

  /** 获取状态 */
  public getState(): Readonly<DaoSystemState> {
    return { ...this._state };
  }

  /** 获取当前可用悟道点 */
  public getAvailablePoints(): number {
    const { totalPoints, spentPoints, pointsCap } = this._state.progress;
    return Math.max(0, Math.min(pointsCap, totalPoints) - spentPoints);
  }

  /** 获取悟道点上限 */
  public getPointsCap(): number {
    return this._state.progress.pointsCap;
  }

  /** 更新悟道点上限（由 GameStateManager 在突破时调用） */
  public updatePointsCap(realmIndex: number): void {
    this._state.progress.pointsCap = calcPointsCapByRealm(realmIndex);
  }

  // ==========================================================================
  // 获取悟道点
  // ==========================================================================

  /**
   * 获得悟道点
   * @param amount 数量
   * @param source 来源（用于日志）
   */
  public gainPoints(amount: number, source: string): void {
    if (amount <= 0) return;
    this._state.progress.totalPoints += amount;
    // totalPoints 可以超过 cap，但可用点数受 cap 限制
  }

  /**
   * 直接设置悟道点（用于初始化/测试/转生）
   */
  public setPoints(amount: number): void {
    this._state.progress.totalPoints = clamp(amount, 0, 99999);
  }

  // ==========================================================================
  // 节点激活 / 升级
  // ==========================================================================

  /**
   * 激活大道节点（从0到1级）
   * @param daoId 大道ID
   * @param nodeId 节点ID
   */
  public activateNode(daoId: string, nodeId: string): NodeActivationResult {
    const dao = getDaoPathConfig(daoId);
    if (!dao) {
      return { success: false, message: '大道不存在' };
    }

    const nodeCfg = dao.nodes.find((n) => n.id === nodeId);
    if (!nodeCfg) {
      return { success: false, message: '节点不存在' };
    }

    const key = `${daoId}_${nodeId}`;
    const current = this._state.progress.activatedNodes[key];

    if (current && current.level > 0) {
      return { success: false, message: '节点已激活' };
    }

    // 检查前置节点
    if (nodeCfg.requires && nodeCfg.requires.length > 0) {
      for (const reqId of nodeCfg.requires) {
        const reqKey = `${daoId}_${reqId}`;
        const reqNode = this._state.progress.activatedNodes[reqKey];
        if (!reqNode || reqNode.level < 1) {
          const reqCfg = dao.nodes.find((n) => n.id === reqId);
          return { success: false, message: `前置节点「${reqCfg?.name ?? reqId}」未激活` };
        }
      }
    }

    // 检查解锁条件（衍生大道）
    if (dao.unlockRequirement) {
      const ur = dao.unlockRequirement;
      if (ur.type === 'all_elements' && ur.level) {
        for (const elem of ['metal', 'wood', 'water', 'fire', 'earth']) {
          const lvl = calcDaoTotalLevel(this._state.progress.activatedNodes, elem);
          if (lvl < ur.level) {
            return { success: false, message: `需五大道均达到${ur.level}级以上` };
          }
        }
      }
      if (ur.type === 'realm' && ur.realm) {
        const ri = getRealmIndex(ur.realm);
        // 外部需要传入当前境界索引做检查，此处仅检查数据结构
        // 实际判断在 GameStateManager 调用前检查
      }
    }

    const cost = fibonacci(1);
    const available = this.getAvailablePoints();
    if (available < cost) {
      return { success: false, message: `悟道点不足（需要${cost}，可用${available}）` };
    }

    // 激活
    this._state.progress.activatedNodes[key] = {
      id: nodeId,
      name: nodeCfg.name,
      level: 1,
      maxLevel: nodeCfg.maxLevel,
    };
    this._state.progress.spentPoints += cost;

    return {
      success: true,
      message: `激活「${nodeCfg.name}」成功，等级1`,
      nodeId,
      newLevel: 1,
      cost,
    };
  }

  /**
   * 升级大道节点
   * @param daoId 大道ID
   * @param nodeId 节点ID
   */
  public upgradeNode(daoId: string, nodeId: string): NodeUpgradeResult {
    const dao = getDaoPathConfig(daoId);
    if (!dao) {
      return { success: false, message: '大道不存在' };
    }

    const nodeCfg = dao.nodes.find((n) => n.id === nodeId);
    if (!nodeCfg) {
      return { success: false, message: '节点不存在' };
    }

    const key = `${daoId}_${nodeId}`;
    const current = this._state.progress.activatedNodes[key];

    if (!current || current.level <= 0) {
      return { success: false, message: '节点尚未激活' };
    }

    if (current.level >= nodeCfg.maxLevel) {
      return { success: false, message: '节点已达最高等级' };
    }

    const cost = fibonacci(current.level + 1);
    const available = this.getAvailablePoints();
    if (available < cost) {
      return { success: false, message: `悟道点不足（需要${cost}，可用${available}）` };
    }

    const oldLevel = current.level;
    current.level++;
    this._state.progress.spentPoints += cost;

    return {
      success: true,
      message: `升级「${nodeCfg.name}」成功，等级${current.level}`,
      nodeId,
      oldLevel,
      newLevel: current.level,
      cost,
    };
  }

  /** 获取指定节点当前等级 */
  public getNodeLevel(daoId: string, nodeId: string): number {
    const key = `${daoId}_${nodeId}`;
    return this._state.progress.activatedNodes[key]?.level ?? 0;
  }

  /** 获取某条大道的总等级 */
  public getDaoTotalLevel(daoId: string): number {
    return calcDaoTotalLevel(this._state.progress.activatedNodes, daoId);
  }

  /** 获取所有大道的总等级之和 */
  public getTotalDaoLevel(): number {
    let total = 0;
    for (const dao of DAO_PATHS) {
      total += calcDaoTotalLevel(this._state.progress.activatedNodes, dao.id);
    }
    return total;
  }

  /** 获取某条大道的已激活节点列表 */
  public getDaoNodes(daoId: string): ActivatedDaoNode[] {
    const dao = getDaoPathConfig(daoId);
    if (!dao) return [];
    return dao.nodes.map((n) => {
      const key = `${daoId}_${n.id}`;
      return this._state.progress.activatedNodes[key] ?? {
        id: n.id,
        name: n.name,
        level: 0,
        maxLevel: n.maxLevel,
      };
    });
  }

  // ==========================================================================
  // 组合效果
  // ==========================================================================

  /**
   * 计算所有大道组合效果
   * @param playerRealmId 玩家当前境界ID（用于时空大道解锁检查）
   */
  public calculateComboEffects(playerRealmId?: string): ComboEffect[] {
    const combos: ComboEffect[] = [];
    const activated = this._state.progress.activatedNodes;

    // ---- 五行相生：相邻大道均≥3级 ----
    for (let i = 0; i < ELEMENT_CYCLE.length; i++) {
      const a = ELEMENT_CYCLE[i];
      const b = ELEMENT_CYCLE[(i + 1) % ELEMENT_CYCLE.length];
      const lvlA = calcDaoTotalLevel(activated, a);
      const lvlB = calcDaoTotalLevel(activated, b);
      if (lvlA >= 3 && lvlB >= 3) {
        const elementNames: Record<string, string> = {
          metal: '金', wood: '木', water: '水', fire: '火', earth: '土',
        };
        combos.push({
          id: `combo_generate_${a}_${b}`,
          name: `五行相生 · ${elementNames[a]}生${elementNames[b]}`,
          description: '相邻大道均达3级，激活隐藏神通',
          active: true,
          effects: { [`generate_${a}_${b}`]: 1, hidden_skill: 1 },
        });
      }
    }

    // ---- 五行相克：克制大道≥3级 ----
    for (const [elem, target] of Object.entries(OVERCOMING_CYCLE)) {
      const lvl = calcDaoTotalLevel(activated, elem);
      if (lvl >= 3) {
        combos.push({
          id: `combo_overcome_${elem}`,
          name: `五行相克 · ${elem}`,
          description: '克制大道≥3级，对克制属性伤害+30%',
          active: true,
          effects: { [`overcome_${target}`]: 0.30, elemental_damage_bonus: 0.30 },
        });
      }
    }

    // ---- 五行均衡：五大道均≥3级 ----
    const allFiveMin = ELEMENT_CYCLE.every((e) => calcDaoTotalLevel(activated, e) >= 3);
    if (allFiveMin) {
      combos.push({
        id: 'combo_chaos_awakening',
        name: '混沌初开',
        description: '五行均衡，全属性+10%，修炼速度+15%',
        active: true,
        effects: {
          attack_bonus: 0.10,
          defense_bonus: 0.10,
          hp_bonus: 0.10,
          cultivation_speed: 0.15,
          chaos_awakening: 1,
        },
      });
    }

    // ---- 阴阳大道解锁：五行各≥3级 ----
    const yinYangUnlocked = ELEMENT_CYCLE.every((e) => calcDaoTotalLevel(activated, e) >= 3);
    if (yinYangUnlocked) {
      const yyLevel = calcDaoTotalLevel(activated, 'yin-yang');
      if (yyLevel > 0) {
        combos.push({
          id: 'combo_yinyang',
          name: '阴阳调和',
          description: '阴阳大道已激活，全属性+3%',
          active: true,
          effects: { all_stats: 0.03 },
        });
      }
    }

    // ---- 时空大道解锁：化神期 ----
    const spaceTimeDao = getDaoPathConfig('space-time');
    if (spaceTimeDao && playerRealmId) {
      const req = spaceTimeDao.unlockRequirement;
      const realmIdx = getRealmIndex(playerRealmId);
      if (req && req.type === 'realm' && req.realm) {
        const reqIdx = getRealmIndex(req.realm);
        if (realmIdx >= reqIdx) {
          const stLevel = calcDaoTotalLevel(activated, 'space-time');
          if (stLevel > 0) {
            combos.push({
              id: 'combo_spacetime',
              name: '时空掌控',
              description: '时空大道已激活，行动力+1',
              active: true,
              effects: { action_points: 1 },
            });
          }
        }
      }
    }

    return combos;
  }

  // ==========================================================================
  // 突破加成
  // ==========================================================================

  /**
   * 获取突破加成（百分比）
   * 规则：每10级大道总等级+5%突破成功率，最高50%
   */
  public getBreakthroughBonus(): number {
    const total = this.getTotalDaoLevel();
    const bonus = Math.floor(total / 10) * 0.05;
    return clamp(bonus, 0, 0.50);
  }

  // ==========================================================================
  // 重置悟道
  // ==========================================================================

  /**
   * 重置悟道（消耗悟道玉简）
   * @param hasResetItem 是否拥有悟道玉简
   * @param currentTimestamp 当前时间戳
   */
  public resetDao(hasResetItem: boolean, currentTimestamp: number): ResetResult {
    // 检查冷却
    const elapsed = currentTimestamp - this._state.progress.lastResetTime;
    if (elapsed < RESET_COOLDOWN_MS && this._state.progress.lastResetTime > 0) {
      const daysLeft = Math.ceil((RESET_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
      return { success: false, message: `重置冷却中，还需${daysLeft}天`, cooldownDays: daysLeft };
    }

    if (!hasResetItem) {
      return { success: false, message: '缺少悟道玉简，无法重置' };
    }

    const refunded = this._state.progress.spentPoints;

    this._state.progress.activatedNodes = {};
    this._state.progress.spentPoints = 0;
    this._state.progress.lastResetTime = currentTimestamp;
    // totalPoints 不变，spentPoints 归零意味着所有点数可重新使用

    return {
      success: true,
      message: `悟道重置成功，返还${refunded}悟道点`,
      refundedPoints: refunded,
    };
  }

  /** 获取剩余重置冷却天数 */
  public getResetCooldown(currentTimestamp: number): number {
    const elapsed = currentTimestamp - this._state.progress.lastResetTime;
    if (elapsed >= RESET_COOLDOWN_MS || this._state.progress.lastResetTime === 0) return 0;
    return Math.ceil((RESET_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
  }

  // ==========================================================================
  // 境界突破时奖励悟道点
  // ==========================================================================

  /**
   * 境界突破时奖励悟道点
   * @param oldRealmIndex 旧境界索引
   * @param newRealmIndex 新境界索引
   */
  public onRealmBreakthrough(oldRealmIndex: number, newRealmIndex: number): void {
    // 小境界突破奖励少量
    const smallBonus = 2;
    // 大境界突破奖励较多
    const bigBonus = (newRealmIndex - oldRealmIndex) * 5 + 5;
    const gain = oldRealmIndex === newRealmIndex ? smallBonus : bigBonus;
    this.gainPoints(gain, 'realm_breakthrough');
    // 更新上限
    this.updatePointsCap(newRealmIndex);
  }

  /**
   * 论道胜利奖励
   */
  public onDebateVictory(): void {
    this.gainPoints(3, 'debate_victory');
  }

  /**
   * 服用悟道丹药
   */
  public onDaoPillConsumed(pillLevel: number): void {
    this.gainPoints(pillLevel * 2, 'dao_pill');
  }
}
