<template>
  <div class="character-list-page">
    <section class="search-strip">
      <button type="button" class="circle-tool" @click="showCreateSheet = true">
        <img :src="createCharacterIcon" alt="创建角色" class="tool-icon" />
      </button>

      <label class="search-box">
        <img :src="searchIcon" alt="搜索" class="search-icon" />
        <input
          v-model="searchKeyword"
          class="search-input"
          type="search"
          placeholder="搜索感兴趣的内容"
        />
      </label>

      <button type="button" class="circle-tool" @click="openImportSheet">
        <img :src="importCharacterIcon" alt="导入角色" class="tool-icon" />
      </button>
    </section>

    <section class="category-panel">
      <div class="big-category-row">
        <button
          v-for="group in browseCategoryGroups"
          :key="group.label"
          type="button"
          class="category-chip large"
          :class="{ active: selectedBigCategory === group.label }"
          @click="selectBigCategory(group.label)"
        >
          {{ group.label }}
        </button>
      </div>

      <div class="small-category-row">
        <button
          type="button"
          class="category-chip"
          :class="{ active: selectedSmallCategory === '' }"
          @click="selectedSmallCategory = ''"
        >
          全部
        </button>
        <button
          v-for="item in currentSmallCategories"
          :key="item"
          type="button"
          class="category-chip"
          :class="{ active: selectedSmallCategory === item }"
          @click="selectedSmallCategory = item"
        >
          {{ item }}
        </button>
      </div>
    </section>

    <section class="featured-panel">
      <article
        v-for="character in filteredCharacters"
        :key="character.id"
        class="character-card"
        @click="goToDetail(character.id)"
      >
        <div class="card-topbar">
          <span class="meta-chip meta-chip--top">{{ getModeLabel(character.mode) }}</span>
          <span class="meta-chip meta-chip--top subtle">{{ character.category || '剧情' }}</span>
          <span v-if="character.subCategory" class="meta-chip meta-chip--top subtle">{{ character.subCategory }}</span>
        </div>

        <div class="card-body">
          <h2>{{ character.name }}</h2>
          <p>{{ character.description }}</p>
          <span class="card-date">{{ formatDate(character.createdAt) }}</span>
        </div>
      </article>
    </section>

    <section v-if="filteredCharacters.length === 0" class="empty-card">
      <p class="eyebrow">内容为空</p>
      <h2>当前条件下还没有角色</h2>
      <p>可以换个分类看看，或者直接用左侧创建按钮生成一个新角色。</p>
      <button type="button" class="primary-btn" @click="showCreateSheet = true">立即创建</button>
    </section>

    <div v-if="showCreateSheet" class="overlay" @click.self="showCreateSheet = false">
      <section class="sheet">
        <div class="sheet-head">
          <div>
            <p class="eyebrow">创建角色</p>
            <h2>先定玩法，再补全设定</h2>
          </div>
          <button type="button" class="close-btn" @click="showCreateSheet = false">关闭</button>
        </div>

        <div class="sheet-scroll">
          <div class="field-block">
            <span class="field-label">快速模板</span>
            <div class="chip-row template-row">
              <button
                v-for="template in quickCreateTemplates"
                :key="template.label"
                type="button"
                class="category-chip"
                @click="applyCreateTemplate(template)"
              >
                {{ template.label }}
              </button>
            </div>
          </div>

          <div class="field-block">
            <span class="field-label">大类型</span>
            <div class="chip-row">
              <button
                v-for="mode in modeOptions"
                :key="mode.value"
                type="button"
                class="category-chip"
                :class="{ active: createForm.mode === mode.value }"
                @click="createForm.mode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <div class="field-grid">
            <label class="field">
              <span>角色名称</span>
              <input v-model="createForm.name" type="text" maxlength="30" placeholder="例如：银翼调查员" />
            </label>

            <label class="field">
              <span>大分类</span>
              <select v-model="createForm.category">
                <option v-for="group in categoryGroups" :key="group.label" :value="group.label">
                  {{ group.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>小分类</span>
              <select v-model="createForm.subCategory">
                <option v-for="item in createFormSmallCategories" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>开场白</span>
              <textarea v-model="createForm.greeting" rows="3" placeholder="第一次见面时角色会说什么"></textarea>
            </label>
          </div>

          <label class="field">
            <span>角色描述</span>
            <textarea
              v-model="createForm.description"
              rows="5"
              placeholder="写下角色背景、任务、关系、目标等信息"
            ></textarea>
          </label>

          <button type="button" class="advanced-toggle" @click="showAdvancedCreateFields = !showAdvancedCreateFields">
            {{ showAdvancedCreateFields ? '收起高级设定' : '展开高级设定' }}
          </button>

          <div v-if="showAdvancedCreateFields">
            <div class="field-grid dual">
              <label class="field">
                <span>性格</span>
                <textarea v-model="createForm.personality" rows="3" placeholder="例如：冷静、克制、观察力强"></textarea>
              </label>

              <label class="field">
                <span>行为</span>
                <textarea v-model="createForm.behavior" rows="3" placeholder="例如：先分析再下结论"></textarea>
              </label>
            </div>

            <div class="field-grid dual">
              <label class="field">
                <span>价值观</span>
                <textarea v-model="createForm.values" rows="3" placeholder="例如：真相优先、保护同伴"></textarea>
              </label>

              <label class="field">
                <span>群聊成员</span>
                <input v-model="createForm.membersInput" type="text" placeholder="多个成员用顿号或逗号分隔" />
              </label>
            </div>

            <div class="preview-grid">
              <article class="preview-card">
                <p class="field-label">银色头像预览</p>
                <img :src="generatedAvatarPreview" alt="银色头像预览" class="preview-avatar" />
              </article>

              <article class="preview-card">
                <p class="field-label">银色背景预览</p>
                <img :src="generatedBackdropPreview" alt="银色背景预览" class="preview-backdrop" />
              </article>
            </div>
          </div>
        </div>

        <button type="button" class="primary-btn full" @click="submitCreateCharacter">
          创建角色
        </button>
      </section>
    </div>

    <div v-if="showImportSheet" class="overlay" @click.self="showImportSheet = false">
      <section class="sheet import-sheet">
        <div class="sheet-head">
          <div>
            <p class="eyebrow">导入文档</p>
            <h2>从文件里提取角色设定</h2>
          </div>
          <button type="button" class="close-btn" @click="showImportSheet = false">关闭</button>
        </div>

        <div class="sheet-scroll">
          <p class="sheet-copy">
            当前优先支持 `txt`、`md`、`json`、`csv`。导入后会自动生成银色头像和背景，并将文档内容整理成角色设定。
          </p>

          <input
            ref="importFileInput"
            class="hidden-input"
            type="file"
            accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
            @change="onImportFileChange"
          />

          <div class="import-box">
            <button type="button" class="action-btn" @click="triggerImportFile">选择文档</button>
            <span>{{ selectedImportFileName || '尚未选择文件' }}</span>
          </div>

          <label class="field">
            <span>导入后使用的大分类</span>
            <select v-model="importCategory">
              <option v-for="group in categoryGroups" :key="group.label" :value="group.label">
                {{ group.label }}
              </option>
            </select>
          </label>
        </div>

        <button type="button" class="primary-btn full" :disabled="!selectedImportFile" @click="submitImportDocument">
          导入并生成角色
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import createCharacterIcon from '@/static/images/create-character.svg'
import importCharacterIcon from '@/static/images/import-character.svg'
import searchIcon from '@/static/images/search-action.svg'
import defaultAvatar from '@/static/images/default-avatar.svg'
import { useCharacterStore } from '@/stores/character'
import { dataManagementService } from '@/services/data-management'
import { createSilverAvatarDataUrl, createSilverBackdropDataUrl } from '@/utils/silver-art'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'
import { ensureStoryCharacter, loadStoryLibrary } from '@/services/story-conversations'

type CharacterMode = NonNullable<ICharacter['mode']>

const router = useRouter()
const characterStore = useCharacterStore()

const searchKeyword = ref('')
const selectedBigCategory = ref('全部')
const selectedSmallCategory = ref('')
const showCreateSheet = ref(false)
const showImportSheet = ref(false)
const showAdvancedCreateFields = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const selectedImportFile = ref<File | null>(null)
const importCategory = ref('剧情')

const modeOptions: Array<{ label: string; value: CharacterMode }> = [
  { label: '闯关式对话', value: 'challenge-dialogue' },
  { label: '自由对话', value: 'free-dialogue' },
  { label: '群聊', value: 'group-chat' },
  { label: '群聊闯关', value: 'group-challenge' }
]

const categoryGroups = [
  { label: '剧情', items: ['都市', '校园', '悬疑', '古风', '治愈'] },
  { label: '游戏剧情', items: ['冒险', '推理', '末日', '战术', '生存'] },
  { label: '对话闯关', items: ['密室', '解谜', '副本', '逃生', '多结局'] },
  { label: '自由对话', items: ['陪伴', '恋爱', '日常', '脑洞', '养成'] },
  { label: '群聊', items: ['宿舍', '公司', '社团', '亲友', '同好会'] },
  { label: '群聊闯关', items: ['阵营对抗', '团队解谜', '副本合作', '规则推演', '破局逃脱'] }
] as const

const browseCategoryGroups = [
  { label: '全部', items: [] as string[] },
  { label: '故事', items: ['回声'] },
  ...categoryGroups.map(group => ({ label: group.label, items: [...group.items] }))
]

const createForm = ref({
  name: '',
  mode: 'free-dialogue' as CharacterMode,
  category: '剧情',
  subCategory: '都市',
  description: '',
  greeting: '',
  personality: '',
  behavior: '',
  values: '',
  membersInput: ''
})

const quickCreateTemplates = [
  {
    label: '陪伴型',
    mode: 'free-dialogue' as CharacterMode,
    category: '自由对话',
    subCategory: '陪伴',
    personality: '温和，敏感，会接住情绪',
    behavior: '先共情，再顺着你的话题继续聊',
    values: '陪伴感和稳定感优先',
    greeting: '我在，你慢慢说。',
  },
  {
    label: '悬疑型',
    mode: 'challenge-dialogue' as CharacterMode,
    category: '剧情',
    subCategory: '悬疑',
    personality: '冷静，谨慎，观察力强',
    behavior: '优先梳理线索，再推进判断',
    values: '真相优先',
    greeting: '先别急，把你看到的细节按顺序告诉我。',
  },
  {
    label: '群像型',
    mode: 'group-chat' as CharacterMode,
    category: '群聊',
    subCategory: '社团',
    personality: '活跃，互相抬杠，但关系熟',
    behavior: '多人插话，节奏快',
    values: '热闹和关系感优先',
    greeting: '人齐了，今天谁先开口？',
  }
]

const currentSmallCategories = computed(() => {
  return browseCategoryGroups.find(group => group.label === selectedBigCategory.value)?.items || []
})

const createFormSmallCategories = computed(() => {
  return categoryGroups.find(group => group.label === createForm.value.category)?.items || []
})

const filteredCharacters = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return [...characterStore.characters]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .filter(character => {
      const characterCategory = character.category || '剧情'
      const matchesBig =
        !selectedBigCategory.value ||
        selectedBigCategory.value === '全部' ||
        characterCategory === selectedBigCategory.value
      const matchesSmall = !selectedSmallCategory.value || (character.subCategory || '') === selectedSmallCategory.value
      const matchesSearch =
        !keyword ||
        [
          character.name,
          character.description,
          character.category || '',
          character.subCategory || '',
          character.personality || '',
          character.behavior || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      return matchesBig && matchesSmall && matchesSearch
    })
})


const generatedAvatarPreview = computed(() => createSilverAvatarDataUrl(createForm.value.name || '银'))
const generatedBackdropPreview = computed(() =>
  createSilverBackdropDataUrl(
    createForm.value.name || '银色角色',
    `${getModeLabel(createForm.value.mode)} · ${createForm.value.category} · ${createForm.value.subCategory}`
  )
)
const selectedImportFileName = computed(() => selectedImportFile.value?.name || '')

onMounted(async () => {
  const library = loadStoryLibrary()
  await ensureStoryCharacter(library.characterName)
  await characterStore.loadCharacters({ sortBy: 'updatedAt', sortOrder: 'desc' })
})

function selectBigCategory(label: string) {
  selectedBigCategory.value = label
  const group = browseCategoryGroups.find(item => item.label === label)
  const hasSelectedSmallCategory = group?.items.some(item => item === selectedSmallCategory.value) ?? false
  if (!hasSelectedSmallCategory) {
    selectedSmallCategory.value = ''
  }
}

function getModeLabel(mode?: ICharacter['mode']): string {
  switch (mode) {
    case 'challenge-dialogue':
      return '闯关式对话'
    case 'group-chat':
      return '群聊'
    case 'group-challenge':
      return '群聊闯关'
    case 'free-dialogue':
    default:
      return '自由对话'
  }
}


function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

function goToDetail(id: string) {
  router.push(`/character/detail/${id}`)
}



function buildSettingsSummary() {
  return [
    `玩法类型：${getModeLabel(createForm.value.mode)}`,
    `大分类：${createForm.value.category}`,
    `小分类：${createForm.value.subCategory}`,
    `性格：${createForm.value.personality || '未补充'}`,
    `行为：${createForm.value.behavior || '未补充'}`,
    `价值观：${createForm.value.values || '未补充'}`,
    `群聊成员：${normalizeMembers(createForm.value.membersInput).join('、') || '无'}`
  ].join('\n')
}


function applyCreateTemplate(template: typeof quickCreateTemplates[number]) {
  createForm.value.mode = template.mode
  createForm.value.category = template.category
  createForm.value.subCategory = template.subCategory
  createForm.value.personality = template.personality
  createForm.value.behavior = template.behavior
  createForm.value.values = template.values
  createForm.value.greeting = template.greeting
  showAdvancedCreateFields.value = true
}

function normalizeMembers(value: string): string[] {
  return value
    .split(/[，,、]/)
    .map(item => item.trim())
    .filter(Boolean)
}

async function submitCreateCharacter() {
  if (!createForm.value.name.trim() || !createForm.value.description.trim()) {
    uni.showToast({ title: '请先补全角色名称和描述', icon: 'none' })
    return
  }

  const character: Partial<ICharacter> = {
    name: createForm.value.name.trim(),
    avatar: createSilverAvatarDataUrl(createForm.value.name),
    background: `${createForm.value.category} / ${createForm.value.subCategory}`,
    description: createForm.value.description.trim(),
    greeting: createForm.value.greeting.trim(),
    settings: buildSettingsSummary(),
    mode: createForm.value.mode,
    category: createForm.value.category,
    subCategory: createForm.value.subCategory,
    avatarTone: 'silver',
    backgroundImage: createSilverBackdropDataUrl(
      createForm.value.name,
      `${getModeLabel(createForm.value.mode)} · ${createForm.value.category}`
    ),
    personality: createForm.value.personality.trim(),
    behavior: createForm.value.behavior.trim(),
    values: createForm.value.values.trim(),
    members: normalizeMembers(createForm.value.membersInput),
    tags: [createForm.value.category, createForm.value.subCategory],
    sourceType: 'manual'
  }

  await characterStore.createCharacter(character)
  await characterStore.loadCharacters({ sortBy: 'updatedAt', sortOrder: 'desc' })

  showCreateSheet.value = false
  uni.showToast({ title: '角色已创建', icon: 'success' })
  resetCreateForm()
}

function resetCreateForm() {
  createForm.value = {
    name: '',
    mode: 'free-dialogue',
    category: '剧情',
    subCategory: '都市',
    description: '',
    greeting: '',
    personality: '',
    behavior: '',
    values: '',
    membersInput: ''
  }
  showAdvancedCreateFields.value = false
}

function openImportSheet() {
  showImportSheet.value = true
}

function triggerImportFile() {
  importFileInput.value?.click()
}

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedImportFile.value = input.files?.[0] || null
}

