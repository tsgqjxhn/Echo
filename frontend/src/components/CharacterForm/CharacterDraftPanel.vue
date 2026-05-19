<template>
  <Teleport to="body">
    <div v-if="visible" class="draft-panel-overlay" @click.self="emit('close')">
      <section class="draft-panel-card" role="dialog" aria-modal="true" aria-label="角色创建草稿">
        <header class="draft-panel-head">
          <div>
            <h3>草稿箱</h3>
            <p>草稿保存在本机，可批量管理或导出为 JSON 文件</p>
          </div>
          <button type="button" class="draft-panel-close" aria-label="关闭" @click="emit('close')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
          </button>
        </header>

        <div class="draft-panel-toolbar">
          <label class="draft-select-all">
            <input v-model="allSelected" type="checkbox" :disabled="!drafts.length" @change="toggleSelectAll" />
            <span>全选</span>
          </label>
          <div class="draft-toolbar-actions">
            <button type="button" class="draft-tool-btn" :disabled="busy" @click="triggerImport">导入文件</button>
            <button type="button" class="draft-tool-btn danger" :disabled="!selectedIds.length || busy" @click="handleBatchDelete">
              删除{{ selectedIds.length ? `(${selectedIds.length})` : '' }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="draft-panel-empty">加载中…</div>
        <div v-else-if="!drafts.length" class="draft-panel-empty">暂无草稿，编辑角色后点击「暂存草稿」保存</div>
        <ul v-else class="draft-list">
          <li v-for="item in drafts" :key="item.id" class="draft-item" :class="{ active: item.id === activeDraftId }">
            <label class="draft-item-check">
              <input v-model="selectedIds" type="checkbox" :value="item.id" />
            </label>
            <div class="draft-item-body">
              <div v-if="renamingId === item.id" class="draft-rename-row">
                <input v-model="renameValue" class="draft-rename-input" maxlength="40" @keyup.enter="confirmRename(item.id)" />
                <button type="button" class="draft-inline-btn" @click="confirmRename(item.id)">保存</button>
                <button type="button" class="draft-inline-btn ghost" @click="cancelRename">取消</button>
              </div>
              <template v-else>
                <div class="draft-item-title">{{ item.title }}</div>
                <div class="draft-item-meta">
                  <span>{{ getDraftStepLabel(item.payload) }}</span>
                  <span>{{ formatDraftUpdatedAt(item.updatedAt) }}</span>
                </div>
              </template>
            </div>
            <div class="draft-item-actions">
              <button type="button" class="draft-inline-btn primary" :disabled="busy" @click="emit('open', item)">编辑</button>
              <button type="button" class="draft-inline-btn" :disabled="busy" @click="startRename(item)">重命名</button>
              <button type="button" class="draft-inline-btn" :disabled="busy" @click="handleExport(item.id)">导出</button>
              <button type="button" class="draft-inline-btn danger" :disabled="busy" @click="handleDeleteOne(item.id)">删除</button>
            </div>
          </li>
        </ul>

        <input ref="importInputRef" type="file" accept=".json,.echo-character-draft.json,application/json" class="draft-import-input" @change="handleImportChange" />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { uni } from '@/utils/uni-polyfill'
import {
  deleteCharacterCreateDraft,
  deleteCharacterCreateDrafts,
  exportCharacterCreateDraftFile,
  formatDraftUpdatedAt,
  getDraftStepLabel,
  importCharacterCreateDraftFromFile,
  listCharacterCreateDrafts,
  renameCharacterCreateDraft,
  type CharacterCreateDraftRecord,
} from '@/services/character-create-drafts'

const props = defineProps<{
  visible: boolean
  activeDraftId?: string | null
}>()

const emit = defineEmits<{
  close: []
  open: [draft: CharacterCreateDraftRecord]
  changed: []
}>()

const drafts = ref<CharacterCreateDraftRecord[]>([])
const selectedIds = ref<string[]>([])
const allSelected = ref(false)
const loading = ref(false)
const busy = ref(false)
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const importInputRef = ref<HTMLInputElement | null>(null)

async function refreshList() {
  loading.value = true
  try {
    drafts.value = await listCharacterCreateDrafts()
    const allowed = new Set(drafts.value.map(item => item.id))
    selectedIds.value = selectedIds.value.filter(id => allowed.has(id))
    allSelected.value = drafts.value.length > 0 && selectedIds.value.length === drafts.value.length
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, visible => {
  if (visible) {
    renamingId.value = null
    refreshList()
  }
})

function toggleSelectAll() {
  selectedIds.value = allSelected.value ? drafts.value.map(item => item.id) : []
}

watch(selectedIds, ids => {
  allSelected.value = drafts.value.length > 0 && ids.length === drafts.value.length
})

function startRename(item: CharacterCreateDraftRecord) {
  renamingId.value = item.id
  renameValue.value = item.title
}

function cancelRename() {
  renamingId.value = null
  renameValue.value = ''
}

async function confirmRename(id: string) {
  const title = renameValue.value.trim()
  if (!title) {
    uni.showToast({ title: '名称不能为空', icon: 'none' })
    return
  }
  busy.value = true
  try {
    await renameCharacterCreateDraft(id, title)
    cancelRename()
    await refreshList()
    emit('changed')
    uni.showToast({ title: '已重命名', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '重命名失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

async function handleDeleteOne(id: string) {
  uni.showModal({
    title: '删除草稿',
    content: '确定删除该草稿？此操作不可恢复。',
    confirmText: '删除',
    cancelText: '取消',
    success: async (res: { confirm: boolean }) => {
      if (!res.confirm) return
      busy.value = true
      try {
        await deleteCharacterCreateDraft(id)
        await refreshList()
        emit('changed')
        uni.showToast({ title: '已删除', icon: 'none' })
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
      } finally {
        busy.value = false
      }
    },
  })
}

function handleBatchDelete() {
  if (!selectedIds.value.length) return
  uni.showModal({
    title: '批量删除',
    content: `确定删除选中的 ${selectedIds.value.length} 个草稿？`,
    confirmText: '删除',
    cancelText: '取消',
    success: async (res: { confirm: boolean }) => {
      if (!res.confirm) return
      busy.value = true
      try {
        await deleteCharacterCreateDrafts([...selectedIds.value])
        selectedIds.value = []
        allSelected.value = false
        await refreshList()
        emit('changed')
        uni.showToast({ title: '已批量删除', icon: 'none' })
      } catch (error) {
        uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
      } finally {
        busy.value = false
      }
    },
  })
}

async function handleExport(id: string) {
  busy.value = true
  try {
    await exportCharacterCreateDraftFile(id)
    uni.showToast({ title: '已导出文件', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '导出失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function triggerImport() {
  importInputRef.value?.click()
}

async function handleImportChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  busy.value = true
  try {
    const draft = await importCharacterCreateDraftFromFile(file)
    await refreshList()
    emit('changed')
    uni.showToast({ title: `已导入「${draft.title}」`, icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '导入失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.draft-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(4, 10, 18, 0.78);
  backdrop-filter: blur(14px);
}

.draft-panel-card {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  max-height: calc(100vh - 32px);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(8, 20, 32, 0.98), rgba(6, 14, 24, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.draft-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }
}

.draft-panel-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  cursor: pointer;

  svg { width: 18px; height: 18px; }
}

.draft-panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px 12px;
}

.draft-select-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.draft-toolbar-actions {
  display: inline-flex;
  gap: 8px;
}

.draft-tool-btn {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.1);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &.danger {
    border-color: rgba(248, 113, 113, 0.45);
    background: rgba(248, 113, 113, 0.12);
  }
}

.draft-panel-empty {
  padding: 28px 18px 36px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 14px;
}

.draft-list {
  list-style: none;
  margin: 0;
  padding: 0 12px 16px;
  overflow-y: auto;
}

.draft-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);

  & + & { margin-top: 10px; }
  &.active { border-color: rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.08); }
}

.draft-item-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
}

.draft-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.draft-item-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.draft-inline-btn {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &.primary {
    border-color: rgba(56, 189, 248, 0.45);
    background: rgba(56, 189, 248, 0.16);
  }
  &.ghost { color: var(--text-secondary); }
  &.danger {
    border-color: rgba(248, 113, 113, 0.4);
    color: #fecaca;
  }
}

.draft-rename-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.draft-rename-input {
  flex: 1 1 160px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-primary);
  font: inherit;
}

.draft-import-input {
  display: none;
}
</style>
