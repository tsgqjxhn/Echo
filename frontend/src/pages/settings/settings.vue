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
        <h1>{{ userStore.userName }}</h1>
      </div>

      <button type="button" class="hero-edit-btn" @click="router.push('/settings/user-info')">
        编辑
      </button>
    </section>

    <section class="feature-grid">
      <button type="button" class="feature-card" @click="router.push('/settings/coins')">
        <span class="feature-icon-shell">
          <img :src="coinIcon" alt="我的卜币" class="feature-icon feature-icon-coin" />
        </span>
        <div class="feature-copy">
          <strong>我的卜币</strong>
          <span>{{ userStore.fortuneCoins }} 卜币</span>
        </div>
      </button>

      <button type="button" class="feature-card" @click="router.push('/settings/levels')">
        <span class="feature-icon-shell">
          <img :src="levelIcon" alt="我的等级" class="feature-icon" />
        </span>
        <div class="feature-copy">
          <strong>我的等级</strong>
          <span>聊天 Lv.{{ userStore.chatLevel }} / 游戏 Lv.{{ userStore.gameLevel }}</span>
        </div>
      </button>
    </section>

    <section class="more-card">
      <p class="section-title">更多设置</p>

      <button type="button" class="setting-row" @click="router.push('/settings/global-prompt')">
        <span>全局提示词</span>
        <strong>{{ userStore.hasGlobalPrompt ? '已配置' : '未配置' }}</strong>
      </button>

      <button type="button" class="setting-row" @click="showAdvanced = !showAdvanced">
        <span>高级设置</span>
        <strong>{{ showAdvanced ? '收起' : '展开' }}</strong>
      </button>

      <div v-if="showAdvanced" class="advanced-box">
        <div class="provider-notice">
          <span>网络模式</span>
          <strong>已改为直连 API Provider，手机端可独立发送请求，不再依赖局域网后端。</strong>
        </div>

        <button type="button" class="setting-row" @click="router.push('/settings/api-config')">
          <span>API 配置</span>
          <strong>{{ hasAPIKey ? '已连接' : '待配置' }}</strong>
        </button>

        <button type="button" class="setting-row" @click="goToImport">
          <span>导入用户数据</span>
          <strong>打开</strong>
        </button>

        <button type="button" class="setting-row" @click="goToExport">
          <span>导出用户数据</span>
          <strong>打开</strong>
        </button>
      </div>

      <button type="button" class="setting-row danger" @click="confirmClearData">
        <span>清空本地数据</span>
        <strong>不可撤销</strong>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiConfigService } from '@/services/api-config'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'
import coinIcon from '@/static/images/profile-coin.svg'
import levelIcon from '@/static/images/profile-level.svg'
import defaultAvatarAsset from '@/static/images/tab-profile.svg'

const router = useRouter()
const userStore = useUserStore()

const avatarLoadFailed = ref(false)
const hasAPIKey = ref(false)
const showAdvanced = ref(false)

const usingDefaultAvatar = computed(() => avatarLoadFailed.value || !userStore.userAvatar)

const avatarUrl = computed(() => {
  if (usingDefaultAvatar.value) {
    return defaultAvatarAsset
  }

  return userStore.userAvatar
})

onMounted(async () => {
  await userStore.loadUserInfo()
  hasAPIKey.value = await apiConfigService.hasConfig()
})

function handleAvatarError() {
  avatarLoadFailed.value = true
}

function goToImport() {
  router.push({
    path: '/settings/export',
    query: {
      action: 'import',
    },
  })
}

function goToExport() {
  router.push({
    path: '/settings/export',
    query: {
      action: 'export',
    },
  })
}

function confirmClearData() {
  uni.showModal({
    title: '清空数据',
    content: '确认清空所有本地角色、会话和设置吗？此操作无法撤销。',
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
.feature-card,
.more-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.hero-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  border-radius: 30px;
  border-color: rgba(56, 189, 248, 0.16);
  background:
    radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 42%),
    linear-gradient(145deg, rgba(36, 16, 52, 0.7), rgba(14, 8, 28, 0.94));
}

.hero-edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0284c7);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.32);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.hero-edit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.46);
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
  align-items: center;
  min-width: 0;
  min-height: 92px;
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

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 26px;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.feature-card:nth-child(1) {
  border-color: rgba(251, 191, 36, 0.16);
  background:
    radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
}

.feature-card:nth-child(2) {
  border-color: rgba(52, 211, 153, 0.16);
  background:
    radial-gradient(circle at 80% 20%, rgba(52, 211, 153, 0.1) 0%, transparent 50%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.52);
}

.feature-icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 16px;
  background: rgba(52, 211, 153, 0.12);
}

.feature-card:nth-child(1) .feature-icon-shell {
  background: rgba(251, 191, 36, 0.14);
}

.feature-icon {
  width: 26px;
  height: 26px;
}

.feature-icon-coin {
  filter: invert(80%) sepia(60%) saturate(400%) hue-rotate(10deg);
}

.feature-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.feature-copy strong {
  color: var(--text-primary);
  font-size: 18px;
}

.feature-copy span {
  color: var(--text-secondary);
  line-height: 1.6;
}

.more-card {
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

.advanced-box {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(52, 211, 153, 0.04);
}

.provider-notice {
  display: grid;
  gap: 6px;
  padding: 14px 0 6px;
  border-top: 1px solid rgba(52, 211, 153, 0.08);
}

.provider-notice span {
  color: var(--text-tertiary);
  font-size: 13px;
}

.provider-notice strong {
  color: #a7f3d0;
  font-size: 14px;
  line-height: 1.6;
}

.setting-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 54px;
  padding: 16px 0;
  border: none;
  border-top: 1px solid rgba(52, 211, 153, 0.08);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform var(--transition-base);
}

.setting-row:first-of-type {
  margin-top: 10px;
}

.setting-row span {
  color: var(--text-tertiary);
  font-size: 13px;
}

.setting-row strong {
  color: var(--text-primary);
  font-size: 14px;
}

.setting-row:hover {
  transform: translateX(4px);
}

.setting-row:hover strong {
  color: #6ee7b7;
}

.setting-row.danger strong {
  color: #fb7185;
}

@media (max-width: 720px) {
  .feature-grid {
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

  .avatar-shell {
    width: 84px;
    height: 84px;
  }

  .hero-copy {
    min-height: 84px;
  }
}
</style>
