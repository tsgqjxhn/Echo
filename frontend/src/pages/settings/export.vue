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
      <button
        type="button"
        class="view-switch-btn"
        :class="{ active: activeDataView === 'migrate' }"
        :aria-pressed="activeDataView === 'migrate'"
        @click="setActiveDataView('migrate')"
      >
        迁移
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

      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">自定义导出</p>
          <span class="section-note">选择特定类型的数据进行导出</span>
        </div>

        <button type="button" class="primary-btn" :disabled="isBusy" @click="openCustomPanel">
          自定义导出
        </button>
      </article>

      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">SillyTavern PNG</p>
          <span class="section-note">将所有角色导出为 SillyTavern 兼容的 PNG 卡片（ZIP 压缩包）</span>
        </div>

        <button type="button" class="blue-btn" :disabled="isBusy" @click="handleExportAllPNG">
          导出所有角色为 SillyTavern PNG
        </button>
      </article>

      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">SillyTavern JSON</p>
          <span class="section-note">将所有角色导出为 SillyTavern 兼容的 JSON 卡片（ZIP 压缩包）</span>
        </div>

        <button type="button" class="blue-btn" :disabled="isBusy" @click="handleExportAllJSON">
          导出所有角色为 SillyTavern JSON
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

    <section v-if="activeDataView === 'migrate'" class="panel-grid">
      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">生成二维码</p>
          <span class="section-note">将当前配置数据编码为二维码，用于跨设备迁移</span>
        </div>
        <button type="button" class="primary-btn" :disabled="isBusy" @click="generateQRCode">
          生成二维码
        </button>
      </article>

      <article class="content-card">
        <div class="section-head export-head">
          <p class="section-title">扫描二维码</p>
          <span class="section-note">扫描二维码恢复配置数据</span>
        </div>
        <button type="button" class="primary-btn" :disabled="isBusy" @click="scanQRCode">
          扫描二维码
        </button>
      </article>
    </section>

    <!-- 自定义导出面板 -->
    <Teleport to="body">
      <div v-if="showCustomPanel" class="overlay" @click.self="showCustomPanel = false">
        <div class="custom-panel wide">
          <div class="panel-header">
            <h3>自定义导出</h3>
            <button type="button" class="close-btn" @click="showCustomPanel = false">×</button>
          </div>

          <div class="panel-body">
            <!-- 多选主类别 -->
            <div class="multi-select-group">
              <label class="group-label">导出范围</label>
              <div class="checkbox-row">
                <label class="checkbox-pill" :class="{ active: customScopes.includes('characters') }">
                  <input v-model="customScopes" type="checkbox" value="characters" />
                  <span>角色</span>
                </label>
                <label class="checkbox-pill" :class="{ active: customScopes.includes('sessions') }">
                  <input v-model="customScopes" type="checkbox" value="sessions" />
                  <span>会话</span>
                </label>
                <label class="checkbox-pill" :class="{ active: customScopes.includes('apiConfigs') }">
                  <input v-model="customScopes" type="checkbox" value="apiConfigs" />
                  <span>API 配置</span>
                </label>
                <label class="checkbox-pill" :class="{ active: customScopes.includes('gameStates') }">
                  <input v-model="customScopes" type="checkbox" value="gameStates" />
                  <span>游戏进度</span>
                </label>
                <label class="checkbox-pill" :class="{ active: customScopes.includes('settings') }">
                  <input v-model="customScopes" type="checkbox" value="settings" />
                  <span>设置</span>
                </label>
              </div>
            </div>

            <!-- 细分选择：角色 -->
            <div v-if="customScopes.includes('characters')" class="sub-select-block">
              <div class="sub-select-header">
                <label class="sub-select-all">
                  <input v-model="selectAllCharacters" type="checkbox" @change="toggleAllCharacters" />
                  <span>选择角色</span>
                </label>
                <span class="sub-count">已选 {{ selectedCharacters.length }} / {{ allCharacters.length }}</span>
              </div>
              <div class="select-list">
                <label v-for="c in allCharacters" :key="c.id" class="select-item">
                  <input v-model="selectedCharacters" type="checkbox" :value="c.id" />
                  <span>{{ c.name }}</span>
                </label>
              </div>
            </div>

            <!-- 细分选择：会话 -->
            <div v-if="customScopes.includes('sessions')" class="sub-select-block">
              <div class="sub-select-header">
                <label class="sub-select-all">
                  <input v-model="selectAllSessions" type="checkbox" @change="toggleAllSessions" />
                  <span>选择会话</span>
                </label>
                <span class="sub-count">已选 {{ selectedSessions.length }} / {{ allSessions.length }}</span>
              </div>
              <div class="select-list">
                <label v-for="s in allSessions" :key="s.id" class="select-item">
                  <input v-model="selectedSessions" type="checkbox" :value="s.id" />
                  <span>{{ s.title || '未命名会话' }}</span>
                </label>
              </div>
            </div>

            <!-- 细分选择：游戏 -->
            <div v-if="customScopes.includes('gameStates')" class="sub-select-block">
              <div class="sub-select-header">
                <label class="sub-select-all">
                  <input v-model="selectAllGames" type="checkbox" @change="toggleAllGames" />
                  <span>选择游戏进度</span>
                </label>
                <span class="sub-count">已选 {{ selectedGames.length }} / {{ allGames.length }}</span>
              </div>
              <div class="select-list">
                <label v-for="g in allGames" :key="g.id" class="select-item">
                  <input v-model="selectedGames" type="checkbox" :value="g.id" />
                  <span>{{ formatGameLabel(g) }}</span>
                </label>
              </div>
            </div>

            <!-- API 配置选项 -->
            <label v-if="customScopes.includes('apiConfigs')" class="row toggle-row">
              <span>包含 API 密钥（完整备份模式）</span>
              <input v-model="includeApiKeys" type="checkbox" />
            </label>

            <!-- 设置选项 -->
            <div v-if="customScopes.includes('settings')" class="sub-select-block">
              <label class="group-label">设置项</label>
              <div class="checkbox-row">
                <label class="checkbox-pill" :class="{ active: selectedSettings.includes('chat_defaults') }">
                  <input v-model="selectedSettings" type="checkbox" value="chat_defaults" />
                  <span>聊天默认设置</span>
                </label>
                <label class="checkbox-pill" :class="{ active: selectedSettings.includes('chat_settings') }">
                  <input v-model="selectedSettings" type="checkbox" value="chat_settings" />
                  <span>聊天设置</span>
                </label>
                <label class="checkbox-pill" :class="{ active: selectedSettings.includes('network_settings') }">
                  <input v-model="selectedSettings" type="checkbox" value="network_settings" />
                  <span>网络设置</span>
                </label>
                <label class="checkbox-pill" :class="{ active: selectedSettings.includes('theme') }">
                  <input v-model="selectedSettings" type="checkbox" value="theme" />
                  <span>主题</span>
                </label>
              </div>
            </div>
          </div>

          <button type="button" class="primary-btn" :disabled="isBusy || customScopes.length === 0" @click="handleCustomExport">
            导出选中数据
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 二维码显示面板 -->
    <Teleport to="body">
      <div v-if="showQRPanel" class="overlay" @click.self="showQRPanel = false">
        <div class="qr-panel">
          <div class="panel-header">
            <h3>数据迁移二维码</h3>
            <button type="button" class="close-btn" @click="showQRPanel = false">×</button>
          </div>
          <div class="qr-body">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="迁移二维码" class="qr-image" />
            <p v-else class="qr-loading">正在生成...</p>
            <p class="qr-hint">请用另一台设备的 Echo 应用扫描此二维码</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 二维码扫描输入 -->
    <Teleport to="body">
      <div v-if="showScanPanel" class="overlay" @click.self="showScanPanel = false">
        <div class="qr-panel">
          <div class="panel-header">
            <h3>扫描二维码恢复数据</h3>
            <button type="button" class="close-btn" @click="showScanPanel = false">×</button>
          </div>
          <div class="qr-body">
            <button type="button" class="primary-btn" :disabled="isBusy" @click="startCameraScan">
              打开摄像头扫描
            </button>
            <div class="scan-divider">
              <span>或手动粘贴</span>
            </div>
            <textarea
              v-model="scannedQRContent"
              class="scan-input"
              placeholder="粘贴二维码扫描结果或 Base64 编码的数据..."
              rows="6"
            />
            <button type="button" class="primary-btn" :disabled="isBusy" @click="handleQRImport">
              恢复数据
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 摄像头扫描面板 -->
    <Teleport to="body">
      <div v-if="showCameraPanel" class="overlay" @click.self="closeCameraPanel">
        <div class="qr-panel camera-panel">
          <div class="panel-header">
            <h3>摄像头扫描二维码</h3>
            <button type="button" class="close-btn" @click="closeCameraPanel">×</button>
          </div>
          <div class="qr-body camera-body">
            <video
              ref="cameraVideoRef"
              class="camera-video"
              autoplay
              playsinline
              muted
            />
            <canvas ref="cameraCanvasRef" class="camera-canvas" />
            <p class="camera-hint">将二维码对准摄像头，自动识别</p>
          </div>
        </div>
      </div>
    </Teleport>

    <Loading :visible="isBusy" :message="busyMessage" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import jsQR from 'jsqr'
