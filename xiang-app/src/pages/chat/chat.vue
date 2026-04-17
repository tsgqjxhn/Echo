<template>
  <div class="chat-page">
    <header class="chat-header">
      <button type="button" class="header-btn" @click="router.back()">返回</button>

      <button type="button" class="header-main" @click="showDetailSheet = true">
        <img :src="characterAvatar" :alt="character?.name || '角色'" class="header-avatar" />
        <div class="header-copy">
          <strong>{{ character?.name || '对话' }}</strong>
          <span>{{ headerStatus }}</span>
        </div>
      </button>

      <button
        type="button"
        class="header-btn"
        :class="{ active: autoVoicePlayback }"
        @click="toggleAutoVoicePlayback"
      >
        语音
      </button>
    </header>

    <main ref="messageListRef" class="message-list">
      <section v-if="showQuickPrompts" class="hero-card">
        <p class="hero-eyebrow">推荐开场</p>
        <h1>{{ character?.name || '角色' }} 已准备好接话</h1>
        <p class="hero-copy">
          现在是自由对话模式。你可以直接开聊，也可以先用一条推荐开场把语气定下来。
        </p>

        <div class="prompt-list">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="prompt-chip"
            @click="sendQuickPrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </section>

      <div v-if="messages.length === 0 && !showQuickPrompts" class="empty-state">
        <strong>开始一段新对话</strong>
        <p>第一句会决定这段关系从哪里开始。</p>
      </div>

      <div
        v-for="(message, index) in messages"
        :key="message.id"
        class="message-row"
      >
        <MessageBubble
          :message="message"
          :is-user="message.role === 'user'"
          :is-last-message="isLastAssistantMessage(index)"
          :assistant-avatar="characterAvatar"
          :user-avatar="playerAvatar"
          @like="toggleLike(message.id)"
          @retry="retryGeneration(message.id)"
        />
      </div>

      <div v-if="chatStore.isGenerating" class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span>对方正在输入……</span>
      </div>
    </main>

    <footer class="composer-shell">
      <div v-if="recordingState !== RecordingState.IDLE" class="recording-card">
        <strong>
          {{
            recordingState === RecordingState.RECORDING
              ? '录音中'
              : recordingState === RecordingState.PROCESSING
                ? '正在转写'
                : '录音异常'
          }}
        </strong>
        <span>{{ recordingCopy }}</span>
      </div>

      <div class="composer">
        <div class="composer-tools">
          <button type="button" class="tool-btn" @click="chooseImage">图片</button>
          <button
            type="button"
            class="tool-btn"
            :class="{ active: recordingState === RecordingState.RECORDING }"
            @click="toggleVoiceRecording"
          >
            {{
              recordingState === RecordingState.RECORDING
                ? '结束'
                : recordingState === RecordingState.PROCESSING
                  ? '转写中'
                  : '语音'
            }}
          </button>
        </div>

        <div class="composer-main">
          <textarea
            v-model="inputText"
            class="message-input"
            :disabled="chatStore.isGenerating || recordingState === RecordingState.PROCESSING"
            placeholder="输入消息，按 Enter 发送"
            rows="3"
            @keydown.enter.exact.prevent="sendMessage"
          />

          <button
            type="button"
            class="send-btn"
            :disabled="!inputText.trim() || chatStore.isGenerating || recordingState === RecordingState.PROCESSING"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
      </div>
    </footer>

    <div v-if="showDetailSheet" class="overlay" @click.self="showDetailSheet = false">
      <section class="detail-sheet">
        <header class="detail-head">
          <div class="detail-profile">
            <img :src="characterAvatar" :alt="character?.name || '角色'" class="detail-avatar" />
            <div>
              <strong>{{ character?.name || '角色' }}</strong>
              <span>{{ characterMeta }}</span>
            </div>
          </div>

          <button type="button" class="icon-close" @click="showDetailSheet = false">×</button>
        </header>

        <section class="detail-section">
          <p class="detail-label">角色简介</p>
          <p class="detail-text">{{ character?.description || '暂无简介。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">长期记忆</p>
          <p class="detail-text">{{ memorySummary || '对话刚开始，还没有沉淀出长期记忆。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">记住的偏好</p>
          <div class="tag-list">
            <span v-for="item in memoryPreferences" :key="item" class="memory-tag">
              {{ item }}
            </span>
            <span v-if="memoryPreferences.length === 0" class="memory-tag subtle">还没有</span>
          </div>
        </section>

        <section class="detail-actions">
          <button type="button" class="ghost-btn" @click="openCharacterDetail">查看角色页</button>
          <button type="button" class="ghost-btn" @click="confirmClearHistory">清空聊天</button>
        </section>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadAsset } from '@/services/files'
import { useChatStore } from '@/stores/chat'
import { useCharacterStore } from '@/stores/character'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'
import MessageBubble from '@/components/MessageBubble/index.vue'
import { TTSService } from '@/services/tts'
import { DEFAULT_STT_CONFIG, loadVoiceSettings } from '@/services/voice-settings'
import { RecordingState, STTService } from '@/services/stt'
import { loadCharacterMemory } from '@/services/chat-memory'
import { getStorageDriver } from '@/services/storage'
import { ECHO_STORY_CHARACTER_ID } from '@/services/story-conversations'

const AUTO_VOICE_KEY = 'chat_auto_tts'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const characterStore = useCharacterStore()
const userStore = useUserStore()
const storage = getStorageDriver()

const messageListRef = ref<HTMLDivElement | null>(null)
const character = ref<any>(null)
const inputText = ref('')
const showDetailSheet = ref(false)
const autoVoicePlayback = ref(false)
const recordingState = ref<RecordingState>(RecordingState.IDLE)
const recordingStartedAt = ref(0)
const memorySummary = ref('')
const memoryPreferences = ref<string[]>([])

const sttService = ref<STTService | null>(null)
const ttsService = ref<TTSService | null>(null)
const lastAutoSpokenMessageId = ref('')

const defaultAvatar = '/src/static/images/default-avatar.svg'
const characterId = computed(() => route.params.characterId as string)
const sessionId = computed(() => (route.query.sessionId as string) || '')
const messages = computed(() => chatStore.messages)
const characterAvatar = computed(() => character.value?.avatar || defaultAvatar)
const playerAvatar = computed(() => userStore.userAvatar || defaultAvatar)
const headerStatus = computed(() => {
  if (recordingState.value === RecordingState.RECORDING) {
    return '正在聆听'
  }

  if (chatStore.isGenerating) {
    return '正在输入'
  }

  return messages.value.length > 0 ? '在线' : '等待开口'
})
const characterMeta = computed(() =>
  [character.value?.category, character.value?.subCategory].filter(Boolean).join(' / ') || '自由对话'
)
const showQuickPrompts = computed(() => messages.value.length <= 1 && !chatStore.isGenerating)
const quickPrompts = computed(() => {
  const name = character.value?.name || '你'
  return [
    `${name}，先说说你现在在做什么`,
    `我们别客套了，直接进入状态吧`,
    `按你的设定和我继续聊下去`,
    `给我一句最适合今晚气氛的开场`,
  ]
})
const recordingCopy = computed(() => {
  if (recordingState.value === RecordingState.RECORDING) {
    return '再点一次结束录音并自动转写。'
  }

  if (recordingState.value === RecordingState.PROCESSING) {
    return '语音会转成文字后直接发出去。'
  }

  return '录音失败，请重试。'
})

onMounted(async () => {
  await Promise.all([
    userStore.loadUserInfo().catch(() => null),
    initChat()
  ])

  await loadCharacter()
  if (character.value?.sourceType === 'builtin-story' || characterId.value === ECHO_STORY_CHARACTER_ID) {
    router.replace('/dialogue')
    return
  }

  await loadAutoVoicePlayback()
  await refreshMemory()
  scrollToBottom()
})

watch(
  () => {
    const lastMessage = messages.value[messages.value.length - 1]
    return `${messages.value.length}:${lastMessage?.id || ''}:${lastMessage?.content.length || 0}:${chatStore.isGenerating}`
  },
  async () => {
    scrollToBottom()
    await maybeAutoSpeak()
    if (!chatStore.isGenerating) {
      await refreshMemory()
    }
  }
)

function scrollToBottom() {
  nextTick(() => {
    if (!messageListRef.value) {
      return
    }

    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  })
}

async function initChat() {
  if (!characterId.value) {
    return
  }

  try {
    await chatStore.initChat(characterId.value, sessionId.value || undefined)
  } catch {
    if (!sessionId.value) {
      throw new Error('Failed to initialize chat session.')
    }

    await chatStore.initChat(characterId.value)
  }
}

async function loadCharacter() {
  character.value = await characterStore.getCharacterById(characterId.value)
}

async function refreshMemory() {
  if (!characterId.value || !character.value) {
    return
  }

  const profile = await loadCharacterMemory(storage, characterId.value, character.value.name)
  memorySummary.value = profile.summary
  memoryPreferences.value = profile.userPreferences.slice(-4)
}

async function loadAutoVoicePlayback() {
  const raw = await storage.getUserSetting(AUTO_VOICE_KEY)
  autoVoicePlayback.value = raw === '1'
}

async function toggleAutoVoicePlayback() {
  autoVoicePlayback.value = !autoVoicePlayback.value
  await storage.saveUserSetting(AUTO_VOICE_KEY, autoVoicePlayback.value ? '1' : '0')
  uni.showToast({
    title: autoVoicePlayback.value ? '已开启语音回放' : '已关闭语音回放',
    icon: 'none'
  })
}

async function maybeAutoSpeak() {
  if (!autoVoicePlayback.value || chatStore.isGenerating) {
    return
  }

  const lastMessage = [...messages.value].reverse().find(message => message.role === 'assistant')
  if (!lastMessage || lastMessage.id === lastAutoSpokenMessageId.value || !lastMessage.content.trim()) {
    return
  }

  const settings = await loadVoiceSettings()
  ttsService.value?.destroy()
  ttsService.value = new TTSService({
    ...settings.tts,
    language: settings.tts.language || 'zh-CN'
  })

  lastAutoSpokenMessageId.value = lastMessage.id
  try {
    await ttsService.value.speak(lastMessage.content)
  } catch {
    // Ignore autoplay failures.
  }
}

async function sendQuickPrompt(prompt: string) {
  inputText.value = prompt
  await sendMessage()
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || chatStore.isGenerating) {
    return
  }

  inputText.value = ''

  try {
    await chatStore.sendMessage(content)
  } catch (error) {
    inputText.value = content
    uni.showToast({
      title: (error as Error).message || '发送失败，请稍后再试',
      icon: 'none'
    })
  }
}

async function chooseImage() {
  uni.chooseImage({
    count: 1,
    success: async res => {
      const imagePath = res.tempFilePaths?.[0]
      if (!imagePath) {
        return
      }

      try {
        const uploaded = await uploadAsset({
          source: imagePath,
          assetType: 'image',
          ownerType: 'message',
          ownerId: chatStore.currentSessionId || undefined
        })
        await chatStore.sendImage(uploaded.url)
      } catch (error) {
        uni.showToast({
          title: (error as Error).message || '发送图片失败',
          icon: 'none'
        })
      }
    }
  })
}

async function toggleVoiceRecording() {
  if (!sttService.value) {
    const settings = await loadVoiceSettings()
    sttService.value = new STTService({
      language: settings.stt.language || DEFAULT_STT_CONFIG.language
    })
  }

  if (!sttService.value.isSupported()) {
    uni.showToast({
      title: '当前环境不支持录音',
      icon: 'none'
    })
    return
  }

  if (recordingState.value === RecordingState.PROCESSING) {
    return
  }

  if (recordingState.value === RecordingState.RECORDING) {
    await finishVoiceRecording()
    return
  }

  try {
    await sttService.value.startRecording()
    recordingState.value = RecordingState.RECORDING
    recordingStartedAt.value = Date.now()
  } catch (error) {
    recordingState.value = RecordingState.ERROR
    uni.showToast({
      title: (error as Error).message || '录音启动失败',
      icon: 'none'
    })
  }
}

async function finishVoiceRecording() {
  if (!sttService.value) {
    return
  }

  recordingState.value = RecordingState.PROCESSING

  try {
    const tempAudioPath = await sttService.value.stopRecording()
    const transcript = await sttService.value.transcribe(tempAudioPath)
    const duration = Math.max(1, Math.round((Date.now() - recordingStartedAt.value) / 1000))
    const recordedBlob = sttService.value.getRecordedBlob()
    const uploadSource = recordedBlob || sttService.value.getTempAudioPath()

    if (!transcript.trim()) {
      recordingState.value = RecordingState.IDLE
      uni.showToast({
        title: '没有识别到清晰语音',
        icon: 'none'
      })
      return
    }

    try {
      const uploaded = await uploadAsset({
        source: uploadSource,
        assetType: 'audio',
        ownerType: 'message',
        ownerId: chatStore.currentSessionId || undefined,
        filename: recordedBlob ? 'voice-message.webm' : undefined
      })
      await chatStore.sendVoice(uploaded.url, transcript, duration)
    } catch {
      await chatStore.sendMessage(transcript)
    }

    recordingState.value = RecordingState.IDLE
  } catch (error) {
    recordingState.value = RecordingState.ERROR
    uni.showToast({
      title: (error as Error).message || '语音发送失败',
      icon: 'none'
    })
  }
}

function isLastAssistantMessage(index: number) {
  if (messages.value[index]?.role !== 'assistant') {
    return false
  }

  return !messages.value.slice(index + 1).some(message => message.role === 'assistant')
}

async function toggleLike(messageId: string) {
  try {
    await chatStore.toggleLike(messageId)
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '点赞失败',
      icon: 'none'
    })
  }
}

