<template>
  <div class="game-panel-page">
    <div class="header">
      <button class="menu-btn" @click="goToSettings" aria-label="设置">
        <svg viewBox="0 0 1024 1024" width="24" height="24" aria-hidden="true">
          <path d="M170.666667 213.333333h682.666666v85.333334H170.666667V213.333333z m0 512h682.666666v85.333334H170.666667v-85.333334z m0-256h682.666666v85.333334H170.666667v-85.333334z" fill="currentColor"/>
        </svg>
      </button>
      <h1 class="title">游戏中心</h1>
      <button class="import-btn" @click="showImportModal = true" aria-label="导入">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <nav class="category-strip" aria-label="游戏玩法分类">
      <button
        v-for="category in playCategoryOptions"
        :key="category.key"
        type="button"
        class="category-chip"
        :class="{ active: activePlayCategory === category.key }"
        @click="activePlayCategory = category.key"
      >
        {{ category.label }}
      </button>
    </nav>

    <section class="game-browser">
      <div class="game-list">
        <div
          v-for="game in filteredGames"
          :key="game.id"
          class="game-card"
          @click="router.push(game.route)"
        >
          <div class="game-icon" :class="game.iconClass">
            <template v-if="game.iconKind === 'gomoku'">
              <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
                <path
                  d="M8.5 11.5H31.5M8.5 20H31.5M8.5 28.5H31.5M11.5 8.5V31.5M20 8.5V31.5M28.5 8.5V31.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  opacity="0.48"
                />
                <circle cx="13" cy="13" r="4.4" fill="#ffffff" />
                <circle cx="20" cy="20" r="4.4" fill="#ffffff" />
                <circle cx="27" cy="27" r="4.4" fill="#ffffff" />
                <circle cx="11.6" cy="11.5" r="1.25" fill="#ffffff" opacity="0.95" />
                <circle cx="18.6" cy="18.5" r="1.25" fill="#ffffff" opacity="0.95" />
                <circle cx="25.6" cy="25.5" r="1.25" fill="#ffffff" opacity="0.95" />
              </svg>
            </template>
            <template v-else>{{ game.icon }}</template>
          </div>
          <div class="game-info">
            <div class="game-tags">
              <span>{{ game.primarySubcategory }}</span>
            </div>
            <h3 class="game-name">{{ game.name }}</h3>
            <p class="game-desc">{{ game.description }}</p>
          </div>
          <div class="play-btn">
            <span>进入</span>
            <svg class="play-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
          </div>
        </div>

        <div v-if="filteredGames.length === 0" class="empty-games">
          <strong>当前分类暂无内置游戏</strong>
          <p>可以点击右上角导入按钮，通过规则或完整文件创建新的小游戏。</p>
        </div>
      </div>
    </section>

    <!-- Import modal: choose method -->
    <Teleport to="body">
      <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">导入游戏</h3>
            <button type="button" class="modal-close" @click="showImportModal = false">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </div>

          <div class="modal-options">
            <button type="button" class="modal-option-btn" @click="selectImportMethod('rules')">
              <div class="option-icon">
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
              <div class="option-text">
                <span class="option-title">通过发送规则、玩法让AI创建</span>
                <span class="option-desc">上传规则文件或直接书写玩法，AI自动生成游戏</span>
              </div>
            </button>

            <button type="button" class="modal-option-btn" @click="selectImportMethod('full')">
              <div class="option-icon">
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
              <div class="option-text">
                <span class="option-title">发送全量游戏文件</span>
                <span class="option-desc">上传H5游戏(.html)、游戏包(.zip)或游戏文件夹，最大100MB</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Import modal: upload + text input -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
        <div class="modal-card upload-modal">
          <div class="modal-header">
            <h3 class="modal-title">{{ importMethod === 'rules' ? '发送规则 / 书写玩法' : '上传游戏文件' }}</h3>
            <button type="button" class="modal-close" @click="closeUploadModal">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </div>

          <div class="upload-body">
            <div class="upload-textarea-wrap">
              <textarea
                v-model="rulesText"
                class="upload-textarea"
                :placeholder="importMethod === 'rules' ? '在此书写游戏规则、玩法描述…' : '可选：添加游戏说明或备注…'"
                rows="4"
              />
            </div>

            <template v-if="importMethod === 'rules'">
              <div class="upload-zone" @click="openFilePicker('uploadInput')">
                <svg viewBox="0 0 24 24" width="28" height="28"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                <span class="upload-zone-text">点击上传规则文件 (.txt / .md / .json / .yaml)</span>
              </div>
              <input ref="uploadInput" type="file" class="hidden-file-input" accept=".txt,.md,.json,.yaml,.yml" multiple @change="onFileSelected" />
            </template>

            <template v-else>
              <div class="upload-btns">
                <button type="button" class="upload-action-btn" @click="openFilePicker('uploadInput')">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  选择文件
                </button>
                <button type="button" class="upload-action-btn" @click="openFilePicker('folderInput')">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  选择文件夹
                </button>
              </div>
              <p class="upload-hint">支持：H5游戏 (.html/.htm)、游戏包 (.zip)、游戏文件夹。不支持 .exe / .apk</p>
              <input ref="uploadInput" type="file" class="hidden-file-input" accept=".html,.htm,.zip" @change="onFileSelected" />
              <input ref="folderInput" type="file" class="hidden-file-input" webkitdirectory @change="onFileSelected" />
            </template>

            <div v-if="uploadFileNames.length" class="upload-file-list">
              <span v-for="n in uploadFileNames" :key="n" class="upload-file-tag">{{ n }}</span>
              <span v-if="uploadFileNames.length > 3" class="upload-count">共 {{ uploadFileNames.length }} 个文件</span>
              <button type="button" class="clear-files-btn" @click="clearUploadFiles">清除</button>
            </div>

            <div v-if="uploadFileSize" class="upload-size">总大小：{{ uploadFileSize }}</div>

            <button type="button" class="submit-btn" :disabled="!canSubmit" @click="submitImport">
              {{ submitLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showCreateWaiting" class="modal-overlay">
        <div class="modal-card waiting-modal">
          <div class="waiting-spinner" aria-hidden="true"></div>
          <h3 class="modal-title">{{ createGameDone ? '游戏创建请求已发送' : '正在请求 AI 创建游戏' }}</h3>
          <p class="waiting-copy">
            {{ createGameDone ? 'AI 已根据规则返回设计草案。' : '正在把规则、玩法和上传内容发送给当前大模型，请稍候。' }}
          </p>
          <pre v-if="createGameResult" class="create-result">{{ createGameResult }}</pre>
          <p v-if="createGameError" class="create-error">{{ createGameError }}</p>
          <button
            v-if="createGameDone || createGameError"
            type="button"
            class="submit-btn"
            @click="closeCreateWaiting"
          >
            知道了
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { uni } from '@/utils/uni-polyfill'
import { requestPermission } from '@/services/permissions'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'

const router = useRouter()

interface PlayCategoryOption {
  key: string
  label: string
}

interface GameCatalogItem {
  id: string
  name: string
  description: string
  route: string
  icon: string
  iconKind?: 'text' | 'gomoku'
  iconClass: string
  primarySubcategory: string
  playCategories: string[]
}

const ALL_CATEGORY = { key: 'all' as const, label: '全部' }

const playCategoryOptions: PlayCategoryOption[] = [
  ALL_CATEGORY,
  { key: 'role-playing', label: '角色扮演' },
  { key: 'card-rpg', label: '卡牌RPG' },
  { key: 'tactical-rpg', label: '战术RPG' },
  { key: 'roguelike-rpg', label: '地牢肉鸽' },
  { key: 'xianxia-rpg', label: '传奇仙侠' },
  { key: 'strategy-action', label: '策略竞技' },
  { key: 'slg', label: '战争SLG' },
  { key: 'tower-shooter', label: '塔防射击' },
  { key: 'simulation', label: '模拟经营' },
  { key: 'cultivation', label: '养成' },
  { key: 'puzzle-casual', label: '益智休闲' },
  { key: 'merge-match', label: '消除合成' },
  { key: 'micro-puzzle', label: '副玩法解谜' },
  { key: 'board-strategy', label: '棋类竞技' },
]

const gameCatalog: GameCatalogItem[] = [
  {
    id: 'chess',
    name: '国际象棋',
    description: '邀请AI好友对弈，或挑战内置引擎。支持难度选择。',
    route: '/game/play/chess',
    icon: '♛',
    iconKind: 'text',
    iconClass: 'chess-icon',
    primarySubcategory: '棋类竞技',
    playCategories: ['strategy-action', 'board-strategy'],
  },
  {
    id: 'gomoku',
    name: '五子棋',
    description: '经典五子连珠，先连成五子获胜。可邀请好友或挑战引擎。',
    route: '/game/play/gomoku',
    icon: '',
    iconKind: 'gomoku',
    iconClass: 'gomoku-icon',
    primarySubcategory: '棋类竞技',
    playCategories: ['strategy-action', 'board-strategy'],
  },
  {
    id: 'match3',
    name: '星糖消消乐',
    description: '交换相邻星糖，形成三连或以上即可消除。包含目标分、步数、连锁与重排。',
    route: '/game/play/match3',
    icon: '◆',
    iconKind: 'text',
    iconClass: 'match3-icon',
    primarySubcategory: '消除合成',
    playCategories: ['puzzle-casual', 'merge-match'],
  },
  {
    id: 'cut-rope',
    name: '糖果绳索',
    description: '切断绳子，让糖果借助摆动、重力和碰撞落进口袋。包含星星收集和关卡计分。',
    route: '/game/play/cut-rope',
    icon: '✂',
    iconKind: 'text',
    iconClass: 'cut-rope-icon',
    primarySubcategory: '益智休闲',
    playCategories: ['puzzle-casual', 'micro-puzzle'],
  },
]

const showImportModal = ref(false)
const showUploadModal = ref(false)
const importMethod = ref<'rules' | 'full'>('rules')
const activePlayCategory = ref('all')

const rulesText = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const uploadFileData = ref('')
const uploadFileNames = ref<string[]>([])
const uploadFileSize = ref('')
const showCreateWaiting = ref(false)
const createGameDone = ref(false)
const createGameResult = ref('')
const createGameError = ref('')

const filteredGames = computed(() => {
  if (activePlayCategory.value === 'all') return gameCatalog
  return gameCatalog.filter(game => game.playCategories.includes(activePlayCategory.value))
})

async function openFilePicker(refName: 'uploadInput' | 'folderInput') {
  const perm = await requestPermission('storage')
  if (!perm.granted) return
  const input = refName === 'uploadInput' ? uploadInput.value : folderInput.value
  input?.click()
}

function goToSettings() {
  router.push('/game/settings')
}

function selectImportMethod(method: 'rules' | 'full') {
  importMethod.value = method
  showImportModal.value = false
  showUploadModal.value = true
}

function closeUploadModal() {
  showUploadModal.value = false
  rulesText.value = ''
  uploadFileData.value = ''
  uploadFileNames.value = []
  uploadFileSize.value = ''
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const isFolder = !!(input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory || files.length > 1

  if (importMethod.value === 'full') {
    const MAX_SIZE = 100 * 1024 * 1024
    let totalSize = 0
    for (let i = 0; i < files.length; i++) totalSize += files[i].size
    if (totalSize > MAX_SIZE) {
      uni.showToast({ title: '总大小超过100MB限制', icon: 'none' })
      input.value = ''
      return
    }

    if (isFolder) {
      const names: string[] = []
      for (let i = 0; i < files.length; i++) names.push(files[i].webkitRelativePath || files[i].name)
      uploadFileNames.value = names
      uploadFileSize.value = formatFileSize(totalSize)

      Promise.all(
        Array.from(files).map(async (f) => {
          const path = f.webkitRelativePath || f.name
          const ext = path.split('.').pop()?.toLowerCase() || ''
          if (['txt', 'md', 'json', 'yaml', 'yml', 'html', 'htm', 'css', 'js'].includes(ext)) {
            return { path, text: await f.text() }
          }
          return { path, text: `[binary: ${formatFileSize(f.size)}]` }
        }),
      ).then(results => {
        uploadFileData.value = results.map(r => `=== ${r.path} ===\n${r.text}`).join('\n\n')
      })
    } else {
      const file = files[0]
      uploadFileNames.value = [file.name]
      uploadFileSize.value = formatFileSize(file.size)

      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        file.text().then(text => { uploadFileData.value = text })
      } else {
        const reader = new FileReader()
        reader.onload = () => { uploadFileData.value = reader.result as string }
        reader.readAsDataURL(file)
      }
    }
  } else {
    const names: string[] = []
    const readers: Promise<string>[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      names.push(file.name)
      readers.push(file.text())
    }
    uploadFileNames.value = names
    uploadFileSize.value = ''
    Promise.all(readers).then(contents => {
      uploadFileData.value = contents.map((text, i) => `=== ${names[i]} ===\n${text}`).join('\n\n')
    })
  }

  input.value = ''
}

function clearUploadFiles() {
  uploadFileData.value = ''
  uploadFileNames.value = []
  uploadFileSize.value = ''
}

const canSubmit = computed(() => rulesText.value.trim().length > 0 || uploadFileData.value.length > 0)

const submitLabel = computed(() => importMethod.value === 'rules' ? '创建游戏' : '导入游戏')

async function submitImport() {
  const payload = [
    rulesText.value.trim() ? `用户填写的说明：\n${rulesText.value.trim()}` : '',
    uploadFileData.value ? `上传内容：\n${uploadFileData.value}` : '',
  ].filter(Boolean).join('\n\n')

  if (!payload.trim()) return

  showUploadModal.value = false
  showCreateWaiting.value = true
  createGameDone.value = false
  createGameResult.value = ''
  createGameError.value = ''

  try {
    const config =
      (await apiConfigService.getDefaultConfig('text')) ||
      (await apiConfigService.getDefaultConfig('chat')) ||
      (await apiConfigService.getDefaultConfig('voice'))

    if (!config) {
      throw new Error('请先在设置里配置可用的大模型 API')
    }

    const service = new LLMAPIService(config)
    const content = await service.chat({
      systemPrompt: [
        '你是一个 H5 小游戏设计与实现助手。',
        '请根据用户给出的规则、玩法或文件内容，输出一个可落地的游戏创建方案。',
        '返回内容必须包含：游戏名称、核心规则、玩家操作、胜负/结束条件、状态字段、实现建议。',
        '不要只说已收到，必须真正分析并生成设计草案。',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: `请创建/设计这个游戏：\n\n${payload}`,
        },
      ],
    })

    createGameResult.value = content || 'AI 已返回空结果，请补充更明确的规则后重试。'
    createGameDone.value = true
  } catch (error) {
    createGameError.value = (error as Error).message || '创建游戏请求失败'
  }
}

function closeCreateWaiting() {
  showCreateWaiting.value = false
  closeUploadModal()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style lang="scss" scoped>
.game-panel-page {
  min-height: 100vh;
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
}

.header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.menu-btn {
  position: absolute;
  left: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px; height: 42px;
  border: none; border-radius: 14px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
  &:hover { opacity: 0.78; }
  &:active { transform: scale(0.95); }
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.import-btn {
  position: absolute;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px; height: 42px;
  border: none; border-radius: 14px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
  &:hover { opacity: 0.78; }
  &:active { transform: scale(0.95); }
}

.category-strip {
  display: flex;
  gap: 10px;
  width: min(1080px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 2px 2px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-strip::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: color var(--transition-base), border-color var(--transition-base), background var(--transition-base), transform var(--transition-base);
}

.category-chip:hover {
  color: var(--text-primary);
  border-color: rgba(125, 211, 252, 0.34);
}

.category-chip.active {
  color: #fff;
  border-color: rgba(125, 211, 252, 0.48);
  background: var(--interactive-gradient);
  box-shadow: 0 14px 30px rgba(56, 189, 248, 0.16);
}

.category-chip:active {
  transform: scale(0.96);
}

.game-browser {
  width: min(1080px, calc(100% - 32px));
  margin: 10px auto 0;
}

.game-list {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.game-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  margin-bottom: 14px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-strong);
  box-shadow: var(--shadow-xl);
}

.game-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px; height: 72px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #e0e0e0;
  font-size: 32px;
  box-shadow: var(--shadow-sm);
}

.chess-icon { font-size: 36px; color: #f0d060; }
.match3-icon {
  color: #fef3c7;
  background: linear-gradient(135deg, #ec4899, #38bdf8 52%, #22c55e);
}

.cut-rope-icon {
  color: #ecfeff;
  background: linear-gradient(135deg, #14b8a6, #38bdf8 54%, #f43f5e);
}

.gomoku-icon {
  color: #ffffff;

  svg {
    overflow: visible;
    filter:
      drop-shadow(0 0 6px rgba(255, 255, 255, 0.28))
      drop-shadow(0 6px 12px rgba(0, 0, 0, 0.28));
  }
}

.game-info { flex: 1; }

.game-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.game-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.08);
  color: rgba(186, 230, 253, 0.88);
  font-size: 11px;
  line-height: 1;
}

.game-name {
  margin-bottom: 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.game-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--interactive-gradient);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 20px 44px rgba(113, 129, 146, 0.24);
}

.play-arrow-icon {
  width: 16px; height: 16px;
  color: currentColor;
  overflow: visible;
}

.empty-games {
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.empty-games strong {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
}

.empty-games p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
}

.modal-card {
  width: min(400px, calc(100% - 32px));
  background: #0c1e2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.waiting-modal {
  align-items: center;
  text-align: center;
}

.waiting-spinner {
  width: 42px;
  height: 42px;
  margin: 4px auto 12px;
  border: 3px solid rgba(125, 211, 252, 0.18);
  border-top-color: rgba(125, 211, 252, 0.95);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.waiting-copy {
  color: var(--text-secondary);
  line-height: 1.7;
}

.create-result {
  width: 100%;
  max-height: 280px;
  overflow: auto;
  padding: 12px;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.create-error {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(248, 113, 113, 0.18);
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.08);
  color: #fecaca;
  text-align: left;
  line-height: 1.6;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border: none; border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  &:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.06); }
}

.modal-options {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-option-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.06); }
}

