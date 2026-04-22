<template>
  <div class="create-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="router.back()">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">创建角色</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <main class="form-body">
      <!-- Category selection -->
      <div class="field-block">
        <span class="field-label">分类</span>
        <select v-model="form.category" class="category-select">
          <option v-for="group in categoryGroups" :key="group.label" :value="group.label">{{ group.label }}</option>
        </select>
        <p class="field-hint">系统会自动匹配为 {{ resolvedModeLabel }} 模式。</p>
      </div>

      <div v-if="subCategories.length" class="field-block">
        <span class="field-label">子分类</span>
        <div class="chip-row">
          <button v-for="item in subCategories" :key="item" type="button" class="category-chip" :class="{ active: form.subCategory === item }" @click="form.subCategory = item">{{ item }}</button>
        </div>
      </div>

      <!-- Theme selection -->
      <div class="field-block">
        <span class="field-label">主题</span>
        <select v-model="form.themeGroup" class="category-select">
          <option value="">选择主题大类</option>
          <option v-for="tg in themeGroups" :key="tg.label" :value="tg.label">{{ tg.label }}</option>
        </select>
      </div>

      <div v-if="currentThemeLeaves.length" class="field-block">
        <span class="field-label">主题细类</span>
        <div class="chip-row">
          <button v-for="leaf in currentThemeLeaves" :key="leaf" type="button" class="category-chip theme-chip" :class="{ active: form.themeType === leaf }" @click="form.themeType = leaf">{{ leaf }}</button>
        </div>
      </div>

      <!-- Identity section: single character has avatar+name, group/综合 has global background -->
      <section v-if="!isGroupOrComprehensive" class="section-block">
        <h3 class="section-title">角色身份</h3>
        <div class="avatar-row">
          <div class="avatar-wrapper">
            <img v-if="avatarPreview" :src="avatarPreview" alt="头像" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</div>
          </div>
          <div class="avatar-actions">
            <button type="button" class="avatar-btn" @click="uploadAvatar">上传头像</button>
            <button type="button" class="avatar-btn" :disabled="generatingAvatar" @click="generateAvatar">
              {{ generatingAvatar ? '生成中…' : '图片生成' }}
            </button>
          </div>
        </div>
        <div class="field-item">
          <label class="field-label">角色名称 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="field-input" maxlength="30" placeholder="例如：银翼调查员" />
        </div>
      </section>

      <!-- Global background + narrator TTS for group/综合 -->
      <section v-else class="section-block">
        <h3 class="section-title">全局背景</h3>
        <div class="field-item">
          <label class="field-label">全局背景上传</label>
          <div class="media-upload-row">
            <button type="button" class="avatar-btn" @click="uploadGlobalBackground">上传背景图</button>
            <button v-if="mediaData.globalBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalBackground = ''">移除</button>
          </div>
          <div v-if="mediaData.globalBackground" class="media-preview"><img :src="mediaData.globalBackground" alt="全局背景" /></div>
        </div>
        <div class="field-item">
          <label class="field-label">全局旁白TTS音色</label>
          <div class="tts-row">
            <input v-model="narratorTtsVoice" type="text" class="field-input" placeholder="旁白音色名称，如 alloy" />
            <div class="weight-group">
              <label class="field-label">权重%</label>
              <input v-model.number="narratorTtsWeight" type="number" class="field-input weight-input" min="0" max="100" placeholder="100" />
            </div>
          </div>
        </div>
        <p class="field-hint media-hint">角色名称在基础设定中设置，媒体设定在角色卡中配置。</p>
      </section>

      <!-- 1. 用户设定 -->
      <section class="section-block compact">
        <AdvancedToggle v-model="showUser" label-off="展开用户设定" label-on="收起用户设定" />
        <div v-if="showUser" class="section-body">
          <div class="field-item">
            <label class="field-label">用户头像</label>
            <div class="media-upload-row">
              <div v-if="userData.avatar" class="avatar-wrapper small">
                <img :src="userData.avatar" alt="用户头像" class="avatar-img" />
              </div>
              <button type="button" class="avatar-btn" @click="uploadUserAvatar">上传头像</button>
              <button v-if="userData.avatar" type="button" class="avatar-btn remove-media-btn" @click="userData.avatar = ''">移除</button>
            </div>
          </div>
          <div class="field-item">
            <label class="field-label">用户自身描述</label>
            <textarea v-model="userData.description" class="user-textarea" rows="3" placeholder="用户在故事中的外貌、身份、背景等。例如：一位神秘的旅行者，身穿灰色斗篷，面容被阴影遮住。" />
          </div>
          <div class="field-item">
            <label class="field-label">用户性格</label>
            <input v-model="userData.personality" type="text" class="field-input" placeholder="例如：冷静、善良、好奇心强" />
          </div>
          <div class="field-item">
            <label class="field-label">用户身份/定位</label>
            <input v-model="userData.role" type="text" class="field-input" placeholder="例如：调查员、学生、冒险者" />
          </div>
        </div>
      </section>

      <!-- Game import for game-related categories -->
      <section v-if="isGameCategory" class="section-block compact">
        <AdvancedToggle v-model="showGameImport" label-off="展开游戏导入" label-on="收起游戏导入" />
        <div v-if="showGameImport" class="section-body">
          <div class="game-option-cards">
            <button type="button" class="game-option-card" :class="{ active: gameImportMode === 'rules' }" @click="switchGameMode('rules')">
              <div class="game-option-icon">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
              <div class="game-option-text">
                <span class="game-option-title">上传游戏规则</span>
                <span class="game-option-desc">.txt / .md / .json / .yaml 规则文件，AI根据规则生成游戏</span>
              </div>
            </button>
            <button type="button" class="game-option-card" :class="{ active: gameImportMode === 'full' }" @click="switchGameMode('full')">
              <div class="game-option-icon">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </div>
              <div class="game-option-text">
                <span class="game-option-title">上传游戏全量本体</span>
                <span class="game-option-desc">H5游戏 (.html)、游戏包 (.zip)，最大100MB</span>
              </div>
            </button>
          </div>

          <!-- Rules mode -->
          <template v-if="gameImportMode === 'rules'">
            <div class="field-item">
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="triggerGameFileInput('rules')">选择规则文件</button>
                <button v-if="gameImportData" type="button" class="avatar-btn remove-media-btn" @click="clearGameImport">清除</button>
              </div>
              <input ref="gameRulesInput" type="file" class="hidden-file-input" accept=".txt,.md,.json,.yaml,.yml" multiple @change="onGameFileSelected" />
            </div>
            <div v-if="gameImportNames.length" class="game-file-list">
              <span v-for="n in gameImportNames" :key="n" class="game-file-tag">{{ n }}</span>
            </div>
            <div v-if="gameImportData" class="field-item">
              <label class="field-label">规则预览（前 500 字）</label>
              <pre class="game-preview">{{ gameImportData.slice(0, 500) }}{{ gameImportData.length > 500 ? '…' : '' }}</pre>
            </div>
          </template>

          <!-- Full game mode -->
          <template v-else>
            <p class="field-hint">支持：H5游戏 (.html/.htm)、游戏包 (.zip)、游戏文件夹。不支持：.exe / .apk / .app</p>
            <div class="field-item">
              <div class="media-upload-row">
                <button type="button" class="avatar-btn" @click="triggerGameFileInput('full')">选择文件</button>
                <button type="button" class="avatar-btn" @click="triggerGameFileInput('folder')">选择文件夹</button>
                <button v-if="gameImportData" type="button" class="avatar-btn remove-media-btn" @click="clearGameImport">清除</button>
              </div>
              <input ref="gameFullInput" type="file" class="hidden-file-input" accept=".html,.htm,.zip" @change="onFullGameSelected" />
              <input ref="gameFolderInput" type="file" class="hidden-file-input" webkitdirectory @change="onFullGameSelected" />
            </div>
            <div v-if="gameImportNames.length" class="game-file-list">
              <span v-for="n in gameImportNames" :key="n" class="game-file-tag">{{ n }}</span>
              <span v-if="gameImportNames.length > 1" class="field-hint">共 {{ gameImportNames.length }} 个文件</span>
            </div>
            <div v-if="gameImportSize" class="field-item">
              <span class="field-hint">总大小：{{ gameImportSize }}</span>
            </div>
          </template>
        </div>
      </section>

      <!-- 2. 基础设定 -->
      <section v-if="activeTemplate.basicFields.length" class="section-block compact">
        <AdvancedToggle v-model="showBasic" label-off="展开基础设定" label-on="收起基础设定" />
        <div v-if="showBasic" class="section-body">
          <TemplateFieldRenderer
            v-for="field in activeTemplate.basicFields"
            :key="field.key"
            :field="field"
            :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
            @update:model-value="updateTemplateField(field.key, $event)"
          />
        </div>
      </section>

      <!-- 3. 媒体设定 (仅非群聊/综合) -->
      <section v-if="!isGroupOrComprehensive" class="section-block compact">
        <AdvancedToggle v-model="showMedia" label-off="展开媒体设定" label-on="收起媒体设定" />
        <div v-if="showMedia" class="section-body">
          <div class="field-item">
            <label class="field-label">角色聊天背景</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('chatBackground')">上传图片</button>
              <button v-if="mediaData.chatBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.chatBackground = ''">移除</button>
            </div>
            <div v-if="mediaData.chatBackground" class="media-preview"><img :src="mediaData.chatBackground" alt="聊天背景" /></div>
          </div>
          <div class="field-item">
            <label class="field-label">整体聊天背景</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('globalBackground')">上传图片</button>
              <button v-if="mediaData.globalBackground" type="button" class="avatar-btn remove-media-btn" @click="mediaData.globalBackground = ''">移除</button>
            </div>
            <div v-if="mediaData.globalBackground" class="media-preview"><img :src="mediaData.globalBackground" alt="整体背景" /></div>
          </div>
          <div class="field-item">
            <label class="field-label">角色切换动图</label>
            <div class="media-upload-row">
              <button type="button" class="avatar-btn" @click="uploadMedia('switchAnimation')">上传动图</button>
              <button v-if="mediaData.switchAnimation" type="button" class="avatar-btn remove-media-btn" @click="mediaData.switchAnimation = ''">移除</button>
            </div>
            <div v-if="mediaData.switchAnimation" class="media-preview"><img :src="mediaData.switchAnimation" alt="切换动图" /></div>
          </div>
          <div class="field-item">
            <label class="field-label">角色情感表达动图</label>
            <button type="button" class="avatar-btn emotion-add-btn" @click="addEmotion">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
              添加情感
            </button>
            <div v-for="(ea, idx) in emotionAnimations" :key="idx" class="emotion-row">
              <input v-model="ea.emotion" type="text" class="field-input emotion-input" placeholder="请输入触发该动图的情感状态" />
              <div class="emotion-actions">
                <button type="button" class="avatar-btn" @click="uploadEmotionAnimation(idx)">上传动图</button>
                <button v-if="ea.animationUrl" type="button" class="avatar-btn remove-media-btn" @click="ea.animationUrl = ''">移除</button>
                <button type="button" class="avatar-btn remove-media-btn" @click="removeEmotion(idx)">
                  <svg viewBox="0 0 24 24" width="12" height="12"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
                </button>
              </div>
              <div v-if="ea.animationUrl" class="media-preview small"><img :src="ea.animationUrl" alt="情感动图" /></div>
            </div>
          </div>
          <div class="field-item">
            <label class="field-label">TTS音色</label>
            <div class="tts-row">
              <input v-model="ttsVoice" type="text" class="field-input" placeholder="音色名称，如 alloy、shimmer" />
              <div class="weight-group">
                <label class="field-label">权重%</label>
                <input v-model.number="ttsWeight" type="number" class="field-input weight-input" min="0" max="100" placeholder="100" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. 高级设定 -->
      <section v-if="activeTemplate.advancedFields.length" class="section-block compact">
        <AdvancedToggle v-model="showAdvanced" />
        <div v-if="showAdvanced" class="section-body">
          <TemplateFieldRenderer
            v-for="field in activeTemplate.advancedFields"
            :key="field.key"
            :field="field"
            :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
            @update:model-value="updateTemplateField(field.key, $event)"
          />
        </div>
      </section>

      <!-- 5. 特殊设定 -->
      <section v-if="activeTemplate.specialFields.length" class="section-block compact">
        <AdvancedToggle v-model="showSpecial" label-off="展开特殊设定" label-on="收起特殊设定" />
        <div v-if="showSpecial" class="section-body">
          <TemplateFieldRenderer
            v-for="field in activeTemplate.specialFields"
            :key="field.key"
            :field="field"
            :model-value="templateData[field.key] ?? (field.type === 'chip-select' ? [] : '')"
            @update:model-value="updateTemplateField(field.key, $event)"
          />
        </div>
      </section>
    </main>

    <div class="submit-bar">
      <button type="button" class="primary-btn full" :disabled="submitting" @click="submit">
        {{ submitting ? '创建中…' : '创建角色' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { createSilverAvatarDataUrl, createSilverBackdropDataUrl } from '@/utils/silver-art'
import { uni } from '@/utils/uni-polyfill'
import { requestPermission } from '@/services/permissions'
import type { ICharacter, EmotionAnimation } from '@/types/character'
import { imageGenService } from '@/services/image-gen'
import {
  DEFAULT_CATEGORY,
  getCategoryGroups,
  getFirstSubCategory,
  getThemeGroups,
  inferCharacterMode,
} from '@/data/taxonomy'
import {
  getTemplateForCategory,
  buildSettingsFromTemplate,
} from '@/data/character-templates'
import TemplateFieldRenderer from '@/components/CharacterForm/TemplateFieldRenderer.vue'
import AdvancedToggle from '@/components/CharacterForm/AdvancedToggle.vue'

type CharacterMode = NonNullable<ICharacter['mode']>

const router = useRouter()
const characterStore = useCharacterStore()
const submitting = ref(false)
const generatingAvatar = ref(false)
const showUser = ref(false)
const showBasic = ref(false)
const showMedia = ref(false)
const showAdvanced = ref(false)
const showSpecial = ref(false)

type MediaKey = 'chatBackground' | 'globalBackground' | 'switchAnimation'
const mediaData = reactive<Record<MediaKey, string>>({
  chatBackground: '',
  globalBackground: '',
  switchAnimation: '',
})

const emotionAnimations = reactive<EmotionAnimation[]>([])

const ttsVoice = ref('')
const ttsWeight = ref(100)
const narratorTtsVoice = ref('')
const narratorTtsWeight = ref(100)

const showGameImport = ref(false)
const gameImportMode = ref<'rules' | 'full'>('rules')
const gameImportData = ref('')
const gameImportNames = ref<string[]>([])
const gameImportSize = ref('')
const gameRulesInput = ref<HTMLInputElement | null>(null)
const gameFullInput = ref<HTMLInputElement | null>(null)
const gameFolderInput = ref<HTMLInputElement | null>(null)

const userData = reactive({
  avatar: '',
  description: '',
  personality: '',
  role: '',
})

const categoryGroups = getCategoryGroups()
const themeGroups = getThemeGroups()

const form = ref({
  name: '',
  category: DEFAULT_CATEGORY,
  subCategory: getFirstSubCategory(DEFAULT_CATEGORY),
  themeGroup: '',
  themeType: '',
  avatar: '',
})

const templateData = ref<Record<string, unknown>>({})

const subCategories = computed(() =>
  categoryGroups.find(g => g.label === form.value.category)?.items || []
)

const currentThemeLeaves = computed(() =>
  themeGroups.find(g => g.label === form.value.themeGroup)?.items || []
)

const activeTemplate = computed(() =>
  getTemplateForCategory(form.value.category, form.value.subCategory)
)

const resolvedMode = computed<CharacterMode>(() =>
  inferCharacterMode({ category: form.value.category, subCategory: form.value.subCategory })
)

const resolvedModeLabel = computed(() => getModeLabel(resolvedMode.value))

const avatarPreview = computed(() =>
  form.value.avatar || (form.value.name ? createSilverAvatarDataUrl(form.value.name) : '')
)

const isGroupOrComprehensive = computed(() =>
  form.value.category === '群聊派对' || form.value.category === '综合'
)

const isGameCategory = computed(() => {
  const cat = form.value.category
  const sub = form.value.subCategory
  return cat === '剧情&游戏'
    || (cat === '群聊派对' && sub === '游戏群聊')
    || (cat === '综合' && sub === '剧情＋群聊＋游戏')
})

watch(() => form.value.category, next => {
  if (!subCategories.value.includes(form.value.subCategory)) {
    form.value.subCategory = getFirstSubCategory(next)
  }
})

watch(() => form.value.themeGroup, () => { form.value.themeType = '' })

watch(() => form.value.subCategory, () => {
  showAdvanced.value = false
  showSpecial.value = false
})

function updateTemplateField(key: string, value: string | string[]) {
  templateData.value = { ...templateData.value, [key]: value }
}

function uploadAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        form.value.avatar = res.tempFilePaths[0]
      }
    },
  })
}

