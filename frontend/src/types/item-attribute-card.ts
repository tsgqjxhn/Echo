export type ItemAttributeSettingTier = 'basic' | 'advanced'

export interface ItemAttributeCardData {
  item: {
    uid: string
    baseStats: string
    rarityValue: string
    attunementMusts: string
    keyAttributes: string
    accumulatorPoints: string
    eventFlags: string
    objectTree: string
    aspects: string
    construction: string
    culturalSignificance: string
    relationsLocation: string
    sentience: string
    juxtaposition: string
    triggersKeywords: string
    insertionPosition: string
    orderRecursion: string
    role: '' | 'system' | 'assistant'
    jsonSchemaPatch: string
  }
  attribute: {
    primaryAttributes: string
    derivedStatsResources: string
    skillsAbilities: string
    opposedPairsSliders: string
    mentalStateEmotion: string
    surfaceHiddenTraits: string
    outfitAppearanceState: string
    locationPosture: string
    knowledgeFlags: string
  }
}

export type ItemAttributeFieldType = 'text' | 'textarea' | 'select'

export interface ItemAttributeFieldDef {
  path: string
  label: string
  type: ItemAttributeFieldType
  placeholder?: string
  options?: string[]
  rows?: number
}

export interface ItemAttributeSectionDef {
  key: string
  title: string
  icon: string
  fields: ItemAttributeFieldDef[]
}

const ITEM_SECTIONS: ItemAttributeSectionDef[] = [
  {
    key: 'item-mechanics',
    title: '基础物理与机制维度',
    icon: '⚙️',
    fields: [
      { path: 'item.uid', label: '唯一标识符 (UID)', type: 'text', placeholder: '用于后台检索与跨场景追踪' },
      { path: 'item.baseStats', label: '基础物理属性 (Base Stats)', type: 'textarea', rows: 2, placeholder: '重量、尺寸体积、容量、耐久度上限等' },
      { path: 'item.rarityValue', label: '稀有度与价值 (Rarity & Value)', type: 'textarea', rows: 2, placeholder: '1-5星、交易价值、等级区间' },
      { path: 'item.attunementMusts', label: '使用前置/调谐要求 (Attunement/Musts)', type: 'textarea', rows: 3, placeholder: '必须穿戴、不可睡眠、属性要求、失败反馈等' },
      { path: 'item.keyAttributes', label: '关键机制参数 (Key Attributes)', type: 'textarea', rows: 2, placeholder: '伤害骰、生效距离、持续时间、激活命令词' },
      { path: 'item.accumulatorPoints', label: '状态累加器 (Accumulator/Points)', type: 'textarea', rows: 2, placeholder: '消耗次数、充能进度、能量阈值' },
      { path: 'item.eventFlags', label: '事件旗标库 (Event Flags)', type: 'textarea', rows: 2, placeholder: '已鉴定=True、已浸泡=False 等' },
      { path: 'item.objectTree', label: '对象树指针 (Object Tree)', type: 'textarea', rows: 2, placeholder: '当前容器、内部子物品、空间嵌套关系' },
    ],
  },
  {
    key: 'item-narrative',
    title: '叙事与世界观拓扑维度',
    icon: '🧭',
    fields: [
      { path: 'item.aspects', label: '叙事标签/面向 (Aspects)', type: 'textarea', rows: 2, placeholder: '沉重、限制活动、极度反光、硫磺味等' },
      { path: 'item.construction', label: '溯源与工艺 (Construction)', type: 'textarea', rows: 2, placeholder: '制造者、工艺、创造动机' },
      { path: 'item.culturalSignificance', label: '文化意义与分类 (Cultural Significance)', type: 'textarea', rows: 2, placeholder: '违禁品、宗教圣物、权力象征等' },
      { path: 'item.relationsLocation', label: '实体关系网络 (Relations & Location)', type: 'textarea', rows: 2, placeholder: '前任/现任主人、所属阵营、当前位置' },
      { path: 'item.sentience', label: '拟人化锚点 (Sentience)', type: 'textarea', rows: 2, placeholder: '性格、交流习惯、共鸣触发条件' },
      { path: 'item.juxtaposition', label: '环境并置逻辑 (Juxtaposition)', type: 'textarea', rows: 2, placeholder: '作为背景出现时伴随的血迹、纸张等线索' },
    ],
  },
  {
    key: 'item-ai-context',
    title: 'AI系统与上下文控制维度',
    icon: '🧠',
    fields: [
      { path: 'item.triggersKeywords', label: '激活触发词 (Triggers/Keywords)', type: 'textarea', rows: 2, placeholder: '触发该道具设定注入的精准词汇' },
      { path: 'item.insertionPosition', label: '上下文插入位置 (Insertion Position)', type: 'text', placeholder: '主提示词顶部/底部、对话前/后、作者注释等' },
      { path: 'item.orderRecursion', label: '加载权重与防递归控制 (Order & Recursion)', type: 'textarea', rows: 2, placeholder: 'Order、preventRecursion、防止无限嵌套' },
      { path: 'item.role', label: '角色认知视角 (Role)', type: 'select', options: ['', 'system', 'assistant'] },
      { path: 'item.jsonSchemaPatch', label: '动态结构化追踪 (JSON Schema/Patch)', type: 'textarea', rows: 3, placeholder: '每轮对话后更新当前状态、归属或消耗的结构化规则' },
    ],
  },
]

