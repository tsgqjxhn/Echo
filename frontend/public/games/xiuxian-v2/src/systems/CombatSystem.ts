/**
 * 《问道长生》Phaser 3 重构版 —— 战斗系统核心
 * Phase 3B: 战斗系统
 *
 * 回合制战斗引擎，包含五行克制、暴击、破甲、吸血、功法特效等完整机制。
 */

import type {
  PlayerData,
  CombatUnit,
  Skill,
  BattleState,
  BattleResult,
  TurnResult,
  DamageResult,
  PlayerAction,
  BattleLogEntry,
  FiveElement,
} from '../types';
import { SkillSystem } from './SkillSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { clamp, randomInt } from '../utils';
import { getEnemyConfig } from '../data/gameData';

/** 五行克制关系矩阵 */
const ELEMENT_MODIFIER: Record<FiveElement, Record<FiveElement, number>> = {
  metal: { metal: 1, wood: 1.3, water: 0.8, fire: 0.8, earth: 1 },
  wood: { metal: 0.8, wood: 1, water: 1.3, fire: 0.8, earth: 1 },
  water: { metal: 1, wood: 0.8, water: 1, fire: 1.3, earth: 0.8 },
  fire: { metal: 1.3, wood: 0.8, water: 0.8, fire: 1, earth: 1 },
  earth: { metal: 0.8, wood: 1, water: 1, fire: 0.8, earth: 1 },
};

export class CombatSystem {
  private _state: BattleState | null = null;
  private _skillSystem = new SkillSystem();
  private _statusSystem = new StatusEffectSystem();
  private _battleType: 'normal' | 'boss' | 'breakthrough' | 'arena' = 'normal';

  /** 当前战斗状态 */
  get state(): BattleState | null {
    return this._state;
  }

  /** 是否处于战斗中 */
  get inCombat(): boolean {
    return this._state !== null;
  }

  // ==========================================================================
  // 战斗初始化
  // ==========================================================================

  /**
   * 开始一场战斗
   * @param enemyId 敌人ID
   * @param type 战斗类型
   * @param playerData 玩家数据
   */
  startBattle(
    enemyId: string,
    type: 'normal' | 'boss' | 'breakthrough' | 'arena',
    playerData: PlayerData
  ): BattleState {
    this._battleType = type;

    const enemyConfig = getEnemyConfig(enemyId);
    if (!enemyConfig) {
      throw new Error(`[CombatSystem] 未知敌人: ${enemyId}`);
    }

    // 构建玩家战斗单位
    const player: CombatUnit = {
      name: playerData.name,
      hp: playerData.stats.hp,
      maxHp: playerData.stats.maxHp,
      mp: playerData.stats.mp,
      maxMp: playerData.stats.maxMp,
      attack: playerData.stats.attack,
      defense: playerData.stats.defense,
      speed: playerData.stats.speed,
      critRate: 0.05, // 基础暴击率 5%
      critDamage: 0.5, // 基础暴击伤害加成 50%
      element: this._getDominantElement(playerData.stats.fiveElements),
      skills: this._skillSystem.buildPlayerSkills(playerData),
      buffs: [],
      defenseBreak: 0,
      lifeSteal: 0,
      reflectRate: 0,
      comboRate: 0,
      classType: playerData.profession || 'sword',
    };

    // 构建敌人战斗单位
    const enemy: CombatUnit = {
      name: enemyConfig.name,
      hp: enemyConfig.hp,
      maxHp: enemyConfig.hp,
      mp: enemyConfig.mp ?? 50,
      maxMp: enemyConfig.mp ?? 50,
      attack: enemyConfig.attack,
      defense: enemyConfig.defense,
      speed: enemyConfig.speed,
      critRate: enemyConfig.critRate ?? 0.03,
      critDamage: enemyConfig.critDamage ?? 0.3,
      element: enemyConfig.element as FiveElement,
      skills: this._skillSystem.buildEnemySkills(enemyId),
      buffs: [],
    };

    // Boss战斗增强
    if (type === 'boss') {
      enemy.hp = Math.floor(enemy.hp * 1.5);
      enemy.maxHp = enemy.hp;
      enemy.attack = Math.floor(enemy.attack * 1.2);
      enemy.defense = Math.floor(enemy.defense * 1.2);
    }

    // 确定先手顺序
    const turnQueue: ('player' | 'enemy')[] = [];
    if (player.speed >= enemy.speed) {
      turnQueue.push('player', 'enemy');
    } else {
      turnQueue.push('enemy', 'player');
    }

    this._state = {
      round: 1,
      player,
      enemy,
      log: [],
      statusEffects: [],
      turnQueue,
      isAuto: false,
    };

    // 战斗开始日志
    this._addLog('system', '战斗开始', `${player.name} vs ${enemy.name}`, undefined, undefined);

    return this._state;
  }

