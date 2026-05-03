<template>
  <div class="api-config-page">
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
      <h1 class="page-title">配置全局大模型</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
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
        <p class="hint capability-hint">文本模型是目前支持的模型，如果在语音、图片、动图中没有出现分类，则代表该厂商未提供该服务或者仅对企业开放该服务</p>
        <label class="field">
          <span>Provider 类型</span>
          <select v-model="form.provider" class="field-select" @change="onProviderChange">
            <option v-for="(label, key) in providerOptions" :key="key" :value="key">
              {{ label }}
            </option>
          </select>
        </label>
        <template v-if="form.provider !== 'local'">
          <label class="field">
            <span>Base URL</span>
            <input v-model="form.baseURL" type="text" :placeholder="baseURLPlaceholder" />
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
        </template>
        <div v-else class="local-info">
          <div class="local-info-item">
            <span class="local-info-label">引擎</span>
            <span class="local-info-value">{{ voiceSubType === 'stt' ? '系统语音识别' : '系统语音合成' }}</span>
          </div>
          <div class="local-info-item">
            <span class="local-info-label">费用</span>
            <span class="local-info-value">免费</span>
          </div>
          <div class="local-info-item">
            <span class="local-info-label">网络</span>
            <span class="local-info-value">离线可用</span>
          </div>
          <p class="hint">使用设备内置语音引擎，无需 API Key。音色和语速可在「语音设置」中调整。</p>
          <button
            type="button"
            class="default-btn"
            :disabled="!selectedConfigId"
            @click="setAsDefault"
          >
            {{ isCurrentDefault ? '当前默认' : '设为此类型默认配置' }}
          </button>
        </div>
        <p v-if="capabilityWarning" class="hint warning">{{ capabilityWarning }}</p>
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

    <section v-if="form.provider !== 'local'" ref="modelSectionRef" class="model-section card">
      <div class="section-head">
        <span class="section-label">模型</span>
        <button type="button" class="connect-btn" :disabled="connecting || !canConnect" @click="connectModels">
          {{ connecting ? '连接中…' : '连接' }}
        </button>
      </div>

      <select
        v-if="availableModels.length > 0"
        v-model="selectedModel"
        class="field-select"
      >
        <option value="">— 请选择模型 —</option>
        <option v-for="m in availableModels" :key="m" :value="m">{{ modelDisplayName(m) }}</option>
      </select>

      <input
        v-model="selectedModel"
        type="text"
        class="field-input"
        placeholder="手动输入模型名称，如 qwen-turbo"
      />

      <p v-if="noModelsAfterConnect" class="hint">未获取到模型列表，可手动输入模型名称。</p>

      <button
        type="button"
        class="add-model-btn"
        :disabled="!selectedModel.trim()"
        @click="addModel"
      >
        点击添加模型
      </button>

      <div v-if="modelList.length > 0" class="model-card-list">
        <article
          v-for="model in modelList"
          :key="model"
          class="model-card"
          :class="{ active: selectedModel === model }"
          @click="selectModel(model)"
        >
          <div class="model-card-copy">
            <span>模型</span>
            <strong>{{ modelDisplayName(model) }}</strong>
          </div>
          <div class="model-card-actions">
            <button type="button" @click.stop="selectModel(model)">设为当前</button>
            <button type="button" class="danger" @click.stop="removeModel(model)">删除</button>
          </div>
        </article>
      </div>

      <button
        type="button"
        class="default-btn"
        :disabled="!selectedModel || !selectedConfigId"
        @click="setAsDefault"
      >
        设为此类型默认配置
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { APIConfig, APIConfigType, APIProvider } from '@/types/api-config'
import { PROVIDER_DISPLAY_NAMES } from '@/types/api-config'
import { apiConfigService } from '@/services/api-config'
import { getAdapterOrDefault, adapters } from '@/services/providers/registry'
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
const modelList = ref<string[]>([])
const connecting = ref(false)
const noModelsAfterConnect = ref(false)
const saving = ref(false)
const showKey = ref(false)
const modelSectionRef = ref<HTMLElement | null>(null)

const form = ref({ name: '', baseURL: '', apiKey: '', provider: 'openai-compatible' as APIProvider })

const isLocalType = computed(() => {
  const t = effectiveConfigType.value
  return t === 'stt' || t === 'tts'
})

const providerOptions = computed(() => {
  const type = effectiveConfigType.value
  const result: Record<string, string> = {}
  for (const [provider, adapter] of adapters.entries()) {
    let supported = false
    switch (type) {
      case 'text': supported = adapter.capabilities.chat; break
      case 'tts': supported = adapter.capabilities.tts; break
      case 'stt': supported = adapter.capabilities.stt; break
      case 'image': supported = adapter.capabilities.imageGeneration; break
      case 'video': supported = adapter.capabilities.videoGeneration; break
    }
    if (supported) {
      result[provider] = PROVIDER_DISPLAY_NAMES[provider as APIProvider]
    }
  }
  return result
})

