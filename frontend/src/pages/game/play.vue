<template>
  <div class="play-page">
    <div v-if="!hideTopBar" class="play-header" :class="{ 'play-header-tabs': hasOuterTabs }">
      <button class="back-btn" :disabled="isSavingBeforeLeave" @click="router.back()" aria-label="返回">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>

      <nav v-if="hasOuterTabs" class="game-nav-tabs" :aria-label="`${gameTitle}导航`">
        <button
          v-for="tab in activeTabs"
          :key="tab.key"
          type="button"
          class="game-nav-tab"
          :class="{ active: activeScreen === tab.key }"
          @click="switchGameScreen(tab.key)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <h1 v-else class="play-title">{{ gameTitle }}</h1>
    </div>
    <div class="play-body">
      <PuzzleGame v-if="gameId === 'puzzle'" :standalone="true" @exit="router.back()" />
      <template v-else-if="generatedGameHtml">
        <iframe
          ref="iframeRef"
          :srcdoc="generatedGameHtml"
          class="h5-iframe"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
          @load="onIframeLoad"
        />
      </template>
      <template v-else-if="h5Src">
        <div v-if="isIframeLoading" class="loading-overlay">
          <div class="loading-card">
            <span class="loading-spinner" aria-hidden="true"></span>
            <span>游戏资源加载中…</span>
          </div>
        </div>
        <iframe
          ref="iframeRef"
          :src="h5Src"
          class="h5-iframe"
          :class="{ 'iframe-hidden': isIframeLoading }"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
          @load="onIframeLoad"
        />
      </template>
      <div v-else class="placeholder">
        <p>游戏加载中…</p>
      </div>
    </div>
    <div v-if="isSavingBeforeLeave" class="saving-overlay" role="status" aria-live="polite">
      <div class="saving-card">
        <span class="saving-spinner" aria-hidden="true"></span>
        <span>保存当前进度</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import PuzzleGame from './mini/puzzle.vue'
import { setLandscapeDisplayMode } from '@/services/native-display'
import { GameSettingsService } from '@/services/game-settings'
import { getStorageDriver } from '@/services/storage'
import { useGameStore } from '@/stores/game'
import { getGeneratedGame } from '@/services/generated-game-library'

const route = useRoute()
const router = useRouter()

const gameId = computed(() => route.params.id as string)
const gameStore = useGameStore()

// 游戏设置服务（用于 iframe 通信桥）
const settingsService = new GameSettingsService(getStorageDriver())

// ── 资源加载优化 ──
const isIframeLoading = ref(false)
const iframeLoadTimer = ref<number | null>(null)
const generatedGameHtml = computed(() => {
  const id = gameId.value
  if (id.startsWith('generated-')) {
    return getGeneratedGame(id)?.html || ''
  }
  return ''
})

const gameTitles: Record<string, string> = {
  chess: '国际象棋',
  gomoku: '五子棋',
  match3: '糖果消消乐',
  'cut-rope': '糖果绳索',
  puzzle: '残缺的逻辑',
  xiuxian: '问道长生',
  'xiuxian-v2': '问道长生',
  empire: '圣王国',
  hero: '勇士',
  'dark-dorm': '暗黑宿舍',
  'survivor-defense': '幸存者防线',
}

const h5GamePaths: Record<string, string> = {
  chess: '/games/chess/index.html',
  gomoku: '/games/gomoku/index.html',
  match3: '/games/match3/index.html',
  'cut-rope': '/games/cut-rope/index.html',
  xiuxian: '/games/xiuxian-v2/dist/index.html',
  'xiuxian-v2': '/games/xiuxian-v2/dist/index.html',
  empire: '/games/empire/index.html',
  hero: '/games/hero/index.html',
  'dark-dorm': '/games/dark-dorm/index.html',
  'survivor-defense': '/games/survivor-defense/index.html',
}

const gameTitle = computed(() => gameTitles[gameId.value] || '游戏')
const h5Src = computed(() => h5GamePaths[gameId.value] || '')
const landscapeH5GameIds = new Set(['survivor-defense', 'xiuxian', 'xiuxian-v2'])
const isLandscapeH5Game = computed(() => landscapeH5GameIds.has(gameId.value))