  // ==========================================================================
  // 回合执行
  // ==========================================================================

  /**
   * 执行玩家回合
   * @param action 玩家行动
   */
  executeTurn(action: PlayerAction): TurnResult {
    if (!this._state) {
      throw new Error('[CombatSystem] 未在战斗中');
    }

    const { player, enemy } = this._state;
    const result = this._executeUnitTurn(player, enemy, action, 'player');

    // 检查战斗结束
    const battleResult = this.checkBattleEnd();
    if (battleResult) {
      this._addLog('system', '战斗结束', battleResult.victory ? '胜利' : '失败', undefined, undefined);
    }

    return result;
  }

  /**
   * 执行自动回合（敌方AI）
   */
  executeAutoTurn(): TurnResult {
    if (!this._state) {
      throw new Error('[CombatSystem] 未在战斗中');
    }

    const { enemy, player } = this._state;
    const action = this._chooseEnemyAction(enemy, player);
    const result = this._executeUnitTurn(enemy, player, action, 'enemy');

    // 检查战斗结束
    const battleResult = this.checkBattleEnd();
    if (battleResult) {
      this._addLog('system', '战斗结束', battleResult.victory ? '胜利' : '失败', undefined, undefined);
    }

    return result;
  }

  // ==========================================================================
  // 内部回合执行
  // ==========================================================================

  private _executeUnitTurn(
    actor: CombatUnit,
    target: CombatUnit,
    action: PlayerAction,
    actorType: 'player' | 'enemy'
  ): TurnResult {
    const logs: string[] = [];
    const result: TurnResult = { actor: actorType, action: action.type, logs };

    // 回合开始：处理状态效果
    const turnStart = this._statusSystem.processTurnStart(actor);
    logs.push(...turnStart.logs);

    if (turnStart.skipped) {
      // 跳过回合
      this._endTurn(actor);
      return result;
    }

    // 每回合自动恢复灵气
    const manaRegen = Math.floor(actor.maxMp * 0.1);
    actor.mp = Math.min(actor.maxMp, actor.mp + manaRegen);

    // 执行行动
    switch (action.type) {
      case 'attack': {
        // 普通攻击
        const damage = this.calculateDamage(actor, target, actor.skills[0]);
        target.hp = Math.max(0, target.hp - damage.damage);
        result.damage = damage;
        logs.push(
          `${actor.name} 普通攻击造成 ${damage.damage} 点伤害` +
            (damage.isCrit ? '（暴击！）' : '') +
            (damage.elementModifier > 1 ? '（五行克制！）' : damage.elementModifier < 1 ? '（被克制）' : '')
        );
        break;
      }
      case 'skill': {
        const skill = actor.skills.find((s) => s.id === action.skillId);
        if (skill && this._skillSystem.isSkillAvailable(skill, actor)) {
          // 消耗灵气
          actor.mp -= skill.mpCost;
          // 设置冷却
          this._skillSystem.putOnCooldown(skill);

          // 计算伤害
          const damage = this.calculateDamage(actor, target, skill);
          target.hp = Math.max(0, target.hp - damage.damage);
          result.damage = damage;
          logs.push(
            `${actor.name} 使用 ${skill.name} 造成 ${damage.damage} 点伤害` +
              (damage.isCrit ? '（暴击！）' : '') +
              (damage.elementModifier > 1 ? '（五行克制！）' : '')
          );

          // 执行技能附加效果
          for (const effect of skill.effects) {
            if (effect.type !== 'damage') {
              const effectValue = this._skillSystem.applySkillEffect(effect, target, actor);
              if (effect.type === 'heal') {
                result.healAmount = effectValue;
                logs.push(`${actor.name} 恢复 ${effectValue} 生命`);
              } else if (effect.type === 'shield') {
                logs.push(`${actor.name} 获得护盾`);
              } else if (effect.type === 'control') {
                logs.push(`${target.name} 被控制！`);
              } else if (effect.type === 'dot') {
                logs.push(`${target.name} 中毒！`);
              }
            }
          }
        } else {
          logs.push(`${actor.name} 技能无法使用，改为普通攻击`);
          const damage = this.calculateDamage(actor, target, actor.skills[0]);
          target.hp = Math.max(0, target.hp - damage.damage);
          result.damage = damage;
        }
        break;
      }
      case 'defend': {
        // 防御：提升防御力一回合
        actor.buffs.push({
          id: 'defend',
          name: '防御姿态',
          type: 'buff',
          duration: 1,
          effects: [{ stat: 'defense', value: 0.5, mode: 'multiply' }],
        });
        logs.push(`${actor.name} 进入防御姿态，防御力提升`);
        break;
      }
      case 'item': {
        // 使用物品（在战斗场景中处理消耗，这里只记录）
        logs.push(`${actor.name} 使用了物品`);
        break;
      }
      case 'flee': {
        const fleeSuccess = this._attemptFlee(actor, target);
        if (fleeSuccess) {
          logs.push(`${actor.name} 成功逃跑！`);
          // 标记战斗结束（逃跑算失败但无惩罚）
          if (this._state) {
            this._state.player.hp = 0; // 触发结束检查
          }
        } else {
          logs.push(`${actor.name} 逃跑失败！`);
        }
        break;
      }
    }

    // 功法特效处理
    this._applyClassEffects(actor, target, result, logs);

    // 回合结束：处理状态效果
    const turnEndLogs = this._statusSystem.processTurnEnd(actor);
    logs.push(...turnEndLogs);
    this._statusSystem.removeExpiredEffects(actor);
    this._statusSystem.removeExpiredEffects(target);

    // 减少技能冷却
    this._skillSystem.reduceCooldowns(actor.skills);

    // 推进回合
    this._endTurn(actor);

    return result;
  }