import { useRoute, useRouter } from 'vue-router'
import Loading from '@/components/Loading/index.vue'
import { dataManagementService } from '@/services/data-management'
import { handleError } from '@/services/error-handler'
import { exportService } from '@/services/export'
import { getStorageDriver } from '@/services/storage'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'
import type { IChatSession } from '@/types/chat'
import type { APIConfig } from '@/types/api-config'
import type { NetworkSettings } from '@/services/network-settings'
import type { StorageGameState } from '@/services/storage'

interface QRCodeMigrationData {
  type: 'echo-migration'
  version: string
  timestamp: number
  data: {
    apiConfigs?: APIConfig[]
    chatDefaults?: Record<string, unknown>
    chatSettings?: Record<string, unknown>
    networkSettings?: NetworkSettings
    characters?: ICharacter[]
  }
}

type HighlightPanel = '' | 'export' | 'import'
type CustomScope = 'characters' | 'sessions' | 'apiConfigs' | 'gameStates' | 'settings'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const importMode = ref<'merge' | 'replace'>('merge')
const activeDataView = ref<'export' | 'import' | 'migrate'>('export')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const exportCardRef = ref<HTMLElement | null>(null)
const importCardRef = ref<HTMLElement | null>(null)
const highlightedPanel = ref<HighlightPanel>('')
const isBusy = ref(false)
const busyMessage = ref('')

