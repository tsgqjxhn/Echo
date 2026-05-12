/**
 * 《问道长生》Phaser 3 重构版 —— 神通/技能系统
 * Phase 3B: 战斗系统
 *
 * 负责从玩家数据构建战斗技能列表、创建敌人技能、检查技能可用性、执行技能效果。
 */

import type { PlayerData, Skill, CombatUnit, SkillEffect, FiveElement, StatusEffect } from '../types';

/** 敌人技能模板 */
interface EnemySkillTemplate {
  id: string;
  name: string;
  type: Skill['type'];
  element: FiveElement;
  mpCost: number;
  power: number;
  target: Skill['target'];
  effects: SkillEffect[];
  cooldown: number;
}

/** 敌人技能库 */
const ENEMY_SKILL_TEMPLATES: Record<string, EnemySkillTemplate[]> = {
  spirit_rabbit: [
    { id: 'bite', name: '灵兔冲撞', type: 'attack', element: 'wood', mpCost: 0, power: 100, target: 'single', effects: [{ type: 'damage', value: 1.0 }], cooldown: 0 },
  ],
  wild_wolf: [
    { id: 'claw', name: '利爪撕咬', type: 'attack', element: 'metal', mpCost: 0, power: 110, target: 'single', effects: [{ type: 'damage', value: 1.1 }], cooldown: 0 },
  ],
  poison_snake: [
    { id: 'bite', name: '毒牙噬咬', type: 'attack', element: 'wood', mpCost: 5, power: 90, target: 'single', effects: [{ type: 'damage', value: 0.9 }, { type: 'dot', value: 0.02, duration: 3, statusId: 'poison' }], cooldown: 2 },
  ],
  giant_python: [
    { id: 'swallow', name: '巨蟒吞噬', type: 'attack', element: 'wood', mpCost: 10, power: 130, target: 'single', effects: [{ type: 'damage', value: 1.3 }], cooldown: 2 },
    { id: 'coil', name: '绞杀缠绕', type: 'control', element: 'earth', mpCost: 15, power: 80, target: 'single', effects: [{ type: 'damage', value: 0.8 }, { type: 'control', value: 1, duration: 1, statusId: 'stun' }], cooldown: 3 },
  ],
  stone_demon: [
    { id: 'smash', name: '石破天惊', type: 'attack', element: 'earth', mpCost: 10, power: 120, target: 'single', effects: [{ type: 'damage', value: 1.2 }], cooldown: 1 },
    { id: 'harden', name: '石化护甲', type: 'buff', element: 'earth', mpCost: 15, power: 0, target: 'self', effects: [{ type: 'buff', value: 0.3, duration: 2, targetStat: 'defense' }], cooldown: 3 },
  ],
  puppet_guard: [
    { id: 'slash', name: '傀儡斩', type: 'attack', element: 'metal', mpCost: 5, power: 115, target: 'single', effects: [{ type: 'damage', value: 1.15 }], cooldown: 0 },
    { id: 'array', name: '傀儡阵', type: 'buff', element: 'metal', mpCost: 20, power: 0, target: 'self', effects: [{ type: 'buff', value: 0.2, duration: 2, targetStat: 'attack' }, { type: 'buff', value: 0.2, duration: 2, targetStat: 'defense' }], cooldown: 4 },
  ],
  red_fox: [
    { id: 'flame', name: '狐火', type: 'attack', element: 'fire', mpCost: 10, power: 110, target: 'single', effects: [{ type: 'damage', value: 1.1 }, { type: 'dot', value: 0.03, duration: 2, statusId: 'burn' }], cooldown: 2 },
    { id: 'charm', name: '魅惑', type: 'control', element: 'fire', mpCost: 15, power: 0, target: 'single', effects: [{ type: 'control', value: 1, duration: 1, statusId: 'silence' }], cooldown: 3 },
  ],
  undead_cultivator: [
    { id: 'dark_pulse', name: '亡灵冲击', type: 'attack', element: 'water', mpCost: 10, power: 125, target: 'single', effects: [{ type: 'damage', value: 1.25 }], cooldown: 1 },
    { id: 'soul_drain', name: '噬魂', type: 'attack', element: 'water', mpCost: 20, power: 100, target: 'single', effects: [{ type: 'damage', value: 1.0 }, { type: 'lifesteal', value: 0.3 }], cooldown: 3 },
  ],
  abyss_spider: [
    { id: 'web', name: '深渊蛛网', type: 'control', element: 'water', mpCost: 15, power: 60, target: 'single', effects: [{ type: 'damage', value: 0.6 }, { type: 'debuff', value: -0.3, duration: 2, targetStat: 'speed' }], cooldown: 2 },
    { id: 'venom', name: '蛛毒喷射', type: 'attack', element: 'wood', mpCost: 20, power: 100, target: 'single', effects: [{ type: 'damage', value: 1.0 }, { type: 'dot', value: 0.04, duration: 3, statusId: 'poison' }], cooldown: 2 },
  ],
  chaos_behemoth: [
    { id: 'crush', name: '混沌碾压', type: 'attack', element: 'earth', mpCost: 20, power: 150, target: 'single', effects: [{ type: 'damage', value: 1.5 }], cooldown: 2 },
    { id: 'roar', name: '混沌咆哮', type: 'control', element: 'earth', mpCost: 30, power: 80, target: 'all', effects: [{ type: 'damage', value: 0.8 }, { type: 'control', value: 1, duration: 1, statusId: 'stun' }], cooldown: 4 },
  ],
  void_walker: [
    { id: 'void_slash', name: '虚空斩', type: 'attack', element: 'metal', mpCost: 15, power: 130, target: 'single', effects: [{ type: 'damage', value: 1.3 }], cooldown: 1 },
    { id: 'teleport', name: '虚空闪烁', type: 'buff', element: 'metal', mpCost: 25, power: 0, target: 'self', effects: [{ type: 'buff', value: 0.5, duration: 1, targetStat: 'speed' }], cooldown: 3 },
  ],
  void_lord: [
    { id: 'void_eruption', name: '虚空爆发', type: 'attack', element: 'metal', mpCost: 30, power: 140, target: 'all', effects: [{ type: 'damage', value: 1.4 }], cooldown: 3 },
    { id: 'dominate', name: '虚空支配', type: 'control', element: 'water', mpCost: 40, power: 0, target: 'single', effects: [{ type: 'control', value: 1, duration: 2, statusId: 'silence' }, { type: 'debuff', value: -0.2, duration: 2, targetStat: 'defense' }], cooldown: 4 },
    { id: 'void_heal', name: '虚空吞噬', type: 'heal', element: 'wood', mpCost: 25, power: 0, target: 'self', effects: [{ type: 'heal', value: 0.2, isPercent: true }], cooldown: 3 },
  ],
};

