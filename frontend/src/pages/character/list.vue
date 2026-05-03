<template>
  <div class="character-list-page">
    <section class="search-strip">
      <button type="button" class="circle-tool" @click="router.push('/character/create')">
        <img :src="createCharacterIcon" alt="创建角色" class="tool-icon" />
      </button>

      <label class="search-box">
        <img :src="searchIcon" alt="搜索" class="search-icon" />
        <input
          v-model="searchKeyword"
          class="search-input"
          type="search"
          placeholder="搜索感兴趣的内容"
        />
      </label>

      <button type="button" class="circle-tool" @click="openImportSheet">
        <img :src="importCharacterIcon" alt="导入角色" class="tool-icon" />
      </button>
    </section>

    <section class="category-panel">
      <div class="big-category-row">
        <button
          v-for="group in browseCategoryGroups"
          :key="group.label"
          type="button"
          class="category-chip large"
          :class="{ active: selectedBigCategory === group.label }"
          @click="selectBigCategory(group.label)"
        >
          {{ group.label }}
        </button>
      </div>

      <div class="small-category-row">
        <button
          type="button"
          class="category-chip"
          :class="{ active: selectedTheme === '' }"
          @click="selectedTheme = ''"
        >
          全部
        </button>
        <button
          v-for="theme in allThemes"
          :key="theme"
          type="button"
          class="category-chip"
          :class="{ active: selectedTheme === theme }"
          @click="selectedTheme = theme"
        >
          {{ theme }}
        </button>
      </div>
    </section>

    <section class="featured-panel">
      <article
        v-for="character in filteredCharacters"
        :key="character.id"
        class="character-card"
        @click="goToDetail(character.id)"
        @contextmenu.prevent="onCardContextMenu(character, $event)"
        @touchstart="onCardTouchStart(character, $event)"
        @touchend="onCardTouchEnd"
        @touchmove="onCardTouchMove"
      >
        <div class="card-topbar">
          <span class="meta-chip meta-chip--top">{{ getModeLabel(character.mode) }}</span>
          <span class="meta-chip meta-chip--top subtle">{{ character.category || DEFAULT_CATEGORY }}</span>
          <span v-if="character.subCategory" class="meta-chip meta-chip--top subtle">{{ character.subCategory }}</span>
        </div>

        <div class="card-body">
          <h2>{{ character.name }}</h2>
          <p>{{ character.description }}</p>
          <span class="card-date">{{ formatDate(character.createdAt) }}</span>
        </div>

        <div class="card-actions">
          <button type="button" class="card-action-btn" @click.stop="goToEdit(character.id)">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            编辑
          </button>
          <button type="button" class="card-action-btn clone" @click.stop="cloneCharacter(character)">
            <svg viewBox="0 0 24 24" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            复制
          </button>
        </div>
      </article>
    </section>

    <section v-if="filteredCharacters.length === 0" class="empty-card">
      <p class="eyebrow">内容为空</p>
      <h2>当前条件下还没有角色</h2>
      <p>可以换个分类看看，或者直接用左侧创建按钮生成一个新角色。</p>
      <button type="button" class="primary-btn" @click="router.push('/character/create')">立即创建</button>
    </section>

    <input
      ref="importFileInput"
      class="hidden-input"
      type="file"
      accept=".png,.json"
      @change="onImportFileChange"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import createCharacterIcon from '@/static/images/create-character.svg'
import importCharacterIcon from '@/static/images/import-character.svg'
import searchIcon from '@/static/images/search-action.svg'
import { useCharacterStore } from '@/stores/character'
import { importCharacterFromFile } from '@/services/character-import'
import { createSilverAvatarDataUrl, createSilverBackdropDataUrl } from '@/utils/silver-art'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'
import { ensureStoryCharacter, loadStoryLibrary } from '@/services/story-conversations'
import {
  DEFAULT_CATEGORY,
  getAllThemeLeaves,
  getBrowseCategoryGroups,
} from '@/data/taxonomy'

const router = useRouter()
const characterStore = useCharacterStore()

const searchKeyword = ref('')
const selectedBigCategory = ref('全部')
const selectedTheme = ref('')
const importFileInput = ref<HTMLInputElement | null>(null)

const browseCategoryGroups = getBrowseCategoryGroups()
const allThemes = getAllThemeLeaves()

