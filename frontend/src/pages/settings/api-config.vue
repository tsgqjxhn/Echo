<template>
  <div class="api-config-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">模型连接</p>
        <h1>API 配置</h1>
      </div>
      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <div class="type-tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.value"
        type="button"
        class="type-tab"
        :class="{ active: activeType === tab.value }"
        @click="switchType(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeType === 'voice'" class="type-tabs voice-sub-tabs">
      <button
        v-for="sub in voiceSubTabs"
        :key="sub.value"
        type="button"
        class="type-tab"
        :class="{ active: voiceSubType === sub.value }"
        @click="switchVoiceSub(sub.value)"
      >
        {{ sub.label }}
      </button>
    </div>

    <section class="config-section card">
      <div class="section-head">
        <span class="section-label">{{ sectionLabel }}</span>
        <button type="button" class="mini-btn" @click="startNew">＋ 新增</button>
      </div>

      <select v-model="selectedConfigId" class="field-select" @change="onConfigSelect">
        <option value="">— 新建配置 —</option>
        <option v-for="c in configsForType" :key="c.id" :value="c.id">
          {{ c.name }}{{ c.isDefault ? ' （默认）' : '' }}
        </option>
      </select>

      <div class="form-fields">
        <label class="field">
          <span>配置名称</span>
          <input v-model="form.name" type="text" maxlength="40" placeholder="例如：主账号" />
        </label>
        <label class="field">
          <span>Base URL</span>
          <input v-model="form.baseURL" type="text" placeholder="留空使用 OpenAI 默认地址" />
        </label>
        <label class="field">
          <span>API Key</span>
          <input
            v-model="form.apiKey"
            :type="showKey ? 'text' : 'password'"
            :placeholder="selectedConfigId ? '留空保留原密钥' : '请输入 API Key'"
          />
          <button type="button" class="key-toggle" @click="showKey = !showKey">
            {{ showKey ? '隐藏' : '显示' }}
          </button>
        </label>
      </div>

      <div class="config-actions">
        <button
          type="button"
          class="danger-btn"
          :disabled="!selectedConfigId"
          @click="deleteConfig"
        >
          删除配置
        </button>
        <button type="button" class="primary-btn" :disabled="saving" @click="saveConfig">
          {{ saving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </section>

    <section ref="modelSectionRef" class="model-section card">
      <div class="section-head">
        <span class="section-label">模型</span>
        <button type="button" class="connect-btn" :disabled="connecting || !canConnect" @click="connectModels">
          {{ connecting ? '连接中…' : '连接' }}
        </button>
      </div>

      <p v-if="!canConnect" class="hint">请先填写 API Key 后点击连接获取模型列表</p>
      <p v-if="noModelsAfterConnect" class="hint">该接口不支持模型列表，请在下方手动输入模型名称</p>

      <select
        v-if="availableModels.length > 0"
        v-model="selectedModel"
        class="field-select"
      >
        <option value="">— 请选择模型 —</option>
        <option v-for="m in availableModels" :key="m" :value="m">{{ m }}</option>
      </select>

      <input
        v-model="selectedModel"
        type="text"
        class="field-input"
        placeholder="手动输入模型名称，如 qwen-turbo"
      />

      <button
        type="button"
        class="default-btn"
        :disabled="!selectedModel || !selectedConfigId"
        @click="setAsDefault"
      >
        设为此类型默认配置
      </button>

      <p v-if="currentDefault" class="default-hint">
        当前默认：{{ currentDefault.name }} · {{ currentDefault.model || '未选择模型' }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { APIConfig, APIConfigType } from '@/types/api-config'
import { apiConfigService } from '@/services/api-config'
import { generateUUID } from '@/utils/uuid'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()

const typeTabs: { label: string; value: APIConfigType }[] = [
  { label: '文本', value: 'text' },
  { label: '语音', value: 'voice' },
  { label: '图片', value: 'image' },
  { label: '动图', value: 'video' }
]

const voiceSubTabs: { label: string; value: 'stt' | 'tts' }[] = [
  { label: 'STT', value: 'stt' },
  { label: 'TTS', value: 'tts' }
]

const allConfigs = ref<APIConfig[]>([])
const activeType = ref<APIConfigType>('text')
const voiceSubType = ref<'stt' | 'tts'>('stt')
const selectedConfigId = ref('')
const availableModels = ref<string[]>([])
const selectedModel = ref('')
const connecting = ref(false)
const noModelsAfterConnect = ref(false)
const saving = ref(false)
const showKey = ref(false)
const modelSectionRef = ref<HTMLElement | null>(null)

const form = ref({ name: '', baseURL: '', apiKey: '' })

const effectiveConfigType = computed<APIConfigType>(() =>
  activeType.value === 'voice' ? voiceSubType.value : activeType.value
)

const configsForType = computed(() =>
  allConfigs.value.filter(c => (c.configType || 'text') === effectiveConfigType.value)
)

const currentDefault = computed(() =>
  configsForType.value.find(c => c.isDefault) ?? null
)

const canConnect = computed(() => !!form.value.apiKey.trim() || !!selectedConfigId.value)

const sectionLabel = computed(() => {
  if (activeType.value === 'text') return '配置聊天文本补全模型'
  if (activeType.value === 'voice') return voiceSubType.value === 'stt' ? '配置语音转文本模型' : '配置文本转语音模型'
  if (activeType.value === 'image') return '配置图片生成模型'
  return '配置动图/视频生成模型'
})

onMounted(loadAll)

async function loadAll() {
  allConfigs.value = await apiConfigService.getAll()
}

function switchType(type: APIConfigType) {
  activeType.value = type
  voiceSubType.value = 'stt'
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  noModelsAfterConnect.value = false
  clearForm()
}

function switchVoiceSub(sub: 'stt' | 'tts') {
  voiceSubType.value = sub
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  noModelsAfterConnect.value = false
  clearForm()
}

function clearForm() {
  form.value = { name: '', baseURL: '', apiKey: '' }
  showKey.value = false
}

function startNew() {
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  noModelsAfterConnect.value = false
  clearForm()
}

function onConfigSelect() {
  availableModels.value = []
  selectedModel.value = ''

  const config = allConfigs.value.find(c => c.id === selectedConfigId.value)
  if (config) {
    form.value.name = config.name
    form.value.baseURL = config.baseURL ?? ''
    form.value.apiKey = ''
    selectedModel.value = config.model ?? ''
  } else {
    clearForm()
  }
}

async function saveConfig() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入配置名称', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const existing = selectedConfigId.value
      ? allConfigs.value.find(c => c.id === selectedConfigId.value)
      : null

    const payload: APIConfig = {
      id: existing?.id ?? generateUUID(),
      name: form.value.name.trim(),
      provider: 'openai-compatible',
      apiKey: form.value.apiKey.trim() || existing?.apiKey || '',
      baseURL: form.value.baseURL.trim() || undefined,
      model: selectedModel.value || existing?.model || '',
      isDefault: existing?.isDefault ?? false,
      source: 'storage',
      configType: effectiveConfigType.value
    }

    await apiConfigService.save(payload)
    selectedConfigId.value = payload.id
    await loadAll()
    uni.showToast({ title: '配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function deleteConfig() {
  if (!selectedConfigId.value) return
  const config = allConfigs.value.find(c => c.id === selectedConfigId.value)
  if (!confirm(`确认删除配置"${config?.name}"吗？`)) return

  try {
    await apiConfigService.delete(selectedConfigId.value)
    selectedConfigId.value = ''
    availableModels.value = []
    selectedModel.value = ''
    clearForm()
    await loadAll()
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '删除失败', icon: 'none' })
  }
}

async function connectModels() {
  const existing = allConfigs.value.find(c => c.id === selectedConfigId.value)
  const apiKey = form.value.apiKey.trim() || existing?.apiKey || ''

  if (!apiKey) {
    uni.showToast({ title: '请先输入 API Key', icon: 'none' })
    return
  }

  connecting.value = true
  noModelsAfterConnect.value = false
  try {
    const baseURL = form.value.baseURL.trim() || existing?.baseURL
    const draftConfig: APIConfig = {
      id: existing?.id ?? generateUUID(),
      name: form.value.name.trim() || existing?.name || 'Temp Config',
      provider: existing?.provider || 'openai-compatible',
      apiKey,
      baseURL,
      model: selectedModel.value.trim() || existing?.model || '',
      speechModel: existing?.speechModel,
      speechVoice: existing?.speechVoice,
      transcriptionModel: existing?.transcriptionModel,
      isDefault: existing?.isDefault ?? false,
      source: existing?.source || 'storage',
      configType: effectiveConfigType.value
    }

    const result = await apiConfigService.testConnection(draftConfig)
    if (!result.success) {
      throw new Error(result.message || '连接失败')
    }

    selectedModel.value = selectedModel.value.trim() || result.model || ''

    let models: string[] = []
    try {
      models = await apiConfigService.fetchModels(baseURL, apiKey, effectiveConfigType.value)
    } catch {
      models = []
    }

    availableModels.value = models
    if (models.length === 0) {
      noModelsAfterConnect.value = true
    } else if (!selectedModel.value) {
      selectedModel.value = models[0]
    }

    uni.showToast({ title: result.message || '连接成功', icon: 'success' })
    await nextTick()
    modelSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '连接失败', icon: 'none' })
  } finally {
    connecting.value = false
  }
}

