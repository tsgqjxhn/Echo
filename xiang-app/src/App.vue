<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { useGameStore } from '@/stores/game'
import TabBar from '@/components/TabBar/index.vue'
import '@/styles/theme.scss'

const route = useRoute()
const activeTab = ref('chat')
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const gameStore = useGameStore()

function isImmersiveRoute(path: string) {
  return path.includes('/dialogue')
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

  if (path.includes('/history')) {
    activeTab.value = 'history'
    return
  }

  if (path.includes('/settings') || path.includes('/profile')) {
    activeTab.value = 'profile'
  }
}

onMounted(async () => {
  await Promise.allSettled([
    settingsStore.initTheme(),
    userStore.loadUserInfo(),
    gameStore.initializeSettings()
  ])
  updateActiveTab()
})

watch(() => route.path, updateActiveTab, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <div
      class="app-container"
      :class="{ 'app-container--immersive': isImmersiveRoute(route.path) }"
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
    <TabBar v-model="activeTab" data-debug="app-tabbar" />
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
}

body {
  overflow-x: hidden;
}

.app-shell {
  min-height: 100vh;
  position: relative;
  background: var(--page-backdrop);
}

.app-container {
  min-height: 100vh;
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  position: relative;
  background: var(--page-backdrop);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  transition: background var(--transition-slow), color var(--transition-base);
}

.app-container--immersive {
  padding-bottom: 0;
}

.app-container::before,
.app-container::after {
  content: '';
  position: fixed;
  width: 38vw;
  height: 38vw;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.35;
  z-index: -1;
}

.app-container::before {
  top: -14vw;
  left: -12vw;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.22) 0%, rgba(5, 150, 105, 0.12) 50%, transparent 70%);
}

.app-container::after {
  right: -14vw;
  bottom: -18vw;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(2, 132, 199, 0.08) 50%, transparent 70%);
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