async function submitImportDocument() {
  if (!selectedImportFile.value) {
    uni.showToast({ title: '请先选择文档', icon: 'none' })
    return
  }

  try {
    const firstSubCategory = categoryGroups.find(group => group.label === importCategory.value)?.items[0] || '通用'
    const importedCharacter = await dataManagementService.importCharacterDocument(
      selectedImportFile.value,
      importCategory.value
    )

    await characterStore.updateCharacter({
      ...importedCharacter,
      avatar: importedCharacter.avatar || createSilverAvatarDataUrl(importedCharacter.name),
      background: importedCharacter.background || `${importCategory.value} / ${firstSubCategory}`,
      subCategory: importedCharacter.subCategory || firstSubCategory,
      avatarTone: importedCharacter.avatarTone || 'silver',
      backgroundImage:
        importedCharacter.backgroundImage ||
        createSilverBackdropDataUrl(importedCharacter.name, `${importCategory.value} · 文档导入`),
      tags: Array.from(new Set([...(importedCharacter.tags || []), importCategory.value, firstSubCategory, '文档导入']))
    })

    await characterStore.loadCharacters({ sortBy: 'updatedAt', sortOrder: 'desc' })
    showImportSheet.value = false
    selectedImportFile.value = null
    if (importFileInput.value) {
      importFileInput.value.value = ''
    }
    uni.showToast({ title: '文档角色已生成', icon: 'success' })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '导入文档失败',
      icon: 'none'
    })
  }
}
</script>

