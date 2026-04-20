import { APIError, NetworkError } from './errors'
import { apiConfigService } from './api-config'
import {
  buildProviderAuthHeaders,
  buildProviderURL,
  parseProviderErrorPayload,
  requireAPIKey,
  resolveSpeechModel,
  resolveSpeechVoice,
} from './provider-http'
import { runtimeRequest } from './runtime-http'

export enum TTSState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface TTSConfig {
  rate?: number
  pitch?: number
  volume?: number
  voice?: string
  language?: string
}

async function parseBlobError(blob: Blob, status: number): Promise<string> {
  const text = await blob.text().catch(() => '')
  if (!text.trim()) {
    return `HTTP ${status}`
  }

  try {
    return parseProviderErrorPayload(JSON.parse(text), status)
  } catch {
    return text
  }
}

export class TTSService {
  private state: TTSState = TTSState.IDLE
  private config: TTSConfig
  private currentAudio: HTMLAudioElement | null = null
  private currentObjectUrl: string | null = null
  private activeResolve: (() => void) | null = null
  private onEndCallback?: () => void
  private onErrorCallback?: (error: Error) => void

  constructor(config?: TTSConfig) {
    this.config = {
      rate: config?.rate ?? 1,
      pitch: config?.pitch ?? 1,
      volume: config?.volume ?? 1,
      voice: config?.voice,
      language: config?.language ?? 'zh-CN'
    }
  }

  getState(): TTSState {
    return this.state
  }

  isSupported(): boolean {
    return typeof Audio !== 'undefined'
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) {
      return
    }

    this.stop()

    try {
      const blob = await this.synthesizeSpeech(text)
      await this.playAudio(blob)
    } catch (error) {
      this.state = TTSState.ERROR
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  pause(): void {
    if (!this.currentAudio) {
      return
    }

    this.currentAudio.pause()
    this.state = TTSState.PAUSED
  }

  resume(): void {
    if (!this.currentAudio) {
      return
    }

    void this.currentAudio.play()
    this.state = TTSState.PLAYING
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio.onended = null
      this.currentAudio.onerror = null
      this.currentAudio.onplay = null
      this.currentAudio = null
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl)
      this.currentObjectUrl = null
    }

    this.state = TTSState.STOPPED
    this.activeResolve?.()
    this.activeResolve = null
  }

  setVoice(options: TTSConfig): void {
    this.config = {
      ...this.config,
      ...options
    }

    if (this.currentAudio && options.rate !== undefined) {
      this.currentAudio.playbackRate = Math.max(0.5, Math.min(2, options.rate))
    }

    if (this.currentAudio && options.volume !== undefined) {
      this.currentAudio.volume = Math.max(0, Math.min(1, options.volume))
    }
  }

  getConfig(): TTSConfig {
    return { ...this.config }
  }

  getVoices(): Array<{ name: string; lang: string }> {
    return []
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  onBoundary(callback: (charIndex: number, charLength: number) => void): void {
    void callback
  }

  destroy(): void {
    this.stop()
    this.onEndCallback = undefined
    this.onErrorCallback = undefined
  }

  private async synthesizeSpeech(text: string): Promise<Blob> {
    const providerConfig =
      (await apiConfigService.getDefaultConfig('voice')) ||
      (await apiConfigService.getDefaultConfig('text'))

    if (!providerConfig) {
      throw new Error('请先配置可用的 API 提供商')
    }

    const response = await runtimeRequest<Blob>({
      url: buildProviderURL(providerConfig.baseURL, '/audio/speech'),
      method: 'POST',
      headers: {
        ...buildProviderAuthHeaders(requireAPIKey(providerConfig)),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: {
        model: resolveSpeechModel(providerConfig),
        voice: this.config.voice?.trim() || resolveSpeechVoice(providerConfig),
        input: text,
        format: 'mp3',
      },
      responseType: 'blob',
      connectTimeout: 120_000,
      readTimeout: 120_000,
    })

    if (!response.ok) {
      throw new APIError(response.status, await parseBlobError(response.data, response.status))
    }

    return response.data
  }

  private async playAudio(blob: Blob): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.playbackRate = Math.max(0.5, Math.min(2, this.config.rate ?? 1))
      audio.volume = Math.max(0, Math.min(1, this.config.volume ?? 1))
      this.currentObjectUrl = url
      this.activeResolve = resolve

      audio.onplay = () => {
        this.state = TTSState.PLAYING
      }

      audio.onended = () => {
        this.state = TTSState.IDLE
        this.currentAudio = null
        this.activeResolve = null
        if (this.currentObjectUrl) {
          URL.revokeObjectURL(this.currentObjectUrl)
          this.currentObjectUrl = null
        }
        this.onEndCallback?.()
        resolve()
      }

      audio.onerror = async () => {
        this.state = TTSState.ERROR
        this.currentAudio = null
        this.activeResolve = null
        if (this.currentObjectUrl) {
          URL.revokeObjectURL(this.currentObjectUrl)
          this.currentObjectUrl = null
        }
        const error = new NetworkError('TTS audio playback failed.')
        this.onErrorCallback?.(error)
        reject(error)
      }

      this.currentAudio = audio
      void audio.play().catch(reject)
    })
  }
}

export default TTSService
