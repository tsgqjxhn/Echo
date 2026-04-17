<template>
  <div class="data-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">数据管理</p>
        <h1>导出、备份和导入都放在这里</h1>
        <p class="header-copy">
          这里可以导出当前资料，也可以完整备份角色、聊天记录和配置数据。导入时支持合并导入与替换恢复两种方式。
        </p>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <section class="summary-grid">
      <article class="summary-card">
        <span>角色数量</span>
        <strong>{{ stats.characterCount }}</strong>
      </article>
      <article class="summary-card">
        <span>会话数量</span>
        <strong>{{ stats.sessionCount }}</strong>
      </article>
      <article class="summary-card">
        <span>消息数量</span>
        <strong>{{ stats.messageCount }}</strong>
      </article>
      <article class="summary-card">
        <span>API 配置</span>
        <strong>{{ stats.apiConfigCount }}</strong>
      </article>
    </section>

    <section class="panel-grid">
      <article
        ref="exportCardRef"
        class="content-card"
        :class="{ focused: highlightedPanel === 'export' }"
      >
        <p class="section-title">标准导出</p>
        <p class="section-copy">
          导出角色、会话、消息和用户资料。`JSON` 适合后续导入恢复，`Markdown` 更适合查看整理或分享内容。
        </p>

        <div class="format-list">
          <button
            type="button"
            class="format-card"
            :class="{ active: selectedFormat === 'json' }"
            @click="selectedFormat = 'json'"
          >
            <strong>JSON</strong>
            <span>结构化导出，可再次导入。</span>
          </button>

          <button
            type="button"
            class="format-card"
            :class="{ active: selectedFormat === 'markdown' }"
            @click="selectedFormat = 'markdown'"
          >
            <strong>Markdown</strong>
            <span>更易阅读，适合查看与归档。</span>
          </button>
        </div>

        <button type="button" class="primary-btn" :disabled="isBusy" @click="handleStandardExport">
          导出当前数据
        </button>
      </article>

      <article class="content-card">
        <p class="section-title">完整备份</p>
        <p class="section-copy">
          在标准导出的基础上，额外保留 API 配置、游戏设置和游戏状态，适合迁移设备或进行完整恢复。
        </p>

        <div class="badge-row">
          <span class="badge">API 配置</span>
          <span class="badge">游戏设置</span>
          <span class="badge">游戏状态</span>
          <span class="badge">用户资料</span>
        </div>

        <button type="button" class="primary-btn" :disabled="isBusy" @click="handleBackupExport">
          下载完整备份
        </button>
      </article>
    </section>

    <section
      ref="importCardRef"
      class="content-card import-card"
      :class="{ focused: highlightedPanel === 'import' }"
    >
      <div class="section-head">
        <div>
          <p class="section-title">导入与恢复</p>
          <p class="section-copy">
            支持导入标准 JSON 导出文件和完整备份文件。合并模式会保留本地已有数据，替换模式会先清空再恢复。
          </p>
        </div>

        <label class="mode-field">
          <span>导入模式</span>
          <select v-model="importMode">
            <option value="merge">合并导入</option>
            <option value="replace">替换恢复</option>
          </select>
        </label>
      </div>

      <input
        ref="fileInput"
        class="file-input"
        type="file"
        accept=".json,application/json"
        @change="onFileChange"
      />

      <div class="import-actions">
        <button type="button" class="ghost-btn" :disabled="isBusy" @click="openFilePicker">
          选择 JSON 文件
        </button>
        <span class="file-name">{{ selectedFileName || '尚未选择文件' }}</span>
      </div>

      <button
        type="button"
        class="primary-btn"
        :disabled="!selectedFile || isBusy"
        @click="handleImport"
      >
        开始导入
      </button>

      <p class="tip-text">
        导入成功后，当前页面统计会自动刷新；如果你导入了主题或 API 配置，也会同步到当前运行环境。
      </p>
    </section>

    <Loading :visible="isBusy" :message="busyMessage" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Loading from '@/components/Loading/index.vue'
import { dataManagementService } from '@/services/data-management'
import { handleError } from '@/services/error-handler'
import { exportService } from '@/services/export'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'

type HighlightPanel = '' | 'export' | 'import'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()

const selectedFormat = ref<'json' | 'markdown'>('json')
const importMode = ref<'merge' | 'replace'>('merge')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const exportCardRef = ref<HTMLElement | null>(null)
const importCardRef = ref<HTMLElement | null>(null)
const highlightedPanel = ref<HighlightPanel>('')
const isBusy = ref(false)
const busyMessage = ref('')

const stats = ref({
  characterCount: 0,
  sessionCount: 0,
  messageCount: 0,
  apiConfigCount: 0,
  gameStateCount: 0
})

const selectedFileName = computed(() => selectedFile.value?.name || '')

onMounted(async () => {
  await refreshOverview()
})

watch(
  () => route.query.action,
  action => {
    void focusActionPanel(typeof action === 'string' ? action : '')
  },
  { immediate: true }
)