<style lang="scss" scoped>
// ── 深海主题 · 角色列表页 ─────────────────────────────
$sky: #38bdf8;
$sky-light: #7dd3fc;
$sky-glow: rgba(56, 189, 248, 0.22);
$mint: #34d399;
$mint-light: #6ee7b7;
$mint-glow: rgba(52, 211, 153, 0.16);
$cyan: #67e8f9;

.character-list-page {
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
  padding: 0 0 96px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.character-list-page::-webkit-scrollbar,
.sheet-scroll::-webkit-scrollbar {
  display: none;
}

// ── 通用卡片边框基础 ─────────────────────────────────
.story-spotlight,
.character-card,
.empty-card,
.sheet {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

// ── 回声故事卡 ───────────────────────────────────────
.story-spotlight {
  margin-top: 14px;
  padding: 20px;
  border-radius: 18px;
}


.story-spotlight {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-color: rgba(56, 189, 248, 0.20);
  background:
    radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.16) 0%, transparent 44%),
    radial-gradient(circle at 20% 80%, rgba(52, 211, 153, 0.10) 0%, transparent 40%),
    linear-gradient(145deg, rgba(36, 16, 52, 0.92), rgba(14, 8, 28, 0.98));
  transition: border-color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    border-color: rgba(56, 189, 248, 0.32);
    box-shadow: 0 24px 64px rgba(56, 189, 248, 0.12), 0 8px 24px rgba(0, 0, 0, 0.48);
    cursor: pointer;
  }
}