// ── Outer top-bar tab integration for hero / empire / xiuxian ──
interface NavTab { key: string; label: string }
interface BridgeConfig { hostSource: string; gameSource: string }

const tabConfigs: Record<string, { tabs: NavTab[]; hostSource: string; gameSource: string; defaultKey: string }> = {
  hero: {
    tabs: [
      { key: 'city', label: '城市' },
      { key: 'hero', label: '英雄' },
      { key: 'research', label: '研究' },
      { key: 'shop', label: '商店' },
      { key: 'menu', label: '菜单' },
    ],
    hostSource: 'hero-host',
    gameSource: 'hero-game',
    defaultKey: 'city',
  },
  empire: {
    tabs: [
      { key: 'farm', label: '农场' },
      { key: 'factory', label: '工厂' },
      { key: 'shop', label: '商店' },
      { key: 'logistics', label: '物流' },
      { key: 'upgrades', label: '升级' },
      { key: 'buffs', label: '增益' },
      { key: 'quests', label: '任务' },
      { key: 'achievements', label: '成就' },
      { key: 'npc', label: 'NPC' },
      { key: 'overview', label: '总览' },
    ],
    hostSource: 'empire-host',
    gameSource: 'empire-game',
    defaultKey: 'farm',
  },
  xiuxian: {
    tabs: [
      { key: 'cultivation', label: '修炼' },
      { key: 'world', label: '世界' },
      { key: 'cave', label: '洞府' },
      { key: 'techniques', label: '功法' },
      { key: 'exploration', label: '探险' },
      { key: 'inventory', label: '背包' },
      { key: 'shop', label: '商店' },
      { key: 'sect', label: '宗门' },
      { key: 'favor', label: '人脉' },
      { key: 'auction', label: '拍卖' },
      { key: 'settings', label: '设置' },
    ],
    hostSource: 'xiuxian-host',
    gameSource: 'xiuxian-game',
    defaultKey: 'cultivation',
  },
  'xiuxian-v2': {
    tabs: [
      { key: 'cultivation', label: '修炼' },
      { key: 'world', label: '世界' },
      { key: 'cave', label: '洞府' },
      { key: 'techniques', label: '功法' },
      { key: 'exploration', label: '探险' },
      { key: 'inventory', label: '背包' },
      { key: 'shop', label: '商店' },
      { key: 'sect', label: '宗门' },
      { key: 'favor', label: '人脉' },
      { key: 'auction', label: '拍卖' },
      { key: 'settings', label: '设置' },
    ],
    hostSource: 'xiuxian-host',
    gameSource: 'xiuxian-game',
    defaultKey: 'cultivation',
  },
}

const saveBridgeConfigs: Record<string, BridgeConfig> = {
  xiuxian: { hostSource: 'xiuxian-host', gameSource: 'xiuxian-game' },
  'xiuxian-v2': { hostSource: 'xiuxian-host', gameSource: 'xiuxian-game' },
  empire: { hostSource: 'empire-host', gameSource: 'empire-game' },
  hero: { hostSource: 'hero-host', gameSource: 'hero-game' },
  'dark-dorm': { hostSource: 'dark-dorm-host', gameSource: 'dark-dorm-game' },
  'survivor-defense': { hostSource: 'survivor-defense-host', gameSource: 'survivor-defense-game' },
}

const hasOuterTabs = computed(() => Boolean(tabConfigs[gameId.value]) && !generatedGameHtml.value)
const hideTopBar = computed(() => isLandscapeH5Game.value && !generatedGameHtml.value)
const activeTabs = computed<NavTab[]>(() => tabConfigs[gameId.value]?.tabs ?? [])
const activeScreen = ref<string>('')
const iframeRef = ref<HTMLIFrameElement | null>(null)
const isSavingBeforeLeave = ref(false)

// ── 预加载资源到浏览器缓存 ──
function preloadGameResources(gamePath: string) {
  if (!gamePath || typeof document === 'undefined') return
  // 预加载 Phaser 引擎
  const phaserPath = '/games/_shared/phaser/phaser.min.js'
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'script'
  link.href = phaserPath
  document.head.appendChild(link)
  // 预加载游戏入口页
  const entryLink = document.createElement('link')
  entryLink.rel = 'prefetch'
  entryLink.href = gamePath
  document.head.appendChild(entryLink)
}

