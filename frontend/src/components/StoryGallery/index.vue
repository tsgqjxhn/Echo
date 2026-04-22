<template>
  <Teleport to="body">
    <div v-if="visible" class="gallery-overlay" @click.self="$emit('close')">
      <section class="gallery-sheet">
        <header class="gallery-head">
          <strong>图鉴</strong>
          <span>{{ unlockedCount }} / {{ GALLERY_ITEMS.length }}</span>
          <button type="button" class="gallery-close" @click="$emit('close')">&times;</button>
        </header>

        <div class="gallery-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="gallery-tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="gallery-grid">
          <button
            v-for="item in filteredItems"
            :key="item.id"
            type="button"
            class="gallery-cell"
            :class="{ locked: !isUnlocked(item.id) }"
            @click="onItemClick(item)"
          >
            <img :src="isUnlocked(item.id) ? item.src : ''" :alt="item.title" class="cell-image" />
            <span class="cell-title">{{ isUnlocked(item.id) ? item.title : '?' }}</span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>

  <ImageViewer
    :visible="viewerVisible"
    :src="viewerSrc"
    :alt="viewerTitle"
    :caption="viewerTitle"
    @close="viewerVisible = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ImageViewer from '@/components/ImageViewer/index.vue'
import { GALLERY_ITEMS, getUnlockedIds, type GalleryItem } from '@/services/story-gallery'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  close: []
}>()

const activeTab = ref<'all' | 'avatar' | 'scene' | 'item'>('all')
const viewerVisible = ref(false)
const viewerSrc = ref('')
const viewerTitle = ref('')

const unlockedIds = ref(getUnlockedIds())

const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'avatar' as const, label: '头像' },
  { key: 'scene' as const, label: '场景' },
  { key: 'item' as const, label: '物品' },
]

const unlockedCount = computed(() => unlockedIds.value.size)

const filteredItems = computed(() => {
  if (activeTab.value === 'all') return GALLERY_ITEMS
  return GALLERY_ITEMS.filter(item => item.category === activeTab.value)
})

function isUnlocked(id: string): boolean {
  return unlockedIds.value.has(id)
}

function onItemClick(item: GalleryItem) {
  if (!isUnlocked(item.id)) return
  viewerSrc.value = item.src
  viewerTitle.value = item.title
  viewerVisible.value = true
}
</script>

<style lang="scss" scoped>
.gallery-overlay {
  position: fixed;
  inset: 0;
  z-index: 25000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.gallery-sheet {
  width: min(520px, 100%);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 22px 22px 0 0;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 -12px 64px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.gallery-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px 10px;

  strong {
    color: var(--text-primary);
    font-size: 18px;
  }

  span {
    color: var(--text-tertiary);
    font-size: 12px;
    margin-left: auto;
  }
}

.gallery-close {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-tabs {
  display: flex;
  gap: 6px;
  padding: 0 18px 10px;
}

.gallery-tab {
  padding: 5px 14px;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &.active {
    background: rgba(56, 189, 248, 0.12);
    color: #7dd3fc;
    border-color: rgba(56, 189, 248, 0.28);
  }
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 6px 14px 18px;
  overflow-y: auto;
}

.gallery-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover:not(.locked) {
    background: rgba(56, 189, 248, 0.06);
    border-color: rgba(56, 189, 248, 0.2);
  }

  &.locked {
    opacity: 0.35;
    cursor: default;

    .cell-image {
      background: rgba(255, 255, 255, 0.04);
    }
  }
}

.cell-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
}

.cell-title {
  color: var(--text-secondary);
  font-size: 11px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (max-width: 400px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
