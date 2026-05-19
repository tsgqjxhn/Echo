export type GameSettingTier = 'basic' | 'advanced'
export type GameTriggerType = 'embedded' | 'external'

export interface GameCardData {
  basic: {
    initializationTriggerType: GameTriggerType | ''
    preConditionValidationArray: string
    fallbackFeedbackPointer: string
    contextualEntryVector: string
    stateTerminationHeuristics: string
    interruptHandlingProtocol: string
    exitTransitionPointer: string
    entityBindId: string
    diegeticIntegrationFlag: string
    variableScopeMarshalingMap: string
    failureStateSeverity: string
    dynamicDifficultyIndex: string
    skipAuthorizationFlag: boolean
    inputModalityMask: string
  }
  advanced: {
    affinityMutationScalar: string
    dynamicBanterInjectionQueue: string
    grindRewardRatio: string
    adaptiveFailureAdjustment: string
    bypassRewardPenalty: string
    rollbackImmunityStatus: boolean
    saveBlockerDirective: boolean
    garbageCollectionTrigger: string
    audioChannelCrossfadeProtocol: string
  }
}

export type GameFieldType = 'text' | 'textarea' | 'select' | 'checkbox'

export interface GameFieldDef {
  path: string
  label: string
  type: GameFieldType
  placeholder?: string
  options?: string[]
  rows?: number
}

export interface GameSectionDef {
  key: string
  title: string
  icon: string
  fields: GameFieldDef[]
}

const BASIC_SECTIONS: GameSectionDef[] = [
  {
    key: 'lifecycle',
    title: '生命周期与时序控制',
    icon: '⏱️',
    fields: [
      { path: 'basic.initializationTriggerType', label: '初始化触发器类型', type: 'select', options: ['', 'embedded', 'external'] },
      { path: 'basic.preConditionValidationArray', label: '前置条件与资源校验阵列', type: 'textarea', rows: 2, placeholder: '如：持有钥匙道具、全局等级≥10' },
      { path: 'basic.fallbackFeedbackPointer', label: '退回反馈指针', type: 'text', placeholder: '校验失败时返回的提示代码或文案' },
      { path: 'basic.contextualEntryVector', label: '上下文过渡向量', type: 'text', placeholder: '淡入淡出 / 半透明覆盖' },
      { path: 'basic.stateTerminationHeuristics', label: '状态终止启发式条件', type: 'textarea', rows: 2, placeholder: '积分阈值、倒计时归零等' },
      { path: 'basic.interruptHandlingProtocol', label: '中断处理协议', type: 'select', options: ['', '严格锁定', '无惩罚软性中止', '带有惩罚的硬性投降'] },
      { path: 'basic.exitTransitionPointer', label: '退出转场映射', type: 'textarea', rows: 2, placeholder: '胜利/失败后桥接的剧情分支' },
    ],
  },
  {
    key: 'entity',
    title: '实体绑定与世界观叙事',
    icon: '🎭',
    fields: [
      { path: 'basic.entityBindId', label: '核心实体绑定识别码', type: 'text', placeholder: '绑定角色 ID 或名称' },
      { path: 'basic.diegeticIntegrationFlag', label: '故事空间融入度标记', type: 'select', options: ['', '写实级', '隐喻级', '系统级'] },
    ],
  },
  {
    key: 'economy-basic',
    title: '经济系统与数据流转（基础）',
    icon: '💱',
    fields: [
      { path: 'basic.variableScopeMarshalingMap', label: '变量作用域编组映射图', type: 'textarea', rows: 3, placeholder: '全局变量推入/拉取规则' },
      { path: 'basic.failureStateSeverity', label: '失败状态后果层级', type: 'select', options: ['', '原地踏步 (Win or stay put)', '硬性死亡 (Win or Suffer)'] },
      { path: 'basic.dynamicDifficultyIndex', label: '动态难度指数接收', type: 'text', placeholder: '读取全局难度并映射挑战参数' },
      { path: 'basic.skipAuthorizationFlag', label: '强制跳过许可授权', type: 'checkbox' },
      { path: 'basic.inputModalityMask', label: '输入模态掩码设定', type: 'text', placeholder: '如：屏蔽回车、空格' },
    ],
  },
]

