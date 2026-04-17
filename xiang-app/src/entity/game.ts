import { GameType, GameState, EscapeGameState, GameResult } from '@/types/game';
import { generateUUID } from '@/utils/uuid';

/**
 * 游戏状态实体类
 */
export class Game implements GameState {
  id: string = '';
  gameType: GameType = GameType.ESCAPE;
  characterId: string = '';
  sessionId: string = '';
  stateData: Record<string, any> = {};
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data?: Partial<Game>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): object {
    return {
      id: this.id,
      gameType: this.gameType,
      characterId: this.characterId,
      sessionId: this.sessionId,
      stateData: this.stateData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 从 JSON 对象创建游戏状态
   */
  static fromJSON(data: object): Game {
    return new Game(data);
  }

  /**
   * 创建逃跑游戏状态
   */
  static createEscapeGame(characterId: string, sessionId: string, characterAbility: number = 50): Game {
    return new Game({
      id: generateUUID(),
      gameType: GameType.ESCAPE,
      characterId,
      sessionId,
      stateData: {
        currentRoute: undefined,
        characterAbility,
        isEnded: false,
        success: undefined
      } as EscapeGameState,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * 获取逃跑游戏状态
   */
  getEscapeState(): EscapeGameState {
    return this.stateData as EscapeGameState;
  }

  /**
   * 更新逃跑游戏状态
   */
  updateEscapeState(state: Partial<EscapeGameState>): void {
    this.stateData = {
      ...this.stateData,
      ...state
    };
    this.updatedAt = Date.now();
  }

  /**
   * 判断游戏是否结束
   */
  isEnded(): boolean {
    return this.getEscapeState().isEnded;
  }

  /**
   * 获取游戏结果
   */
  getResult(): GameResult | null {
    const escapeState = this.getEscapeState();
    if (!escapeState.isEnded) {
      return null;
    }

    return {
      success: escapeState.success ?? false,
      description: escapeState.success 
        ? '你成功逃脱了！' 
        : '你被抓住了...',
      impactOnStory: escapeState.success 
        ? '角色成功逃脱，继续冒险。' 
        : '角色被抓住，剧情走向改变。'
    };
  }
}