.story-spotlight h2 {
  margin-top: 10px;
  background: linear-gradient(135deg, $sky-light, $sky, $mint-light);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 30px;
}

.story-copy {
  margin-top: 10px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.story-entry-btn {
  flex-shrink: 0;
  min-width: 96px;
  min-height: 42px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.30);
  transition: transform var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(56, 189, 248, 0.42);
  }
}

// ── 搜索条 ───────────────────────────────────────────
.search-strip {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 0;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 0 12px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.search-strip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.circle-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  transition: transform var(--transition-base), opacity var(--transition-base);

  &:hover {
    opacity: 0.78;
  }
}

.tool-icon {
  width: 22px;
  height: 22px;
  opacity: 0.85;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.search-icon {
  width: 18px;
  height: 18px;
  opacity: 0.75;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

// ── 分类面板 ─────────────────────────────────────────
.category-panel {
  width: min(1080px, calc(100% - 32px));
  margin: 5px auto 0;
  padding: 0 0 10px;
}


.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.eyebrow {
  color: $sky-light;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
}

.panel-head h1 {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.2;
}

.panel-head strong {
  color: var(--text-primary);
  font-size: 40px;
  line-height: 1;
}

// ── 分类 Chip ────────────────────────────────────────
.big-category-row,
.small-category-row,
.chip-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.big-category-row::-webkit-scrollbar,
.small-category-row::-webkit-scrollbar,
.chip-row::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.07);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.14);
    color: var(--text-primary);
  }

  &.large {
    min-height: 44px;
    font-weight: 600;
  }

  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80));
    border-color: transparent;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.26);
  }
}

