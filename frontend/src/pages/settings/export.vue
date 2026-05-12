<template>
  <div class="data-page">
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
      <h1 class="page-title">数据导入导出</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <div class="view-switcher" role="tablist" aria-label="导入导出切换">
      <button
        type="button"
        class="view-switch-btn"
        :class="{ active: activeDataView === 'export' }"
        :aria-pressed="activeDataView === 'export'"
        @click="setActiveDataView('export')"
      >
        导出
      </button>
      <button
        type="button"
        class="view-switch-btn"
        :class="{ active: activeDataView === 'import' }"
        :aria-pressed="activeDataView === 'import'"
        @click="setActiveDataView('import')"
      >
        导入
      </button>
    </div>

    <section v-if="activeDataView === 'export'" class="summary-grid">
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

    <section v-if="activeDataView === 'export'" class="panel-grid">
      <article
        ref="exportCardRef"
        class="content-card"
        :class="{ focused: highlightedPanel === 'export' }"
      >
        <div class="section-head export-head">
          <p class="section-title">标准导出</p>
          <span class="section-note">导出除 API 密钥外的所有数据（用户信息、角色、会话记录、游戏进度等）</span>
        </div>

        <button type="button" class="primary-btn" :disabled="isBusy" @click="handleStandardExport">
          导出当前数据
        </button>
      </article>

      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">完整备份</p>
          <span class="section-note">备份所有数据，包含 API 配置等敏感信息</span>
        </div>

        <button type="button" class="primary-btn" :disabled="isBusy" @click="handleBackupExport">
          下载完整备份
        </button>
      </article>
    </section>

    <section
      v-if="activeDataView === 'import'"
      ref="importCardRef"
      class="content-card import-card"
      :class="{ focused: highlightedPanel === 'import' }"
    >
      <div class="section-head">
        <div>
          <p class="section-title">导入与恢复</p>
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

const importMode = ref<'merge' | 'replace'>('merge')
const activeDataView = ref<'export' | 'import'>('export')
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

  if (action === 'import' || action === 'export') {
    activeDataView.value = action
  }

  await nextTick()

  const target = action === 'import' ? importCardRef.value : action === 'export' ? exportCardRef.value : null
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function setActiveDataView(view: 'export' | 'import') {
  activeDataView.value = view
  highlightedPanel.value = view
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
      const task = await exportService.exportStandard()
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
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header,
.summary-card,
.content-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

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
  border: none;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
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

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
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

.back-btn {
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  box-shadow: none;
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.back-btn:hover {
  opacity: 0.78;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-icon {
  width: 22px;
  height: 22px;
  color: currentColor;
  overflow: visible;
}

.view-switcher {
  width: min(1080px, calc(100% - 32px));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 12px auto 18px;
}

.view-switch-btn {
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    background var(--transition-base),
    color var(--transition-base),
    border-color var(--transition-base);
}

.view-switch-btn:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
}

.view-switch-btn.active {
  border-color: rgba(125, 211, 252, 0.28);
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.24), rgba(56, 189, 248, 0.18));
  color: var(--text-primary);
  box-shadow: 0 12px 30px rgba(56, 189, 248, 0.16);
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
  width: min(1080px, calc(100% - 32px));
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 18px auto;
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
  width: min(1080px, calc(100% - 32px));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0 auto;
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

.export-head {
  align-items: baseline;
  gap: 16px;
}

.section-title {
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.section-note {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
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
  width: min(1080px, calc(100% - 32px));
  margin: 16px auto 0;
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

  .export-head {
    gap: 6px;
  }

  .section-note {
    text-align: left;
  }
}

@media (max-width: 760px) {
  .summary-grid,
  .panel-grid,
  .format-list {
    grid-template-columns: 1fr;
  }

  .page-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .view-switcher {
    width: calc(100% - 20px);
  }

  .import-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid,
  .panel-grid,
  .import-card {
    width: calc(100% - 20px);
  }
}
</style>