async function retryGeneration(messageId: string) {
  try {
    await chatStore.retryLastResponse(messageId)
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '重试失败',
      icon: 'none'
    })
  }
}

function openCharacterDetail() {
  showDetailSheet.value = false
  router.push(`/character/detail/${characterId.value}`)
}

function confirmClearHistory() {
  uni.showModal({
    title: '清空聊天',
    content: '确认清空当前角色的聊天记录吗？',
    success: async result => {
      if (!result.confirm) {
        return
      }

      await chatStore.clearHistory()
      await refreshMemory()
      showDetailSheet.value = false
    }
  })
}

onUnmounted(() => {
  sttService.value?.destroy()
  ttsService.value?.destroy()
})
</script>

<style lang="scss" scoped>
.chat-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 16px 16px 108px;
  background:
    radial-gradient(ellipse at 20% 5%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 50%, #0a1e2c 100%);
}

.chat-header,
.hero-card,
.empty-state,
.recording-card,
.composer,
.detail-sheet {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.chat-header {
  position: sticky;
  top: 16px;
  z-index: 10;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 18px;
}

.header-btn {
  min-height: 42px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 12px;
  background: rgba(52, 211, 153, 0.07);
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.14);
    color: var(--text-primary);
  }
}

.header-btn.active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.80), rgba(52, 211, 153, 0.70));
  border-color: transparent;
  color: #fff;
  font-weight: 700;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.header-avatar,
