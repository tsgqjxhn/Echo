<template>
  <div class="character-detail-page">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">
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

      <h1 class="title">{{ character?.name || '角色详情' }}</h1>

      <div class="header-actions">
        <button class="action-btn" @click="goToEdit">编辑</button>
      </div>
    </div>

    <div v-if="character" class="character-info">
      <div class="avatar-section">
        <img :src="character.avatar || defaultAvatar" :alt="character.name" class="avatar" />
      </div>

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
          <label>整体设定</label>
          <p class="settings-text">{{ character.settings }}</p>
        </div>
      </div>

      <div class="action-section">
        <button class="primary-btn" @click="goToChat">开始聊天</button>
        <button class="danger-btn" @click="confirmDelete">删除角色</button>
      </div>
    </div>

    <div v-else-if="loading" class="loading">加载中...</div>
    <div v-else class="empty">角色不存在</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
  } catch {
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

function confirmDelete() {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个角色吗？删除后无法恢复。',
    success: async (res: { confirm: boolean }) => {
      if (res.confirm) {
        await deleteCharacter()
      }
    },
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
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.character-detail-page {
  min-height: 100vh;
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: calc(env(safe-area-inset-top, 0px) + 44px);
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.back-btn,
.action-btn {
  min-height: 34px;
  padding: 0 6px;
  border: none;
  border-radius: 10px;
  background: transparent;
  box-shadow: none;
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);

  &:hover {
    opacity: 0.78;
  }

  &:active {
    transform: scale(0.95);
  }
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0;
}

.back-icon {
  width: 15px;
  height: 15px;
  overflow: visible;
}

.title {
  min-width: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  text-align: center;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.character-info {
  width: min(1200px, calc(100% - 32px));
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
  position: sticky;
  top: 108px;
  min-height: 320px;
  padding: 32px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hero-gradient);
}

.avatar {
  width: 180px;
  height: 180px;
  border: 1px solid var(--border-light);
  border-radius: 50%;
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
  width: min(1200px, calc(100% - 32px));
  margin: 18px auto 0;
  min-height: 280px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
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

@media (max-width: 720px) {
  .header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .character-info,
  .loading,
  .empty {
    width: calc(100% - 20px);
  }
}
</style>