let pendingSaveRequest: {
  id: string
  source: string
  timer: number
  resolve: (ok: boolean) => void
} | null = null

const SAVE_BEFORE_LEAVE_TIMEOUT = 1200
const SAVE_BEFORE_LEAVE_MIN_VISIBLE = 520

function postToGame(payload: Record<string, unknown>) {
  const win = iframeRef.value?.contentWindow
  const cfg = tabConfigs[gameId.value]
  if (!win || !cfg) return
  const targetOrigin = window.location.origin || '*'
  win.postMessage({ source: cfg.hostSource, ...payload }, targetOrigin)
}

function switchGameScreen(screen: string) {
  activeScreen.value = screen
  postToGame({ type: 'switch-screen', screen })
}

function onIframeLoad() {
  if (iframeLoadTimer.value) {
    window.clearTimeout(iframeLoadTimer.value)
    iframeLoadTimer.value = null
  }
  isIframeLoading.value = false

  const cfg = tabConfigs[gameId.value]
  if (!cfg) return
  if (!activeScreen.value) activeScreen.value = cfg.defaultKey
  setTimeout(() => postToGame({ type: 'request-state' }), 100)

  // 注册 iframe 到 settingsService 并同步设置
  registerIframeForSettings()
  syncSettingsToGame()
}

/** 注册当前 iframe 到 GameSettingsService */
function registerIframeForSettings() {
  const el = iframeRef.value
  if (!el) return
  const cfg = tabConfigs[gameId.value] || saveBridgeConfigs[gameId.value]
  if (!cfg) return
  settingsService.registerIframe(gameId.value, el, cfg.hostSource)
}

