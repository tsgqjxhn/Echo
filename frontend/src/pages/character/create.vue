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

      <!-- Identity section (name + avatar) -->
      <section class="section-block">
        <h3 class="section-title">角色身份</h3>
        <div class="avatar-row">
          <div class="avatar-wrapper">
            <img v-if="avatarPreview" :src="avatarPreview" alt="头像" class="avatar-img" />
            <div v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</div>
          </div>
          <div class="avatar-actions">
            <button type="button" class="avatar-btn" @click="uploadAvatar">上传头像</button>
          </div>
        </div>
        <div class="field-item">
          <label class="field-label">角色名称 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="field-input" maxlength="30" placeholder="例如：银翼调查员" />
        </div>
      </section>

      <!-- 基础设定 -->
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

      <!-- 高级设定 -->
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

      <!-- 特殊设定 -->
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
const showBasic = ref(false)
const showAdvanced = ref(false)
const showSpecial = ref(false)

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
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入角色名称', icon: 'none' })
    return
  }

  const greeting = String(templateData.value.greeting ?? '').trim()
  if (!greeting) {
    uni.showToast({ title: '请填写开场白', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const description = String(templateData.value.description ?? '').trim()
      || String(templateData.value.worldview ?? '').trim()
      || String(templateData.value.expertPersona ?? '').trim()
      || String(templateData.value.worldSandbox ?? '').trim()

    if (!description) {
      uni.showToast({ title: '请填写角色描述或相关基础设定', icon: 'none' })
      submitting.value = false
      return
    }

    const name = form.value.name.trim()
    const avatar = form.value.avatar || createSilverAvatarDataUrl(name)
    const settings = buildSettingsFromTemplate(
      form.value.category,
      form.value.subCategory,
      { ...templateData.value, _characterName: name },
      activeTemplate.value,
    )

    const character: Partial<ICharacter> = {
      name,
      avatar,
      background: `${form.value.category} / ${form.value.subCategory}`,
      description,
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
  &:hover { border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7; }
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
