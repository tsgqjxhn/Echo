<template>
  <div class="game-generate-page">
    <header class="generate-header">
      <button class="back-btn" type="button" aria-label="返回" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1>{{ pageTitle }}</h1>
      <span class="task-status" :class="statusClass">{{ statusText }}</span>
    </header>

    <main class="generate-main">
      <section v-if="!activeTask || activeTask.phase === 'error'" class="input-panel">
        <div class="field-block">
          <label>{{ mode === 'create' ? '游戏规则' : '游戏说明' }}</label>
          <textarea
            v-model="sourceText"
            class="source-input"
            :placeholder="mode === 'create' ? '写下玩法、世界观、胜负条件、角色能力、关卡目标…' : '可选：补充导入文件的玩法说明或修复要求…'"
            rows="8"
          />
        </div>

        <div class="import-actions">
          <button type="button" class="soft-btn" @click="openFilePicker">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>文件</span>
          </button>
          <button type="button" class="soft-btn" @click="openFolderPicker">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>文件夹</span>
          </button>
        </div>

        <input ref="fileInput" type="file" class="hidden-input" accept=".txt,.md,.json,.yaml,.yml,.html,.htm,.css,.js,.ts,.vue,.svg,.png,.jpg,.jpeg,.webp,.gif" multiple @change="onFilesSelected" />
        <input ref="folderInput" type="file" class="hidden-input" webkitdirectory @change="onFilesSelected" />

        <div v-if="fileNames.length" class="file-strip">
          <span v-for="name in fileNames.slice(0, 4)" :key="name" class="file-pill">{{ name }}</span>
          <span v-if="fileNames.length > 4" class="file-pill">+{{ fileNames.length - 4 }}</span>
          <button type="button" class="clear-btn" @click="clearFiles">清除</button>
        </div>

        <button type="button" class="primary-btn" :disabled="!canStart" @click="startGeneration">
          {{ mode === 'create' ? '生成大纲' : '生成游戏' }}
        </button>
      </section>

      <section v-if="activeTask" class="task-panel">
        <div class="task-head">
          <div>
            <span class="task-kicker">{{ activeTask.mode === 'create' ? '创建游戏' : '导入游戏' }}</span>
            <h2>{{ activeTask.title }}</h2>
          </div>
          <button v-if="activeTask.phase === 'done' || activeTask.phase === 'error'" type="button" class="ghost-btn" @click="startAnother">
            新建
          </button>
        </div>

        <div v-if="activeTask.fileNames.length" class="file-strip compact">
          <span v-for="name in activeTask.fileNames.slice(0, 5)" :key="name" class="file-pill">{{ name }}</span>
          <span v-if="activeTask.fileNames.length > 5" class="file-pill">+{{ activeTask.fileNames.length - 5 }}</span>
        </div>

        <section v-if="activeTask.mode === 'create'" class="stream-section">
          <div class="section-head">
            <h3>游戏大纲</h3>
            <span v-if="activeTask.phase === 'drafting-outline'" class="streaming-dot">生成中</span>
          </div>
          <pre class="stream-output">{{ activeTask.outline || '正在生成…' }}</pre>
          <button
            v-if="activeTask.phase === 'awaiting-outline-confirmation'"
            type="button"
            class="primary-btn"
            @click="gameGenerationStore.confirmOutline(activeTask.id)"
          >
            确认大纲并生成游戏
          </button>
        </section>

        <section v-if="activeTask.output || activeTask.phase === 'generating-game' || activeTask.mode === 'import'" class="stream-section">
          <div class="section-head">
            <h3>游戏实现</h3>
            <span v-if="activeTask.phase === 'generating-game'" class="streaming-dot">生成中</span>
          </div>
          <pre class="stream-output">{{ activeTask.output || '正在生成…' }}</pre>
        </section>

        <section v-if="htmlPreview" class="preview-section">
          <div class="section-head">
            <h3>预览</h3>
            <button type="button" class="ghost-btn" @click="showPreview = !showPreview">
              {{ showPreview ? '收起' : '展开' }}
            </button>
          </div>
          <iframe v-if="showPreview" class="game-preview" :srcdoc="htmlPreview" sandbox="allow-scripts allow-same-origin allow-forms allow-modals" />
        </section>

        <p v-if="activeTask.error" class="error-copy">{{ activeTask.error }}</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { readGameInputFiles } from '@/services/game-file-reader'
import { useGameGenerationStore } from '@/stores/game-generation'
import { uni } from '@/utils/uni-polyfill'

const route = useRoute()
const router = useRouter()
const gameGenerationStore = useGameGenerationStore()

const sourceText = ref('')
const fileText = ref('')
const fileNames = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const showPreview = ref(false)

const mode = computed(() => route.query.mode === 'import' ? 'import' : 'create')
const activeTask = computed(() => gameGenerationStore.activeTask)
const pageTitle = computed(() => activeTask.value?.title || (mode.value === 'create' ? '创建游戏' : '导入游戏'))

const canStart = computed(() => sourceText.value.trim().length > 0 || fileText.value.trim().length > 0)

