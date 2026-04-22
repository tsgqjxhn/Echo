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
              <img :src="activeConversation?.avatar || xingAvatar" alt="星" class="bubble-avatar" />
            </template>

            <div class="bubble-stack">
              <div class="message-bubble" :class="`message-bubble--${message.role}`">
                {{ message.text }}
              </div>
            </div>

            <template v-if="message.role === 'user'">
              <img :src="playerAvatar" alt="你" class="bubble-avatar bubble-avatar--user" />
            </template>
          </article>

          <article v-if="isTyping" class="message-row message-row--assistant">
            <img :src="activeConversation?.avatar || xingAvatar" alt="星" class="bubble-avatar" />
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

    <Teleport to="body">
      <div v-if="showPuzzleGame" class="game-overlay">
        <PuzzleGame :standalone="true" @complete="onPuzzleComplete" @exit="onPuzzleExit" />
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showMomentsCard" class="moments-card-overlay" @click.self="closeMomentsCard">
        <section class="moments-popup">
          <header class="moments-popup-head">
            <strong>朋友圈</strong>
            <button type="button" class="moments-popup-close" @click="closeMomentsCard">&times;</button>
          </header>

          <article class="moments-post-card">
            <div class="mp-head">
              <img :src="xingAvatar" alt="星" class="mp-avatar" />
              <div class="mp-meta">
                <span class="mp-name">星</span>
                <span class="mp-visibility">仅你可见</span>
              </div>
            </div>

            <div class="mp-image-block"></div>

            <p class="mp-text">如果连记忆都是假的，那我到底算个什么东西？</p>

            <div class="mp-actions">
              <span class="mp-time">刚刚</span>
              <div class="mp-reactions">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#f87171" stroke="#f87171" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span class="mp-liker">你</span>
              </div>
            </div>
          </article>
        </section>
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
import xingAvatar from '@/static/images/story/星.webp'
import { switchToRandomLocalCharacter } from '@/services/random-character-switch'
import { useUserStore } from '@/stores/user'
import {
  appendConversationMessage,
  applySystemEffects,
  clearConversationMessages,
  ensureConversationSession,
  ensureStoryCharacter,
  ECHO_STORY_CHARACTER_ID,
  ECHO_STORY_NAME,
  getConversationById,
  getConversationMessages,
  loadStoryLibrary,
  loadStoryRuntimeState,
  markConversationRead,
  resetConversationState,
  saveStoryRuntimeState,
  type StoryConversationDefinition,
  type StoryConversationState,
  type StoryLibrary,
  type StoryRuntimeState,
} from '@/services/story-conversations'
import { uni } from '@/utils/uni-polyfill'
import StoryGallery from '@/components/StoryGallery/index.vue'
import PuzzleGame from '@/pages/game/mini/puzzle.vue'

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

// 判断是否从底边栏进入（隐藏返回按钮）
const isFromTabBar = computed(() => {
  // 如果没有 from 参数，或者 from 不是 'history'，则认为是从底边栏进入
  return !route.query.from || route.query.from !== 'history'
})

