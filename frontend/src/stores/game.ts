/**
 * 游戏状态管理
 * 使用 Pinia 管理游戏相关状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameResult, GameSettings, EscapeRoute, GameExportData } from '@/types/game'
import { getStorageDriver } from '@/services/storage'
import { GameSettingsService } from '@/services/game-settings'
import { GameService } from '@/services/game'
import { Game } from '@/entity/game'

/**
 * 游戏 Store
 */
export const useGameStore = defineStore('game', () => {
  // 状态
  const currentGame = ref<GameState | null>(null)
  const isPlaying = ref(false)
  const gameSettings = ref<GameSettings | null>(null)
  const sessionGames = ref<GameState[]>([])

  // 服务实例（懒加载）
  let settingsServiceInstance: GameSettingsService | null = null
  let gameServiceInstance: GameService | null = null

  // 获取设置服务
  const getSettingsService = (): GameSettingsService => {
    if (!settingsServiceInstance) {
      const storage = getStorageDriver()
      settingsServiceInstance = new GameSettingsService(storage)
    }
    return settingsServiceInstance
  }

  // 获取游戏服务
  const getGameService = (): GameService => {
    if (!gameServiceInstance) {
      const storage = getStorageDriver()
      const settingsService = getSettingsService()
      gameServiceInstance = new GameService(settingsService, storage)
    }
    return gameServiceInstance
  }

  // 计算属性
  const canTriggerGame = computed(() => {
    if (!currentGame.value) return false
    return getGameService().canTriggerGame(currentGame.value.sessionId)
  })

  const isGlobalEnabled = computed(() => {
    return getSettingsService().isGlobalEnabled()
  })

  const globalSoundEnabled = computed(() => {
    return getSettingsService().isGlobalSoundEnabled()
  })

  const globalBgmEnabled = computed(() => {
    return getSettingsService().isGlobalBgmEnabled()
  })

  const damageDisplayEnabled = computed(() => {
    return getSettingsService().isDamageDisplayEnabled()
  })

  const gameNotificationsEnabled = computed(() => {
    return getSettingsService().isGameNotificationsEnabled()
  })

  // 方法
  /**
   * 初始化游戏设置
   */
  async function initializeSettings() {
    const service = getSettingsService()
    await service.initialize()
    gameSettings.value = service.getSettings()
  }

  /**
   * 检查是否可以触发游戏
   */
  function canTriggerGameInSession(sessionId: string): boolean {
    return getGameService().canTriggerGame(sessionId)
  }

  /**
   * 检查会话是否启用游戏
   */
  function isSessionEnabled(sessionId: string): boolean {
    return getSettingsService().isSessionEnabled(sessionId)
  }

  /**
   * 设置全局游戏开关
   */
  async function setGlobalEnabled(enabled: boolean) {
    await getSettingsService().setGlobalEnabled(enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function setGlobalSoundEnabled(enabled: boolean) {
    await getSettingsService().setGlobalSoundEnabled(enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function setGlobalBgmEnabled(enabled: boolean) {
    await getSettingsService().setGlobalBgmEnabled(enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function setDamageDisplayEnabled(enabled: boolean) {
    await getSettingsService().setDamageDisplayEnabled(enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function setGameNotificationsEnabled(enabled: boolean) {
    await getSettingsService().setGameNotificationsEnabled(enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function subscribeGameNotification(type: string) {
    await getSettingsService().subscribeGameNotification(type)
    gameSettings.value = getSettingsService().getSettings()
  }

  async function unsubscribeGameNotification(type: string) {
    await getSettingsService().unsubscribeGameNotification(type)
    gameSettings.value = getSettingsService().getSettings()
  }

  /**
   * 设置会话游戏开关
   */
  async function setSessionEnabled(sessionId: string, enabled: boolean) {
    await getSettingsService().setSessionEnabled(sessionId, enabled)
    gameSettings.value = getSettingsService().getSettings()
  }

  /**
   * 切换会话游戏开关
   */
  async function toggleSessionEnabled(sessionId: string): Promise<boolean> {
    const result = await getSettingsService().toggleSessionEnabled(sessionId)
    gameSettings.value = getSettingsService().getSettings()
    return result
  }

  /**
   * 保存当前设置
   */
  async function saveSettings() {
    await getSettingsService().saveSettings()
    gameSettings.value = getSettingsService().getSettings()
  }

  /**
   * 导出游戏数据
   */
  async function exportGameData(gameId: string): Promise<GameExportData> {
    return getSettingsService().exportGameData(gameId)
  }

  /**
   * 导入游戏数据
   */
  async function importGameData(gameId: string, data: GameExportData): Promise<void> {
    return getSettingsService().importGameData(gameId, data)
  }

  /**
   * 触发小游戏（聊天触发模式）
   */
  async function triggerMiniGame(
    characterId: string,
    sessionId: string,
    characterAbility: number = 50
  ): Promise<Game | null> {
    const gameService = getGameService()
    
    const game = await gameService.triggerMiniGame({
      gameId: `escape-${sessionId}-${Date.now()}`,
      characterId,
      sessionId,
      gameState: {
        characterAbility,
        isEnded: false
      }
    }, 'escape')

    if (game) {
      currentGame.value = game
      isPlaying.value = true
    }

    return game
  }

  /**
   * 处理游戏动作
   */
  async function processGameAction(
    gameId: string,
    action: string,
    payload: any
  ): Promise<GameResult | null> {
    const gameService = getGameService()
    const result = await gameService.processAction(gameId, action, payload)

    if (result) {
      currentGame.value = await gameService.getGameState(gameId)
      
      if (result.success !== undefined && result.impactOnStory) {
        isPlaying.value = false
      }
    }

    return result
  }

  /**
   * 玩独立游戏（不受开关影响）
   */
  async function playStandaloneGame(gameType: string): Promise<GameResult> {
    const gameService = getGameService()
    return gameService.playStandaloneGame(gameType)
  }

  /**
   * 将游戏结果发送到聊天
   */
  async function sendGameResultToChat(sessionId: string, result: GameResult) {
    const gameService = getGameService()
    await gameService.sendResultToChat(sessionId, result)
  }

  /**
   * 加载会话的游戏列表
   */
  async function loadSessionGames(sessionId: string) {
    const gameService = getGameService()
    sessionGames.value = await gameService.getSessionGames(sessionId)
  }

  /**
   * 获取逃跑游戏的可用路线
   */
  function getEscapeRoutes(): EscapeRoute[] {
    return [
      { id: 'forest', name: '森林', icon: '🌲', difficulty: 30 },
      { id: 'mountain', name: '山路', icon: '⛰️', difficulty: 50 },
      { id: 'river', name: '河流', icon: '🌊', difficulty: 40 },
      { id: 'road', name: '大路', icon: '🛣️', difficulty: 20 }
    ]
  }

  /**
   * 获取难度描述
   */
  function getDifficultyText(difficulty: number): string {
    if (difficulty < 30) return '简单'
    if (difficulty < 50) return '中等'
    return '困难'
  }

  /**
   * 重置当前游戏
   */
  function resetCurrentGame() {
    currentGame.value = null
    isPlaying.value = false
  }

  /**
   * 重置状态
   */
  function reset() {
    currentGame.value = null
    isPlaying.value = false
    sessionGames.value = []
  }

  return {
    // 状态
    currentGame,
    isPlaying,
    gameSettings,
    sessionGames,
    // 计算属性
    canTriggerGame,
    isGlobalEnabled,
    globalSoundEnabled,
    globalBgmEnabled,
    damageDisplayEnabled,
    gameNotificationsEnabled,
    // 方法
    initializeSettings,
    canTriggerGameInSession,
    isSessionEnabled,
    setGlobalEnabled,
    setSessionEnabled,
    toggleSessionEnabled,
    setGlobalSoundEnabled,
    setGlobalBgmEnabled,
    setDamageDisplayEnabled,
    setGameNotificationsEnabled,
    subscribeGameNotification,
    unsubscribeGameNotification,
    saveSettings,
    exportGameData,
    importGameData,
    triggerMiniGame,
    processGameAction,
    playStandaloneGame,
    sendGameResultToChat,
    loadSessionGames,
    getEscapeRoutes,
    getDifficultyText,
    resetCurrentGame,
    reset
  }
})
