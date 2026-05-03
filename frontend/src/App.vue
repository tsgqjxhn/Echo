<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ICharacter } from '@/types/character'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { useGameStore } from '@/stores/game'
import { useChatStore } from '@/stores/chat'
import { useMomentsStore } from '@/stores/moments'
import AppTabBar from '@/components/ChatInput/index.vue'
import { createChatService } from '@/services/chat'
import { getCharacterService } from '@/services/character'
import { getStorageDriver } from '@/services/storage'
import {
  ECHO_STORY_CHARACTER_ID,
  ensureStoryCharacter,
  loadStoryLibrary,
  loadStoryRuntimeState,
  getConversationById,
  resetConversationState,
  saveStoryRuntimeState,
} from '@/services/story-conversations'
import { switchToRandomLocalCharacter } from '@/services/random-character-switch'
import { HISTORY_READ_EVENT, hasAnyHistoryUnread } from '@/services/history-unread'
import { APP_NOTIFICATION_EVENT, type AppNotificationPayload } from '@/services/notification'
import { uni } from '@/utils/uni-polyfill'
import '@/styles/theme.scss'

interface SwipeStart {
  x: number
  y: number
  timestamp: number
}

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

interface InAppNotification extends AppNotificationPayload {
  id: number
}

const route = useRoute()
const router = useRouter()
const activeTab = ref('chat')
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const gameStore = useGameStore()
const chatStore = useChatStore()
const momentsStore = useMomentsStore()
const storage = getStorageDriver()
const chatService = createChatService(storage)
const characterService = getCharacterService()

const dialogueSheetVisible = ref(false)
const dialogueSheetBusy = ref(false)
const dialogueCharacter = ref<ICharacter | null>(null)
const dialogueAnchorRect = ref<AnchorRect | null>(null)
const dialogueViewVersion = ref(0)
const swipeStart = ref<SwipeStart | null>(null)
const switchingConversation = ref(false)
const hasHistoryBadge = ref(false)
const appNotifications = ref<InAppNotification[]>([])

function shouldHideTabBar() {
  if (route.path.startsWith('/game/play/')) {
    return true
  }

  return (
    (route.path.includes('/chat') || route.path.includes('/dialogue')) &&
    route.query.from === 'history'
  )
}

function updateActiveTab() {
  const path = route.path

  if (path.includes('/dialogue') || path.includes('/chat')) {
    activeTab.value = 'chat'
    return
  }

  if (path.includes('/game')) {
    activeTab.value = 'game'
    return
  }

  if (path.includes('/moments')) {
    activeTab.value = 'history'
    return
  }

  if (path.includes('/character')) {
    activeTab.value = 'home'
    return
  }

  if (path.includes('/history')) {
    activeTab.value = 'history'
    return
  }

  if (path.includes('/settings') || path.includes('/profile')) {
    activeTab.value = 'profile'
  }
}

function canUseRandomCharacterSwitch() {
  return (
    (route.path.includes('/dialogue') || route.path.includes('/chat')) &&
    route.query.from !== 'history'
  )
}

function getStorySnapshot() {
  const library = loadStoryLibrary()
  const runtime = loadStoryRuntimeState(library.conversations)
  return { library, runtime }
}

function showToast(title: string) {
  uni.showToast({
    title,
    icon: 'none'
  })
}

function closeDialogueSheet() {
  dialogueSheetVisible.value = false
  dialogueAnchorRect.value = null
}

async function refreshDialogueCharacter() {
  const { library } = getStorySnapshot()
  await ensureStoryCharacter(library.characterName).catch(() => undefined)
  dialogueCharacter.value = await storage.getCharacter(ECHO_STORY_CHARACTER_ID)
}

async function openDialogueSheet(anchorRect: DOMRect) {
  await refreshDialogueCharacter()
  dialogueAnchorRect.value = {
    top: anchorRect.top,
    left: anchorRect.left,
    width: anchorRect.width,
    height: anchorRect.height
  }
  dialogueSheetVisible.value = true
}