const showCustomPanel = ref(false)
const customScopes = ref<CustomScope[]>([])
const selectedCharacters = ref<string[]>([])
const selectedSessions = ref<string[]>([])
const selectedGames = ref<string[]>([])
const includeApiKeys = ref(false)
const selectedSettings = ref<string[]>(['chat_defaults', 'chat_settings', 'network_settings', 'theme'])
const allCharacters = ref<ICharacter[]>([])
const allSessions = ref<IChatSession[]>([])
const allGames = ref<StorageGameState[]>([])
const selectAllCharacters = ref(false)
const selectAllSessions = ref(false)
const selectAllGames = ref(false)

const showQRPanel = ref(false)
const qrDataUrl = ref('')
const showScanPanel = ref(false)
const scannedQRContent = ref('')
const showCameraPanel = ref(false)
const cameraVideoRef = ref<HTMLVideoElement | null>(null)
const cameraCanvasRef = ref<HTMLCanvasElement | null>(null)
let cameraStream: MediaStream | null = null
let scanIntervalId: ReturnType<typeof setInterval> | null = null

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

function setActiveDataView(view: 'export' | 'import' | 'migrate') {
  activeDataView.value = view
  highlightedPanel.value = view === 'export' || view === 'import' ? view : ''
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

/* 自定义导出面板 */
async function openCustomPanel() {
  showCustomPanel.value = true
  customScopes.value = []
  selectedCharacters.value = []
  selectedSessions.value = []
  selectedGames.value = []
  includeApiKeys.value = false
  selectedSettings.value = ['chat_defaults', 'chat_settings', 'network_settings', 'theme']
  selectAllCharacters.value = false
  selectAllSessions.value = false
  selectAllGames.value = false

  const storage = getStorageDriver()
  allCharacters.value = await storage.getAllCharacters()
  allSessions.value = await storage.getAllSessions()
  allGames.value = await storage.getAllGameStates()
}

function toggleAllCharacters() {
  selectedCharacters.value = selectAllCharacters.value ? allCharacters.value.map(c => c.id) : []
}

function toggleAllSessions() {
  selectedSessions.value = selectAllSessions.value ? allSessions.value.map(s => s.id) : []
}

function toggleAllGames() {
  selectedGames.value = selectAllGames.value ? allGames.value.map(g => g.id) : []
}

function formatGameLabel(g: any): string {
  const gameTypeMap: Record<string, string> = {
    escape: '逃跑游戏',
    xiuxian: '修仙',
    hero: '英雄无敌',
    'dark-dorm': '黑暗宿舍',
    chess: '象棋',
    gomoku: '五子棋',
    match3: '消消乐',
    'cut-rope': '割绳子',
    empire: '帝国',
    'survivor-defense': '生存防御',
  }
  const typeLabel = gameTypeMap[g.gameType] || g.gameType
  return `${typeLabel} - ${g.id.slice(0, 8)}`
}

async function handleExportAllPNG() {
  if (stats.value.characterCount === 0) {
    uni.showToast({ title: '当前没有可导出的角色', icon: 'none' })
    return
  }

  try {
    await runBusyTask('正在生成 SillyTavern PNG 导出...', async () => {
      await exportService.exportAllCharactersAsPNG()
    })

    uni.showToast({ title: 'PNG 导出成功', icon: 'success' })
  } catch (error) {
    handleError(error)
  }
}

async function handleExportAllJSON() {
  if (stats.value.characterCount === 0) {
    uni.showToast({ title: '当前没有可导出的角色', icon: 'none' })
    return
  }

  try {
    await runBusyTask('正在生成 SillyTavern JSON 导出...', async () => {
      await exportService.exportAllCharactersAsJSON()
    })

    uni.showToast({ title: 'JSON 导出成功', icon: 'success' })
  } catch (error) {
    handleError(error)
  }
}

async function handleCustomExport() {
  if (customScopes.value.length === 0) {
    uni.showToast({ title: '请至少选择一个导出范围', icon: 'none' })
    return
  }

  try {
    await runBusyTask('正在生成自定义导出...', async () => {
      const task = await exportService.exportCustom({
        characters: customScopes.value.includes('characters') ? selectedCharacters.value : undefined,
        sessions: customScopes.value.includes('sessions') ? selectedSessions.value : undefined,
        games: customScopes.value.includes('gameStates') ? selectedGames.value : undefined,
        includeApiConfigs: customScopes.value.includes('apiConfigs'),
        includeApiKeys: includeApiKeys.value,
        includeSettings: customScopes.value.includes('settings') ? selectedSettings.value : undefined,
      })
      await exportService.downloadTask(task)
    })

    uni.showToast({ title: '自定义导出成功', icon: 'success' })
    showCustomPanel.value = false
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

async function generateQRCode() {
  showQRPanel.value = true
  qrDataUrl.value = ''

  try {
    const QRCode = await import('qrcode')
    const storage = getStorageDriver()
    const [apiConfigs, characters, chatDefaultsRaw, networkSettingsRaw] = await Promise.all([
      storage.getAllAPIConfigs(),
      storage.getAllCharacters(),
      storage.getUserSetting('chat_defaults'),
      storage.getUserSetting('network_settings'),
    ])

    const migrationData: QRCodeMigrationData = {
      type: 'echo-migration',
      version: '1.0',
      timestamp: Date.now(),
      data: {
        apiConfigs: apiConfigs.map(c => ({ ...c, apiKey: c.apiKey ? '[encrypted]' : '' })),
        characters: characters.slice(0, 3),
      }
    }

    if (chatDefaultsRaw) {
      try { migrationData.data.chatDefaults = JSON.parse(chatDefaultsRaw) } catch { /* ignore */ }
    }
    if (networkSettingsRaw) {
      try { migrationData.data.networkSettings = JSON.parse(networkSettingsRaw) } catch { /* ignore */ }
    }

    const json = JSON.stringify(migrationData)
    const compressed = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_match, p1) => String.fromCharCode(Number('0x' + p1))))

    if (compressed.length > 2800) {
      uni.showToast({ title: '数据量过大，仅导出API配置', icon: 'none' })
      migrationData.data.characters = []
      const minimal = btoa(encodeURIComponent(JSON.stringify(migrationData)).replace(/%([0-9A-F]{2})/g, (_match, p1) => String.fromCharCode(Number('0x' + p1))))
      qrDataUrl.value = await QRCode.toDataURL(minimal, { width: 280, margin: 2 })
    } else {
      qrDataUrl.value = await QRCode.toDataURL(compressed, { width: 280, margin: 2 })
    }
  } catch {
    uni.showToast({ title: '二维码生成失败', icon: 'none' })
    showQRPanel.value = false
  }
}

