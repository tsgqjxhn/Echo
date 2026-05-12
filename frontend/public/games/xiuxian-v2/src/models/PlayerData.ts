/**
 * 《问道长生》Phaser 3 重构版 —— 玩家数据初始化
 * Phase 3A: 玩家数据模型 + Phase 1: 职业/天赋/出生点系统
 *
 * 提供新玩家创建函数，返回完整的初始 PlayerData 对象。
 */

import type { PlayerData, PlayerStats, PlayerCultivation, GameTime } from '../types';
import { generateId } from '../utils';
import {
  REALMS,
  OFFLINE_CAP_HOURS,
  PROFESSIONS,
  TALENTS,
  BIRTH_PLACES,
  getProfessionConfig,
  getTalentConfig,
  getBirthPlaceConfig,
} from '../data/gameData';

/** 角色创建选项 */
export interface CreatePlayerOptions {
  /** 玩家道号 */
  name?: string;
  /** 职业ID */
  profession?: string;
  /** 天赋ID */
  talent?: string;
  /** 出生地点ID */
  birthPlace?: string;
}

/**
 * 创建全新玩家数据
 * 初始状态：炼气初期，100年寿命，基础属性
 * @param options 角色创建选项（向后兼容：不传则使用默认值）
 */
export function createNewPlayer(options: CreatePlayerOptions | string = {}): PlayerData {
  // 向后兼容：支持旧版字符串参数
  const opts: CreatePlayerOptions = typeof options === 'string' ? { name: options } : options;

  const name = opts.name ?? '无名修士';
  const professionId = opts.profession ?? 'sword';
  const talentId = opts.talent ?? '';
  const birthPlaceId = opts.birthPlace ?? 'daoyuan';

  const realmConfig = REALMS[0]; // 炼气期
  const stageConfig = realmConfig.stages[0]; // 初期

  const stats: PlayerStats = {
    hp: stageConfig.hp,
    maxHp: stageConfig.hp,
    mp: 50,
    maxMp: 50,
    attack: stageConfig.attack,
    defense: stageConfig.defense,
    speed: 10,
    fiveElements: {
      metal: 10,
      wood: 10,
      water: 10,
      fire: 10,
      earth: 10,
    },
  };

  const cultivation: PlayerCultivation = {
    realm: realmConfig.id,
    stage: 0,
    exp: 0,
    expMax: stageConfig.expCap,
    comprehension: 50,
    aptitude: 50,
    luck: 50,
    lifespan: realmConfig.maxLifespan,
    lifespanMax: realmConfig.maxLifespan,
    mentalState: 80,
  };

  // 应用职业加成
  applyProfessionBonus(stats, cultivation, professionId);

  // 应用天赋效果
  applyTalentEffect(stats, cultivation, talentId);

  // 应用出生点奖励
  applyBirthPlaceBonus(stats, cultivation, birthPlaceId);

  // 确定初始大域
  const birthPlace = getBirthPlaceConfig(birthPlaceId);
  const worldDomain = birthPlace?.region ?? 'central';

  return {
    id: generateId('player'),
    name,
    stats,
    cultivation,
    profession: professionId,
    talent: talentId,
    birthPlace: birthPlaceId,
    reputation: {},
    worldDomain,
  };
}

/**
 * 应用职业初始属性加成
 */
function applyProfessionBonus(
  stats: PlayerStats,
  cultivation: PlayerCultivation,
  professionId: string
): void {
  const profession = getProfessionConfig(professionId);
  if (!profession) return;

  const b = profession.bonuses;

  // 属性加成映射
  if (b.maxHp) {
    const bonus = Math.floor(stats.maxHp * b.maxHp);
    stats.maxHp += bonus;
    stats.hp += bonus;
  }
  if (b.maxMp) {
    const bonus = Math.floor(stats.maxMp * b.maxMp);
    stats.maxMp += bonus;
    stats.mp += bonus;
  }
  if (b.attack) {
    stats.attack = Math.floor(stats.attack * (1 + b.attack));
  }
  if (b.defense) {
    stats.defense = Math.floor(stats.defense * (1 + b.defense));
  }
  if (b.speed) {
    stats.speed = Math.floor(stats.speed * (1 + b.speed));
  }
}

