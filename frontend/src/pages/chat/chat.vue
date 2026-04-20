<template>
  <div class="chat-page">
    <header class="chat-header">
      <button type="button" class="btn-back" @click="router.back()">
        <svg viewBox="0 0 1024 1024" width="20" height="20">
          <path d="M768 112.512L718.016 64 256 512l462.016 448 49.984-48.512L355.968 512z" fill="currentColor"/>
        </svg>
      </button>

      <button type="button" class="header-center" @click="showDetailSheet = true">
        <strong>{{ character?.name || '角色' }}</strong>
        <span v-if="character?.sceneTime" class="header-scene">{{ character.sceneTime }}</span>
      </button>

      <span class="header-right-pad" aria-hidden="true"></span>
    </header>

    <main class="message-list">
      <section v-if="showQuickPrompts" class="hero-card">
        <p class="hero-eyebrow">开始对话</p>
        <h1>{{ character?.name || '角色' }} 正在线</h1>
        <p class="hero-copy">
          你可以直接输入对白，也可以用括号补充动作、表情和语气。
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
        <strong>还没有消息</strong>
        <p>发送第一句话，或从上方推荐提示开始。</p>
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
          @retry="retryGeneration(message.id)"
          @avatar-click="openCharacterSheet"
        />
      </div>
    </main>

    <footer class="composer-shell">
      <div v-if="recordingState !== RecordingState.IDLE" class="recording-card">
        <strong>
          {{
            recordingState === RecordingState.RECORDING
              ? '正在录音'
              : recordingState === RecordingState.PROCESSING
                ? '正在转写'
                : '按住说话'
          }}
        </strong>
        <span>{{ recordingCopy }}</span>
      </div>

      <div class="composer">
        <div class="composer-row">
          <div class="input-area">
            <textarea
              v-if="!voiceMode"
              ref="inputRef"
              v-model="inputText"
              class="message-input"
              :disabled="chatStore.isGenerating || recordingState === RecordingState.PROCESSING"
              placeholder="输入消息…"
              rows="1"
              @keydown.enter.exact.prevent="sendMessage"
              @focus="onInputFocus"
              @blur="onInputBlur"
              @pointerdown="onInputPointerDown"
              @pointerup="onInputPointerUp"
              @pointerleave="onInputPointerUp"
            />
            <button
              v-else
              type="button"
              class="hold-to-talk"
              :class="{ recording: recordingState === RecordingState.RECORDING }"
              @pointerdown="onHoldToTalkStart"
              @pointerup="onHoldToTalkEnd"
              @pointerleave="onHoldToTalkEnd"
            >
              {{ recordingState === RecordingState.RECORDING ? '松开发送' : '按住说话' }}
            </button>
          </div>

          <button
            v-if="showBracketButton"
            type="button"
            class="icon-btn bracket-btn"
            title="插入括号"
            @pointerdown.prevent="insertParenthesesAtCursor"
          >
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path
                d="M395.733333 128H288.853333A679.509333 679.509333 0 0 0 170.666667 512c0 142.378667 43.605333 274.602667 118.186666 384h106.88A594.901333 594.901333 0 0 1 256 512c0-146.176 52.48-280.106667 139.733333-384z m232.533334 768A594.901333 594.901333 0 0 0 768 512c0-146.176-52.48-280.106667-139.733333-384h106.922666A679.509333 679.509333 0 0 1 853.333333 512c0 142.378667-43.605333 274.602667-118.186666 384h-106.88z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            v-if="showVoiceToggle"
            type="button"
            class="icon-btn"
            :title="voiceMode ? '键盘' : '语音'"
            @click="toggleVoiceModeBtn"
          >
            <svg v-if="!voiceMode" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" fill="currentColor"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20">
              <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" fill="currentColor"/>
            </svg>
          </button>

          <button
            v-if="showSendButton"
            type="button"
            class="send-circle-btn send-mode"
            :disabled="chatStore.isGenerating || !hasSendableContent"
            @click="sendMessage"
            title="发送"
          >
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path
                d="M512 85.333333c234.666667 0 426.666667 192 426.666667 426.666667s-192 426.666667-426.666667 426.666667S85.333333 746.666667 85.333333 512 277.333333 85.333333 512 85.333333z m-6.4 234.666667c-4.266667 2.133333-6.4 2.133333-12.8 8.533333l-153.6 153.6c-12.8 12.8-12.8 32 0 44.8 12.8 12.8 32 12.8 44.8 0l96-96V682.666667c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V430.933333l96 96c12.8 12.8 32 12.8 44.8 0s12.8-32 0-44.8l-153.6-153.6c-6.4-6.4-8.533333-8.533333-12.8-8.533333s-8.533333-2.133333-12.8 0z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            v-else
            type="button"
            class="send-circle-btn"
            :class="{ open: showTools }"
            @click="toggleTools"
            title="更多"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div v-if="showTools" class="tools-panel">
          <button type="button" class="icon-btn" title="回滚" @click="doRollback">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" fill="currentColor"/>
            </svg>
          </button>

          <button type="button" class="icon-btn" title="图片" @click="chooseImage">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </footer>

    <div class="page-floor" aria-hidden="true"></div>

    <Teleport to="body">
      <div v-if="showCharacterSheet" class="overlay" @click.self="showCharacterSheet = false">
        <section class="char-sheet">
          <div class="char-sheet-head">
            <img :src="characterAvatar" :alt="character?.name" class="char-sheet-avatar" />
            <strong>{{ character?.name }}</strong>
          </div>
          <div class="char-sheet-actions">
            <button type="button" class="char-action" @click="sheetClearHistory">
              <span class="char-action-icon">清</span>清空记录
            </button>
            <button type="button" class="char-action" @click="sheetToggleFriend">
              <span class="char-action-icon">{{ character?.isFriend ? '已' : '+' }}</span>{{ character?.isFriend ? '取消好友' : '加入好友' }}
            </button>
            <button type="button" class="char-action" @click="sheetToggleLike">
              <span class="char-action-icon">{{ character?.isLiked ? '已' : '赞' }}</span>{{ character?.isLiked ? '取消喜欢' : '标记喜欢' }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>

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
          <p class="detail-text">{{ character?.description || '暂无角色简介。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">记忆摘要</p>
          <p class="detail-text">{{ memorySummary || '暂无记忆摘要。' }}</p>
        </section>

        <section class="detail-section">
          <p class="detail-label">偏好标签</p>
          <div class="tag-list">
            <span v-for="item in memoryPreferences" :key="item" class="memory-tag">
              {{ item }}
            </span>
            <span v-if="memoryPreferences.length === 0" class="memory-tag subtle">暂无</span>
          </div>
        </section>

        <section class="detail-actions">
          <button type="button" class="ghost-btn" @click="openCharacterDetail">查看详情</button>
          <button type="button" class="ghost-btn" @click="confirmClearHistory">清空记录</button>
        </section>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const character = ref<any>(null)
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isInputFocused = ref(false)
const showDetailSheet = ref(false)
const showCharacterSheet = ref(false)
const autoVoicePlayback = ref(false)
const voiceMode = ref(false)
const showTools = ref(false)
const recordingState = ref<RecordingState>(RecordingState.IDLE)
const recordingStartedAt = ref(0)
const memorySummary = ref('')
const memoryPreferences = ref<string[]>([])

const sttService = ref<STTService | null>(null)
const ttsService = ref<TTSService | null>(null)
const lastAutoSpokenMessageId = ref('')

let longPressTimer: ReturnType<typeof setTimeout> | null = null

const defaultAvatar = '/src/static/images/default-avatar.svg'
const characterId = computed(() => route.params.characterId as string)
const sessionId = computed(() => (route.query.sessionId as string) || '')
const messages = computed(() => chatStore.messages)
const hasComposerContent = computed(() => inputText.value.length > 0)
const hasSendableContent = computed(() => inputText.value.trim().length > 0)
const showBracketButton = computed(() => !voiceMode.value && (hasComposerContent.value || isInputFocused.value))
const showVoiceToggle = computed(() => !hasComposerContent.value)
const showSendButton = computed(() => hasComposerContent.value)
const characterAvatar = computed(() => character.value?.avatar || defaultAvatar)
const playerAvatar = computed(() => userStore.userAvatar || defaultAvatar)
const characterMeta = computed(() =>
  [character.value?.category, character.value?.subCategory].filter(Boolean).join(' / ') || '角色设定'
)
const showQuickPrompts = computed(() => messages.value.length <= 1 && !chatStore.isGenerating)
const quickPrompts = computed(() => {
  const name = character.value?.name || 'TA'
  return [
    `${name}，先用一句话介绍你现在的状态。`,
    '从当前场景继续，不要跳出角色。',
    '描述一下你现在的动作、表情和语气。'
  ]
})
const recordingCopy = computed(() => {
  if (recordingState.value === RecordingState.RECORDING) {
    return '正在录音，松开后会自动发送。'
  }

  if (recordingState.value === RecordingState.PROCESSING) {
    return '正在转写语音，请稍候。'
  }

  return '按住按钮说话，松开发送。'
})


onActivated(() => {
  scrollToBottom()
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

watch(hasComposerContent, hasContent => {
  if (!hasContent) {
    return
  }

  showTools.value = false
  voiceMode.value = false
})

function scrollToBottom() {
  nextTick(() => {
    window.scrollTo({ top: document.body.scrollHeight })
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
      title: (error as Error).message || '发送失败',
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
        await chatStore.sendImage(imagePath)
      } catch (error) {
        uni.showToast({
          title: (error as Error).message || '图片发送失败',
          icon: 'none'
        })
      }
    }
  })
}

function toggleTools() {
  showTools.value = !showTools.value
}

function toggleVoiceModeBtn() {
  if (voiceMode.value && recordingState.value === RecordingState.RECORDING) {
    finishVoiceRecording()
  }

  isInputFocused.value = false
  showTools.value = false
  voiceMode.value = !voiceMode.value
}

function onInputFocus() {
  isInputFocused.value = true
}

function onInputBlur() {
  isInputFocused.value = false
}

function insertParenthesesAtCursor() {
  if (chatStore.isGenerating || recordingState.value === RecordingState.PROCESSING) {
    return
  }

  voiceMode.value = false
  showTools.value = false
  isInputFocused.value = true

  const currentValue = inputText.value
  const textarea = inputRef.value
  const start = textarea?.selectionStart ?? currentValue.length
  const end = textarea?.selectionEnd ?? currentValue.length
  const selectedText = currentValue.slice(start, end)
  const insertion = selectedText ? `（${selectedText}）` : '（）'

  inputText.value = `${currentValue.slice(0, start)}${insertion}${currentValue.slice(end)}`

  void nextTick(() => {
    const element = inputRef.value
    if (!element) {
      return
    }

    element.focus()
    const cursor = selectedText ? start + insertion.length : start + 1
    element.setSelectionRange(cursor, cursor)
  })
}

function onInputPointerDown() {
  longPressTimer = setTimeout(() => {
    voiceMode.value = true
  }, 600)
}

function onInputPointerUp() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

async function onHoldToTalkStart() {
  await toggleVoiceRecording()
}

async function onHoldToTalkEnd() {
  if (recordingState.value === RecordingState.RECORDING) {
    await finishVoiceRecording()
  }
}

async function doRollback() {
  const assistantMessages = messages.value.filter(m => m.role === 'assistant')
  const last = assistantMessages[assistantMessages.length - 1]
  if (!last) {
    return
  }
  await retryGeneration(last.id)
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
      title: '当前设备不支持语音输入',
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
    uni.showToast({
      title: (error as Error).message || '开始录音失败',
      icon: 'none'
    })
    recordingState.value = RecordingState.IDLE
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
        title: '未识别到语音内容',
        icon: 'none'
      })
      return
    }

    if (typeof uploadSource === 'string' && uploadSource) {
      await chatStore.sendVoice(uploadSource, transcript, duration)
    } else {
      await chatStore.sendMessage(transcript)
    }

    recordingState.value = RecordingState.IDLE
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '语音发送失败',
      icon: 'none'
    })
    recordingState.value = RecordingState.IDLE
  }
}