async function generateAvatar() {
  const name = form.value.name.trim()
  if (!name) {
    uni.showToast({ title: '请先输入角色名称', icon: 'none' })
    return
  }
  generatingAvatar.value = true
  try {
    const desc = String(templateData.value.description ?? '')
      || String(templateData.value.worldview ?? '')
      || String(templateData.value.expertPersona ?? '')
    const prompt = `${name}的角色头像，${desc ? '角色描述：' + desc.slice(0, 200) + '。' : ''}高清肖像，正面，简洁背景`
    const urls = await imageGenService.generate(prompt, { size: '512x512', n: 1 })
    if (urls[0]) {
      form.value.avatar = urls[0]
    } else {
      uni.showToast({ title: '未生成图片', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '图片生成失败', icon: 'none' })
  } finally {
    generatingAvatar.value = false
  }
}

function uploadMedia(key: MediaKey) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        mediaData[key] = res.tempFilePaths[0]
      }
    },
  })
}

function uploadGlobalBackground() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        mediaData.globalBackground = res.tempFilePaths[0]
      }
    },
  })
}

function switchGameMode(mode: 'rules' | 'full') {
  gameImportMode.value = mode
  clearGameImport()
}

async function triggerGameFileInput(mode: 'rules' | 'full' | 'folder') {
  const perm = await requestPermission('storage')
  if (!perm.granted) return
  if (mode === 'rules') gameRulesInput.value?.click()
  else if (mode === 'folder') gameFolderInput.value?.click()
  else gameFullInput.value?.click()
}

function onGameFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const names: string[] = []
  const readers: Promise<string>[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    names.push(file.name)
    readers.push(file.text())
  }

  gameImportNames.value = names
  gameImportSize.value = ''
  Promise.all(readers).then(contents => {
    const combined = contents.map((text, i) => `=== ${names[i]} ===\n${text}`).join('\n\n')
    gameImportData.value = combined
  })

  input.value = ''
}

function onFullGameSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const MAX_SIZE = 100 * 1024 * 1024 // 100MB
  let totalSize = 0
  for (let i = 0; i < files.length; i++) totalSize += files[i].size
  if (totalSize > MAX_SIZE) {
    uni.showToast({ title: '总大小超过100MB限制', icon: 'none' })
    input.value = ''
    return
  }

  const isFolder = input.webkitdirectory || files.length > 1

  if (isFolder) {
    // Folder upload: collect all files
    const names: string[] = []
    for (let i = 0; i < files.length; i++) names.push(files[i].webkitRelativePath || files[i].name)
    gameImportNames.value = names
    gameImportSize.value = formatFileSize(totalSize)

    // Read text files, skip binary
    const readers: Promise<{ path: string; text: string }[]> = Promise.all(
      Array.from(files).map(async (f) => {
        const path = f.webkitRelativePath || f.name
        const ext = path.split('.').pop()?.toLowerCase() || ''
        if (['txt', 'md', 'json', 'yaml', 'yml', 'html', 'htm', 'css', 'js'].includes(ext)) {
          return { path, text: await f.text() }
        }
        return { path, text: `[binary: ${formatFileSize(f.size)}]` }
      }),
    )
    readers.then(results => {
      gameImportData.value = results.map(r => `=== ${r.path} ===\n${r.text}`).join('\n\n')
    })
  } else {
    // Single file
    const file = files[0]
    gameImportNames.value = [file.name]
    gameImportSize.value = formatFileSize(file.size)

    if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      file.text().then(text => { gameImportData.value = text })
    } else {
      const reader = new FileReader()
      reader.onload = () => { gameImportData.value = reader.result as string }
      reader.readAsDataURL(file)
    }
  }

  input.value = ''
}

