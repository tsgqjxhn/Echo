<template>
  <div class="game-panel-page">
    <div class="header">
      <button class="menu-btn" @click="goToSettings" aria-label="设置">
        <svg viewBox="0 0 1024 1024" width="24" height="24" aria-hidden="true">
          <path d="M170.666667 213.333333h682.666666v85.333334H170.666667V213.333333z m0 512h682.666666v85.333334H170.666667v-85.333334z m0-256h682.666666v85.333334H170.666667v-85.333334z" fill="currentColor"/>
        </svg>
      </button>
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
  padding: 0 0 120px;
  background: var(--page-backdrop-soft);
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
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

.menu-btn {
  position: absolute;
  left: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
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

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.game-list {
  width: min(1080px, calc(100% - 32px));
  margin: 18px auto 0;
}

.game-card {
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--backdrop-blur)) saturate(1.2);
}

.game-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
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

.game-card.disabled .play-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  box-shadow: none;
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
  padding: 0;
  font-size: 12px;
}

.arrow {
  font-size: 18px;
  color: currentColor;
}

@media (max-width: 720px) {
  .game-panel-page {
    padding: 0 0 118px;
  }

  .header {
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 0 0 24px 24px;
  }

  .menu-btn {
    left: 16px;
  }

  .game-list {
    width: calc(100% - 20px);
  }

  .game-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .play-btn {
    align-self: flex-start;
  }
}
</style>
