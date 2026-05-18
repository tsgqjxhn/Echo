<template>
  <section class="multimedia-section">
    <!-- 头像 -->
    <div class="field-item">
      <label class="field-label">头像</label>
      <div class="media-row">
        <div class="media-preview-box avatar-preview" :class="{ uploading: uploading === 'avatar' }" @click="uploadAvatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="preview-img" />
          <div v-else class="preview-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{{ uploading === 'avatar' ? '上传中…' : '点击上传' }}</span>
          </div>
        </div>
        <div class="media-actions">
          <button type="button" class="avatar-btn" :disabled="uploading === 'avatar'" @click="uploadAvatar">
            {{ uploading === 'avatar' ? '上传中…' : '上传头像' }}
          </button>
          <button v-if="props.avatar" type="button" class="avatar-btn remove-media-btn" @click="clearAvatar">清除</button>
        </div>
      </div>
    </div>

    <!-- 封面图 -->
    <div class="field-item">
      <label class="field-label">封面图</label>
      <div class="media-row">
        <div class="media-preview-box cover-preview" :class="{ uploading: uploading === 'cover' }" @click="uploadCover">
          <img v-if="coverUrl" :src="coverUrl" alt="封面图" class="preview-img" />
          <div v-else class="preview-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>{{ uploading === 'cover' ? '上传中…' : '点击上传' }}</span>
          </div>
        </div>
        <div class="media-actions">
          <button type="button" class="avatar-btn" :disabled="uploading === 'cover'" @click="uploadCover">
            {{ uploading === 'cover' ? '上传中…' : '上传封面' }}
          </button>
          <button v-if="props.coverImage" type="button" class="avatar-btn remove-media-btn" @click="clearCover">清除</button>
        </div>
      </div>
    </div>

    <!-- 语音样本 -->
    <div class="field-item">
      <label class="field-label">语音样本</label>
      <div class="media-row">
        <div class="media-preview-box voice-preview" :class="{ uploading: uploading === 'voice' }" @click="uploadVoice">
          <div v-if="props.voiceSample" class="voice-info">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>{{ uploading === 'voice' ? '上传中…' : '已上传语音' }}</span>
          </div>
          <div v-else class="preview-placeholder">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>{{ uploading === 'voice' ? '上传中…' : '点击上传/录制' }}</span>
          </div>
        </div>
        <div class="media-actions">
          <button type="button" class="avatar-btn" :disabled="uploading === 'voice'" @click="uploadVoice">
            {{ uploading === 'voice' ? '上传中…' : '上传语音' }}
          </button>
          <button v-if="props.voiceSample" type="button" class="avatar-btn remove-media-btn" @click="clearVoice">清除</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { uni } from '@/utils/uni-polyfill'
import { uploadAsset, getAssetUrl } from '@/services/files'

/* ── Props & Emits ── */
interface Props {
  avatar?: string
  coverImage?: string
  voiceSample?: string
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:avatar', value: string): void
  (e: 'update:coverImage', value: string): void
  (e: 'update:voiceSample', value: string): void
}

const emit = defineEmits<Emits>()

const uploading = ref<'avatar' | 'cover' | 'voice' | null>(null)

/* ── 预览 URL ── */
const avatarUrl = computed(() => getAssetUrl(props.avatar || ''))
const coverUrl = computed(() => getAssetUrl(props.coverImage || ''))

/* ── 工具函数 ── */
async function blobUrlToBlob(blobUrl: string): Promise<Blob> {
  const response = await fetch(blobUrl)
  return response.blob()
}

/* ── 头像上传 ── */
async function uploadAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      uploading.value = 'avatar'
      try {
        const blob = await blobUrlToBlob(path)
        const relativePath = await uploadAsset(blob, 'avatar')
        emit('update:avatar', relativePath)
      } catch {
        // 上传失败则保留本地路径，由 character.ts 兜底
        emit('update:avatar', path)
      } finally {
        uploading.value = null
      }
    },
  })
}

function clearAvatar() {
  emit('update:avatar', '')
}

/* ── 封面图上传 ── */
async function uploadCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      uploading.value = 'cover'
      try {
        const blob = await blobUrlToBlob(path)
        const relativePath = await uploadAsset(blob, 'cover')
        emit('update:coverImage', relativePath)
      } catch {
        emit('update:coverImage', path)
      } finally {
        uploading.value = null
      }
    },
  })
}

function clearCover() {
  emit('update:coverImage', '')
}

/* ── 语音样本上传 ── */
async function uploadVoice() {
  const handleFile = async (file: File | Blob | string) => {
    uploading.value = 'voice'
    try {
      const relativePath = await uploadAsset(file, 'voice')
      emit('update:voiceSample', relativePath)
    } catch {
      if (typeof file === 'string') emit('update:voiceSample', file)
      else emit('update:voiceSample', '')
    } finally {
      uploading.value = null
    }
  }

  // 优先尝试 uni.chooseFile（H5+ / App）
  const chooseFile = (uni as any).chooseFile
  if (typeof chooseFile === 'function') {
    chooseFile({
      count: 1,
      type: 'audio',
      success: async (res: any) => {
        const path = res.tempFilePaths?.[0] || res.tempFiles?.[0]?.path
        if (!path) return
        try {
          const blob = await blobUrlToBlob(path)
          await handleFile(blob)
        } catch {
          await handleFile(path)
        }
      },
      fail: () => {
        fallbackVoiceUpload()
      },
    })
  } else {
    fallbackVoiceUpload()
  }

  function fallbackVoiceUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.style.display = 'none'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      await handleFile(file)
    }
    document.body.appendChild(input)
    input.click()
    setTimeout(() => {
      document.body.removeChild(input)
    }, 5000)
  }
}

function clearVoice() {
  emit('update:voiceSample', '')
}
</script>

<style lang="scss" scoped>
.multimedia-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.media-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.media-preview-box {
  width: 96px;
  height: 96px;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(56, 189, 248, 0.35);
    background: rgba(56, 189, 248, 0.04);
  }
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

.cover-preview {
  width: 120px;
  height: 72px;
  border-radius: 5px;
}

.voice-preview {
  width: 120px;
  height: 56px;
  border-radius: 5px;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-tertiary);
  font-size: 11px;

  svg {
    color: var(--text-tertiary);
    opacity: 0.6;
  }
}

.voice-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #34d399;
  font-size: 11px;

  svg {
    color: #34d399;
  }
}

.media-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding-top: 4px;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: rgba(52, 211, 153, 0.3);
    color: #6ee7b7;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.remove-media-btn {
  border-color: rgba(248, 113, 113, 0.15);

  &:hover {
    border-color: rgba(248, 113, 113, 0.3);
    color: rgba(248, 113, 113, 0.8);
  }
}
</style>