async function setAsDefault() {
  if (!selectedConfigId.value || !selectedModel.value) return

  saving.value = true
  try {
    // Update all configs of this type: clear isDefault
    for (const c of configsForType.value) {
      if (c.isDefault || c.id === selectedConfigId.value) {
        await apiConfigService.save({
          ...c,
          isDefault: c.id === selectedConfigId.value,
          model: c.id === selectedConfigId.value ? selectedModel.value : c.model
        })
      }
    }
    await loadAll()
    uni.showToast({ title: '已设为默认', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '操作失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
$sky: #38bdf8;
$sky-light: #7dd3fc;
$mint: #34d399;
$mint-light: #6ee7b7;

.api-config-page {
  min-height: 100vh;
  padding: 24px 20px 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 24px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

.eyebrow {
  color: $mint-light;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
}

.page-header h1 {
  margin-top: 8px;
  color: var(--text-primary);
  font-size: clamp(24px, 4vw, 34px);
}

.ghost-btn {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(255, 255, 255, 0.10);
  }
}

.type-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.voice-sub-tabs {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 10px;
}

.type-tab {
  min-height: 48px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 16px;
  background: rgba(52, 211, 153, 0.06);
  color: var(--text-secondary);
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    background: rgba(52, 211, 153, 0.12);
    color: var(--text-primary);
  }

  &.active {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.82), rgba(52, 211, 153, 0.78));
    border-color: transparent;
    color: #fff;
    font-weight: 700;
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.26);
  }
}

