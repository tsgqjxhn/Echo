<template>
  <div class="game-settings-page">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">←</button>
      <h1 class="title">游戏设置</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </div>

    <div class="settings-content">
      <div class="setting-section">
        <h2 class="section-title">通用</h2>
        <div class="setting-item">
          <div class="item-left">
            <span class="item-icon">🎮</span>
            <span class="item-label">小游戏功能</span>
          </div>
          <div class="item-right">
            <label class="switch">
              <input type="checkbox" v-model="globalEnabled" @change="saveSettings" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-section">
        <h2 class="section-title">逃跑游戏</h2>
        <div class="setting-item">
          <div class="item-left">
            <span class="item-label">基础成功率</span>
          </div>
          <div class="item-right">
            <span class="item-value">50%</span>
          </div>
        </div>
        <div class="setting-item">
          <div class="item-left">
            <span class="item-label">能力值范围</span>
          </div>
          <div class="item-right">
            <span class="item-value">50-80</span>
          </div>
        </div>
        <div class="setting-hint">
          逃跑成功率 = 基础成功率 + 能力值 - 路线难度
        </div>
      </div>

      <div class="setting-section">
        <h2 class="section-title">关于</h2>
        <div class="setting-item">
          <div class="item-left">
            <span class="item-label">说明</span>
          </div>
        </div>
        <div class="about-text">
          <p>小游戏可以在聊天过程中触发，影响剧情发展。</p>
          <p>关闭小游戏功能后，聊天中将不会触发小游戏，但仍可在游戏中心游玩。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const router = useRouter()

const globalEnabled = ref(true)

onMounted(() => {
  globalEnabled.value = gameStore.isGlobalEnabled
})

function goBack() {
  router.back()
}

function saveSettings() {
  gameStore.setGlobalEnabled(globalEnabled.value)
}
</script>

<style lang="scss" scoped>
.game-settings-page {
  min-height: 100vh;
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0 0 30px 30px;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.back-btn {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: var(--top-bar-button-surface);
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition:
    background var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-base);

  &:hover {
    border-color: rgba(186, 230, 253, 0.22);
    background: rgba(255, 255, 255, 0.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

.header-placeholder {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}

.title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.settings-content {
  width: min(960px, calc(100% - 32px));
  margin: 18px auto 0;
  display: grid;
  gap: 16px;
}

.setting-section {
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
}

.section-title {
  padding: 20px 20px 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-icon {
  font-size: 20px;
}

.item-label {
  font-size: 15px;
  color: var(--text-primary);
}

.item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-value {
  font-size: 14px;
  color: var(--text-secondary);
}

.setting-hint {
  padding: 14px 20px 20px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.about-text {
  padding: 0 20px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;

  p {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background: var(--interactive-gradient);
    }

    &:checked + .slider:before {
      transform: translateX(24px);
    }
  }

  .slider {
    position: absolute;
    inset: 0;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.06);
    transition: 0.3s;
    border-radius: 999px;

    &:before {
      position: absolute;
      content: '';
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }
}

@media (max-width: 720px) {
  .game-settings-page {
    padding: 0 0 118px;
  }

  .header {
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 0 0 24px 24px;
  }

  .settings-content {
    width: calc(100% - 20px);
  }

  .setting-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
