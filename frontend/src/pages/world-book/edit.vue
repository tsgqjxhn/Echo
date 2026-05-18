<template>
  <div class="world-book-edit-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="onBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">{{ isNew ? '创建世界书' : '编辑世界书' }}</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <main class="editor-body">
      <!-- 基本信息 -->
      <section class="base-section">
        <div class="field-item">
          <label class="field-label">世界书名称</label>
          <input v-model="form.name" type="text" class="field-input" placeholder="输入世界书名称" maxlength="50" />
        </div>
        <div class="field-item">
          <label class="field-label">描述</label>
          <textarea v-model="form.description" class="field-textarea" rows="2" placeholder="描述这个世界书的用途或内容" />
        </div>
        <div class="field-item inline-field">
          <label class="field-label">扫描消息数</label>
          <input v-model.number="form.scanRange" type="number" class="field-input number-input" min="1" max="9999" />
        </div>
      </section>

      <!-- 词条列表 -->
      <section class="entries-section">
        <div class="entries-header">
          <label class="field-label">词条列表</label>
          <span class="entries-count">{{ form.entries.length }} 条</span>
        </div>

        <div v-if="form.entries.length === 0" class="empty-hint">暂无词条，点击添加</div>

        <div v-for="(entry, eIdx) in form.entries" :key="entry.id" class="entry-card">
          <div class="entry-header">
            <span class="entry-index">词条 {{ eIdx + 1 }}</span>
            <div class="entry-actions">
              <button type="button" class="icon-btn" :disabled="eIdx === 0" @click="moveEntry(eIdx, -1)">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M18 15l-6-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button type="button" class="icon-btn" :disabled="eIdx === form.entries.length - 1" @click="moveEntry(eIdx, 1)">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <label class="entry-toggle">
                <input v-model="entry.enabled" type="checkbox" />
                <span class="toggle-slider" />
              </label>
              <button type="button" class="icon-btn danger" @click="removeEntry(eIdx)">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div class="field-item">
            <label class="field-label">关键词（逗号分隔）</label>
            <input v-model="entry.keywordInput" type="text" class="field-input" placeholder="例如：魔法, 法术, 咒语" @change="syncKeywords(entry)" />
          </div>

          <div class="field-item">
            <label class="field-label">内容</label>
            <textarea v-model="entry.content" class="field-textarea" rows="3" placeholder="词条内容，匹配关键词时注入到对话中" />
          </div>

          <div class="entry-grid">
            <div class="field-item">
              <label class="field-label">类型</label>
              <select v-model="entry.type" class="field-select">
                <option value="profile">人设</option>
                <option value="world_info">世界信息</option>
                <option value="dialogue">对话</option>
                <option value="style">风格</option>
              </select>
            </div>
            <div class="field-item">
              <label class="field-label">优先级</label>
              <input v-model.number="entry.order" type="number" class="field-input" min="0" max="999" />
            </div>
            <div class="field-item">
              <label class="field-label">插入位置</label>
              <select v-model.number="entry.position" class="field-select">
                <option :value="0">对话前</option>
                <option :value="1">对话后</option>
                <option :value="2">主提示词顶部</option>
                <option :value="3">主提示词底部</option>
                <option :value="4">作者注释顶部</option>
                <option :value="5">作者注释底部</option>
                <option :value="6">深度位置</option>
                <option :value="7">出口</option>
              </select>
            </div>
            <div class="field-item">
              <label class="field-label">深度</label>
              <input v-model.number="entry.depth" type="number" class="field-input" :disabled="entry.position !== 6" min="0" max="99" />
            </div>
          </div>

          <div class="entry-grid two-col">
            <div class="field-item">
              <label class="field-label">角色</label>
              <select v-model.number="entry.role" class="field-select">
                <option :value="0">system</option>
                <option :value="1">user</option>
                <option :value="2">assistant</option>
              </select>
            </div>
            <div class="field-item">
              <label class="field-label">触发概率（%）</label>
              <input v-model.number="entry.probability" type="number" class="field-input" min="0" max="100" />
            </div>
          </div>

          <div class="field-item">
            <label class="field-label">注释</label>
            <input v-model="entry.comment" type="text" class="field-input" placeholder="可选" />
          </div>

          <div class="field-item">
            <label class="field-label">绑定角色ID</label>
            <input v-model="entry.characterId" type="text" class="field-input" placeholder="空 = 全局" />
          </div>
        </div>

        <button type="button" class="add-entry-btn" @click="addEntry">
          <svg viewBox="0 0 24 24" width="12" height="12">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
          添加词条
        </button>
      </section>

      <!-- 保存 -->
      <section class="save-section">
        <button type="button" class="save-btn" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorldBook, WorldBookEntry } from '@/types/world-book'
