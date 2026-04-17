import { APIError, NetworkError } from './errors'
import { buildAPIURL } from './http'

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

function getRuntimeUni(): any {
  return (globalThis as any).uni
}

function getMediaRecorderConstructor(): typeof MediaRecorder | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.MediaRecorder || null
}

function inferAudioFilename(blob: Blob, fallback = 'recording.webm'): string {
  if (blob.type === 'audio/mpeg') {
    return 'recording.mp3'
  }
  if (blob.type === 'audio/mp4') {
    return 'recording.m4a'
  }
  if (blob.type === 'audio/wav') {
    return 'recording.wav'
  }
  return fallback
}

async function parseSTTResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new APIError(response.status, text || `HTTP ${response.status}`)
  }

  const payload = await response.json()
  return String(payload?.text || '').trim()
}

export class STTService {
  private recorder: any = null
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private h5Chunks: Blob[] = []
  private recordedBlob: Blob | null = null
  private tempAudioPath = ''
  private state: RecordingState = RecordingState.IDLE
  private config: STTConfig
  private onResultCallback?: ResultCallback
  private onErrorCallback?: ErrorCallback

  constructor(config?: STTConfig) {
    this.config = {
      sampleRate: config?.sampleRate ?? 16000,
      numberOfChannels: config?.numberOfChannels ?? 1,
      format: config?.format ?? 'webm',
      language: config?.language ?? 'zh-CN'
    }
  }

  getState(): RecordingState {
    return this.state
  }

  getRecordedBlob(): Blob | null {
    return this.recordedBlob
  }

  getTempAudioPath(): string {
    return this.tempAudioPath
  }

  isSupported(): boolean {
    const runtimeUni = getRuntimeUni()
    return !!getMediaRecorderConstructor() || typeof runtimeUni?.getRecorderManager === 'function'
  }

  async startRecording(): Promise<void> {
    if (
      getMediaRecorderConstructor() &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    ) {
      return this.startH5Recording()
    }

    return this.startNativeRecording()
  }

  async stopRecording(): Promise<string> {
    if (this.mediaRecorder) {
      return this.stopH5Recording()
    }

    return this.stopNativeRecording()
  }

  async transcribe(audioPath: string): Promise<string> {
    try {
      let text = ''

      if (this.recordedBlob) {
        text = await this.transcribeBlob(this.recordedBlob, inferAudioFilename(this.recordedBlob))
      } else if (audioPath) {
        text = await this.transcribeSource(audioPath)
      }

      if (text) {
        this.onResultCallback?.(text, true)
      }

      this.state = RecordingState.IDLE
      return text
    } catch (error) {
      this.state = RecordingState.ERROR
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  onResult(callback: ResultCallback): void {
    this.onResultCallback = callback
  }

  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null
      this.mediaRecorder.onerror = null
      this.mediaRecorder.stop()
    }

    if (this.recorder) {
      this.recorder.stop()
      this.recorder = null
    }

    this.cleanupH5Resources()
    this.recordedBlob = null
    this.tempAudioPath = ''
    this.state = RecordingState.IDLE
  }

  destroy(): void {
    this.cancel()
    this.onResultCallback = undefined
    this.onErrorCallback = undefined
  }

  private async startH5Recording(): Promise<void> {
    try {
      const MediaRecorderCtor = getMediaRecorderConstructor()
      if (!MediaRecorderCtor || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前环境不支持录音')
      }

      this.cleanupH5Resources()
      this.recordedBlob = null
      this.h5Chunks = []
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorderCtor.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorderCtor.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      this.mediaRecorder = mimeType
        ? new MediaRecorderCtor(this.mediaStream, { mimeType })
        : new MediaRecorderCtor(this.mediaStream)

      this.mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          this.h5Chunks.push(event.data)
        }
      }

      this.mediaRecorder.onerror = event => {
        const error = new Error((event as any)?.error?.message || '录音失败')
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(error)
      }

      await new Promise<void>((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('录音器初始化失败'))
          return
        }

        this.mediaRecorder.onstart = () => {
          this.state = RecordingState.RECORDING
          resolve()
        }