function scanQRCode() {
  showScanPanel.value = true
  scannedQRContent.value = ''
}

async function startCameraScan() {
  showCameraPanel.value = true
  scannedQRContent.value = ''
  await nextTick()

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    cameraStream = stream
    const video = cameraVideoRef.value
    if (!video) return
    video.srcObject = stream
    await video.play()

    const canvas = cameraCanvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    scanIntervalId = window.setInterval(() => {
      if (!video.videoWidth || !video.videoHeight) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        })
        if (code?.data) {
          scannedQRContent.value = code.data
          stopCameraScan()
          showCameraPanel.value = false
          uni.showToast({ title: '扫描成功，点击恢复数据', icon: 'success' })
        }
      } catch {
        // ignore frame errors
      }
    }, 300)
  } catch {
    uni.showToast({ title: '无法访问摄像头，请手动粘贴', icon: 'none' })
  }
}

function stopCameraScan() {
  if (scanIntervalId) {
    clearInterval(scanIntervalId)
    scanIntervalId = null
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop())
    cameraStream = null
  }
  const video = cameraVideoRef.value
  if (video) video.srcObject = null
}

function closeCameraPanel() {
  stopCameraScan()
  showCameraPanel.value = false
}

async function handleQRImport() {
  if (!scannedQRContent.value.trim()) {
    uni.showToast({ title: '请输入二维码内容', icon: 'none' })
    return
  }

  try {
    let raw = scannedQRContent.value.trim()
    // 尝试自动提取 Base64 部分（兼容 data:image/...;base64, 前缀）
    const base64Match = raw.match(/base64,([A-Za-z0-9+/=]+)/)
    if (base64Match) {
      raw = base64Match[1]
    }
    // 去除可能的空白字符
    raw = raw.replace(/\s+/g, '')

    // 先尝试直接 atob，失败则尝试去掉 data URI scheme 前缀
    let decoded: string
    try {
      decoded = decodeURIComponent(
        atob(raw)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    } catch {
      // 可能已经是纯文本 JSON，尝试直接解析
      decoded = raw
    }

    const payload = JSON.parse(decoded) as QRCodeMigrationData

    if (payload.type !== 'echo-migration') {
      throw new Error('无效的迁移数据格式')
    }

    const storage = getStorageDriver()

    if (payload.data.apiConfigs?.length) {
      for (const config of payload.data.apiConfigs) {
        await storage.saveAPIConfig(config)
      }
    }

    if (payload.data.characters?.length) {
      for (const character of payload.data.characters) {
        await storage.saveCharacter(character)
      }
    }

    if (payload.data.networkSettings) {
      await storage.saveUserSetting('network_settings', JSON.stringify(payload.data.networkSettings))
    }

    if (payload.data.chatDefaults) {
      await storage.saveUserSetting('chat_defaults', JSON.stringify(payload.data.chatDefaults))
    }

    showScanPanel.value = false
    await syncApplicationState()
    uni.showToast({ title: '数据恢复成功', icon: 'success' })
  } catch {
    uni.showToast({ title: '数据解析失败，请检查二维码内容', icon: 'none' })
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
  border-radius: 9px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 12px auto 18px;
}

.view-switch-btn {
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
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

.blue-btn {
  width: 100%;
  min-height: 46px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0284c7);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
}

.blue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.46);
}