const ATTRIBUTE_SECTIONS: ItemAttributeSectionDef[] = [
  {
    key: 'attribute-mechanics',
    title: '核心数值与机制维度',
    icon: '📊',
    fields: [
      { path: 'attribute.primaryAttributes', label: '主属性 (Primary Attributes)', type: 'textarea', rows: 2, placeholder: '力量、敏捷、体质、智力、感知、魅力等' },
      { path: 'attribute.derivedStatsResources', label: '衍生状态与资源 (Derived Stats & Resources)', type: 'textarea', rows: 2, placeholder: 'HP、MP/体力、等级、根据主属性计算的资源' },
      { path: 'attribute.skillsAbilities', label: '技能与专长池 (Skills & Abilities)', type: 'textarea', rows: 2, placeholder: '潜行、说服、语言、火球术及熟练度/等级' },
    ],
  },
  {
    key: 'attribute-psychology',
    title: '叙事与心理维度',
    icon: '🎭',
    fields: [
      { path: 'attribute.opposedPairsSliders', label: '对立特质/性格滑块 (Opposed Pairs/Sliders)', type: 'textarea', rows: 2, placeholder: '顺从 vs 叛逆、勇敢 vs 谨慎等刻度' },
      { path: 'attribute.mentalStateEmotion', label: '心理状态与情感阈值 (Mental State & Emotion)', type: 'textarea', rows: 2, placeholder: '情绪、好感度、恐水症、幽闭恐惧等' },
      { path: 'attribute.surfaceHiddenTraits', label: '表层与隐藏特质 (Surface vs. Hidden Traits)', type: 'textarea', rows: 2, placeholder: '外在性格与高亲密度/高压力下暴露的隐藏特质' },
    ],
  },
  {
    key: 'attribute-dynamic-context',
    title: '动态上下文追踪维度',
    icon: '🧩',
    fields: [
      { path: 'attribute.outfitAppearanceState', label: '外观与着装状态 (Outfit & Appearance State)', type: 'textarea', rows: 2, placeholder: '当前穿着、污迹、武器是否拔出、伤口流血等' },
      { path: 'attribute.locationPosture', label: '位置与场景元数据 (Location & Posture)', type: 'textarea', rows: 2, placeholder: '确切位置、游戏内时间、物理姿态' },
      { path: 'attribute.knowledgeFlags', label: '知识与记忆旗标 (Knowledge Flags)', type: 'textarea', rows: 2, placeholder: '是否知道国王已死=False 等已知/未知情报' },
    ],
  },
]

export function getItemAttributeCardSections(tier: ItemAttributeSettingTier): ItemAttributeSectionDef[] {
  return tier === 'basic' ? ITEM_SECTIONS : ATTRIBUTE_SECTIONS
}

export function createEmptyItemAttributeCardData(): ItemAttributeCardData {
  return {
    item: {
      uid: '',
      baseStats: '',
      rarityValue: '',
      attunementMusts: '',
      keyAttributes: '',
      accumulatorPoints: '',
      eventFlags: '',
      objectTree: '',
      aspects: '',
      construction: '',
      culturalSignificance: '',
      relationsLocation: '',
      sentience: '',
      juxtaposition: '',
      triggersKeywords: '',
      insertionPosition: '',
      orderRecursion: '',
      role: '',
      jsonSchemaPatch: '',
    },
    attribute: {
      primaryAttributes: '',
      derivedStatsResources: '',
      skillsAbilities: '',
      opposedPairsSliders: '',
      mentalStateEmotion: '',
      surfaceHiddenTraits: '',
      outfitAppearanceState: '',
      locationPosture: '',
      knowledgeFlags: '',
    },
  }
}

export function hasItemAttributeCardContent(data: ItemAttributeCardData): boolean {
  return [...Object.values(data.item), ...Object.values(data.attribute)]
    .some(value => String(value || '').trim().length > 0)
}

export function buildItemAttributeCardSettings(data: ItemAttributeCardData): string {
  const lines: string[] = ['【物品/属性卡】']

  for (const section of [...ITEM_SECTIONS, ...ATTRIBUTE_SECTIONS]) {
    const sectionLines = section.fields
      .map(field => {
        const value = getItemAttributeValue(data, field.path)
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

function getItemAttributeValue(data: ItemAttributeCardData, path: string): unknown {
  return path.split('.').reduce<unknown>((target, key) => {
    if (!target || typeof target !== 'object') return undefined
    return (target as Record<string, unknown>)[key]
  }, data)
}