/**
 * 应用天赋效果
 */
function applyTalentEffect(
  stats: PlayerStats,
  cultivation: PlayerCultivation,
  talentId: string
): void {
  if (!talentId) return;

  const talent = getTalentConfig(talentId);
  if (!talent) return;

  const { type, value } = talent.effect;

  switch (type) {
    case 'cultivationSpeed':
      // 修炼速度加成，暂不直接修改属性，由修炼系统读取
      break;
    case 'maxHp':
      {
        const bonus = Math.floor(stats.maxHp * value);
        stats.maxHp += bonus;
        stats.hp += bonus;
      }
      break;
    case 'allStats':
      stats.attack = Math.floor(stats.attack * (1 + value));
      stats.defense = Math.floor(stats.defense * (1 + value));
      stats.speed = Math.floor(stats.speed * (1 + value));
      break;
    case 'comprehension':
      cultivation.comprehension = Math.min(100, Math.floor(cultivation.comprehension * (1 + value)));
      break;
    case 'swordSkillDamage':
      // 剑修技能伤害加成，由战斗系统读取
      break;
    case 'mainStat':
      // 主属性加成，根据职业不同而不同（由各自系统读取）
      break;
    case 'alchemySuccess':
      // 炼丹成功率加成，由炼丹系统读取
      break;
    case 'allStatsAndBreakthrough':
      stats.attack = Math.floor(stats.attack * (1 + value));
      stats.defense = Math.floor(stats.defense * (1 + value));
      stats.speed = Math.floor(stats.speed * (1 + value));
      break;
    default:
      break;
  }
}

/**
 * 应用出生点起始奖励
 */
function applyBirthPlaceBonus(
  stats: PlayerStats,
  cultivation: PlayerCultivation,
  birthPlaceId: string
): void {
  const place = getBirthPlaceConfig(birthPlaceId);
  if (!place) return;

  const bonus = place.startingBonus;

  // 属性类奖励
  if ('comprehension' in bonus && typeof bonus.comprehension === 'number') {
    cultivation.comprehension = Math.min(100, cultivation.comprehension + bonus.comprehension);
  }
  if ('aptitude' in bonus && typeof bonus.aptitude === 'number') {
    cultivation.aptitude = Math.min(100, cultivation.aptitude + bonus.aptitude);
  }
  if ('luck' in bonus && typeof bonus.luck === 'number') {
    cultivation.luck = Math.min(100, cultivation.luck + bonus.luck);
  }
  if ('maxHp' in bonus && typeof bonus.maxHp === 'number') {
    stats.maxHp += bonus.maxHp;
    stats.hp += bonus.maxHp;
  }

  // 五行灵根奖励
  if ('fiveElements' in bonus && typeof bonus.fiveElements === 'object' && bonus.fiveElements) {
    const fe = bonus.fiveElements as Record<string, number>;
    for (const key of Object.keys(fe)) {
      if (key in stats.fiveElements) {
        const el = key as keyof typeof stats.fiveElements;
        stats.fiveElements[el] = Math.min(100, stats.fiveElements[el] + (fe[key] ?? 0));
      }
    }
  }

  // 物品奖励由外部系统处理（如 InventorySystem）
  // 此处仅记录 startingBonus 中的 itemId/count，供调用方读取
}

/**
 * 创建默认游戏时间
 * 初始：第1年，第1月
 */
export function createDefaultGameTime(): GameTime {
  const realmConfig = REALMS[0];
  return {
    year: 1,
    month: 1,
    actionPoints: realmConfig.actionPoints,
    actionPointsMax: realmConfig.actionPoints,
  };
}

/**
 * 玩家重生/转世数据
 * 保留部分悟道天赋，重置境界和属性
 */
export interface RebirthData {
  /** 保留的悟道点 */
  retainedDaoPoints: number;
  /** 保留的天赋ID列表 */
  retainedTalents: string[];
  /** 转世次数 */
  rebirthCount: number;
}

/**
 * 创建转世后的玩家数据
 * @param previousPlayer 前世玩家数据
 * @param rebirthData 转世保留数据
 */