const filteredCharacters = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return [...characterStore.characters]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .filter(character => {
      const characterCategory = character.category || DEFAULT_CATEGORY
      const matchesBig =
        !selectedBigCategory.value ||
        selectedBigCategory.value === '全部' ||
        characterCategory === selectedBigCategory.value
      const matchesTheme =
        !selectedTheme.value ||
        (character.tags || []).includes(selectedTheme.value) ||
        (character.subCategory || '') === selectedTheme.value
      const matchesSearch =
        !keyword ||
        [
          character.name,
          character.description,
          character.category || '',
          character.subCategory || '',
          character.personality || '',
          character.behavior || '',
          ...(character.tags || [])
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      return matchesBig && matchesTheme && matchesSearch
    })
})


onMounted(async () => {
  const library = loadStoryLibrary()
  await ensureStoryCharacter(library.characterName)
  await characterStore.loadCharacters({ sortBy: 'updatedAt', sortOrder: 'desc' })
})

function selectBigCategory(label: string) {
  selectedBigCategory.value = label
}

function getModeLabel(mode?: ICharacter['mode']): string {
  switch (mode) {
    case 'challenge-dialogue':
      return '闯关式对话'
    case 'group-chat':
      return '群聊'
    case 'group-challenge':
      return '群聊闯关'
    case 'free-dialogue':
    default:
      return '自由对话'
  }
}


function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

function goToDetail(id: string) {
  router.push(`/character/detail/${id}`)
}

function goToEdit(id: string) {
  router.push(`/character/edit?id=${id}`)
}

async function cloneCharacter(character: ICharacter) {
  uni.showModal({
    title: '复制角色',
    content: `确定要复制「${character.name}」吗？`,
    success: async (res: { confirm: boolean }) => {
      if (res.confirm) {
        try {
          const newId = await characterStore.cloneCharacter(character.id)
          uni.showToast({ title: '复制成功', icon: 'success' })
          setTimeout(() => {
            router.push(`/character/edit?id=${newId}`)
          }, 800)
        } catch {
          uni.showToast({ title: '复制失败', icon: 'none' })
        }
      }
    },
  })
}

// 长按菜单
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressCharacter: ICharacter | null = null
const LONG_PRESS_DELAY = 600

function onCardTouchStart(character: ICharacter, _event: TouchEvent) {
  longPressCharacter = character
  longPressTimer = setTimeout(() => {
    if (longPressCharacter) {
      showCardActionSheet(longPressCharacter)
      longPressCharacter = null
    }
  }, LONG_PRESS_DELAY)
}

function onCardTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  longPressCharacter = null
}

function onCardTouchMove() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  longPressCharacter = null
}

function onCardContextMenu(character: ICharacter, _event: MouseEvent) {
  showCardActionSheet(character)
}

function showCardActionSheet(character: ICharacter) {
  uni.showActionSheet({
    title: `「${character.name}」`,
    itemList: ['复制', '编辑', '删除'],
    itemColor: '#38bdf8',
    success: (res: { tapIndex: number }) => {
      if (res.tapIndex === 0) cloneCharacter(character)
      else if (res.tapIndex === 1) goToEdit(character.id)
      else if (res.tapIndex === 2) confirmDelete(character)
    },
  })
}