/** 玩家基础神通 */
const PLAYER_BASE_SKILLS: Skill[] = [
  {
    id: 'basic_attack',
    name: '普通攻击',
    type: 'attack',
    element: 'metal',
    mpCost: 0,
    power: 100,
    target: 'single',
    effects: [{ type: 'damage', value: 1.0 }],
    cooldown: 0,
    currentCooldown: 0,
    description: '不消耗灵气的普通攻击',
  },
  {
    id: 'metal_slash',
    name: '金锋斩',
    type: 'attack',
    element: 'metal',
    mpCost: 15,
    power: 130,
    target: 'single',
    effects: [{ type: 'damage', value: 1.3 }],
    cooldown: 2,
    currentCooldown: 0,
    description: '金系神通，单体高伤',
  },
  {
    id: 'wood_regen',
    name: '木灵回春',
    type: 'heal',
    element: 'wood',
    mpCost: 20,
    power: 0,
    target: 'self',
    effects: [{ type: 'heal', value: 0.15, isPercent: true }],
    cooldown: 3,
    currentCooldown: 0,
    description: '木系神通，恢复15%生命',
  },
  {
    id: 'water_shield',
    name: '水幕天华',
    type: 'defense',
    element: 'water',
    mpCost: 15,
    power: 0,
    target: 'self',
    effects: [{ type: 'shield', value: 0.2, duration: 2 }],
    cooldown: 3,
    currentCooldown: 0,
    description: '水系神通，获得护盾',
  },
  {
    id: 'fire_burst',
    name: '烈焰焚天',
    type: 'attack',
    element: 'fire',
    mpCost: 25,
    power: 150,
    target: 'all',
    effects: [{ type: 'damage', value: 1.5 }],
    cooldown: 4,
    currentCooldown: 0,
    description: '火系神通，群体伤害',
  },
  {
    id: 'earth_stun',
    name: '土龙镇魂',
    type: 'control',
    element: 'earth',
    mpCost: 20,
    power: 80,
    target: 'single',
    effects: [{ type: 'damage', value: 0.8 }, { type: 'control', value: 1, duration: 1, statusId: 'stun' }],
    cooldown: 3,
    currentCooldown: 0,
    description: '土系神通，造成伤害并眩晕',
  },
];

