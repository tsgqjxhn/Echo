<template>
  <article class="message-bubble" :class="{ user: isUser }">
    <img
      :src="avatarUrl"
      :alt="isUser ? 'User' : 'Assistant'"
      class="avatar"
      @click="!isUser && emit('avatar-click')"
    />

    <div class="bubble-main">
      <div
        class="bubble-card"
        :class="{
          'is-text': isTextMessage,
          'is-image': isImageMessage,
          'is-audio': isAudioMessage,
        }"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
        @contextmenu.prevent="openMenu"
      >
        <template v-if="isTextMessage">
          <div v-if="!message.content" class="bubble-dots">
            <span></span><span></span><span></span>
          </div>
          <p v-else class="text-content" v-html="renderedContent"></p>
        </template>

        <button
          v-else-if="isAudioMessage"
          type="button"
          class="voice-card"
          @click="toggleVoice"
        >
          <span class="voice-icon">{{ isPlayingVoice ? '■' : '▶' }}</span>
          <span class="voice-copy">{{ voiceText }}</span>
          <span v-if="voiceDuration" class="voice-duration">{{ voiceDuration }}s</span>
        </button>

        <button
          v-else-if="isImageMessage"
          type="button"
          class="image-card"
          @click="openImage"
        >
          <img :src="imagePath" alt="Message attachment" class="message-image" />
          <span class="image-copy">{{ imageDescription || '查看图片' }}</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showMenu" class="bubble-menu-overlay" @click="closeMenu">
        <div class="bubble-menu" @click.stop>
          <button type="button" class="menu-item" @click="copyMessage">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                fill="currentColor"
              />
            </svg>
            <span>复制</span>
          </button>

          <button v-if="!isUser" type="button" class="menu-item" @click="retryMessage">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                fill="currentColor"
              />
            </svg>
            <span>重新生成</span>
          </button>

          <button
            v-if="!isUser && isTextMessage && message.content.trim()"
            type="button"
            class="menu-item"
            :class="{ speaking: isTTSSpeaking }"
            @click="listenMessage"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                fill="currentColor"
              />
            </svg>
            <span>{{ isTTSSpeaking ? '停止' : '重听' }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { IMessage } from '@/types/chat'
import { MessageType } from '@/types/chat'
import { TTSService } from '@/services/tts'
import { loadTTSConfig } from '@/services/voice-settings'

interface VoiceData {
  audioPath: string
  text: string
  duration?: number
}

interface ImageData {
  imagePath: string
  description?: string
}

const props = defineProps<{
  message: IMessage
  isUser: boolean
  isLastMessage?: boolean
  userAvatar?: string
  assistantAvatar?: string
}>()

const emit = defineEmits<{
  retry: []
  'avatar-click': []
}>()

const isPlayingVoice = ref(false)
const isTTSSpeaking = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)
const ttsService = ref<TTSService | null>(null)
const showMenu = ref(false)
let longPressTimer: ReturnType<typeof setTimeout> | null = null

const isTextMessage = computed(() => props.message.contentType === MessageType.TEXT)
const isImageMessage = computed(() => props.message.contentType === MessageType.IMAGE)
const isAudioMessage = computed(() => props.message.contentType === MessageType.AUDIO)

const avatarUrl = computed(() =>
  props.isUser
    ? props.userAvatar || '/src/static/images/user-avatar.svg'
    : props.assistantAvatar || '/src/static/images/ai-avatar.svg'
)

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const renderedContent = computed(() => {
  const raw = props.message.content
  if (!raw) {
    return ''
  }

  const normalized = raw.replace(/\*([^*\n]+)\*/g, '（$1）')
  const escaped = escapeHTML(normalized)
  const highlighted = escaped.replace(/（[^（）\n]+）/g, match => `<span class="action-text">${match}</span>`)

  return highlighted.replace(/\n/g, '<br>')
})

const voiceData = computed<VoiceData | null>(() => {
  if (!isAudioMessage.value) return null

  try {
    return JSON.parse(props.message.content) as VoiceData
  } catch {
    return null
  }
})

const imageData = computed<ImageData | null>(() => {
  if (!isImageMessage.value) return null

  try {
    return JSON.parse(props.message.content) as ImageData
  } catch {
    return { imagePath: props.message.content }
  }
})

const voiceText = computed(() => voiceData.value?.text || '语音消息')
const voiceDuration = computed(() => voiceData.value?.duration)
const imagePath = computed(() => imageData.value?.imagePath || props.message.content)
const imageDescription = computed(() => imageData.value?.description || '')

