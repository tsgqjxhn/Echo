/**
 * localStorage 键名注册表（新功能请在此登记，避免旁路硬编码）
 */
export const STORAGE_KEYS = {
  /** 核心驱动（xiang_* 由 storage.ts 管理） */
  deviceId: 'echo_device_id',
  systemPrompts: 'echo_system_prompts',
  chatDefaults: 'echo_chat_defaults_v2',
  affinity: 'echo_affinity',
  gameRecords: 'echo_game_records',
  responseCache: 'echo_response_cache',
  hiddenManagedGames: 'echo_hidden_managed_games_v1',
  characterCreateDrafts: 'echo_character_create_drafts_v1',
} as const

export type StorageKeyId = keyof typeof STORAGE_KEYS

/** storage.clear() 应清理的前缀 */
export const STORAGE_CLEAR_PREFIXES = ['echo-', 'echo_'] as const