function isLastAssistantMessage(index: number) {
  if (messages.value[index]?.role !== 'assistant') {
    return false
  }

  return !messages.value.slice(index + 1).some(message => message.role === 'assistant')
}

async function retryGeneration(messageId: string) {
  try {
    await chatStore.retryLastResponse(messageId)
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '重新生成失败',
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
    title: '清空聊天记录',
    content: '确认清空当前会话记录吗？此操作不可撤销。',
    success: async result => {
      if (!result.confirm) return
      await chatStore.clearHistory()
      await refreshMemory()
      showDetailSheet.value = false
    }
  })
}

function openCharacterSheet() {
  showCharacterSheet.value = true
}

async function sheetClearHistory() {
  showCharacterSheet.value = false
  confirmClearHistory()
}

async function sheetToggleFriend() {
  if (!characterId.value) return
  await characterStore.toggleFriend(characterId.value)
  character.value = await characterStore.getCharacterById(characterId.value)
  uni.showToast({ title: character.value?.isFriend ? '已加入好友' : '已取消好友', icon: 'none' })
}

async function sheetToggleLike() {
  if (!characterId.value) return
  await characterStore.toggleLike(characterId.value)
  character.value = await characterStore.getCharacterById(characterId.value)
  uni.showToast({ title: character.value?.isLiked ? '已标记喜欢' : '已取消喜欢', icon: 'none' })
}

