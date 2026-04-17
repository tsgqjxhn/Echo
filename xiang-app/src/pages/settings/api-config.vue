<template>
  <div class="api-config-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">模型连接</p>
        <h1>管理你的 API 配置</h1>
        <p class="header-copy">
          这里支持新增、测试、编辑和切换默认配置，聊天页会优先读取默认项。
        </p>
      </div>

      <div class="header-actions">
        <button type="button" class="ghost-btn" @click="router.back()">返回</button>
        <button type="button" class="primary-btn" @click="showAddForm">新增配置</button>
      </div>
    </header>

    <section class="summary-grid">
      <article class="summary-card">
        <span>配置数量</span>
        <strong>{{ configs.length }}</strong>
      </article>
      <article class="summary-card">
        <span>默认配置</span>
        <strong>{{ defaultConfigName }}</strong>
      </article>
      <article class="summary-card">
        <span>当前状态</span>
        <strong>{{ configs.length > 0 ? '可用于聊天' : '等待接入' }}</strong>
      </article>
    </section>

    <section v-if="configs.length > 0" class="config-list">
      <article
        v-for="config in configs"
        :key="config.id"
        class="config-card"
        :class="{ active: config.isDefault }"
      >
        <div class="config-main" @click="selectConfig(config)">
          <div class="config-header">
            <h2>{{ config.name }}</h2>
            <span v-if="config.isDefault" class="default-badge">默认</span>
            <span v-if="config.source === 'env'" class="source-badge">env</span>
          </div>

          <div class="config-meta">
            <span>{{ getProviderName(config.provider) }}</span>
            <span>{{ config.model }}</span>
            <span>{{ config.baseURL || 'OpenAI 默认地址' }}</span>
          </div>
        </div>

        <div class="config-actions">
          <button type="button" class="action-btn" @click="testConnection(config)">
            {{ testingId === config.id ? '测试中…' : '测试连接' }}
          </button>
          <button
            type="button"
            class="action-btn"
            :disabled="config.source === 'env'"
            @click="editConfig(config)"
          >
            编辑
          </button>
          <button
            type="button"
            class="action-btn danger"
            :disabled="config.source === 'env'"
            @click="deleteConfig(config)"
          >
            删除
          </button>
        </div>
      </article>
    </section>

    <section v-else class="empty-card">
      <p class="eyebrow">还没有配置</p>
      <h2>先接入一个模型，再开始聊天</h2>
      <p>建议至少保留一个默认配置，聊天页会读取它来生成回复。</p>
      <button type="button" class="primary-btn" @click="showAddForm">创建第一个配置</button>
    </section>

    <div v-if="showForm" class="overlay" @click="closeForm">
      <form class="form-card" @click.stop @submit.prevent="saveConfig">
        <div class="form-header">
          <div>
            <p class="eyebrow">{{ isEditing ? '编辑' : '新增' }}</p>
            <h2>{{ isEditing ? '更新配置' : '创建配置' }}</h2>
          </div>

          <button type="button" class="ghost-btn" @click="closeForm">关闭</button>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>配置名称</span>
            <input v-model="formData.name" type="text" maxlength="50" placeholder="例如：主账号" />
          </label>

          <label class="field">
            <span>提供商</span>
            <select v-model="formData.provider">
              <option v-for="option in providerOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field field-full">
            <span>API Key</span>
            <input
              v-model="formData.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              :placeholder="isEditing ? '留空表示保留原密钥' : '请输入 API Key'"
            />
          </label>

          <label class="field">
            <span>Base URL</span>
            <input v-model="formData.baseURL" type="url" placeholder="可留空使用默认地址" />
          </label>

          <label class="field">
            <span>模型名称</span>
            <input v-model="formData.model" type="text" placeholder="请输入模型名称" />
          </label>
        </div>

        <div class="form-actions">
          <label class="toggle-row">
            <input v-model="showApiKey" type="checkbox" />
            <span>显示 API Key</span>
          </label>

          <button type="submit" class="primary-btn" :disabled="saving">
            {{ saving ? '保存中…' : '保存配置' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { APIConfig, APIProvider } from '@/types/api-config'
import { apiConfigService } from '@/services/api-config'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()

const configs = ref<APIConfig[]>([])
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const showApiKey = ref(false)
const testingId = ref<string | null>(null)

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI 兼容接口' }
]

const formData = ref({
  name: '',
  provider: 'openai' as APIProvider,
  apiKey: '',
  baseURL: '',
  model: ''
})

const defaultConfigName = computed(() => {
  return configs.value.find(config => config.isDefault)?.name || '未设置'
})

onMounted(async () => {
  await loadConfigs()
})

async function loadConfigs() {
  configs.value = await apiConfigService.getAll()
}

function resetForm() {
  formData.value = {
    name: '',
    provider: 'openai',
    apiKey: '',
    baseURL: '',
    model: ''
  }
  showApiKey.value = false
}

function getProviderName(provider: APIProvider): string {
  return providerOptions.find(option => option.value === provider)?.label || provider
}

function showAddForm() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showForm.value = true
}

