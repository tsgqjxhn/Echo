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
      <section v-if="showHistory" class="history-panel">
        <div class="section-head">
          <h3>历史数据</h3>
          <span class="task-status done">{{ historyTasks.length }} 条</span>
        </div>
        <div v-if="historyTasks.length" class="history-list">
          <button v-for="task in historyTasks" :key="task.id" type="button" class="history-item" @click="openHistoryTask(task.id)">
            <span class="history-title">{{ task.title }}</span>
            <span class="history-meta">{{ task.mode === 'create' ? '创建记录' : '导入记录' }} · {{ formatHistoryTime(task.createdAt) }}</span>
          </button>
        </div>
        <p v-else class="empty-copy">暂无历史游戏导入记录和创建记录。</p>
      </section>

      <section v-else-if="!activeTask || activeTask.phase === 'error'" class="input-panel">
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

        <!-- 游戏大纲 -->
        <section v-if="activeTask.mode === 'create'" class="stream-section">
          <div class="section-head">
            <h3>游戏大纲</h3>
            <span v-if="activeTask.phase === 'drafting-outline'" class="streaming-dot">生成中</span>
          </div>

          <!-- 生成中 -->
          <pre v-if="activeTask.phase === 'drafting-outline'" class="stream-output">{{ activeTask.outline || '正在生成…' }}</pre>

          <!-- 等待确认 -->
          <template v-else-if="activeTask.phase === 'awaiting-outline-confirmation'">
            <!-- 手动编辑模式 -->
            <template v-if="editingOutline">
              <textarea v-model="editableOutline" class="source-input edit-area" rows="12" />
              <div class="action-row">
                <button class="soft-btn" @click="cancelEditOutline">取消</button>
                <button class="primary-btn small" @click="saveOutline">保存修改</button>
              </div>
            </template>

            <!-- AI 反馈模式 -->
            <template v-else-if="showAiFeedback === 'outline'">
              <pre class="stream-output">{{ activeTask.outline }}</pre>
              <textarea v-model="aiFeedback" class="source-input edit-area" rows="4" placeholder="请输入修改意见（可选）…" />
              <div class="action-row">
                <button class="soft-btn" @click="showAiFeedback = null">取消</button>
                <button class="primary-btn small" :disabled="isActiveTaskRunning" @click="submitAiOutlineFeedback">AI 重新生成</button>
              </div>
            </template>

            <!-- 默认：三按钮 -->
            <template v-else>
              <pre class="stream-output">{{ activeTask.outline }}</pre>
              <div class="action-row three-btn-row">
                <button class="soft-btn" @click="startEditOutline">手动修改</button>
                <button class="soft-btn" @click="showAiFeedback = 'outline'">AI 修改</button>
                <button class="primary-btn small" @click="gameGenerationStore.confirmOutline(activeTask.id)">继续创建游戏</button>
              </div>
            </template>
          </template>

          <!-- 后续阶段仅展示 -->
          <pre v-else class="stream-output">{{ activeTask.outline }}</pre>
        </section>

        <!-- 游戏实现 -->
        <section v-if="activeTask.output || activeTask.phase === 'generating-game' || activeTask.mode === 'import'" class="stream-section">
          <div class="section-head">
            <h3>游戏实现</h3>
            <span v-if="activeTask.phase === 'generating-game'" class="streaming-dot">生成中</span>
          </div>

          <!-- 生成中 -->
          <pre v-if="activeTask.phase === 'generating-game'" class="stream-output">{{ activeTask.output || '正在生成…' }}</pre>

          <!-- 完成 -->
          <template v-else-if="activeTask.phase === 'done'">
            <!-- 文件详情 / 编辑视图 -->
            <template v-if="selectedFile">
              <div class="file-detail-header">
                <button class="back-btn small" @click="selectedFile = null">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
                  </svg>
                  返回目录
                </button>
                <span class="file-path">{{ selectedFile.path }}</span>
              </div>
              <template v-if="manualEditMode">
                <textarea v-model="editableFileContent" class="source-input edit-area file-editor" rows="18" />
                <div class="action-row">
                  <button class="soft-btn" @click="cancelFileEdit">取消</button>
                  <button class="primary-btn small" @click="saveFileEdit">保存</button>
                </div>
              </template>
              <pre v-else class="stream-output file-content">{{ selectedFile.content }}</pre>
            </template>

            <!-- AI 反馈模式 -->
            <template v-else-if="showAiFeedback === 'game'">
              <div class="action-row" style="margin-bottom: 12px;">
                <button class="soft-btn" @click="showAiFeedback = null">返回</button>
              </div>
              <pre class="stream-output">{{ activeTask.output }}</pre>
              <textarea v-model="aiFeedback" class="source-input edit-area" rows="4" placeholder="请输入修改意见（可选）…" />
              <div class="action-row">
                <button class="soft-btn" @click="showAiFeedback = null">取消</button>
                <button class="primary-btn small" :disabled="isActiveTaskRunning" @click="submitAiGameFeedback">AI 重新生成</button>
              </div>
            </template>

            <!-- 最终预览模式 -->
            <template v-else-if="finalPreview">
              <div class="action-row" style="margin-bottom: 12px;">
                <button class="soft-btn" @click="finalPreview = false">返回目录</button>
              </div>
              <iframe v-if="htmlPreview" class="game-preview" :srcdoc="htmlPreview" sandbox="allow-scripts allow-same-origin allow-forms allow-modals" />
              <pre v-else class="stream-output">{{ activeTask.output }}</pre>
              <button type="button" class="primary-btn import-btn" @click="importToLibrary">
                导入游戏库
              </button>
            </template>

            <!-- 默认：目录树 + 三按钮 -->
            <template v-else>
              <div class="action-row three-btn-row">
                <button class="soft-btn" @click="enableManualEdit">手动修改</button>
                <button class="soft-btn" @click="showAiFeedback = 'game'">AI 修改</button>
                <button class="primary-btn small" @click="finalPreview = true">继续创建游戏</button>
              </div>

              <!-- 文件树 -->
              <div v-if="fileTree.length" class="file-tree">
                <template v-for="node in fileTree" :key="node.path">
                  <div
                    v-if="isNodeVisible(node)"
                    class="tree-node"
                    :style="{ paddingLeft: `${node.depth * 18}px` }"
                  >
                    <button v-if="node.type === 'directory'" class="tree-toggle" @click="toggleTreeNode(node.path)">
                      <svg v-if="treeExpanded.has(node.path)" viewBox="0 0 24 24" width="14" height="14">
                        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      </svg>
                      <svg v-else viewBox="0 0 24 24" width="14" height="14">
                        <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      </svg>
                      <span>{{ node.name }}</span>
                    </button>
                    <button v-else class="tree-file" @click="openFile(node.file!)">
                      <svg viewBox="0 0 24 24" width="14" height="14">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      <span>{{ node.name }}</span>
                    </button>
                  </div>
                </template>
              </div>
              <pre v-else class="stream-output">{{ activeTask.output }}</pre>
            </template>
          </template>

          <!-- 其他阶段 -->
          <pre v-else class="stream-output">{{ activeTask.output }}</pre>
        </section>

        <section v-if="htmlPreview && activeTask.phase !== 'done'" class="preview-section">
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
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { readGameInputFiles } from '@/services/game-file-reader'
import { useGameGenerationStore } from '@/stores/game-generation'
import type { ParsedGameFile } from '@/stores/game-generation'
import { uni } from '@/utils/uni-polyfill'
import { saveGeneratedGame } from '@/services/generated-game-library'
import { resolveImportableHtml } from '@/services/game-import-html'

