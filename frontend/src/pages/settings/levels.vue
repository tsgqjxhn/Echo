<template>
  <div class="levels-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">我的等级</p>
        <h1>聊天等级和游戏等级</h1>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <section class="level-grid">
      <article class="level-card">
        <span class="level-icon-shell">
          <img src="/src/static/images/profile-level.svg" alt="聊天等级" class="level-icon" />
        </span>
        <p class="level-label">聊天等级</p>
        <strong>Lv.{{ userStore.chatLevel }}</strong>
        <p class="level-copy">保持连续对话、增加互动轮次，后续可逐步提升聊天等级。</p>
      </article>

      <article class="level-card">
        <span class="level-icon-shell">
          <img src="/src/static/images/profile-level.svg" alt="游戏等级" class="level-icon" />
        </span>
        <p class="level-label">游戏等级</p>
        <strong>Lv.{{ userStore.gameLevel }}</strong>
        <p class="level-copy">参与小游戏并完成挑战时，游戏等级会随着进度逐步提升。</p>
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
.levels-page {
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

.levels-page::-webkit-scrollbar {
  display: none;
}

.page-header,
.level-card {
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

.level-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.level-card {
  padding: 24px;
  border-radius: 28px;
}

.level-card strong {
  display: block;
  margin: 14px 0 12px;
  color: var(--text-primary);
  font-size: clamp(34px, 5vw, 54px);
  line-height: 1;
}

.level-icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
}

.level-icon {
  width: 30px;
  height: 30px;
}

.level-label {
  margin-top: 16px;
  color: rgba(226, 232, 240, 0.72);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.level-copy {
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 720px) {
  .level-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .levels-page {
    padding: 16px 16px 32px;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
