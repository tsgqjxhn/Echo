<template>
  <div class="system-prompt-page">
    <!-- 顶部标题栏 -->
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="router.back()">
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
      <h1 class="page-title">系统提示词管理</h1>
      <span class="save-status" :class="{ saving: isSaving, saved: justSaved }">
        {{ saveStatusText }}
      </span>
    </header>

    <!-- 顶部操作栏 -->
    <div class="action-bar">
      <button type="button" class="action-btn primary" @click="handleEnableAll(true)">
        启用全部
      </button>
      <button type="button" class="action-btn" @click="handleEnableAll(false)">
        弃用全部
      </button>
      <button type="button" class="action-btn secondary" @click="handleAdvancedAll(true)">
        高级模式
      </button>
      <button type="button" class="action-btn" @click="handleAdvancedAll(false)">
        普通模式
      </button>
      <button type="button" class="action-btn danger" @click="handleReset">
        重置默认
      </button>
      <button type="button" class="action-btn" @click="handleExport">
        导出配置
      </button>
      <button type="button" class="action-btn" @click="triggerImport">
        导入配置
      </button>
      <input
        ref="importInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleImport"
      />
    </div>

    <!-- 分类列表 -->
    <div class="category-list">
      <div v-for="category in groupedPrompts" :key="category.key" class="category-section">
        <button
          type="button"
          class="category-header"
          :aria-expanded="expandedCategories.has(category.key)"
          @click="toggleCategory(category.key)"
        >
          <svg
            class="expand-icon"
            :class="{ expanded: expandedCategories.has(category.key) }"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M7 10l5 5 5-5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          <span class="category-title">{{ category.displayName }}</span>
          <span class="category-count">
            ({{ category.enabledCount }}/{{ category.prompts.length }} 已启用)
          </span>
        </button>

        <div v-show="expandedCategories.has(category.key)" class="category-content">
          <div v-for="prompt in category.prompts" :key="prompt.id" class="prompt-card">
            <!-- 卡片头部：名称 + 启用开关 -->
            <div class="prompt-header">
              <span class="prompt-name">{{ prompt.name }}</span>
              <label class="toggle-label" @click.prevent="handleToggleEnabled(prompt.id, prompt.enabled)">
                <span class="toggle-text" :class="{ on: prompt.enabled }">
                  {{ prompt.enabled ? '启用' : '弃用' }}
                </span>
                <span class="toggle-switch" :class="{ active: prompt.enabled }">
                  <span class="toggle-knob" />
                </span>
              </label>
            </div>

            <!-- 基础/高级模式切换 -->
            <div class="prompt-tabs">
              <button
                type="button"
                class="prompt-tab"
                :class="{ active: !prompt.useAdvanced }"
                @click="handleToggleMode(prompt.id, false)"
              >
                基础
              </button>
              <button
                type="button"
                class="prompt-tab"
                :class="{ active: prompt.useAdvanced }"
                @click="handleToggleMode(prompt.id, true)"
              >
                高级
              </button>
            </div>

            <!-- 可编辑文本区 -->
            <div class="prompt-editor">
              <textarea
                :value="promptEdits[prompt.id]"
                :placeholder="prompt.useAdvanced ? '请输入高级版提示词...' : '请输入基础版提示词...'"
                rows="6"
                @input="(e) => onTextInput(prompt.id, e)"
              />
            </div>

            <!-- 元信息 -->
            <div class="prompt-meta">
              <span class="meta-item">优先级: {{ prompt.priority }}</span>
              <span class="meta-separator">|</span>
              <span class="meta-item">位置: {{ prompt.injectionPosition }}</span>
              <span class="meta-separator">|</span>
              <span class="meta-item">触发: {{ prompt.triggerTiming }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部留白 -->
    <div class="page-bottom-space" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import type { SystemPrompt } from '@/types/system-prompt'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()
const settingsStore = useSettingsStore()

// ============ 状态 ============
const promptEdits = ref<Record<string, string>>({})
const expandedCategories = ref<Set<string>>(new Set())
const isSaving = ref(false)
const justSaved = ref(false)
const saveStatusText = ref('')
const importInputRef = ref<HTMLInputElement | null>(null)

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
const statusTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// 分类序号映射
const categoryOrder = [
  'roleplay',
  'dialogue',
  'moments',
  'story',
  'meta',
  'multimodal',
  'safety',
  'character-creation',
]
const numeralNames = ['', '一', '二', '三', '四', '五', '六', '七', '八']

// ============ 计算属性 ============
const groupedPrompts = computed(() => {
  const groups = new Map<
    string,
    { key: string; name: string; displayName: string; prompts: SystemPrompt[]; enabledCount: number }
  >()

  for (const p of settingsStore.systemPrompts) {
    if (!groups.has(p.category)) {
      const orderIndex = categoryOrder.indexOf(p.category)
      const numeral = numeralNames[Math.max(0, orderIndex + 1)]
      groups.set(p.category, {
        key: p.category,
        name: p.categoryName,
        displayName: `${numeral}、${p.categoryName}`,
        prompts: [],
        enabledCount: 0,
      })
    }
    const g = groups.get(p.category)!
    g.prompts.push(p)
    if (p.enabled) g.enabledCount++
  }

  return categoryOrder
    .filter((k) => groups.has(k))
    .map((k) => groups.get(k)!)
})

// ============ 初始化 ============
onMounted(() => {
  syncEdits(false)
  // 默认所有分类折叠
  expandedCategories.value.clear()
})

onUnmounted(() => {
  // 清理所有 pending timer
  for (const timer of saveTimers.values()) {
    clearTimeout(timer)
  }
  saveTimers.clear()
  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }
})

