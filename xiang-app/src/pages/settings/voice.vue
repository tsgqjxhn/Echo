<template>
  <div class="voice-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">语音设置</p>
        <h1>调整朗读与录音偏好</h1>
        <p class="header-copy">
          这里的设置会影响消息朗读效果，也会为后续语音输入能力预留默认参数。
        </p>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

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
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TTSService, type TTSConfig } from '@/services/tts'
import {
  DEFAULT_STT_CONFIG,
  DEFAULT_TTS_CONFIG,
  loadVoiceSettings,
  saveSTTConfig,
  saveTTSConfig
} from '@/services/voice-settings'
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

onMounted(async () => {
  await loadSettings()
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
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(74, 144, 217, 0.14), transparent 28%),
    linear-gradient(180deg, #090b0e 0%, #12161b 100%);
}

.page-header,
.settings-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 16, 20, 0.88);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border-radius: 32px;
}

.eyebrow {
  color: var(--primary-color);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin: 12px 0 10px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 38px);
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

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #4a90d9, #356fb7);
  color: #f7fbff;
  font-weight: 600;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
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
  .voice-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
