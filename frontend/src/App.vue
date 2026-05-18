<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { useGameStore } from '@/stores/game'
import { useChatStore } from '@/stores/chat'
import { useMomentsStore } from '@/stores/moments'
import { useLanguageStore } from '@/stores/language'
import AppTabBar from '@/components/ChatInput/index.vue'
import { getStorageDriver } from '@/services/storage'
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
const languageStore = useLanguageStore()
const storage = getStorageDriver()

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

  if (path.includes('/character')) {
    activeTab.value = 'home'
    return
  }

  if (path.includes('/moments')) {
    activeTab.value = 'history'
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

function showToast(title: string) {
  uni.showToast({
    title,
    icon: 'none'
  })
}

async function switchToRandomConversation() {
  if (switchingConversation.value || !canUseRandomCharacterSwitch()) {
    return
  }

  switchingConversation.value = true

  try {
    const excludedCharacterIds = [String(route.params.characterId || '')].filter(Boolean)
    const nextCharacter = await switchToRandomLocalCharacter(router, {
      excludeCharacterIds: excludedCharacterIds
    })

    if (!nextCharacter) {
      showToast('没有可切换的本地角色')
      return
    }
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
  if (!element || !canUseRandomCharacterSwitch()) {
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

// 主页面路由列表（Tab 根页面），导航栏返回到这些页面时提示“再点按一次退出”
const HOME_ROUTES = ['/character', '/dialogue', '/history', '/settings', '/game/panel', '/favorites', '/moments']

function isNativeRuntime(): boolean {
  try {
    const cap = (window as any).Capacitor
    if (typeof cap?.isNativePlatform === 'function') {
      return cap.isNativePlatform()
    }
    return cap?.getPlatform?.() !== 'web'
  } catch {
    return false
  }
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
const routeViewKey = computed(() => route.fullPath)

// 导航栏返回键退出计时器（2 秒内再次触发才退出）
let exitTimer: ReturnType<typeof setTimeout> | null = null

function clearExitTimer() {
  if (exitTimer) {
    clearTimeout(exitTimer)
    exitTimer = null
  }
}

function handleBackButton() {
  // 只在原生 App（Android）端生效
  if (!isNativeRuntime()) {
    return
  }

  const path = route.path

  // 如果当前在根页面（主页面），提示“再点按一次退出”
  if (HOME_ROUTES.includes(path)) {
    if (exitTimer) {
      clearExitTimer()
      uni.exitApp()
      return
    }
    uni.showToast({ title: '再点按一次退出', icon: 'none', duration: 2000 })
    exitTimer = window.setTimeout(() => {
      exitTimer = null
    }, 2000)
    return
  }

  // 非主页面：直接回退上一页
  router.back()
}

// 路由切换时清除退出计时器，防止跨路由污染
watch(() => route.path, () => {
  clearExitTimer()
})

onMounted(async () => {
  // 初始化语言检测
  languageStore.init()

  await Promise.allSettled([
    settingsStore.initTheme(),
    userStore.loadUserInfo(),
    gameStore.initializeSettings()
  ])
  updateActiveTab()
  document.addEventListener('pointerdown', handleGlobalPointerDown, true)
  document.addEventListener('pointerup', handleGlobalPointerUp, true)
  document.addEventListener('pointercancel', handleGlobalPointerCancel, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', refreshHistoryBadge)
  window.addEventListener(HISTORY_READ_EVENT, refreshHistoryBadge)
  window.addEventListener(APP_NOTIFICATION_EVENT, handleAppNotification)

  // 注册 Capacitor backButton 监听（Android 导航栏返回键）
  if (isNativeRuntime()) {
    const cap = (window as any).Capacitor
    cap?.Plugins?.App?.addListener?.('backButton', handleBackButton)
  }

  await refreshHistoryBadge()
})

onUnmounted(() => {
  clearExitTimer()
  document.removeEventListener('pointerdown', handleGlobalPointerDown, true)
  document.removeEventListener('pointerup', handleGlobalPointerUp, true)
  document.removeEventListener('pointercancel', handleGlobalPointerCancel, true)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', refreshHistoryBadge)
  window.removeEventListener(HISTORY_READ_EVENT, refreshHistoryBadge)
  window.removeEventListener(APP_NOTIFICATION_EVENT, handleAppNotification)

  // 移除 Capacitor backButton 监听
  if (isNativeRuntime()) {
    const cap = (window as any).Capacitor
    cap?.Plugins?.App?.removeListener?.('backButton', handleBackButton)
  }
})

watch(
  () => route.fullPath,
  () => {
    updateActiveTab()
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
  border-radius: 4px;
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
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1.5px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 1.5px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