function clearGameImport() {
  gameImportData.value = ''
  gameImportNames.value = []
  gameImportSize.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function addEmotion() {
  emotionAnimations.push({ emotion: '', animationUrl: '' })
}

function removeEmotion(idx: number) {
  emotionAnimations.splice(idx, 1)
}

function uploadEmotionAnimation(idx: number) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        emotionAnimations[idx].animationUrl = res.tempFilePaths[0]
      }
    },
  })
}

function uploadUserAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        userData.avatar = res.tempFilePaths[0]
      }
    },
  })
}

function getModeLabel(mode?: ICharacter['mode']): string {
  switch (mode) {
    case 'challenge-dialogue': return '闯关式对话'
    case 'group-chat': return '群聊'
    case 'group-challenge': return '群聊闯关'
    case 'free-dialogue':
    default: return '自由对话'
  }
}

async function submit() {
  // Resolve name: for 群聊/综合, get from templateData; for others, from form
  let name: string
  if (isGroupOrComprehensive.value) {
    name = String(templateData.value.groupName ?? templateData.value.worldName ?? '').trim()
    if (!name) {
      uni.showToast({ title: '请在基础设定中填写名称', icon: 'none' })
      return
    }
  } else {
    name = form.value.name.trim()
    if (!name) {
      uni.showToast({ title: '请输入角色名称', icon: 'none' })
      return
    }
  }

  const greeting = String(templateData.value.greeting ?? '').trim()

  submitting.value = true
  try {
    const description = String(templateData.value.description ?? '').trim()
      || String(templateData.value.worldview ?? '').trim()
      || String(templateData.value.expertPersona ?? '').trim()
      || String(templateData.value.worldSandbox ?? '').trim()
      || String(templateData.value.groupBackground ?? '').trim()

    if (!description && !isGroupOrComprehensive.value) {
      uni.showToast({ title: '请填写角色描述或相关基础设定', icon: 'none' })
      submitting.value = false
      return
    }

    const avatar = isGroupOrComprehensive.value
      ? createSilverAvatarDataUrl(name)
      : (form.value.avatar || createSilverAvatarDataUrl(name))
    const settings = buildSettingsFromTemplate(
      form.value.category,
      form.value.subCategory,
      { ...templateData.value, _characterName: name },
      activeTemplate.value,
    )

    // Build user description string from user profile
    const userParts: string[] = []
    if (userData.description.trim()) userParts.push(userData.description.trim())
    if (userData.personality.trim()) userParts.push(`性格：${userData.personality.trim()}`)
    if (userData.role.trim()) userParts.push(`身份：${userData.role.trim()}`)

    // Build TTS info string
    const ttsInfo = ttsVoice.value.trim()
      ? `TTS音色：${ttsVoice.value.trim()}${ttsWeight.value !== 100 ? `(${ttsWeight.value}%)` : ''}`
      : ''

    // Build narrator TTS info
    const narratorTtsInfo = narratorTtsVoice.value.trim()
      ? `全局旁白TTS音色：${narratorTtsVoice.value.trim()}${narratorTtsWeight.value !== 100 ? `(${narratorTtsWeight.value}%)` : ''}`
      : ''

    const character: Partial<ICharacter> = {
      name,
      avatar,
      background: `${form.value.category} / ${form.value.subCategory}`,
      description: description || `${form.value.category}角色`,
      greeting,
      settings,
      mode: resolvedMode.value,
      category: form.value.category,
      subCategory: form.value.subCategory,
      avatarTone: form.value.avatar ? undefined : 'silver',
      backgroundImage: createSilverBackdropDataUrl(name, `${form.value.category} · ${form.value.subCategory}`),
      tags: [form.value.category, form.value.subCategory, form.value.themeType].filter(Boolean),
      sourceType: 'manual',
      exampleDialogue: templateData.value.exampleDialogue as string | undefined,
      scenario: templateData.value.scenario as string | undefined,
      personality: templateData.value.personalityTraits as string | undefined,
      values: templateData.value.coreValues as string | undefined,
      chatBackground: mediaData.chatBackground || undefined,
      globalBackground: mediaData.globalBackground || undefined,
      switchAnimation: mediaData.switchAnimation || undefined,
      emotionAnimations: emotionAnimations.filter(e => e.emotion.trim() && e.animationUrl) || undefined,
      gameData: gameImportData.value || undefined,
    }

    // Inject user profile + TTS data into settings if provided
    const extraBlocks: string[] = []
    if (userParts.length > 0 || userData.avatar) {
      const userBlock: string[] = ['【用户设定】']
      if (userData.avatar) userBlock.push('用户头像：已配置')
      if (userParts.length) userBlock.push(...userParts)
      extraBlocks.push(userBlock.join('\n'))
    }
    if (ttsInfo) {
      extraBlocks.push(`【TTS音色设定】\n${ttsInfo}`)
    }
    if (narratorTtsInfo) {
      extraBlocks.push(`【旁白TTS设定】\n${narratorTtsInfo}`)
    }
    // Inject game records visible to all AI characters
    try {
      const records: Record<string, string> = JSON.parse(localStorage.getItem('echo_game_records') || '{}')
      const entries = Object.values(records)
      if (entries.length) {
        extraBlocks.push(`【用户游戏最佳记录】\n${entries.join('\n')}`)
      }
    } catch { /* no records */ }
    if (extraBlocks.length) {
      character.settings = settings + '\n\n' + extraBlocks.join('\n\n')
    }

    await characterStore.createCharacter(character)
    uni.showToast({ title: '角色已创建', icon: 'success' })
    router.push('/character')
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
$sky: #38bdf8;
$sky-light: #7dd3fc;
$mint: #34d399;
$mint-light: #6ee7b7;

.create-page {
  min-height: 100vh;
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
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

.header-placeholder { display: block; width: 48px; height: 48px; }

.back-btn {
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px; height: 48px; padding: 0;
  border: none; background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
  &:hover { opacity: 0.78; }
  &:active { transform: scale(0.95); }
}
.back-icon { width: 22px; height: 22px; }

.form-body {
  width: min(960px, calc(100% - 32px));
  margin: 16px auto 0;
}

.field-block { margin-bottom: 18px; }

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.field-hint {
  margin: 10px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}

.media-hint {
  color: rgba(56, 189, 248, 0.5);
}

.chip-row { display: flex; flex-wrap: wrap; gap: 10px; }

.category-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  &:focus { outline: none; border-color: rgba(56, 189, 248, 0.36); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.category-chip {
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.06);
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:hover { background: rgba(52, 211, 153, 0.12); color: var(--text-primary); }
  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78));
    border-color: transparent; color: #fff; font-weight: 700;
  }
  &.theme-chip {
    border-color: rgba(56, 189, 248, 0.18); background: rgba(56, 189, 248, 0.08);
    &:hover { background: rgba(56, 189, 248, 0.15); }
    &.active {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80));
      border-color: transparent; color: #fff; font-weight: 700;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.30);
    }
  }
}

