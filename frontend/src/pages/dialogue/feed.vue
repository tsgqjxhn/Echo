<template>
  <div class="dialogue-page" @pointerdown="unlockAudio">
    <section class="dialogue-shell">
      <header class="dialogue-header">
        <button v-if="!isFromTabBar" type="button" class="btn-back" @click="router.back()">
          <svg viewBox="0 0 1024 1024" width="20" height="20" aria-hidden="true">
            <path d="M768 112.512L718.016 64 256 512l462.016 448 49.984-48.512L355.968 512z" fill="currentColor" />
          </svg>
        </button>
        <ConversationSwitchButton
          v-else-if="showRandomSwitchButton"
          class="header-switch"
          :disabled="switchingCharacter || isBusy"
          @click="switchToRandomCharacter"
        />

        <div class="header-copy">
          <strong>{{ headerTitle }}</strong>
        </div>

        <div class="header-actions">
          <div class="header-time">{{ currentGameTime }}</div>
          <button type="button" class="btn-more" aria-label="更多" @click="showDialogueMore = !showDialogueMore">
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path d="M512 298.6496a85.3504 85.3504 0 1 0 0-170.6496 85.3504 85.3504 0 0 0 0 170.6496z" fill="currentColor"/>
              <path d="M512 512m-85.3504 0a85.3504 85.3504 0 1 0 170.7008 0 85.3504 85.3504 0 1 0-170.7008 0Z" fill="currentColor"/>
              <path d="M512 896a85.3504 85.3504 0 1 0 0-170.7008 85.3504 85.3504 0 0 0 0 170.7008z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      <main ref="messageScroller" class="message-scroller">
        <div class="message-list">
          <div class="presence-status" :class="`presence-status--${presenceStatusTone}`">
            {{ presenceStatusText }}
          </div>

          <article
            v-for="message in displayedMessages"
            :key="message.id"
            class="message-row"
            :class="`message-row--${message.role}`"
          >
            <template v-if="message.role === 'assistant'">
              <img :src="storyDisplayAvatar" alt="对方" class="bubble-avatar bubble-avatar--assistant" />
            </template>

            <div class="bubble-stack">
              <button
                v-if="isImageUrl(message.text)"
                type="button"
                class="message-bubble message-bubble--image"
                :class="`message-bubble--${message.role}`"
                @click.stop="openStoryImage(extractImageUrl(message.text))"
              >
                <img :src="extractImageUrl(message.text)" alt="场景图" class="story-insert-image" />
              </button>
              <div v-else class="message-bubble" :class="`message-bubble--${message.role}`">
                {{ message.text }}
              </div>
            </div>

            <template v-if="message.role === 'user'">
              <img :src="playerAvatar" alt="你" class="bubble-avatar bubble-avatar--user" />
            </template>
          </article>

          <div v-if="!hasStoryContent" class="empty-block">
            <strong>暂无可用角色</strong>
            <p>去创建吧</p>
          </div>

          <article v-if="isTyping" class="message-row message-row--assistant">
            <img :src="storyDisplayAvatar" alt="对方" class="bubble-avatar bubble-avatar--assistant" />
            <div class="bubble-stack">
              <div class="typing-bubble">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </article>

          <div v-if="showDeathStatusInline" class="presence-status presence-status--dead presence-status--tail">
            角色已死亡
          </div>
        </div>
      </main>

      <footer class="composer">
        <div v-if="storyGuidanceText && hasStoryContent && !isDead && !isCompleted" class="story-guide-card">
          <span>剧情指引</span>
          <p>{{ storyGuidanceText }}</p>
        </div>

        <div v-if="isDead" class="status-card">
          <strong>这条线已经断了。</strong>
          <p>回溯到更早的时间点，重新把这段对话接回来。</p>
          <div class="status-actions">
            <button
              type="button"
              class="primary-btn"
              :disabled="availableRollbackDays.length === 0"
              @click="showRollbackModal = true"
            >
              回溯
            </button>
          </div>
        </div>

        <div v-else-if="isCompleted" class="status-card">
          <strong>这一段已经结束。</strong>
          <p>当前主线已经推进到末尾，你可以重开这一段继续尝试别的选择。</p>
          <div class="status-actions">
            <button type="button" class="primary-btn" @click="restartCurrentConversation">
              重新开始
            </button>
          </div>
        </div>

        <div v-else-if="pendingFriendRequestName" class="choice-box">
          <button
            type="button"
            class="choice-button friend-accept-btn"
            :disabled="isBusy"
            @click="acceptFriendRequest"
          >
            通过
          </button>
        </div>
        <div v-else-if="replyOptions.length > 0" class="choice-box">
          <button
            v-for="option in replyOptions"
            :key="option.id"
            type="button"
            class="choice-button"
            :disabled="isBusy"
            @click="handleReplyOption(option.id)"
          >
            {{ option.text }}
          </button>
        </div>
      </footer>
    </section>

    <div v-if="showInfoPanel" class="overlay" @click.self="showInfoPanel = false">
      <aside class="info-panel">
        <header class="panel-header">
          <div>
            <strong>信息</strong>
            <span>{{ activeConversation?.title || '当前对话' }}</span>
          </div>
          <button type="button" class="icon-close" @click="showInfoPanel = false">×</button>
        </header>

        <section class="panel-section">
          <div class="section-head">
            <strong>笔记</strong>
            <span>自动保存到本地</span>
          </div>
          <textarea
            v-model="runtimeState.notes"
            class="panel-textarea"
            rows="7"
            placeholder="写下你想记录的内容"
            @input="persistRuntime"
          ></textarea>
        </section>
      </aside>
    </div>

    <div v-if="showRollbackModal" class="overlay" @click.self="closeRollbackModal">
      <section class="rollback-modal">
        <button type="button" class="icon-close rollback-close" @click="closeRollbackModal">×</button>
        <strong>角色已死亡</strong>
        <p>选择你要回溯的日期。</p>

        <div class="rollback-list">
          <button
            v-for="day in availableRollbackDays"
            :key="day"
            type="button"
            class="rollback-button"
            @click="rollbackToDay(day)"
          >
            {{ day }}
          </button>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="showDialogueMore" class="dialogue-more-overlay" @click.self="showDialogueMore = false">
        <div class="dialogue-more-menu">
          <button type="button" class="dialogue-more-item" @click="openDialogueGallery">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" fill="currentColor"/>
            </svg>
            <span>图鉴</span>
          </button>
        </div>
      </div>
    </Teleport>

    <StoryGallery :visible="showGallery" @close="showGallery = false" />
    <ImageViewer
      :visible="imageViewerVisible"
      :src="imageViewerSrc"
      alt="场景图"
      @close="imageViewerVisible = false"
    />

      <Teleport to="body">
        <div v-if="showPuzzleGame" class="game-overlay">
          <PuzzleGame :standalone="true" @complete="onPuzzleComplete" @exit="onPuzzleExit" />
        </div>
      </Teleport>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DialogueMessage } from '@/data/story'