// ── 角色卡片列表 ─────────────────────────────────────
.featured-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin-top: 14px;
}

.character-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 208px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: rgba(8, 17, 28, 0.96);
  box-shadow: none;
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition-base);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;

  &:hover {
    transform: none;
    border-color: rgba(255, 255, 255, 0.98);
    box-shadow: none;
  }
}

.character-card:nth-child(odd):not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.88);
}

.card-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 54px;
  padding: 12px;
  background: transparent;
}

.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 12px 16px;
}

.card-body h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.card-body p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-date {
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.meta-chip {
  padding: 4px 8px;
  border-radius: 0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;

  &.subtle {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.16);
    color: rgba(255, 255, 255, 0.72);
  }
}

.meta-chip--top {
  letter-spacing: 0.02em;
}

.action-btn,
.primary-btn {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
}

.action-btn {
  flex: 1;
  border: 1px solid rgba(52, 211, 153, 0.16);
  background: rgba(52, 211, 153, 0.08);
  color: $mint-light;

  &:hover {
    background: rgba(52, 211, 153, 0.16);
    border-color: rgba(52, 211, 153, 0.26);
  }

  &.primary {
    flex: 1.2;
    border: none;
    background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.26);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 32px rgba(56, 189, 248, 0.38);
    }
  }
}