function remountDialogueView() {
  dialogueViewVersion.value += 1
}

async function clearDialogueHistory() {
  const { library, runtime } = getStorySnapshot()
  const conversationId = runtime.activeConversationId
  const conversation = getConversationById(library.conversations, conversationId)
  const state = conversation ? runtime.states[conversation.id] : null

  if (!conversation || !state) {
    showToast('当前对话不存在')
    return
  }

  dialogueSheetBusy.value = true

  try {
    if (state.sessionId) {
      await chatService.clearHistory(state.sessionId)
    }

    const nextRuntime = resetConversationState(runtime, conversation, state.sessionId || null)
    nextRuntime.activeConversationId = conversation.id
    saveStoryRuntimeState(nextRuntime)
    closeDialogueSheet()
    remountDialogueView()
    showToast('已清空聊天记录')
  } catch (error) {
    showToast((error as Error).message || '清空失败')
  } finally {
    dialogueSheetBusy.value = false
  }
}

function confirmClearDialogueHistory() {
  if (dialogueSheetBusy.value) {
    return
  }

  uni.showModal({
    title: '清空聊天',
    content: '确认清空当前对话记录吗？',
    success: result => {
      if (!result.confirm) {
        return
      }

      void clearDialogueHistory()
    }
  })
}

async function toggleDialogueCharacterFlag(flag: 'friend' | 'like') {
  if (dialogueSheetBusy.value) {
    return
  }

  dialogueSheetBusy.value = true

  try {
    await refreshDialogueCharacter()

    if (flag === 'friend') {
      await characterService.toggleFriend(ECHO_STORY_CHARACTER_ID)
    } else {
      await characterService.toggleLike(ECHO_STORY_CHARACTER_ID)
    }

    await refreshDialogueCharacter()

    if (flag === 'friend') {
      showToast(dialogueCharacter.value?.isFriend ? '已添加好友' : '已取消好友')
    } else {
      showToast(dialogueCharacter.value?.isLiked ? '已点赞' : '已取消点赞')
    }
  } catch (error) {
    showToast((error as Error).message || '操作失败')
  } finally {
    dialogueSheetBusy.value = false
  }
}

async function switchToRandomConversation() {
  if (switchingConversation.value || !canUseRandomCharacterSwitch()) {
    return
  }

  switchingConversation.value = true

  try {
    const excludedCharacterIds = route.path.includes('/dialogue')
      ? [ECHO_STORY_CHARACTER_ID]
      : [String(route.params.characterId || '')].filter(Boolean)
    const nextCharacter = await switchToRandomLocalCharacter(router, {
      excludeCharacterIds: excludedCharacterIds
    })

    if (!nextCharacter) {
      showToast('没有可切换的本地角色')
      return
    }

    closeDialogueSheet()
  } catch (error) {
    showToast((error as Error).message || '切换失败')
  } finally {
    window.setTimeout(() => {
      switchingConversation.value = false
    }, 180)
  }
}

function toElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null
}

function canStartConversationSwipe(target: EventTarget | null, pointerY?: number): boolean {
  const element = toElement(target)
  if (!element || dialogueSheetVisible.value || !canUseRandomCharacterSwitch()) {
    return false
  }

  if (route.path.includes('/dialogue')) {
    if (element.closest('.dialogue-page .composer')) {
      return true
    }

    const scroller = element.closest('.dialogue-page .message-scroller')
    if (!scroller) {
      return false
    }

    const rect = scroller.getBoundingClientRect()
    if (typeof pointerY === 'number') {
      return pointerY >= rect.top + rect.height * 0.56
    }

    return true
  }

  if (route.path.includes('/chat')) {
    if (element.closest('textarea, input')) {
      return false
    }

    return Boolean(
      element.closest('.chat-page .message-list') ||
      element.closest('.chat-page .composer-shell')
    )
  }

  return false
}