/** 同步当前设置到 iframe 内的游戏 */
function syncSettingsToGame() {
  settingsService.syncSettingsToGame(gameId.value)
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function requestH5Save() {
  const cfg = saveBridgeConfigs[gameId.value]
  const win = iframeRef.value?.contentWindow
  if (!cfg || !win) return Promise.resolve(false)

  if (pendingSaveRequest) {
    window.clearTimeout(pendingSaveRequest.timer)
    pendingSaveRequest.resolve(false)
    pendingSaveRequest = null
  }

  const requestId = `${gameId.value}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return new Promise<boolean>(resolve => {
    const timer = window.setTimeout(() => {
      if (pendingSaveRequest?.id === requestId) {
        pendingSaveRequest = null
        resolve(false)
      }
    }, SAVE_BEFORE_LEAVE_TIMEOUT)

    pendingSaveRequest = {
      id: requestId,
      source: cfg.gameSource,
      timer,
      resolve,
    }

    const targetOrigin = window.location.origin || '*'
    win.postMessage({ source: cfg.hostSource, type: 'save-now', requestId }, targetOrigin)
  })
}

async function saveCurrentGameBeforeLeave() {
  if (isSavingBeforeLeave.value) return
  isSavingBeforeLeave.value = true
  try {
    await Promise.all([
      requestH5Save(),
      wait(SAVE_BEFORE_LEAVE_MIN_VISIBLE),
    ])
  } finally {
    isSavingBeforeLeave.value = false
  }
}

function handleMessage(event: MessageEvent) {
  const data = event.data as { source?: string; type?: string; screen?: string; data?: any; success?: boolean } | null
  if (!data) return
  if (data.type === 'game-back') {
    router.back()
    return
  }
  if (data.type === 'save-complete' && pendingSaveRequest && data.source === pendingSaveRequest.source) {
    const requestId = (data as { requestId?: string }).requestId
    if (requestId === pendingSaveRequest.id) {
      window.clearTimeout(pendingSaveRequest.timer)
      const resolve = pendingSaveRequest.resolve
      pendingSaveRequest = null
      resolve((data as { ok?: boolean }).ok !== false)
    }
    return
  }

  // 处理游戏导出响应
  if (data.type === 'game-export-data' && data.data) {
    settingsService.handleExportResponse(gameId.value, data.data)
    return
  }

  // 处理游戏导入响应
  if (data.type === 'game-import-result') {
    settingsService.handleImportResponse(gameId.value, data.success !== false)
    return
  }

  // 处理游戏就绪信号，同步设置
  if (data.type === 'game-ready') {
    syncSettingsToGame()
  }

  const cfg = tabConfigs[gameId.value]
  if (!cfg || data.source !== cfg.gameSource) return
  if (data.type === 'screen' && data.screen) {
    activeScreen.value = data.screen
  }
}

function syncLandscapeDisplayMode() {
  void setLandscapeDisplayMode(isLandscapeH5Game.value)
}

onMounted(async () => {
  window.addEventListener('message', handleMessage)
  syncLandscapeDisplayMode()
  // 初始化设置服务
  await settingsService.initialize()

  // 优化：当使用外部 H5 游戏时，预加载关键资源并显示 loading
  const src = h5Src.value
  if (src && !generatedGameHtml.value) {
    isIframeLoading.value = true
    preloadGameResources(src)
    // 最小显示 loading 时间，避免闪烁
    iframeLoadTimer.value = window.setTimeout(() => {
      isIframeLoading.value = false
      iframeLoadTimer.value = null
    }, 3000)
  }

  // 注册 iframe（延迟等待 iframe 加载）
  setTimeout(() => {
    registerIframeForSettings()
    syncSettingsToGame()
  }, 300)
})

watch(isLandscapeH5Game, syncLandscapeDisplayMode)

// 监听设置变更，同步到游戏
watch(() => gameStore.gameSettings, () => {
  syncSettingsToGame()
}, { deep: true })

onBeforeUnmount(() => {
  void setLandscapeDisplayMode(false)
  settingsService.unregisterIframe(gameId.value)
  if (pendingSaveRequest) {
    window.clearTimeout(pendingSaveRequest.timer)
    pendingSaveRequest.resolve(false)
    pendingSaveRequest = null
  }
  if (iframeLoadTimer.value) {
    window.clearTimeout(iframeLoadTimer.value)
    iframeLoadTimer.value = null
  }
  window.removeEventListener('message', handleMessage)
})
onBeforeRouteLeave(async () => {
  await saveCurrentGameBeforeLeave()
  void setLandscapeDisplayMode(false)
  return true
})
</script>

<style lang="scss" scoped>
.play-page {
  --play-header-shell-height: calc(env(safe-area-inset-top, 0px) + 72px);
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: var(--page-backdrop-soft);
  overflow: hidden;
}

.play-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  min-height: var(--play-header-shell-height);
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  transform: translateZ(0);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border: none; border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
  &:active { transform: scale(0.95); }
}

.play-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.play-header-tabs {
  gap: 8px;
  padding-right: 12px;
}

.game-nav-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding: 4px 2px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;

  &::-webkit-scrollbar {
    display: none;
  }
}

.game-nav-tab {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--transition-base), color var(--transition-base), border-color var(--transition-base);

  &:active {
    transform: scale(0.96);
  }

  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.30), rgba(52, 211, 153, 0.30));
    border-color: rgba(125, 211, 252, 0.55);
    color: #fff;
  }
}

.play-body {
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  overflow: hidden;
}

.placeholder { color: var(--text-tertiary); font-size: 14px; }

.h5-iframe {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  display: block;

  &.iframe-hidden {
    opacity: 0;
    pointer-events: none;
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.44);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid rgba(125, 211, 252, 0.26);
  border-radius: 14px;
  background: rgba(8, 13, 24, 0.90);
  color: #f8fafc;
  font-size: 14px;
  font-weight: 650;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(125, 211, 252, 0.24);
  border-top-color: #7dd3fc;
  border-radius: 999px;
  animation: saving-spin 0.75s linear infinite;
}

.saving-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.44);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.saving-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid rgba(125, 211, 252, 0.26);
  border-radius: 7px;
  background: rgba(8, 13, 24, 0.90);
  color: #f8fafc;
  font-size: 14px;
  font-weight: 650;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
}

.saving-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(125, 211, 252, 0.24);
  border-top-color: #7dd3fc;
  border-radius: 999px;
  animation: saving-spin 0.75s linear infinite;
}

@keyframes saving-spin {
  to { transform: rotate(360deg); }
}
</style>