function modelDisplayName(model: string): string {
  // Provider name already follows the "Provider/Brand" pattern (e.g. "OpenAI/ChatGPT").
  // Avoid duplicating that prefix here so the model dropdown stays compact.
  return model
}

const DEFAULT_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  'openai-compatible': '',
  anthropic: 'https://api.anthropic.com',
  dashscope: 'https://dashscope.aliyuncs.com',
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  grok: 'https://api.x.ai/v1',
  minimax: 'https://api.minimax.chat/v1',
  baidu: 'https://qianfan.baidubce.com/v2',
  bedrock: 'https://bedrock-runtime.us-east-1.amazonaws.com',
  azure: '',
  ollama: 'http://localhost:11434/v1',
}

const baseURLPlaceholder = computed(() => {
  const def = DEFAULT_URLS[form.value.provider]
  return def ? `留空使用默认: ${def}` : '例如: https://api.example.com/v1'
})

const capabilityWarning = computed(() => {
  const adapter = getAdapterOrDefault(form.value.provider)
  const type = effectiveConfigType.value
  const warnings: string[] = []
  if ((type === 'stt' || type === 'tts') && !adapter.capabilities.tts && !adapter.capabilities.stt) {
    warnings.push(`${PROVIDER_DISPLAY_NAMES[form.value.provider]} 不支持语音服务，请为语音类型配置其他提供商`)
  }
  if (type === 'image' && !adapter.capabilities.imageGeneration) {
    warnings.push(`${PROVIDER_DISPLAY_NAMES[form.value.provider]} 不支持图片生成`)
  }
  if (type === 'video' && !adapter.capabilities.videoGeneration) {
    warnings.push(`${PROVIDER_DISPLAY_NAMES[form.value.provider]} 不支持视频生成`)
  }
  return warnings.join('；')
})

const effectiveConfigType = computed<APIConfigType>(() =>
  activeType.value === 'voice' ? voiceSubType.value : activeType.value
)

const configsForType = computed(() =>
  allConfigs.value.filter(c => (c.configType || 'text') === effectiveConfigType.value)
)

