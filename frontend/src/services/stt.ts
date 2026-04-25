import { requestPermission } from './permissions'
import { apiConfigService } from './api-config'
import { APIError, NetworkError } from './errors'
import { requireAPIKey, resolveTranscriptionModel } from './provider-http'
import { getAdapterOrDefault } from './providers/registry'
import { base64ToBlob, isNativeRuntime } from './runtime-http'
import { NativeSpeech } from './native-speech'
import type {
  NativeSpeechErrorEvent,
  NativeSpeechSTTResultEvent,
  NativeSpeechStateEvent,
} from './native-speech'
import type { PluginListenerHandle } from '@capacitor/core'

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export interface STTConfig {
  sampleRate?: number
  numberOfChannels?: number
  format?: string
  language?: string
}

type ResultCallback = (text: string, isFinal: boolean) => void
type ErrorCallback = (error: Error) => void

interface BrowserSpeechRecognitionResultItem {
  transcript: string
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean
  0: BrowserSpeechRecognitionResultItem
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: ArrayLike<BrowserSpeechRecognitionResult>
}

interface BrowserSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

function getRuntimeUni(): any {
  return (globalThis as any).uni
}

function getMediaRecorderConstructor(): typeof MediaRecorder | null {
  if (typeof window === 'undefined') return null
  return window.MediaRecorder || null
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

function inferAudioFilename(blob: Blob, fallback = 'recording.webm'): string {
  if (blob.type === 'audio/mpeg') return 'recording.mp3'
  if (blob.type === 'audio/mp4') return 'recording.m4a'
  if (blob.type === 'audio/wav') return 'recording.wav'
  return fallback
}

function inferAudioMimeType(source: string): string {
  const cleanSource = source.split('?')[0].toLowerCase()
  if (cleanSource.endsWith('.mp3')) return 'audio/mpeg'
  if (cleanSource.endsWith('.m4a')) return 'audio/mp4'
  if (cleanSource.endsWith('.wav')) return 'audio/wav'
  if (cleanSource.endsWith('.ogg')) return 'audio/ogg'
  return 'audio/webm'
}

function readNativeFileAsBlob(path: string): Promise<Blob> {
  const runtimeUni = getRuntimeUni()
  const fs = runtimeUni?.getFileSystemManager?.()
  if (!fs?.readFile) return Promise.reject(new NetworkError('当前环境无法读取本地音频文件'))

  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (result: { data?: string }) => {
        const base64 = typeof result?.data === 'string' ? result.data : ''
        if (!base64) { reject(new NetworkError('读取本地音频失败')); return }
        resolve(base64ToBlob(base64, inferAudioMimeType(path)))
      },
      fail: (error: { errMsg?: string }) => {
        reject(new NetworkError(error?.errMsg || '读取本地音频失败'))
      },
    })
  })
}

export class STTService {
  private recorder: any = null
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private recognition: BrowserSpeechRecognition | null = null
  private h5Chunks: Blob[] = []
  private recordedBlob: Blob | null = null
  private tempAudioPath = ''
  private state: RecordingState = RecordingState.IDLE
  private config: STTConfig
  private onResultCallback?: ResultCallback
  private onErrorCallback?: ErrorCallback
  private useLocal = false
  private useNativeLocal = false
  private localTranscript = ''
  private nativeSpeechListeners: PluginListenerHandle[] = []

  constructor(config?: STTConfig) {
    this.config = {
      sampleRate: config?.sampleRate ?? 16000,
      numberOfChannels: config?.numberOfChannels ?? 1,
      format: config?.format ?? 'webm',
      language: config?.language ?? 'zh-CN'
    }
  }

  getState(): RecordingState { return this.state }
  getRecordedBlob(): Blob | null { return this.recordedBlob }
  getTempAudioPath(): string { return this.tempAudioPath }

  isSupported(): boolean {
    if (isNativeRuntime()) return true
    if (getSpeechRecognitionCtor()) return true
    const runtimeUni = getRuntimeUni()
    return !!getMediaRecorderConstructor() || typeof runtimeUni?.getRecorderManager === 'function'
  }

