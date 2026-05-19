<template>
  <div class="game-settings-page">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"/>
        </svg>
      </button>
      <h1 class="title">游戏设置</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </div>
    <div class="settings-content">
      <div class="setting-section">
        <h2 class="section-title">音效与显示</h2>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info"><span class="setting-label">全局音效</span><span class="setting-desc">开启后游戏内播放音效</span></div>
            <label class="toggle"><input v-model="globalSound" type="checkbox" @change="onGlobalSoundChange" /><span class="slider" /></label>
          </div>
          <div class="setting-item">
            <div class="setting-info"><span class="setting-label">全局背景音乐</span><span class="setting-desc">开启后游戏内播放背景音乐</span></div>
            <label class="toggle"><input v-model="globalBgm" type="checkbox" @change="onGlobalBgmChange" /><span class="slider" /></label>
          </div>
          <div class="setting-item">
            <div class="setting-info"><span class="setting-label">伤害显示</span><span class="setting-desc">战斗中显示伤害数字</span></div>
            <label class="toggle"><input v-model="damageDisplay" type="checkbox" @change="onDamageDisplayChange" /><span class="slider" /></label>
          </div>
        </div>
      </div>
      <div class="setting-section">
        <h2 class="section-title">游戏库</h2>
        <div class="setting-list">
          <div class="setting-item clickable" @click="router.push('/game/manage')">
            <div class="setting-info">
              <span class="setting-label">全局游戏管理</span>
              <span class="setting-desc">管理内嵌式与外联式游戏的增删与显示</span>
            </div>
            <svg class="arrow-icon" viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const router = useRouter()
const globalSound = ref(true)
const globalBgm = ref(true)
const damageDisplay = ref(true)

onMounted(async () => {
  await gameStore.initializeSettings()
  const s = gameStore.gameSettings
  if (s) {
    globalSound.value = s.globalSoundEnabled
    globalBgm.value = s.globalBgmEnabled
    damageDisplay.value = s.damageDisplayEnabled
  }
})

function goBack() { router.back() }
async function onGlobalSoundChange() { await gameStore.setGlobalSoundEnabled(globalSound.value) }
async function onGlobalBgmChange() { await gameStore.setGlobalBgmEnabled(globalBgm.value) }
async function onDamageDisplayChange() { await gameStore.setDamageDisplayEnabled(damageDisplay.value) }
</script>

<style lang="scss" scoped>
.game-settings-page { min-height: 100vh; padding: 0 0 120px; background: var(--page-backdrop-soft); }
.header { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height)); padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px; border-bottom: 1px solid var(--top-bar-border); background: var(--top-bar-surface); box-shadow: 0 20px 56px rgba(0,0,0,0.34); backdrop-filter: blur(28px) saturate(1.45); -webkit-backdrop-filter: blur(28px) saturate(1.45); overflow: hidden; }
.header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--top-bar-highlight); pointer-events: none; }
.back-btn { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border: none; border-radius: 7px; background: transparent; color: var(--text-primary); cursor: pointer; }
.back-icon { width: 22px; height: 22px; overflow: visible; }
.header-placeholder { width: 48px; height: 48px; flex-shrink: 0; }
.title { font-size: 20px; font-weight: 600; letter-spacing: 0.04em; color: var(--text-primary); }
.settings-content { width: min(960px, calc(100% - 32px)); margin: 18px auto 0; display: grid; gap: 16px; }
.setting-section { border: 1px solid var(--border-color); border-radius: 12px; background: var(--surface-gradient); box-shadow: var(--shadow-lg); overflow: hidden; }
.section-title { margin: 0; padding: 20px 20px 10px; font-size: 14px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
.setting-list { padding: 0 20px 12px; }
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); &:last-child { border-bottom: none; } &.clickable { cursor: pointer; } }
.setting-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.setting-label { font-size: 15px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }
.arrow-icon { flex-shrink: 0; color: var(--text-tertiary); }
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; input { opacity: 0; width: 0; height: 0; position: absolute; } .slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.12); border-radius: 12px; transition: background 0.25s; &::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform 0.25s; } } input:checked + .slider { background: var(--secondary-color, #34d399); } input:checked + .slider::before { transform: translateX(20px); } }
</style>
