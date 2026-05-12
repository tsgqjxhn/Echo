/**
 * 《问道长生》Phaser 3 重构版 —— 状态效果系统
 * Phase 3B: 战斗系统
 *
 * 管理战斗中所有临时状态效果（Buff/Debuff/DOT/控制）的添加、处理与移除。
 */

import type { CombatUnit, StatusEffect, TurnStartResult } from '../types';
import { clamp } from '../utils';

export class StatusEffectSystem {
  /**
   * 添加状态效果到目标
   * @param target 目标战斗单位
   * @param effect 要添加的状态效果
   */
  addEffect(target: CombatUnit, effect: StatusEffect): void {
    // 检查是否已有同类型效果
    const existingIndex = target.buffs.findIndex((b) => b.id === effect.id);

    if (existingIndex >= 0) {
      const existing = target.buffs[existingIndex];
      if (effect.maxStacks && effect.stacks) {
        // 可叠加效果
        existing.stacks = clamp(
          (existing.stacks ?? 1) + effect.stacks,
          1,
          effect.maxStacks
        );
        // 刷新持续时间
        existing.duration = Math.max(existing.duration, effect.duration);
      } else {
        // 不可叠加，刷新持续时间
        existing.duration = Math.max(existing.duration, effect.duration);
      }
    } else {
      // 新效果
      const newEffect: StatusEffect = {
        ...effect,
        stacks: effect.stacks ?? 1,
      };
      target.buffs.push(newEffect);
    }
  }

  /**
   * 回合开始时处理状态效果
   * 处理DOT伤害、控制效果（跳过回合）等
   * @param unit 当前回合单位
   */
  processTurnStart(unit: CombatUnit): TurnStartResult {
    const result: TurnStartResult = { skipped: false, logs: [] };

    for (const buff of unit.buffs) {
      // 控制效果：眩晕跳过回合
      if (buff.type === 'control' && buff.id === 'stun') {
        result.skipped = true;
        result.logs.push(`${unit.name} 处于眩晕状态，无法行动！`);
      }

      // 控制效果：冰冻跳过回合 + 火系融冰双倍伤害（在伤害计算时处理）
      if (buff.type === 'control' && buff.id === 'freeze') {
        result.skipped = true;
        result.logs.push(`${unit.name} 被冰冻，无法行动！`);
      }

      // DOT效果：毒素伤害
      if (buff.type === 'dot' && buff.id === 'poison') {
        const stacks = buff.stacks ?? 1;
        const dotDamage = Math.floor(unit.maxHp * 0.02 * stacks);
        unit.hp = Math.max(0, unit.hp - dotDamage);
        result.dotDamage = (result.dotDamage ?? 0) + dotDamage;
        result.logs.push(`${unit.name} 受到毒素侵蚀，损失 ${dotDamage} 生命`);
      }

      // DOT效果：燃烧伤害
      if (buff.type === 'dot' && buff.id === 'burn') {
        const stacks = buff.stacks ?? 1;
        const burnDamage = Math.floor(unit.maxHp * 0.03 * stacks);
        unit.hp = Math.max(0, unit.hp - burnDamage);
        result.dotDamage = (result.dotDamage ?? 0) + burnDamage;
        result.logs.push(`${unit.name} 被烈焰灼烧，损失 ${burnDamage} 生命`);
      }
    }

    return result;
  }

  /**
   * 回合结束时处理状态效果
   * 持续时间-1
   * @param unit 当前回合单位
   */
  processTurnEnd(unit: CombatUnit): string[] {
    const logs: string[] = [];

    for (const buff of unit.buffs) {
      buff.duration -= 1;

      if (buff.duration <= 0) {
        logs.push(`${unit.name} 的 ${buff.name} 效果消失了`);
      }
    }

    return logs;
  }

  /**
   * 移除所有过期状态效果
   * @param unit 战斗单位
   */
  removeExpiredEffects(unit: CombatUnit): void {
    unit.buffs = unit.buffs.filter((b) => b.duration > 0);
  }

  /**
   * 检查单位是否被沉默（无法使用神通）
   * @param unit 战斗单位
   */
  isSilenced(unit: CombatUnit): boolean {
    return unit.buffs.some((b) => b.id === 'silence' && b.duration > 0);
  }

  /**
   * 检查单位是否被眩晕
   * @param unit 战斗单位
   */
  isStunned(unit: CombatUnit): boolean {
    return unit.buffs.some((b) => b.id === 'stun' && b.duration > 0);
  }

  /**
   * 检查单位是否被冰冻
   * @param unit 战斗单位
   */
  isFrozen(unit: CombatUnit): boolean {
    return unit.buffs.some((b) => b.id === 'freeze' && b.duration > 0);
  }

  /**
   * 获取指定效果的层数
   * @param unit 战斗单位
   * @param effectId 效果ID
   */
  getEffectStacks(unit: CombatUnit, effectId: string): number {
    const buff = unit.buffs.find((b) => b.id === effectId);
    return buff?.stacks ?? 0;
  }

  /**
   * 计算所有生效的Buff属性加成
   * @param unit 战斗单位
   * @param stat 属性名
   */
  getBuffedStat(unit: CombatUnit, stat: keyof CombatUnit): number {
    let baseValue = (unit[stat] as number) ?? 0;
    let addValue = 0;
    let multiplyFactor = 1;

    for (const buff of unit.buffs) {
      for (const effect of buff.effects) {
        if (effect.stat === stat) {
          if (effect.mode === 'multiply') {
            multiplyFactor *= 1 + effect.value;
          } else {
            addValue += effect.value * (buff.stacks ?? 1);
          }
        }
      }
    }

    return (baseValue + addValue) * multiplyFactor;
  }

  /**
   * 清除所有状态效果（战斗结束等场景）
   * @param unit 战斗单位
   */
  clearAllEffects(unit: CombatUnit): void {
    unit.buffs = [];
  }
}
