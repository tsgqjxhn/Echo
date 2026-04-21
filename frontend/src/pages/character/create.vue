<template>
  <div class="create-page">
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
      <h1 class="page-title">创建角色</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <main class="form-body">
      <div class="field-block">
        <span class="field-label">分类</span>
        <select v-model="createForm.category" class="category-select">
          <option v-for="group in categoryGroups" :key="group.label" :value="group.label">
            {{ group.label }}
          </option>
        </select>
        <p class="field-hint">系统会自动匹配为 {{ resolvedModeLabel }} 模式。</p>
      </div>

      <div v-if="createFormSmallCategories.length" class="field-block">
        <span class="field-label">子分类</span>
        <div class="chip-row">
          <button
            v-for="item in createFormSmallCategories"
            :key="item"
            type="button"
            class="category-chip"
            :class="{ active: createForm.subCategory === item }"
            @click="createForm.subCategory = item"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div class="field-block">
        <span class="field-label">主题</span>
        <select v-model="createForm.themeGroup" class="category-select">
          <option value="">选择主题大类</option>
          <option v-for="tg in themeGroups" :key="tg.label" :value="tg.label">
            {{ tg.label }}
          </option>
        </select>
      </div>

      <div v-if="currentThemeLeaves.length" class="field-block">
        <span class="field-label">主题细类</span>
        <div class="chip-row">
          <button
            v-for="leaf in currentThemeLeaves"
            :key="leaf"
            type="button"
            class="category-chip theme-chip"
            :class="{ active: createForm.themeType === leaf }"
            @click="createForm.themeType = leaf"
          >
            {{ leaf }}
          </button>
        </div>
      </div>

      <div class="field-grid">
        <label class="field">
          <span>角色名称</span>
          <input v-model="createForm.name" type="text" maxlength="30" placeholder="例如：银翼调查员" />
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

      <button type="button" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? '收起高级设定' : '展开高级设定' }}
      </button>

      <div v-if="showAdvanced">
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
    </main>

    <div class="submit-bar">
      <button type="button" class="primary-btn full" :disabled="submitting" @click="submitCreateCharacter">
        {{ submitting ? '创建中…' : '创建角色' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { createSilverAvatarDataUrl, createSilverBackdropDataUrl } from '@/utils/silver-art'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'
import {
  DEFAULT_CATEGORY,
  getCategoryGroups,
  getFirstSubCategory,
  getThemeGroups,
  inferCharacterMode
} from '@/data/taxonomy'

type CharacterMode = NonNullable<ICharacter['mode']>

const router = useRouter()
const characterStore = useCharacterStore()
const submitting = ref(false)
const showAdvanced = ref(false)

const categoryGroups = getCategoryGroups()
const themeGroups = getThemeGroups()

const createForm = ref({
  name: '',
  category: DEFAULT_CATEGORY,
  subCategory: getFirstSubCategory(DEFAULT_CATEGORY),
  themeGroup: '',
  themeType: '',
  description: '',
  greeting: '',
  personality: '',
  behavior: '',
  values: '',
  membersInput: ''
})

const currentThemeLeaves = computed(() => {
  return themeGroups.find(g => g.label === createForm.value.themeGroup)?.items || []
})

const createFormSmallCategories = computed(() => {
  return categoryGroups.find(group => group.label === createForm.value.category)?.items || []
})

const resolvedMode = computed<CharacterMode>(() =>
  inferCharacterMode({
    category: createForm.value.category,
    subCategory: createForm.value.subCategory
  })
)

const resolvedModeLabel = computed(() => getModeLabel(resolvedMode.value))

watch(
  () => createForm.value.category,
  nextCategory => {
    if (!createFormSmallCategories.value.includes(createForm.value.subCategory)) {
      createForm.value.subCategory = getFirstSubCategory(nextCategory)
    }
  },
  { immediate: true }
)

watch(
  () => createForm.value.themeGroup,
  () => {
    createForm.value.themeType = ''
  }
)

const generatedAvatarPreview = computed(() => createSilverAvatarDataUrl(createForm.value.name || '银'))
const generatedBackdropPreview = computed(() =>
  createSilverBackdropDataUrl(
    createForm.value.name || '银色角色',
    `${createForm.value.category} · ${createForm.value.subCategory}`
  )
)

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

function normalizeMembers(value: string): string[] {
  return value.split(/[，,、]/).map(item => item.trim()).filter(Boolean)
}

function buildSettingsSummary(): string {
  return [
    `分类：${createForm.value.category}`,
    `子分类：${createForm.value.subCategory}`,
    `主题：${createForm.value.themeType || '未选择'}`,
    `系统模式：${resolvedModeLabel.value}`,
    `性格：${createForm.value.personality || '未补充'}`,
    `行为：${createForm.value.behavior || '未补充'}`,
    `价值观：${createForm.value.values || '未补充'}`,
    `群聊成员：${normalizeMembers(createForm.value.membersInput).join('、') || '无'}`
  ].join('\n')
}

async function submitCreateCharacter() {
  if (!createForm.value.name.trim() || !createForm.value.description.trim()) {
    uni.showToast({ title: '请先补全角色名称和描述', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const character: Partial<ICharacter> = {
      name: createForm.value.name.trim(),
      avatar: createSilverAvatarDataUrl(createForm.value.name),
      background: `${createForm.value.category} / ${createForm.value.subCategory}`,
      description: createForm.value.description.trim(),
      greeting: createForm.value.greeting.trim(),
      settings: buildSettingsSummary(),
      mode: resolvedMode.value,
      category: createForm.value.category,
      subCategory: createForm.value.subCategory,
      avatarTone: 'silver',
      backgroundImage: createSilverBackdropDataUrl(
        createForm.value.name,
        `${createForm.value.category} · ${createForm.value.subCategory}`
      ),
      personality: createForm.value.personality.trim(),
      behavior: createForm.value.behavior.trim(),
      values: createForm.value.values.trim(),
      members: normalizeMembers(createForm.value.membersInput),
      tags: [createForm.value.category, createForm.value.subCategory, createForm.value.themeType].filter(Boolean),
      sourceType: 'manual'
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

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
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
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);

  &:hover { opacity: 0.78; }
  &:active { transform: scale(0.95); }
}

.back-icon {
  width: 22px;
  height: 22px;
}

.form-body {
  width: min(960px, calc(100% - 32px));
  margin: 16px auto 0;
}

.field-block {
  margin-bottom: 18px;
}

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

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

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

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
  }

  option {
    background: #0a1e2c;
    color: var(--text-primary);
  }
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

  &:hover {
    background: rgba(52, 211, 153, 0.12);
    color: var(--text-primary);
  }

  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78));
    border-color: transparent;
    color: #fff;
    font-weight: 700;
  }

  &.theme-chip {
    border-color: rgba(56, 189, 248, 0.18);
    background: rgba(56, 189, 248, 0.08);

    &:hover {
      background: rgba(56, 189, 248, 0.15);
    }

    &.active {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.80));
      border-color: transparent;
      color: #fff;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.30);
    }
  }
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 14px;

  &.dual {
    grid-template-columns: repeat(2, 1fr);
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: var(--text-secondary);
    font-size: 13px;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    font: inherit;
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: rgba(56, 189, 248, 0.36);
    }
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  select {
    cursor: pointer;
  }
}

.advanced-toggle {
  width: 100%;
  min-height: 42px;
  margin-top: 14px;
  border: 1px solid rgba(52, 211, 153, 0.18);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.08);
  color: $mint-light;
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: rgba(52, 211, 153, 0.16);
  }
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.preview-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.preview-backdrop {
  width: 100%;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
}

.submit-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  width: min(960px, calc(100% - 32px));
  margin: 24px auto 0;
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(5, 13, 20, 0.95) 30%);
}

.primary-btn.full {
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
