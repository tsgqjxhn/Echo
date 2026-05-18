<template>
  <div class="world-book-list-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="goBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">世界书</h1>
      <button type="button" class="add-btn" aria-label="新建" @click="goCreate">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <main class="list-body">
      <div v-if="loading" class="loading">加载中…</div>
      <div v-else-if="books.length === 0" class="empty-state">
        <span class="empty-icon">📚</span>
        <p class="empty-text">暂无世界书</p>
        <button type="button" class="create-btn" @click="goCreate">创建一个</button>
      </div>
      <div v-else class="book-list">
        <div
          v-for="book in books"
          :key="book.id"
          class="book-card"
          @click="goEdit(book.id)"
        >
          <div class="book-info">
            <span class="book-name">{{ book.name || '未命名世界书' }}</span>
            <span v-if="book.description" class="book-desc">{{ book.description }}</span>
            <span class="book-meta">{{ book.entries?.length || 0 }} 词条</span>
          </div>
          <svg class="book-arrow" viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { WorldBook } from '@/types/world-book'

const router = useRouter()

const books = ref<WorldBook[]>([])
const loading = ref(true)

const STANDALONE_WORLD_BOOKS_KEY = 'echo_world_books'

onMounted(() => {
  loadBooks()
})

function loadBooks() {
  loading.value = true
  try {
    const raw = window.localStorage.getItem(STANDALONE_WORLD_BOOKS_KEY)
    if (raw) {
      const map = JSON.parse(raw) as Record<string, WorldBook>
      books.value = Object.values(map)
    } else {
      books.value = []
    }
  } catch {
    books.value = []
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function goCreate() {
  router.push('/world-book/edit')
}

function goEdit(id: string) {
  router.push(`/world-book/edit?id=${id}`)
}
</script>

<style scoped lang="scss">
.world-book-list-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.back-icon {
  width: 20px;
  height: 20px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.add-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--primary-color);
  }
}

.list-body {
  padding: 16px;
}

.loading {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
}

.create-btn {
  padding: 8px 24px;
  border-radius: 4px;
  border: none;
  background: var(--secondary-color);
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.9;
  }
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-light);
  }
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-meta {
  font-size: 11px;
  color: var(--text-disabled);
}

.book-arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
}
</style>