.option-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.08);
  color: rgba(56, 189, 248, 0.7);
}

.option-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.option-title { font-size: 14px; font-weight: 500; }
.option-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }

.upload-modal { width: min(440px, calc(100% - 32px)); }

.upload-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-textarea-wrap {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
  &:focus-within { border-color: rgba(56, 189, 248, 0.4); }
}

.upload-textarea {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
  outline: none;
  resize: none;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
}

.upload-btns { display: flex; gap: 10px; }

.upload-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border: 1px dashed rgba(56, 189, 248, 0.25);
  border-radius: 10px;
  background: transparent;
  color: rgba(56, 189, 248, 0.6);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56, 189, 248, 0.5); color: rgba(56, 189, 248, 0.8); background: rgba(56, 189, 248, 0.04); }
}

.upload-hint { margin: 0; font-size: 11px; color: var(--text-tertiary); line-height: 1.4; }

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  border: 1px dashed rgba(56, 189, 248, 0.25);
  border-radius: 12px;
  color: rgba(56, 189, 248, 0.5);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56, 189, 248, 0.5); color: rgba(56, 189, 248, 0.7); background: rgba(56, 189, 248, 0.04); }
}

.upload-zone-text { font-size: 12px; text-align: center; line-height: 1.4; }

.hidden-file-input { display: none; }

.upload-file-list { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

.upload-file-tag {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 4px;
  color: rgba(52, 211, 153, 0.7);
  font-size: 11px;
}

.upload-count { font-size: 11px; color: var(--text-tertiary); }

.clear-files-btn {
  padding: 2px 8px;
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 4px;
  background: transparent;
  color: rgba(248, 113, 113, 0.6);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); }
}

.upload-size { font-size: 12px; color: var(--text-tertiary); }

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--interactive-gradient);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:not(:disabled):hover { opacity: 0.9; }
}

@media (max-width: 720px) {
  .game-panel-page { padding: 0 0 118px; }
  .header { padding-left: 16px; padding-right: 16px; }
  .menu-btn { left: 16px; }
  .import-btn { right: 16px; }

  .category-strip {
    width: calc(100% - 20px);
    margin-top: 10px;
  }

  .category-chip {
    min-height: 36px;
    padding: 0 12px;
    font-size: 12px;
  }

  .game-browser {
    width: calc(100% - 20px);
  }

  .game-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 18px;
  }

  .game-icon {
    width: 58px;
    height: 58px;
    font-size: 28px;
  }

  .play-btn { align-self: flex-start; }
}
</style>