// ============ 方法 ============
function syncEdits(preserveEditing = true) {
  for (const p of settingsStore.systemPrompts) {
    if (preserveEditing && saveTimers.has(p.id)) continue
    promptEdits.value[p.id] = p.useAdvanced ? p.advancedPrompt : p.basicPrompt
  }
}

function toggleCategory(key: string) {
  if (expandedCategories.value.has(key)) {
    expandedCategories.value.delete(key)
  } else {
    expandedCategories.value.add(key)
  }
}

function handleToggleEnabled(id: string, currentEnabled: boolean) {
  settingsStore.updatePrompt(id, { enabled: !currentEnabled })
  showSaveStatus('已保存', false)
}

function handleToggleMode(id: string, useAdvanced: boolean) {
  settingsStore.updatePrompt(id, { useAdvanced })
  // 同步对应版本的文本
  const p = settingsStore.systemPrompts.find((sp) => sp.id === id)
  if (p) {
    promptEdits.value[id] = useAdvanced ? p.advancedPrompt : p.basicPrompt
  }
  showSaveStatus('已保存', false)
}

function onTextInput(id: string, event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  promptEdits.value[id] = value

  // 清除该 prompt 的旧 timer
  const existing = saveTimers.get(id)
  if (existing) clearTimeout(existing)

  showSaveStatus('保存中...', true)

  const timer = setTimeout(() => {
    const p = settingsStore.systemPrompts.find((sp) => sp.id === id)
    if (!p) return
    const field = p.useAdvanced ? 'advancedPrompt' : 'basicPrompt'
    settingsStore.updatePrompt(id, { [field]: value } as Partial<
      Pick<SystemPrompt, 'enabled' | 'useAdvanced' | 'basicPrompt' | 'advancedPrompt'>
    >)
    saveTimers.delete(id)
    showSaveStatus('已保存', false)
    uni.showToast({ title: '已保存', icon: 'success', duration: 1200 })
  }, 1000)

  saveTimers.set(id, timer)
}

function showSaveStatus(text: string, saving: boolean) {
  isSaving.value = saving
  justSaved.value = !saving
  saveStatusText.value = text

  if (statusTimer.value) {
    clearTimeout(statusTimer.value)
  }

  if (!saving) {
    statusTimer.value = setTimeout(() => {
      saveStatusText.value = ''
      justSaved.value = false
    }, 2000)
  }
}

function handleEnableAll(enabled: boolean) {
  settingsStore.toggleAllEnabled(enabled)
  syncEdits(true)
  uni.showToast({ title: enabled ? '已全部启用' : '已全部弃用', icon: 'success' })
}

function handleAdvancedAll(useAdvanced: boolean) {
  settingsStore.toggleAllAdvanced(useAdvanced)
  syncEdits(false)
  uni.showToast({ title: useAdvanced ? '已切换为高级模式' : '已切换为普通模式', icon: 'success' })
}

function handleReset() {
  uni.showModal({
    title: '确认重置',
    content: '这将恢复所有系统提示词为默认配置，自定义修改将丢失。是否继续？',
    success: (res) => {
      if (res.confirm) {
        settingsStore.resetSystemPrompts()
        syncEdits(false)
        uni.showToast({ title: '已重置为默认', icon: 'success' })
      }
    },
  })
}

