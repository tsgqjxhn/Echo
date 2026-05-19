<template>
  <div class="profile-page">
    <section class="hero-card">
      <button type="button" class="hero-edit-btn" @click="router.push('/settings/user-info')">
        <svg class="hero-action-icon" viewBox="0 0 1024 1024" aria-hidden="true">
          <path
            d="M783.673469 929.959184H177.632653c-45.97551 0-83.591837-37.616327-83.591837-83.591837V240.326531c0-45.97551 37.616327-83.591837 83.591837-83.591837h407.510204c11.493878 0 20.897959 9.404082 20.897959 20.897959s-9.404082 20.897959-20.897959 20.897959H177.632653c-22.987755 0-41.795918 18.808163-41.795918 41.795919v606.040816c0 22.987755 18.808163 41.795918 41.795918 41.795918h606.040816c22.987755 0 41.795918-18.808163 41.795919-41.795918V438.857143c0-11.493878 9.404082-20.897959 20.897959-20.897959s20.897959 9.404082 20.897959 20.897959v407.510204c0 45.97551-37.616327 83.591837-83.591837 83.591837z"
            fill="currentColor"
          />
          <path
            d="M498.938776 563.722449c-9.926531 0-19.330612-4.179592-27.167347-11.493878-11.493878-11.493878-14.628571-28.212245-7.836735-42.840816l31.346939-66.873469c9.926531-21.420408 23.510204-40.75102 39.706122-56.946939l272.718367-272.718367c26.644898-26.644898 72.097959-25.6 100.310205 3.134693 28.734694 28.734694 29.779592 73.665306 3.134693 100.310205l-272.718367 272.718367c-16.718367 16.718367-35.526531 29.779592-56.946939 39.706122l-66.873469 31.346939c-5.22449 2.612245-10.44898 3.657143-15.673469 3.657143zM854.726531 135.836735c-6.791837 0-13.061224 2.612245-17.763266 7.314285L564.244898 415.346939c-13.061224 13.061224-23.510204 28.212245-31.346939 44.930612l-27.167347 57.469388 57.469388-27.167347c16.718367-7.836735 31.869388-18.285714 44.930612-31.346939l272.718368-272.718367c4.702041-4.702041 7.314286-11.493878 6.791836-19.330613-0.522449-8.359184-4.179592-16.195918-9.92653-21.942857-6.269388-6.269388-14.106122-9.926531-21.942857-9.92653-0.522449 0.522449-0.522449 0.522449-1.044898 0.522449z"
            fill="currentColor"
          />
          <path
            d="M621.714286 497.371429c-5.22449 0-10.44898-2.089796-14.628572-6.269388L532.897959 417.436735c-8.359184-8.359184-8.359184-21.420408 0-29.779592 8.359184-8.359184 21.420408-8.359184 29.779592 0l73.665306 73.665306c8.359184 8.359184 8.359184 21.420408 0 29.779592-4.179592 4.179592-9.404082 6.269388-14.628571 6.269388z"
            fill="currentColor"
          />
        </svg>
      </button>

      <div class="hero-main">
        <div class="hero-profile">
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
        </div>
      </div>

      <button type="button" class="hero-clear-btn" @click="confirmClearData">
        <svg class="hero-action-icon" viewBox="0 0 1024 1024" aria-hidden="true">
          <path
            d="M189.124926 206.817739 834.875074 206.817739C824.056355 206.817739 815.037987 197.278738 815.718488 186.375821L766.845228 969.422054C767.420593 960.203599 774.673955 953.37931 784.03501 953.37931L239.96499 953.37931C249.232543 953.37931 256.586205 960.312638 257.154772 969.422054L208.281512 186.375821C208.961624 197.272664 199.982115 206.817739 189.124926 206.817739ZM186.671228 973.821228C188.422497 1001.879852 211.883661 1024 239.96499 1024L784.03501 1024C811.990051 1024 835.582287 1001.80337 837.328772 973.821228L886.202033 190.774996C888.065218 160.922854 864.68894 136.197049 834.875074 136.197049L189.124926 136.197049C159.269853 136.197049 135.939407 160.996952 137.797967 190.774996L186.671228 973.821228ZM971.034483 206.817739C990.535839 206.817739 1006.344828 191.00875 1006.344828 171.507394 1006.344828 152.00602 990.535839 136.197049 971.034483 136.197049L52.965517 136.197049C33.464161 136.197049 17.655172 152.00602 17.655172 171.507394 17.655172 191.00875 33.464161 206.817739 52.965517 206.817739L971.034483 206.817739ZM358.849148 206.817739 665.150852 206.817739C694.015417 206.817739 717.323123 183.246901 717.323123 154.533323L717.323123 52.284416C717.323123 23.465207 693.830144 0 665.150852 0L358.849148 0C329.984583 0 306.676877 23.570838 306.676877 52.284416L306.676877 154.533323C306.676877 183.352514 330.169856 206.817739 358.849148 206.817739ZM377.297567 52.284416C377.297567 62.397193 369.165877 70.62069 358.849148 70.62069L665.150852 70.62069C654.846093 70.62069 646.702433 62.486652 646.702433 52.284416L646.702433 154.533323C646.702433 144.420529 654.834123 136.197049 665.150852 136.197049L358.849148 136.197049C369.153907 136.197049 377.297567 144.331087 377.297567 154.533323L377.297567 52.284416ZM595.6986 835.467988C595.6986 854.969344 611.507571 870.778333 631.008945 870.778333 650.510301 870.778333 666.319289 854.969344 666.319289 835.467988L666.319289 324.729062C666.319289 305.227705 650.510301 289.418717 631.008945 289.418717 611.5..."
            fill="currentColor"
          />
        </svg>
      </button>
    </section>

    <!-- 语言选择 -->
    <section class="language-section" :class="{ expanded: languagePickerExpanded }">
      <button
        type="button"
        class="more-settings-trigger language-trigger"
        :aria-expanded="languagePickerExpanded"
        @click="toggleLanguagePicker"
      >
        <span class="more-settings-title">{{ $t('语言') }}</span>
        <span class="lang-current">{{ currentLanguageNativeName }}</span>
        <svg class="expand-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 10l5 5 5-5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </button>

      <div v-if="languagePickerExpanded" class="language-picker-list">
        <button
          v-for="lang in SUPPORTED_LANGUAGES"
          :key="lang.code"
          type="button"
          class="lang-option"
          :class="{ active: lang.code === languageStore.currentLanguage }"
          @click="selectLanguage(lang.code)"
        >
          <span class="lang-native">{{ lang.nativeName }}</span>
          <span class="lang-code">{{ lang.englishName }}</span>
          <svg v-if="lang.code === languageStore.currentLanguage" class="lang-check" viewBox="0 0 24 24" width="16" height="16">
            <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </section>

    <div class="settings-stack">
      <button type="button" class="setting-item" @click.stop="goToChatDefaults">
        <span class="setting-item-title">{{ $t('聊天默认设置') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="router.push('/settings/system-prompt')">
        <span class="setting-item-title">{{ $t('系统提示词管理') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="router.push('/settings/api-config')">
        <span class="setting-item-title">{{ $t('大模型配置') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="goToDataManagement">
        <span class="setting-item-title">{{ $t('数据导入导出') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="router.push('/settings/storage')">
        <span class="setting-item-title">{{ $t('存储管理') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="router.push('/settings/network')">
        <span class="setting-item-title">{{ $t('网络与连接') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>

      <button type="button" class="setting-item" @click="router.push('/settings/about')">
        <span class="setting-item-title">{{ $t('关于与帮助') }}</span>
        <svg class="item-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useLanguageStore } from '@/stores/language'
import { SUPPORTED_LANGUAGES } from '@/services/i18n'
import { useI18n } from '@/composables/useI18n'
import { uni } from '@/utils/uni-polyfill'
import defaultAvatarAsset from '@/static/images/tab-profile.svg'

const router = useRouter()
const userStore = useUserStore()
const languageStore = useLanguageStore()
const { t } = useI18n()

const avatarLoadFailed = ref(false)
const languagePickerExpanded = ref(false)

const usingDefaultAvatar = computed(() => avatarLoadFailed.value || !userStore.userAvatar)

const avatarUrl = computed(() => {
  if (usingDefaultAvatar.value) {
    return defaultAvatarAsset
  }

  return userStore.userAvatar
})

const currentLanguageNativeName = computed(() => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageStore.currentLanguage)
  return lang?.nativeName ?? languageStore.currentLanguage
})

async function refreshProfilePage() {
  avatarLoadFailed.value = false
  await userStore.loadUserInfo()
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

function toggleLanguagePicker() {
  languagePickerExpanded.value = !languagePickerExpanded.value
}

function selectLanguage(code: string) {
  languageStore.setLanguage(code)
  languagePickerExpanded.value = false
}

function goToDataManagement() {
  router.push('/settings/export')
}

function goToChatDefaults() {
  router.push({ path: '/settings/chat-defaults' })
}

function confirmClearData() {
  uni.showModal({
    title: t('确认清空本地数据'),
    content: '这会删除所有本地角色、会话、API 配置与游戏设置，且无法撤销。建议先到"数据导入导出"中完成备份后再继续。',
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
.language-section,
.setting-item {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.44);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.hero-card {
  position: relative;
  min-height: 156px;
  padding: 20px 132px 20px 20px;
  border-radius: 15px;
  border-color: rgba(56, 189, 248, 0.16);
  background:
    radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 42%),
    linear-gradient(145deg, rgba(36, 16, 52, 0.7), rgba(14, 8, 28, 0.94));
}

.hero-main {
  display: flex;
  width: 100%;
  min-height: 116px;
  align-items: center;
}

.hero-profile {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  max-width: 100%;
  text-align: left;
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
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
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

.hero-edit-btn,
.hero-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  width: 42px;
  padding: 0;
  border-radius: 7px;
  font: inherit;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background var(--transition-base),
    box-shadow var(--transition-base);
}

.hero-edit-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  border: none;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0284c7);
  color: #fff;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.32);
}

.hero-clear-btn {
  position: absolute;
  right: 18px;
  bottom: 18px;
  border: 1px solid rgba(251, 113, 133, 0.24);
  background: rgba(251, 113, 133, 0.08);
  color: #fda4af;
}

.hero-action-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
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

.settings-stack {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

/* ── 语言选择 ─────────────────────────────────────── */
.language-section {
  margin-top: 16px;
  border-radius: var(--radius-panel);
  overflow: hidden;
  padding: 0;
  transition: padding var(--transition-base), border-color var(--transition-base);
}

.language-section.expanded {
  padding: 6px;
  border-color: rgba(56, 189, 248, 0.18);
}

.language-trigger {
  padding: 18px 20px;
  border-radius: var(--radius-panel);
}

.language-section.expanded .language-trigger {
  border-radius: var(--radius-lg);
}

.language-picker-list {
  display: grid;
  gap: 2px;
  margin-top: 6px;
  padding: 6px 0 0 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.lang-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 7px 12px 7px 18px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-base);
}

.lang-option:hover {
  background: rgba(255, 255, 255, 0.04);
}

.lang-option.active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(52, 211, 153, 0.08));
  color: #fff;
}

.lang-native {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
}

.lang-code {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.lang-option.active .lang-code {
  color: rgba(56, 189, 248, 0.7);
}

.lang-check {
  flex-shrink: 0;
  color: #34d399;
}

.lang-current {
  flex: 1;
  text-align: right;
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 0;
}

.more-settings-trigger,
.setting-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-radius: var(--radius-panel);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-base), transform var(--transition-base);
}

.more-settings-trigger {
  border: none;
  background: transparent;
}

.more-settings-trigger:hover,
.setting-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.03);
}

.more-settings-title,
.setting-item-title {
  min-width: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.expand-icon,
.item-arrow {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.expand-icon {
  transition: transform var(--transition-base), color var(--transition-base);
}

.language-section.expanded .expand-icon {
  transform: rotate(180deg);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .profile-page {
    padding: 16px 16px 100px;
  }

  .hero-card {
    min-height: 144px;
    padding: 18px 118px 18px 18px;
  }

  .hero-main {
    min-height: 108px;
  }

  .avatar-shell {
    width: 84px;
    height: 84px;
  }

  .hero-edit-btn {
    top: 16px;
    right: 16px;
  }

  .hero-clear-btn {
    right: 16px;
    bottom: 16px;
  }

  .more-settings-trigger,
  .setting-item {
    padding: 16px 18px;
  }
}
</style>
