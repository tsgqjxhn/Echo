<template>
  <section class="base-info-section">
    <div class="avatar-row">
      <div class="avatar-wrapper">
        <img v-if="modelValue.avatar" :src="modelValue.avatar" alt="头像" class="avatar-img" />
        <div v-else class="avatar-placeholder">{{ modelValue.name?.charAt(0) || '?' }}</div>
      </div>
      <div class="avatar-actions">
        <button type="button" class="avatar-btn" :disabled="generating" @click="generateAvatar">
          {{ generating ? '生成中…' : '图片生成' }}
        </button>
        <button type="button" class="avatar-btn" @click="uploadAvatar">图片上传</button>
      </div>
    </div>
    <p v-if="genError" class="gen-error">{{ genError }}</p>

    <div class="field-item">
      <label class="field-label">角色名称 <span class="required">*</span></label>
      <input :value="modelValue.name" type="text" class="field-input" maxlength="30" placeholder="例如：银翼调查员" @input="updateField('name', ($event.target as HTMLInputElement).value)" />
    </div>

    <div class="field-item">
      <label class="field-label">开场白</label>
      <textarea :value="modelValue.greeting" class="field-textarea" placeholder="第一次见面时角色会说什么" @input="updateField('greeting', ($event.target as HTMLTextAreaElement).value)"></textarea>
    </div>

    <div class="field-item">
      <label class="field-label">角色描述 <span class="required">*</span></label>
      <textarea :value="modelValue.description" class="field-textarea" placeholder="写下角色背景、任务、关系、目标等信息" @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"></textarea>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { imageGenService } from '@/services/image-gen'
import { uni } from '@/utils/uni-polyfill'

interface BaseInfo {
  name: string
  greeting: string
  description: string
  avatar?: string
}

const props = defineProps<{ modelValue: BaseInfo }>()
const emit = defineEmits<{ 'update:modelValue': [value: BaseInfo] }>()

const generating = ref(false)
const genError = ref('')

function updateField(field: keyof BaseInfo, value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

async function generateAvatar() {
  genError.value = ''
  const prompt = buildPrompt()
  if (!prompt) return

  generating.value = true
  try {
    const urls = await imageGenService.generate(prompt, { size: '512x512', n: 1 })
    if (urls[0]) {
      emit('update:modelValue', { ...props.modelValue, avatar: urls[0] })
    }
  } catch (err) {
    genError.value = err instanceof Error ? err.message : '图片生成失败'
  } finally {
    generating.value = false
  }
}

function buildPrompt(): string {
  const name = props.modelValue.name.trim()
  const desc = props.modelValue.description.trim()
  if (!name) return ''
  let p = `AI character avatar portrait of "${name}"`
  if (desc) p += `, ${desc.slice(0, 100)}`
  p += ', high quality, detailed face, portrait style, digital art'
  return p
}

function uploadAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        emit('update:modelValue', { ...props.modelValue, avatar: res.tempFilePaths[0] })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.base-info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.2);
  flex-shrink: 0;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-tertiary);
  font-size: 22px;
  font-weight: 600;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.avatar-btn {
  padding: 5px 12px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 3px;
  background: transparent;
  color: var(--text-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(52, 211, 153, 0.3);
    color: #6ee7b7;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.gen-error {
  margin: 0;
  padding: 0 2px;
  color: rgba(248, 113, 113, 0.7);
  font-size: 11px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-label {
  display: block;
  padding: 0 2px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 4px;

  .required {
    color: rgba(248, 113, 113, 0.7);
  }
}

.field-input {
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
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}

.field-textarea {
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
  overflow: hidden;
  min-height: 1.4em;
  max-height: 6em;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}
</style>