function onPointerDown() {
  longPressTimer = setTimeout(openMenu, 500)
}

function onPointerUp() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function openMenu() {
  showMenu.value = true
}

function closeMenu() {
  showMenu.value = false
}

async function copyMessage() {
  const text = isTextMessage.value ? props.message.content : voiceText.value
  await navigator.clipboard.writeText(text).catch(() => undefined)
  closeMenu()
}

function retryMessage() {
  emit('retry')
  closeMenu()
}

async function listenMessage() {
  closeMenu()
  await toggleTTS()
}

function stopVoicePlayback() {
  if (!currentAudio.value) return

  currentAudio.value.pause()
  currentAudio.value.currentTime = 0
  currentAudio.value = null
  isPlayingVoice.value = false
}

function toggleVoice() {
  if (!voiceData.value?.audioPath) return

  if (isPlayingVoice.value) {
    stopVoicePlayback()
    return
  }

  const audio = new Audio(voiceData.value.audioPath)
  audio.onplay = () => {
    isPlayingVoice.value = true
  }
  audio.onended = () => {
    isPlayingVoice.value = false
    currentAudio.value = null
  }
  audio.onerror = () => {
    isPlayingVoice.value = false
    currentAudio.value = null
  }

  currentAudio.value = audio
  audio.play().catch(() => {
    isPlayingVoice.value = false
    currentAudio.value = null
  })
}

function openImage() {
  if (typeof window !== 'undefined' && imagePath.value) {
    window.open(imagePath.value, '_blank', 'noopener,noreferrer')
  }
}

async function toggleTTS() {
  if (!props.message.content.trim()) return

  if (isTTSSpeaking.value) {
    ttsService.value?.stop()
    isTTSSpeaking.value = false
    return
  }

  const voiceConfig = await loadTTSConfig()
  ttsService.value?.destroy()
  ttsService.value = new TTSService({
    rate: voiceConfig.rate ?? 1,
    pitch: voiceConfig.pitch ?? 1,
    volume: voiceConfig.volume ?? 1,
    language: voiceConfig.language ?? 'zh-CN',
  })

  ttsService.value.onEnd(() => {
    isTTSSpeaking.value = false
  })
  ttsService.value.onError(() => {
    isTTSSpeaking.value = false
  })

  isTTSSpeaking.value = true

  try {
    await ttsService.value.speak(props.message.content)
  } catch {
    isTTSSpeaking.value = false
  }
}

onUnmounted(() => {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
  }

  stopVoicePlayback()
  ttsService.value?.destroy()
})
</script>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: rise-in 0.35s ease both;

  &.user {
    flex-direction: row-reverse;
  }
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.10);
  cursor: pointer;
  align-self: flex-start;
}

.bubble-main {
  max-width: min(680px, calc(100% - 48px));
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bubble-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: rgba(220, 230, 240, 0.20);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.message-bubble.user .bubble-card {
  border-color: rgba(255, 255, 255, 0.07);
  background: rgba(8, 14, 22, 0.76);
}

.text-content {
  margin: 0;
  padding: 9px 12px;
  color: var(--text-primary);
  line-height: 1.75;
  word-break: break-word;
}

.bubble-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 14px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.45);
    animation: dot-pulse 1.2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }

    &:nth-child(3) {
      animation-delay: 0.30s;
    }
  }
}

@keyframes dot-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.4;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

:deep(.action-text) {
  color: #8f9ca8;
}

.message-bubble.user :deep(.action-text) {
  color: #8b97a3;
}

.voice-card,
.image-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.voice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 11px;
}

.voice-copy {
  flex: 1;
  color: var(--text-primary);
}

.voice-duration {
  color: var(--text-secondary);
  font-size: 12px;
}

.image-card {
  flex-direction: column;
  align-items: flex-start;
  padding: 5px;
}

.message-image {
  display: block;
  width: min(320px, 100%);
  max-height: 360px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  object-fit: cover;
}

.image-copy {
  padding: 2px 4px 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.time {
  color: var(--text-tertiary);
  font-size: 11px;
  padding: 0 4px;
}

.message-bubble.user .time {
  text-align: right;
}

.bubble-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.bubble-menu {
  display: flex;
  width: min(380px, 100%);
  padding: 8px;
  gap: 4px;
  background: rgba(18, 24, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 22px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.menu-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 8px 12px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.speaking {
    color: #34d399;
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .bubble-main {
    max-width: calc(100% - 48px);
  }
}
</style>
