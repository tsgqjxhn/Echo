<template>
  <div class="coins-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">我的卜币</p>
        <h1>查看余额和获得方法</h1>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <section class="balance-card">
      <span class="balance-label">当前余额</span>
      <div class="balance-row">
        <span class="balance-icon-shell">
          <img src="/src/static/images/profile-coin.svg" alt="卜币" class="balance-icon" />
        </span>
        <strong>{{ userStore.fortuneCoins }}</strong>
        <span class="balance-unit">卜币</span>
      </div>
    </section>

    <section class="methods-card">
      <p class="section-title">获得方法</p>

      <article class="method-item">
        <strong>完成每日聊天</strong>
        <span>和任意角色保持连续聊天，可以逐步积累卜币奖励。</span>
      </article>

      <article class="method-item">
        <strong>参与小游戏</strong>
        <span>完成小游戏挑战或达成阶段目标时，可获得额外卜币。</span>
      </article>

      <article class="method-item">
        <strong>参加后续活动</strong>
        <span>后续如果接入签到或活动系统，奖励也会统一累计到这里。</span>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await userStore.loadUserInfo()
})
</script>

<style lang="scss" scoped>
.coins-page {
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
  padding: 24px 24px 40px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.coins-page::-webkit-scrollbar {
  display: none;
}

.page-header,
.balance-card,
.methods-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border-radius: 30px;
}

.eyebrow {
  color: rgba(226, 232, 240, 0.72);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin-top: 12px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 40px);
}

.ghost-btn {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.balance-card,
.methods-card {
  margin-top: 18px;
  padding: 26px;
  border-radius: 28px;
}

.balance-label,
.section-title {
  color: rgba(226, 232, 240, 0.7);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.balance-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

.balance-row strong {
  color: var(--text-primary);
  font-size: clamp(40px, 8vw, 68px);
  line-height: 1;
}

.balance-icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
}

.balance-icon {
  width: 30px;
  height: 30px;
  filter: invert(1);
}

.balance-unit {
  color: var(--text-secondary);
  font-size: 16px;
}

.methods-card {
  display: grid;
  gap: 14px;
}

.method-item {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.03);
}

.method-item strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 18px;
}

.method-item span {
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 640px) {
  .coins-page {
    padding: 16px 16px 32px;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