function handleGlobalPointerDown(event: PointerEvent) {
  if (!canStartConversationSwipe(event.target, event.clientY)) {
    swipeStart.value = null
    return
  }

  swipeStart.value = {
    x: event.clientX,
    y: event.clientY,
    timestamp: Date.now()
  }
}

function handleGlobalPointerCancel() {
  swipeStart.value = null
}

function handleViewportMutation() {
  if (dialogueSheetVisible.value) {
    closeDialogueSheet()
  }
}

function handleGlobalPointerUp(event: PointerEvent) {
  const start = swipeStart.value
  swipeStart.value = null

  if (!start || switchingConversation.value) {
    return
  }

  const deltaX = event.clientX - start.x
  const deltaY = event.clientY - start.y
  const elapsed = Date.now() - start.timestamp

  if (elapsed > 900) {
    return
  }

  if (Math.abs(deltaY) < 96) {
    return
  }

  if (Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
    return
  }

  void switchToRandomConversation()
}

function handleGlobalClick(event: MouseEvent) {
  if (!route.path.includes('/dialogue')) {
    return
  }

  const element = toElement(event.target)
  if (!element) {
    return
  }

  const avatar = element.closest('.dialogue-page .bubble-avatar')
  if (!avatar || avatar.classList.contains('bubble-avatar--user')) {
    return
  }

  const rect = avatar.getBoundingClientRect()
  void openDialogueSheet(rect)
}

async function refreshHistoryBadge() {
  hasHistoryBadge.value = await hasAnyHistoryUnread(storage, momentsStore.posts)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void refreshHistoryBadge()
  }
}

function dismissAppNotification(id: number) {
  appNotifications.value = appNotifications.value.filter(item => item.id !== id)
}

function openAppNotification(item: InAppNotification) {
  dismissAppNotification(item.id)
  if (item.route) {
    router.push(item.route)
  }
}

function handleAppNotification(event: Event) {
  const payload = (event as CustomEvent<AppNotificationPayload>).detail
  if (!payload?.title) return

  const item: InAppNotification = {
    ...payload,
    id: Date.now() + Math.floor(Math.random() * 1000),
  }

  appNotifications.value = [item, ...appNotifications.value].slice(0, 3)
  window.setTimeout(() => dismissAppNotification(item.id), 5200)
}

