export type PlotSettingTier = 'basic' | 'advanced'
export type PlotSubCategory = '单线剧情' | '分支剧情' | '开放剧情'
export type PlotType = '单线剧情' | '多分支剧情' | '开放剧情'

export interface PlotCardData {
  basic: {
    plotName: string
    plotType: PlotType
    plotGoal: string
    keyEvents: string
    worldTone: string
    physicalLaw: string
    resourceState: string
    userControlBoundary: string
    npcPerspectiveRule: string
    forbidUserDecision: boolean
    forbidUserLine: boolean
    replyStep: string
    entryId: string
    triggerMechanism: string
    insertPosition: string
    worldToneTag: string
    narrativeRulesTag: string
    oocProtocolTag: string
    softRestartRule: string
    selfCorrectionRule: string
  }
  singleBranch: {
    nodeName: string
    nodeId: string
    primaryKeyword: string
    prerequisite: string
    excludeKeyword: string
    recursiveScan: string
    insertPosition: string
    plotEvent: string
    directives: string
    macroTrigger: string
    endingPreset: string
  }
  branchingRoute: {
    routeName: string
    routeStateId: string
    branchKeyword: string
    factionLine: string
    mutuallyExclusiveKeyword: string
    insertPosition: string
    routeState: string
    attitudeShift: string
    macroTrigger: string
    endingPreset: string
  }
  encyclopedia: {
    knowledgeName: string
    placeName: string
    npcName: string
    itemName: string
    spellName: string
    primaryKeyword: string
    triggerProbability: string
    recursiveTrigger: string
    insertPosition: string
    encyclopediaDescription: string
    interactionRules: string
    randomEventHooks: string
  }
  trigger: {
    keywordSynonyms: string
    keywordScope: string
    notAny: string
    andAll: string
    recursiveScan: string
    triggerProbability: string
    insertDepth: string
    priority: string
    cooldown: string
    forbiddenCondition: string
  }
  randomEvent: {
    eventName: string
    eventScene: string
    eventStrength: string
    availableCharacters: string
    encounterDescription: string
    followupHint: string
    cooldownCondition: string
    forbiddenCondition: string
  }
  narrative: {
    environmentDetailDensity: string
    timeProgressGranularity: string
    atmospherePreference: string
    conflictIntensity: string
    clueVisibility: string
    npcReactionIntensity: string
    userChoiceHintStyle: string
    oocSoftRestartLine: string
    selfCorrectionLine: string
  }
}

export type PlotFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number'

export interface PlotFieldDef {
  path: string
  label: string
  type: PlotFieldType
  placeholder?: string
  options?: string[]
  min?: number
  max?: number
  rows?: number
  wide?: boolean
}

export interface PlotSectionDef {
  key: string
  title: string
  scope: 'common' | 'single' | 'branch' | 'open'
  fields: PlotFieldDef[]
}

export const PLOT_SUBCATEGORY_TABS: Array<{ value: PlotSubCategory; label: PlotType }> = [
  { value: '单线剧情', label: '单线剧情' },
  { value: '分支剧情', label: '多分支剧情' },
  { value: '开放剧情', label: '开放剧情' },
]

export function normalizePlotSubCategory(value?: string | null): PlotSubCategory {
  if (value === '单线剧情') return '单线剧情'
  if (value === '开放剧情') return '开放剧情'
  return '分支剧情'
}

export function plotTypeFromSubCategory(value?: string | null): PlotType {
  const normalized = normalizePlotSubCategory(value)
  return normalized === '分支剧情' ? '多分支剧情' : normalized
}

export function subCategoryFromPlotType(value?: string | null): PlotSubCategory {
  if (value === '单线剧情') return '单线剧情'
  if (value === '开放剧情') return '开放剧情'
  return '分支剧情'
}