.section-block {
  margin-top: 0;
  padding: 4px 0;
  border-top: none;
}

.section-block + .section-block {
  margin-top: 0;
}

.section-title {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.avatar-wrapper {
  width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.2); flex-shrink: 0;
  &.small { width: 40px; height: 40px; }
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-tertiary); font-size: 22px; font-weight: 600;
}
.avatar-actions { display: flex; gap: 8px; }
.avatar-btn {
  padding: 5px 12px;
  border: 1px solid rgba(52, 211, 153, 0.12); border-radius: 6px;
  background: transparent; color: var(--text-tertiary);
  font: inherit; font-size: 12px; cursor: pointer;
  transition: all 0.15s;
  display: inline-flex; align-items: center; gap: 4px;
  &:hover { border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.media-upload-row {
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}

.remove-media-btn {
  border-color: rgba(248, 113, 113, 0.15);
  &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); }
}

.game-option-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.game-option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56, 189, 248, 0.25); background: rgba(56, 189, 248, 0.04); }
  &.active { border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.08); }
}

.game-option-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.08);
  color: rgba(56, 189, 248, 0.6);
}

.game-option-card.active .game-option-icon {
  background: rgba(56, 189, 248, 0.15);
  color: rgba(56, 189, 248, 0.8);
}

.game-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.game-option-title {
  font-size: 13px;
  font-weight: 500;
}