.detail-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.20);
}

.header-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-copy strong {
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.2;
}

.header-copy span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: calc(100vh - 210px);
  margin-top: 14px;
  overflow-y: auto;
}

.hero-card,
.empty-state {
  padding: 18px;
  border-radius: 18px;
  border-color: rgba(52, 211, 153, 0.14);
}

.hero-eyebrow,
.detail-label {
  color: #7dd3fc;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.9;
}

.hero-card h1,
.empty-state strong {
  display: block;
  margin: 10px 0 8px;
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1.2;
}

.hero-copy,
.empty-state p,
.detail-text {
  color: var(--text-secondary);
  line-height: 1.75;
}

.prompt-list,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.prompt-chip,
.memory-tag {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.08);
  color: #6ee7b7;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.18);
    border-color: rgba(52, 211, 153, 0.28);
    color: #fff;
  }
}

.memory-tag.subtle {
  color: var(--text-secondary);
  border-color: rgba(78, 68, 112, 0.28);
  background: rgba(78, 68, 112, 0.16);
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(56, 189, 248, 0.14);
  background: linear-gradient(135deg, rgba(35, 16, 48, 0.70), rgba(18, 8, 30, 0.88));
  color: var(--text-secondary);
  font-size: 13px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #38bdf8;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.50);
  animation: pulse 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.50);
  animation-delay: 0.12s;
}