  private _endTurn(actor: CombatUnit): void {
    if (!this._state) return;

    // 轮换行动队列
    const current = this._state.turnQueue[0];
    if (
      (current === 'player' && actor === this._state.player) ||
      (current === 'enemy' && actor === this._state.enemy)
    ) {
      this._state.turnQueue.shift();
    }

    // 如果队列空了，新回合
    if (this._state.turnQueue.length === 0) {
      this._state.round++;
      // 根据速度重新排序
      if (this._state.player.speed >= this._state.enemy.speed) {
        this._state.turnQueue.push('player', 'enemy');
      } else {
        this._state.turnQueue.push('enemy', 'player');
      }
    }
  }

  // ==========================================================================
  // 伤害计算
  // ==========================================================================

  /**
   * 计算伤害
   * @param attacker 攻击者
   * @param defender 防御者
   * @param skill 使用的技能
   */
  calculateDamage(attacker: CombatUnit, defender: CombatUnit, skill: Skill): DamageResult {
    // 基础伤害 = (攻击力 - 防御力 * 0.5) * 技能系数
    let defenseAfterBreak = defender.defense;
    if (attacker.defenseBreak) {
      defenseAfterBreak = Math.floor(defender.defense * (1 - attacker.defenseBreak));
    }

    let baseDamage = Math.max(1, (attacker.attack - defenseAfterBreak * 0.5) * (skill.power / 100));

    // 随机波动 85%-115%
    baseDamage *= 0.85 + Math.random() * 0.3;

    // 暴击判定
    const critRoll = Math.random();
    const isCrit = critRoll < attacker.critRate;
    if (isCrit) {
      baseDamage *= 1 + attacker.critDamage;
    }

    // 五行克制
    const elementModifier = this.getElementModifier(attacker.element, defender.element);
    baseDamage *= elementModifier;

    // 冰冻目标受到火系攻击时双倍伤害
    let finalDamage = Math.floor(baseDamage);
    if (this._statusSystem.isFrozen(defender) && attacker.element === 'fire') {
      finalDamage *= 2;
    }

    const result: DamageResult = {
      damage: finalDamage,
      isCrit,
      elementModifier,
    };

    // 吸血
    if (attacker.lifeSteal && attacker.lifeSteal > 0) {
      result.lifeStealHeal = Math.floor(finalDamage * attacker.lifeSteal);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + result.lifeStealHeal);
    }

