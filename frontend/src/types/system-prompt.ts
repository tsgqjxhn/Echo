/**
 * 系统提示词类型定义
 * 对应 docs/底层提示词.md 中的8大类28个底层提示词
 */

/** 提示词分类 */
export type PromptCategory =
  | 'roleplay'
  | 'dialogue'
  | 'moments'
  | 'story'
  | 'meta'
  | 'multimodal'
  | 'safety'
  | 'character-creation';

/** 注入位置 */
export type InjectionPosition =
  | 'system-top'
  | 'system-middle'
  | 'system-bottom'
  | 'in-chat'
  | 'standalone';

/** 触发时机 */
export type TriggerTiming =
  | 'every-turn'
  | 'first-turn'
  | 'conditional'
  | 'scheduled'
  | 'standalone';

/** 系统提示词数据结构 */
export interface SystemPrompt {
  /** 唯一标识，如 "roleplay-persona-anchor" */
  id: string;
  /** 分类 */
  category: PromptCategory;
  /** 中文分类名 */
  categoryName: string;
  /** 中文名称 */
  name: string;
  /** 用途说明 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否使用高级版 */
  useAdvanced: boolean;
  /** 优先级 1-10，数值越大越靠近 system prompt 顶部 */
  priority: number;
  /** 注入位置 */
  injectionPosition: InjectionPosition;
  /** 触发时机 */
  triggerTiming: TriggerTiming;
  /** 基础版提示词模板 */
  basicPrompt: string;
  /** 增强版提示词模板 */
  advancedPrompt: string;
  /** 使用的变量列表 */
  variables: string[];
  /** 代码是否可替代 */
  codeReplaceable: boolean;
}

/** 分类元信息 */
export interface PromptCategoryMeta {
  key: PromptCategory;
  name: string;
  description: string;
  order: number;
}

/** 提示词存储结构 */
export interface SystemPromptStorage {
  version: string;
  updatedAt: string;
  prompts: SystemPrompt[];
}
