export type GlobalSettingTier = 'basic' | 'advanced'

export interface GlobalCardData {
  visual: {
    narratorEnabled: boolean
    globalNarratorVoice: string
    globalBackgroundApng: string
    globalEnvironmentAudioBgm: string
  }
  system: {
    globalSystemPrompt: string
    outputFormattingRules: string
    jailbreakOocControl: string
    plotConnections: string
    roleConnections: string
  }
  world: {
    globalWorldInfoLorebook: string
    sharedKnowledgeConsensus: string
    worldToneAspect: string
  }
  state: {
    globalVariablesTracker: string
    globalEventSwitchesFlags: string
    dmNarratorActionValidator: string
  }
}

export type GlobalFieldType = 'text' | 'textarea' | 'checkbox'

export interface GlobalFieldDef {
  path: string
  label: string
  type: GlobalFieldType
  placeholder?: string
  rows?: number
}

export interface GlobalSectionDef {
  key: string
  title: string
  icon: string
  fields: GlobalFieldDef[]
}

const BASIC_SECTIONS: GlobalSectionDef[] = [
  {
    key: 'visual-rendering',
    title: '视听与多模态渲染词条',
    icon: '🎙️',
    fields: [
      { path: 'visual.narratorEnabled', label: '是否开启旁白', type: 'checkbox' },
      { path: 'visual.globalNarratorVoice', label: '全局旁白音色 (Global Narrator Voice)', type: 'textarea', rows: 2, placeholder: '独立于具体角色的 TTS 通道，用于环境描写、动作反馈、心理活动和系统裁决' },
      { path: 'visual.globalBackgroundApng', label: '全局背景图/动图 (Global Background/APNG)', type: 'textarea', rows: 2, placeholder: '主场景图像、动图或视频背景资源，以及触发背景切换的隐性环境标签' },
      { path: 'visual.globalEnvironmentAudioBgm', label: '全局环境音/BGM通道', type: 'textarea', rows: 2, placeholder: '绑定世界基调的底层音频通道，随日夜、地点或冲突强度变化' },
    ],
  },
  {
    key: 'system-formatting',
    title: '系统指令与格式规范词条',
    icon: '🧾',
    fields: [
      { path: 'system.globalSystemPrompt', label: '全局系统提示词 (Global System Prompt)', type: 'textarea', rows: 3, placeholder: '跨所有会话生效的最高优先级底层扮演框架' },
      { path: 'system.outputFormattingRules', label: '输出排版与路由规范 (Output Formatting Rules)', type: 'textarea', rows: 3, placeholder: '直接对话、环境旁白、隐藏 JSON 载荷等文本格式与前端路由规则' },
      { path: 'system.jailbreakOocControl', label: '越狱与OOC矫正规则 (Jailbreak/OOC Control)', type: 'textarea', rows: 3, placeholder: '维持沉浸感，防止打破第四面墙、拒绝剧情动作或偏离基调' },
      { path: 'system.plotConnections', label: '剧情连接规则', type: 'textarea', rows: 2, placeholder: '全局卡与剧情卡之间的剧情推进、节点同步和世界状态继承规则' },
      { path: 'system.roleConnections', label: '角色连接规则', type: 'textarea', rows: 2, placeholder: '全局卡与角色卡之间的人物入场、群聊关系和共享状态绑定规则' },
    ],
  },
]

const ADVANCED_SECTIONS: GlobalSectionDef[] = [
  {
    key: 'world-memory',
    title: '世界设定与共享记忆词条',
    icon: '🌐',
    fields: [
      { path: 'world.globalWorldInfoLorebook', label: '全局设定集/世界书 (Global World Info/Lorebook)', type: 'textarea', rows: 3, placeholder: '世界物理法则、历史渊源、组织架构等客观事实与动态注入规则' },
      { path: 'world.sharedKnowledgeConsensus', label: '世界共识与共享常识库 (Shared Knowledge/Consensus)', type: 'textarea', rows: 3, placeholder: '所有智能体默认知晓的信息，避免多角色同台时记忆底座不一致' },
      { path: 'world.worldToneAspect', label: '世界基调标签 (World Tone Aspect)', type: 'textarea', rows: 2, placeholder: '赛博朋克、中世纪暗黑、轻喜剧等会全局影响用词和事件概率的氛围标签' },
    ],
  },
  {
    key: 'state-logic',
    title: '状态追踪与逻辑游戏机制词条',
    icon: '🧮',
    fields: [
      { path: 'state.globalVariablesTracker', label: '全局变量追踪器 (Global Variables Tracker)', type: 'textarea', rows: 3, placeholder: '全局时间、天气、货币、好感度/声望等跨聊天和剧本的持久变量' },
      { path: 'state.globalEventSwitchesFlags', label: '全局事件开关/旗标 (Global Event Switches/Flags)', type: 'textarea', rows: 3, placeholder: '重大任务或节点状态的布尔值，防止逻辑漏洞和幻觉复活' },
      { path: 'state.dmNarratorActionValidator', label: 'DM/旁白动作裁决规则 (DM/Narrator Action Validator)', type: 'textarea', rows: 3, placeholder: '系统如何依据全局变量和环境法则，客观判定玩家动作并输出后果' },
    ],
  },
]

export function getGlobalCardSections(tier: GlobalSettingTier): GlobalSectionDef[] {
  return tier === 'basic' ? BASIC_SECTIONS : ADVANCED_SECTIONS
}

export function createEmptyGlobalCardData(): GlobalCardData {
  return {
    visual: {
      narratorEnabled: false,
      globalNarratorVoice: '',
      globalBackgroundApng: '',
      globalEnvironmentAudioBgm: '',
    },
    system: {
      globalSystemPrompt: '',
      outputFormattingRules: '',
      jailbreakOocControl: '',
      plotConnections: '',
      roleConnections: '',
    },
    world: {
      globalWorldInfoLorebook: '',
      sharedKnowledgeConsensus: '',
      worldToneAspect: '',
    },
    state: {
      globalVariablesTracker: '',
      globalEventSwitchesFlags: '',
      dmNarratorActionValidator: '',
    },
  }
}

export function hasGlobalCardContent(data: GlobalCardData): boolean {
  if (data.visual.narratorEnabled) return true
  return [
    ...Object.values(data.visual).filter(value => typeof value !== 'boolean'),
    ...Object.values(data.system),
    ...Object.values(data.world),
    ...Object.values(data.state),
  ].some(value => String(value || '').trim().length > 0)
}

export function buildGlobalCardSettings(data: GlobalCardData): string {
  const lines: string[] = ['【全局卡】']

  for (const section of [...BASIC_SECTIONS, ...ADVANCED_SECTIONS]) {
    const sectionLines = section.fields
      .map(field => {
        const value = getGlobalValue(data, field.path)
        if (field.type === 'checkbox') {
          return value === true ? `${field.label}：已开启` : ''
        }
        const text = String(value ?? '').trim()
        return text ? `${field.label}：${text}` : ''
      })
      .filter(Boolean)

    if (sectionLines.length > 0) {
      lines.push(`\n【${section.title}】`, ...sectionLines)
    }
  }

  return lines.length > 1 ? lines.join('\n').trim() : ''
}

function getGlobalValue(data: GlobalCardData, path: string): unknown {
  return path.split('.').reduce<unknown>((target, key) => {
    if (!target || typeof target !== 'object') return undefined
    return (target as Record<string, unknown>)[key]
  }, data)
}
