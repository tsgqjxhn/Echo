/**
 * 《问道长生》Phaser 3 重构版 —— 核心类型定义
 * Phase 1: 核心基础设施
 *
 * 本文件定义游戏内所有核心业务实体与数据结构的 TypeScript 接口。
 * 不包含任何业务逻辑，仅作为类型契约供各模块使用。
 */

// ============================================================================
// 基础枚举与字面量类型
// ============================================================================

/** 五行元素 */
export type FiveElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

/** 物品类型 */
export type ItemType = 'pill' | 'material' | 'technique' | 'equipment' | 'misc' | 'treasure' | 'currency' | 'consumable' | 'artifact' | 'herb';

/** 品质/稀有度：0白 1绿 2蓝 3紫 4橙 5红 */
export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;

/** 功法元素倾向 */
export type TechniqueElement = FiveElement | 'mixed';

/** 功法类型 */
export type TechniqueType = 'combat' | 'cultivation' | 'auxiliary';

/** 事件类型 */
export type EventType = 'combat' | 'gather' | 'encounter' | 'breakthrough';

// ============================================================================
// 境界系统
// ============================================================================

/**
 * 境界定义
 * 修真体系中每个大境界的静态配置数据
 */
export interface Realm {
  /** 境界唯一标识，如 lianqi, zhuji, jindan... */
  id: string;
  /** 境界显示名称，如 "炼气期" */
  name: string;
  /** 阶段名称列表，如 ['初期','中期','后期','圆满'] */
  stages: string[];
  /** 该境界的寿命上限 */
  maxLifespan: number;
  /** 每月可用行动力 */
  actionPoints: number;
  /** 基础修炼速度系数 */
  cultivationSpeedBase: number;
}

// ============================================================================
// 玩家属性
// ============================================================================

/**
 * 玩家战斗/基础属性
 * 运行时高频变更的数据
 */
export interface PlayerStats {
  /** 当前生命值 */
  hp: number;
  /** 生命值上限 */
  maxHp: number;
  /** 当前法力值 */
  mp: number;
  /** 法力值上限 */
  maxMp: number;
  /** 攻击力 */
  attack: number;
  /** 防御力 */
  defense: number;
  /** 速度/闪避 */
  speed: number;
  /** 五行灵根属性值 */
  fiveElements: Record<FiveElement, number>;
}

/**
 * 玩家修炼状态
 * 核心修真进度数据
 */
export interface PlayerCultivation {
  /** 当前境界ID */
  realm: string;
  /** 当前阶段索引 0-3（初期/中期/后期/圆满） */
  stage: number;
  /** 当前修为值 */
  exp: number;
  /** 当前阶段修为上限 */
  expMax: number;
  /** 悟性 影响修炼速度和理解功法 */
  comprehension: number;
  /** 根骨 影响属性成长和突破成功率 */
  aptitude: number;
  /** 机缘 影响奇遇和掉落 */
  luck: number;
  /** 当前剩余寿命 */
  lifespan: number;
  /** 寿命上限 */
  lifespanMax: number;
  /** 心境值 0-100，影响突破和修炼效率 */
  mentalState: number;
}

/**
 * 玩家完整数据
 * 由属性 + 修炼状态组合而成
 */
export interface PlayerData {
  /** 玩家唯一ID */
  id: string;
  /** 玩家道号 */
  name: string;
  /** 基础战斗属性 */
  stats: PlayerStats;
  /** 修炼状态 */
  cultivation: PlayerCultivation;
  /** 职业ID */
  profession: string;
  /** 天赋ID（空字符串表示无天赋） */
  talent: string;
  /** 出生地点ID */
  birthPlace: string;
  /** 各势力声望（键为势力ID，值为声望值） */
  reputation: Record<string, number>;
  /** 当前所在大域 */
  worldDomain: string;
}

// ============================================================================
// 职业/天赋/出生系统
// ============================================================================

