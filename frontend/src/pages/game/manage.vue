<template>
  <div class="game-manage-page">
    <header class="header">
      <button class="back-btn" type="button" aria-label="返回" @click="router.back()">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="title">全局游戏管理</h1>
      <button class="create-btn" type="button" aria-label="创建游戏" @click="showActionModal = true">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <div class="manage-tabs">
      <button type="button" class="manage-tab" :class="{ active: activeKind === 'embedded' }" @click="activeKind = 'embedded'">内嵌游戏</button>
      <button type="button" class="manage-tab" :class="{ active: activeKind === 'external' }" @click="activeKind = 'external'">外联游戏</button>
    </div>

    <p class="manage-hint">
      {{ activeKind === 'embedded' ? '轻量小游戏（五子棋、消消乐等），适合剧情节点内嵌触发。' : '复杂机制游戏（塔防、养成等），通常由玩家主动进入。' }}
    </p>

    <div class="manage-toolbar">
      <button type="button" class="danger-btn danger-btn--block" @click="confirmDeleteAll">删除全部游戏</button>
    </div>

    <div class="manage-list">
      <div v-for="game in visibleGames" :key="game.id" class="manage-item">
        <div class="manage-item-main">
          <span class="manage-icon">{{ game.icon }}</span>
          <div class="manage-copy">
            <span class="manage-name">{{ game.name }}</span>
            <span class="manage-desc">{{ game.description }}</span>
            <span v-if="isManagedGameHidden(game.id)" class="manage-tag">已从游戏中心隐藏</span>
          </div>
        </div>
        <div class="manage-actions">
          <button type="button" class="ghost-btn" @click="router.push(game.route)">打开</button>
          <button type="button" class="danger-btn" @click="confirmDelete(game)">删除</button>
        </div>
      </div>
      <p v-if="visibleGames.length === 0" class="empty-copy">当前分类暂无游戏。</p>
    </div>

    <Teleport to="body">
      <div v-if="showActionModal" class="action-modal-overlay" @click.self="showActionModal = false">
        <section class="action-modal-card">
          <div class="action-modal-head">
            <h3>游戏操作</h3>
            <button type="button" class="modal-close-btn" aria-label="关闭" @click="showActionModal = false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
            </button>
          </div>
          <div class="action-modal-options">
            <button type="button" class="action-option" @click="openGameCreateAction('create')">
              <span class="action-option-icon">✨</span>
              <span>创建游戏</span>
            </button>
            <button type="button" class="action-option" @click="openGameCreateAction('import')">
              <span class="action-option-icon">📦</span>
              <span>导入游戏</span>
            </button>
            <button type="button" class="action-option" @click="openGameHistory">
              <span class="action-option-icon">🕘</span>
              <span>查看历史记录</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { uni } from '@/utils/uni-polyfill'
import {
  deleteAllManagedGames,
  deleteManagedGame,
  isManagedGameHidden,
  listManagedGamesByKind,
  type ManagedGameEntry,
  type ManagedGameKind,
} from '@/services/global-game-registry'

const router = useRouter()
const activeKind = ref<ManagedGameKind>('embedded')
const catalogTick = ref(0)
const showActionModal = ref(false)

const visibleGames = computed(() => {
  catalogTick.value
  return listManagedGamesByKind(activeKind.value, true)
})

function refreshCatalog() {
  catalogTick.value += 1
}

function openGameCreateAction(mode: 'create' | 'import') {
  showActionModal.value = false
  router.push(`/game/generate?mode=${mode}`)
}

function openGameHistory() {
  showActionModal.value = false
  router.push('/game/generate?history=1')
}

function confirmDelete(game: ManagedGameEntry) {
  uni.showModal({
    title: '删除游戏',
    content: game.generated
      ? `确定从库中删除「${game.name}」？此操作不可恢复。`
      : `确定从游戏中心移除「${game.name}」？内置资源不会被物理删除，可随时在管理页恢复显示。`,
    success: (res: { confirm: boolean }) => {
      if (!res.confirm) return
      deleteManagedGame(game.id)
      refreshCatalog()
      uni.showToast({ title: '已删除', icon: 'success' })
    },
  })
}

function confirmDeleteAll() {
  uni.showModal({
    title: '删除全部游戏',
    content: '将清空 AI 游戏库，并从游戏中心移除所有内置与外联游戏。是否继续？',
    success: (res: { confirm: boolean }) => {
      if (!res.confirm) return
      const result = deleteAllManagedGames()
      refreshCatalog()
      uni.showToast({
        title: `已删除 ${result.removedGenerated + result.hiddenBuiltin} 项`,
        icon: 'success',
      })
    },
  })
}

</script>

<style scoped lang="scss">
.game-manage-page {
  min-height: 100vh;
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
}

.back-btn,
.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.back-icon,
.create-btn svg { width: 22px; height: 22px; }
.title { font-size: 20px; font-weight: 600; color: var(--text-primary); }

.manage-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px 18px 0;
}

.manage-tab {
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;

  &.active {
    color: var(--text-primary);
    border-color: rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.12);
  }
}

.manage-hint {
  margin: 12px 18px 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.manage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}

.manage-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.manage-item-main {
  display: flex;
  gap: 12px;
}

.manage-icon { font-size: 28px; }
.manage-copy { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.manage-name { font-size: 16px; font-weight: 600; }
.manage-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }
.manage-tag { font-size: 11px; color: #fbbf24; }
.manage-actions { display: flex; gap: 8px; justify-content: flex-end; }

.ghost-btn,
.manage-toolbar {
  padding: 0 18px 4px;
}

.danger-btn {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &--block {
    width: 100%;
    min-height: 42px;
  }
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.danger-btn {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.12);
  color: #fecaca;
}

.empty-copy {
  margin: 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

.action-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10060;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.action-modal-card {
  width: min(420px, 100%);
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98), rgba(6, 11, 20, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.action-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 10px;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 16px;
  }
}

.modal-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }
}

.action-modal-options {
  display: grid;
  gap: 8px;
  padding: 8px 16px 16px;
}

.action-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 54px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.action-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 18px;
}
</style>
