<template>
  <div class="settings-sub-page">
    <div class="sub-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="sub-title">存储管理</h1>
    </div>

    <div class="storage-content">
      <div class="storage-overview">
        <div class="storage-ring">
          <svg viewBox="0 0 100 100" class="ring-svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
            <circle cx="50" cy="50" r="40" fill="none" :stroke="ringColor" stroke-width="8"
              stroke-dasharray="251.2" :stroke-dashoffset="251.2 - (251.2 * usedPercent / 100)"
              stroke-linecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <div class="ring-text">
            <span class="ring-value">{{ formatSize(totalUsed) }}</span>
            <span class="ring-label">已使用</span>
          </div>
        </div>
        <p class="storage-hint">本地存储估算（基于 localStorage）</p>
      </div>

      <div class="storage-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">角色数据</span>
          <span class="breakdown-value">{{ formatSize(categorySize.characters) }}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">会话/消息</span>
          <span class="breakdown-value">{{ formatSize(categorySize.sessions) }}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">设置/配置</span>
          <span class="breakdown-value">{{ formatSize(categorySize.settings) }}</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">其他缓存</span>
          <span class="breakdown-value">{{ formatSize(categorySize.other) }}</span>
        </div>
      </div>

      <div class="storage-actions">
        <button type="button" class="action-btn" @click="clearCache">
          清除缓存
        </button>
        <button type="button" class="action-btn danger" @click="clearAllData">
          清空所有数据
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()
const userStore = useUserStore()

const totalUsed = ref(0)
const categorySize = reactive({
  characters: 0,
  sessions: 0,
  settings: 0,
  other: 0,
})

const usedPercent = computed(() => {
  const max = 5 * 1024 * 1024 // 5MB typical localStorage limit
  return Math.min(100, (totalUsed.value / max) * 100)
})

const ringColor = computed(() => {
  if (usedPercent.value > 80) return '#f87171'
  if (usedPercent.value > 50) return '#fbbf24'
  return 'rgba(56, 189, 248, 0.6)'
})

function measureStorage() {
  let total = 0
  let characters = 0
  let sessions = 0
  let settings = 0
  let other = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const val = localStorage.getItem(key) || ''
    const size = key.length + val.length

    if (key.includes('character') || key.includes('Character')) characters += size
    else if (key.includes('session') || key.includes('chat') || key.includes('message')) sessions += size
    else if (key.includes('setting') || key.includes('config') || key.includes('prompt') || key.includes('api')) settings += size
    else other += size

    total += size
  }

  totalUsed.value = total
  categorySize.characters = characters
  categorySize.sessions = sessions
  categorySize.settings = settings
  categorySize.other = other
}

function formatSize(chars: number): string {
  const bytes = chars * 2 // UTF-16
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function clearCache() {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.includes('cache') || key.includes('temp'))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
  measureStorage()
  uni.showToast({ title: '缓存已清除', icon: 'success' })
}

function clearAllData() {
  uni.showModal({
    title: '确认清空所有数据',
    content: '这将删除所有本地数据且无法恢复。确定继续？',
    success: async (result) => {
      if (!result.confirm) return
      await userStore.clearAllData()
      window.location.reload()
    },
  })
}

onMounted(measureStorage)
</script>

<style lang="scss" scoped>
.settings-sub-page { min-height: 100vh; background: var(--page-backdrop-soft); }

.sub-header {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
}

.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; border-radius: 12px;
  background: transparent; color: var(--text-primary); cursor: pointer;
}

.sub-title { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary); }

.storage-content { padding: 24px 16px; }

.storage-overview {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  margin-bottom: 24px;
}

.storage-ring {
  position: relative; width: 140px; height: 140px;
  display: flex; align-items: center; justify-content: center;
}

.ring-svg { width: 100%; height: 100%; position: absolute; inset: 0; }

.ring-text {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  z-index: 1;
}

.ring-value { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.ring-label { font-size: 11px; color: var(--text-tertiary); }

.storage-hint { font-size: 12px; color: var(--text-tertiary); text-align: center; }

.storage-breakdown {
  display: flex; flex-direction: column; gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; overflow: hidden; margin-bottom: 24px;
}

.breakdown-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  &:last-child { border-bottom: none; }
}

.breakdown-label { font-size: 14px; color: var(--text-primary); }
.breakdown-value { font-size: 13px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }

.storage-actions { display: flex; gap: 12px; }

.action-btn {
  flex: 1; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary); font: inherit; font-size: 14px;
  cursor: pointer; transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.danger { border-color: rgba(248, 113, 113, 0.2); color: rgba(248, 113, 113, 0.8);
    &:hover { background: rgba(248, 113, 113, 0.08); }
  }
}
</style>