function confirmDelete(character: ICharacter) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${character.name}」吗？删除后无法恢复。`,
    success: async (res: { confirm: boolean }) => {
      if (res.confirm) {
        try {
          await characterStore.deleteCharacter(character.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}



function openImportSheet() {
  importFileInput.value?.click()
}

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  handleImportFile(file)
  input.value = ''
}

async function handleImportFile(file: File) {
  try {
    const imported = await importCharacterFromFile(file)
    const character: Partial<ICharacter> = {
      ...imported,
      avatar: imported.avatar || createSilverAvatarDataUrl(imported.name),
      backgroundImage: imported.backgroundImage || createSilverBackdropDataUrl(imported.name, '第三方导入'),
      avatarTone: imported.avatarTone || 'silver',
    }

    const newId = await characterStore.createCharacter(character)
    uni.showToast({ title: `导入成功：${imported.name}`, icon: 'success' })
    router.push(`/character/edit?id=${newId}`)
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '导入失败',
      icon: 'none'
    })
  }
}

</script>

<style lang="scss" scoped>
// ── 深海主题 · 角色列表页 ─────────────────────────────
$sky: #38bdf8;
$sky-light: #7dd3fc;
$sky-glow: rgba(56, 189, 248, 0.22);
$mint: #34d399;
$mint-light: #6ee7b7;
$mint-glow: rgba(52, 211, 153, 0.16);
$cyan: #67e8f9;

.character-list-page {
  box-sizing: border-box;
  min-height: 100vh;
  overflow-y: auto;
  padding: 0 0 96px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.character-list-page::-webkit-scrollbar,
.sheet-scroll::-webkit-scrollbar {
  display: none;
}

// ── 通用卡片边框基础 ─────────────────────────────────
.story-spotlight,
.character-card,
.empty-card,
.sheet {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

// ── 回声故事卡 ───────────────────────────────────────
.story-spotlight {
  margin-top: 14px;
  padding: 20px;
  border-radius: 18px;
}


.story-spotlight {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-color: rgba(56, 189, 248, 0.20);
  background:
    radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.16) 0%, transparent 44%),
    radial-gradient(circle at 20% 80%, rgba(52, 211, 153, 0.10) 0%, transparent 40%),
    linear-gradient(145deg, rgba(36, 16, 52, 0.92), rgba(14, 8, 28, 0.98));
  transition: border-color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    border-color: rgba(56, 189, 248, 0.32);
    box-shadow: 0 24px 64px rgba(56, 189, 248, 0.12), 0 8px 24px rgba(0, 0, 0, 0.48);
    cursor: pointer;
  }
}

.story-spotlight h2 {
  margin-top: 10px;
  background: linear-gradient(135deg, $sky-light, $sky, $mint-light);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 30px;
}

.story-copy {
  margin-top: 10px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.story-entry-btn {
  flex-shrink: 0;
  min-width: 96px;
  min-height: 42px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.30);
  transition: transform var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(56, 189, 248, 0.42);
  }
}

// ── 搜索条 ───────────────────────────────────────────
.search-strip {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 0;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 0 12px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
}

.search-strip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.circle-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  transition: transform var(--transition-base), opacity var(--transition-base);
  position: relative;
  z-index: 10;

  &:hover {
    opacity: 0.78;
  }
}

.tool-icon {
  width: 22px;
  height: 22px;
  opacity: 0.85;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.search-icon {
  width: 18px;
  height: 18px;
  opacity: 0.75;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

// ── 分类面板 ─────────────────────────────────────────
.category-panel {
  width: min(1080px, calc(100% - 32px));
  margin: 5px auto 0;
  padding: 0 0 10px;
}


.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.eyebrow {
  color: $sky-light;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
}

.panel-head h1 {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.2;
}

.panel-head strong {
  color: var(--text-primary);
  font-size: 40px;
  line-height: 1;
}

// ── 分类 Chip ────────────────────────────────────────
.big-category-row,
.small-category-row,
.chip-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.big-category-row::-webkit-scrollbar,
.small-category-row::-webkit-scrollbar,
.chip-row::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.07);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.14);
    color: var(--text-primary);
  }

  &.large {
    min-height: 44px;
    font-weight: 600;
  }

  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80));
    border-color: transparent;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.26);
  }
}

// ── 角色卡片列表 ─────────────────────────────────────
.featured-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin-top: 14px;
}

.character-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 208px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: rgba(8, 17, 28, 0.96);
  box-shadow: none;
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition-base);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;

  &:hover {
    transform: none;
    border-color: rgba(255, 255, 255, 0.98);
    box-shadow: none;
  }

  &:hover .card-actions {
    opacity: 1;
  }
}

.character-card:nth-child(odd):not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.88);
}

.character-card:nth-child(n + 3) {
  border-top: 1px solid rgba(255, 255, 255, 0.88);
}

.card-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 54px;
  padding: 12px;
  background: transparent;
}

.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 12px 16px;
}

.card-body h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.card-body p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-date {
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.card-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  transition: opacity 0.2s;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(56, 189, 248, 0.3);
    color: var(--text-secondary);
    background: rgba(56, 189, 248, 0.06);
  }

  &.clone:hover {
    border-color: rgba(52, 211, 153, 0.3);
    background: rgba(52, 211, 153, 0.06);
    color: #6ee7b7;
  }
}

@media (max-width: 640px) {
  .card-actions {
    opacity: 1;
  }
}

.meta-chip {
  padding: 4px 8px;
  border-radius: 0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;

  &.subtle {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.72);
  }
}

.meta-chip--top {
  letter-spacing: 0.02em;
}

.action-btn,
.primary-btn {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
}

.action-btn {
  flex: 1;
  border: 1px solid rgba(52, 211, 153, 0.16);
  background: rgba(52, 211, 153, 0.08);
  color: $mint-light;

  &:hover {
    background: rgba(52, 211, 153, 0.16);
    border-color: rgba(52, 211, 153, 0.26);
  }

  &.primary {
    flex: 1.2;
    border: none;
    background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.26);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 32px rgba(56, 189, 248, 0.38);
    }
  }
}

// ── 空状态 ───────────────────────────────────────────
.empty-card {
  width: min(1080px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 36px 28px;
  border-radius: 18px;
  text-align: center;
}

.empty-card h2 {
  margin: 10px 0;
  color: var(--text-primary);
  font-size: 24px;
}

.empty-card p {
  margin-bottom: 20px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.28);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(56, 189, 248, 0.40);
  }

  &.full {
    width: 100%;
    margin-top: 4px;
  }
}

// ── 弹出层 / Sheet ────────────────────────────────────
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(8, 4, 24, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10000;
}

.sheet {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(920px, 100%);
  max-height: calc(100vh - 36px);
  padding: 22px;
  border-radius: 20px;
  border-color: rgba(52, 211, 153, 0.16);
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sheet-head h2 {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 26px;
}

.close-btn {
  flex-shrink: 0;
  white-space: nowrap;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 10px;
  background: rgba(52, 211, 153, 0.07);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.14);
    color: var(--text-primary);
  }
}

.sheet-scroll {
  flex: 1;
  min-height: 0;
  margin: 18px 0;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.field-block + .field-block {
  margin-top: 18px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.field-grid.dual {
  margin-top: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.field--dropdown {
  position: relative;
}

.field-label,
.field span {
  color: var(--text-secondary);
  font-size: 13px;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 13px 16px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font: inherit;
  transition: border-color var(--transition-base);

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
    background: rgba(255, 255, 255, 0.14);
  }
}

.field textarea {
  resize: vertical;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-base), background var(--transition-base);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
    background: rgba(255, 255, 255, 0.14);
  }
}

.select-caret {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.select-menu {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 30;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(52, 211, 153, 0.16);
  border-radius: 14px;
  background: rgba(11, 22, 32, 0.98);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  max-height: min(260px, 42vh);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.select-menu::-webkit-scrollbar {
  display: none;
}

.select-menu--up {
  bottom: calc(100% + 8px);
}

.select-option {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(52, 211, 153, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.10);
    color: var(--text-primary);
  }

  &.active {
    border-color: transparent;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.78));
    color: #fff;
    font-weight: 600;
  }
}

.preview-grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  margin-top: 18px;
}

.preview-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(52, 211, 153, 0.10);
  background: rgba(255, 255, 255, 0.08);
}

.preview-avatar {
  width: 108px;
  height: 108px;
  margin-top: 14px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(56, 189, 248, 0.22);
}

.preview-backdrop {
  width: 100%;
  margin-top: 14px;
  border-radius: 12px;
  object-fit: cover;
}

.full {
  width: 100%;
}

.advanced-toggle {
  width: 100%;
  min-height: 42px;
  margin-top: 16px;
  border: 1px dashed rgba(52, 211, 153, 0.20);
  border-radius: 12px;
  background: transparent;
  color: $mint-light;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.07);
    border-color: rgba(52, 211, 153, 0.30);
  }
}

.sheet-copy {
  color: var(--text-secondary);
  line-height: 1.8;
  font-size: 14px;
}

.hidden-input {
  display: none;
}

.import-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-secondary);
  word-break: break-all;
}

// ── 响应式 ───────────────────────────────────────────
@media (max-width: 760px) {
  .field-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .story-spotlight {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .character-list-page {
    padding: 0 0 92px;
  }

  .search-strip {
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    gap: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .circle-tool {
    width: 42px;
    height: 42px;
  }

  .overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .sheet {
    padding: 18px;
    border-radius: 20px 20px 0 0;
    max-height: 92vh;
  }

  .category-panel,
  .empty-card {
    width: calc(100% - 20px);
  }
}
</style>
