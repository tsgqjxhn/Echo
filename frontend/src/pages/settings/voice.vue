<template>
  <div class="voice-page">
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

      <div class="page-header-main">
        <p class="eyebrow">语音设置</p>
        <h1>调整朗读与录音偏好</h1>
        <p class="header-copy">
          这里的设置会影响消息朗读效果，也会为后续语音输入能力预留默认参数。
        </p>
      </div>
    </header>

    <section class="native-status">
      <div>
        <p class="section-title">系统语音引擎</p>
        <p class="native-copy">{{ nativeStatusCopy }}</p>
      </div>

      <div class="native-pills">
        <span class="native-pill" :class="{ active: nativeAvailability?.sttAvailable }">
          STT {{ nativeAvailability?.sttAvailable ? '可用' : '不可用' }}
        </span>
        <span class="native-pill" :class="{ active: nativeAvailability?.ttsAvailable }">
          TTS {{ nativeAvailability?.ttsAvailable ? '可用' : '不可用' }}
        </span>
      </div>
    </section>

    <section class="settings-grid">
      <article class="settings-card">
        <p class="section-title">TTS 朗读</p>

        <label class="range-row">
          <span>语速</span>
          <strong>{{ (ttsConfig.rate ?? 1).toFixed(1) }}x</strong>
          <input v-model.number="ttsConfig.rate" type="range" min="0.5" max="2" step="0.1" @change="saveSettings" />
        </label>

        <label class="range-row">
          <span>音调</span>
          <strong>{{ (ttsConfig.pitch ?? 1).toFixed(1) }}</strong>
          <input v-model.number="ttsConfig.pitch" type="range" min="0.5" max="2" step="0.1" @change="saveSettings" />
        </label>

        <label class="range-row">
          <span>音量</span>
          <strong>{{ Math.round((ttsConfig.volume ?? 1) * 100) }}%</strong>
          <input v-model.number="ttsConfig.volume" type="range" min="0" max="1" step="0.05" @change="saveSettings" />
        </label>

        <button type="button" class="primary-btn" @click="testTTS">
          {{ isTesting ? '停止试听' : '试听朗读效果' }}
        </button>
      </article>

      <article class="settings-card">
        <p class="section-title">语音输入预设</p>

        <label class="field">
          <span>识别语言</span>
          <select v-model="sttConfig.language" @change="saveSettings">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>录音质量</span>
          <select v-model="sttConfig.quality" @change="saveSettings">
            <option v-for="option in qualityOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="toggle-row">
          <span>录音结束后自动发送</span>
          <input v-model="sttConfig.autoSend" type="checkbox" @change="saveSettings" />
        </label>

        <label class="toggle-row">
          <span>录音时显示波形动画</span>
          <input v-model="sttConfig.showWaveform" type="checkbox" @change="saveSettings" />
        </label>

        <button type="button" class="ghost-btn reset-btn" @click="resetSettings">重置为默认值</button>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TTSService, type TTSConfig } from '@/services/tts'
import {
  DEFAULT_STT_CONFIG,
  DEFAULT_TTS_CONFIG,
  loadVoiceSettings,
  saveSTTConfig,
  saveTTSConfig
} from '@/services/voice-settings'
import { NativeSpeech, type NativeSpeechAvailability } from '@/services/native-speech'
import { isNativeRuntime } from '@/services/runtime-http'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁体中文' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja-JP', label: '日本语' },
  { value: 'ko-KR', label: '한국어' }
]

const qualityOptions = [
  { value: 'low', label: '标准质量' },
  { value: 'medium', label: '高质量' },
  { value: 'high', label: '超高质量' }
]

const ttsConfig = ref<TTSConfig>({ ...DEFAULT_TTS_CONFIG })
const sttConfig = ref({ ...DEFAULT_STT_CONFIG })
const isTesting = ref(false)
const ttsService = ref<TTSService | null>(null)
const nativeAvailability = ref<NativeSpeechAvailability | null>(null)

