<template>
  <div class="profile-page">
    <section class="hero-card">
      <div class="avatar-shell">
        <img
          :src="avatarUrl"
          alt="用户头像"
          class="avatar-image"
          :class="{ photo: !usingDefaultAvatar }"
          @error="handleAvatarError"
        />
      </div>

      <div class="hero-copy">
        <p class="hero-label">个人设置</p>
        <h1>{{ userStore.userName }}</h1>
        <p class="hero-subtitle">管理你的头像、昵称与本地数据。</p>
      </div>

      <div class="hero-actions">
        <button type="button" class="hero-edit-btn" @click="router.push('/settings/user-info')">
          编辑资料
        </button>
        <button type="button" class="hero-clear-btn" @click="confirmClearData">
          清空本地数据
        </button>
      </div>
    </section>

    <section class="settings-board">
      <p class="section-title">更多设置</p>

      <div class="settings-grid">
        <button type="button" class="setting-card setting-card--prompt" @click="router.push('/settings/global-prompt')">
          <span class="setting-kicker">提示词</span>
          <strong>全局提示词</strong>
          <p>为所有对话补充统一约束和回答偏好。</p>
          <span class="setting-meta">{{ userStore.hasGlobalPrompt ? '已配置' : '未配置' }}</span>
        </button>

        <button type="button" class="setting-card setting-card--api" @click="router.push('/settings/api-config')">
          <span class="setting-kicker">LLM API</span>
          <strong>模型连接</strong>
          <p>配置文本、语音与图像服务，统一管理接口连接。</p>
          <span class="setting-meta">{{ hasAPIKey ? '已连接' : '待配置' }}</span>
        </button>

        <button type="button" class="setting-card setting-card--data setting-card--wide" @click="goToDataManagement">
          <span class="setting-kicker">数据导入导出</span>
          <strong>备份与恢复</strong>
          <p>导出当前本地数据，或导入备份文件完成恢复。</p>
          <span class="setting-meta">打开</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiConfigService } from '@/services/api-config'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'
import defaultAvatarAsset from '@/static/images/tab-profile.svg'

const router = useRouter()
const userStore = useUserStore()

const avatarLoadFailed = ref(false)
const hasAPIKey = ref(false)

const usingDefaultAvatar = computed(() => avatarLoadFailed.value || !userStore.userAvatar)

const avatarUrl = computed(() => {
  if (usingDefaultAvatar.value) {
    return defaultAvatarAsset
  }

  return userStore.userAvatar
})

async function refreshProfilePage() {
  avatarLoadFailed.value = false
  await userStore.loadUserInfo()
  hasAPIKey.value = await apiConfigService.hasConfig()
}

onMounted(() => {
  void refreshProfilePage()
})

onActivated(() => {
  void refreshProfilePage()
})

function handleAvatarError() {
  avatarLoadFailed.value = true
}

function goToDataManagement() {
  router.push('/settings/export')
}

function confirmClearData() {
  uni.showModal({
    title: '确认清空本地数据',
    content: '这会删除所有本地角色、会话、API 配置与游戏设置，且无法撤销。建议先到“数据导入导出”中完成备份后再继续。',
    success: async result => {
      if (!result.confirm) {
        return
      }

      await userStore.clearAllData()
      window.location.reload()
    },
  })
}
</script>

<style lang="scss" scoped>
.profile-page {
  box-sizing: border-box;
  min-height: 100vh;
  overflow-y: auto;
  padding: 20px 20px 108px;
  background:
    radial-gradient(ellipse at 15% 5%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.profile-page::-webkit-scrollbar {
  display: none;
}

.hero-card,
.settings-board,
.setting-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.hero-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 18px 16px;
  padding: 24px;
  border-radius: 30px;
  border-color: rgba(56, 189, 248, 0.16);
  background:
    radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 42%),
    linear-gradient(145deg, rgba(36, 16, 52, 0.7), rgba(14, 8, 28, 0.94));
}

.avatar-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  overflow: hidden;
  border: 2px solid rgba(56, 189, 248, 0.28);
  border-radius: 999px;
  background: linear-gradient(145deg, rgba(40, 18, 58, 0.96), rgba(18, 8, 32, 1));
  box-shadow:
    inset 0 1px 0 rgba(56, 189, 248, 0.1),
    0 0 0 4px rgba(56, 189, 248, 0.08);
}

.avatar-image {
  width: 58px;
  height: 58px;
  object-fit: contain;
  opacity: 0.9;
  filter: brightness(0) invert(1);
}

.avatar-image.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.06) contrast(1.02);
  opacity: 1;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 92px;
}

.hero-label {
  color: rgba(125, 211, 252, 0.72);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
}

.hero-copy h1 {
  margin: 0;
  background: linear-gradient(135deg, #7dd3fc, var(--text-primary) 60%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: clamp(28px, 5vw, 40px);
  line-height: 1.05;
}

.hero-subtitle {
  color: var(--text-secondary);
  line-height: 1.7;
}

.hero-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.hero-edit-btn,
.hero-clear-btn {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background var(--transition-base),
    box-shadow var(--transition-base);
}

.hero-edit-btn {
  border: none;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0284c7);
  color: #fff;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.32);
}

.hero-clear-btn {
  border: 1px solid rgba(251, 113, 133, 0.24);
  background: rgba(251, 113, 133, 0.08);
  color: #fda4af;
}

.hero-edit-btn:hover,
.hero-clear-btn:hover {
  transform: translateY(-1px);
}

.hero-edit-btn:hover {
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.46);
}

.hero-clear-btn:hover {
  border-color: rgba(251, 113, 133, 0.34);
  background: rgba(251, 113, 133, 0.14);
}

.settings-board {
  margin-top: 16px;
  padding: 22px;
  border-radius: 28px;
}

.section-title {
  color: #7dd3fc;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.setting-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 172px;
  padding: 20px;
  border-radius: 24px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.setting-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.46);
}

.setting-card--prompt {
  border-color: rgba(125, 211, 252, 0.16);
  background:
    radial-gradient(circle at 84% 18%, rgba(125, 211, 252, 0.14) 0%, transparent 44%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
}

.setting-card--api {
  border-color: rgba(110, 231, 183, 0.18);
  background:
    radial-gradient(circle at 84% 18%, rgba(110, 231, 183, 0.14) 0%, transparent 44%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
}

.setting-card--data {
  border-color: rgba(226, 232, 240, 0.14);
  background:
    radial-gradient(circle at 84% 18%, rgba(226, 232, 240, 0.12) 0%, transparent 44%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
}

.setting-card--wide {
  grid-column: 1 / -1;
  min-height: 154px;
}

.setting-kicker {
  color: var(--text-tertiary);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.setting-card strong {
  color: var(--text-primary);
  font-size: 20px;
}

.setting-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.setting-meta {
  margin-top: auto;
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 12px;
}

@media (max-width: 780px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-page {
    padding: 16px 16px 100px;
  }

  .hero-card {
    gap: 14px;
    padding: 20px;
  }

  .hero-actions {
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .avatar-shell {
    width: 84px;
    height: 84px;
  }

  .hero-copy {
    min-height: 84px;
  }
}
</style>
