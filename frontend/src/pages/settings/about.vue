<template>
  <div class="about-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="router.back()">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <h1 class="page-title">关于与帮助</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <section class="card">
      <div class="section-head">
        <span class="section-label">Echo AI 角色聊天</span>
        <span class="version-tag">v{{ appVersion }}</span>
      </div>
      <p class="desc">一个开源的 AI 角色扮演与聊天应用，支持多角色管理、语音对话、H5 小游戏等功能。</p>
      <button type="button" class="primary-btn" :disabled="checkingUpdate" @click="checkUpdate">
        {{ checkingUpdate ? '检查中…' : '检查新版本' }}
      </button>
      <p v-if="updateInfo" class="update-info">{{ updateInfo }}</p>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">新手指引</span>
      </div>
      <div class="guide-steps">
        <div v-for="(step, i) in guideSteps" :key="i" class="guide-step">
          <span class="step-num">{{ i + 1 }}</span>
          <div class="step-content">
            <strong>{{ step.title }}</strong>
            <span>{{ step.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">常见问题</span>
      </div>
      <div class="faq-list">
        <details v-for="(faq, i) in faqs" :key="i" class="faq-item">
          <summary>{{ faq.q }}</summary>
          <p>{{ faq.a }}</p>
        </details>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">快捷键</span>
      </div>
      <div class="shortcut-table">
        <div v-for="(s, i) in shortcuts" :key="i" class="shortcut-row">
          <kbd>{{ s.key }}</kbd>
          <span>{{ s.action }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">更新日志</span>
      </div>
      <div class="changelog-list">
        <div v-for="(log, i) in changelogs" :key="i" class="changelog-item">
          <strong>{{ log.version }}</strong>
          <span class="changelog-date">{{ log.date }}</span>
          <ul>
            <li v-for="(item, j) in log.items" :key="j">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">开源协议</span>
      </div>
      <p class="license-text">本项目采用 MIT 许可证开源。你可以自由使用、修改和分发本软件。</p>
      <a href="https://github.com/echo-project/echo/blob/main/LICENSE" target="_blank" rel="noopener" class="link-btn">查看 LICENSE 文件</a>
    </section>

    <section class="card">
      <div class="section-head">
        <span class="section-label">反馈渠道</span>
      </div>
      <div class="link-list">
        <a href="https://github.com/echo-project/echo/issues" target="_blank" rel="noopener" class="link-btn">
          GitHub Issues
        </a>
        <a href="mailto:support@echo-project.dev" class="link-btn">发送邮件反馈</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const appVersion = ref('1.0.0')
const checkingUpdate = ref(false)
const updateInfo = ref('')

const guideSteps = [
  { title: '创建角色', desc: '进入主页，点击「创建角色」，填写角色设定、性格等信息。' },
  { title: '配置 API', desc: '在设置 → LLM API 中配置你的大模型提供商和 API Key。' },
  { title: '开始对话', desc: '选择角色进入聊天页面，输入消息即可开始与 AI 角色对话。' },
  { title: '探索高级功能', desc: '尝试语音输入、自动配图、H5 小游戏、朋友圈动态等功能。' },
]

const faqs = [
  { q: 'API 配置失败怎么办？', a: '请检查 Base URL 和 API Key 是否正确。如果是国内网络，建议开启「网络与连接」中的代理设置，或尝试切换提供商。' },
  { q: '如何导入角色？', a: '在角色列表页面点击导入按钮，支持 JSON 格式角色文件和文档导入。' },
  { q: '数据如何备份？', a: '前往设置 → 数据导入导出，可以导出标准备份或完整备份（含 API Key）。' },
  { q: '如何切换模型？', a: '在 LLM API 设置中，先「连接」获取模型列表，然后选择目标模型并保存。' },
]

const shortcuts = [
  { key: 'Enter', action: '发送消息' },
  { key: 'Shift + Enter', action: '换行' },
  { key: 'Ctrl + R', action: '重新生成最后一条回复' },
  { key: 'Esc', action: '关闭面板/弹窗' },
]

const changelogs = [
  {
    version: 'v1.0.0',
    date: '2025-05-12',
    items: [
      '新增网络与连接设置（代理、超时、并发、自定义Header、重试策略）',
      '新增 Token 估算和费用统计功能',
      '新增数据二维码迁移功能',
      '新增自定义导出功能',
      '新增关于与帮助页面',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2025-04-01',
    items: [
      '支持多角色群聊',
      '新增 H5 小游戏嵌入',
      '支持语音输入和 TTS 朗读',
    ],
  },
]

async function checkUpdate() {
  checkingUpdate.value = true
  updateInfo.value = ''
  try {
    // Simulate version check
    await new Promise(r => setTimeout(r, 1200))
    updateInfo.value = '当前已是最新版本'
  } catch {
    updateInfo.value = '检查失败，请稍后重试'
  } finally {
    checkingUpdate.value = false
  }
}
</script>

<style lang="scss" scoped>
.about-page {
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

.version-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  color: #6ee7b7;
  font-size: 12px;
}

.desc {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 14px;
}

.primary-btn {
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: 7px;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0284c7);
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(56, 189, 248, 0.28);
}

.primary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.update-info {
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: center;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-content strong {
  color: var(--text-primary);
  font-size: 14px;
}

.step-content span {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faq-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.faq-item summary {
  padding: 14px 16px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item p {
  padding: 0 16px 14px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.shortcut-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.shortcut-row kbd {
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}

.shortcut-row span {
  color: var(--text-secondary);
  font-size: 14px;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.changelog-item {
  padding: 14px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.changelog-item strong {
  color: var(--text-primary);
  font-size: 15px;
}

.changelog-date {
  margin-left: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.changelog-item ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.license-text {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-btn {
  display: block;
  padding: 12px 16px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7dd3fc;
  font-size: 14px;
  text-decoration: none;
  text-align: center;
  transition: background 0.15s;
}

.link-btn:hover {
  background: rgba(56, 189, 248, 0.08);
}

@media (max-width: 720px) {
  .card {
    width: calc(100% - 20px);
  }
}
</style>
