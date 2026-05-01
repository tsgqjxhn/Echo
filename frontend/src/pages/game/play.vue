<template>
  <div class="play-page">
    <div class="play-header">
      <button class="back-btn" @click="router.back()" aria-label="返回">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="play-title">{{ gameTitle }}</h1>
    </div>
    <div class="play-body">
      <ChessGame v-if="gameId === 'chess'" />
      <GomokuGame v-else-if="gameId === 'gomoku'" />
      <Match3Game v-else-if="gameId === 'match3'" />
      <CutRopeGame v-else-if="gameId === 'cut-rope'" />
      <PuzzleGame v-else-if="gameId === 'puzzle'" :standalone="true" @exit="router.back()" />
      <iframe
        v-else-if="h5Src"
        :src="h5Src"
        class="h5-iframe"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
      />
      <div v-else class="placeholder">
        <p>游戏加载中…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