export function createEmptyPlotCardData(subCategory?: string | null): PlotCardData {
  return {
    basic: {
      plotName: '',
      plotType: plotTypeFromSubCategory(subCategory),
      plotGoal: '',
      keyEvents: '',
      worldTone: '',
      physicalLaw: '',
      resourceState: '',
      userControlBoundary: '',
      npcPerspectiveRule: '',
      forbidUserDecision: true,
      forbidUserLine: true,
      replyStep: '一次回复只推进一个明确剧情动作或一个短场景。',
      entryId: '',
      triggerMechanism: '常驻开启',
      insertPosition: '作者备注顶部 / Depth 0',
      worldToneTag: '<World_Tone>',
      narrativeRulesTag: '<Narrative_Rules>',
      oocProtocolTag: '<OOC_Protocol>',
      softRestartRule: '',
      selfCorrectionRule: '',
    },
    singleBranch: {
      nodeName: '',
      nodeId: '',
      primaryKeyword: '',
      prerequisite: '',
      excludeKeyword: '',
      recursiveScan: '开启',
      insertPosition: '角色设定后',
      plotEvent: '<Plot_Event>',
      directives: '<Directives>',
      macroTrigger: '<Macro_Trigger>',
      endingPreset: '',
    },
    branchingRoute: {
      routeName: '',
      routeStateId: '',
      branchKeyword: '',
      factionLine: '',
      mutuallyExclusiveKeyword: '',
      insertPosition: '示例对话后',
      routeState: '<Route_State>',
      attitudeShift: '<Attitude_Shift>',
      macroTrigger: '<Macro_Trigger>',
      endingPreset: '',
    },
    encyclopedia: {
      knowledgeName: '',
      placeName: '',
      npcName: '',
      itemName: '',
      spellName: '',
      primaryKeyword: '',
      triggerProbability: '100',
      recursiveTrigger: '按需递归',
      insertPosition: '示例对话前',
      encyclopediaDescription: '<Encyclopedia>',
      interactionRules: '<Interaction_Rules>',
      randomEventHooks: '<Random_Events>',
    },
    trigger: {
      keywordSynonyms: '',
      keywordScope: '',
      notAny: '',
      andAll: '',
      recursiveScan: '开启',
      triggerProbability: '100',
      insertDepth: '0',
      priority: '100',
      cooldown: '',
      forbiddenCondition: '',
    },
    randomEvent: {
      eventName: '',
      eventScene: '',
      eventStrength: '',
      availableCharacters: '',
      encounterDescription: '',
      followupHint: '',
      cooldownCondition: '',
      forbiddenCondition: '',
    },
    narrative: {
      environmentDetailDensity: '',
      timeProgressGranularity: '',
      atmospherePreference: '',
      conflictIntensity: '',
      clueVisibility: '',
      npcReactionIntensity: '',
      userChoiceHintStyle: '',
      oocSoftRestartLine: '',
      selfCorrectionLine: '',
    },
  }
}