function handleExport() {
  const json = settingsStore.exportConfig()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `echo-system-prompts-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  uni.showToast({ title: '配置已导出', icon: 'success' })
}

function triggerImport() {
  importInputRef.value?.click()
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string
      const success = settingsStore.importConfig(json)
      if (success) {
        syncEdits(false)
        uni.showToast({ title: '导入成功', icon: 'success' })
      } else {
        uni.showToast({ title: '导入失败，文件格式错误', icon: 'none' })
      }
    } catch {
      uni.showToast({ title: '导入失败', icon: 'none' })
    }
    input.value = ''
  }
  reader.readAsText(file)
}
</script>

<style lang="scss" scoped>
// ==================== 页面基础 ====================
.system-prompt-page {
  min-height: 100vh;
  padding: 0 0 60px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

// ==================== 顶部标题栏 ====================
.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + 44px);
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-base);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.back-icon {
  width: 22px;
  height: 22px;
}

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.save-status {
  padding: 4px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: color var(--transition-base), background var(--transition-base);
}

.save-status.saving {
  color: var(--primary-color);
  background: rgba(56, 189, 248, 0.1);
}

.save-status.saved {
  color: var(--secondary-color);
  background: rgba(52, 211, 153, 0.1);
}

// ==================== 操作栏 ====================
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.action-btn {
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    color var(--transition-base),
    transform var(--transition-base);
}

.action-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.action-btn.primary {
  border-color: rgba(56, 189, 248, 0.25);
  background: rgba(56, 189, 248, 0.1);
  color: var(--primary-light);
}

.action-btn.primary:hover {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.4);
}

.action-btn.secondary {
  border-color: rgba(52, 211, 153, 0.25);
  background: rgba(52, 211, 153, 0.08);
  color: var(--secondary-light);
}

.action-btn.secondary:hover {
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.4);
}

.action-btn.danger {
  border-color: rgba(251, 113, 133, 0.2);
  background: rgba(251, 113, 133, 0.06);
  color: #fda4af;
}

.action-btn.danger:hover {
  background: rgba(251, 113, 133, 0.12);
  border-color: rgba(251, 113, 133, 0.35);
}

// ==================== 分类列表 ====================
.category-list {
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-section {
  border: 1px solid rgba(52, 211, 153, 0.1);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  backdrop-filter: blur(16px);
  overflow: hidden;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}

.category-section:hover {
  border-color: rgba(52, 211, 153, 0.18);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-base);
}

.category-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.expand-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform var(--transition-base);
}

.expand-icon.expanded {
  transform: rotate(180deg);
  color: var(--primary-light);
}

.category-title {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
}

.category-count {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.category-content {
  padding: 0 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// ==================== 提示词卡片 ====================
.prompt-card {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(12px);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.prompt-card:hover {
  border-color: rgba(56, 189, 248, 0.15);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  transform: translateY(-1px);
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.prompt-name {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

// ---------- Toggle Switch ----------
.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-text {
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  transition: color var(--transition-base);
}

.toggle-text.on {
  color: var(--secondary-color);
}

.toggle-switch {
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  transition: background var(--transition-base);
  flex-shrink: 0;
}

.toggle-switch.active {
  background: var(--secondary-color);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-base);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(18px);
}

// ---------- Tabs ----------
.prompt-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.prompt-tab {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    color var(--transition-base);
}

.prompt-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.prompt-tab.active {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.12);
  color: var(--primary-light);
}

// ---------- Textarea ----------
.prompt-editor textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
  resize: vertical;
  outline: none;
  transition:
    border-color var(--transition-base),
    background var(--transition-base),
    box-shadow var(--transition-base);
}

.prompt-editor textarea:focus {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(0, 0, 0, 0.28);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.08);
}

.prompt-editor textarea::placeholder {
  color: var(--text-disabled);
}

// ---------- Meta ----------
.prompt-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.meta-item {
  color: var(--text-tertiary);
  font-size: 12px;
}

.meta-separator {
  color: rgba(255, 255, 255, 0.15);
  font-size: 11px;
}

// ==================== 底部留白 ====================
.page-bottom-space {
  height: 40px;
}

// ==================== 响应式 ====================
@media (max-width: 640px) {
  .page-header {
    gap: 6px;
    padding: calc(env(safe-area-inset-top, 0px) + 4px) 10px 6px;
  }

  .page-title {
    font-size: 15px;
  }

  .save-status {
    padding: 3px 8px;
    font-size: 11px;
  }

  .action-bar {
    gap: 6px;
    padding: 10px 12px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .category-list {
    padding: 10px 12px 20px;
  }

  .category-header {
    padding: 12px 14px;
  }

  .category-content {
    padding: 0 10px 12px;
  }

  .prompt-card {
    padding: 12px;
  }

  .prompt-editor textarea {
    min-height: 100px;
    padding: 10px;
  }
}
</style>
