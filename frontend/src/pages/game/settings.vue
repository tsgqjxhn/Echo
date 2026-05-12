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
        <h2 class="section-title">消息推送</h2>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info"><span class="setting-label">游戏消息推送</span><span class="setting-desc">接收游戏相关通知</span></div>
            <label class="toggle"><input v-model="notificationsEnabled" type="checkbox" @change="onNotificationsChange" /><span class="slider" /></label>
          </div>
          <div class="notification-types" :class="{ disabled: !notificationsEnabled }">
            <div class="setting-item sub-item">
              <div class="setting-info"><span class="setting-label">体力已满</span><span class="setting-desc tag-soon">即将上线</span></div>
              <label class="toggle"><input type="checkbox" disabled /><span class="slider" /></label>
            </div>
          </div>
        </div>
      </div>
      <div class="setting-section">
        <h2 class="section-title">数据管理</h2>
        <div class="setting-list">
          <div class="setting-item clickable" @click="showExportPicker = true">
            <div class="setting-info"><span class="setting-label">导出游戏数据</span><span class="setting-desc">将游戏存档导出为 JSON 文件</span></div>
            <svg class="arrow-icon" viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="setting-item clickable" @click="triggerImport">
            <div class="setting-info"><span class="setting-label">导入游戏数据</span><span class="setting-desc">从 JSON 文件恢复游戏存档</span></div>
            <svg class="arrow-icon" viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showExportPicker" class="picker-mask" @click="showExportPicker = false">
      <div class="picker-sheet" @click.stop>
        <div class="picker-header"><span class="picker-title">选择要导出的游戏</span><button class="picker-close" @click="showExportPicker = false">取消</button></div>
        <div class="picker-list">
          <button v-for="game in exportableGames" :key="game.id" class="picker-item" :disabled="exporting" @click="doExport(game.id)"><span>{{ game.name }}</span></button>
        </div>
      </div>
    </div>
    <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="onFileSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import type { GameExportData } from '@/types/game'

const gameStore = useGameStore()
const router = useRouter()
const globalSound = ref(true)
const globalBgm = ref(true)
const damageDisplay = ref(true)
const notificationsEnabled = ref(true)
const showExportPicker = ref(false)
const exporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const exportableGames = [
  { id: 'hero', name: '勇士' },
  { id: 'xiuxian', name: '问道长生' },
  { id: 'dark-dorm', name: '暗黑宿舍' },
  { id: 'empire', name: '圣王国' },
  { id: 'survivor-defense', name: '幸存者防线' },
]
onMounted(async () => {
  await gameStore.initializeSettings()
  const s = gameStore.gameSettings
  if (s) {
    globalSound.value = s.globalSoundEnabled
    globalBgm.value = s.globalBgmEnabled
    damageDisplay.value = s.damageDisplayEnabled
    notificationsEnabled.value = s.gameNotificationsEnabled
  }
})
function goBack() { router.back() }
async function onGlobalSoundChange() { await gameStore.setGlobalSoundEnabled(globalSound.value) }
async function onGlobalBgmChange() { await gameStore.setGlobalBgmEnabled(globalBgm.value) }
async function onDamageDisplayChange() { await gameStore.setDamageDisplayEnabled(damageDisplay.value) }
async function onNotificationsChange() { await gameStore.setGameNotificationsEnabled(notificationsEnabled.value) }
async function doExport(gameId: string) {
  showExportPicker.value = false; exporting.value = true
  try {
    const data = await gameStore.exportGameData(gameId)
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'echo-game-' + gameId + '-' + Date.now() + '.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (err: any) { uni.showToast({ title: err?.message || '导出失败', icon: 'none' }) }
  finally { exporting.value = false }
}
function triggerImport() { fileInputRef.value?.click() }
function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; input.value = ''
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result as string) as Partial<GameExportData>
      if (!parsed.gameId || !parsed.saveData || !parsed.version) { uni.showToast({ title: '文件格式无效', icon: 'none' }); return }
      const data = parsed as GameExportData
      const confirmed = await new Promise<boolean>((resolve) => { uni.showModal({ title: '确认导入', content: '将覆盖「' + data.gameId + '」的游戏存档，是否继续？', success: (res) => resolve(!!res.confirm) }) })
      if (!confirmed) return
      await gameStore.importGameData(data.gameId, data); uni.showToast({ title: '导入成功', icon: 'success' })
    } catch (err: any) { uni.showToast({ title: err?.message || '导入失败', icon: 'none' }) }
  }
  reader.readAsText(file)
}
</script>