const isCurrentDefault = computed(() =>
  !!selectedConfigId.value
  && configsForType.value.find(c => c.id === selectedConfigId.value)?.isDefault === true
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

function normalizeModelList(models: Array<string | undefined | null>): string[] {
  return Array.from(new Set(
    models
      .map(model => String(model || '').trim())
      .filter(Boolean)
  ))
}

function switchType(type: APIConfigType) {
  activeType.value = type
  voiceSubType.value = 'stt'
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  modelList.value = []
  noModelsAfterConnect.value = false
  clearForm()
  if (type === 'voice') {
    form.value.provider = 'local'
  }
}

function switchVoiceSub(sub: 'stt' | 'tts') {
  voiceSubType.value = sub
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  modelList.value = []
  noModelsAfterConnect.value = false
  clearForm()
  if (isLocalType.value) {
    form.value.provider = 'local'
  }
}

function ensureValidProvider() {
  const options = providerOptions.value
  const keys = Object.keys(options)
  if (!options[form.value.provider]) {
    form.value.provider = (keys[0] as APIProvider) || 'openai-compatible'
    const def = DEFAULT_URLS[form.value.provider]
    form.value.baseURL = def || ''
  }
}

function clearForm() {
  form.value = { name: '', baseURL: '', apiKey: '', provider: 'openai-compatible' }
  showKey.value = false
  ensureValidProvider()
}

function onProviderChange() {
  const def = DEFAULT_URLS[form.value.provider]
  form.value.baseURL = def || ''
  availableModels.value = []
  selectedModel.value = ''
  modelList.value = []
  noModelsAfterConnect.value = false
}

function startNew() {
  selectedConfigId.value = ''
  availableModels.value = []
  selectedModel.value = ''
  modelList.value = []
  noModelsAfterConnect.value = false
  clearForm()
}

function onConfigSelect() {
  availableModels.value = []
  selectedModel.value = ''
  modelList.value = []

  const config = allConfigs.value.find(c => c.id === selectedConfigId.value)
  if (config) {
    form.value.name = config.name
    form.value.baseURL = config.baseURL ?? ''
    form.value.apiKey = ''
    form.value.provider = config.provider || 'openai-compatible'
    modelList.value = normalizeModelList([...(config.models || []), config.model])
    selectedModel.value = config.model || modelList.value[0] || ''
  } else {
    clearForm()
  }
}

function addModel() {
  const model = selectedModel.value.trim()
  if (!model) {
    uni.showToast({ title: '请先输入模型名称', icon: 'none' })
    return
  }

  const nextModels = normalizeModelList([...modelList.value, model])
  if (nextModels.length === modelList.value.length) {
    uni.showToast({ title: '模型已存在', icon: 'none' })
    return
  }

  modelList.value = nextModels
  selectedModel.value = model
  uni.showToast({ title: '模型已添加', icon: 'success' })
}

function selectModel(model: string) {
  selectedModel.value = model
}

function removeModel(model: string) {
  modelList.value = modelList.value.filter(item => item !== model)
  if (selectedModel.value === model) {
    selectedModel.value = modelList.value[0] || ''
  }
}

async function saveConfig() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入配置名称', icon: 'none' })
    return
  }

  if (form.value.provider !== 'local' && !form.value.apiKey.trim() && !selectedConfigId.value) {
    uni.showToast({ title: '请输入 API Key', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const existing = selectedConfigId.value
      ? allConfigs.value.find(c => c.id === selectedConfigId.value)
      : null
    const models = normalizeModelList([...modelList.value, selectedModel.value])

    const payload: APIConfig = {
      id: existing?.id ?? generateUUID(),
      name: form.value.name.trim(),
      provider: form.value.provider || 'openai-compatible',
      apiKey: form.value.apiKey.trim() || existing?.apiKey || '',
      baseURL: form.value.baseURL.trim() || undefined,
      model: selectedModel.value.trim() || models[0] || existing?.model || '',
      models,
      isDefault: existing?.isDefault ?? false,
      source: 'storage',
      configType: effectiveConfigType.value
    }

    if (!payload.isDefault) {
      const hasDefault = configsForType.value.some(c => c.isDefault && c.id !== payload.id)
      if (!hasDefault) {
        payload.isDefault = true
      }
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
    modelList.value = []
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
      provider: form.value.provider || existing?.provider || 'openai-compatible',
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
      models = await apiConfigService.fetchModels(baseURL, apiKey, effectiveConfigType.value, form.value.provider || existing?.provider)
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
  if (!selectedConfigId.value) return
  if (form.value.provider !== 'local' && !selectedModel.value) return

  saving.value = true
  try {
    const isLocal = form.value.provider === 'local'
    // Update all configs of this type: clear isDefault
    for (const c of configsForType.value) {
      if (c.isDefault || c.id === selectedConfigId.value) {
        await apiConfigService.save({
          ...c,
          isDefault: c.id === selectedConfigId.value,
          model: c.id === selectedConfigId.value && !isLocal ? selectedModel.value : c.model,
          models: c.id === selectedConfigId.value && !isLocal
            ? normalizeModelList([...modelList.value, selectedModel.value])
            : c.models
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
  padding: 0 0 100px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + 44px);
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border: none;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
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

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
}

.back-btn {
  align-self: center;
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
  font: inherit;
  cursor: pointer;
  box-shadow: none;
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

.type-tabs {
  width: min(960px, calc(100% - 32px));
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 16px auto 0;
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
  width: min(960px, calc(100% - 32px));
  margin: 16px auto 0;
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

.hint.warning {
  color: #fbbf24;
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

.add-model-btn {
  width: 100%;
  min-height: 42px;
  margin-top: 12px;
  border: 1px dashed rgba(125, 211, 252, 0.38);
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.08);
  color: #7dd3fc;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), opacity var(--transition-base);

  &:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.15);
    border-color: rgba(125, 211, 252, 0.58);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.model-card-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.model-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: border-color var(--transition-base), background var(--transition-base);

  &.active {
    border-color: rgba(125, 211, 252, 0.45);
    background: rgba(56, 189, 248, 0.10);
  }
}

.model-card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  strong {
    color: var(--text-primary);
    font-size: 14px;
    overflow-wrap: anywhere;
  }
}

.model-card-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;

  button {
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(125, 211, 252, 0.20);
    border-radius: 10px;
    background: rgba(125, 211, 252, 0.08);
    color: #7dd3fc;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .danger {
    border-color: rgba(251, 113, 133, 0.22);
    background: rgba(251, 113, 133, 0.08);
    color: #fda4af;
  }
}

.default-hint {
  margin-top: 12px;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
}

.local-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(52, 211, 153, 0.10);
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.04);
}

.local-info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.local-info-label {
  color: var(--text-tertiary);
  font-size: 13px;
}

.local-info-value {
  color: $mint-light;
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 720px) {
  .page-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .type-tabs,
  .card {
    width: calc(100% - 20px);
  }
}
</style>