import ConversationSwitchButton from '@/components/ConversationSwitchButton/index.vue'
import defaultAvatar from '@/static/images/default-avatar.svg'
import { switchToRandomLocalCharacter } from '@/services/random-character-switch'
import { useUserStore } from '@/stores/user'
import {
  appendConversationMessage,
  applyConversationPresentation,
  applySystemEffects,
  clearConversationMessages,
  ensureConversationSession,
  ensureStoryCharacter,
  ECHO_STORY_CHARACTER_ID,
  ECHO_STORY_NAME,
  buildStoryQuestioningReply,
  getConversationById,
  getConversationMessages,
  isStoryQuestioningInput,
  loadStoryLibrary,
  loadStoryRuntimeState,
  markConversationRead,
  refreshStoryDialogueCompression,
  refreshStoryGuidance,
  resetConversationState,
  resolveStoryAvatar,
  saveStoryRuntimeState,
  verifyStoryGuidance,
  type StoryConversationDefinition,
  type StoryConversationState,
  type StoryLibrary,
  type StoryRuntimeState,
} from '@/services/story-conversations'
import { uni } from '@/utils/uni-polyfill'
import StoryGallery from '@/components/StoryGallery/index.vue'
import ImageViewer from '@/components/ImageViewer/index.vue'
import { unlockGalleryItem } from '@/services/story-gallery'
import { getStoryImageAsset, getStoryMomentAsset, type StoryImageAsset, type StoryMomentAsset } from '@/services/story-assets'
import PuzzleGame from '@/pages/game/mini/puzzle.vue'
import { useMomentsStore, type MomentPost } from '@/stores/moments'
import { useFriendRequestStore } from '@/stores/friend-requests'
import { useCharacterStore } from '@/stores/character'
import { TTSService } from '@/services/tts'
import { loadTTSConfig } from '@/services/voice-settings'

interface VisibleMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

interface ReplyOption {
  id: string
  text: string
  mode: 'branch' | 'suggested' | 'inline-branch'
}

interface PendingInlineBranchReply {
  conversationId: string
  options: ReplyOption[]
  continuation: DialogueMessage[]
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const momentsStore = useMomentsStore()
const friendRequestStore = useFriendRequestStore()
const characterStore = useCharacterStore()

const DEFAULT_STORY_MOMENT_TEXT = '如果连记忆都是假的，那我到底算个什么东西？'

// 判断是否从底边栏进入（隐藏返回按钮）
const isFromTabBar = computed(() => {
  // 如果没有 from 参数，或者 from 不是 'history'，则认为是从底边栏进入
  return !route.query.from || route.query.from !== 'history'
})

const storyLibrary = ref<StoryLibrary>({
  storyName: '',
  characterName: '',
  conversations: [],
})
const runtimeState = ref<StoryRuntimeState>({
  activeConversationId: '',
  order: [],
  notes: '',
  clues: [],
  currentContactName: '未知用户',
  currentAvatarKey: 'question',
  currentGuide: '',
  globalGuide: '',
  dialogueSummary: '',
  guideHistory: [],
  states: {},
})
const displayedMessages = ref<VisibleMessage[]>([])
const messageScroller = ref<HTMLElement | null>(null)
const showInfoPanel = ref(false)
const showRollbackModal = ref(false)
const isTyping = ref(false)
const isBusy = ref(false)
const pendingInlineBranchReply = ref<PendingInlineBranchReply | null>(null)
const switchingCharacter = ref(false)
const showDialogueMore = ref(false)
const showGallery = ref(false)
const imageViewerVisible = ref(false)
const imageViewerSrc = ref('')
const showPuzzleGame = ref(false)
const currentMomentText = ref(DEFAULT_STORY_MOMENT_TEXT)
const currentMomentImageSrc = ref('')
const pendingFriendRequestName = ref('')
const dialogueTTSService = ref<TTSService | null>(null)
const speakingDialogueMessageId = ref('')

let activeRunToken = 0
let bgmAudio: HTMLAudioElement | null = null
let audioUnlocked = false

function isImageUrl(text: string): boolean {
  return text.startsWith('[IMAGE:') && text.endsWith(']')
}

function extractImageUrl(text: string): string {
  return text.slice(7, -1)
}

function openStoryImage(src: string) {
  imageViewerSrc.value = src
  imageViewerVisible.value = true
}

async function toggleDialogueTTS(message: VisibleMessage) {
  if (speakingDialogueMessageId.value === message.id) {
    dialogueTTSService.value?.stop()
    speakingDialogueMessageId.value = ''
    return
  }

  const text = message.text.trim()
  if (!text) {
    return
  }

  const config = await loadTTSConfig()
  dialogueTTSService.value?.destroy()
  dialogueTTSService.value = new TTSService({
    ...config,
    language: config.language || 'zh-CN',
  })
  dialogueTTSService.value.onEnd(() => {
    speakingDialogueMessageId.value = ''
  })
  dialogueTTSService.value.onError(() => {
    speakingDialogueMessageId.value = ''
  })

  speakingDialogueMessageId.value = message.id
  try {
    await dialogueTTSService.value.speak(text)
  } catch {
    speakingDialogueMessageId.value = ''
  }
}

function ensureStoryMomentPost(momentAsset: StoryMomentAsset | null = null) {
  const content = (momentAsset?.content || currentMomentText.value).trim() || DEFAULT_STORY_MOMENT_TEXT
  const imageUrl = momentAsset?.src || currentMomentImageSrc.value || undefined
  const storyMomentId = momentAsset?.id || `echo-story-${Array.from(content).reduce((seed, ch) => seed + ch.charCodeAt(0), 0)}`

  if (momentsStore.posts.some(post => post.id === storyMomentId)) {
    return
  }

  const post: MomentPost = {
    id: storyMomentId,
    characterId: ECHO_STORY_CHARACTER_ID,
    characterName: runtimeState.value.currentContactName || '故事联系人',
    characterAvatar: defaultAvatar,
    content,
    imageUrl,
    postedAt: Date.now(),
    likes: 1,
    isLikedByMe: true,
    isFavoritedByMe: false,
    forwards: 0,
    comments: [],
  }
  momentsStore.addPost(post)
}

function extractMomentContent(text: string): string | null {
  const momentId = extractMomentId(text)
  if (!momentId) {
    return null
  }

  return getStoryMomentAsset(momentId)?.content || null
}

function extractMomentId(text: string): string | null {
  const match = text.match(/\[朋友圈发布[:：]\s*([^\]]+)\]/)
  return match?.[1]?.trim() || null
}

