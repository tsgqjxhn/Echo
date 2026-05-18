/**
 * 游戏类型枚举
 */
export enum GameType {
  ESCAPE = 'escape', // 逃跑游戏
}

/**
 * 游戏状态接口
 */
export interface GameState {
  id: string;
  gameType: GameType;
  characterId: string;
  sessionId: string;
  stateData: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * 逃跑游戏状态
 */
export interface EscapeGameState {
  currentRoute?: string;
  characterAbility: number;
  isEnded: boolean;
  success?: boolean;
}

/**
 * 游戏结果
 */
export interface GameResult {
  success: boolean;
  description: string;
  impactOnStory: string;
}

/**
 * 游戏动作结果
 */
export interface GameActionResult {
  newState: Record<string, any>;
  isEnd: boolean;
  gameResult: GameResult;
}

/**
 * 逃跑游戏动作结果
 */
export interface EscapeActionResult extends GameActionResult {
  newState: EscapeGameState;
}

/**
 * 游戏消息通知类型
 */
export const GameNotificationType = {
  STAMINA_FULL: 'stamina_full',
} as const

export type GameNotificationTypeValue = typeof GameNotificationType[keyof typeof GameNotificationType]

/**
 * 游戏设置接口
 */
export interface GameSettings {
  globalEnabled: boolean;      // 全局开关
  sessionEnabled: Record<string, boolean>;  // 会话开关
  globalSoundEnabled: boolean; // 全局音效开关
  globalBgmEnabled: boolean;   // 全局背景音乐开关
  damageDisplayEnabled: boolean; // 伤害显示开关
  gameNotificationsEnabled: boolean; // 游戏消息推送开关
  gameNotifications: string[]; // 已订阅的游戏消息类型列表
}

/**
 * 游戏导出数据结构
 */
export interface GameExportData {
  gameId: string;
  saveData: any;
  exportedAt: number;
  version: string;
}

/**
 * AI 生成后导入本地游戏库的 H5 游戏
 */
export interface GeneratedGameLibraryItem {
  id: string;
  title: string;
  description?: string;
  html: string;
  sourceTaskId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 游戏上下文
 */
export interface GameContext {
  gameId: string;
  characterId: string;
  sessionId: string;
  gameState: Record<string, any>;
}

/**
 * 游戏处理器接口
 */
export interface GameHandler {
  processAction(
    state: Record<string, any>,
    action: string,
    payload: any
  ): Promise<GameActionResult>;
  playStandalone(): Promise<GameResult>;
}

/**
 * 逃跑游戏路线
 */
export interface EscapeRoute {
  id: string;
  name: string;
  icon: string;
  difficulty: number;
}
