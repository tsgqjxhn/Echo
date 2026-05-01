<template>
  <div class="play-page">
    <div class="play-header" :class="{ 'play-header-hero': gameId === 'hero' }">
      <button class="back-btn" @click="router.back()" aria-label="返回">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>

      <nav v-if="gameId === 'hero'" class="hero-nav-tabs" aria-label="勇士导航">
        <button
          v-for="tab in heroTabs"
          :key="tab.key"
          type="button"
          class="hero-nav-tab"
          :class="{ active: heroActiveScreen === tab.key }"
          @click="switchHeroScreen(tab.key)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <h1 v-else class="play-title">{{ gameTitle }}</h1>
    </div>
    <div class="play-body">
      <ChessGame v-if="gameId === 'chess'" />
      <GomokuGame v-else-if="gameId === 'gomoku'" />
      <Match3Game v-else-if="gameId === 'match3'" />
      <CutRopeGame v-else-if="gameId === 'cut-rope'" />
      <PuzzleGame v-else-if="gameId === 'puzzle'" :standalone="true" @exit="router.back()" />
      <iframe
        v-else-if="h5Src"
        ref="iframeRef"
        :src="h5Src"
        class="h5-iframe"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
        @load="onIframeLoad"
      />
      <div v-else class="placeholder">
        <p>游戏加载中…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChessGame from './mini/chess.vue'
import GomokuGame from './mini/gomoku.vue'
import Match3Game from './mini/match3.vue'
import CutRopeGame from './mini/cut-rope.vue'
import PuzzleGame from './mini/puzzle.vue'

const route = useRoute()
const router = useRouter()

const gameId = computed(() => route.params.id as string)

const gameTitles: Record<string, string> = {
  chess: '国际象棋',
  gomoku: '五子棋',
  match3: '星糖消消乐',
  'cut-rope': '糖果绳索',
  puzzle: '残缺的逻辑',
  xiuxian: '问道长生',
  empire: '圣王国',
  hero: '勇士',
  'dark-dorm': '暗黑宿舍',
}

const h5GamePaths: Record<string, string> = {
  xiuxian: '/games/xiuxian/index.html',
  empire: '/games/empire/index.html',
  hero: '/games/hero/index.html',
  'dark-dorm': '/games/dark-dorm/index.html',
}

const gameTitle = computed(() => gameTitles[gameId.value] || '游戏')
const h5Src = computed(() => h5GamePaths[gameId.value] || '')

// ── Hero game: 5-tab nav hosted in this outer header ──
type HeroScreen = 'city' | 'hero' | 'research' | 'shop' | 'menu'
interface HeroTab { key: HeroScreen; label: string }
const heroTabs: HeroTab[] = [
  { key: 'city', label: '城市' },
  { key: 'hero', label: '英雄' },
  { key: 'research', label: '研究' },
  { key: 'shop', label: '商店' },
  { key: 'menu', label: '菜单' },
]
const heroActiveScreen = ref<HeroScreen>('city')
const iframeRef = ref<HTMLIFrameElement | null>(null)

function postToHero(payload: Record<string, unknown>) {
  const win = iframeRef.value?.contentWindow
  if (!win) return
  win.postMessage({ source: 'hero-host', ...payload }, '*')
}

function switchHeroScreen(screen: HeroScreen) {
  heroActiveScreen.value = screen
  postToHero({ type: 'switch-screen', screen })
}

function onIframeLoad() {
  // Ask hero for its current screen so we render the right active highlight.
  if (gameId.value === 'hero') {
    setTimeout(() => postToHero({ type: 'request-state' }), 100)
  }
}

function handleMessage(event: MessageEvent) {
  const data = event.data as { source?: string; type?: string; screen?: HeroScreen } | null
  if (!data || data.source !== 'hero-game') return
  if (data.type === 'screen' && data.screen) {
    heroActiveScreen.value = data.screen
  }
}

onMounted(() => window.addEventListener('message', handleMessage))
onBeforeUnmount(() => window.removeEventListener('message', handleMessage))
</script>

<style lang="scss" scoped>
.play-page {
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--page-backdrop-soft);
  overflow: hidden;
}

.play-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border: none; border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  &:active { transform: scale(0.95); }
}

.play-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.play-header-hero {
  gap: 8px;
  padding-right: 12px;
}

.hero-nav-tabs {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  margin-left: 4px;
}

.hero-nav-tab {
  min-height: 36px;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
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
  flex: 1;
  min-height: 0;
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
}
</style>