const basicSections: PlotSectionDef[] = [
  {
    key: 'basic-info',
    title: '基础信息',
    scope: 'common',
    fields: [
      { path: 'basic.plotName', label: '剧情名称', type: 'text', placeholder: '例如：雨夜档案', wide: true },
      { path: 'basic.plotType', label: '剧情类型', type: 'select', options: ['单线剧情', '多分支剧情', '开放剧情'] },
      { path: 'basic.plotGoal', label: '一句话剧情目标', type: 'textarea', rows: 2, placeholder: '玩家在这段剧情中最终想达成什么' },
      { path: 'basic.keyEvents', label: '关键事件/节点', type: 'textarea', rows: 2, placeholder: '必须发生、已发生或待触发的关键剧情节点' },
      { path: 'basic.worldTone', label: '世界基调', type: 'textarea', rows: 2, placeholder: '整体氛围、时代感、题材气质' },
      { path: 'basic.physicalLaw', label: '世界物理法则', type: 'textarea', rows: 2, placeholder: '现实/超自然/科幻规则边界' },
      { path: 'basic.resourceState', label: '背景资源状态', type: 'textarea', rows: 2, placeholder: '地点、道具、组织、资料是否已准备' },
      { path: 'basic.userControlBoundary', label: '用户可控边界', type: 'textarea', rows: 2, placeholder: '哪些行为必须由用户主动选择' },
      { path: 'basic.npcPerspectiveRule', label: 'NPC视角锁定规则', type: 'textarea', rows: 2, placeholder: 'NPC知道什么、不能越权知道什么' },
      { path: 'basic.forbidUserDecision', label: '禁止替用户做决定', type: 'checkbox' },
      { path: 'basic.forbidUserLine', label: '禁止代写用户台词', type: 'checkbox' },
      { path: 'basic.replyStep', label: '单次回复推进步长', type: 'textarea', rows: 2 },
    ],
  },
  {
    key: 'core-rules',
    title: '常驻核心规则',
    scope: 'common',
    fields: [
      { path: 'basic.entryId', label: '词条标识', type: 'text', placeholder: '例如：plot-core-rules' },
      { path: 'basic.triggerMechanism', label: '触发机制', type: 'text' },
      { path: 'basic.insertPosition', label: '插入位置', type: 'text' },
      { path: 'basic.worldToneTag', label: '世界基调标签', type: 'text' },
      { path: 'basic.narrativeRulesTag', label: '叙事规则标签', type: 'text' },
      { path: 'basic.oocProtocolTag', label: 'OOC矫正规则标签', type: 'text' },
      { path: 'basic.softRestartRule', label: '剧情软重启规则', type: 'textarea', rows: 2 },
      { path: 'basic.selfCorrectionRule', label: '自我矫正规则', type: 'textarea', rows: 2 },
    ],
  },
  {
    key: 'single-node',
    title: '单分支剧情节点',
    scope: 'single',
    fields: [
      { path: 'singleBranch.nodeName', label: '剧情节点名称', type: 'text' },
      { path: 'singleBranch.nodeId', label: '剧情节点标识', type: 'text' },
      { path: 'singleBranch.primaryKeyword', label: '首要关键字', type: 'text' },
      { path: 'singleBranch.prerequisite', label: '前置剧情条件', type: 'textarea', rows: 2 },
      { path: 'singleBranch.excludeKeyword', label: '后续剧情排除关键字', type: 'text' },
      { path: 'singleBranch.recursiveScan', label: '递归扫描', type: 'select', options: ['开启', '关闭'] },
      { path: 'singleBranch.insertPosition', label: '插入位置', type: 'text' },
      { path: 'singleBranch.plotEvent', label: '当前强制事件', type: 'text' },
      { path: 'singleBranch.directives', label: '剧情推进指令', type: 'text' },
      { path: 'singleBranch.macroTrigger', label: '剧情状态变量锁', type: 'text' },
    ],
  },
  {
    key: 'branch-route',
    title: '多分支路线状态',
    scope: 'branch',
    fields: [
      { path: 'branchingRoute.routeName', label: '路线名称', type: 'text' },
      { path: 'branchingRoute.routeStateId', label: '路线状态标识', type: 'text' },
      { path: 'branchingRoute.branchKeyword', label: '分歧触发关键字', type: 'text' },
      { path: 'branchingRoute.factionLine', label: '阵营选择台词', type: 'textarea', rows: 2 },
      { path: 'branchingRoute.mutuallyExclusiveKeyword', label: '互斥路线排除关键字', type: 'text' },
      { path: 'branchingRoute.insertPosition', label: '插入位置', type: 'text' },
      { path: 'branchingRoute.routeState', label: '路线世界状态', type: 'text' },
      { path: 'branchingRoute.attitudeShift', label: '角色态度永久转变', type: 'text' },
      { path: 'branchingRoute.macroTrigger', label: '阵营变量 / 路线变量', type: 'text' },
    ],
  },
]

