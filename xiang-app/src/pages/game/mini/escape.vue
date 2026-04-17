<template>
  <div class="story-empty-page">
    <header class="page-header">
      <button type="button" class="header-btn" @click="goBack">返回</button>
      <div class="header-copy">
        <span class="page-kicker">故事预留页</span>
        <h1 class="page-title">新故事</h1>
      </div>
      <button type="button" class="header-btn" @click="clearLegacyStoryCache">清空缓存</button>
    </header>

    <section class="empty-card">
      <span class="empty-tag">已删除旧内容</span>
      <h2>当前没有世界观、角色设定、章节数据或故事图片</h2>
      <p>
        旧的第一部、九部故事设定、图片素材和对应状态文件已经移除。这个页面现在只保留一个空白入口，方便你后续直接接新的故事。
      </p>

      <div class="empty-actions">
        <button type="button" class="primary-btn" @click="clearLegacyStoryCache">再次清空旧故事缓存</button>
        <button type="button" class="secondary-btn" @click="goBack">返回游戏中心</button>
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
  padding: 24px 24px 120px;
  background: var(--page-backdrop-soft);
}

.page-header,
.empty-card {
  width: min(960px, 100%);
  margin: 0 auto;
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-radius: 28px;
}

.header-btn,
.primary-btn,
.secondary-btn {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  cursor: pointer;
}

.header-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.header-copy {
  text-align: center;
}

.page-kicker,
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

.page-title {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 24px;
}

.empty-card {
  margin-top: 18px;
  padding: 28px;
  border-radius: 30px;
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
  .story-empty-page {
    padding: 16px 16px 118px;
  }

  .page-header {
    flex-direction: column;
    border-radius: 24px;
  }

  .empty-card {
    padding: 22px;
    border-radius: 24px;
  }

  .empty-card h2 {
    font-size: 24px;
  }

  .empty-actions {
    flex-direction: column;
  }
}
</style>