.typing-dot:nth-child(3) {
  background: #67e8f9;
  box-shadow: 0 0 6px rgba(103, 232, 249, 0.50);
  animation-delay: 0.24s;
}

.composer-shell {
  position: fixed;
  right: 16px;
  bottom: 86px;
  left: 16px;
  display: grid;
  gap: 10px;
}

.recording-card,
.composer {
  padding: 14px;
  border-radius: 18px;
}

.recording-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recording-card strong {
  color: var(--text-primary);
}

.recording-card span {
  color: var(--text-secondary);
  font-size: 13px;
}

.composer-tools {
  display: flex;
  gap: 10px;
}

.tool-btn,
.send-btn,
.ghost-btn,
.icon-close {
  min-height: 42px;
  border: none;
  border-radius: 12px;
  font: inherit;
  cursor: pointer;
}

.tool-btn,
.ghost-btn,
.icon-close {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.tool-btn.active {
  background: rgba(235, 239, 244, 0.92);
  color: rgb(9, 10, 12);
  font-weight: 700;
}

.composer-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px;
  gap: 10px;
  margin-top: 10px;
}

.message-input {
  width: 100%;
  min-height: 78px;
  padding: 14px 16px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  resize: none;
}

.message-input:focus {
  outline: none;
}

.send-btn {
  background: linear-gradient(135deg, rgba(235, 239, 244, 0.92), rgba(160, 170, 180, 0.92));
  color: rgb(9, 10, 12);
  font-weight: 700;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.64);
  backdrop-filter: blur(16px);
  z-index: 1200;
}

