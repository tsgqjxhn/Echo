import { APIError, NetworkError } from './errors'
import { apiConfigService } from './api-config'
import { requireAPIKey } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'

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
  if (!text.trim()) return `HTTP ${status}`
  try {
    const adapter = getAdapterOrDefault()
    return adapter.parseErrorPayload(JSON.parse(text), status)
  } catch {
    return text
  }
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' ? window.speechSynthesis : null
}

export class TTSService {
  private state: TTSState = TTSState.IDLE
  private config: TTSConfig
  private currentAudio: HTMLAudioElement | null = null
  private currentObjectUrl: string | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
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

  getState(): TTSState { return this.state }
  isSupported(): boolean { return typeof Audio !== 'undefined' || !!getSpeechSynthesis() }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return
    this.stop()

    const providerConfig =
      (await apiConfigService.getDefaultConfig('tts')) ||
      (await apiConfigService.getDefaultConfig('voice'))

    if (providerConfig?.provider === 'local') {
      return this.localSpeak(text)
    }

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
    const synth = getSpeechSynthesis()
    if (this.currentUtterance && synth) {
      synth.pause()
      this.state = TTSState.PAUSED
      return
    }
    if (!this.currentAudio) return
    this.currentAudio.pause()
    this.state = TTSState.PAUSED
  }

  resume(): void {
    const synth = getSpeechSynthesis()
    if (this.currentUtterance && synth) {
      synth.resume()
      this.state = TTSState.PLAYING
      return
    }
    if (!this.currentAudio) return
    void this.currentAudio.play()
    this.state = TTSState.PLAYING
  }

  stop(): void {
    const synth = getSpeechSynthesis()
    if (this.currentUtterance) {
      this.currentUtterance.onend = null
      this.currentUtterance.onerror = null
      synth?.cancel()
      this.currentUtterance = null
    }
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
    this.config = { ...this.config, ...options }
    if (this.currentAudio && options.rate !== undefined) {
      this.currentAudio.playbackRate = Math.max(0.5, Math.min(2, options.rate))
    }
    if (this.currentAudio && options.volume !== undefined) {
      this.currentAudio.volume = Math.max(0, Math.min(1, options.volume))
    }
  }

  getConfig(): TTSConfig { return { ...this.config } }
  getVoices(): Array<{ name: string; lang: string }> {
    const synth = getSpeechSynthesis()
    if (!synth) return []
    return synth.getVoices().map(v => ({ name: v.name, lang: v.lang }))
  }
  onEnd(callback: () => void): void { this.onEndCallback = callback }
  onError(callback: (error: Error) => void): void { this.onErrorCallback = callback }
  onBoundary(callback: (charIndex: number, charLength: number) => void): void { void callback }

  destroy(): void {
    this.stop()
    this.onEndCallback = undefined
    this.onErrorCallback = undefined
  }

  private async localSpeak(text: string): Promise<void> {
    const synth = getSpeechSynthesis()
    if (!synth) throw new Error('当前环境不支持本地语音合成')

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = this.config.language || 'zh-CN'
      utterance.rate = Math.max(0.1, Math.min(10, this.config.rate ?? 1))
      utterance.pitch = Math.max(0, Math.min(2, this.config.pitch ?? 1))
      utterance.volume = Math.max(0, Math.min(1, this.config.volume ?? 1))

      if (this.config.voice) {
        const voices = synth.getVoices()
        const match = voices.find(v => v.name === this.config.voice || v.voiceURI === this.config.voice)
        if (match) utterance.voice = match
      }

      this.currentUtterance = utterance
      this.activeResolve = resolve

      utterance.onstart = () => { this.state = TTSState.PLAYING }
      utterance.onend = () => {
        this.state = TTSState.IDLE
        this.currentUtterance = null
        this.activeResolve = null
        this.onEndCallback?.()
        resolve()
      }
      utterance.onerror = (event) => {
        this.state = TTSState.ERROR
        this.currentUtterance = null
        this.activeResolve = null
        const error = new Error(`本地 TTS 错误: ${event.error}`)
        this.onErrorCallback?.(error)
        reject(error)
      }

      synth.speak(utterance)
    })
  }

  private async synthesizeSpeech(text: string): Promise<Blob> {
    const providerConfig =
      (await apiConfigService.getDefaultConfig('tts')) ||
      (await apiConfigService.getDefaultConfig('voice')) ||
      (await apiConfigService.getDefaultConfig('text'))

    if (!providerConfig) throw new Error('请先配置可用的 API 提供商')

    const adapter = getAdapterOrDefault(providerConfig.provider)

    if (!adapter.capabilities.tts) {
      throw new Error(`${adapter.providerId} 不支持文本转语音，请在设置中配置支持 TTS 的提供商`)
    }

    const { resolveSpeechModel, resolveSpeechVoice } = await import('./provider-http')
    const model = resolveSpeechModel(providerConfig)
    const voice = this.config.voice?.trim() || resolveSpeechVoice(providerConfig)

    const body = adapter.buildTTSBody({ model, voice, input: text })
    const url = adapter.resolveEndpoint(providerConfig.baseURL, 'tts')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...adapter.buildAuthHeaders(requireAPIKey(providerConfig)),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new APIError(response.status, await parseBlobError(await response.blob(), response.status))
    }

    return response.blob()
  }

  private async playAudio(blob: Blob): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.playbackRate = Math.max(0.5, Math.min(2, this.config.rate ?? 1))
      audio.volume = Math.max(0, Math.min(1, this.config.volume ?? 1))
      this.currentObjectUrl = url
      this.activeResolve = resolve

      audio.onplay = () => { this.state = TTSState.PLAYING }
      audio.onended = () => {
        this.state = TTSState.IDLE
        this.currentAudio = null
        this.activeResolve = null
        if (this.currentObjectUrl) { URL.revokeObjectURL(this.currentObjectUrl); this.currentObjectUrl = null }
        this.onEndCallback?.()
        resolve()
      }
      audio.onerror = () => {
        this.state = TTSState.ERROR
        this.currentAudio = null
        this.activeResolve = null
        if (this.currentObjectUrl) { URL.revokeObjectURL(this.currentObjectUrl); this.currentObjectUrl = null }
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
