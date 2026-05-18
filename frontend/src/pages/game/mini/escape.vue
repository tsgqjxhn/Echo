<template>
  <div class="story-empty-page">
    <header class="page-header">
      <button type="button" class="header-btn" aria-label="返回" @click="goBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.5 5.5L8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
          />
        </svg>
      </button>

      <div class="header-copy">
        <span class="page-kicker">故事入口</span>
        <h1 class="page-title">新故事</h1>
      </div>

      <button type="button" class="header-btn action-btn" @click="clearLegacyStoryCache">
        清空缓存
      </button>
    </header>

    <section class="empty-card">
      <span class="empty-tag">旧内容已移除</span>
      <h2>当前没有世界观、角色设定、章节数据或故事图片</h2>
      <p>
        旧的剧情文件、图片素材和运行状态已经清理。这里暂时保留为空白入口，后续可以直接接入新的故事内容。
      </p>

      <div class="empty-actions">
        <button type="button" class="primary-btn" @click="clearLegacyStoryCache">
          再次清空旧缓存
        </button>
        <button type="button" class="secondary-btn" @click="goBack">
          返回游戏中心
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const LEGACY_STORY_KEY = 'xiang_story_state'

function clearLegacyStoryCache() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }

  window.localStorage.removeItem(LEGACY_STORY_KEY)
}

function goBack() {
  router.push('/game/panel')
}

onMounted(() => {
  clearLegacyStoryCache()
})
</script>

<style lang="scss" scoped>
.story-empty-page {
  min-height: 100vh;
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-primary);
  box-shadow: none;
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.header-btn:hover {
  opacity: 0.78;
}

.header-btn:active {
  transform: scale(0.95);
}

.back-icon {
  width: 18px;
  height: 18px;
  overflow: visible;
}

.header-copy {
  min-width: 0;
  text-align: center;
}

.page-kicker {
  display: block;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-title {
  margin: 4px 0 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.action-btn {
  justify-self: end;
}

.empty-card {
  width: min(960px, calc(100% - 32px));
  margin: 18px auto 0;
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 15px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.empty-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);
  font-size: 12px;
}

.empty-card h2 {
  margin-top: 18px;
  color: var(--text-primary);
  font-size: 28px;
}

.empty-card p {
  margin-top: 12px;
  max-width: 720px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.primary-btn,
.secondary-btn {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, rgba(245, 245, 242, 0.96), rgba(225, 225, 220, 0.88));
  color: #08090a;
  font-weight: 600;
}

.secondary-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

@media (max-width: 720px) {
  .page-header {
    padding-left: 16px;
    padding-right: 16px;
  }

  .empty-card {
    width: calc(100% - 20px);
    padding: 22px;
  }

  .empty-card h2 {
    font-size: 24px;
  }

  .empty-actions {
    flex-direction: column;
  }
}
</style>
