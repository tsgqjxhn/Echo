<template>
  <div class="settings-sub-page">
    <div class="sub-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="sub-title">聊天默认设置</h1>
    </div>

    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">默认聊天模式</span>
          <span class="setting-desc">创建角色时的默认对话模式</span>
        </div>
        <select v-model="defaultMode" class="select-input">
          <option value="free-dialogue">自由对话</option>
          <option value="challenge-dialogue">挑战对话</option>
          <option value="group-chat">群聊排队</option>
        </select>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">回复长度偏好</span>
          <span class="setting-desc">AI回复的默认长度倾向</span>
        </div>
        <select v-model="replyLength" class="select-input">
          <option value="short">简短</option>
          <option value="medium">适中</option>
          <option value="long">详细</option>
        </select>
      </div>

      <div class="setting-row slider-row">
        <div class="setting-info">
          <span class="setting-name">创造力/温度</span>
          <span class="setting-desc">数值越高回复越有创意，越低越稳定</span>
        </div>
        <div class="slider-group">
          <input v-model.number="temperature" type="range" min="0" max="100" class="range-input" />
          <span class="slider-value">{{ (temperature / 100).toFixed(2) }}</span>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">流式输出</span>
          <span class="setting-desc">逐字显示AI回复（而非等全部生成完）</span>
        </div>
        <label class="toggle"><input v-model="streamEnabled" type="checkbox" /><span class="slider" /></label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const defaultMode = ref('free-dialogue')
const replyLength = ref('medium')
const temperature = ref(70)
const streamEnabled = ref(true)

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('echo_chat_defaults') || '{}')
    defaultMode.value = saved.defaultMode || 'free-dialogue'
    replyLength.value = saved.replyLength || 'medium'
    temperature.value = Math.round(Number(saved.temperature ?? 0.7) * 100)
    streamEnabled.value = saved.streamEnabled !== false
  } catch {
    // keep defaults
  }
})

watch([defaultMode, replyLength, temperature, streamEnabled], () => {
  localStorage.setItem('echo_chat_defaults', JSON.stringify({
    defaultMode: defaultMode.value,
    replyLength: replyLength.value,
    temperature: temperature.value / 100,
    streamEnabled: streamEnabled.value,
  }))
}, { deep: true })
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

.settings-list { padding: 8px 16px; display: flex; flex-direction: column; }

.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 4px; gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.setting-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.setting-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-tertiary); }

.select-input {
  padding: 6px 24px 6px 10px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary); font: inherit; font-size: 13px;
  outline: none; appearance: none; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
  &:focus { border-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.slider-row { flex-direction: column; align-items: stretch; gap: 8px; }

.slider-group { display: flex; align-items: center; gap: 10px; }

.range-input {
  flex: 1; height: 4px; appearance: none; background: rgba(255, 255, 255, 0.1);
  border-radius: 2px; outline: none;
  &::-webkit-slider-thumb {
    appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: rgba(56, 189, 248, 0.6); cursor: pointer;
  }
}

.slider-value { font-size: 13px; color: rgba(56, 189, 248, 0.7); min-width: 32px; text-align: right; }

.toggle {
  position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
}

.slider {
  position: absolute; cursor: pointer; inset: 0;
  background: rgba(255, 255, 255, 0.1); border-radius: 24px; transition: 0.2s;
  &::before {
    content: ''; position: absolute; width: 18px; height: 18px;
    left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s;
  }
  input:checked + & { background: rgba(56, 189, 248, 0.5); }
  input:checked + &::before { transform: translateX(20px); }
}
</style>