function resolveImageTrigger(text: string): StoryImageAsset | null {
  const bracketMatch = text.match(/\[图片插入[:：]\s*([^\]]+)\]/)
  const payload = (bracketMatch?.[1] || '').trim()

  if (!payload) {
    return null
  }

  const [assetId, title] = payload.split('|').map(item => item.trim())
  return getStoryImageAsset(assetId) || getStoryImageAsset(title || payload)
}

function unlockGalleryFromSystemText(text: string) {
  const unlockMatches = text.matchAll(/\[图鉴解锁[:：]\s*([^\]]+)\]/g)
  for (const match of unlockMatches) {
    const asset = getStoryImageAsset(match[1])
    unlockGalleryItem(asset?.id || match[1].trim())
  }
}

function unlockAvatarFromSystemText(text: string) {
  if (text.includes('[?]') || text.includes('未知用户')) {
    unlockGalleryItem('avatar-question')
  }
  if (text.includes('模糊的雨夜侧影') || text.includes('模糊轮廓')) {
    unlockGalleryItem('avatar-blur')
  }
  if (text.includes('短发')) {
    unlockGalleryItem('avatar-short-hair')
  }
}

const activeConversationId = computed(() => runtimeState.value.activeConversationId)
const showRandomSwitchButton = computed(() => route.query.from !== 'history')
const activeConversation = computed<StoryConversationDefinition | null>(() =>
  getConversationById(storyLibrary.value.conversations, activeConversationId.value)
)
const activeConversationState = computed(() =>
  activeConversation.value ? runtimeState.value.states[activeConversation.value.id] : null
)
const activeSegment = computed(() => {
  const conversation = activeConversation.value
  const state = activeConversationState.value

  if (!conversation || !state) {
    return null
  }

  return conversation.segments[state.segmentIndex] || null
})
const activeChoiceSegment = computed(() => {
  const segment = activeSegment.value
  return segment?.kind === 'choice' ? segment : null
})
const availableRollbackDays = computed(() => {
  let furthestStartedIndex = -1

  storyLibrary.value.conversations.forEach((conversation, index) => {
    const state = runtimeState.value.states[conversation.id]
    if (!state) {
      return
    }

    const hasProgress =
      state.lastUpdatedAt > 0 ||
      state.segmentIndex > 0 ||
      state.messageIndex > 0 ||
      state.status !== 'idle'

    if (hasProgress) {
      furthestStartedIndex = index
    }
  })

  if (furthestStartedIndex < 0) {
    return []
  }

  const days: string[] = []
  const seenDays = new Set<string>()

  for (const conversation of storyLibrary.value.conversations.slice(0, furthestStartedIndex + 1)) {
    if (!conversation.dayLabel || seenDays.has(conversation.dayLabel)) {
      continue
    }

    seenDays.add(conversation.dayLabel)
    days.push(conversation.dayLabel)
  }

  return days
})
const currentGameTime = computed(() => activeConversationState.value?.currentGameTime || '--:--')
const awaitingChoice = computed(() => activeConversationState.value?.status === 'awaiting-choice')
const awaitingText = computed(() => activeConversationState.value?.status === 'awaiting-text')
const isCompleted = computed(() => {
  if (activeConversationState.value?.status !== 'completed') {
    return false
  }

  return !getNextConversationId(activeConversationId.value)
})
const isDead = computed(() => activeConversationState.value?.status === 'dead')
const activePrompt = computed(() => {
  if (pendingInlineBranchReply.value?.conversationId === activeConversationId.value) {
    return '你的回复'
  }

  return activeSegment.value?.prompt || ''
})
const storyGuidanceText = computed(() => runtimeState.value.currentGuide || '')
const playerAvatar = computed(() => userStore.userAvatar || defaultAvatar)
const hasStoryContent = computed(() => storyLibrary.value.conversations.length > 0)
const storyDisplayAvatar = computed(() =>
  resolveStoryAvatar(runtimeState.value.currentAvatarKey) || activeConversation.value?.avatar || defaultAvatar
)
const headerTitle = computed(() => {
  if (!hasStoryContent.value) return '暂无可用角色'
  return isTyping.value ? '对方正在输入……' : runtimeState.value.currentContactName || '对方'
})
const presenceStatusText = computed(() => {
  if (!hasStoryContent.value) return '暂无可用角色 去创建吧'
  return isDead.value ? '角色已死亡' : '角色已上线'
})
const presenceStatusTone = computed(() => {
  if (!hasStoryContent.value) return 'offline'
  return isDead.value ? 'dead' : 'online'
})
const showDeathStatusInline = computed(() => isDead.value && displayedMessages.value.length > 0)
const suggestedReplyOptions = computed<ReplyOption[]>(() => {
  if (!awaitingText.value) {
    return []
  }

  const latestAssistantText = [...displayedMessages.value]
    .reverse()
    .find(message => message.role === 'assistant')?.text || ''
  const promptText = activePrompt.value || latestAssistantText
  const normalized = promptText.replace(/\s+/g, '')

  if (/(疼|血|冷|喘|怕|痛|撑不住|呼吸)/.test(normalized)) {
    return [
      { id: 'suggested-soothe', text: '先稳住，按我说的慢慢来。', mode: 'suggested' },
      { id: 'suggested-check', text: '你先告诉我你现在伤得怎么样。', mode: 'suggested' },
      { id: 'suggested-hold', text: '别慌，我在，你继续说。', mode: 'suggested' },
    ]
  }

  if (/(门|锁|密码|通道|出口|进去|出来|逃)/.test(normalized)) {
    return [
      { id: 'suggested-detail', text: '先把门和周围情况说清楚。', mode: 'suggested' },
      { id: 'suggested-guide', text: '你照我说的做，先确认还有没有别的出口。', mode: 'suggested' },
      { id: 'suggested-focus', text: '别乱动，先告诉我你面前最关键的东西。', mode: 'suggested' },
    ]
  }

  if (/(短信|照片|监控|记录|线索|屏幕|文件)/.test(normalized)) {
    return [
      { id: 'suggested-check-record', text: '先把你看到的内容完整告诉我。', mode: 'suggested' },
      { id: 'suggested-analyse', text: '别急，我们先分析这条信息。', mode: 'suggested' },
      { id: 'suggested-compare', text: '你再确认一次细节，我帮你一起判断。', mode: 'suggested' },
    ]
  }

  if (/(谁|你是|身份|名字|记得|认识)/.test(normalized)) {
    return [
      { id: 'suggested-identity', text: '你先把你记得的部分慢慢说出来。', mode: 'suggested' },
      { id: 'suggested-memory', text: '先别急，我们从你最确定的事开始。', mode: 'suggested' },
      { id: 'suggested-past', text: '你想到什么就告诉我什么。', mode: 'suggested' },
    ]
  }

  return [
    { id: 'suggested-listen', text: '你继续说，我在听。', mode: 'suggested' },
    { id: 'suggested-status', text: '先告诉我你现在看到的情况。', mode: 'suggested' },
    { id: 'suggested-step', text: '别急，我们一步一步来。', mode: 'suggested' },
  ]
})
const replyOptions = computed<ReplyOption[]>(() => {
  if (pendingInlineBranchReply.value?.conversationId === activeConversationId.value) {
    return pendingInlineBranchReply.value.options
  }

  if (awaitingChoice.value && activeChoiceSegment.value?.options.length) {
    return activeChoiceSegment.value.options.map(option => ({
      id: option.id,
      text: option.text,
      mode: 'branch',
    }))
  }

  return suggestedReplyOptions.value
})