// ── 空状态 ───────────────────────────────────────────
.empty-card {
  width: min(1080px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 36px 28px;
  border-radius: 18px;
  text-align: center;
}

.empty-card h2 {
  margin: 10px 0;
  color: var(--text-primary);
  font-size: 24px;
}

.empty-card p {
  margin-bottom: 20px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.28);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(56, 189, 248, 0.40);
  }

  &.full {
    width: 100%;
    margin-top: 4px;
  }
}

// ── 弹出层 / Sheet ────────────────────────────────────
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(8, 4, 24, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10000;
}

.sheet {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: min(920px, 100%);
  max-height: calc(100vh - 36px);
  padding: 22px;
  border-radius: 20px;
  border-color: rgba(52, 211, 153, 0.16);
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sheet-head h2 {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 26px;
}

.close-btn {
  flex-shrink: 0;
  white-space: nowrap;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 10px;
  background: rgba(52, 211, 153, 0.07);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.14);
    color: var(--text-primary);
  }
}

.sheet-scroll {
  flex: 1;
  min-height: 0;
  margin: 18px 0;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.field-block + .field-block {
  margin-top: 18px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.field-grid.dual {
  margin-top: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.field-label,
.field span {
  color: var(--text-secondary);
  font-size: 13px;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 13px 16px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font: inherit;
  transition: border-color var(--transition-base);

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
    background: rgba(255, 255, 255, 0.14);
  }
}

.field textarea {
  resize: vertical;
}

.preview-grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  margin-top: 18px;
}

.preview-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(52, 211, 153, 0.10);
  background: rgba(255, 255, 255, 0.08);
}

.preview-avatar {
  width: 108px;
  height: 108px;
  margin-top: 14px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(56, 189, 248, 0.22);
}

.preview-backdrop {
  width: 100%;
  margin-top: 14px;
  border-radius: 12px;
  object-fit: cover;
}

.full {
  width: 100%;
}

.advanced-toggle {
  width: 100%;
  min-height: 42px;
  margin-top: 16px;
  border: 1px dashed rgba(52, 211, 153, 0.20);
  border-radius: 12px;
  background: transparent;
  color: $mint-light;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.07);
    border-color: rgba(52, 211, 153, 0.30);
  }
}

.sheet-copy {
  color: var(--text-secondary);
  line-height: 1.8;
  font-size: 14px;
}

.hidden-input {
  display: none;
}

.import-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-secondary);
  word-break: break-all;
}

// ── 响应式 ───────────────────────────────────────────
@media (max-width: 760px) {
  .field-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .story-spotlight {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .character-list-page {
    padding: 0 0 92px;
  }

  .search-strip {
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    gap: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .circle-tool {
    width: 42px;
    height: 42px;
  }

  .overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .sheet {
    padding: 18px;
    border-radius: 20px 20px 0 0;
    max-height: 92vh;
  }

  .category-panel,
  .empty-card {
    width: calc(100% - 20px);
  }
}
</style>