export class SkillSystem {
  /**
   * 从玩家数据构建战斗技能列表
   * @param playerData 玩家数据
   * @returns 玩家可用技能列表
   */
  buildPlayerSkills(playerData: PlayerData): Skill[] {
    const profession = playerData.profession || 'sword';
    const base = PLAYER_BASE_SKILLS.map((s) => ({ ...s, currentCooldown: 0 }));

    // 根据职业添加专属技能
    const professionSkills: Record<string, Skill[]> = {
      sword: [
        { id: 'sword_dance', name: '剑舞', type: 'attack', element: 'metal', mpCost: 30, power: 170, target: 'single', effects: [{ type: 'damage', value: 1.7 }], cooldown: 3, currentCooldown: 0, description: '剑修绝技，单体爆发' },
      ],
      alchemy: [
        { id: 'pill_burst', name: '丹爆', type: 'attack', element: 'fire', mpCost: 25, power: 140, target: 'all', effects: [{ type: 'damage', value: 1.2 }], cooldown: 4, currentCooldown: 0, description: '丹师绝技，丹药爆裂伤敌' },
        { id: 'pill_heal', name: '回春丹', type: 'heal', element: 'wood', mpCost: 20, power: 0, target: 'self', effects: [{ type: 'heal', value: 0.25, isPercent: true }], cooldown: 3, currentCooldown: 0, description: '服用特制回春丹，恢复25%生命' },
      ],
      array: [
        { id: 'array_trap', name: '困仙阵', type: 'control', element: 'earth', mpCost: 25, power: 80, target: 'single', effects: [{ type: 'damage', value: 0.8 }, { type: 'control', value: 1, duration: 2, statusId: 'stun' }], cooldown: 4, currentCooldown: 0, description: '阵师绝技，困敌两回合' },
        { id: 'array_buff', name: '聚灵阵', type: 'buff', element: 'earth', mpCost: 20, power: 0, target: 'self', effects: [{ type: 'buff', value: 0.25, duration: 3, targetStat: 'attack' }], cooldown: 4, currentCooldown: 0, description: '阵法加持，攻击提升25%' },
      ],
      wandering: [
        { id: 'wander_dodge', name: '逍遥步', type: 'buff', element: 'water', mpCost: 15, power: 0, target: 'self', effects: [{ type: 'buff', value: 0.3, duration: 2, targetStat: 'speed' }], cooldown: 3, currentCooldown: 0, description: '散修绝技，大幅提升闪避' },
        { id: 'wander_strike', name: '游龙击', type: 'attack', element: 'water', mpCost: 20, power: 130, target: 'single', effects: [{ type: 'damage', value: 1.3 }, { type: 'lifesteal', value: 0.15 }], cooldown: 3, currentCooldown: 0, description: '身法配合攻击，附带吸血' },
      ],
    };

    const extra = professionSkills[profession] || professionSkills['sword'];
    return [...base, ...extra.map((s) => ({ ...s, currentCooldown: 0 }))];
  }