.card {
  margin-top: 16px;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.38);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-label {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.mini-btn {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(52, 211, 153, 0.18);
  border-radius: 10px;
  background: rgba(52, 211, 153, 0.08);
  color: $mint-light;
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: rgba(52, 211, 153, 0.16);
  }
}

.connect-btn {
  min-height: 36px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.30);
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.44);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.field-select {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.06);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;

  span {
    color: var(--text-secondary);
    font-size: 13px;
  }

  input {
    height: 46px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    font: inherit;

    &:focus {
      outline: none;
      border-color: rgba(56, 189, 248, 0.36);
    }
  }
}

.key-toggle {
  position: absolute;
  right: 10px;
  bottom: 12px;
  padding: 2px 8px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.primary-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, $sky-light, $sky, #0284c7);
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28);
  transition: transform var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-base);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.40);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.danger-btn {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(251, 113, 133, 0.24);
  border-radius: 14px;
  background: rgba(251, 113, 133, 0.07);
  color: #fda4af;
  font: inherit;
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover:not(:disabled) {
    background: rgba(251, 113, 133, 0.14);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.hint {
  margin: 8px 0 12px;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.6;
}

.field-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.06);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  box-sizing: border-box;
  margin-top: 10px;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.36);
  }
}

.default-btn {
  width: 100%;
  min-height: 44px;
  margin-top: 14px;
  border: 1px solid rgba(52, 211, 153, 0.20);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.08);
  color: $mint-light;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover:not(:disabled) {
    background: rgba(52, 211, 153, 0.16);
    border-color: rgba(52, 211, 153, 0.32);
  }

  &:disabled {
    opacity: 0.40;
    cursor: not-allowed;
  }
}

.default-hint {
  margin-top: 12px;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}
</style>
