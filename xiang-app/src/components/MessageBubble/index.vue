<template>
  <article class="message-bubble" :class="{ user: isUser }">
    <img :src="avatarUrl" :alt="isUser ? 'User' : 'Assistant'" class="avatar" />

    <div class="bubble-main">
      <div
        class="bubble-card"
        :class="{
          'is-text': isTextMessage,
          'is-image': isImageMessage,
          'is-audio': isAudioMessage
        }"
      >
        <p v-if="isTextMessage" class="text-content">{{ message.content }}</p>

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

      <footer class="bubble-footer">
        <time class="time">{{ formattedTime }}</time>

        <div v-if="!isUser" class="actions">
          <button
            v-if="isTextMessage && message.content.trim()"
            type="button"
            class="action-btn"
            @click="toggleTTS"
          >
            {{ isTTSSpeaking ? '停止朗读' : '朗读' }}
          </button>

          <button
            type="button"
            class="action-btn"
            :class="{ active: message.isLiked }"
            @click="handleLike"
          >
            {{ message.isLiked ? '已赞' : '点赞' }}
          </button>

          <button
            v-if="isLastMessage"
            type="button"
            class="action-btn"
            @click="handleRetry"
          >
            重试
          </button>
        </div>
      </footer>
    </div>
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
  like: []
  retry: []
}>()

const isPlayingVoice = ref(false)
const isTTSSpeaking = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)
const ttsService = ref<TTSService | null>(null)

const isTextMessage = computed(() => props.message.contentType === MessageType.TEXT)
const isImageMessage = computed(() => props.message.contentType === MessageType.IMAGE)
const isAudioMessage = computed(() => props.message.contentType === MessageType.AUDIO)

const avatarUrl = computed(() => {
  return props.isUser
    ? props.userAvatar || '/src/static/images/user-avatar.svg'
    : props.assistantAvatar || '/src/static/images/ai-avatar.svg'
})

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

const voiceData = computed<VoiceData | null>(() => {
  if (!isAudioMessage.value) {
    return null
  }

  try {
    return JSON.parse(props.message.content) as VoiceData
  } catch {
    return null
  }
})

const imageData = computed<ImageData | null>(() => {
  if (!isImageMessage.value) {
    return null
  }

  try {
    return JSON.parse(props.message.content) as ImageData
  } catch {
    return {
      imagePath: props.message.content
    }
  }
})

const voiceText = computed(() => voiceData.value?.text || '语音消息')
const voiceDuration = computed(() => voiceData.value?.duration)
const imagePath = computed(() => imageData.value?.imagePath || props.message.content)
const imageDescription = computed(() => imageData.value?.description || '')

function stopVoicePlayback() {
  if (!currentAudio.value) {
    return
  }

  currentAudio.value.pause()
  currentAudio.value.currentTime = 0
  currentAudio.value = null
  isPlayingVoice.value = false
}

function toggleVoice() {
  if (!voiceData.value?.audioPath) {
    return
  }

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
  if (!props.message.content.trim()) {
    return
  }

  if (isTTSSpeaking.value) {
    stopTTS()
    return
  }

  const voiceConfig = await loadTTSConfig()

  ttsService.value?.destroy()
  ttsService.value = new TTSService({
    rate: voiceConfig.rate ?? 1,
    pitch: voiceConfig.pitch ?? 1,
    volume: voiceConfig.volume ?? 1,
    language: voiceConfig.language ?? 'zh-CN'
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

function stopTTS() {
  ttsService.value?.stop()
  isTTSSpeaking.value = false
}

function handleLike() {
  emit('like')
}

function handleRetry() {
  emit('retry')
}

onUnmounted(() => {
  stopVoicePlayback()
  ttsService.value?.destroy()
})
</script>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  animation: rise-in 0.45s ease both;

  &.user {
    flex-direction: row-reverse;
  }
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow: var(--shadow-sm);
}

.bubble-main {
  max-width: min(680px, calc(100% - 52px));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bubble-card {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(46, 51, 57, 0.26), rgba(16, 18, 21, 0.92));
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(calc(var(--backdrop-blur) * 0.75));
}

.message-bubble.user .bubble-card {
  border-color: rgba(176, 190, 206, 0.32);
  background: linear-gradient(135deg, rgba(176, 190, 206, 0.92), rgba(113, 129, 146, 0.96));
  box-shadow: 0 20px 40px rgba(113, 129, 146, 0.22);
}

.text-content {
  margin: 0;
  padding: 8px 9px;
  color: var(--text-primary);
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-bubble.user .text-content {
  color: #f8fbff;
}

.voice-card,
.image-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 7px 8px;
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
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
}

.voice-copy {
  flex: 1;
  color: var(--text-primary);
}

.voice-duration {
  color: var(--text-secondary);
  font-size: 12px;
}

.message-bubble.user .voice-copy,
.message-bubble.user .voice-duration {
  color: #f8fbff;
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
  border-radius: 16px;
  object-fit: cover;
}

.image-copy {
  padding: 2px 4px 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.bubble-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message-bubble.user .bubble-footer {
  justify-content: flex-end;
}

.time {
  color: var(--text-tertiary);
  font-size: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--ghost-gradient);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    color var(--transition-base),
    background var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    color: var(--text-primary);
    border-color: var(--accent-strong);
  }

  &.active {
    color: var(--primary-color);
    border-color: var(--accent-strong);
    background: var(--accent-soft);
  }
}

@media (max-width: 640px) {
  .bubble-main {
    max-width: calc(100% - 52px);
  }
}
</style>