const route = useRoute()
const router = useRouter()
const gameGenerationStore = useGameGenerationStore()

const sourceText = ref('')
const fileText = ref('')
const fileNames = ref<string[]>([])
const uploadFileEntries = ref<Array<{ path: string; text: string }>>([])
const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const showPreview = ref(false)

/* ── 大纲阶段状态 ── */
const editingOutline = ref(false)
const editableOutline = ref('')
const showAiFeedback = ref<'outline' | 'game' | null>(null)
const aiFeedback = ref('')

/* ── 游戏实现阶段状态 ── */
const finalPreview = ref(false)
const manualEditMode = ref(false)
const selectedFile = ref<ParsedGameFile | null>(null)
const editableFileContent = ref('')
const treeExpanded = ref<Set<string>>(new Set(['/']))

interface TreeNode {
  path: string
  name: string
  type: 'directory' | 'file'
  depth: number
  file?: ParsedGameFile
}

const mode = computed(() => route.query.mode === 'import' ? 'import' : 'create')
const showHistory = computed(() => route.query.history === '1')
const activeTask = computed(() => gameGenerationStore.activeTask)
const historyTasks = computed(() => gameGenerationStore.taskList)
const isActiveTaskRunning = computed(() => gameGenerationStore.isActiveTaskRunning)
const pageTitle = computed(() => showHistory.value ? '历史数据' : activeTask.value?.title || (mode.value === 'create' ? '创建游戏' : '导入游戏'))

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
  const task = activeTask.value
  if (!task) return ''
  return resolveImportableHtml({
    output: task.output,
    parsedFiles: task.parsedFiles,
  })
})