import { generateUUID } from '@/utils/uuid'
import { uni } from '@/utils/uni-polyfill'
import { useCharacterStore } from '@/stores/character'

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const worldBookId = computed(() => route.query.id as string | undefined)
const characterId = computed(() => route.query.characterId as string | undefined)
const isNew = computed(() => !worldBookId.value)

const saving = ref(false)

interface EntryUI {
  id: string
  keywords: string[]
  keywordInput: string
  content: string
  order: number
  enabled: boolean
  position: number
  depth: number
  role: number
  probability: number
  comment: string
  type: 'profile' | 'world_info' | 'dialogue' | 'style'
  characterId: string
}

interface FormState {
  id: string
  name: string
  description: string
  scanRange: number
  entries: EntryUI[]
}

const form = reactive<FormState>({
  id: '',
  name: '',
  description: '',
  scanRange: 100,
  entries: [],
})

function makeEntryUI(): EntryUI {
  return {
    id: generateUUID(),
    keywords: [],
    keywordInput: '',
    content: '',
    order: 0,
    enabled: true,
    position: 0,
    depth: 0,
    role: 0,
    probability: 100,
    comment: '',
    type: 'world_info',
    characterId: '',
  }
}

function syncKeywords(entry: EntryUI) {
  entry.keywords = entry.keywordInput.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

function addEntry() {
  form.entries.push(makeEntryUI())
}

function removeEntry(index: number) {
  form.entries.splice(index, 1)
}

function moveEntry(index: number, dir: -1 | 1) {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= form.entries.length) return
  const temp = form.entries[index]
  form.entries[index] = form.entries[newIndex]
  form.entries[newIndex] = temp
}

onMounted(() => {
  if (worldBookId.value) {
    loadWorldBook(worldBookId.value)
  } else {
    form.id = generateUUID()
  }
})

async function loadWorldBook(id: string) {
  // 优先从绑定角色加载
  if (characterId.value) {
    try {
      const char = await characterStore.getCharacterById(characterId.value)
      if (char?.worldBooks) {
        const wb = char.worldBooks.find((b) => b.id === id)
        if (wb) {
          populateForm(wb)
          return
        }
      }
    } catch {
      // ignore
    }
  }
  // 从独立存储加载
  const standalone = loadStandaloneWorldBook(id)
  if (standalone) {
    populateForm(standalone)
  } else {
    uni.showToast({ title: '世界书不存在', icon: 'none' })
    setTimeout(() => router.back(), 1500)
  }
}

function populateForm(wb: WorldBook) {
  form.id = wb.id || generateUUID()
  form.name = wb.name || ''
  form.description = (wb as any).description || ''
  form.scanRange = Number(wb.scanRange) || 100
  form.entries = (wb.entries || []).map((e) => ({
    id: e.id || generateUUID(),
    keywords: Array.isArray(e.keywords) ? e.keywords : [],
    keywordInput: Array.isArray(e.keywords) ? e.keywords.join('，') : '',
    content: e.content || '',
    order: Number(e.order) || 0,
    enabled: e.enabled !== false,
    position: Number(e.position) || 0,
    depth: Number(e.depth) || 0,
    role: Number(e.role) || 0,
    probability: Number(e.probability) || 100,
    comment: e.comment || '',
    type: e.type || 'world_info',
    characterId: e.characterId || '',
  }))
}