async function focusActionPanel(action: string) {
  highlightedPanel.value = action === 'import' || action === 'export' ? action : ''
  await nextTick()

  const target = action === 'import' ? importCardRef.value : action === 'export' ? exportCardRef.value : null
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function runBusyTask<T>(message: string, task: () => Promise<T>): Promise<T> {
  isBusy.value = true
  busyMessage.value = message

  try {
    return await task()
  } finally {
    isBusy.value = false
    busyMessage.value = ''
  }
}

async function refreshOverview() {
  stats.value = await dataManagementService.getOverview()
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

function resetSelectedFile() {
  selectedFile.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function confirmReplaceImport(): Promise<boolean> {
  if (importMode.value !== 'replace') {
    return Promise.resolve(true)
  }

  return new Promise(resolve => {
    uni.showModal({
      title: '替换恢复',
      content: '替换恢复会先清空当前本地数据，再导入所选文件，是否继续？',
      success: result => resolve(result.confirm)
    })
  })
}

async function syncApplicationState() {
  await Promise.all([
    refreshOverview(),
    userStore.loadUserInfo(),
    gameStore.initializeSettings(),
    settingsStore.loadTheme()
  ])

  settingsStore.applyTheme(settingsStore.theme)
}

async function handleStandardExport() {
  if (stats.value.characterCount === 0 && stats.value.sessionCount === 0) {
    uni.showToast({ title: '当前没有可导出的数据', icon: 'none' })
    return
  }

  try {
    await runBusyTask('正在生成导出文件...', async () => {
      const task = await exportService.exportStandard(
        selectedFormat.value === 'json' ? 'json' : 'md'
      )
      await exportService.downloadTask(task)
    })

    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (error) {
    handleError(error)
  }
}

async function handleBackupExport() {
  try {
    await runBusyTask('正在生成完整备份...', async () => {
      const task = await exportService.exportFull()
      await exportService.downloadTask(task)
    })

    uni.showToast({ title: '完整备份已下载', icon: 'success' })
  } catch (error) {
    handleError(error)
  }
}

async function handleImport() {
  if (!selectedFile.value) {
    uni.showToast({ title: '请先选择一个 JSON 文件', icon: 'none' })
    return
  }

  const confirmed = await confirmReplaceImport()
  if (!confirmed) {
    return
  }

  try {
    const summary = await runBusyTask('正在导入数据...', async () => {
      return dataManagementService.importFromFile(selectedFile.value as File, {
        mode: importMode.value
      })
    })

    resetSelectedFile()
    await syncApplicationState()

    uni.showToast({
      title: `已导入 ${summary.characterCount} 个角色 / ${summary.sessionCount} 个会话`,
      icon: 'success'
    })
  } catch (error) {
    handleError(error)
  }
}
</script>

<style lang="scss" scoped>
.data-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 25%),
    linear-gradient(180deg, rgb(8, 9, 10) 0%, rgb(11, 12, 14) 54%, rgb(16, 18, 20) 100%);
}

.page-header,
.summary-card,
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(22, 24, 27, 0.94), rgba(10, 11, 13, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 32px;
}

.eyebrow {
  color: rgba(226, 232, 240, 0.7);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin: 12px 0 10px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 40px);
}

.header-copy,
.section-copy,
.tip-text {
  color: var(--text-secondary);
  line-height: 1.8;
}

.ghost-btn,
.primary-btn,
.format-card {
  min-height: 46px;
  border-radius: 18px;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background var(--transition-base);
}

.ghost-btn {
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.primary-btn {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, rgba(181, 189, 198, 0.92), rgba(111, 119, 128, 0.94));
  color: #060708;
  font-weight: 700;
}

.ghost-btn:hover,
.primary-btn:hover,
.format-card:hover {
  transform: translateY(-2px);
}

.ghost-btn:disabled,
.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.summary-card {
  padding: 20px;
  border-radius: 24px;
}

.summary-card span {
  display: block;
  margin-bottom: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.summary-card strong {
  color: var(--text-primary);
  font-size: 24px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.content-card {
  padding: 26px;
  border-radius: 30px;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-base);
}

.content-card.focused {
  border-color: rgba(216, 224, 232, 0.26);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(216, 224, 232, 0.08);
  transform: translateY(-2px);
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.section-title {
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.format-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 22px 0 20px;
}

.format-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  text-align: left;
}

.format-card strong {
  color: var(--text-primary);
  font-size: 20px;
}

.format-card.active {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 24px 0 20px;
}

.badge {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 12px;
}

.import-card {
  margin-top: 16px;
}

.mode-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  color: var(--text-secondary);
}

.mode-field select {
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
}

.file-input {
  display: none;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.file-name {
  color: var(--text-primary);
  word-break: break-all;
}

.tip-text {
  margin-top: 12px;
  font-size: 13px;
}

@media (max-width: 960px) {
  .summary-grid,
  .panel-grid {
    grid-template-columns: 1fr 1fr;
  }

  .section-head {
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .data-page {
    padding: 16px;
  }

  .summary-grid,
  .panel-grid,
  .format-list {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }

  .import-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