.blue-btn:disabled {
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
  border-radius: 12px;
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
  border-radius: 15px;
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
  border-radius: 8px;
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

.overlay {
  position: fixed;
  inset: 0;
  z-index: 10080;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.custom-panel,
.qr-panel {
  width: 100%;
  max-width: 520px;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  margin: 0 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
  border-radius: 11px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.97), rgba(7, 13, 24, 0.97));
  border: 1px solid rgba(56, 189, 248, 0.18);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  color: #f8fafc;
  overflow: hidden;
  font-family: inherit;
  padding: 20px;
}

.custom-panel.wide {
  max-width: 640px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(226, 232, 240, 0.78);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
  margin-bottom: 16px;
}

/* 多选按钮组 */
.multi-select-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkbox-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--text-secondary);
}

.checkbox-pill input {
  display: none;
}

.checkbox-pill.active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(52, 211, 153, 0.2));
  border-color: rgba(56, 189, 248, 0.4);
  color: var(--text-primary);
}

/* 细分选择块 */
.sub-select-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.sub-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.sub-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.select-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  font-size: 13px;
}

.select-item span {
  color: var(--text-primary);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.row span {
  color: var(--text-primary);
  font-size: 14px;
}

.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.qr-image {
  width: 280px;
  height: 280px;
  border-radius: 6px;
}

.qr-loading {
  color: var(--text-secondary);
  font-size: 14px;
}

.qr-hint {
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: center;
}

.scan-input {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.scan-input:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.36);
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