function buildWorldBook(): WorldBook {
  return {
    id: form.id,
    name: form.name.trim(),
    description: form.description.trim(),
    scanRange: Number(form.scanRange) || 100,
    entries: form.entries.map((e) => ({
      id: e.id,
      keywords: e.keywordInput.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      content: e.content,
      order: e.order,
      enabled: e.enabled,
      position: e.position as WorldBookEntry['position'],
      depth: e.depth,
      role: e.role as WorldBookEntry['role'],
      probability: Number(e.probability) || 100,
      comment: e.comment || undefined,
      type: e.type,
      characterId: e.characterId || undefined,
    })),
  }
}

async function save() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入世界书名称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const wb = buildWorldBook()
    if (characterId.value) {
      // 保存到绑定角色的 worldBooks
      const char = await characterStore.getCharacterById(characterId.value)
      if (!char) {
        uni.showToast({ title: '角色不存在', icon: 'none' })
        return
      }
      if (!char.worldBooks) char.worldBooks = []
      const idx = char.worldBooks.findIndex((b) => b.id === wb.id)
      if (idx >= 0) {
        char.worldBooks[idx] = wb
      } else {
        char.worldBooks.push(wb)
      }
      await characterStore.updateCharacter(char)
    } else {
      // 保存为独立世界书
      saveStandaloneWorldBook(wb)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => router.back(), 800)
  } catch (err) {
    console.error('保存世界书失败:', err)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onBack() {
  router.back()
}

/* ── 独立世界书存储 ── */
const STANDALONE_WORLD_BOOKS_KEY = 'echo_world_books'

function loadStandaloneWorldBook(id: string): WorldBook | null {
  try {
    const raw = window.localStorage.getItem(STANDALONE_WORLD_BOOKS_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, WorldBook>
    return map[id] || null
  } catch {
    return null
  }
}

function saveStandaloneWorldBook(wb: WorldBook) {
  try {
    const raw = window.localStorage.getItem(STANDALONE_WORLD_BOOKS_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, WorldBook>) : {}
    map[wb.id] = wb
    window.localStorage.setItem(STANDALONE_WORLD_BOOKS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
</script>

<style scoped lang="scss">
.world-book-edit-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding-bottom: 32px;
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

.header-placeholder {
  width: 36px;
}

.editor-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.base-section,
.entries-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 14px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.field-input {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  &::placeholder {
    color: var(--text-disabled);
  }
  &:focus {
    border-color: var(--primary-color);
    background: var(--input-focus-bg);
  }
}

.number-input {
  width: 100px;
}

.field-textarea {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  &::placeholder {
    color: var(--text-disabled);
  }
  &:focus {
    border-color: var(--primary-color);
    background: var(--input-focus-bg);
  }
}

.field-select {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  &:focus {
    border-color: var(--primary-color);
  }
}

.inline-field {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  .field-label {
    flex-shrink: 0;
  }
}

.entries-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entries-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.empty-hint {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-disabled);
}

.entry-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entry-index {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.entry-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.icon-btn.danger {
  &:hover:not(:disabled) {
    color: var(--error-color);
    background: rgba(248, 113, 113, 0.1);
  }
}

.entry-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  transition: background 0.2s;
  &::before {
    content: '';
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background: var(--text-primary);
    transition: transform 0.2s;
  }
}

.entry-toggle input:checked + .toggle-slider {
  background: var(--secondary-color);
}

.entry-toggle input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  &.two-col {
    grid-template-columns: repeat(2, 1fr);
  }
}

.add-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 4px;
  border: 1px dashed var(--border-light);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: rgba(56, 189, 248, 0.06);
  }
}

.save-section {
  display: flex;
  justify-content: center;
  padding: 8px 0 24px;
}

.save-btn {
  padding: 12px 48px;
  border-radius: 5px;
  border: none;
  background: var(--secondary-color);
  color: var(--text-inverse);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