/** 天赋稀有度 */
export type TalentRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** 职业定义 */
export interface ProfessionData {
  /** 职业唯一标识 */
  id: string;
  /** 职业名称 */
  name: string;
  /** 职业描述 */
  description: string;
  /** 图标（emoji或字符） */
  icon: string;
  /** 初始属性加成 */
  bonuses: Partial<PlayerStats>;
}

/** 天赋定义 */
export interface TalentData {
  /** 天赋唯一标识 */
  id: string;
  /** 天赋名称 */
  name: string;
  /** 天赋描述 */
  description: string;
  /** 稀有度 */
  rarity: TalentRarity;
  /** 效果 */
  effect: { type: string; value: number };
}

/** 出生地点定义 */
export interface BirthPlaceData {
  /** 地点唯一标识 */
  id: string;
  /** 地点名称 */
  name: string;
  /** 所属大域 */
  region: string;
  /** 地点描述 */
  description: string;
  /** 起始奖励（属性或物品） */
  startingBonus: Partial<PlayerCultivation> | { itemId: string; count: number };
}

/** 大域/世界域定义 */
export interface WorldDomainData {
  /** 大域唯一标识 */
  id: string;
  /** 大域名称 */
  name: string;
  /** 大域描述 */
  description: string;
  /** 地图光点颜色（十六进制数值） */
  color: number;
}

/** 声望数据 */
export interface ReputationData {
  /** 势力ID */
  factionId: string;
  /** 势力名称 */
  factionName: string;
  /** 声望值 -1000 ~ 1000 */
  value: number;
  /** 声望等级 */
  level: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'revered';
}

// ============================================================================
// 物品系统
// ============================================================================

/**
 * 物品定义
 * 背包/仓库中的道具、材料、丹药等
 */
export interface Item {
  /** 物品唯一标识 */
  id: string;
  /** 物品显示名称 */
  name: string;
  /** 物品类型 */
  type: ItemType;
  /** 稀有度 0-5 */
  rarity: Rarity;
  /** 当前堆叠数量 */
  quantity: number;
  /** 最大堆叠数量 */
  maxStack: number;
  /** 效果字典，key为效果类型，value为数值 */
  effects?: Record<string, number>;
  /** 物品描述 */
  description?: string;
  /** 图标资源ID */
  icon?: string;
}

// ============================================================================
// 功法系统
// ============================================================================

/**
 * 功法定义
 * 玩家修炼的战斗/辅助/修炼功法
 */
export interface Technique {
  /** 功法唯一标识 */
  id: string;
  /** 功法名称 */
  name: string;
  /** 五行属性倾向 */
  element: TechniqueElement;
  /** 功法类型 */
  type: TechniqueType;
  /** 当前等级 1-9 */
  level: number;
  /** 最高等级 */
  maxLevel: number;
  /** 效果字典 */
  effects: Record<string, number>;
  /** 功法描述 */
  description?: string;
}

// ============================================================================
// 大道/悟道系统
// ============================================================================

/**
 * 悟道节点
 * 大道树上的单个节点
 */
export interface DaoNode {
  /** 节点唯一标识 */
  id: string;
  /** 节点名称 */
  name: string;
  /** 当前等级 */
  level: number;
  /** 最高等级 */
  maxLevel: number;
  /** 每级消耗的悟道点数组，index对应等级-1 */
  cost: number[];
  /** 效果描述文本数组 */
  effects: string[];
  /** 是否已解锁 */
  unlocked: boolean;
  /** 前置节点ID列表 */
  requires?: string[];
}

/**
 * 大道/悟道路径
 * 一条完整的大道树，如"剑道"、"丹道"
 */
export interface DaoPath {
  /** 大道唯一标识 */
  id: string;
  /** 大道名称 */
  name: string;
  /** 所属五行元素 */
  element: string;
  /** 该大道下的所有节点 */
  nodes: DaoNode[];
  /** 大道描述 */
  description?: string;
}

// ============================================================================
// 门派系统
// ============================================================================

/**
 * 门派职位
 */
