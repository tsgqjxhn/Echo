<template>
  <div class="settings-sub-page">
    <div class="sub-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="sub-title">通知/消息</h1>
    </div>

    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">新消息通知</span>
          <span class="setting-desc">收到AI回复时推送通知</span>
        </div>
        <label class="toggle"><input v-model="newMsgNotify" type="checkbox" /><span class="slider" /></label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">好友动态通知</span>
          <span class="setting-desc">好友角色有更新时提醒</span>
        </div>
        <label class="toggle"><input v-model="friendNotify" type="checkbox" /><span class="slider" /></label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">免打扰时段</span>
          <span class="setting-desc">在指定时间内不推送通知</span>
        </div>
        <label class="toggle"><input v-model="dndEnabled" type="checkbox" /><span class="slider" /></label>
      </div>

      <div v-if="dndEnabled" class="setting-row inline">
        <div class="setting-info">
          <span class="setting-name">开始时间</span>
        </div>
        <input v-model="dndStart" type="time" class="time-input" />
      </div>

      <div v-if="dndEnabled" class="setting-row inline">
        <div class="setting-info">
          <span class="setting-name">结束时间</span>
        </div>
        <input v-model="dndEnd" type="time" class="time-input" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-name">通知声音</span>
          <span class="setting-desc">播放新消息提示音</span>
        </div>
        <label class="toggle"><input v-model="soundEnabled" type="checkbox" /><span class="slider" /></label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ensureNotificationPermission } from '@/services/notification'

const router = useRouter()

const newMsgNotify = ref(true)
const friendNotify = ref(true)
const dndEnabled = ref(false)
const dndStart = ref('23:00')
const dndEnd = ref('08:00')
const soundEnabled = ref(true)

onMounted(() => {
  try {
    const raw = localStorage.getItem('echo_notification_settings')
    if (!raw) return
    const settings = JSON.parse(raw) as {
      newMsgNotify?: boolean
      friendNotify?: boolean
      dndEnabled?: boolean
      dndStart?: string
      dndEnd?: string
      soundEnabled?: boolean
    }
    newMsgNotify.value = settings.newMsgNotify !== false
    friendNotify.value = settings.friendNotify !== false
    dndEnabled.value = settings.dndEnabled === true
    dndStart.value = settings.dndStart || '23:00'
    dndEnd.value = settings.dndEnd || '08:00'
    soundEnabled.value = settings.soundEnabled !== false
  } catch {
    // Ignore malformed settings.
  }
})

watch([newMsgNotify, friendNotify, dndEnabled, dndStart, dndEnd, soundEnabled], () => {
  const settings = {
    newMsgNotify: newMsgNotify.value,
    friendNotify: friendNotify.value,
    dndEnabled: dndEnabled.value,
    dndStart: dndStart.value,
    dndEnd: dndEnd.value,
    soundEnabled: soundEnabled.value,
  }
  localStorage.setItem('echo_notification_settings', JSON.stringify(settings))
  if (newMsgNotify.value) {
    void ensureNotificationPermission().catch(() => undefined)
  }
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
  padding: 16px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  &.inline { padding: 10px 4px; }
}

.setting-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.setting-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-tertiary); }

.time-input {
  padding: 6px 10px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary); font: inherit; font-size: 13px;
  outline: none; &:focus { border-color: rgba(56, 189, 248, 0.4); }
}

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
