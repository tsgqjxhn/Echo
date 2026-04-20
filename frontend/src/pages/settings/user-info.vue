<template>
  <div class="user-info-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">编辑资料</p>
        <h1>更新你的头像和昵称</h1>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <section class="content-card">
      <button type="button" class="avatar-picker" @click="chooseAvatar">
        <span class="avatar-shell">
          <img
            :src="avatarUrl"
            alt="用户头像"
            class="avatar-preview"
            :class="{ photo: !usingDefaultAvatar }"
            @error="handleAvatarError"
          />
        </span>
        <span>点击更换头像</span>
      </button>

      <label class="field">
        <span>用户昵称</span>
        <input
          v-model="formData.name"
          type="text"
          maxlength="20"
          placeholder="请输入用户昵称"
        />
      </label>

      <button type="button" class="primary-btn" :disabled="saving" @click="saveUserInfo">
        {{ saving ? '保存中...' : '保存资料' }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'
import defaultAvatarAsset from '@/static/images/tab-profile.svg'

const router = useRouter()
const userStore = useUserStore()

const formData = ref({
  name: '',
  avatar: ''
})

const saving = ref(false)
const avatarLoadFailed = ref(false)

const usingDefaultAvatar = computed(() => avatarLoadFailed.value || !formData.value.avatar)

const avatarUrl = computed(() => {
  if (usingDefaultAvatar.value) {
    return defaultAvatarAsset
  }

  return formData.value.avatar
})

onMounted(async () => {
  await userStore.loadUserInfo()
  formData.value.name = userStore.userInfo?.name || ''
  formData.value.avatar = userStore.userInfo?.avatar || ''
})

function handleAvatarError() {
  avatarLoadFailed.value = true
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    success: result => {
      const imagePath = result.tempFilePaths?.[0]
      if (imagePath) {
        avatarLoadFailed.value = false
        formData.value.avatar = imagePath
      }
    }
  })
}

async function blobToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function saveUserInfo() {
  if (!formData.value.name.trim()) {
    uni.showToast({ title: '请输入用户昵称', icon: 'none' })
    return
  }

  saving.value = true

  try {
    let avatar = formData.value.avatar

    if (avatar && avatar.startsWith('blob:')) {
      avatar = await blobToDataUrl(avatar)
      formData.value.avatar = avatar
    }

    await userStore.updateUserInfo({
      name: formData.value.name.trim(),
      avatar
    })

    uni.showToast({ title: '资料已保存', icon: 'success' })
    router.back()
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '保存失败',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.user-info-page {
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.user-info-page::-webkit-scrollbar {
  display: none;
}

.page-header,
.content-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border-radius: 30px;
}

.eyebrow {
  color: rgba(226, 232, 240, 0.72);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin-top: 12px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 38px);
}

.ghost-btn,
.primary-btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 16px;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 18px;
  padding: 28px;
  border-radius: 30px;
}

.avatar-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 24px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  cursor: pointer;
}

.avatar-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 116px;
  height: 116px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(34, 36, 39, 0.96), rgba(12, 13, 15, 1));
}

.avatar-preview {
  width: 68px;
  height: 68px;
  object-fit: contain;
}

.avatar-preview.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.06) contrast(1.02);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);
}

.field input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, rgba(235, 239, 244, 0.92), rgba(160, 170, 180, 0.92));
  color: rgb(8, 9, 10);
  font-weight: 700;
}

@media (max-width: 640px) {
  .user-info-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