const showTabBar = computed(() => !shouldHideTabBar())
const isHistoryChat = computed(() => route.path.includes('/chat') && route.query.from === 'history')
const isHistoryDialogue = computed(() => route.path.includes('/dialogue') && route.query.from === 'history')
const isDialogueRoute = computed(() => route.path.includes('/dialogue'))
const isSelfManagedTabPage = computed(() => ['/character', '/history', '/settings'].includes(route.path))
const appShellThemeClass = computed(() => {
  const path = route.path

  if (path.includes('/history') || path.includes('/moments')) {
    return 'app-shell--history'
  }

  if (path.includes('/character') || path.includes('/settings') || path.includes('/profile')) {
    return 'app-shell--deep'
  }

  if (path.includes('/game')) {
    return 'app-shell--game'
  }

  return 'app-shell--soft'
})
const dialoguePopoverPlacement = computed<'top' | 'bottom'>(() => {
  const anchor = dialogueAnchorRect.value
  if (!anchor) {
    return 'top'
  }

  const estimatedHeight = 238
  const topSpace = anchor.top
  const bottomSpace = window.innerHeight - (anchor.top + anchor.height)

  if (topSpace < estimatedHeight && bottomSpace > topSpace) {
    return 'bottom'
  }

  return 'top'
})
const dialoguePopoverStyle = computed(() => {
  const anchor = dialogueAnchorRect.value
  if (!anchor) {
    return {
      top: '16px',
      left: '16px'
    }
  }

  const popoverWidth = Math.min(248, Math.max(212, window.innerWidth - 32))
  const estimatedHeight = 238
  const gap = 14
  const horizontalPadding = 12
  const bottomSafeSpace = showTabBar.value ? 92 : 18
  const minLeft = horizontalPadding
  const maxLeft = Math.max(horizontalPadding, window.innerWidth - popoverWidth - horizontalPadding)
  const centeredLeft = anchor.left + anchor.width / 2 - popoverWidth / 2
  const left = Math.min(maxLeft, Math.max(minLeft, centeredLeft))
  const maxTop = Math.max(12, window.innerHeight - bottomSafeSpace - estimatedHeight)
  const rawTop = dialoguePopoverPlacement.value === 'top'
    ? anchor.top - estimatedHeight - gap
    : anchor.top + anchor.height + gap
  const top = Math.min(maxTop, Math.max(12, rawTop))
  const arrowLeft = Math.min(
    popoverWidth - 28,
    Math.max(28, anchor.left + anchor.width / 2 - left)
  )

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${popoverWidth}px`,
    '--dialogue-popover-arrow-left': `${arrowLeft}px`
  }
})
const routeViewKey = computed(() => {
  if (isDialogueRoute.value) {
    return `${route.fullPath}:${dialogueViewVersion.value}`
  }

  return route.fullPath
})
const dialogueCharacterName = computed(() => dialogueCharacter.value?.name || '当前角色')
const dialogueCharacterAvatar = computed(() => dialogueCharacter.value?.avatar || '')

import { initBuiltinCharacters } from '@/data/builtin-characters'

onMounted(async () => {
  await Promise.allSettled([
    settingsStore.initTheme(),
    userStore.loadUserInfo(),
    gameStore.initializeSettings()
  ])
  try { await initBuiltinCharacters() } catch { /* ignore */ }
  updateActiveTab()
  document.addEventListener('pointerdown', handleGlobalPointerDown, true)
  document.addEventListener('pointerup', handleGlobalPointerUp, true)
  document.addEventListener('pointercancel', handleGlobalPointerCancel, true)
  document.addEventListener('click', handleGlobalClick, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('resize', handleViewportMutation)
  window.addEventListener('scroll', handleViewportMutation, true)
  window.addEventListener('focus', refreshHistoryBadge)
  window.addEventListener(HISTORY_READ_EVENT, refreshHistoryBadge)
  window.addEventListener(APP_NOTIFICATION_EVENT, handleAppNotification)
  await refreshHistoryBadge()
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleGlobalPointerDown, true)
  document.removeEventListener('pointerup', handleGlobalPointerUp, true)
  document.removeEventListener('pointercancel', handleGlobalPointerCancel, true)
  document.removeEventListener('click', handleGlobalClick, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('resize', handleViewportMutation)
  window.removeEventListener('scroll', handleViewportMutation, true)
  window.removeEventListener('focus', refreshHistoryBadge)
  window.removeEventListener(HISTORY_READ_EVENT, refreshHistoryBadge)
  window.removeEventListener(APP_NOTIFICATION_EVENT, handleAppNotification)
})

watch(
  () => route.fullPath,
  () => {
    updateActiveTab()
    if (!route.path.includes('/dialogue')) {
      closeDialogueSheet()
    }
    void refreshHistoryBadge()
  },
  { immediate: true }
)

watch(
  () => [chatStore.messages.length, chatStore.sessions.length, momentsStore.posts.length],
  () => {
    void refreshHistoryBadge()
  }
)
</script>

<template>
  <div class="app-shell" :class="appShellThemeClass">
    <div
      class="app-container"
      :class="{
        'app-container--immersive': shouldHideTabBar(),
        'app-container--history-chat': isHistoryChat,
        'app-container--history-dialogue': isHistoryDialogue,
        'app-container--dialogue': isDialogueRoute,
        'app-container--self-managed-tab': isSelfManagedTabPage
      }"
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="routeViewKey" />
        </keep-alive>
      </router-view>
    </div>

    <AppTabBar v-if="showTabBar" v-model="activeTab" :history-badge="hasHistoryBadge" data-debug="app-tabbar" />

    <Teleport to="body">
      <div v-if="appNotifications.length" class="app-notification-stack">
        <button
          v-for="item in appNotifications"
          :key="item.id"
          type="button"
          class="app-notification-card"
          @click="openAppNotification(item)"
        >
          <strong>{{ item.title }}</strong>
          <span v-if="item.body">{{ item.body }}</span>
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="dialogueSheetVisible"
        class="dialogue-action-overlay"
        @click.self="closeDialogueSheet"
      >
        <section
          class="dialogue-action-sheet"
          :class="`dialogue-action-sheet--${dialoguePopoverPlacement}`"
          :style="dialoguePopoverStyle"
        >
          <div class="dialogue-action-head">
            <img
              v-if="dialogueCharacterAvatar"
              :src="dialogueCharacterAvatar"
              :alt="dialogueCharacterName"
              class="dialogue-action-avatar"
            />
            <div class="dialogue-action-copy">
              <strong>{{ dialogueCharacterName }}</strong>
              <span>{{ dialogueCharacter?.description?.slice(0, 48) || '当前故事角色' }}</span>
            </div>
          </div>

          <div class="dialogue-action-list">
            <button
              type="button"
              class="dialogue-action-btn"
              :disabled="dialogueSheetBusy"
              @click="confirmClearDialogueHistory"
            >
              清空聊天记录
            </button>
            <button
              type="button"
              class="dialogue-action-btn"
              :disabled="dialogueSheetBusy"
              @click="toggleDialogueCharacterFlag('friend')"
            >
              {{ dialogueCharacter?.isFriend ? '取消好友' : '添加好友' }}
            </button>
            <button
              type="button"
              class="dialogue-action-btn"
              :disabled="dialogueSheetBusy"
              @click="toggleDialogueCharacterFlag('like')"
            >
              {{ dialogueCharacter?.isLiked ? '取消点赞' : '点赞' }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  min-height: 100%;
  background: var(--page-backdrop-soft);
}

body {
  overflow-x: hidden;
}

.app-shell {
  --app-page-backdrop: var(--page-backdrop-soft);
  --app-bottom-nav-surface:
    linear-gradient(180deg, rgba(15, 23, 42, 0.48) 0%, rgba(8, 13, 24, 0.68) 100%),
    var(--app-page-backdrop);
  --app-bottom-nav-badge-ring: rgba(8, 13, 24, 0.96);
  min-height: 100vh;
  position: relative;
  background: var(--app-page-backdrop);
}

.app-shell--deep {
  --app-page-backdrop:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  --app-bottom-nav-surface:
    linear-gradient(180deg, rgba(5, 13, 20, 0.38) 0%, rgba(10, 30, 44, 0.62) 100%),
    var(--app-page-backdrop);
  --app-bottom-nav-badge-ring: rgba(5, 13, 20, 0.96);
}

.app-shell--history {
  --app-page-backdrop:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.20) 0%, transparent 44%),
    radial-gradient(ellipse at 58% 44%, rgba(103, 232, 249, 0.10) 0%, transparent 52%),
    linear-gradient(160deg, #0a0f1a 0%, #0f1626 32%, #141d32 68%, #0d121f 100%);
  --app-bottom-nav-surface:
    linear-gradient(180deg, rgba(10, 15, 26, 0.42) 0%, rgba(13, 18, 31, 0.64) 100%),
    var(--app-page-backdrop);
  --app-bottom-nav-badge-ring: rgba(10, 15, 26, 0.96);
}

.app-container {
  min-height: 100vh;
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  position: relative;
  background: var(--app-page-backdrop);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  transition: background var(--transition-slow), color var(--transition-base);
}

.app-container--immersive {
  padding-bottom: 0;
}

.app-container--dialogue {
  padding-bottom: 0;
}

.app-container--self-managed-tab {
  padding-bottom: 0;
}

.app-container--history-chat .chat-page {
  padding-bottom: calc(108px + env(safe-area-inset-bottom, 0px)) !important;
}

.app-container--history-chat .composer-shell {
  bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
}

.app-container--history-chat .message-list {
  min-height: calc(100vh - 156px) !important;
}

.app-container--history-dialogue .dialogue-page {
  height: 100vh !important;
}

.app-container--history-dialogue .dialogue-shell {
  height: 100vh !important;
}

.app-container--history-dialogue .message-scroller {
  padding-bottom: 0 !important;
}

.app-container--history-dialogue .composer {
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
}

.character-list-page {
  scroll-snap-type: y proximity;
  scroll-padding-top: 12px;
}


.character-list-page .big-category-row,
.character-list-page .small-category-row {
  gap: 8px !important;
  margin-top: 12px !important;
}

.character-list-page .category-panel {
  margin-top: 4px !important;
  padding-bottom: 6px !important;
}

.character-list-page .category-chip {
  min-height: 34px !important;
  padding: 0 14px !important;
  border-radius: 12px !important;
  font-size: 12px !important;
}

.character-list-page .category-chip.large {
  min-height: 38px !important;
}

.character-list-page .featured-panel {
  margin-top: 12px !important;
}

.character-list-page .character-card {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.dialogue-action-overlay {
  position: fixed;
  inset: 0;
  z-index: 10040;
  background: transparent;
}

.dialogue-action-sheet {
  position: fixed;
  width: min(248px, calc(100vw - 32px));
  border: 1px solid rgba(56, 189, 248, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
  overflow: hidden;
  isolation: isolate;
}

.dialogue-action-sheet::before {
  content: '';
  position: absolute;
  left: var(--dialogue-popover-arrow-left, 50%);
  width: 18px;
  height: 18px;
  background: linear-gradient(180deg, rgba(8, 14, 24, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  border-left: 1px solid rgba(56, 189, 248, 0.18);
  border-top: 1px solid rgba(56, 189, 248, 0.18);
  transform: translateX(-50%) rotate(45deg);
  z-index: -1;
}

.dialogue-action-sheet--top::before {
  bottom: -10px;
}

.dialogue-action-sheet--bottom::before {
  top: -10px;
  transform: translateX(-50%) rotate(225deg);
}

.dialogue-action-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 10px;
}

.dialogue-action-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 16px;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.dialogue-action-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.3;
  }

  span {
    color: var(--text-tertiary);
    font-size: 12px;
  }
}

.dialogue-action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 14px 16px;
}

.dialogue-action-btn {
  width: 100%;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 18px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), transform var(--transition-base);
}

.dialogue-action-btn:hover {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.24);
  transform: translateY(-1px);
}

.dialogue-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.app-notification-stack {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 14px);
  right: 14px;
  z-index: 12000;
  display: grid;
  gap: 10px;
  width: min(320px, calc(100vw - 28px));
  pointer-events: none;
}

.app-notification-card {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(125, 211, 252, 0.26);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(12, 18, 31, 0.96) 0%, rgba(7, 13, 24, 0.96) 100%);
  color: var(--text-primary);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
  font: inherit;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  strong {
    font-size: 14px;
    white-space: nowrap;
  }

  span {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

@media (max-width: 640px) {
  .app-container--history-chat .chat-page {
    padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .app-container--history-chat .composer-shell {
    bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .app-container--history-chat .message-list {
    min-height: calc(100vh - 148px) !important;
  }

  .app-container--history-dialogue .dialogue-page,
  .app-container--history-dialogue .dialogue-shell {
    height: 100vh !important;
  }

  .dialogue-action-sheet {
    border-radius: 20px;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