function editConfig(config: APIConfig) {
  if (config.source === 'env') {
    uni.showToast({
      title: '请修改 xiang-app/.env.local 中的本地配置',
      icon: 'none'
    })
    return
  }

  isEditing.value = true
  editingId.value = config.id
  formData.value = {
    name: config.name,
    provider: config.provider,
    apiKey: '',
    baseURL: config.baseURL || '',
    model: config.model
  }
  showApiKey.value = false
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function selectConfig(config: APIConfig) {
  if (config.isDefault) {
    return
  }

  try {
    await apiConfigService.setAsDefault(config.id)
    await loadConfigs()
    uni.showToast({
      title: `已将 ${config.name} 设为默认配置`,
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '切换默认配置失败',
      icon: 'none'
    })
  }
}

async function testConnection(config: APIConfig) {
  testingId.value = config.id

  try {
    const result = await apiConfigService.testConnection(config)
    uni.showToast({
      title: result.success ? `连接成功: ${result.model || config.model}` : result.message,
      icon: result.success ? 'success' : 'none',
      duration: 2500
    })
  } finally {
    testingId.value = null
  }
}

async function saveConfig() {
  if (!formData.value.name.trim()) {
    uni.showToast({ title: '请输入配置名称', icon: 'none' })
    return
  }

  if (!formData.value.model.trim()) {
    uni.showToast({ title: '请输入模型名称', icon: 'none' })
    return
  }

  if (!isEditing.value && !formData.value.apiKey.trim()) {
    uni.showToast({ title: '请输入 API Key', icon: 'none' })
    return
  }

  saving.value = true

  try {
    if (isEditing.value && editingId.value) {
      const existing = await apiConfigService.getConfig(editingId.value)
      if (!existing) {
        throw new Error('配置不存在')
      }

      existing.name = formData.value.name.trim()
      existing.provider = formData.value.provider
      existing.baseURL = formData.value.baseURL.trim()
      existing.model = formData.value.model.trim()

      if (formData.value.apiKey.trim()) {
        existing.apiKey = formData.value.apiKey.trim()
      }

      await apiConfigService.save(existing)
    } else {
      await apiConfigService.create({
        name: formData.value.name.trim(),
        provider: formData.value.provider,
        apiKey: formData.value.apiKey.trim(),
        baseURL: formData.value.baseURL.trim(),
        model: formData.value.model.trim(),
        isDefault: configs.value.length === 0
      })
    }

    closeForm()
    await loadConfigs()
    uni.showToast({ title: '配置已保存', icon: 'success' })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '保存失败',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}

async function deleteConfig(config: APIConfig) {
  if (config.source === 'env') {
    uni.showToast({
      title: 'env 配置不能在页面中删除',
      icon: 'none'
    })
    return
  }

  const confirmed = window.confirm(`确认删除配置“${config.name}”吗？`)
  if (!confirmed) {
    return
  }

  try {
    await apiConfigService.delete(config.id)
    await loadConfigs()
    uni.showToast({ title: '配置已删除', icon: 'success' })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '删除失败',
      icon: 'none'
    })
  }
}
</script>

<style lang="scss" scoped>
.api-config-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(74, 144, 217, 0.14), transparent 28%),
    linear-gradient(180deg, #090b0e 0%, #12161b 100%);
}

.page-header,
.summary-card,
.config-card,
.empty-card,
.form-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 16, 20, 0.88);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
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
  font-size: clamp(28px, 4vw, 40px);
}

.header-copy {
  max-width: 720px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.ghost-btn,
.primary-btn,
.action-btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 16px;
  cursor: pointer;
}

.ghost-btn,
.action-btn {
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.summary-card {
  padding: 20px;
  border-radius: 24px;

  span {
    display: block;
    margin-bottom: 10px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  strong {
    color: var(--text-primary);
    font-size: 24px;
  }
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border-radius: 28px;

  &.active {
    border-color: rgba(74, 144, 217, 0.3);
    box-shadow: 0 18px 40px rgba(35, 85, 145, 0.16);
  }
}

.config-main {
  min-width: 0;
  cursor: pointer;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  h2 {
    color: var(--text-primary);
    font-size: 22px;
  }
}

.default-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(74, 144, 217, 0.12);
  color: var(--primary-color);
  font-size: 12px;
}

.source-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}

.config-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
    font-size: 12px;
  }
}

.config-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.action-btn.danger {
  color: #ff9d9d;
  border-color: rgba(255, 107, 107, 0.25);
}

.action-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.empty-card {
  margin-top: 18px;
  padding: 30px;
  border-radius: 32px;

  h2 {
    margin: 12px 0 10px;
    color: var(--text-primary);
    font-size: 28px;
  }

  p {
    margin-bottom: 18px;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(7, 9, 11, 0.72);
  backdrop-filter: blur(10px);
  z-index: 1200;
}

.form-card {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 32px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;

  h2 {
    margin-top: 10px;
    color: var(--text-primary);
    font-size: 28px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;

  &.field-full {
    grid-column: 1 / -1;
  }
}

.field input,
.field select {
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;

  &:focus {
    outline: none;
    border-color: rgba(74, 144, 217, 0.35);
  }
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
}

.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .summary-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .page-header,
  .config-card {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .api-config-page,
  .overlay {
    padding: 16px;
  }

  .form-actions,
  .header-actions,
  .config-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