export interface SectPosition {
  /** 职位标识 */
  id: string;
  /** 职位名称，如 "外门弟子"、"内门长老" */
  name: string;
  /** 所需门派贡献/声望 */
  requiredRep: number;
  /** 职位福利描述列表 */
  benefits: string[];
}

/**
 * 门派定义
 */
export interface Sect {
  /** 门派唯一标识 */
  id: string;
  /** 门派名称 */
  name: string;
  /** 门派主修五行元素 */
  element: string;
  /** 门派背景描述 */
  description: string;
  /** 门派职位体系 */
  positions: SectPosition[];
}

/**
 * 玩家在门派中的成员信息
 */
export interface SectMembership {
  /** 所属门派ID */
  sectId: string;
  /** 当前职位ID */
  positionId: string;
  /** 门派贡献值 */
  reputation: number;
  /** 加入时间（游戏内年份） */
  joinedYear: number;
}

// ============================================================================
// 时间系统
// ============================================================================

/**
 * 游戏内时间
 * 采用年月制，每月拥有固定行动力
 */
export interface GameTime {
  /** 当前年份 */
  year: number;
  /** 当前月份 1-12 */
  month: number;
  /** 本月剩余行动力 */
  actionPoints: number;
  /** 每月行动力上限（由境界决定） */
  actionPointsMax: number;
}

// ============================================================================
// 事件系统
// ============================================================================

/**
 * 事件选项
 */
export interface GameEventChoice {
  /** 选项文本 */
  text: string;
  /** 选项效果字典 */
  effects: Record<string, number>;
  /** 选项是否可见（条件判断） */
  visible?: boolean;
  /** 前置条件描述 */
  condition?: string;
}

/**
 * 游戏事件
 * 修炼过程中触发的随机/剧情事件
 */
export interface GameEvent {
  /** 事件唯一标识 */
  id: string;
  /** 事件类型 */
  type: EventType;
  /** 事件标题 */
  title: string;
  /** 事件描述文本 */
  description: string;
  /** 事件选项列表 */
  choices?: GameEventChoice[];
  /** 事件触发权重（用于随机事件池） */
  weight?: number;
}

// ============================================================================
// 效果/增益系统
// ============================================================================

/**
 * 临时增益/减益效果
 * 丹药、功法、事件等产生的时效性效果
 */
export interface BuffEffect {
  /** 效果唯一标识 */
  id: string;
  /** 效果名称 */
  name: string;
  /** 影响的属性路径，如 "stats.attack"、"cultivation.exp" */
  targetPath: string;
  /** 数值变化量 */
  value: number;
  /** 效果类型：add-加法, multiply-乘法, set-设置 */
  mode: 'add' | 'multiply' | 'set';
  /** 剩余持续时间（月），-1表示永久 */
  remainingMonths: number;
  /** 效果来源 */
  source?: string;
}

// ============================================================================
// 世界进度
// ============================================================================

/**
 * 世界探索进度
 * 记录玩家在各区域/副本的探索状态
 */
export interface WorldProgress {
  /** 已解锁区域ID列表 */
  unlockedRegions: string[];
  /** 区域完成度 Record<区域ID, 完成百分比0-100> */
  regionProgress: Record<string, number>;
  /** 已击败BossID列表 */
  defeatedBosses: string[];
  /** 已完成剧情事件ID列表 */
  completedStoryEvents: string[];
}

// ============================================================================
// 状态更新与事务
// ============================================================================

/**
 * 单次状态更新操作
 * 用于 GameStateManager 的事务系统
 */
export interface StateUpdate {
  /** 目标状态路径，如 "player.cultivation.exp" */
  path: string;
  /** 操作类型 */
  operation: 'set' | 'add' | 'multiply' | 'delete';
  /** 操作值 */
  value: unknown;
  /** 更新来源标识，用于日志和调试 */
  source?: string;
}

// ============================================================================
// 存档相关
// ============================================================================

/**
 * 时间系统序列化状态
 */
