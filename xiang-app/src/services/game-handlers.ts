/**
 * 游戏处理器模块
 * 包含各种小游戏的处理器实现
 */

import type { GameHandler, GameActionResult, GameResult, EscapeGameState, EscapeActionResult } from '@/types/game';

/**
 * 逃跑游戏处理器
 * 处理逃跑游戏的逻辑和动作
 */
export class EscapeGameHandler implements GameHandler {
  // 路线难度配置
  private readonly routeDifficulties: Record<string, number> = {
    forest: 30,  // 森林 - 中等难度
    mountain: 50, // 山路 - 困难
    river: 40,   // 河流 - 中等偏难
    road: 20     // 大路 - 简单
  };

  // 路线描述
  private readonly routeDescriptions: Record<string, string> = {
    forest: '茂密的森林，可以隐藏踪迹，但容易迷路',
    mountain: '崎岖的山路，难以追踪，但体力消耗大',
    river: '湍急的河流，可以掩盖气味，但有溺水风险',
    road: '平坦的大路，逃跑速度快，但容易被发现'
  };

  /**
   * 处理游戏动作
   * @param state 游戏状态
   * @param action 动作类型
   * @param payload 动作参数
   */
  async processAction(
    state: Record<string, any>,
    action: string,
    payload: any
  ): Promise<GameActionResult> {
    const escapeState = state as EscapeGameState;

    switch (action) {
      case 'choose_route':
        return this.handleRouteChoice(escapeState, payload.route);
      case 'use_item':
        return this.handleUseItem(escapeState, payload.itemId);
      default:
        throw new Error(`未知动作：${action}`);
    }
  }

  /**
   * 处理路线选择动作
   * @param state 当前游戏状态
   * @param route 选择的路线 ID
   */
  private handleRouteChoice(
    state: EscapeGameState,
    route: string
  ): EscapeActionResult {
    // 计算逃脱是否成功
    const success = this.calculateEscapeSuccess(state, route);

    // 创建新状态
    const newState: EscapeGameState = {
      ...state,
      currentRoute: route,
      isEnded: true,
      success
    };

    // 创建游戏结果
    const gameResult: GameResult = {
      success,
      description: success 
        ? '你成功逃脱了！' 
        : '你被抓住了...',
      impactOnStory: success 
        ? '角色成功逃脱，继续冒险。' 
        : '角色被抓住，剧情走向改变。'
    };

    return {
      newState,
      isEnd: true,
      gameResult
    };
  }

  /**
   * 处理道具使用动作
   * @param state 当前游戏状态
   * @param itemId 道具 ID
   */
  private handleUseItem(
    state: EscapeGameState,
    itemId: string
  ): EscapeActionResult {
    // 道具效果配置
    const itemEffects: Record<string, number> = {
      smoke_bomb: 20,    // 烟雾弹 - 增加 20% 成功率
      speed_potion: 15,  // 速度药水 - 增加 15% 成功率
      camouflage: 10     // 伪装道具 - 增加 10% 成功率
    };

    const effect = itemEffects[itemId] || 0;
    
    // 临时提升能力值
    const boostedState: EscapeGameState = {
      ...state,
      characterAbility: state.characterAbility + effect
    };

    // 使用道具后仍需选择路线，这里返回未结束状态
    return {
      newState: boostedState,
      isEnd: false,
      gameResult: {
        success: false,
        description: `使用了${this.getItemName(itemId)}，逃跑能力提升了${effect}%！`,
        impactOnStory: ''
      }
    };
  }

  /**
   * 计算逃脱成功率
   * @param state 游戏状态
   * @param route 选择的路线
   */
  private calculateEscapeSuccess(
    state: EscapeGameState,
    route: string
  ): boolean {
    const difficulty = this.getRouteDifficulty(route);
    const characterAbility = state.characterAbility || 50;
    
    // 计算成功率 = 能力值 - 难度
    const successRate = characterAbility - difficulty;
    
    // 生成随机数判断是否成功
    const random = Math.random() * 100;
    return random < successRate;
  }

  /**
   * 获取路线难度
   * @param route 路线 ID
   */
  private getRouteDifficulty(route: string): number {
    return this.routeDifficulties[route] || 50;
  }

  /**
   * 获取路线描述
   * @param route 路线 ID
   */
  getRouteDescription(route: string): string {
    return this.routeDescriptions[route] || '未知的路线';
  }

  /**
   * 获取道具名称
   * @param itemId 道具 ID
   */
  private getItemName(itemId: string): string {
    const names: Record<string, string> = {
      smoke_bomb: '烟雾弹',
      speed_potion: '速度药水',
      camouflage: '伪装道具'
    };
    return names[itemId] || '未知道具';
  }

  /**
   * 获取所有可用路线
   */
  getAvailableRoutes() {
    return Object.keys(this.routeDifficulties).map(id => ({
      id,
      name: this.getRouteName(id),
      icon: this.getRouteIcon(id),
      difficulty: this.routeDifficulties[id]
    }));
  }

  /**
   * 获取路线名称
   */
  private getRouteName(route: string): string {
    const names: Record<string, string> = {
      forest: '森林',
      mountain: '山路',
      river: '河流',
      road: '大路'
    };
    return names[route] || '未知路线';
  }

  /**
   * 获取路线图标
   */
  private getRouteIcon(route: string): string {
    const icons: Record<string, string> = {
      forest: '🌲',
      mountain: '⛰️',
      river: '🌊',
      road: '🛣️'
    };
    return icons[route] || '❓';
  }

  /**
   * 独立游戏模式
   * 不受开关影响的独立游戏体验
   */
  async playStandalone(): Promise<GameResult> {
    // 独立游戏模式创建一个简化版本
    const randomRoute = Object.keys(this.routeDifficulties)[
      Math.floor(Math.random() * Object.keys(this.routeDifficulties).length)
    ];
    
    const success = Math.random() > 0.5;
    
    return {
      success,
      description: success 
        ? `你选择从${this.getRouteName(randomRoute)}逃脱，成功！` 
        : `你选择从${this.getRouteName(randomRoute)}逃脱，但被抓住了...`,
      impactOnStory: ''
    };
  }
}

/**
 * 获取游戏处理器工厂方法
 * @param gameType 游戏类型
 */
export function getGameHandler(gameType: string): GameHandler {
  switch (gameType) {
    case 'escape':
      return new EscapeGameHandler();
    default:
      throw new Error(`未知游戏类型：${gameType}`);
  }
}