.game-option-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

.field-select {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 16px;
  transition: border-color 0.2s;
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.hidden-file-input { display: none; }

.game-file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.game-file-tag {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 4px;
  color: rgba(52, 211, 153, 0.7);
  font-size: 11px;
}

.game-preview {
  margin: 4px 0 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
}

.media-preview {
  margin-top: 6px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  max-height: 120px;
  &.small { max-height: 80px; }

  img {
    width: 100%;
    max-height: 120px;
    object-fit: cover;
    display: block;
  }
}

.emotion-add-btn {
  margin-top: 4px;
}

.tts-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.tts-row .field-input {
  flex: 1;
}

.weight-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.weight-input {
  width: 64px;
  text-align: center;
}

.emotion-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
}

.emotion-input {
  flex: 1;
}

.emotion-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.user-textarea {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  resize: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}

.field-item { display: flex; flex-direction: column; gap: 0; }
.field-item .field-label {
  padding: 0 2px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 4px;
}
.field-item .required { color: rgba(248, 113, 113, 0.7); }
.field-input {
  width: 100%; padding: 7px 0;
  border: none; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0; background: transparent;
  color: var(--text-primary); font: inherit; font-size: 14px;
  line-height: 1.4; box-sizing: border-box; outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
}

.section-body {
  display: flex; flex-direction: column; gap: 12px;
  padding-top: 4px;
}

.submit-bar {
  position: sticky; bottom: 0; z-index: 10;
  width: min(960px, calc(100% - 32px));
  margin: 24px auto 0;
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(5, 13, 20, 0.95) 30%);
}

.primary-btn.full {
  width: 100%; min-height: 48px; border: none; border-radius: 14px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff; font: inherit; font-size: 16px; font-weight: 600;
  cursor: pointer; box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28);
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}
</style>
