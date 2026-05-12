/**
 * 存档数据迁移函数。
 * 独立于 SaveManager，避免 SaveManager 与 GameStateManager 在启动阶段循环初始化。
 */

import type { GameSaveData } from '../types';
import { createNewPlayer } from '../models/PlayerData';

export function migrateSaveData(data: any): GameSaveData {
  if (!data) {
    data = {};
  }

  if (!data.player) data.player = createNewPlayer();
  if (!data.player.profession) data.player.profession = 'sword';
  if (!data.player.talent) data.player.talent = '';
  if (!data.player.birthPlace) data.player.birthPlace = 'daoyuan';
  if (!data.player.reputation) data.player.reputation = {};
  if (!data.player.worldDomain) data.player.worldDomain = 'central';

  if (!data.codexUnlocks) data.codexUnlocks = {};
  if (!data.messages) data.messages = [];
  if (!data.dwelling) {
    data.dwelling = {
      arrayLevel: 1,
      gardenLevel: 1,
      plantedHerbs: [],
      isCultivating: false,
      cultivateStartMonth: 0,
    };
  }

  if (!data.techniques) data.techniques = [];
  if (!data.inventory) data.inventory = [];
  if (!data.daoProgress) data.daoProgress = {};
  if (!data.worldProgress) {
    data.worldProgress = {
      unlockedRegions: ['starting_village'],
      regionProgress: { starting_village: 0 },
      defeatedBosses: [],
      completedStoryEvents: [],
    };
  }
  if (!data.activeEffects) data.activeEffects = [];
  if (!data.settings) {
    data.settings = {
      masterVolume: 1.0,
      bgmVolume: 0.7,
      sfxVolume: 0.8,
      muted: false,
      autoSaveInterval: 60000,
      textSpeed: 40,
      skipReadEvents: false,
    };
  }

  return data as GameSaveData;
}