async function switchToRandomCharacter() {
  if (switchingCharacter.value || isBusy.value || !showRandomSwitchButton.value) {
    return
  }

  switchingCharacter.value = true

  try {
    const target = await switchToRandomLocalCharacter(router)
    if (!target) {
      uni.showToast({ title: '没有可切换的本地角色', icon: 'none' })
    }
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '切换失败',
      icon: 'none'
    })
  } finally {
    window.setTimeout(() => {
      switchingCharacter.value = false
    }, 180)
  }
}

function persistRuntime() {
  saveStoryRuntimeState(runtimeState.value)
}

async function refreshStoryRuntimeHints(conversationId: string = activeConversationId.value, compressDialogue = true) {
  if (!conversationId) {
    return
  }

  if (compressDialogue) {
    runtimeState.value = await refreshStoryDialogueCompression(runtimeState.value, conversationId)
  }

  runtimeState.value = refreshStoryGuidance(
    runtimeState.value,
    storyLibrary.value.conversations,
    conversationId,
  )

  persistRuntime()
}

async function replyToStoryQuestioning(conversation: StoryConversationDefinition, state: StoryConversationState) {
  if (!state.sessionId) {
    return
  }

  const check = verifyStoryGuidance(runtimeState.value, storyLibrary.value.conversations, conversation.id)
  const replyText = buildStoryQuestioningReply(check)

  state.status = 'awaiting-text'
  const savedReply = await appendConversationMessage(state.sessionId, 'assistant', replyText)
  displayedMessages.value.push({
    id: savedReply.id,
    role: 'assistant',
    text: replyText,
  })
  state.lastUpdatedAt = savedReply.timestamp
  await refreshStoryRuntimeHints(conversation.id)
  isBusy.value = false
  isTyping.value = false
  await scrollToBottom('auto')
}

function getConversationIndex(conversationId: string) {
  return storyLibrary.value.conversations.findIndex(conversation => conversation.id === conversationId)
}

function getNextConversationId(conversationId: string) {
  const currentIndex = getConversationIndex(conversationId)
  if (currentIndex < 0) {
    return ''
  }

  return storyLibrary.value.conversations[currentIndex + 1]?.id || ''
}

async function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  await nextTick()
  const element = messageScroller.value
  if (!element) {
    return
  }

  element.scrollTo({
    top: element.scrollHeight,
    behavior,
  })
}

function sleep(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms)
  })
}

const STREAM_CHAR_DELAY_MS = 32
const STREAM_SCROLL_EVERY_CHARS = 6

async function streamRevealAssistantText(messageId: string, fullText: string, token?: number) {
  const finalize = () => {
    const idx = displayedMessages.value.findIndex(m => m.id === messageId)
    if (idx >= 0) {
      displayedMessages.value.splice(idx, 1, { ...displayedMessages.value[idx], text: fullText })
    }
  }

  const chars = Array.from(fullText)
  let revealed = ''
  for (let i = 0; i < chars.length; i += 1) {
    if (token !== undefined && token !== activeRunToken) {
      finalize()
      return
    }

    revealed += chars[i]
    const idx = displayedMessages.value.findIndex(m => m.id === messageId)
    if (idx >= 0) {
      displayedMessages.value.splice(idx, 1, { ...displayedMessages.value[idx], text: revealed })
    }
    if (i % STREAM_SCROLL_EVERY_CHARS === STREAM_SCROLL_EVERY_CHARS - 1) {
      await scrollToBottom('auto')
    }
    if (i < chars.length - 1) {
      await sleep(STREAM_CHAR_DELAY_MS)
    }
  }

  finalize()
  await scrollToBottom('auto')
}

async function waitWithToken(ms: number, token: number) {
  if (ms > 0) {
    await sleep(ms)
  }

  return token === activeRunToken
}

function mapMessageRole(message: DialogueMessage): 'user' | 'assistant' | null {
  if (message.role === 'other') {
    return 'assistant'
  }

  if (message.role === 'me') {
    return 'user'
  }

  return null
}

function loadVisibleMessages(messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>) {
  displayedMessages.value = messages.map(message => ({
    id: message.id,
    role: message.role,
    text: message.content,
  }))
}

async function refreshDisplayedMessagesThrough(conversationId: string) {
  const conversationIndex = getConversationIndex(conversationId)
  if (conversationIndex < 0) {
    displayedMessages.value = []
    return
  }

  const conversationIds = storyLibrary.value.conversations
    .slice(0, conversationIndex + 1)
    .map(conversation => conversation.id)

  const messageGroups = await Promise.all(
    conversationIds.map(id => getConversationMessages(runtimeState.value.states[id]?.sessionId || null)),
  )

  const mergedMessages = messageGroups
    .flat()
    .sort((left, right) => left.timestamp - right.timestamp)

  loadVisibleMessages(mergedMessages)
  await scrollToBottom('auto')
}

function unlockAudio() {
  audioUnlocked = true

  if (bgmAudio) {
    void bgmAudio.play().catch(() => undefined)
  }
}

function applyConversationMusic(conversation: StoryConversationDefinition | null) {
  if (!conversation || typeof window === 'undefined') {
    return
  }

  if (!bgmAudio) {
    bgmAudio = new Audio()
    bgmAudio.loop = true
    bgmAudio.volume = 0.24
  }

  if (bgmAudio.src !== conversation.musicUrl) {
    bgmAudio.src = conversation.musicUrl
  }

  bgmAudio.playbackRate = conversation.musicRate

  if (audioUnlocked) {
    void bgmAudio.play().catch(() => undefined)
  }
}