.detail-sheet {
  width: min(520px, 100%);
  padding: 18px;
  border-radius: 22px;
}

.detail-head,
.detail-profile,
.detail-actions {
  display: flex;
  align-items: center;
}

.detail-head {
  justify-content: space-between;
  gap: 12px;
}

.detail-profile {
  gap: 12px;
}

.detail-profile strong {
  display: block;
  color: var(--text-primary);
  font-size: 20px;
}

.detail-profile span {
  color: var(--text-secondary);
  font-size: 13px;
}

.detail-section {
  margin-top: 18px;
}

.detail-actions {
  gap: 10px;
  margin-top: 20px;
}

.ghost-btn {
  flex: 1;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

@media (min-width: 960px) {
  .chat-page {
    width: min(760px, 100%);
    margin: 0 auto;
  }

  .composer-shell {
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
  }
}

@media (max-width: 640px) {
  .chat-page {
    padding: 12px 12px 106px;
  }

  .chat-header {
    top: 12px;
    grid-template-columns: 58px minmax(0, 1fr) 58px;
  }

  .composer-shell {
    right: 12px;
    bottom: 84px;
    left: 12px;
  }

  .composer-main {
    grid-template-columns: 1fr;
  }

  .send-btn {
    min-height: 48px;
  }
}
</style>
