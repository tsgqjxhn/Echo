<template>
  <div class="settings-sub-page">
    <div class="sub-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="sub-title">关于</h1>
    </div>

    <div class="about-content">
      <div class="app-brand">
        <div class="brand-icon">E</div>
        <h2 class="brand-name">Echo</h2>
        <span class="brand-version">v{{ version }}</span>
      </div>

      <div class="info-list">
        <div class="info-item">
          <span class="info-label">应用名称</span>
          <span class="info-value">Echo 回声</span>
        </div>
        <div class="info-item">
          <span class="info-label">版本号</span>
          <span class="info-value">{{ version }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">构建时间</span>
          <span class="info-value">{{ buildTime }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">运行环境</span>
          <span class="info-value">{{ platform }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">存储引擎</span>
          <span class="info-value">LocalStorage + IndexedDB</span>
        </div>
      </div>

      <div class="about-footer">
        <p class="footer-text">AI 角色对话平台</p>
        <p class="footer-text">Powered by Claude / GPT / GLM</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const version = '1.0.0'
const buildTime = new Date().toISOString().split('T')[0]

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const platform = ua.includes('Android') ? 'Android (Capacitor)'
  : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS (Capacitor)'
  : 'Web Browser'
</script>

<style lang="scss" scoped>
.settings-sub-page { min-height: 100vh; background: var(--page-backdrop-soft); }

.sub-header {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
}

.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; border-radius: 12px;
  background: transparent; color: var(--text-primary); cursor: pointer;
}

.sub-title { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary); }

.about-content { padding: 24px 16px; }

.app-brand {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  margin-bottom: 32px;
}

.brand-icon {
  width: 72px; height: 72px; border-radius: 18px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #f0d060; font-size: 36px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.brand-name {
  margin: 0; font-size: 24px; font-weight: 700;
  color: var(--text-primary);
}

.brand-version {
  font-size: 13px; color: var(--text-tertiary);
  padding: 2px 10px; border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.info-list {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; overflow: hidden; margin-bottom: 32px;
}

.info-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  &:last-child { border-bottom: none; }
}

.info-label { font-size: 14px; color: var(--text-secondary); }
.info-value { font-size: 14px; color: var(--text-primary); }

.about-footer { text-align: center; }

.footer-text {
  margin: 0 0 4px; font-size: 12px; color: var(--text-tertiary);
}
</style>