const storyLibrary = ref<StoryLibrary>({
  storyName: ECHO_STORY_NAME,
  characterName: '星',
  conversations: [],
})
const runtimeState = ref<StoryRuntimeState>({
  activeConversationId: '',
  order: [],
  notes: '',
  clues: [],
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
const showPuzzleGame = ref(false)
const showMomentsCard = ref(false)

let activeRunToken = 0
let bgmAudio: HTMLAudioElement | null = null
let audioUnlocked = false

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
const playerAvatar = defaultAvatar
const headerTitle = computed(() => (isTyping.value ? '对方正在输入……' : '星'))
const presenceStatusText = computed(() => (isDead.value ? '角色已死亡' : '角色已上线'))
const presenceStatusTone = computed(() => (isDead.value ? 'dead' : 'online'))
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
    const target = await switchToRandomLocalCharacter(router, {
      excludeCharacterIds: [ECHO_STORY_CHARACTER_ID]
    })
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

async function appendVisibleStoryMessage(message: DialogueMessage, conversationId: string) {
  const conversationState = runtimeState.value.states[conversationId]

  if (!conversationState?.sessionId) {
    return
  }

  const mappedRole = mapMessageRole(message)
  if (!mappedRole) {
    if (!message.hidden) {
      runtimeState.value = applySystemEffects(runtimeState.value, conversationId, message)
      persistRuntime()
      if (runtimeState.value.states[conversationId]?.status === 'dead') {
        await scrollToBottom('auto')
      }
    }

    // Detect H5 mini-game trigger
    if (message.role === 'system' && message.text.includes('H5小游戏插入')) {
      isBusy.value = false
      isTyping.value = false
      showPuzzleGame.value = true
    }

    // Detect moments post trigger
    if (message.role === 'system' && message.text.includes('朋友圈动态插入')) {
      showMomentsCard.value = true
    }

    return
  }

  const savedMessage = await appendConversationMessage(conversationState.sessionId, mappedRole, message.text)
  displayedMessages.value.push({
    id: savedMessage.id,
    role: mappedRole,
    text: message.text,
  })
  conversationState.lastUpdatedAt = savedMessage.timestamp
  conversationState.unreadCount = 0
  persistRuntime()

  await scrollToBottom('auto')
}

function buildInlineReplyOptions(messages: DialogueMessage[], seed: string): ReplyOption[] {
  return messages.map((message, index) => ({
    id: `${seed}-inline-${index + 1}`,
    text: message.text,
    mode: 'inline-branch',
  }))
}

async function playBranchMessages(
  branchMessages: DialogueMessage[],
  conversation: StoryConversationDefinition,
  state: StoryConversationState,
  token: number,
  seed: string,
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
    await appendVisibleStoryMessage(branchMessage, conversation.id)

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
    await appendVisibleStoryMessage(message, conversation.id)
    state.messageIndex = index + 1
    persistRuntime()

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
  runtimeState.value = markConversationRead(runtimeState.value, conversationId)
  persistRuntime()
  applyConversationMusic(conversation)

  const session = await ensureConversationSession(conversation, runtimeState.value)
  runtimeState.value.states[conversationId].sessionId = session.id
  persistRuntime()

  await refreshDisplayedMessagesThrough(conversationId)

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

  if (!conversation || !state || !segment || !state.sessionId) {
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
  await scrollToBottom('auto')

  const branchResult = await playBranchMessages(
    selectedOption.branchMessages,
    conversation,
    state,
    token,
    selectedOption.id,
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
    isBusy.value = false
    return
  }

  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
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
  state.segmentIndex += 1
  state.messageIndex = 0
  state.status = 'idle'
  persistRuntime()
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
  await scrollToBottom()
  void playUntilInteraction(conversation.id)
}

function handleReplyOption(optionId: string) {
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
  persistRuntime()
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
  showRollbackModal.value = false
  pendingInlineBranchReply.value = null

  const firstConversationId = storyLibrary.value.conversations[resetStartIndex]?.id || ''
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

function closeMomentsCard() {
  showMomentsCard.value = false
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
  void initializeDialogue()
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
})

onUnmounted(() => {
  activeRunToken += 1
  pendingInlineBranchReply.value = null
  isTyping.value = false
  isBusy.value = false
  if (bgmAudio) {
    bgmAudio.pause()
  }
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
  border-radius: 12px;
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
  border-radius: 16px;
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
  border-radius: 11px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  align-self: flex-start;
}

.bubble-avatar--user {
  background: rgba(255, 255, 255, 0.14);
}

.bubble-stack {
  max-width: min(76%, 680px);
}

.message-bubble,
.typing-bubble {
  padding: 6px 7px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 4px;
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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.status-card {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
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
  border-radius: 12px;
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
  border-radius: 10px;
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
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.panel-section {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
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

// Moments card popup
.moments-card-overlay {
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 16px;
}

.moments-popup {
  width: min(400px, 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(18, 18, 20, 0.98), rgba(10, 10, 12, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.moments-popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  strong {
    color: var(--text-primary);
    font-size: 15px;
  }
}

.moments-popup-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.moments-post-card {
  padding: 14px 16px;
}

.mp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mp-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mp-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mp-name {
  color: #7dd3fc;
  font-size: 14px;
  font-weight: 600;
}

.mp-visibility {
  color: var(--text-tertiary);
  font-size: 11px;
}

.mp-image-block {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  background: #000;
  margin-bottom: 10px;
}

.mp-text {
  margin: 0 0 10px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.6;
}

.mp-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mp-time {
  color: var(--text-tertiary);
  font-size: 11px;
}

.mp-reactions {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(248, 113, 113, 0.06);
}

.mp-liker {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