        this.mediaRecorder.start()
      })
    } catch (error) {
      this.state = RecordingState.ERROR
      this.onErrorCallback?.(error as Error)
      throw error
    }
  }

  private stopH5Recording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        resolve('')
        return
      }

      const recorder = this.mediaRecorder
      recorder.onstop = () => {
        try {
          const blob = new Blob(this.h5Chunks, {
            type: recorder.mimeType || 'audio/webm'
          })
          this.recordedBlob = blob
          this.tempAudioPath = URL.createObjectURL(blob)
          this.state = RecordingState.PROCESSING
          this.cleanupH5Resources(false)
          resolve(this.tempAudioPath)
        } catch (error) {
          reject(error)
        }
      }

      recorder.onerror = event => {
        const error = new Error((event as any)?.error?.message || '录音失败')
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(error)
        reject(error)
      }

      recorder.stop()
    })
  }

  private async startNativeRecording(): Promise<void> {
    try {
      const runtimeUni = getRuntimeUni()

      if (typeof runtimeUni?.getRecorderManager !== 'function') {
        throw new Error('当前环境不支持录音')
      }

      this.recorder = runtimeUni.getRecorderManager()
      this.recordedBlob = null
      this.tempAudioPath = ''

      await new Promise<void>((resolve, reject) => {
        this.recorder.onStart(() => {
          this.state = RecordingState.RECORDING
          resolve()
        })

        this.recorder.onError((error: any) => {
          const nextError = new Error(error?.errMsg || '录音失败')
          this.state = RecordingState.ERROR
          this.onErrorCallback?.(nextError)
          reject(nextError)
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
      if (!this.recorder) {
        resolve('')
        return
      }

      this.recorder.onStop((result: any) => {
        this.tempAudioPath = result?.tempFilePath || ''
        this.state = RecordingState.PROCESSING
        resolve(this.tempAudioPath)
      })

      this.recorder.onError((error: any) => {
        const nextError = new Error(error?.errMsg || '停止录音失败')
        this.state = RecordingState.ERROR
        this.onErrorCallback?.(nextError)
        reject(nextError)
      })

      this.recorder.stop()
    })
  }

  private async transcribeSource(source: string): Promise<string> {
    const runtimeUni = getRuntimeUni()

    if (runtimeUni?.uploadFile && !/^blob:|^data:|^https?:/i.test(source)) {
      return new Promise((resolve, reject) => {
        runtimeUni.uploadFile({
          url: buildAPIURL('/api/stt/transcribe'),
          filePath: source,
          name: 'file',
          formData: {
            language: this.config.language || 'zh-CN'
          },
          success: (uploadResult: { statusCode: number; data: string }) => {
            if (uploadResult.statusCode < 200 || uploadResult.statusCode >= 300) {
              reject(new Error('语音识别请求失败'))
              return
            }

            try {
              const payload = JSON.parse(uploadResult.data)
              resolve(String(payload?.text || '').trim())
            } catch (error) {
              reject(error)
            }
          },
          fail: (error: any) => {
            reject(new Error(error?.errMsg || '上传语音失败'))
          }
        })
      })
    }

    const response = await fetch(source)
    if (!response.ok) {
      throw new NetworkError(`Unable to read audio file: HTTP ${response.status}`)
    }

    const blob = await response.blob()
    return this.transcribeBlob(blob, inferAudioFilename(blob))
  }

  private async transcribeBlob(blob: Blob, filename: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', blob, filename)
    formData.append('language', this.config.language || 'zh-CN')

    try {
      const response = await fetch(buildAPIURL('/api/stt/transcribe'), {
        method: 'POST',
        body: formData
      })
      return await parseSTTResponse(response)
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      throw new NetworkError((error as Error).message || 'Speech-to-text request failed.')
    }
  }

  private cleanupH5Resources(revokeObjectUrl: boolean = true): void {
    if (revokeObjectUrl && this.tempAudioPath.startsWith('blob:')) {
      URL.revokeObjectURL(this.tempAudioPath)
      this.tempAudioPath = ''
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    this.mediaRecorder = null
    this.h5Chunks = []
  }
}

export default STTService