  async startRecording(): Promise<void> {
    const providerConfig =
      (await apiConfigService.getDefaultConfig('stt')) ||
      (await apiConfigService.getDefaultConfig('voice'))

    const micPermission = await requestPermission('microphone')
    if (!micPermission.granted) {
      throw new Error('麦克风权限被拒绝，请在设置中允许麦克风访问')
    }

    const nativeAvailability = isNativeRuntime()
      ? await NativeSpeech.checkAvailability().catch(() => ({ sttAvailable: false, ttsAvailable: false }))
      : null

    if (nativeAvailability?.sttAvailable) {
      this.useLocal = true
      this.useNativeLocal = true
      return this.startNativeLocalRecognition()
    }

    if (providerConfig?.provider === 'local') {
      this.useLocal = true
      this.useNativeLocal = false
      return this.startLocalRecognition()
    }

    this.useLocal = false
    this.useNativeLocal = false
    this.localTranscript = ''

    let h5RecordingError: Error | null = null

    // Try browser MediaRecorder + getUserMedia first (works in Capacitor WebView with permissions)
    if (typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      try {
        return await this.startH5Recording()
      } catch (h5Error) {
        h5RecordingError = h5Error as Error
        // Native WebView can report a false permission-like MediaRecorder failure.
        if (!isNativeRuntime()) {
          throw h5Error
        }
      }
    }

    // Try uni-app native recorder
    if (getRuntimeUni()?.getRecorderManager) {
      try {
        return await this.startNativeRecording()
      } catch (nativeError) {
        if (h5RecordingError) {
          throw new Error(`${(nativeError as Error).message || '录音初始化失败'}；H5 fallback: ${h5RecordingError.message}`)
        }
        throw nativeError
      }
    }

    // Last resort on native: try getUserMedia again without MediaRecorder
    if (isNativeRuntime() && typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      throw new Error(
        h5RecordingError
          ? `当前设备录音初始化失败：${h5RecordingError.message}`
          : '当前设备录音初始化失败，请检查麦克风权限是否已开启'
      )
    }

    throw new Error('当前环境不支持语音录音')
  }

  async stopRecording(): Promise<string> {
    if (this.useLocal && this.useNativeLocal) return this.stopNativeLocalRecognition()
    if (this.useLocal && this.recognition) return this.stopLocalRecognition()
    if (this.mediaRecorder) return this.stopH5Recording()
    return this.stopNativeRecording()
  }