const statusText = computed(() => {
  const task = activeTask.value
  if (!task) return '待输入'
  if (task.phase === 'drafting-outline') return '大纲生成中'
  if (task.phase === 'awaiting-outline-confirmation') return '待确认'
  if (task.phase === 'generating-game') return '游戏生成中'
  if (task.phase === 'done') return '已完成'
  return '失败'
})

const statusClass = computed(() => {
  const phase = activeTask.value?.phase
  return {
    running: phase === 'drafting-outline' || phase === 'generating-game',
    done: phase === 'done' || phase === 'awaiting-outline-confirmation',
    error: phase === 'error',
  }
})

const htmlPreview = computed(() => {
  const output = activeTask.value?.output || ''
  const htmlMatch = output.match(/```html\s*([\s\S]*?)```/i)
  if (htmlMatch?.[1]) return htmlMatch[1].trim()
  const fullHtml = output.match(/<!doctype html[\s\S]*<\/html>/i) || output.match(/<html[\s\S]*<\/html>/i)
  return fullHtml?.[0]?.trim() || ''
})

watch(
  () => route.query.task,
  taskId => {
    if (typeof taskId === 'string') {
      gameGenerationStore.setActiveTask(taskId)
    }
  },
  { immediate: true }
)

function openFilePicker() {
  fileInput.value?.click()
}

function openFolderPicker() {
  folderInput.value?.click()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  try {
    const bundle = await readGameInputFiles(input.files)
    fileText.value = bundle.text
    fileNames.value = bundle.fileNames
  } catch (error) {
    uni.showToast({ title: (error as Error).message || '读取文件失败', icon: 'none' })
  } finally {
    input.value = ''
  }
}

function clearFiles() {
  fileText.value = ''
  fileNames.value = []
}

function buildSourceText() {
  return [
    sourceText.value.trim() ? `玩家说明：\n${sourceText.value.trim()}` : '',
    fileText.value.trim() ? `玩家文件：\n${fileText.value.trim()}` : '',
  ].filter(Boolean).join('\n\n')
}

function startGeneration() {
  const text = buildSourceText()
  if (!text.trim()) return

  const taskId = mode.value === 'create'
    ? gameGenerationStore.startOutline({ sourceText: text, fileNames: fileNames.value })
    : gameGenerationStore.startImport({ sourceText: text, fileNames: fileNames.value })

  router.replace(`/game/generate?mode=${mode.value}&task=${taskId}`)
}

function startAnother() {
  sourceText.value = ''
  fileText.value = ''
  fileNames.value = []
  showPreview.value = false
  gameGenerationStore.activeTaskId = ''
  router.replace(`/game/generate?mode=${mode.value}`)
}
</script>

<style lang="scss" scoped>
.game-generate-page {
  min-height: 100vh;
  background: var(--page-backdrop-soft);
  color: var(--text-primary);
}

.generate-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.back-btn,
.ghost-btn,
.soft-btn {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-status {
  padding: 5px 9px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  font-size: 12px;

  &.running { color: #7dd3fc; }
  &.done { color: #86efac; }
  &.error { color: #fca5a5; }
}

.generate-main {
  width: min(960px, calc(100vw - 28px));
  margin: 0 auto;
  padding: 18px 0 100px;
  display: grid;
  gap: 14px;
}

.input-panel,
.task-panel,
.stream-section,
.preview-section {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(8, 12, 20, 0.72);
}

.input-panel,
.task-panel {
  padding: 16px;
}

.field-block {
  display: grid;
  gap: 8px;

  label {
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.source-input {
  width: 100%;
  min-height: 180px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  line-height: 1.65;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.45);
  }
}

.import-actions,
.file-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.soft-btn,
.primary-btn,
.ghost-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
}

.soft-btn {
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
}

.primary-btn {
  width: 100%;
  margin-top: 14px;
  border: none;
  color: #07111f;
  background: linear-gradient(135deg, #e6f7ff, #b8f7dd);
  font: inherit;
  font-weight: 650;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.ghost-btn {
  padding: 0 12px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
}

.hidden-input {
  display: none;
}

.file-pill {
  max-width: min(260px, 100%);
  padding: 5px 9px;
  border-radius: 999px;
  color: #9eead7;
  background: rgba(52, 211, 153, 0.1);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-btn {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.task-head,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-kicker {
  color: #7dd3fc;
  font-size: 12px;
}

.task-head h2,
.section-head h3 {
  margin: 3px 0 0;
}

.task-head h2 {
  font-size: 20px;
}

.section-head h3 {
  font-size: 15px;
}

.compact {
  margin: 12px 0 0;
}

.stream-section,
.preview-section {
  margin-top: 14px;
  padding: 14px;
}

.streaming-dot {
  color: #7dd3fc;
  font-size: 12px;
}

.stream-output {
  min-height: 160px;
  max-height: 58vh;
  margin: 12px 0 0;
  padding: 14px;
  overflow: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  color: #dce7f3;
  font: 13px/1.7 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.game-preview {
  width: 100%;
  min-height: min(68vh, 680px);
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #fff;
}

.error-copy {
  margin: 12px 0 0;
  color: #fca5a5;
}
</style>