export function createRebirthPlayer(
  previousPlayer: PlayerData,
  rebirthData: RebirthData
): PlayerData {
  const newPlayer = createNewPlayer(`${previousPlayer.name}·转世`);

  // 转世加成：每次转世悟性+5，根骨+3
  const rebirthBonus = rebirthData.rebirthCount;
  newPlayer.cultivation.comprehension = Math.min(
    100,
    50 + rebirthBonus * 5 + rebirthData.retainedDaoPoints * 0.5
  );
  newPlayer.cultivation.aptitude = Math.min(
    100,
    50 + rebirthBonus * 3 + rebirthData.retainedDaoPoints * 0.3
  );

  // 保留少量属性加成
  const prevStats = previousPlayer.stats;
  newPlayer.stats.fiveElements = {
    metal: Math.min(100, prevStats.fiveElements.metal * 0.1 + 10),
    wood: Math.min(100, prevStats.fiveElements.wood * 0.1 + 10),
    water: Math.min(100, prevStats.fiveElements.water * 0.1 + 10),
    fire: Math.min(100, prevStats.fiveElements.fire * 0.1 + 10),
    earth: Math.min(100, prevStats.fiveElements.earth * 0.1 + 10),
  };

  return newPlayer;
}

/**
 * 计算转世时应保留的数据
 * @param player 当前玩家数据
 * @param daoProgress 大道进度
 */
export function calculateRebirthRetention(
  player: PlayerData,
  daoProgress: Record<string, unknown>
): RebirthData {
  const rebirthCount = 0; // 从存档读取

  // 悟道点按境界和悟道等级计算
  const realmIndex = REALMS.findIndex((r) => r.id === player.cultivation.realm);
  const baseDaoPoints = realmIndex * 2 + player.cultivation.stage;

  // 统计已解锁的大道节点
  let unlockedNodes = 0;
  for (const daoId of Object.keys(daoProgress)) {
    const dao = daoProgress[daoId] as { nodes?: Array<{ unlocked: boolean }> };
    if (dao?.nodes) {
      unlockedNodes += dao.nodes.filter((n) => n.unlocked).length;
    }
  }

  return {
    retainedDaoPoints: Math.floor(baseDaoPoints + unlockedNodes * 0.5),
    retainedTalents: [], // TODO: 从存档读取天赋
    rebirthCount: rebirthCount + 1,
  };
}

/**
 * 离线收益数据结构
 */
export interface OfflineProgress {
  /** 经过的游戏月数 */
  monthsPassed: number;
  /** 获得修为 */
  cultivationGained: number;
  /** 消耗的寿命（年） */
  lifespanConsumed: number;
  /** 实际离线小时数 */
  actualOfflineHours: number;
  /** 是否达到上限 */
  capped: boolean;
}

/**
 * 计算离线收益
 * @param offlineMs 离线毫秒数
 * @param cultivationSpeed 每秒修为值
 * @param spiritDensity 灵气浓度
 * @param arrayBonus 聚灵阵加成
 * @param techniqueBonus 功法效率加成
 */
export function calculateOfflineProgress(
  offlineMs: number,
  cultivationSpeed: number,
  spiritDensity: number = 1.0,
  arrayBonus: number = 0,
  techniqueBonus: number = 1.0
): OfflineProgress {
  const offlineHours = offlineMs / (1000 * 60 * 60);
  const capped = offlineHours > OFFLINE_CAP_HOURS;
  const actualHours = Math.min(offlineHours, OFFLINE_CAP_HOURS);

  // 离线每小时对应游戏内月数
  const monthsPassed = Math.floor(actualHours / 4); // 4小时=1游戏月
  // 每年消耗1岁寿命
  const lifespanConsumed = Math.floor(monthsPassed / 12);

  // 离线修为 = 基础速度 × 灵气浓度 × (1+聚灵阵) × 功法效率 × 时间
  const offlineSeconds = actualHours * 3600;
  const cultivationGained = Math.floor(
    cultivationSpeed * spiritDensity * (1 + arrayBonus) * techniqueBonus * offlineSeconds
  );

  return {
    monthsPassed,
    cultivationGained,
    lifespanConsumed,
    actualOfflineHours: actualHours,
    capped,
  };
}