    // 反震
    if (defender.reflectRate && defender.reflectRate > 0) {
      const reflectRoll = Math.random();
      if (reflectRoll < defender.reflectRate) {
        const reflected = Math.floor(finalDamage * 0.3);
        attacker.hp = Math.max(0, attacker.hp - reflected);
        result.isReflected = true;
        result.reflectedDamage = reflected;
      }
    }

    return result;
  }

  // ==========================================================================
  // 五行克制
  // ==========================================================================

  /**
   * 获取五行克制倍率
   * @param attackerElement 攻击方五行
   * @param defenderElement 防御方五行
   */
  getElementModifier(attackerElement: FiveElement, defenderElement: FiveElement): number {
    return ELEMENT_MODIFIER[attackerElement]?.[defenderElement] ?? 1;
  }

  // ==========================================================================
  // 战斗结束判定
  // ==========================================================================

  /**
   * 检查战斗是否结束
   */
  checkBattleEnd(): BattleResult | null {
    if (!this._state) return null;

    const { player, enemy, round } = this._state;

    if (player.hp <= 0) {
      return {
        victory: false,
        rounds: round,
        expGained: 0,
        loot: {},
        playerHpRemaining: 0,
        playerMpRemaining: player.mp,
      };
    }

    if (enemy.hp <= 0) {
      // 计算奖励
      const expGained = this._calculateExpReward();
      const loot = this._calculateLoot();

      return {
        victory: true,
        rounds: round,
        expGained,
        loot,
        playerHpRemaining: player.hp,
        playerMpRemaining: player.mp,
      };
    }

    return null;
  }

  // ==========================================================================
  // 逃跑
  // ==========================================================================

  /**
   * 尝试逃跑
   * @param actor 逃跑者
   * @param target 追击者
   */
  private _attemptFlee(actor: CombatUnit, target: CombatUnit): boolean {
    // Boss战不能逃跑
    if (this._battleType === 'boss') return false;

    // 逃跑成功率 = 50% + (速度差 / 追击者速度) * 30%
    const speedDiff = actor.speed - target.speed;
    const fleeRate = clamp(0.3 + (speedDiff / Math.max(1, target.speed)) * 0.3, 0.1, 0.9);
    return Math.random() < fleeRate;
  }

  // ==========================================================================
  // 功法特效
  // ==========================================================================

  private _applyClassEffects(
    actor: CombatUnit,
    target: CombatUnit,
    result: TurnResult,
    logs: string[]
  ): void {
    if (!actor.classType) return;

    switch (actor.classType) {
      case 'sword': {
        // 剑修连击
        const comboRate = (actor.comboRate ?? 0) + 0.1;
        if (Math.random() < comboRate && result.damage) {
          const extraDamage = Math.floor(result.damage.damage * 0.5);
          target.hp = Math.max(0, target.hp - extraDamage);
          result.isCombo = true;
          logs.push(`剑气爆发！额外 ${extraDamage} 伤害`);
        }
        break;
      }
      case 'body': {
        // 体修反震已在calculateDamage中处理
        break;
      }
      case 'qi': {
        // 气修灵气爆发
        const manaRatio = actor.mp / actor.maxMp;
        if (manaRatio > 0.7 && result.damage && Math.random() < 0.15) {
          const bonusDamage = Math.floor(result.damage.damage * 0.3);
          target.hp = Math.max(0, target.hp - bonusDamage);
          logs.push(`灵气爆发！额外 ${bonusDamage} 伤害`);
        }
        break;
      }
      case 'talisman': {
        // 符修封印
        if (Math.random() < 0.1 && result.damage) {
          const sealDamage = Math.floor(target.maxHp * 0.02);
          target.hp = Math.max(0, target.hp - sealDamage);
          logs.push(`符箓封印！额外 ${sealDamage} 伤害`);
        }
        break;
      }
    }
  }

  // ==========================================================================
  // 敌人AI
  // ==========================================================================

  private _chooseEnemyAction(enemy: CombatUnit, player: CombatUnit): PlayerAction {
    // AI策略：
    // 1. 生命值低于30%时，优先使用治疗/护盾技能
    // 2. 有控制技能且玩家未被控制时，尝试控制
    // 3. 优先使用高伤害技能（如果灵气足够）
    // 4. 否则普通攻击

    const hpRatio = enemy.hp / enemy.maxHp;

    for (const skill of enemy.skills) {
      if (!this._skillSystem.isSkillAvailable(skill, enemy)) continue;

      // 低血量优先治疗
      if (hpRatio < 0.3 && skill.type === 'heal') {
        return { type: 'skill', skillId: skill.id };
      }

      // 优先控制
      if (skill.type === 'control' && !player.buffs.some((b) => b.type === 'control')) {
        return { type: 'skill', skillId: skill.id };
      }

      // 高伤害技能
      if (skill.type === 'attack' && skill.power >= 120) {
        return { type: 'skill', skillId: skill.id };
      }
    }

    // 使用第一个可用攻击技能
    const availableAttack = enemy.skills.find(
      (s) => s.type === 'attack' && this._skillSystem.isSkillAvailable(s, enemy)
    );
    if (availableAttack) {
      return { type: 'skill', skillId: availableAttack.id };
    }

    // 默认普通攻击
    return { type: 'attack' };
  }

  // ==========================================================================
  // 奖励计算
  // ==========================================================================

  private _calculateExpReward(): number {
    if (!this._state) return 0;
    const { enemy, round } = this._state;

    // 基础修为 = 敌人攻击力 * 10
    let exp = enemy.attack * 10;

    // Boss倍率
    if (this._battleType === 'boss') exp *= 3;

    // 回合数惩罚（超过10回合开始衰减）
    if (round > 10) {
      exp = Math.floor(exp * Math.max(0.5, 1 - (round - 10) * 0.05));
    }

    // 随机波动
    exp = Math.floor(exp * (0.9 + Math.random() * 0.2));

    return exp;
  }

  private _calculateLoot(): Record<string, number> {
    if (!this._state) return {};
    const { enemy } = this._state;

    const loot: Record<string, number> = {};

    // 敌人配置中有掉落列表
    // TODO: 从敌人配置读取掉落
    // 临时：根据敌人类型给基础掉落
    if (enemy.element === 'metal') {
      loot['lingshi'] = randomInt(20, 50);
    } else if (enemy.element === 'wood') {
      loot['lingcao'] = randomInt(1, 3);
      loot['lingshi'] = randomInt(10, 30);
    } else {
      loot['lingshi'] = randomInt(15, 40);
    }

    return loot;
  }

  // ==========================================================================
  // 辅助方法
  // ==========================================================================

  private _getDominantElement(elements: Record<FiveElement, number>): FiveElement {
    let max = 0;
    let dominant: FiveElement = 'metal';
    for (const [key, value] of Object.entries(elements) as [FiveElement, number][]) {
      if (value > max) {
        max = value;
        dominant = key;
      }
    }
    return dominant;
  }

  private _addLog(
    actor: 'player' | 'enemy' | 'system',
    action: string,
    target: string,
    value?: number,
    element?: FiveElement
  ): void {
    if (!this._state) return;
    const entry: BattleLogEntry = {
      round: this._state.round,
      actor: actor === 'system' ? 'player' : actor,
      action,
      target,
      value,
      element,
      timestamp: Date.now(),
    };
    this._state.log.push(entry);
  }

  /**
   * 获取当前行动方
   */
  getCurrentTurn(): 'player' | 'enemy' | null {
    if (!this._state) return null;
    return this._state.turnQueue[0] ?? null;
  }

  /**
   * 切换自动战斗
   */
  toggleAuto(): boolean {
    if (!this._state) return false;
    this._state.isAuto = !this._state.isAuto;
    return this._state.isAuto;
  }

  /**
   * 使用战斗内物品（回血丹等）
   * @param itemId 物品ID
   */
  useBattleItem(itemId: string, actor: CombatUnit): { success: boolean; healAmount?: number; log: string } {
    switch (itemId) {
      case 'huixue_dan': {
        const heal = Math.floor(actor.maxHp * 0.3);
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
        return { success: true, healAmount: heal, log: `${actor.name} 使用回血丹，恢复 ${heal} 生命` };
      }
      case 'huti_dan': {
        actor.buffs.push({
          id: 'huti',
          name: '护体',
          type: 'buff',
          duration: 999, // 持续到战斗结束
          effects: [{ stat: 'defense', value: 0.5, mode: 'multiply' }],
        });
        return { success: true, log: `${actor.name} 使用护体丹，防御力提升50%` };
      }
      default:
        return { success: false, log: '无法使用该物品' };
    }
  }

  /**
   * 重置战斗状态
   */
  reset(): void {
    this._state = null;
    this._battleType = 'normal';
  }
}