const nativeStatusCopy = computed(() => {
  if (!isNativeRuntime()) {
    return '当前是浏览器预览环境，打包到 Android 后会优先使用手机系统语音。'
  }

  if (!nativeAvailability.value) {
    return '正在检测 Android 系统语音能力。'
  }

  if (nativeAvailability.value.sttAvailable && nativeAvailability.value.ttsAvailable) {
    return '已接入 Android 系统默认语音识别与朗读。'
  }

  return '当前手机缺少部分系统语音能力，缺失项会回退到浏览器或远程 provider。'
})

onMounted(async () => {
  await Promise.all([
    loadSettings(),
    refreshNativeAvailability()
  ])
})

onUnmounted(() => {
  ttsService.value?.destroy()
  ttsService.value = null
})

async function loadSettings() {
  const settings = await loadVoiceSettings()
  ttsConfig.value = {
    ...DEFAULT_TTS_CONFIG,
    ...settings.tts
  }
  sttConfig.value = {
    ...DEFAULT_STT_CONFIG,
    ...settings.stt
  }
}

async function refreshNativeAvailability() {
  if (!isNativeRuntime()) {
    nativeAvailability.value = {
      sttAvailable: false,
      ttsAvailable: typeof window !== 'undefined' && 'speechSynthesis' in window
    }
    return
  }

  nativeAvailability.value = await NativeSpeech.checkAvailability().catch(() => ({
    sttAvailable: false,
    ttsAvailable: false
  }))
}

async function saveSettings() {
  await Promise.all([
    saveTTSConfig(ttsConfig.value),
    saveSTTConfig(sttConfig.value)
  ])
}

async function testTTS() {
  if (isTesting.value) {
    ttsService.value?.stop()
    isTesting.value = false
    return
  }

  isTesting.value = true
  ttsService.value?.destroy()
  ttsService.value = new TTSService(ttsConfig.value)

  ttsService.value.onEnd(() => {
    isTesting.value = false
  })

  ttsService.value.onError(() => {
    isTesting.value = false
    uni.showToast({ title: '试听失败', icon: 'none' })
  })

  try {
    await ttsService.value.speak('您好，这是语音设置的试听文本。')
  } catch {
    isTesting.value = false
  }
}

function resetSettings() {
  ttsConfig.value = { ...DEFAULT_TTS_CONFIG }
  sttConfig.value = { ...DEFAULT_STT_CONFIG }
  void saveSettings()
  uni.showToast({ title: '已恢复默认设置', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.voice-page {
  min-height: 100vh;
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header,
.native-status,
.settings-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border: none;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.page-header-main {
  min-width: 0;
}

.eyebrow {
  color: var(--primary-color);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin: 4px 0 0;
  color: var(--text-primary);
  font-size: clamp(18px, 3vw, 24px);
}

.header-copy {
  max-width: 760px;
  color: var(--text-secondary);
  line-height: 1.8;
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

.back-btn {
  align-self: start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 0;
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
  width: 22px;
  height: 22px;
  overflow: visible;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #4a90d9, #356fb7);
  color: #f7fbff;
  font-weight: 600;
}

.settings-grid {
  width: min(1080px, calc(100% - 32px));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 18px auto 0;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 32px;
}

.section-title {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.native-status {
  width: min(1080px, calc(100% - 32px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px auto 0;
  padding: 20px 24px;
  border-radius: 24px;
}

.native-copy {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.native-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.native-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-tertiary);
  font-size: 12px;
}

.native-pill.active {
  border-color: rgba(52, 211, 153, 0.28);
  background: rgba(52, 211, 153, 0.12);
  color: #9ff3d3;
}

.range-row,
.field,
.toggle-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);
}

.range-row strong {
  color: var(--text-primary);
}

.field select,
.range-row input[type="range"] {
  width: 100%;
}

.field select {
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
}

.toggle-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.reset-btn {
  margin-top: auto;
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header {
    padding-left: 16px;
    padding-right: 16px;
  }

  .native-status {
    width: calc(100% - 20px);
    flex-direction: column;
    align-items: flex-start;
    padding: 18px;
  }

  .settings-grid {
    width: calc(100% - 20px);
  }
}
</style>