const ADVANCED_SECTIONS: GameSectionDef[] = [
  {
    key: 'entity-advanced',
    title: '实体绑定（高级）',
    icon: '✨',
    fields: [
      { path: 'advanced.affinityMutationScalar', label: '好感度与阵营变异乘数', type: 'text', placeholder: '表现评级 → 全局关系变量加成' },
      { path: 'advanced.dynamicBanterInjectionQueue', label: '动态交互注入序列', type: 'textarea', rows: 3, placeholder: '连击/成就时角色台词或语音' },
    ],
  },
  {
    key: 'economy-advanced',
    title: '经济系统（高级）',
    icon: '📉',
    fields: [
      { path: 'advanced.grindRewardRatio', label: '重玩收益衰减曲线', type: 'text', placeholder: '外联游戏收益递减算法' },
      { path: 'advanced.adaptiveFailureAdjustment', label: '自适应失败削弱机制', type: 'textarea', rows: 2, placeholder: '多次失败后下调通关阈值' },
      { path: 'advanced.bypassRewardPenalty', label: '旁路资源惩罚核算', type: 'textarea', rows: 2, placeholder: '跳过后清零的经验/金币/好感' },
    ],
  },
  {
    key: 'governance',
    title: '底层技术治理与防崩溃',
    icon: '🛡️',
    fields: [
      { path: 'advanced.rollbackImmunityStatus', label: '系统回溯免疫状态', type: 'checkbox' },
      { path: 'advanced.saveBlockerDirective', label: '硬存档禁止指令', type: 'checkbox' },
      { path: 'advanced.garbageCollectionTrigger', label: '垃圾回收触发器指令', type: 'text', placeholder: '游戏结束后的内存释放策略' },
      { path: 'advanced.audioChannelCrossfadeProtocol', label: '音频通道平滑交叉协议', type: 'text', placeholder: '小游戏 BGM 与主引擎音乐交替' },
    ],
  },
]

export function getGameCardSections(tier: GameSettingTier): GameSectionDef[] {
  return tier === 'basic' ? BASIC_SECTIONS : ADVANCED_SECTIONS
}

export function createEmptyGameCardData(): GameCardData {
  return {
    basic: {
      initializationTriggerType: '',
      preConditionValidationArray: '',
      fallbackFeedbackPointer: '',
      contextualEntryVector: '',
      stateTerminationHeuristics: '',
      interruptHandlingProtocol: '',
      exitTransitionPointer: '',
      entityBindId: '',
      diegeticIntegrationFlag: '',
      variableScopeMarshalingMap: '',
      failureStateSeverity: '',
      dynamicDifficultyIndex: '',
      skipAuthorizationFlag: false,
      inputModalityMask: '',
    },
    advanced: {
      affinityMutationScalar: '',
      dynamicBanterInjectionQueue: '',
      grindRewardRatio: '',
      adaptiveFailureAdjustment: '',
      bypassRewardPenalty: '',
      rollbackImmunityStatus: false,
      saveBlockerDirective: false,
      garbageCollectionTrigger: '',
      audioChannelCrossfadeProtocol: '',
    },
  }
}

export function hasGameCardContent(data: GameCardData): boolean {
  const values = [
    ...Object.values(data.basic),
    ...Object.values(data.advanced),
  ]
  return values.some(value => (typeof value === 'boolean' ? value : String(value || '').trim().length > 0))
}

export function buildGameCardSettings(data: GameCardData): Record<string, unknown> {
  return { gameCard: JSON.parse(JSON.stringify(data)) }
}

export function triggerTypeLabel(value: GameTriggerType | ''): string {
  if (value === 'embedded') return '内嵌式'
  if (value === 'external') return '外联式'
  return '未设置'
}
