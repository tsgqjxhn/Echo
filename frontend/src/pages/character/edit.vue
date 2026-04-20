<template>
  <div class="character-edit-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="title">{{ isEdit ? '编辑角色' : '创建角色' }}</h1>
      <div style="width: 36px;"></div>
    </div>

    <div class="form-container">
      <!-- 头像选择 -->
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="chooseAvatar">
          <img 
            v-if="formData.avatar" 
            :src="formData.avatar" 
            class="avatar-preview"
          />
          <div v-else class="avatar-placeholder">
            <span class="avatar-icon">📷</span>
            <span class="avatar-tip">点击选择头像</span>
          </div>
        </div>
      </div>

      <!-- 表单 -->
      <div class="form-content">
        <!-- 名称 -->
        <div class="form-item">
          <label class="form-label">
            角色名称
            <span class="required">*</span>
          </label>
          <input 
            v-model="formData.name"
            class="form-input"
            placeholder="请输入角色名称（1-50 字）"
            maxlength="50"
          />
          <span class="form-hint">{{ formData.name?.length || 0 }}/50</span>
        </div>

        <!-- 背景 -->
        <div class="form-item">
          <label class="form-label">背景</label>
          <textarea 
            v-model="formData.background"
            class="form-textarea"
            placeholder="角色的背景故事（可选）"
            maxlength="500"
            rows="3"
          />
          <span class="form-hint">{{ formData.background?.length || 0 }}/500</span>
        </div>

        <!-- 描述 -->
        <div class="form-item">
          <label class="form-label">
            描述
            <span class="required">*</span>
          </label>
          <textarea 
            v-model="formData.description"
            class="form-textarea"
            placeholder="角色描述（必填）"
            maxlength="1000"
            rows="4"
          />
          <span class="form-hint">{{ formData.description?.length || 0 }}/1000</span>
        </div>

        <!-- 开场白 -->
        <div class="form-item">
          <label class="form-label">开场白</label>
          <textarea 
            v-model="formData.greeting"
            class="form-textarea"
            placeholder="第一次对话的开场白（可选）"
            maxlength="500"
            rows="3"
          />
          <span class="form-hint">{{ formData.greeting?.length || 0 }}/500</span>
        </div>

        <!-- 总体设定 -->
        <div class="form-item">
          <label class="form-label">
            总体设定
            <span class="required">*</span>
          </label>
          <textarea
            v-model="formData.settings"
            class="form-textarea settings-input"
            placeholder="角色的性格、行为方式等设定（必填）"
            maxlength="2000"
            rows="6"
          />
          <span class="form-hint">{{ formData.settings?.length || 0 }}/2000</span>
        </div>

        <!-- 场景时间 -->
        <div class="form-item">
          <label class="form-label">场景时间</label>
          <input
            v-model="formData.sceneTime"
            class="form-input"
            placeholder="例：深夜十一点、黄昏时分（可选）"
            maxlength="30"
          />
          <span class="form-hint">对话时显示在顶栏，留空则不显示</span>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="submit-section">
        <button 
          class="submit-btn"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { uni } from '@/utils/uni-polyfill'
import type { ICharacter } from '@/types/character'

const route = useRoute()
const router = useRouter()
const characterStore = useCharacterStore()

const isEdit = ref(false)
const formData = ref<Partial<ICharacter>>({
  name: '',
  avatar: '',
  background: '',
  description: '',
  greeting: '',
  settings: ''
})

const canSubmit = computed(() => {
  return formData.value.name?.trim() && 
         formData.value.description?.trim() && 
         formData.value.settings?.trim()
})

onMounted(() => {
  const id = route.query.id as string
  if (id) {
    isEdit.value = true
    loadCharacter(id)
  }
})

async function loadCharacter(id: string) {
  const character = await characterStore.getCharacterById(id)
  if (character) {
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
}

function goBack() {
  router.back()
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        formData.value.avatar = res.tempFilePaths[0]
      }
    }
  })
}

async function onSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }

  try {
    if (isEdit.value) {
      await characterStore.updateCharacter(formData.value as ICharacter)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await characterStore.createCharacter(formData.value as ICharacter)
      uni.showToast({ title: '创建成功', icon: 'success' })
      setTimeout(() => {
        goBack()
      }, 1500)
    }
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.character-edit-page {
  min-height: 100vh;
  padding: 24px 24px 132px;
  background: var(--page-backdrop-soft);
}

.header {
  max-width: 920px;
  margin: 0 auto;
  position: sticky;
  top: 24px;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(34, 38, 43, 0.8), rgba(8, 9, 10, 0.92));
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.back-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--ghost-gradient);
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-container {
  max-width: 920px;
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
  color: var(--text-secondary);
  font-size: 12px;
}

.avatar-icon {
  font-size: 24px;
  margin-bottom: 4px;
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
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-weight: 500;
}

.required {
  color: #ff9d9d;
  margin-left: 4px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--input-border);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(46, 51, 57, 0.28), rgba(24, 27, 31, 0.56));
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);

  &:focus {
    border-color: var(--accent-strong);
    outline: none;
    transform: translateY(-1px);
    box-shadow: var(--focus-ring);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.settings-input {
  min-height: 140px;
}

.form-hint {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 24px 56px rgba(113, 129, 146, 0.3);
  }
}

@media (max-width: 720px) {
  .character-edit-page {
    padding: 16px 16px 132px;
  }

  .header {
    top: 16px;
  }

  .submit-section {
    width: calc(100% - 24px);
    bottom: 12px;
  }
}
</style>
