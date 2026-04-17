<template>
  <div class="character-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="title">{{ character?.name || '角色详情' }}</h1>
      <div class="header-actions">
        <button class="action-btn" @click="toggleFavorite">
          {{ character?.isFavorite ? '⭐' : '☆' }}
        </button>
        <button class="action-btn" @click="goToEdit">编辑</button>
      </div>
    </div>

    <!-- 角色信息 -->
    <div v-if="character" class="character-info">
      <!-- 头像 -->
      <div class="avatar-section">
        <img :src="character.avatar || defaultAvatar" :alt="character.name" class="avatar" />
      </div>

      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-item">
          <label>名称</label>
          <p>{{ character.name }}</p>
        </div>
        <div class="info-item">
          <label>背景</label>
          <p>{{ character.background || '无' }}</p>
        </div>
        <div class="info-item">
          <label>描述</label>
          <p>{{ character.description }}</p>
        </div>
        <div class="info-item">
          <label>开场白</label>
          <p>{{ character.greeting || '无' }}</p>
        </div>
        <div class="info-item">
          <label>总体设定</label>
          <p class="settings-text">{{ character.settings }}</p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button class="primary-btn" @click="goToChat">开始聊天</button>
        <button class="danger-btn" @click="confirmDelete">删除角色</button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="loading">加载中...</div>

    <!-- 空状态 -->
    <div v-else class="empty">角色不存在</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { uni } from '@/utils/uni-polyfill'
import { ECHO_STORY_CHARACTER_ID } from '@/services/story-conversations'

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const character = ref<any>(null)
const loading = ref(false)
const defaultAvatar = '/src/static/images/default-avatar.svg'

const characterId = computed(() => route.params.id as string)

onMounted(async () => {
  if (characterId.value) {
    await loadCharacter(characterId.value)
  }
})

async function loadCharacter(id: string) {
  loading.value = true
  try {
    character.value = await characterStore.getCharacterById(id)
    if (!character.value) {
      uni.showToast({ title: '角色不存在', icon: 'none' })
      setTimeout(() => {
        router.back()
      }, 1500)
    }
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function goToEdit() {
  router.push(`/character/edit?id=${characterId.value}`)
}

function goToChat() {
  if (character.value?.sourceType === 'builtin-story' || characterId.value === ECHO_STORY_CHARACTER_ID) {
    router.push('/dialogue')
    return
  }

  router.push(`/chat/${characterId.value}`)
}

async function toggleFavorite() {
  if (!character.value) return
  try {
    await characterStore.toggleFavorite(character.value.id)
    character.value.isFavorite = !character.value.isFavorite
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function confirmDelete() {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个角色吗？删除后无法恢复。',
    success: async (res: { confirm: boolean }) => {
      if (res.confirm) {
        await deleteCharacter()
      }
    }
  })
}

async function deleteCharacter() {
  if (!character.value) return
  try {
    await characterStore.deleteCharacter(character.value.id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    setTimeout(() => {
      goBack()
    }, 1500)
  } catch (error) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.character-detail-page {
  min-height: 100vh;
  padding: 24px 24px 120px;
  background: var(--page-backdrop-soft);
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  position: sticky;
  top: 24px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(34, 38, 43, 0.8), rgba(8, 9, 10, 0.92));
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.back-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--ghost-gradient);
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--ghost-gradient);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.character-info {
  max-width: 1200px;
  margin: 18px auto 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.avatar-section,
.info-item,
.action-section,
.loading,
.empty {
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.avatar-section {
  min-height: 320px;
  padding: 32px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 108px;
  background: var(--hero-gradient);
}

.avatar {
  width: 180px;
  height: 180px;
  border: 1px solid var(--border-light);
  border-radius: 40px;
  object-fit: cover;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow: var(--shadow-xl);
}

.info-section {
  display: grid;
  gap: 16px;
}

.info-item {
  margin: 0;
  padding: 20px 22px;
  border-radius: 24px;
}

.info-item label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.info-item p {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.8;
}

.settings-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.action-section {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  border-radius: 28px;
}

.primary-btn,
.danger-btn {
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border-radius: 18px;
  font-size: 16px;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
}

.primary-btn {
  border: none;
  background: var(--interactive-gradient);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 20px 44px rgba(113, 129, 146, 0.24);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 56px rgba(113, 129, 146, 0.3);
  }
}

.danger-btn {
  border: 1px solid var(--danger-border);
  background: var(--danger-soft);
  color: #ff9d9d;

  &:hover {
    transform: translateY(-1px);
  }
}

.loading,
.empty {
  max-width: 1200px;
  margin: 18px auto 0;
  min-height: 280px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .character-detail-page {
    padding: 16px 16px 118px;
  }

  .header {
    top: 16px;
  }

  .character-info {
    grid-template-columns: 1fr;
  }

  .avatar-section {
    position: static;
    min-height: 260px;
  }

  .action-section {
    grid-template-columns: 1fr;
  }
}
</style>