export interface TimeSystemState {
  gameTime: GameTime;
  totalMonths: number;
  lastActiveTime: number;
}

/**
 * 修炼系统序列化状态
 */
export interface CultivationSystemState {
  spiritDensity: number;
  arrayBonus: number;
  techniqueBonus: number;
  breakthroughGuarantee: number;
  usedTreasures: string[];
}

/**
 * 存档数据完整结构
 */
export interface GameSaveData {
  /** 存档版本号，用于迁移 */
  version: string;
  /** 存档创建时间戳 */
  createdAt: number;
  /** 最后保存时间戳 */
  updatedAt: number;
  /** 玩家数据 */
  player: PlayerData;
  /** 游戏时间 */
  gameTime: GameTime;
  /** 已学功法 */
  techniques: Technique[];
  /** 背包物品 */
  inventory: Item[];
  /** 门派成员信息 */
  sectMembership?: SectMembership;
  /** 大道进度 */
  daoProgress: Record<string, DaoPath>;
  /** 世界探索进度 */
  worldProgress: WorldProgress;
  /** 当前激活的效果 */
  activeEffects: BuffEffect[];
  /** 游戏设置 */
  settings?: GameSettings;
  /** 图鉴解锁状态 */
  codexUnlocks?: CodexUnlocks;
  /** 传音符消息列表 */
  messages?: GameMessage[];
  /** 洞府状态 */
  dwelling?: DwellingState;
  /** 时间系统状态 */
  timeSystem?: TimeSystemState;
  /** 修炼系统状态 */
  cultivationSystem?: CultivationSystemState;
}

/**
 * 存档槽位信息（用于存档列表展示）
 */
export interface SaveSlotInfo {
  /** 槽位编号 */
  slot: number;
  /** 是否已存在存档 */
  exists: boolean;
  /** 玩家名称 */
  playerName?: string;
  /** 当前境界名称 */
  realmName?: string;
  /** 游戏内年份 */
  year?: number;
  /** 最后保存时间戳 */
  updatedAt?: number;
}

/**
 * 游戏设置
 */
export interface GameSettings {
  /** 主音量 0-1 */
  masterVolume: number;
  /** BGM音量 0-1 */
  bgmVolume: number;
  /** SFX音量 0-1 */
  sfxVolume: number;
  /** 是否静音 */
  muted: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number;
  /** 文字显示速度（ms/字） */
  textSpeed: number;
  /** 是否跳过已读事件 */
  skipReadEvents: boolean;
}

// ============================================================================
// 战斗系统
// ============================================================================

/** 战斗类型 */
export type BattleType = 'normal' | 'boss' | 'breakthrough' | 'arena';

/** 技能类型 */
export type SkillType = 'attack' | 'defense' | 'control' | 'heal' | 'buff';

/** 技能目标 */
export type SkillTarget = 'single' | 'all' | 'self';

/** 状态效果类型 */
export type StatusEffectType = 'buff' | 'debuff' | 'dot' | 'control';

/** 技能效果 */
export interface SkillEffect {
  /** 效果类型 */
  type: 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'dot' | 'control' | 'mana_regen' | 'lifesteal';
  /** 数值（百分比或固定值） */
  value: number;
  /** 是否百分比 */
  isPercent?: boolean;
  /** 持续回合 */
  duration?: number;
  /** 目标属性 */
  targetStat?: string;
  /** 附加状态ID */
  statusId?: string;
}

/** 神通/技能定义 */
export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  element: FiveElement;
  mpCost: number;
  power: number;
  target: SkillTarget;
  effects: SkillEffect[];
  cooldown: number;
  currentCooldown: number;
  description?: string;
}

/** 状态效果 */
export interface StatusEffect {
  id: string;
  name: string;
  type: StatusEffectType;
  duration: number;
  stacks?: number;
  maxStacks?: number;
  effects: { stat: string; value: number; mode?: 'add' | 'multiply' }[];
  source?: string;
}

