/**
 * 游戏服务
 * 负责游戏的触发、动作处理、结果管理
 */

import { GameType } from '@/types/game';
import type { GameContext, GameResult, GameState } from '@/types/game';
import type { StorageDriver, StorageGameState } from './storage';
import { GameSettingsService } from './game-settings';
import { getGameHandler } from './game-handlers';
import { Game } from '@/entity/game';

/**
 * 将业务层 GameState 转换为持久化 StorageGameState
 */
function toStorageGameState(state: GameState): StorageGameState {
  return {
    id: state.id,
    gameId: state.gameType,
    characterId: state.characterId,
    sessionId: state.sessionId,
    state: state.stateData,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

/**
 * 将持久化 StorageGameState 转换为业务层 GameState
 */
function toGameState(storage: StorageGameState): GameState {
  return {
    id: storage.id,
    gameType: storage.gameId as GameType,
    characterId: storage.characterId,
    sessionId: storage.sessionId || '',
    stateData: storage.state,
    createdAt: storage.createdAt,
    updatedAt: storage.updatedAt,
  };
}

/**
 * 游戏服务类
 */
export class GameService {
  private settingsService: GameSettingsService;
  private storage: StorageDriver;

  constructor(settingsService: GameSettingsService, storage: StorageDriver) {
    this.settingsService = settingsService;
    this.storage = storage;
  }

  /**
   * 检查是否允许触发游戏（聊天触发模式）
   * @param sessionId 会话 ID
   */
  canTriggerGame(sessionId: string): boolean {
    return this.settingsService.canTriggerGame(sessionId);
  }

  /**
   * 聊天中触发小游戏
   * @param context 游戏上下文
   * @param gameType 游戏类型
   */
  async triggerMiniGame(
    context: GameContext,
    _gameType: string
  ): Promise<Game | null> {
    // 检查开关
    if (!this.canTriggerGame(context.sessionId)) {
      return null;
    }

    // 创建游戏状态
    const game = Game.createEscapeGame(
      context.characterId,
      context.sessionId,
      context.gameState.characterAbility || 50
    );

    // 保存游戏状态
    await this.storage.saveGameState(toStorageGameState(game));

    return game;
  }

  /**
   * 处理游戏动作
   * @param gameId 游戏 ID
   * @param action 动作类型
   * @param payload 动作参数
   */
  async processAction(
    gameId: string,
    action: string,
    payload: any
  ): Promise<GameResult | null> {
    // 获取游戏状态
    const storageState = await this.storage.getGameState(gameId);
    if (!storageState) {
      throw new Error('游戏状态不存在');
    }

    const gameState = toGameState(storageState);

    // 获取游戏处理器
    const handler = getGameHandler(gameState.gameType);
    
    // 处理动作
    const result = await handler.processAction(gameState.stateData, action, payload);

    // 更新游戏状态
    gameState.stateData = result.newState;
    gameState.updatedAt = Date.now();
    await this.storage.saveGameState(toStorageGameState(gameState));

    if (result.isEnd) {
      // 游戏结束，可以触发事件或回调
      console.log('游戏结束:', result.gameResult);
    }

    return result.gameResult;
  }

  /**
   * 独立游戏（不受开关影响）
   * @param gameType 游戏类型
   */
  async playStandaloneGame(gameType: string): Promise<GameResult> {
    const handler = getGameHandler(gameType);
    return handler.playStandalone();
  }

  /**
   * 获取游戏状态
   * @param gameId 游戏 ID
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    const storageState = await this.storage.getGameState(gameId);
    return storageState ? toGameState(storageState) : null;
  }

  /**
   * 获取会话的所有游戏状态
   * @param sessionId 会话 ID
   */
  async getSessionGames(sessionId: string): Promise<GameState[]> {
    const states = await this.storage.getGameStatesBySession(sessionId);
    return states.map(toGameState);
  }

  /**
   * 删除游戏状态
   * @param gameId 游戏 ID
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.storage.deleteGameState(gameId);
  }

  /**
   * 将游戏结果发送到聊天（作为消息）
   * 这个方法需要配合聊天服务使用
   * @param sessionId 会话 ID
   * @param result 游戏结果
   */
  async sendResultToChat(sessionId: string, result: GameResult): Promise<void> {
    // 这个方法需要由外部实现，因为需要访问聊天服务
    // 这里只提供一个事件或回调机制
    const event = new CustomEvent('game-result', {
      detail: {
        sessionId,
        result
      }
    });
    
    // 触发自定义事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
    
    console.log('游戏结果发送到聊天:', sessionId, result);
  }

  /**
   * 获取游戏设置服务
   */
  getSettingsService(): GameSettingsService {
    return this.settingsService;
  }
}

/**
 * 创建游戏服务实例
 */
export function createGameService(
  settingsService: GameSettingsService,
  storage: StorageDriver
): GameService {
  return new GameService(settingsService, storage);
}