async function appendVisibleStoryMessage(message: DialogueMessage, conversationId: string, token?: number) {
  const conversationState = runtimeState.value.states[conversationId]

  if (!conversationState?.sessionId) {
    return
  }

  const mappedRole = mapMessageRole(message)
  if (!mappedRole) {
    runtimeState.value = applySystemEffects(runtimeState.value, conversationId, message)
    persistRuntime()
    if (runtimeState.value.states[conversationId]?.status === 'dead') {
      await scrollToBottom('auto')
    }

    // Detect H5 mini-game trigger
    if (message.role === 'system' && (message.text.includes('H5小游戏插入') || message.text.includes('[H5嵌入'))) {
      isBusy.value = false
      isTyping.value = false
      showPuzzleGame.value = true
    }

    // Detect moments post trigger
    if (message.role === 'system' && (message.text.includes('朋友圈动态插入') || message.text.includes('[朋友圈发布'))) {
      const momentId = extractMomentId(message.text)
      const momentAsset = momentId ? getStoryMomentAsset(momentId) : null
      currentMomentText.value = momentAsset?.content || extractMomentContent(message.text) || DEFAULT_STORY_MOMENT_TEXT
      currentMomentImageSrc.value = momentAsset?.src || ''
      ensureStoryMomentPost(momentAsset)
      // Inline notification instead of popup
      if (conversationState?.sessionId) {
        const savedMsg = await appendConversationMessage(conversationState.sessionId, 'assistant', '对方发布了一条动态')
        displayedMessages.value.push({ id: savedMsg.id, role: 'assistant', text: savedMsg.content })
      }
    }

    // Detect friend request trigger
    if (message.role === 'system' && message.text.includes('[好友请求')) {
      const frMatch = message.text.match(/\[好友请求[:：]([^\]]+)\]/)
      const frName = frMatch?.[1]?.trim() || '故事联系人'
      if (!friendRequestStore.isAccepted(ECHO_STORY_CHARACTER_ID)) {
        friendRequestStore.addRequest({
          id: `fr-${ECHO_STORY_CHARACTER_ID}`,
          characterId: ECHO_STORY_CHARACTER_ID,
          characterName: frName,
          characterAvatar: resolveStoryAvatar(runtimeState.value.currentAvatarKey),
          requestedAt: Date.now(),
        })
        pendingFriendRequestName.value = frName
        if (conversationState?.sessionId) {
          const savedMsg = await appendConversationMessage(conversationState.sessionId, 'assistant', `${frName}请求添加你为好友`)
          displayedMessages.value.push({ id: savedMsg.id, role: 'assistant', text: savedMsg.content })
        }
      }
    }

    if (message.role === 'system') {
      unlockAvatarFromSystemText(message.text)
      unlockGalleryFromSystemText(message.text)
    }

    // Detect image insertion trigger
    if (message.role === 'system' && message.text.includes('[图片插入')) {
      const galleryItem = resolveImageTrigger(message.text)
      if (galleryItem) {
        unlockGalleryItem(galleryItem.id)
        const imageContent = `[IMAGE:${galleryItem.src}]`
        const savedMessage = await appendConversationMessage(conversationState.sessionId, 'assistant', imageContent)
        displayedMessages.value.push({
          id: savedMessage.id,
          role: 'assistant' as const,
          text: imageContent,
        })
        conversationState.lastUpdatedAt = savedMessage.timestamp
        persistRuntime()
        await scrollToBottom('auto')
      }
    }

    return
  }

  if (message.text.includes('[图片插入')) {
    const galleryItem = resolveImageTrigger(message.text)
    if (galleryItem) {
      unlockGalleryItem(galleryItem.id)
      const imageContent = `[IMAGE:${galleryItem.src}]`
      const savedMessage = await appendConversationMessage(conversationState.sessionId, mappedRole, imageContent)
      displayedMessages.value.push({
        id: savedMessage.id,
        role: mappedRole,
        text: imageContent,
      })
      conversationState.lastUpdatedAt = savedMessage.timestamp
      conversationState.unreadCount = 0
      persistRuntime()
      await scrollToBottom('auto')
      return
    }
  }

  const savedMessage = await appendConversationMessage(conversationState.sessionId, mappedRole, message.text)
  conversationState.lastUpdatedAt = savedMessage.timestamp
  conversationState.unreadCount = 0
  persistRuntime()

  if (mappedRole === 'assistant') {
    displayedMessages.value.push({
      id: savedMessage.id,
      role: mappedRole,
      text: '',
    })
    await scrollToBottom('auto')
    await streamRevealAssistantText(savedMessage.id, message.text, token)
    return
  }

  displayedMessages.value.push({
    id: savedMessage.id,
    role: mappedRole,
    text: message.text,
  })
  await scrollToBottom('auto')
}

function buildInlineReplyOptions(messages: DialogueMessage[], seed: string): ReplyOption[] {
  return messages.map((message, index) => ({
    id: `${seed}-inline-${index + 1}`,
    text: message.text,
    mode: 'inline-branch',
  }))
}

function normalizeStoryReplyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s，。！？、；：,.!?;:"'“”‘’（）()【】[\]{}《》<>…—\-]/g, '')
}

function getTextDistance(left: string, right: string): number {
  const a = normalizeStoryReplyText(left)
  const b = normalizeStoryReplyText(right)
  if (a === b) {
    return 0
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length] || 0
}

function isSimilarStoryReply(left: string, right: string): boolean {
  const a = normalizeStoryReplyText(left)
  const b = normalizeStoryReplyText(right)
  if (!a || !b) {
    return false
  }

  if (a === b || a.includes(b) || b.includes(a)) {
    return true
  }

  const maxLength = Math.max(a.length, b.length)
  return maxLength >= 8 && getTextDistance(a, b) / maxLength <= 0.28
}

function isLastDisplayedUserReply(text: string): boolean {
  const lastDisplayed = displayedMessages.value[displayedMessages.value.length - 1]
  return lastDisplayed?.role === 'user' && isSimilarStoryReply(lastDisplayed.text, text)
}

async function playBranchMessages(
  branchMessages: DialogueMessage[],
  conversation: StoryConversationDefinition,
  state: StoryConversationState,
  token: number,
  seed: string,
  options: { skipLeadingUserMessage?: boolean } = {},
) {
  for (let index = 0; index < branchMessages.length; index += 1) {
    const branchMessage = branchMessages[index]

    if (token !== activeRunToken) {
      isBusy.value = false
      isTyping.value = false
      return 'cancelled' as const
    }

    if (branchMessage.role === 'me') {
      const inlineMessages: DialogueMessage[] = []
      let nextIndex = index

      while (nextIndex < branchMessages.length && branchMessages[nextIndex].role === 'me') {
        inlineMessages.push(branchMessages[nextIndex])
        nextIndex += 1
      }

      // Skip a single inline reply that merely echoes the option just clicked.
      if (inlineMessages.length === 1) {
        if ((index === 0 && options.skipLeadingUserMessage) || isLastDisplayedUserReply(inlineMessages[0].text)) {
          index = nextIndex - 1
          continue
        }
      }

      // Always require the user to tap the option — even when there is only one.
      pendingInlineBranchReply.value = {
        conversationId: conversation.id,
        options: buildInlineReplyOptions(inlineMessages, seed),
        continuation: branchMessages.slice(nextIndex),
      }
      state.status = 'awaiting-choice'
      persistRuntime()
      isBusy.value = false
      isTyping.value = false
      return 'awaiting-inline' as const
    }

    if (branchMessage.delay > 0) {
      await sleep(branchMessage.delay)
    }

    if (branchMessage.role === 'other' && branchMessage.typing > 0) {
      isTyping.value = true
      await sleep(branchMessage.typing * 2)
    }

    isTyping.value = false
    await appendVisibleStoryMessage(branchMessage, conversation.id, token)
    await refreshStoryRuntimeHints(conversation.id)

    if (runtimeState.value.states[conversation.id]?.status === 'dead') {
      isBusy.value = false
      return 'dead' as const
    }
  }

  return 'done' as const
}

