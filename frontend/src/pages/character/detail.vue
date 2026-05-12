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

      <h1 class="title">{{ displayCharacter?.name || '角色详情' }}</h1>

      <button class="more-btn" @click="showMoreMenu" aria-label="更多">
        <svg class="more-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="6" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <!-- 群聊成员头像栏 -->
    <div v-if="isGroupMode && character" class="member-avatars-bar">
      <div class="member-avatars-scroll">
        <div
          class="member-avatar-item"
          :class="{ active: selectedMemberId === '' }"
          @click="selectGroup"
        >
          <div class="member-avatar group-settings-avatar">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <span class="member-avatar-name">群聊设置</span>
        </div>
        <div
          v-for="member in groupMembers"
          :key="member.id"
          class="member-avatar-item"
          :class="{ active: selectedMemberId === member.id }"
          @click="selectMember(member.id)"
        >
          <img
            :src="member.avatar || defaultAvatar"
            :alt="member.name"
            class="member-avatar"
          />
          <span class="member-avatar-name">{{ member.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="displayCharacter" class="character-info">
      <div class="avatar-section">
        <img
          :src="displayCharacter.avatar || defaultAvatar"
          :alt="displayCharacter.name"
          class="avatar"
        />
        <div
          v-if="
            displayCharacter.chatBackground ||
            displayCharacter.globalBackground ||
            displayCharacter.switchAnimation ||
            (displayCharacter.emotionAnimations && displayCharacter.emotionAnimations.length)
          "
          class="media-tags"
        >
          <span v-if="displayCharacter.chatBackground" class="media-tag">🖼️ 聊天背景</span>
          <span v-if="displayCharacter.globalBackground" class="media-tag">🌐 全局背景</span>
          <span v-if="displayCharacter.switchAnimation" class="media-tag">🎬 切换动图</span>
          <span
            v-if="displayCharacter.emotionAnimations && displayCharacter.emotionAnimations.length"
            class="media-tag"
          >
            😊 情感动图 {{ displayCharacter.emotionAnimations.length }}个
          </span>
        </div>
      </div>

      <div class="info-section">
        <div class="info-item">
          <label>名称</label>
          <p>{{ displayCharacter.name }}</p>
        </div>
        <div class="info-item">
          <label>背景</label>
          <p>{{ displayCharacter.background || '无' }}</p>
        </div>
        <div class="info-item">
          <label>描述</label>
          <p>{{ displayCharacter.description }}</p>
        </div>
        <div class="info-item">
          <label>开场白</label>
          <p>{{ displayCharacter.greeting || '无' }}</p>
        </div>
        <div class="info-item">
          <label>整体设定</label>
          <p class="settings-text">{{ displayCharacter.settings }}</p>
        </div>

        <!-- 群聊专属信息 -->
        <div v-if="isGroupMode && selectedMemberId === '' && character" class="info-item">
          <label>群聊公告</label>
          <p class="settings-text">{{ character.groupAnnouncement || '无' }}</p>
        </div>
        <div v-if="isGroupMode && selectedMemberId === '' && character" class="info-item">
          <label>群聊描述</label>
          <p class="settings-text">{{ character.groupDescription || '无' }}</p>
        </div>
        <div v-if="isGroupMode && selectedMemberId === '' && character" class="info-item">
          <label>发言模式</label>
          <p>{{ character.groupChatMode === 'queue' ? '排队' : '自由' }}</p>
        </div>

        <!-- 媒体设定预览 -->
        <div
          v-if="
            displayCharacter.chatBackground ||
            displayCharacter.globalBackground ||
            displayCharacter.switchAnimation ||
            (displayCharacter.emotionAnimations && displayCharacter.emotionAnimations.length)
          "
          class="info-item media-preview-section"
        >
          <label>媒体设定</label>
          <div class="media-grid">
            <div v-if="displayCharacter.chatBackground" class="media-card">
              <span class="media-label">聊天背景</span>
              <img
                :src="displayCharacter.chatBackground"
                alt="聊天背景"
                class="media-thumb"
              />
            </div>
            <div v-if="displayCharacter.globalBackground" class="media-card">
              <span class="media-label">全局背景</span>
              <img
                :src="displayCharacter.globalBackground"
                alt="全局背景"
                class="media-thumb"
              />
            </div>
            <div v-if="displayCharacter.switchAnimation" class="media-card">
              <span class="media-label">切换动图</span>
              <img
                :src="displayCharacter.switchAnimation"
                alt="切换动图"
                class="media-thumb"
              />
            </div>
            <div
              v-for="(ea, idx) in displayCharacter.emotionAnimations"
              :key="idx"
              class="media-card"
            >
              <span class="media-label">{{ ea.emotion || '情感' }} 动图</span>
              <img :src="ea.animationUrl" :alt="ea.emotion" class="media-thumb" />
            </div>
          </div>
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
import { exportService } from '@/services/export'
import defaultAvatarAsset from '@/static/images/user-avatar.svg'
import type { ICharacter } from '@/types/character'

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const character = ref<ICharacter | null>(null)
const loading = ref(false)
const defaultAvatar = defaultAvatarAsset
const groupMembers = ref<ICharacter[]>([])
const selectedMemberId = ref('')

const characterId = computed(() => route.params.id as string)

const isGroupMode = computed(() => {
  return character.value?.mode === 'group-chat' || character.value?.mode === 'group-challenge'
})

const displayCharacter = computed(() => {
  if (!selectedMemberId.value || !character.value) return character.value
  return groupMembers.value.find((m) => m.id === selectedMemberId.value) || character.value
})

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
      return
    }
    if (character.value.memberIds?.length) {
      await loadGroupMembers(character.value.memberIds)
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadGroupMembers(memberIds: string[]) {
  const members: ICharacter[] = []
  for (const mid of memberIds) {
    try {
      const m = await characterStore.getCharacterById(mid)
      if (m) members.push(m)
    } catch {
      // 忽略找不到的成员
    }
  }
  groupMembers.value = members
}

function selectGroup() {
  selectedMemberId.value = ''
}

function selectMember(id: string) {
  selectedMemberId.value = id
}

function goBack() {
  router.back()
}

function showMoreMenu() {
  uni.showActionSheet({
    itemList: ['编辑', '克隆', '删除', '导出'],
    itemColor: '#38bdf8',
    success: (res: { tapIndex: number }) => {
      switch (res.tapIndex) {
        case 0:
          goToEdit()
          break
        case 1:
          cloneCharacter()
          break
        case 2:
          confirmDelete()
          break
        case 3:
          exportCharacter()
          break
      }
    },
  })
}

async function cloneCharacter() {
  if (!character.value) return
  uni.showModal({
    title: '克隆角色',
    content: `确定要克隆「${character.value.name}」吗？`,
    success: async (res: { confirm: boolean }) => {
      if (res.confirm) {
        try {
          const newId = await characterStore.cloneCharacter(character.value!.id)
          uni.showToast({ title: '克隆成功', icon: 'success' })
          setTimeout(() => {
            router.push(`/character/edit?id=${newId}`)
          }, 800)
        } catch {
          uni.showToast({ title: '克隆失败', icon: 'none' })
        }
      }
    },
  })
}

function goToEdit() {
  router.push(`/character/edit?id=${characterId.value}`)
}

async function exportCharacter() {
  if (!character.value) return
  try {
    uni.showToast({ title: '导出中…', icon: 'loading' })
    const task = await exportService.exportCharacter(character.value.id)
    await exportService.downloadTask(task)
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
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

.media-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  justify-content: center;
}

.media-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
  font-size: 12px;
  font-weight: 500;
}

.media-preview-section {
  .media-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 8px;
  }

  .media-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .media-label {
    font-size: 11px;
    color: var(--text-tertiary);
    letter-spacing: 0.04em;
  }

  .media-thumb {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
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
.more-btn {
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

.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0;
}

.more-icon {
  width: 20px;
  height: 20px;
}

.title {
  min-width: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  text-align: center;
}

/* ── 群聊成员头像栏 ── */
.member-avatars-bar {
  width: min(1200px, calc(100% - 32px));
  margin: 12px auto 0;
  padding: 12px 16px;
  border-radius: 20px;
  background: var(--surface-gradient);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.member-avatars-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.member-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform var(--transition-base);

  &:active {
    transform: scale(0.92);
  }

  &.active {
    .member-avatar {
      box-shadow: 0 0 0 2px var(--primary-color), 0 0 0 4px rgba(56, 189, 248, 0.2);
    }

    .member-avatar-name {
      color: var(--primary-color);
      font-weight: 600;
    }
  }
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  transition: box-shadow var(--transition-base);
}

.group-settings-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-tertiary);
}

.member-avatar-name {
  font-size: 11px;
  color: var(--text-tertiary);
  max-width: 56px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-base);
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
  transition: transform var(--transition-base), box-shadow var(--transition-base),
    border-color var(--transition-base);
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

  .member-avatars-bar {
    width: calc(100% - 20px);
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 16px;
  }
}
</style>