/** 战斗单位 */
export interface CombatUnit {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  element: FiveElement;
  skills: Skill[];
  buffs: StatusEffect[];
  /** 破甲率 0-1 */
  defenseBreak?: number;
  /** 吸血率 0-1 */
  lifeSteal?: number;
  /** 反震率 0-1 */
  reflectRate?: number;
  /** 连击率 0-1 */
  comboRate?: number;
  /** 门派/功法类型标识 */
  classType?: string;
}

/** 伤害结果 */
export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isCombo?: boolean;
  elementModifier: number;
  isReflected?: boolean;
  reflectedDamage?: number;
  lifeStealHeal?: number;
}

/** 战斗日志条目 */
export interface BattleLogEntry {
  round: number;
  actor: 'player' | 'enemy';
  action: string;
  target: string;
  value?: number;
  isCrit?: boolean;
  element?: FiveElement;
  timestamp: number;
}

/** 回合结果 */
export interface TurnResult {
  actor: 'player' | 'enemy';
  action: string;
  damage?: DamageResult;
  healAmount?: number;
  manaChange?: number;
  newBuffs?: StatusEffect[];
  removedBuffs?: string[];
  isCombo?: boolean;
  logs: string[];
}

/** 回合开始处理结果 */
export interface TurnStartResult {
  skipped: boolean;
  dotDamage?: number;
  logs: string[];
}

/** 战斗状态 */
export interface BattleState {
  round: number;
  player: CombatUnit;
  enemy: CombatUnit;
  log: BattleLogEntry[];
  statusEffects: StatusEffect[];
  turnQueue: ('player' | 'enemy')[];
  isAuto: boolean;
}

/** 战斗结果 */
export interface BattleResult {
  victory: boolean;
  rounds: number;
  expGained: number;
  loot: Record<string, number>;
  playerHpRemaining: number;
  playerMpRemaining: number;
}

/** 玩家行动 */
export interface PlayerAction {
  type: 'attack' | 'skill' | 'defend' | 'item' | 'flee';
  skillId?: string;
  itemId?: string;
}

// ============================================================================
// 音频相关
// ============================================================================

/**
 * 音频轨道配置
 */
export interface AudioTrack {
  /** 轨道标识 */
  id: string;
  /** 音频资源URL */
  src: string;
  /** 是否循环播放 */
  loop: boolean;
  /** 基础音量 0-1 */
  baseVolume: number;
}

/**
 * 音效定义
 */
export interface SoundEffect {
  /** 音效标识 */
  id: string;
  /** 音频资源URL */
  src: string;
  /** 基础音量 0-1 */
  baseVolume: number;
  /** 是否允许同时播放多个实例 */
  polyphonic: boolean;
}

// ============================================================================
// 传音符系统
// ============================================================================

/** 游戏消息类型 */
export type MessageType = 'sect' | 'event' | 'npc' | 'system';

/** 游戏消息 */
export interface GameMessage {
  /** 消息唯一标识 */
  id: string;
  /** 发件人 */
  sender: string;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 消息类型 */
  type: MessageType;
  /** 游戏内时间戳 */
  timestamp: number;
  /** 是否已读 */
  read: boolean;
}

// ============================================================================
// 洞府系统
// ============================================================================

/** 已种植灵药 */
export interface PlantedHerb {
  /** 灵药ID */
  herbId: string;
  /** 种植时间（游戏内月份） */
  plantedAt: number;
  /** 预计成熟月份 */
  matureAt: number;
  /** 是否已收获 */
  harvested: boolean;
}

/** 洞府状态 */
export interface DwellingState {
  /** 聚灵阵等级 */
  arrayLevel: number;
  /** 药园等级 */
  gardenLevel: number;
  /** 当前种植的灵药列表 */
  plantedHerbs: PlantedHerb[];
  /** 是否正在修炼 */
  isCultivating: boolean;
  /** 修炼开始时间（游戏内月份） */
  cultivateStartMonth: number;
}

/** 图鉴解锁状态 */
export interface CodexUnlocks {
  [codexId: string]: boolean;
}