async function runMessageSegment(conversation: StoryConversationDefinition, token: number) {
  const state = runtimeState.value.states[conversation.id]
  const segment = conversation.segments[state.segmentIndex]

  if (!segment || segment.kind !== 'messages') {
    return
  }

  state.status = 'playing'
  persistRuntime()

  for (let index = state.messageIndex; index < segment.messages.length; index += 1) {
    const message = segment.messages[index]
    const delayPassed = await waitWithToken(message.delay, token)
    if (!delayPassed) {
      return
    }

    if (message.role === 'other' && message.typing > 0) {
      isTyping.value = true
      const typingPassed = await waitWithToken(message.typing * 2, token)
      if (!typingPassed) {
        isTyping.value = false
        return
      }
    }

    isTyping.value = false
    await appendVisibleStoryMessage(message, conversation.id, token)
    state.messageIndex = index + 1
    persistRuntime()
    await refreshStoryRuntimeHints(conversation.id)

    if (runtimeState.value.states[conversation.id]?.status === 'dead') {
      return
    }
  }

  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
}

async function playUntilInteraction(conversationId: string) {
  const conversation = getConversationById(storyLibrary.value.conversations, conversationId)
  const state = conversation ? runtimeState.value.states[conversationId] : null

  if (!conversation || !state) {
    return
  }

  const token = activeRunToken
  isBusy.value = true

  while (token === activeRunToken) {
    const segment = conversation.segments[state.segmentIndex]

    if (!segment) {
      state.status = 'completed'
      persistRuntime()
      await refreshStoryRuntimeHints(conversation.id)
      const nextConversationId = getNextConversationId(conversation.id)
      if (nextConversationId) {
        const handoffPassed = await waitWithToken(520, token)
        if (!handoffPassed) {
          return
        }

        await openConversation(nextConversationId)
        return
      }

      break
    }

    if (segment.kind === 'messages') {
      await runMessageSegment(conversation, token)
      continue
    }

    state.status = segment.options.length > 0 ? 'awaiting-choice' : 'awaiting-text'
    persistRuntime()
    await refreshStoryRuntimeHints(conversation.id)
    break
  }

  isTyping.value = false
  isBusy.value = false
}

async function openConversation(conversationId: string) {
  const conversation = getConversationById(storyLibrary.value.conversations, conversationId)
  if (!conversation) {
    return
  }

  activeRunToken += 1
  pendingInlineBranchReply.value = null
  runtimeState.value.activeConversationId = conversationId
  runtimeState.value = applyConversationPresentation(runtimeState.value, conversation)
  runtimeState.value = markConversationRead(runtimeState.value, conversationId)
  persistRuntime()
  applyConversationMusic(conversation)

  const session = await ensureConversationSession(conversation, runtimeState.value)
  runtimeState.value.states[conversationId].sessionId = session.id
  persistRuntime()

  await refreshDisplayedMessagesThrough(conversationId)
  await refreshStoryRuntimeHints(conversationId)

  let currentState = runtimeState.value.states[conversationId]
  if (
    displayedMessages.value.length === 0 &&
    (currentState.segmentIndex > 0 || currentState.messageIndex > 0 || currentState.status !== 'idle')
  ) {
    runtimeState.value = resetConversationState(runtimeState.value, conversation, session.id)
    runtimeState.value.activeConversationId = conversationId
    persistRuntime()
    currentState = runtimeState.value.states[conversationId]
  }

  isTyping.value = false
  isBusy.value = false
  if (currentState.status === 'idle' || currentState.status === 'playing') {
    void playUntilInteraction(conversationId)
  }
}

async function chooseOption(optionId: string) {
  const conversation = activeConversation.value
  const state = activeConversationState.value
  const segment = activeChoiceSegment.value
  const token = activeRunToken

  if (!conversation || !state || !segment || !state.sessionId || isBusy.value) {
    return
  }

  const selectedOption = segment.options.find(option => option.id === optionId)
  if (!selectedOption) {
    return
  }

  unlockAudio()
  isBusy.value = true
  state.status = 'playing'
  persistRuntime()

  const userMessage = await appendConversationMessage(state.sessionId, 'user', selectedOption.text)
  displayedMessages.value.push({
    id: userMessage.id,
    role: 'user',
    text: selectedOption.text,
  })
  state.lastUpdatedAt = userMessage.timestamp
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await scrollToBottom('auto')

  const branchResult = await playBranchMessages(
    selectedOption.branchMessages,
    conversation,
    state,
    token,
    selectedOption.id,
    { skipLeadingUserMessage: true },
  )

  if (branchResult === 'cancelled' || branchResult === 'awaiting-inline') {
    return
  }

  if (branchResult === 'dead') {
    persistRuntime()
    return
  }

  if (selectedOption.retry) {
    state.status = 'dead'
    persistRuntime()
    await refreshStoryRuntimeHints(conversation.id)
    isBusy.value = false
    return
  }

  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await scrollToBottom()
  void playUntilInteraction(conversation.id)
}

async function submitSuggestedReply(content: string) {
  const conversation = activeConversation.value
  const state = activeConversationState.value

  if (!conversation || !state || !state.sessionId || !awaitingText.value || !content.trim() || isBusy.value) {
    return
  }

  unlockAudio()
  isBusy.value = true
  state.status = 'playing'
  persistRuntime()

  const savedMessage = await appendConversationMessage(state.sessionId, 'user', content.trim())
  displayedMessages.value.push({
    id: savedMessage.id,
    role: 'user',
    text: content.trim(),
  })
  state.lastUpdatedAt = savedMessage.timestamp
  await refreshStoryRuntimeHints(conversation.id)

  if (isStoryQuestioningInput(content)) {
    await replyToStoryQuestioning(conversation, state)
    return
  }

  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await scrollToBottom()
  void playUntilInteraction(conversation.id)
}