const advancedSections: PlotSectionDef[] = [
  {
    key: 'open-encyclopedia',
    title: '开放式百科词条',
    scope: 'open',
    fields: [
      { path: 'encyclopedia.knowledgeName', label: '知识点名称', type: 'text' },
      { path: 'encyclopedia.placeName', label: '地点名称', type: 'text' },
      { path: 'encyclopedia.npcName', label: 'NPC名称', type: 'text' },
      { path: 'encyclopedia.itemName', label: '特殊物品名', type: 'text' },
      { path: 'encyclopedia.spellName', label: '法术名', type: 'text' },
      { path: 'encyclopedia.primaryKeyword', label: '首要关键字', type: 'text' },
      { path: 'encyclopedia.triggerProbability', label: '触发概率', type: 'number', min: 0, max: 100 },
      { path: 'encyclopedia.recursiveTrigger', label: '递归触发设置', type: 'text' },
      { path: 'encyclopedia.insertPosition', label: '插入位置', type: 'text' },
      { path: 'encyclopedia.encyclopediaDescription', label: '客观百科描述', type: 'textarea', rows: 2 },
      { path: 'encyclopedia.interactionRules', label: '场景互动规则', type: 'textarea', rows: 2 },
      { path: 'encyclopedia.randomEventHooks', label: '随机事件钩子库', type: 'textarea', rows: 2 },
    ],
  },
  {
    key: 'trigger-detail',
    title: '触发精细化',
    scope: 'common',
    fields: [
      { path: 'trigger.keywordSynonyms', label: '关键词同义词', type: 'text' },
      { path: 'trigger.keywordScope', label: '关键词泛化范围', type: 'text' },
      { path: 'trigger.notAny', label: 'NOT ANY 排除词', type: 'text' },
      { path: 'trigger.andAll', label: 'AND ALL 前置锁', type: 'text' },
      { path: 'trigger.recursiveScan', label: '递归扫描开关', type: 'select', options: ['开启', '关闭'] },
      { path: 'trigger.triggerProbability', label: '触发概率', type: 'number', min: 0, max: 100 },
      { path: 'trigger.insertDepth', label: '插入深度', type: 'number', min: 0, max: 99 },
      { path: 'trigger.priority', label: '优先级', type: 'number', min: 0, max: 999 },
      { path: 'trigger.cooldown', label: '触发冷却', type: 'text' },
      { path: 'trigger.forbiddenCondition', label: '禁止触发条件', type: 'textarea', rows: 2 },
    ],
  },
  {
    key: 'random-events',
    title: '随机事件库',
    scope: 'common',
    fields: [
      { path: 'randomEvent.eventName', label: '事件名称', type: 'text' },
      { path: 'randomEvent.eventScene', label: '事件触发场景', type: 'text' },
      { path: 'randomEvent.eventStrength', label: '事件强度', type: 'select', options: ['低', '中', '高', '危急'] },
      { path: 'randomEvent.availableCharacters', label: '可出现角色', type: 'text' },
      { path: 'randomEvent.encounterDescription', label: '随机遭遇描述', type: 'textarea', rows: 2 },
      { path: 'randomEvent.followupHint', label: '事件后续提示', type: 'textarea', rows: 2 },
      { path: 'randomEvent.cooldownCondition', label: '事件冷却条件', type: 'text' },
      { path: 'randomEvent.forbiddenCondition', label: '事件禁发条件', type: 'textarea', rows: 2 },
    ],
  },
  {
    key: 'narrative-detail',
    title: '叙事表现细项',
    scope: 'common',
    fields: [
      { path: 'narrative.environmentDetailDensity', label: '环境细节密度', type: 'select', options: ['低', '中', '高'] },
      { path: 'narrative.timeProgressGranularity', label: '时间推进颗粒度', type: 'select', options: ['一句一拍', '一回合一小步', '一幕一推进'] },
      { path: 'narrative.atmospherePreference', label: '氛围描写偏好', type: 'text' },
      { path: 'narrative.conflictIntensity', label: '冲突强度', type: 'select', options: ['低', '中', '高'] },
      { path: 'narrative.clueVisibility', label: '线索显性程度', type: 'select', options: ['隐性', '适中', '显性'] },
      { path: 'narrative.npcReactionIntensity', label: 'NPC反应强度', type: 'select', options: ['克制', '自然', '强烈'] },
      { path: 'narrative.userChoiceHintStyle', label: '用户选择提示方式', type: 'text' },
      { path: 'narrative.oocSoftRestartLine', label: 'OOC软重启话术', type: 'textarea', rows: 2 },
      { path: 'narrative.selfCorrectionLine', label: '自我矫正话术', type: 'textarea', rows: 2 },
    ],
  },
]

const singleEndingPresetField: PlotFieldDef = {
  path: 'singleBranch.endingPreset',
  label: '结局预设',
  type: 'textarea',
  rows: 2,
  placeholder: '单线剧情的默认结局、失败结局或回收方式',
}

