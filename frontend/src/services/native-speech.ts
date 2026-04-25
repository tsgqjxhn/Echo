import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface NativeSpeechAvailability {
  sttAvailable: boolean
  ttsAvailable: boolean
}

export interface NativeSpeechSTTResultEvent {
  text: string
  final: boolean
}

export interface NativeSpeechStateEvent {
  state: string
  utteranceId?: string
}

export interface NativeSpeechErrorEvent {
  message: string
  code?: string
  utteranceId?: string
}

export interface NativeSpeechVoiceOption {
  name: string
  lang: string
}

interface NativeSpeechPlugin {
  checkAvailability(): Promise<NativeSpeechAvailability>
  startRecognition(options: { language?: string; preferOffline?: boolean }): Promise<{ started: boolean }>
  stopRecognition(): Promise<{ text: string }>
  cancelRecognition(): Promise<void>
  speak(options: {
    text: string
    rate?: number
    pitch?: number
    volume?: number
    language?: string
    voice?: string
  }): Promise<{ utteranceId: string }>
  stopSpeaking(): Promise<void>
  getVoices(): Promise<{ voices: NativeSpeechVoiceOption[] }>
  addListener(
    eventName: 'sttResult',
    listenerFunc: (event: NativeSpeechSTTResultEvent) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'sttState',
    listenerFunc: (event: NativeSpeechStateEvent) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'sttError',
    listenerFunc: (event: NativeSpeechErrorEvent) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'ttsState',
    listenerFunc: (event: NativeSpeechStateEvent) => void
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'ttsError',
    listenerFunc: (event: NativeSpeechErrorEvent) => void
  ): Promise<PluginListenerHandle>
}

export const NativeSpeech = registerPlugin<NativeSpeechPlugin>('NativeSpeech')