async function submitInlineBranchReply(optionId: string) {
  const pendingReply = pendingInlineBranchReply.value
  const conversation = activeConversation.value
  const state = activeConversationState.value

  if (!pendingReply || !conversation || !state?.sessionId || conversation.id !== pendingReply.conversationId || isBusy.value) {
    return
  }

  const selectedOption = pendingReply.options.find(option => option.id === optionId)
  if (!selectedOption) {
    return
  }

  unlockAudio()
  isBusy.value = true
  state.status = 'playing'
  persistRuntime()

  const savedMessage = await appendConversationMessage(state.sessionId, 'user', selectedOption.text)
  displayedMessages.value.push({
    id: savedMessage.id,
    role: 'user',
    text: selectedOption.text,
  })
  state.lastUpdatedAt = savedMessage.timestamp
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await scrollToBottom('auto')

  pendingInlineBranchReply.value = null
  const branchResult = await playBranchMessages(
    pendingReply.continuation,
    conversation,
    state,
    activeRunToken,
    optionId,
  )

  if (branchResult === 'cancelled' || branchResult === 'awaiting-inline') {
    return
  }

  if (branchResult === 'dead') {
    persistRuntime()
    return
  }

  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await scrollToBottom()
  void playUntilInteraction(conversation.id)
}

function handleReplyOption(optionId: string) {
  if (isBusy.value) {
    return
  }

  const option = replyOptions.value.find(item => item.id === optionId)
  if (!option) {
    return
  }

  if (option.mode === 'branch') {
    void chooseOption(option.id)
    return
  }

  if (option.mode === 'inline-branch') {
    void submitInlineBranchReply(option.id)
    return
  }

  void submitSuggestedReply(option.text)
}

async function restartCurrentConversation() {
  const conversation = activeConversation.value
  const state = activeConversationState.value

  if (!conversation || !state) {
    return
  }

  activeRunToken += 1
  pendingInlineBranchReply.value = null
  await clearConversationMessages(state.sessionId)
  runtimeState.value = resetConversationState(runtimeState.value, conversation, state.sessionId)
  runtimeState.value = applyConversationPresentation(runtimeState.value, conversation)
  persistRuntime()
  await refreshStoryRuntimeHints(conversation.id)
  await refreshDisplayedMessagesThrough(conversation.id)
  isTyping.value = false
  isBusy.value = false
  showRollbackModal.value = false
  void playUntilInteraction(conversation.id)
}

async function rollbackToDay(dayLabel: string) {
  if (!availableRollbackDays.value.includes(dayLabel)) {
    return
  }

  const resetStartIndex = storyLibrary.value.conversations.findIndex(conversation => conversation.dayLabel === dayLabel)

  if (resetStartIndex < 0) {
    return
  }

  for (const conversation of storyLibrary.value.conversations.slice(resetStartIndex)) {
    const state = runtimeState.value.states[conversation.id]

    if (!conversation || !state) {
      continue
    }

    await clearConversationMessages(state.sessionId)
    runtimeState.value = resetConversationState(runtimeState.value, conversation, state.sessionId || null)
  }

  persistRuntime()
  const firstConversationId = storyLibrary.value.conversations[resetStartIndex]?.id || ''
  await refreshStoryRuntimeHints(firstConversationId)
  showRollbackModal.value = false
  pendingInlineBranchReply.value = null

  if (firstConversationId) {
    await openConversation(firstConversationId)
  }
}

function closeRollbackModal() {
  showRollbackModal.value = false
}

function openDialogueGallery() {
  showDialogueMore.value = false
  showGallery.value = true
}

function onPuzzleComplete() {
  showPuzzleGame.value = false
  const conversationId = activeConversationId.value
  if (conversationId) {
    void playUntilInteraction(conversationId)
  }
}

function onPuzzleExit() {
  showPuzzleGame.value = false
  const conversationId = activeConversationId.value
  if (conversationId) {
    void playUntilInteraction(conversationId)
  }
}

async function acceptFriendRequest() {
  const name = pendingFriendRequestName.value
  if (!name) return
  characterStore.toggleFriend(ECHO_STORY_CHARACTER_ID)
  friendRequestStore.acceptRequest(ECHO_STORY_CHARACTER_ID)
  pendingFriendRequestName.value = ''
  if (activeConversationState.value?.sessionId) {
    const savedMsg = await appendConversationMessage(activeConversationState.value.sessionId, 'user', '通过')
    displayedMessages.value.push({ id: savedMsg.id, role: 'user', text: savedMsg.content })
  }
}

async function findLegacyResetStartIndex() {
  for (let index = 0; index < storyLibrary.value.conversations.length; index += 1) {
    const conversation = storyLibrary.value.conversations[index]
    const state = runtimeState.value.states[conversation.id]

    if (!state || state.status !== 'completed') {
      continue
    }

    const messages = await getConversationMessages(state.sessionId)
    const hasUserReply = messages.some(message => message.role === 'user')

    if (!hasUserReply) {
      return index
    }
  }

  return -1
}

async function repairLegacySequentialProgress() {
  const resetStartIndex = await findLegacyResetStartIndex()

  if (resetStartIndex < 0) {
    return
  }

  for (const conversation of storyLibrary.value.conversations.slice(resetStartIndex)) {
    const state = runtimeState.value.states[conversation.id]

    if (!state) {
      continue
    }

    await clearConversationMessages(state.sessionId)
    runtimeState.value = resetConversationState(runtimeState.value, conversation, state.sessionId)
  }

  runtimeState.value.activeConversationId =
    storyLibrary.value.conversations[resetStartIndex]?.id || storyLibrary.value.conversations[0]?.id || ''
  persistRuntime()
}

async function initializeDialogue() {
  await userStore.loadUserInfo().catch(() => undefined)
  storyLibrary.value = loadStoryLibrary()
  runtimeState.value = loadStoryRuntimeState(storyLibrary.value.conversations)
  await ensureStoryCharacter(storyLibrary.value.characterName)
  await repairLegacySequentialProgress()

  if (storyLibrary.value.conversations.length === 0) {
    displayedMessages.value = []
    isTyping.value = false
    isBusy.value = false
    pendingInlineBranchReply.value = null
    return
  }

  const sequentialConversationId = storyLibrary.value.conversations.find(conversation => {
    const state = runtimeState.value.states[conversation.id]
    return state?.status !== 'completed'
  })?.id
  const nextConversationId =
    sequentialConversationId || runtimeState.value.activeConversationId || storyLibrary.value.conversations[0]?.id || ''

  await openConversation(nextConversationId)
}

watch(
  () => [displayedMessages.value.length, isTyping.value],
  () => {
    void scrollToBottom('smooth')
  },
)

watch(
  () => replyOptions.value.length,
  (newLen) => {
    if (newLen > 0) {
      void scrollToBottom('smooth')
    }
  },
)

onMounted(() => {
  const initialStoryLibrary = loadStoryLibrary()
  if (initialStoryLibrary.conversations.length > 0) {
    void initializeDialogue()
    return
  }

  void switchToRandomLocalCharacter(router, { replace: true }).then(target => {
    if (!target) {
      displayedMessages.value = []
      isTyping.value = false
      isBusy.value = false
      pendingInlineBranchReply.value = null
    }
  })
})