onUnmounted(() => {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
  }
  sttService.value?.destroy()
  ttsService.value?.destroy()
})
</script>

<style lang="scss" scoped>
.chat-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 58px 16px 170px;
  background:
    radial-gradient(ellipse at 20% 5%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 50%, #0a1e2c 100%);
}

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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 6px 12px;
  background: rgba(5, 13, 20, 0.68);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.btn-back {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  cursor: pointer;

  strong {
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.2;
  }

  .header-scene {
    color: var(--text-tertiary);
    font-size: 11px;
  }
}

.header-right-pad {
  /* mirror of btn-back width so center column stays geometrically centered */
  display: block;
  width: 40px;
}

.detail-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.20);
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: calc(100vh - 210px);
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

.page-floor {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 160px;
  /* Transparent at top so messages fade out naturally, solid from ~100px up from bottom */
  background: linear-gradient(to bottom, transparent 0%, #071520 50px);
  pointer-events: none;
  z-index: 9;
}

.composer-shell {
  position: fixed;
  right: 16px;
  bottom: 70px;
  left: 16px;
  display: grid;
  gap: 10px;
  z-index: 10;
}

.recording-card,
.composer {
  padding: 12px 14px;
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

.tools-panel {
  display: flex;
  gap: 12px;
  padding-top: 10px;
  margin-top: 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.composer-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-area {
  flex: 1;
  min-width: 0;
}

.message-input {
  display: block;
  width: 100%;
  height: 27px;
  padding: 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
  line-height: 27px;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    outline: none;
  }
}

.hold-to-talk {
  width: 100%;
  height: 27px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &.recording {
    color: #34d399;
  }
}

.icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);

  svg {
    display: block;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
  }
}

.bracket-btn {
  color: #8adac8;
}

.send-circle-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(235, 239, 244, 0.92), rgba(160, 170, 180, 0.92));
  color: rgb(9, 10, 12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;

  svg {
    display: block;
  }

  &.open {
    transform: rotate(45deg);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.send-circle-btn.send-mode {
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.96), rgba(56, 189, 248, 0.96), rgba(2, 132, 199, 0.96));
  color: #09121f;
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
  z-index: 10000;
}

.char-sheet {
  width: min(360px, 100%);
  padding: 20px 16px 16px;
  border-radius: 22px;
  background: rgba(12, 20, 30, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px);
}

.char-sheet-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;

  strong {
    color: var(--text-primary);
    font-size: 16px;
  }
}

.char-sheet-avatar {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.char-sheet-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.char-action {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.10);
  }
}

.char-action-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
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

.ghost-btn,
.icon-close {
  min-height: 42px;
  border: none;
  border-radius: 12px;
  font: inherit;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
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
    padding: 54px 12px 170px;
  }

  .chat-header {
    padding: 5px 10px;
  }

  .composer-shell {
    right: 12px;
    bottom: 70px;
    left: 12px;
  }
}
</style>
