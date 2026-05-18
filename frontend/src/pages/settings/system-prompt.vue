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
      <button type="button" class="reset-icon-btn" aria-label="重置默认" @click="handleReset">
        <svg t="1779006172664" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6116" width="200" height="200"><path d="M512 112.64c-80.349867 0-160.5632 26.8288-228.5568 73.3184l-0.682667-0.682667c-4.5056 3.413333-8.874667 7.031467-13.380266 10.581334-4.437333 3.2768-8.738133 6.826667-13.038934 10.24-14.9504 12.834133-37.4784 1.6384-37.205333-18.363734l0.8192-81.1008A38.229333 38.229333 0 0 0 182.135467 68.266667a37.6832 37.6832 0 0 0-38.775467 36.932266l-2.730667 236.544a38.229333 38.229333 0 0 0 35.498667 38.229334l2.389333 0.136533 0.750934-0.068267c0.4096 0 0.750933 0.2048 1.2288 0.2048h0.341333l210.397867-0.682666a40.004267 40.004267 0 0 0 39.662933-32.836267 40.5504 40.5504 0 0 0-8.3968-31.9488 38.5024 38.5024 0 0 0-29.0816-14.062933h-0.4096l-65.3312 0.273066c-20.821333 0-30.5152-26.8288-14.813867-40.482133 58.094933-43.690667 128.6144-69.085867 199.133867-69.085867 183.637333 0 333.0048 153.8048 333.0048 342.698667 0 189.098667-149.367467 342.8352-333.0048 342.8352s-333.0048-153.736533-333.0048-342.766933c0-10.513067-4.096-20.48-11.264-27.921067a37.751467 37.751467 0 0 0-54.135467 0A40.004267 40.004267 0 0 0 102.4 534.186667C102.4 766.634667 286.1056 955.733333 512 955.733333s409.6-189.098667 409.6-421.546666-183.7056-421.614933-409.6-421.614934" fill="#999999" p-id="6117"></path></svg>
      </button>
    </header>

    <!-- 顶部操作栏 -->
    <div class="action-bar">
      <button type="button" class="action-btn primary" @click="handleEnableAll(true)">
        启用全部
      </button>
      <button type="button" class="action-btn" @click="handleEnableAll(false)">
        弃用全部
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

            <!-- 快捷插入按钮 -->
            <div class="macro-bar">
              <button
                v-for="macro in macroButtons"
                :key="macro"
                type="button"
                class="macro-btn"
                @click="insertMacro(prompt.id, macro)"
              >
                {{ macro }}
              </button>
            </div>

            <!-- 可编辑文本区 -->
            <div class="prompt-editor">
              <textarea
                :ref="(el) => setTextareaRef(prompt.id, el)"
                :value="promptEdits[prompt.id]"
                placeholder="请输入系统提示词..."
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import type { SystemPrompt } from '@/types/system-prompt'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()
const settingsStore = useSettingsStore()

// ============ 状态 ============
const promptEdits = ref<Record<string, string>>({})
const expandedCategories = ref<Set<string>>(new Set())
const importInputRef = ref<HTMLInputElement | null>(null)
const textareaRefs = ref<Record<string, HTMLTextAreaElement>>({})

const macroButtons = ['{{char}}', '{{user}}', '{{time}}', '{{date}}', '{{idle_duration}}', '{{original}}']

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

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
  'game',
]
const numeralNames = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

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
})

// ============ 方法 ============
function syncEdits(preserveEditing = true) {
  for (const p of settingsStore.systemPrompts) {
    if (preserveEditing && saveTimers.has(p.id)) continue
    promptEdits.value[p.id] = p.basicPrompt
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

function setTextareaRef(id: string, el: unknown) {
  if (el) {
    textareaRefs.value[id] = el as HTMLTextAreaElement
  }
}

function insertMacro(id: string, macro: string) {
  const textarea = textareaRefs.value[id]
  if (!textarea) return

  const value = promptEdits.value[id] ?? ''
  const isFocused = document.activeElement === textarea
  const start = isFocused ? textarea.selectionStart ?? value.length : value.length
  const end = isFocused ? textarea.selectionEnd ?? value.length : value.length

  const newValue = value.slice(0, start) + macro + value.slice(end)
  textarea.value = newValue

  nextTick(() => {
    const cursor = start + macro.length
    textarea.selectionStart = cursor
    textarea.selectionEnd = cursor
    textarea.focus()
  })

  onTextInput(id, { target: textarea } as unknown as Event)
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
    settingsStore.updatePrompt(id, { basicPrompt: value } as Partial<Pick<SystemPrompt, 'enabled' | 'basicPrompt'>>)
    saveTimers.delete(id)
    showSaveStatus('已保存', false)
  }, 1000)

  saveTimers.set(id, timer)
}

function showSaveStatus(text: string, _saving: boolean) {
  if (!_saving && text) {
    uni.showToast({ title: text, icon: 'success', duration: 900 })
  }
}

function handleEnableAll(enabled: boolean) {
  settingsStore.toggleAllEnabled(enabled)
  syncEdits(true)
  uni.showToast({ title: enabled ? '已全部启用' : '已全部弃用', icon: 'success' })
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
  grid-template-columns: 48px minmax(0, 1fr) 48px;
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

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 6px;
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

.reset-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition:
    background var(--transition-base),
    color var(--transition-base),
    transform var(--transition-base);
}

.reset-icon-btn svg {
  width: 22px;
  height: 22px;
}

.reset-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.reset-icon-btn:active {
  transform: rotate(-18deg);
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
  border-radius: 5px;
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
  border-radius: 8px;
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
  border-radius: 6px;
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
  border-radius: 6px;
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

// ---------- Macro Bar ----------
.macro-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.macro-btn {
  padding: 4px 10px;
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.08);
  color: var(--primary-light);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-base);
}

.macro-btn:hover {
  background: rgba(56, 189, 248, 0.16);
  border-color: rgba(56, 189, 248, 0.35);
  transform: translateY(-1px);
}

// ---------- Textarea ----------
.prompt-editor textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
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