  /**
   * 创建敌人技能列表
   * @param enemyId 敌人ID
   * @returns 敌人可用技能列表
   */
  buildEnemySkills(enemyId: string): Skill[] {
    const templates = ENEMY_SKILL_TEMPLATES[enemyId] ?? ENEMY_SKILL_TEMPLATES['spirit_rabbit'];
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      element: t.element,
      mpCost: t.mpCost,
      power: t.power,
      target: t.target,
      effects: t.effects,
      cooldown: t.cooldown,
      currentCooldown: 0,
    }));
  }

  /**
   * 检查技能是否可用（灵气足够、冷却完毕、未被沉默）
   * @param skill 技能
   * @param unit 施法单位
   */
  isSkillAvailable(skill: Skill, unit: CombatUnit): boolean {
    // 检查灵气
    if (unit.mp < skill.mpCost) return false;
    // 检查冷却
    if (skill.currentCooldown > 0) return false;
    // 检查沉默
    if (skill.type !== 'attack' && unit.buffs.some((b) => b.id === 'silence')) return false;

    return true;
  }

  /**
   * 执行技能效果
   * @param effect 技能效果
   * @param target 目标单位
   * @param source 施法单位
   * @returns 效果数值（伤害/治疗量等）
   */
  applySkillEffect(effect: SkillEffect, target: CombatUnit, source: CombatUnit): number {
    switch (effect.type) {
      case 'heal': {
        const healAmount = effect.isPercent
          ? Math.floor(target.maxHp * effect.value)
          : Math.floor(effect.value);
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        return healAmount;
      }
      case 'shield': {
        // 护盾逻辑：添加一个防御Buff
        const shieldValue = effect.isPercent
          ? Math.floor(target.maxHp * effect.value)
          : effect.value;
        target.buffs.push({
          id: 'shield',
          name: '护盾',
          type: 'buff',
          duration: effect.duration ?? 2,
          effects: [{ stat: 'defense', value: shieldValue, mode: 'add' }],
        });
        return shieldValue;
      }
      case 'mana_regen': {
        const manaAmount = effect.isPercent
          ? Math.floor(target.maxMp * effect.value)
          : Math.floor(effect.value);
        target.mp = Math.min(target.maxMp, target.mp + manaAmount);
        return manaAmount;
      }
      case 'buff': {
        const buffEffect: StatusEffect = {
          id: effect.statusId ?? `buff_${effect.targetStat}`,
          name: effect.statusId ?? '增益',
          type: 'buff',
          duration: effect.duration ?? 2,
          effects: [{ stat: effect.targetStat ?? 'attack', value: effect.value, mode: 'multiply' }],
        };
        target.buffs.push(buffEffect);
        return effect.value;
      }
      case 'debuff': {
        const debuffEffect: StatusEffect = {
          id: effect.statusId ?? `debuff_${effect.targetStat}`,
          name: effect.statusId ?? '减益',
          type: 'debuff',
          duration: effect.duration ?? 2,
          effects: [{ stat: effect.targetStat ?? 'attack', value: effect.value, mode: 'multiply' }],
        };
        target.buffs.push(debuffEffect);
        return effect.value;
      }
      case 'control': {
        const controlEffect: StatusEffect = {
          id: effect.statusId ?? 'control',
          name: '控制',
          type: 'control',
          duration: effect.duration ?? 1,
          effects: [],
        };
        target.buffs.push(controlEffect);
        return 1;
      }
      case 'dot': {
        const dotEffect: StatusEffect = {
          id: effect.statusId ?? 'dot',
          name: '持续伤害',
          type: 'dot',
          duration: effect.duration ?? 3,
          stacks: 1,
          maxStacks: 5,
          effects: [],
        };
        target.buffs.push(dotEffect);
        return 1;
      }
      default:
        return 0;
    }
  }

  /**
   * 减少所有技能的冷却时间
   * @param skills 技能列表
   * @param amount 减少量
   */
  reduceCooldowns(skills: Skill[], amount: number = 1): void {
    for (const skill of skills) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - amount);
      }
    }
  }

  /**
   * 设置技能进入冷却
   * @param skill 技能
   */
  putOnCooldown(skill: Skill): void {
    skill.currentCooldown = skill.cooldown;
  }
}