const branchEndingPresetField: PlotFieldDef = {
  path: 'branchingRoute.endingPreset',
  label: '结局预设',
  type: 'textarea',
  rows: 2,
  placeholder: '各路线可能抵达的结局、锁定条件与回收方式',
}

function withScopedBasicFields(sections: PlotSectionDef[], subCategory?: string | null): PlotSectionDef[] {
  const normalized = normalizePlotSubCategory(subCategory)
  const endingField = normalized === '单线剧情'
    ? singleEndingPresetField
    : normalized === '分支剧情'
      ? branchEndingPresetField
      : null

  if (!endingField) {
    return sections
  }

  return sections.map(section => {
    if (section.key !== 'basic-info') {
      return section
    }

    const insertAfter = section.fields.findIndex(field => field.path === 'basic.npcPerspectiveRule')
    const fields = [...section.fields]
    fields.splice(insertAfter >= 0 ? insertAfter + 1 : fields.length, 0, endingField)
    return { ...section, fields }
  })
}

export function getPlotCardSections(tier: PlotSettingTier, subCategory?: string | null): PlotSectionDef[] {
  const normalized = normalizePlotSubCategory(subCategory)
  const scope = normalized === '单线剧情' ? 'single' : normalized === '开放剧情' ? 'open' : 'branch'
  const sections = tier === 'basic' ? withScopedBasicFields(basicSections, normalized) : advancedSections
  return sections.filter(section => section.scope === 'common' || section.scope === scope)
}

export function hasPlotCardContent(data: PlotCardData): boolean {
  const checks = [
    data.basic.plotName,
    data.basic.plotGoal,
    data.basic.keyEvents,
    data.basic.worldTone,
    data.basic.physicalLaw,
    data.basic.resourceState,
    data.basic.userControlBoundary,
    data.basic.npcPerspectiveRule,
    data.basic.entryId,
    data.basic.softRestartRule,
    data.basic.selfCorrectionRule,
    data.singleBranch.nodeName,
    data.singleBranch.nodeId,
    data.singleBranch.primaryKeyword,
    data.singleBranch.prerequisite,
    data.singleBranch.endingPreset,
    data.branchingRoute.routeName,
    data.branchingRoute.routeStateId,
    data.branchingRoute.branchKeyword,
    data.branchingRoute.factionLine,
    data.branchingRoute.endingPreset,
    data.encyclopedia.knowledgeName,
    data.encyclopedia.placeName,
    data.encyclopedia.npcName,
    data.encyclopedia.itemName,
    data.encyclopedia.spellName,
    data.trigger.keywordSynonyms,
    data.trigger.keywordScope,
    data.trigger.notAny,
    data.trigger.andAll,
    data.randomEvent.eventName,
    data.randomEvent.eventScene,
    data.randomEvent.encounterDescription,
    data.narrative.atmospherePreference,
    data.narrative.oocSoftRestartLine,
    data.narrative.selfCorrectionLine,
  ]
  return checks.some(value => String(value || '').trim().length > 0)
}

export function buildPlotCardSettings(data: PlotCardData, subCategory?: string | null): string {
  const lines: string[] = ['【剧情卡】']
  for (const section of [...getPlotCardSections('basic', subCategory), ...getPlotCardSections('advanced', subCategory)]) {
    const sectionLines = section.fields
      .map(field => {
        const value = getPlotValue(data, field.path)
        if (field.type === 'checkbox') {
          return `${field.label}：${value ? '是' : '否'}`
        }
        const text = String(value ?? '').trim()
        return text ? `${field.label}：${text}` : ''
      })
      .filter(Boolean)

    if (sectionLines.length > 0) {
      lines.push(`\n【${section.title}】`, ...sectionLines)
    }
  }
  return lines.join('\n').trim()
}

function getPlotValue(data: PlotCardData, path: string): unknown {
  return path.split('.').reduce<unknown>((target, key) => {
    if (!target || typeof target !== 'object') return undefined
    return (target as Record<string, unknown>)[key]
  }, data)
}