onActivated(() => {
  if (bgmAudio && audioUnlocked) {
    void bgmAudio.play().catch(() => undefined)
  }
  void scrollToBottom('auto')
})

onDeactivated(() => {
  if (bgmAudio) {
    bgmAudio.pause()
  }
  dialogueTTSService.value?.stop()
  speakingDialogueMessageId.value = ''
})

onUnmounted(() => {
  activeRunToken += 1
  pendingInlineBranchReply.value = null
  isTyping.value = false
  isBusy.value = false
  if (bgmAudio) {
    bgmAudio.pause()
  }
  dialogueTTSService.value?.destroy()
  dialogueTTSService.value = null
  speakingDialogueMessageId.value = ''
})
</script>

<style scoped lang="scss">
.dialogue-page {
  height: calc(100vh - 60px - env(safe-area-inset-bottom, 0px));
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(146, 165, 188, 0.16), transparent 30%),
    linear-gradient(180deg, rgb(7, 8, 11) 0%, rgb(11, 12, 15) 52%, rgb(15, 17, 20) 100%);
}

.dialogue-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(8, 9, 11, 0.9);
}

.dialogue-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: calc(env(safe-area-inset-top, 0px) + 44px);
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.dialogue-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.btn-back,
.avatar-trigger,
.primary-btn,
.secondary-btn,
.icon-close,
.rollback-button,
.choice-button {
  font: inherit;
}

.btn-back {
  grid-column: 1;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition-base);
}

.btn-back:hover {
  color: var(--text-primary);
}

.header-switch {
  grid-column: 1;
  justify-self: start;
}

.avatar-trigger {
  width: 44px;
  height: 44px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
}

.menu-line {
  width: 18px;
  height: 1.5px;
  border-radius: 999px;
  background: rgba(244, 246, 248, 0.9);
}

.header-copy {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.header-copy strong {
  color: var(--text-primary);
  font-size: 16px;
}

.header-actions {
  grid-column: 3;
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.header-time {
  color: var(--text-secondary);
  font-size: 11px;
  min-width: 46px;
  text-align: right;
}

.btn-more {
  width: 36px;
  height: 36px;
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

.message-scroller {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 10px;
}

.presence-status {
  align-self: center;
  margin-bottom: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.presence-status--online {
  color: #6fe29c;
}

.presence-status--offline {
  color: var(--text-tertiary);
}

.presence-status--dead {
  color: #ff6b6b;
}

.presence-status--tail {
  margin-top: 4px;
  margin-bottom: 2px;
}

.empty-block {
  margin: auto 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
}

.empty-block strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.message-row--user {
  justify-content: flex-end;
}

.bubble-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  align-self: flex-start;
}

.bubble-avatar--user {
  background: rgba(255, 255, 255, 0.14);
}

.bubble-avatar--assistant {
  cursor: pointer;
}

.bubble-stack {
  max-width: min(76%, 680px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.message-row--user .bubble-stack {
  align-items: flex-end;
}

.message-bubble,
.typing-bubble {
  padding: 6px 7px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 2px;
  line-height: 1.72;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.message-bubble--assistant,
.typing-bubble {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.message-bubble--user {
  background: linear-gradient(135deg, rgba(242, 245, 249, 0.94), rgba(197, 207, 217, 0.9));
  color: rgb(9, 10, 12);
}

.message-bubble--image {
  padding: 4px;
  background: transparent;
  border: none;
  font: inherit;
  cursor: zoom-in;
}

.story-insert-image {
  display: block;
  width: min(280px, 100%);
  max-height: 320px;
  border-radius: 5px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 72px;
}

.typing-bubble span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.26;
  animation: typing-bounce 1s ease infinite;
}

.typing-bubble span:nth-child(2) {
  animation-delay: 0.12s;
}

.typing-bubble span:nth-child(3) {
  animation-delay: 0.24s;
}

.composer {
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: rgba(9, 10, 12, 0.94);
  backdrop-filter: blur(16px);
}

.prompt-bar {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.story-guide-card {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 6px;
  background: rgba(14, 22, 30, 0.72);
}

.story-guide-card span {
  display: block;
  margin-bottom: 4px;
  color: rgba(125, 211, 252, 0.88);
  font-size: 12px;
  font-weight: 600;
}

.story-guide-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.choice-box,
.status-card {
  display: grid;
  gap: 8px;
}

.choice-button {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.status-card {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
}

.status-card strong {
  color: var(--text-primary);
}

.status-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.panel-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  resize: none;
}

.panel-textarea:focus {
  outline: none;
  border-color: rgba(176, 190, 206, 0.28);
  box-shadow: 0 0 0 3px rgba(176, 190, 206, 0.1);
}

.primary-btn,
.secondary-btn,
.rollback-button {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, rgba(239, 243, 248, 0.96), rgba(182, 195, 208, 0.92));
  color: rgb(10, 11, 13);
  font-weight: 700;
}

.secondary-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.secondary-btn.slim {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 5px;
  font-size: 12px;
}

.secondary-btn.danger {
  color: #ffb6b6;
}

.primary-btn:disabled,
.choice-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(10px);
}

.info-panel {
  width: min(420px, 100%);
  height: 100%;
  padding: 18px 16px;
  background: linear-gradient(180deg, rgba(18, 20, 24, 0.98), rgba(8, 9, 11, 0.98));
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header,
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-header strong,
.section-head strong {
  color: var(--text-primary);
}

.panel-header span,
.section-head span {
  color: var(--text-secondary);
  font-size: 12px;
}

.icon-close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.panel-section {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
}

.rollback-modal {
  position: relative;
  width: min(360px, calc(100% - 28px));
  margin: auto;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(22, 24, 27, 0.98), rgba(10, 11, 13, 0.98));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}

.rollback-close {
  position: absolute;
  top: 14px;
  right: 14px;
}

.rollback-modal strong {
  display: block;
  color: var(--text-primary);
  font-size: 20px;
}

.rollback-modal p {
  margin-top: 8px;
  color: var(--text-secondary);
}

.rollback-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.rollback-button {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-align: left;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.24;
  }

  40% {
    transform: translateY(-4px);
    opacity: 0.58;
  }
}

.dialogue-more-overlay {
  position: fixed;
  inset: 0;
  z-index: 10030;
  background: transparent;
}

.dialogue-more-menu {
  position: fixed;
  top: 48px;
  right: 12px;
  min-width: 140px;
  padding: 6px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98), rgba(6, 11, 20, 0.98));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.dialogue-more-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(56, 189, 248, 0.08);
  }
}

@media (max-width: 720px) {
  .dialogue-header {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }

  .bubble-stack {
    max-width: 82%;
  }

}

// Game overlay
.game-overlay {
  position: fixed;
  inset: 0;
  z-index: 50000;
  background: #050a0f;
}

.friend-accept-btn {
  background: rgba(56, 189, 248, 0.25);
  color: #e0f2fe;
}
</style>