/* ── 文件树 ── */
const fileTree = computed<TreeNode[]>(() => {
  const files = activeTask.value?.parsedFiles || []
  if (!files.length) return []

  const nodes: TreeNode[] = []
  const dirsAdded = new Set<string>()

  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean)
    let currentPath = ''
    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1
      currentPath += '/' + part
      if (!isLast) {
        if (!dirsAdded.has(currentPath)) {
          dirsAdded.add(currentPath)
          nodes.push({ path: currentPath, name: part, type: 'directory', depth: idx })
        }
      } else {
        nodes.push({ path: currentPath, name: part, type: 'file', depth: idx, file })
      }
    })
  })

  return nodes
})

function isNodeVisible(node: TreeNode): boolean {
  if (node.depth === 0) return true
  const parts = node.path.split('/').filter(Boolean)
  let parentPath = ''
  for (let i = 0; i < parts.length - 1; i++) {
    parentPath += '/' + parts[i]
    if (!treeExpanded.value.has(parentPath)) return false
  }
  return true
}

function toggleTreeNode(path: string) {
  const next = new Set(treeExpanded.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  treeExpanded.value = next
}

function openFile(file: ParsedGameFile) {
  selectedFile.value = file
  editableFileContent.value = file.content
}

/* ── 大纲编辑 ── */
function startEditOutline() {
  editableOutline.value = activeTask.value?.outline || ''
  editingOutline.value = true
}
function cancelEditOutline() {
  editingOutline.value = false
}
function saveOutline() {
  const task = activeTask.value
  if (!task) return
  gameGenerationStore.patchTask(task.id, { outline: editableOutline.value.trim() })
  editingOutline.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

/* ── AI 反馈 ── */
function submitAiOutlineFeedback() {
  const task = activeTask.value
  if (!task) return
  showAiFeedback.value = null
  gameGenerationStore.regenerateOutline(task.id, aiFeedback.value)
  aiFeedback.value = ''
}
function submitAiGameFeedback() {
  const task = activeTask.value
  if (!task) return
  showAiFeedback.value = null
  gameGenerationStore.regenerateGame(task.id, aiFeedback.value)
  aiFeedback.value = ''
}

/* ── 游戏实现阶段 ── */
function enableManualEdit() {
  manualEditMode.value = true
  uni.showToast({ title: '点击文件即可编辑', icon: 'none' })
}
function cancelFileEdit() {
  editableFileContent.value = selectedFile.value?.content || ''
}
function saveFileEdit() {
  const task = activeTask.value
  const file = selectedFile.value
  if (!task || !file) return
  const newFiles = task.parsedFiles.map(f =>
    f.path === file.path ? { ...f, content: editableFileContent.value } : f
  )
  gameGenerationStore.patchTask(task.id, { parsedFiles: newFiles })
  selectedFile.value = { ...file, content: editableFileContent.value }
  uni.showToast({ title: '已保存', icon: 'success' })
}

/* ── 导入游戏库 ── */
function importToLibrary() {
  const task = activeTask.value
  if (!task) return
  const html = resolveImportableHtml({
    output: task.output,
    parsedFiles: task.parsedFiles,
  })
  if (!html.trim()) {
    uni.showToast({ title: '无可导入内容', icon: 'none' })
    return
  }
  const triggerType = task.mode === 'import' && task.fileNames.length > 12 ? 'external' : 'embedded'
  saveGeneratedGame({
    title: task.title,
    html,
    description: `由 AI 生成的游戏：${task.title}`,
    sourceTaskId: task.id,
    triggerType,
  })
  uni.showToast({ title: '已导入游戏库', icon: 'success' })
}

/* ── 路由监听 ── */
watch(
  () => route.query.task,
  taskId => {
    if (typeof taskId === 'string') {
      gameGenerationStore.setActiveTask(taskId)
    }
  },
  { immediate: true }
)

watch(activeTask, (task) => {
  if (!task) {
    editingOutline.value = false
    showAiFeedback.value = null
    finalPreview.value = false
    manualEditMode.value = false
    selectedFile.value = null
    treeExpanded.value = new Set(['/'])
  }
})

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
    uploadFileEntries.value = bundle.files.map(file => ({ path: file.path, text: file.text }))
  } catch (error) {
    uni.showToast({ title: (error as Error).message || '读取文件失败', icon: 'none' })
  } finally {
    input.value = ''
  }
}

