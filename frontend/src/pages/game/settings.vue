<template>
  <div class="game-settings-page">
    <div class="header">
      <button class="back-btn" @click="goBack" aria-label="返回">
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
      <h1 class="title">游戏设置</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </div>

    <div class="settings-content">
      <div class="setting-section">
        <h2 class="section-title">难度设置</h2>
        <div class="difficulty-options">
          <button
            v-for="opt in difficultyOptions"
            :key="opt.key"
            type="button"
            class="difficulty-card"
            :class="{ active: difficulty === opt.key }"
            @click="setDifficulty(opt.key)"
          >
            <span class="difficulty-name">{{ opt.label }}</span>
            <span class="difficulty-desc">{{ opt.desc }}</span>
          </button>
        </div>
        <div class="difficulty-hint">
          <p>当前效果：{{ currentHint }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const router = useRouter()

const difficulty = ref<'easy' | 'normal' | 'hard'>(gameStore.difficultyLevel || 'normal')

const difficultyOptions = [
  {
    key: 'easy' as const,
    label: '简单',
    desc: '怪物数值减半，奖励减半',
    hint: '敌人/成本更弱，获得奖励减半，适合轻松体验剧情。'
  },
  {
    key: 'normal' as const,
    label: '普通',
    desc: '1倍基准',
    hint: '标准数值，平衡的挑战与收益。'
  },
  {
    key: 'hard' as const,
    label: '困难',
    desc: '怪物数值翻倍，自身奖励翻倍，自身数值不变',
    hint: '敌人/成本更强，但通关奖励翻倍，自身属性不受难度影响。'
  }
]

const currentHint = computed(() => {
  return difficultyOptions.find(o => o.key === difficulty.value)?.hint || ''
})

function goBack() {
  router.back()
}

async function setDifficulty(level: 'easy' | 'normal' | 'hard') {
  difficulty.value = level
  await gameStore.setDifficultyLevel(level)
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
  border-radius: 0;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  box-shadow: none;
  transition: opacity var(--transition-base), transform var(--transition-base);

  &:hover {
    opacity: 0.78;
  }

  &:active {
    transform: scale(0.95);
  }
}

.back-icon {
  width: 22px;
  height: 22px;
  overflow: visible;
}

.header-placeholder {
  width: 48px;
  height: 48px;
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
  margin: 0;
  padding: 20px 20px 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.difficulty-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 20px 16px;
}

.difficulty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base), transform var(--transition-base);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(125, 211, 252, 0.25);
  }

  &:active {
    transform: scale(0.96);
  }

  &.active {
    border-color: rgba(125, 211, 252, 0.55);
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(52, 211, 153, 0.12));
    box-shadow: 0 10px 24px rgba(56, 189, 248, 0.12);
  }
}

.difficulty-name {
  font-size: 15px;
  font-weight: 600;
}

.difficulty-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
  text-align: center;
}

.difficulty-hint {
  padding: 0 20px 20px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;

  p {
    margin: 0;
  }
}

@media (max-width: 720px) {
  .game-settings-page {
    padding: 0 0 118px;
  }

  .header {
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 0;
  }

  .settings-content {
    width: calc(100% - 20px);
  }

  .difficulty-options {
    padding: 0 16px 14px;
  }

  .difficulty-card {
    padding: 12px 6px;
  }

  .difficulty-name {
    font-size: 14px;
  }

  .difficulty-desc {
    font-size: 11px;
  }
}
</style>
