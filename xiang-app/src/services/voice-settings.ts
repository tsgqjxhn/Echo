import { storageDriver } from './storage'

export interface VoiceTTSConfig {
  rate?: number
  pitch?: number
  volume?: number
  voice?: string
  language?: string
}

export interface VoiceSTTConfig {
  language: string
  quality: 'low' | 'medium' | 'high'
  autoSend: boolean
  showWaveform: boolean
}

export const DEFAULT_TTS_CONFIG: Required<Pick<VoiceTTSConfig, 'rate' | 'pitch' | 'volume' | 'language'>> = {
  rate: 1,
  pitch: 1,
  volume: 1,
  language: 'zh-CN'
}

export const DEFAULT_STT_CONFIG: VoiceSTTConfig = {
  language: 'zh-CN',
  quality: 'medium',
  autoSend: true,
  showWaveform: false
}

const TTS_KEY = 'voice_tts_config'
const STT_KEY = 'voice_stt_config'

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(value) as T)
    }
  } catch {
    return fallback
  }
}

export async function loadTTSConfig(): Promise<VoiceTTSConfig> {
  const stored = await storageDriver.getUserSetting(TTS_KEY)
  return safeParse(stored, DEFAULT_TTS_CONFIG)
}

export async function saveTTSConfig(config: VoiceTTSConfig): Promise<void> {
  await storageDriver.saveUserSetting(TTS_KEY, JSON.stringify({
    ...DEFAULT_TTS_CONFIG,
    ...config
  }))
}

export async function loadSTTConfig(): Promise<VoiceSTTConfig> {
  const stored = await storageDriver.getUserSetting(STT_KEY)
  return safeParse(stored, DEFAULT_STT_CONFIG)
}

export async function saveSTTConfig(config: VoiceSTTConfig): Promise<void> {
  await storageDriver.saveUserSetting(STT_KEY, JSON.stringify({
    ...DEFAULT_STT_CONFIG,
    ...config
  }))
}

export async function loadVoiceSettings(): Promise<{ tts: VoiceTTSConfig; stt: VoiceSTTConfig }> {
  const [tts, stt] = await Promise.all([loadTTSConfig(), loadSTTConfig()])
  return { tts, stt }
}

export async function resetVoiceSettings(): Promise<void> {
  await Promise.all([
    saveTTSConfig(DEFAULT_TTS_CONFIG),
    saveSTTConfig(DEFAULT_STT_CONFIG)
  ])
}