<style lang="scss" scoped>
.game-settings-page { min-height: 100vh; padding: 0 0 120px; background: var(--page-backdrop-soft); }
.header { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height)); padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px; border-bottom: 1px solid var(--top-bar-border); background: var(--top-bar-surface); box-shadow: 0 20px 56px rgba(0,0,0,0.34); backdrop-filter: blur(28px) saturate(1.45); -webkit-backdrop-filter: blur(28px) saturate(1.45); overflow: hidden; }
.header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--top-bar-highlight); pointer-events: none; }
.back-btn { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border: none; border-radius: 14px; background: transparent; color: var(--text-primary); cursor: pointer; box-shadow: none; transition: opacity var(--transition-base), transform var(--transition-base); &:hover { opacity: 0.78; } &:active { transform: scale(0.95); } }
.back-icon { width: 22px; height: 22px; overflow: visible; }
.header-placeholder { width: 48px; height: 48px; flex-shrink: 0; }
.title { font-size: 20px; font-weight: 600; letter-spacing: 0.04em; color: var(--text-primary); }
.settings-content { width: min(960px, calc(100% - 32px)); margin: 18px auto 0; display: grid; gap: 16px; }
.setting-section { border: 1px solid var(--border-color); border-radius: 24px; background: var(--surface-gradient); box-shadow: var(--shadow-lg); overflow: hidden; backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2); -webkit-backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2); }
.section-title { margin: 0; padding: 20px 20px 10px; font-size: 14px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
.setting-list { padding: 0 20px 12px; }
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); &:last-child { border-bottom: none; } &.clickable { cursor: pointer; transition: background var(--transition-base); &:hover { background: rgba(255,255,255,0.03); } &:active { background: rgba(255,255,255,0.06); } } }
.sub-item { padding-left: 12px; }
.setting-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.setting-label { font-size: 15px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }
.tag-soon { color: rgba(125,211,252,0.6); font-size: 11px; }
.arrow-icon { flex-shrink: 0; color: var(--text-tertiary); }
.notification-types { transition: opacity var(--transition-base); &.disabled { opacity: 0.45; pointer-events: none; } }
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; input { opacity: 0; width: 0; height: 0; position: absolute; } .slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.12); border-radius: 24px; transition: background 0.25s; &::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform 0.25s; } } input:checked + .slider { background: var(--secondary-color, #34d399); } input:checked + .slider::before { transform: translateX(20px); } input:disabled + .slider { opacity: 0.4; cursor: not-allowed; } }
.picker-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.picker-sheet { width: 100%; max-width: 480px; border-radius: 20px 20px 0 0; background: rgba(15,23,42,0.96); box-shadow: 0 -12px 40px rgba(0,0,0,0.35); overflow: hidden; }
.picker-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.picker-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.picker-close { border: none; background: transparent; color: var(--text-secondary); font-size: 14px; cursor: pointer; }
.picker-list { padding: 8px 0 24px; }
.picker-item { display: block; width: 100%; padding: 14px 20px; border: none; background: transparent; color: var(--text-primary); font-size: 15px; text-align: left; cursor: pointer; transition: background var(--transition-base); &:hover { background: rgba(255,255,255,0.06); } &:active { background: rgba(255,255,255,0.1); } &:disabled { opacity: 0.5; cursor: not-allowed; } }
@media (max-width: 720px) { .game-settings-page { padding: 0 0 118px; } .header { padding-left: 16px; padding-right: 16px; } .settings-content { width: calc(100% - 20px); } .setting-list { padding: 0 16px 10px; } }
</style>