  async transcribe(audioPath: string): Promise<string> {
    if (this.useLocal) {
      const text = this.localTranscript.trim()
      this.state = RecordingState.IDLE
      this.useLocal = false
      this.useNativeLocal = false
      return text
    }

    try {
      let text = ''
      if (this.recordedBlob) {
        text = await this.transcribeBlob(this.recordedBlob, inferAudioFilename(this.recordedBlob))
      } else if (audioPath) {
        text = await this.transcribeSource(audioPath)
      }
      if (text) this.onResultCallback?.(text, true)
      this.state = RecordingState.IDLE
      return text
    } catch (error) {
      this.state = RecordingState.ERROR
      this.cleanupH5Resources()
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  onResult(callback: ResultCallback): void { this.onResultCallback = callback }
  onError(callback: ErrorCallback): void { this.onErrorCallback = callback }

  cancel(): void {
    if (this.useLocal && this.useNativeLocal) {
      void NativeSpeech.cancelRecognition().catch(() => undefined)
      void this.detachNativeSpeechListeners()
    }
    if (this.recognition) {
      this.recognition.onresult = null
      this.recognition.onerror = null
      this.recognition.onend = null
      this.recognition.abort()
      this.recognition = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null
      this.mediaRecorder.onerror = null
      this.mediaRecorder.stop()
    }
    if (this.recorder) { this.recorder.stop(); this.recorder = null }
    this.cleanupH5Resources()
    this.recordedBlob = null
    this.tempAudioPath = ''
    this.state = RecordingState.IDLE
    this.useLocal = false
    this.useNativeLocal = false
    this.localTranscript = ''
  }

  destroy(): void {
    this.cancel()
    this.onResultCallback = undefined
    this.onErrorCallback = undefined
  }

  private startLocalRecognition(): Promise<void> {
    const SpeechRecognition = getSpeechRecognitionCtor()
    if (!SpeechRecognition) {
      this.useLocal = false
      throw new Error('当前环境不支持本地语音识别')
    }

    return new Promise<void>((resolve, reject) => {
      const recognition = new SpeechRecognition()
      recognition.lang = this.config.language || 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = true

      this.recognition = recognition
      this.localTranscript = ''

      recognition.onstart = () => {
        this.state = RecordingState.RECORDING
        resolve()
      }

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }
        const text = finalTranscript || interimTranscript
        if (text) {
          if (finalTranscript) {
            this.localTranscript = finalTranscript.trim()
          }
          this.onResultCallback?.(text, !!finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return
        this.state = RecordingState.ERROR
        const msg = event.error === 'not-allowed'
          ? '麦克风权限被拒绝，请在浏览器或系统设置中允许麦克风访问'
          : `本地识别错误: ${event.error}`
        this.onErrorCallback?.(new Error(msg))
        reject(new Error(msg))
      }

      recognition.onend = () => {
        if (this.state === RecordingState.RECORDING) {
          this.state = RecordingState.IDLE
        }
      }

      recognition.start()
    })
  }

  private stopLocalRecognition(): Promise<string> {
    if (!this.recognition) return Promise.resolve('')
    this.recognition.stop()
    this.state = RecordingState.PROCESSING
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        this.state = RecordingState.IDLE
        resolve('')
      }, 1000)
    })
  }

  private async startNativeLocalRecognition(): Promise<void> {
    await this.detachNativeSpeechListeners()
    this.localTranscript = ''
    this.tempAudioPath = ''
    this.recordedBlob = null

    const handles = await Promise.all([
      NativeSpeech.addListener('sttResult', (event: NativeSpeechSTTResultEvent) => {
        const text = event.text?.trim() || ''
        if (!text) return
        if (event.final) {
          this.localTranscript = text
        }
        this.onResultCallback?.(text, !!event.final)
      }),
      NativeSpeech.addListener('sttState', (event: NativeSpeechStateEvent) => {
        if (event.state === 'recording' || event.state === 'ready' || event.state === 'listening') {
          this.state = RecordingState.RECORDING
        } else if (event.state === 'processing') {
          this.state = RecordingState.PROCESSING
        } else if (event.state === 'idle') {
          this.state = RecordingState.IDLE
        }
      }),
      NativeSpeech.addListener('sttError', (event: NativeSpeechErrorEvent) => {
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(new Error(event.message || '系统语音识别失败'))
      }),
    ])

    this.nativeSpeechListeners = handles

    try {
      await NativeSpeech.startRecognition({
        language: this.config.language,
        preferOffline: false,
      })
      this.state = RecordingState.RECORDING
    } catch (error) {
      await this.detachNativeSpeechListeners()
      this.useLocal = false
      this.useNativeLocal = false
      throw error
    }
  }

  private async stopNativeLocalRecognition(): Promise<string> {
    this.state = RecordingState.PROCESSING

    try {
      const result = await NativeSpeech.stopRecognition()
      const text = result?.text?.trim() || this.localTranscript.trim()
      if (text) {
        this.localTranscript = text
        this.onResultCallback?.(text, true)
      }
      await this.detachNativeSpeechListeners()
      this.state = RecordingState.IDLE
      return ''
    } catch (error) {
      this.state = RecordingState.ERROR
      await this.detachNativeSpeechListeners()
      this.useLocal = false
      this.useNativeLocal = false
      throw error
    }
  }

  private async startH5Recording(): Promise<void> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前环境不支持录音')

      this.cleanupH5Resources()
      this.recordedBlob = null
      this.h5Chunks = []

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (micError: unknown) {
        const err = micError as DOMException
        if (err.name === 'NotAllowedError' || /permission|denied/i.test(err.message)) {
          throw new Error('麦克风权限被拒绝，请在浏览器或系统设置中允许麦克风访问')
        }
        throw new Error(`无法访问麦克风: ${err.message || '未知错误'}`)
      }

      const MediaRecorderCtor = getMediaRecorderConstructor()
      if (!MediaRecorderCtor) {
        throw new Error('当前环境不支持 MediaRecorder 录音')
      }

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find(type => MediaRecorderCtor.isTypeSupported(type)) || ''

      this.mediaRecorder = mimeType
        ? new MediaRecorderCtor(this.mediaStream, { mimeType })
        : new MediaRecorderCtor(this.mediaStream)

      this.mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) this.h5Chunks.push(event.data)
      }
      this.mediaRecorder.onerror = event => {
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(new Error((event as any)?.error?.message || '录音失败'))
      }

      await new Promise<void>((resolve, reject) => {
        if (!this.mediaRecorder) { reject(new Error('录音器初始化失败')); return }
        this.mediaRecorder.onstart = () => { this.state = RecordingState.RECORDING; resolve() }
        this.mediaRecorder.start()
      })
    } catch (error) {
      this.state = RecordingState.ERROR
      this.cleanupH5Resources()
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  private stopH5Recording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) { resolve(''); return }
      const recorder = this.mediaRecorder
      recorder.onstop = () => {
        try {
          const blob = new Blob(this.h5Chunks, { type: recorder.mimeType || 'audio/webm' })
          this.recordedBlob = blob
          this.tempAudioPath = URL.createObjectURL(blob)
          this.state = RecordingState.PROCESSING
          this.cleanupH5Resources(false)
          resolve(this.tempAudioPath)
        } catch (error) { reject(error) }
      }
      recorder.onerror = event => {
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(new Error((event as any)?.error?.message || '录音失败'))
        reject(new Error((event as any)?.error?.message || '录音失败'))
      }
      recorder.stop()
    })
  }

  private async startNativeRecording(): Promise<void> {
    try {
      const runtimeUni = getRuntimeUni()
      if (typeof runtimeUni?.getRecorderManager !== 'function') throw new Error('当前环境不支持录音')

      this.recorder = runtimeUni.getRecorderManager()
      this.recordedBlob = null
      this.tempAudioPath = ''

      await new Promise<void>((resolve, reject) => {
        this.recorder.onStart(() => { this.state = RecordingState.RECORDING; resolve() })
        this.recorder.onError((error: any) => {
          this.state = RecordingState.ERROR
          this.onErrorCallback?.(new Error(error?.errMsg || '录音失败'))
          reject(new Error(error?.errMsg || '录音失败'))
        })
        this.recorder.start({
          format: this.config.format,
          sampleRate: this.config.sampleRate,
          numberOfChannels: this.config.numberOfChannels
        })
      })
    } catch (error) {
      this.state = RecordingState.ERROR
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  private stopNativeRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) { resolve(''); return }
      this.recorder.onStop((result: any) => {
        this.tempAudioPath = result?.tempFilePath || ''
        this.state = RecordingState.PROCESSING
        resolve(this.tempAudioPath)
      })
      this.recorder.onError((error: any) => {
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(new Error(error?.errMsg || '停止录音失败'))
        reject(new Error(error?.errMsg || '停止录音失败'))
      })
      this.recorder.stop()
    })
  }

  private async transcribeSource(source: string): Promise<string> {
    const normalized = source.trim()
    if (!normalized) return ''
    const blob = /^blob:|^data:|^https?:/i.test(normalized)
      ? await (async () => {
          const response = await fetch(normalized)
          if (!response.ok) throw new NetworkError(`Unable to read audio file: HTTP ${response.status}`)
          return response.blob()
        })()
      : await readNativeFileAsBlob(normalized)
    return this.transcribeBlob(blob, inferAudioFilename(blob, 'recording.webm'))
  }

  private async transcribeBlob(blob: Blob, filename: string): Promise<string> {
    const providerConfig =
      (await apiConfigService.getDefaultConfig('stt')) ||
      (await apiConfigService.getDefaultConfig('voice')) ||
      (await apiConfigService.getDefaultConfig('text'))

    if (!providerConfig) throw new Error('请先配置可用的 API 提供商')

    const adapter = getAdapterOrDefault(providerConfig.provider)

    if (!adapter.capabilities.stt) {
      throw new Error(`${adapter.providerId} 不支持语音转文本，请在设置中配置支持 STT 的提供商`)
    }

    const model = resolveTranscriptionModel(providerConfig)
    const fd = adapter.buildSTTFormData({
      model,
      language: this.config.language,
      file: blob,
      filename,
    })

    const url = adapter.resolveEndpoint(providerConfig.baseURL, 'stt')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: adapter.buildAuthHeaders(requireAPIKey(providerConfig)),
        body: fd,
      })
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new APIError(response.status, adapter.parseErrorPayload(errorPayload, response.status))
      }
      const payload = await response.json().catch(() => ({}))
      return String((payload as Record<string, unknown>)?.text || '').trim()
    } catch (error) {
      if (error instanceof APIError) throw error
      throw new NetworkError((error as Error).message || 'Speech-to-text request failed.')
    }
  }

  private cleanupH5Resources(revokeObjectUrl: boolean = true): void {
    if (revokeObjectUrl && this.tempAudioPath.startsWith('blob:')) {
      URL.revokeObjectURL(this.tempAudioPath)
      this.tempAudioPath = ''
    }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(track => track.stop()); this.mediaStream = null }
    this.mediaRecorder = null
    this.h5Chunks = []
  }

  private async detachNativeSpeechListeners(): Promise<void> {
    const listeners = [...this.nativeSpeechListeners]
    this.nativeSpeechListeners = []
    await Promise.all(listeners.map(listener => listener.remove().catch(() => undefined)))
  }
}

export default STTService
