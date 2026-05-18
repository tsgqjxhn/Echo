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
            <span class="ring-label">当前软件占用总空间</span>
          </div>
        </div>
        <p class="storage-hint">基于浏览器存储估算（localStorage + IndexedDB + Cache Storage）</p>
      </div>

      <div class="storage-breakdown">
        <div class="breakdown-header">存储分类</div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">角色数据</span>
            <span class="breakdown-desc">角色卡片、世界书等</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.characters) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">会话与消息</span>
            <span class="breakdown-desc">聊天记录</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.sessions) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">系统提示词</span>
            <span class="breakdown-desc">全局提示、系统预设</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.prompts) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">游戏数据</span>
            <span class="breakdown-desc">存档、进度</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.games) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">设置与配置</span>
            <span class="breakdown-desc">API配置、用户设置等</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.settings) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">缓存</span>
            <span class="breakdown-desc">图片、音频等临时文件</span>
          </div>
          <span class="breakdown-value">{{ formatSize(categorySize.cache) }}</span>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-info">
            <span class="breakdown-label">其他</span>
            <span class="breakdown-desc">未分类数据</span>
          </div>
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
const appSize = ref(0)
const categorySize = reactive({
  characters: 0,
  sessions: 0,
  settings: 0,
  prompts: 0,
  games: 0,
  cache: 0,
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

function classifyLocalStorageKey(key: string): keyof typeof categorySize {
  if (key.includes('character') || key.includes('Character') || key.includes('worldBook') || key.includes('world_book')) {
    return 'characters'
  }
  if (key.includes('session') || key.includes('chat') || key.includes('message') || key.includes('conversation')) {
    return 'sessions'
  }
  if (key.includes('prompt') || key.includes('system_prompt') || key.includes('global_prompt')) {
    return 'prompts'
  }
  if (key.includes('game') || key.includes('Game') || key.includes('save') || key.includes('progress')) {
    return 'games'
  }
  if (key.includes('setting') || key.includes('config') || key.includes('api') || key.includes('user')) {
    return 'settings'
  }
  if (key.includes('cache') || key.includes('temp') || key.includes('blob') || key.includes('audio') || key.includes('image')) {
    return 'cache'
  }
  return 'other'
}

async function estimateIndexedDBSize(): Promise<number> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return 0
  }
  try {
    const databases = await (window as any).indexedDB.databases?.() || []
    let total = 0
    for (const dbInfo of databases) {
      const dbName = dbInfo.name
      if (!dbName) continue
      const estimate = await new Promise<number>((resolve) => {
        const request = indexedDB.open(dbName)
        request.onsuccess = () => {
          const db = request.result
          const stores = Array.from(db.objectStoreNames)
          const promises = stores.map(storeName => {
            return new Promise<number>((res) => {
              try {
                const tx = db.transaction(storeName, 'readonly')
                const store = tx.objectStore(storeName)
                const cursorReq = store.openCursor()
                let storeSize = 0
                cursorReq.onsuccess = (e) => {
                  const cursor = (e.target as IDBRequest).result
                  if (cursor) {
                    const val = JSON.stringify(cursor.value)
                    storeSize += (cursor.key?.toString().length || 0) + val.length
                    cursor.continue()
                  } else {
                    res(storeSize)
                  }
                }
                cursorReq.onerror = () => res(0)
              } catch {
                res(0)
              }
            })
          })
          Promise.all(promises).then(sizes => {
            db.close()
            resolve(sizes.reduce((a, b) => a + b, 0))
          }).catch(() => {
            db.close()
            resolve(0)
          })
        }
        request.onerror = () => resolve(0)
      })
      total += estimate
    }
    return total
  } catch {
    return 0
  }
}

async function estimateCacheStorageSize(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return 0
  }
  try {
    const cacheNames = await caches.keys()
    let total = 0
    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      for (const req of requests) {
        const response = await cache.match(req)
        if (response) {
          const blob = await response.blob()
          total += blob.size
        }
      }
    }
    return total
  } catch {
    return 0
  }
}

async function estimateAppSize(): Promise<number> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate()
      if (estimate.usage) {
        return Number(estimate.usage)
      }
    }
  } catch (e) {
    console.warn('Failed to estimate app size:', e)
  }
  return 0
}

async function measureStorage() {
  let total = 0
  const sizes = {
    characters: 0,
    sessions: 0,
    settings: 0,
    prompts: 0,
    games: 0,
    cache: 0,
    other: 0,
  }

  // localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const val = localStorage.getItem(key) || ''
    const size = key.length + val.length
    const category = classifyLocalStorageKey(key)
    sizes[category] += size
    total += size
  }

  // IndexedDB（估算值归入 cache，因难以精确分类）
  const idbSize = await estimateIndexedDBSize()
  if (idbSize > 0) {
    sizes.cache += idbSize
    total += idbSize
  }

  // Cache Storage
  const cacheSize = await estimateCacheStorageSize()
  if (cacheSize > 0) {
    sizes.cache += cacheSize
    total += cacheSize
  }

  // 应用本体大小（通过 Storage API 估算）
  const appSizeEstimate = await estimateAppSize()
  appSize.value = appSizeEstimate

  totalUsed.value = total + appSizeEstimate
  categorySize.characters = sizes.characters
  categorySize.sessions = sizes.sessions
  categorySize.settings = sizes.settings
  categorySize.prompts = sizes.prompts
  categorySize.games = sizes.games
  categorySize.cache = sizes.cache
  categorySize.other = sizes.other
}

function formatSize(chars: number): string {
  const bytes = chars * 2 // UTF-16
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 格式化字节数（用于 appSize 等直接以字节为单位的值） */
function formatBytes(bytes: number): string {
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
  width: 40px; height: 40px; border: none; border-radius: 6px;
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
  border-radius: 6px; overflow: hidden; margin-bottom: 24px;
}

.breakdown-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.breakdown-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  &:last-child { border-bottom: none; }
}

.breakdown-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.breakdown-label { font-size: 14px; color: var(--text-primary); }
.breakdown-desc { font-size: 12px; color: var(--text-tertiary); }
.breakdown-value { font-size: 13px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }

.storage-actions { display: flex; gap: 12px; }

.action-btn {
  flex: 1; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary); font: inherit; font-size: 14px;
  cursor: pointer; transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
  &.danger { border-color: rgba(248, 113, 113, 0.2); color: rgba(248, 113, 113, 0.8);
    &:hover { background: rgba(248, 113, 113, 0.08); }
  }
}
</style>