function clearFiles() {
  fileText.value = ''
  fileNames.value = []
  uploadFileEntries.value = []
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
    : gameGenerationStore.startImport({
      sourceText: text,
      fileNames: fileNames.value,
      uploadFiles: uploadFileEntries.value,
    })

  router.replace(`/game/generate?mode=${mode.value}&task=${taskId}`)
}

function openHistoryTask(taskId: string) {
  const task = gameGenerationStore.tasks[taskId]
  if (!task) return
  gameGenerationStore.setActiveTask(taskId)
  router.replace(`/game/generate?mode=${task.mode}&task=${taskId}`)
}

function formatHistoryTime(value: number): string {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function startAnother() {
  sourceText.value = ''
  fileText.value = ''
  fileNames.value = []
  uploadFileEntries.value = []
  showPreview.value = false
  editingOutline.value = false
  showAiFeedback.value = null
  finalPreview.value = false
  manualEditMode.value = false
  selectedFile.value = null
  gameGenerationStore.activeTaskId = ''
  router.replace(`/game/generate?mode=${mode.value}`)
}

/* ── 生命周期 ── */
onDeactivated(() => {
  // keep-alive 失活时不做取消，保持生成任务在后台继续运行
  console.log('[game generate] page deactivated')
})

onUnmounted(() => {
  // 真正销毁时清理当前任务的流
  const taskId = gameGenerationStore.activeTaskId
  if (taskId) {
    gameGenerationStore.cancelTask(taskId)
  }
})
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

  &.small {
    width: auto;
    height: 34px;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
    color: var(--text-secondary);
  }
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
.history-panel,
.stream-section,
.preview-section {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  background: rgba(8, 12, 20, 0.72);
}

.input-panel,
.task-panel,
.history-panel {
  padding: 16px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
}

.history-title {
  color: var(--text-primary);
  font-weight: 700;
}

.history-meta,
.empty-copy {
  color: var(--text-tertiary);
  font-size: 12px;
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
  border-radius: 4px;
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

  &.edit-area {
    min-height: 120px;
    margin-top: 12px;
  }

  &.file-editor {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
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
  border-radius: 4px;
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

  &.small {
    width: auto;
    padding: 0 16px;
    margin-top: 0;
  }

  &.import-btn {
    margin-top: 14px;
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
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.28);
  color: #dce7f3;
  font: 13px/1.7 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;

  &.file-content {
    margin-top: 12px;
  }
}

.game-preview {
  width: 100%;
  min-height: min(68vh, 680px);
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: #fff;
}

.error-copy {
  margin: 12px 0 0;
  color: #fca5a5;
}

/* ── 操作按钮行 ── */
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.three-btn-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .soft-btn,
  .primary-btn.small {
    width: 100%;
  }
}

/* ── 文件树 ── */
.file-tree {
  margin-top: 14px;
  padding: 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.28);
}

.tree-node {
  display: flex;
  align-items: center;
}

.tree-toggle,
.tree-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 4px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tree-toggle:hover,
.tree-file:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.tree-file {
  color: #9eead7;
}

/* ── 文件详情头部 ── */
.file-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.file-path {
  color: var(--text-secondary);
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

@media (max-width: 720px) {
  .three-btn-row {
    grid-template-columns: 1fr;
  }
}
</style>
