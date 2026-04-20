<template>
  <div class="character-edit-page">
    <div class="header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">
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

      <h1 class="title">{{ isEdit ? '编辑角色' : '创建角色' }}</h1>

      <span class="header-placeholder" aria-hidden="true"></span>
    </div>

    <div class="form-container">
      <div class="avatar-section">
        <button type="button" class="avatar-wrapper" @click="chooseAvatar">
          <img
            v-if="formData.avatar"
            :src="formData.avatar"
            alt="角色头像"
            class="avatar-preview"
          />
          <div v-else class="avatar-placeholder">
            <span class="avatar-icon">+</span>
            <span class="avatar-tip">点击选择头像</span>
          </div>
        </button>
      </div>

      <div class="form-content">
        <div class="form-item">
          <label class="form-label">
            角色名称
            <span class="required">*</span>
          </label>
          <input
            v-model="formData.name"
            class="form-input"
            type="text"
            maxlength="50"
            placeholder="请输入角色名称，最多 50 字"
          />
          <span class="form-hint">{{ formData.name.length }}/50</span>
        </div>

        <div class="form-item">
          <label class="form-label">背景</label>
          <textarea
            v-model="formData.background"
            class="form-textarea"
            maxlength="500"
            rows="3"
            placeholder="角色背景故事，可选"
          ></textarea>
          <span class="form-hint">{{ formData.background.length }}/500</span>
        </div>

        <div class="form-item">
          <label class="form-label">
            描述
            <span class="required">*</span>
          </label>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            maxlength="1000"
            rows="4"
            placeholder="角色描述，必填"
          ></textarea>
          <span class="form-hint">{{ formData.description.length }}/1000</span>
        </div>

        <div class="form-item">
          <label class="form-label">开场白</label>
          <textarea
            v-model="formData.greeting"
            class="form-textarea"
            maxlength="500"
            rows="3"
            placeholder="首次对话时展示的开场白，可选"
          ></textarea>
          <span class="form-hint">{{ formData.greeting.length }}/500</span>
        </div>

        <div class="form-item">
          <label class="form-label">
            整体设定
            <span class="required">*</span>
          </label>
          <textarea
            v-model="formData.settings"
            class="form-textarea settings-input"
            maxlength="2000"
            rows="6"
            placeholder="角色性格、行为方式、说话风格等设定，必填"
          ></textarea>
          <span class="form-hint">{{ formData.settings.length }}/2000</span>
        </div>

        <div class="form-item">
          <label class="form-label">场景时间</label>
          <input
            v-model="formData.sceneTime"
            class="form-input"
            type="text"
            maxlength="30"
            placeholder="例如：深夜十一点、黄昏时分"
          />
          <span class="form-hint">聊天页顶部显示的时间文案，留空则不显示</span>
        </div>
      </div>

      <div class="submit-section">
        <button class="submit-btn" type="button" :disabled="!canSubmit" @click="onSubmit">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'

interface CharacterForm {
  id?: string
  name: string
  avatar: string
  background: string
  description: string
  greeting: string
  settings: string
  sceneTime: string
}

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const isEdit = ref(false)
const formData = ref<CharacterForm>({
  name: '',
  avatar: '',
  background: '',
  description: '',
  greeting: '',
  settings: '',
  sceneTime: '',
})

const canSubmit = computed(() =>
  Boolean(
    formData.value.name.trim() &&
    formData.value.description.trim() &&
    formData.value.settings.trim(),
  ),
)

onMounted(() => {
  const id = route.query.id as string
  if (id) {
    isEdit.value = true
    void loadCharacter(id)
  }
})

async function loadCharacter(id: string) {
  const character = await characterStore.getCharacterById(id)
  if (!character) {
    uni.showToast({ title: '角色不存在', icon: 'none' })
    router.back()
    return
  }

  formData.value = {
    id: character.id,
    name: character.name,
    avatar: character.avatar || '',
    background: character.background || '',
    description: character.description,
    greeting: character.greeting || '',
    settings: character.settings,
    sceneTime: character.sceneTime || '',
  }
}

function goBack() {
  router.back()
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const imagePath = res.tempFilePaths?.[0]
      if (imagePath) {
        formData.value.avatar = imagePath
      }
    },
  })
}

async function onSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }

  try {
    if (isEdit.value && formData.value.id) {
      const currentCharacter = await characterStore.getCharacterById(formData.value.id)
      if (!currentCharacter) {
        uni.showToast({ title: '角色不存在', icon: 'none' })
        return
      }

      await characterStore.updateCharacter({
        ...currentCharacter,
        ...formData.value,
        name: formData.value.name.trim(),
        background: formData.value.background.trim(),
        description: formData.value.description.trim(),
        greeting: formData.value.greeting.trim(),
        settings: formData.value.settings.trim(),
        sceneTime: formData.value.sceneTime.trim(),
      } as ICharacter)

      uni.showToast({ title: '保存成功', icon: 'success' })
      return
    }

    await characterStore.createCharacter({
      name: formData.value.name.trim(),
      avatar: formData.value.avatar,
      background: formData.value.background.trim(),
      description: formData.value.description.trim(),
      greeting: formData.value.greeting.trim(),
      settings: formData.value.settings.trim(),
      sceneTime: formData.value.sceneTime.trim(),
    })

    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => {
      goBack()
    }, 1200)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.character-edit-page {
  min-height: 100vh;
  padding: 0 0 132px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: 14px;
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
  width: 18px;
  height: 18px;
  overflow: visible;
}

.title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.header-placeholder {
  width: 42px;
  height: 42px;
}

.form-container {
  width: min(920px, calc(100% - 32px));
  margin: 18px auto 0;
  padding-bottom: 120px;
}

.avatar-section {
  padding-bottom: 20px;
}

.avatar-wrapper {
  width: 100%;
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 32px;
  background: var(--hero-gradient);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(var(--backdrop-blur));
}

.avatar-preview {
  width: 136px;
  height: 136px;
  border: 1px solid var(--border-light);
  border-radius: 36px;
  object-fit: cover;
  box-shadow: var(--shadow-xl);
}

.avatar-placeholder {
  width: 136px;
  height: 136px;
  border: 1px dashed var(--border-light);
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
}

.avatar-icon {
  font-size: 32px;
  line-height: 1;
}

.avatar-tip {
  font-size: 12px;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  margin: 0;
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.required {
  margin-left: 4px;
  color: #ff9d9d;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--input-border);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(46, 51, 57, 0.28), rgba(24, 27, 31, 0.56));
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-strong);
  transform: translateY(-1px);
  box-shadow: var(--focus-ring);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-secondary);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.settings-input {
  min-height: 140px;
}

.form-hint {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  text-align: right;
}

.submit-section {
  position: fixed;
  left: 50%;
  bottom: 18px;
  width: min(920px, calc(100% - 32px));
  padding: 14px;
  transform: translateX(-50%);
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(34, 38, 43, 0.88), rgba(8, 9, 10, 0.96));
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(var(--backdrop-blur));
}

.submit-btn {
  width: 100%;
  min-height: 54px;
  border: none;
  border-radius: 18px;
  background: var(--interactive-gradient);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);
  box-shadow: 0 20px 44px rgba(113, 129, 146, 0.24);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 24px 56px rgba(113, 129, 146, 0.3);
}

@media (max-width: 720px) {
  .header {
    padding-left: 16px;
    padding-right: 16px;
  }

  .form-container {
    width: calc(100% - 20px);
  }

  .submit-section {
    width: calc(100% - 24px);
    bottom: 12px;
  }
}
</style>
