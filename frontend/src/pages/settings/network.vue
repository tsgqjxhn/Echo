<template>
  <div class="network-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="router.back()">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">网络与连接</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <section class="card">
      <div class="section-head">
        <span class="section-label">代理设置</span>
      </div>
      <label class="row toggle-row">
        <div class="row-text">
          <span class="row-name">启用代理</span>
          <span class="row-desc">通过代理服务器访问API</span>
        </div>
        <span class="toggle">
          <input type="checkbox" v-model="settings.proxyEnabled" @change="save" />
          <span class="track" />
        </span>
      </label>

      <template v-if="settings.proxyEnabled">
        <label class="field">
          <span>代理类型</span>
          <select v-model="settings.proxyType" class="field-select" @change="save">
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </label>
        <label class="field">
          <span>代理地址</span>
          <input v-model="settings.proxyHost" type="text" placeholder="例如: 127.0.0.1" @blur="save" />
        </label>
        <label class="field">
          <span>代理端口</span>
          <input v-model.number="settings.proxyPort" type="number" placeholder="7890" @blur="save" />
        </label>
        <label class="field">
          <span>用户名（可选）</span>
          <input v-model="settings.proxyUsername" type="text" placeholder="代理用户名" @blur="save" />
        </label>
        <label class="field">
          <span>密码（可选）</span>
          <input v-model="settings.proxyPassword" type="password" placeholder="代理密码" @blur="save" />
        </label>
      </template>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">请求配置</span>
      </div>
      <label class="field">
        <span>请求超时时间（秒）</span>
        <input v-model.number="settings.timeout" type="number" min="5" max="300" @blur="save" />
        <span class="field-hint">自定义API请求超时秒数</span>
      </label>
      <label class="field">
        <span>并发请求限制</span>
        <input v-model.number="settings.concurrentLimit" type="number" min="1" max="20" @blur="save" />
        <span class="field-hint">防止触发API限流</span>
      </label>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">自定义 Header</span>
        <button type="button" class="mini-btn" @click="addHeader">+ 添加</button>
      </div>
      <span class="field-hint">用于某些中转服务的鉴权头，例如：X-Custom-Auth: your-token</span>
      <div v-for="(h, i) in settings.customHeaders" :key="i" class="header-row">
        <input v-model="h.key" type="text" placeholder="Key" class="header-input" @blur="save" />
        <input v-model="h.value" type="text" placeholder="Value" class="header-input" @blur="save" />
        <button type="button" class="mini-btn danger" @click="removeHeader(i)">删除</button>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">请求重试策略</span>
      </div>
      <label class="field">
        <span>失败重试次数</span>
        <input v-model.number="settings.retryCount" type="number" min="0" max="5" @blur="save" />
      </label>
      <label class="field">
        <span>退避策略</span>
        <select v-model="settings.retryBackoff" class="field-select" @change="save">
          <option value="fixed">固定间隔</option>
          <option value="exponential">指数退避</option>
          <option value="linear">线性退避</option>
        </select>
      </label>
      <label class="field">
        <span>初始退避间隔（毫秒）</span>
        <input v-model.number="settings.retryInitialDelay" type="number" min="100" max="10000" step="100" @blur="save" />
      </label>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  loadNetworkSettings,
  saveNetworkSettings,
  DEFAULT_NETWORK_SETTINGS,
  type NetworkSettings,
} from '@/services/network-settings'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()
const settings = ref<NetworkSettings>({ ...DEFAULT_NETWORK_SETTINGS })

onMounted(async () => {
  settings.value = await loadNetworkSettings()
})

async function save() {
  try {
    await saveNetworkSettings(settings.value)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function addHeader() {
  settings.value.customHeaders.push({ key: '', value: '' })
}

function removeHeader(index: number) {
  settings.value.customHeaders.splice(index, 1)
  save()
}
</script>

<style lang="scss" scoped>
.network-page {
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

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
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
  cursor: pointer;
}

.back-icon {
  width: 22px;
  height: 22px;
  color: currentColor;
  overflow: visible;
}

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
}

.card {
  width: min(960px, calc(100% - 32px));
  margin: 16px auto 0;
  padding: 22px;
  border-radius: 11px;
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
  border-radius: 5px;
  background: rgba(52, 211, 153, 0.08);
  color: #6ee7b7;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.mini-btn.danger {
  border-color: rgba(251, 113, 133, 0.22);
  background: rgba(251, 113, 133, 0.08);
  color: #fda4af;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
}

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.row-desc {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.85);
  line-height: 1.4;
}

.toggle-row {
  justify-content: space-between;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.toggle .track {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: 0.18s ease;
}

.toggle .track::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #ffffff;
  transition: 0.18s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.toggle input:checked + .track {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}

.toggle input:checked + .track::before {
  transform: translateX(20px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.field span:first-child {
  color: var(--text-secondary);
  font-size: 13px;
}

.field input,
.field-select {
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
}

.field input:focus,
.field-select:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.36);
}

.field-hint {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.header-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
}

.header-input:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.36);
}

@media (max-width: 720px) {
  .card {
    width: calc(100% - 20px);
  }
}
</style>
