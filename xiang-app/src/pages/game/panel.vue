<template>
  <div class="game-panel-page">
    <div class="header">
      <h1 class="title">游戏中心</h1>
    </div>

    <div class="game-list">
      <div class="game-card" @click="openEscapeGame">
        <div class="game-icon">逃</div>
        <div class="game-info">
          <h3 class="game-name">限时逃脱</h3>
          <p class="game-desc">独立小游戏入口，直接进入解谜和逃脱玩法。</p>
        </div>
        <div class="play-btn">
          <span>进入</span>
          <span class="arrow">></span>
        </div>
      </div>

      <div class="game-card disabled">
        <div class="game-icon">拼</div>
        <div class="game-info">
          <h3 class="game-name">记忆拼图</h3>
          <p class="game-desc">纯游戏占位入口，后续继续补独立玩法，不接其他内容通道。</p>
        </div>
        <div class="play-btn">
          <span class="coming">敬请期待</span>
        </div>
      </div>
    </div>

    <div class="settings-entry">
      <div class="settings-item" @click="goToSettings">
        <span class="settings-icon">设</span>
        <span class="settings-label">游戏设置</span>
        <span class="arrow">›</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function openEscapeGame() {
  router.push('/game/escape')
}

function goToSettings() {
  router.push('/game/settings')
}
</script>

<style lang="scss" scoped>
.game-panel-page {
  min-height: 100vh;
  padding: 24px 24px 120px;
  background: var(--page-backdrop-soft);
}

.header {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px 22px;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(34, 38, 43, 0.8), rgba(8, 9, 10, 0.92));
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.game-list {
  max-width: 1080px;
  margin: 18px auto 0;
}

.game-card,
.settings-item {
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.game-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 18px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-strong);
  box-shadow: var(--shadow-xl);
}

.game-card.disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.game-card.disabled:hover {
  transform: none;
  border-color: var(--border-color);
  box-shadow: var(--shadow-lg);
}

.game-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  background: var(--hero-gradient);
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.game-info {
  flex: 1;
}

.game-name {
  margin-bottom: 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.game-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--interactive-gradient);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 20px 44px rgba(113, 129, 146, 0.24);
}

.coming {
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
}

.arrow {
  font-size: 18px;
  color: currentColor;
}

.settings-entry {
  max-width: 1080px;
  margin: 4px auto 0;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base);
}

.settings-item:hover {
  transform: translateY(-2px);
  border-color: var(--accent-strong);
}

.settings-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.settings-label {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

@media (max-width: 720px) {
  .game-panel-page {
    padding: 16px 16px 118px;
  }

  .header {
    top: 16px;
  }

  .game-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
