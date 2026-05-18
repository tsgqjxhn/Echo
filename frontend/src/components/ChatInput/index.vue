<template>
  <nav class="bottom-nav" aria-label="Bottom navigation">
    <div class="nav-inner">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="nav-item"
        :class="{ active: props.modelValue === tab.key }"
        :aria-label="tab.label"
        :title="tab.label"
        @click="handlePress(tab)"
      >
        <span class="icon-wrap" :class="{ 'icon-wrap--active': props.modelValue === tab.key }">
          <svg
            v-if="tab.key === 'chat'"
            class="nav-svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <svg
            v-else-if="tab.key === 'game'"
            class="nav-svg nav-svg--game"
            viewBox="0 0 1024 1024"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M812.2 596.6c39.2 0 71.1-31.9 71.1-71.1 0-39.2-31.9-71.1-71.1-71.1-39.2 0-71.2 31.9-71.2 71.1C741.1 564.7 773 596.6 812.2 596.6zM812.2 491.2c18.9 0 34.3 15.4 34.3 34.3 0 18.9-15.4 34.3-34.3 34.3-18.9 0-34.3-15.4-34.3-34.3C777.9 506.6 793.3 491.2 812.2 491.2z" />
            <path d="M664.8 467.6c39.2 0 71.1-31.9 71.1-71.1 0-39.2-31.9-71.1-71.1-71.1s-71.1 31.9-71.1 71.1C593.7 435.6 625.6 467.6 664.8 467.6zM664.8 362.1c18.9 0 34.3 15.4 34.3 34.3 0 18.9-15.4 34.3-34.3 34.3s-34.3-15.4-34.3-34.3C630.5 377.5 645.9 362.1 664.8 362.1z" />
            <path d="M981.3 494.6v-95.2c0-38.2-6.5-71.9-19.3-100.3-11.5-25.5-28.1-46.8-49.3-63.4-44.1-34.4-96.5-39.5-123.7-39.5H530.6v-47.3c0-10.2-8.2-18.4-18.4-18.4s-18.4 8.2-18.4 18.4v47.3H220.9c-27.3 0-79.6 5.1-123.7 39.5-21.3 16.6-37.9 37.9-49.3 63.4C35.1 327.6 28.6 361.3 28.6 399.5v95.2l0 27.7v151.8c0 65.4 53.2 118.6 118.6 118.6h48c3.2 0.2 17.1 0.6 33.7-2.2 26.5-4.4 46.8-14.3 60.4-29.6 14.5-16.3 23-28.5 24.7-31.1 14.8-19.7 36.8-31.7 65.4-35.7 5.9-0.8 12-1.3 18.7-1.6h70.3 0.4 0.4c0.4 0 42.2-1.2 61.1 22.6 6.4 7.9 17.9 9.2 25.9 2.9 7.9-6.4 9.2-17.9 2.9-25.9-29.6-37.1-84.9-36.6-90.9-36.4h-70.4-0.8c-8 0.3-15.4 1-22.5 2-39 5.4-69.4 22.4-90.3 50.6l-0.6 0.8c-0.1 0.1-7.7 11.5-21.8 27.5-16.1 18.2-52.4 20.2-64.9 19.5l-0.6 0h-49c-45.1 0-81.8-36.7-81.8-81.8V522.4l0-27.7v-95.2c0-61.2 18.3-106.5 54.4-134.6 35.4-27.6 78.5-31.8 101.1-31.8h568.1c22.5 0 65.6 4.1 101.1 31.8 36.1 28.1 54.4 73.4 54.4 134.6v95.2l0 27.7v151.8c0 45.1-36.7 81.8-81.8 81.8h-48.4-1.2c-11.7 0.8-48.7-1.2-64.9-19.5-14.1-15.9-21.8-27.3-21.8-27.4l-0.6-0.8c-20.9-28.2-51.3-45.2-90.3-50.6-5.6-0.8-19.3-1.2-36.6-1.7-4.1-0.1-7.5-0.2-9.3-0.3-10.2-0.4-18.7 7.5-19.2 17.6-0.4 10.2 7.5 18.7 17.6 19.2 2 0.1 5.4 0.2 9.8 0.3 8.5 0.2 28.5 0.8 32.6 1.3 28.7 3.9 50.7 15.9 65.4 35.7 1.8 2.6 10.2 14.8 24.7 31.1 13.6 15.3 33.9 25.3 60.4 29.6 11.5 1.9 21.7 2.3 27.9 2.3 2.8 0 4.8-0.1 5.8-0.1h48c65.4 0 118.6-53.2 118.6-118.6V522.4L981.3 494.6z" />
            <path d="M268.4 585.6c0 0 0 0 0 0 10.2 0 18.4-8.2 18.4-18.4l0.2-105.3 105.1-0.2c10.2 0 18.4-8.3 18.4-18.5 0-10.2-8.3-18.4-18.4-18.4 0 0 0 0 0 0l-104.9 0.2 0.2-105.1c0-10.2-8.2-18.4-18.4-18.5 0 0 0 0 0 0-10.2 0-18.4 8.2-18.4 18.4l-0.2 105.3-105.1 0.2c-10.2 0-18.4 8.3-18.4 18.5 0 10.2 8.3 18.4 18.4 18.4 0 0 0 0 0 0l104.9-0.2-0.2 105.1C249.9 577.3 258.2 585.6 268.4 585.6z" />
          </svg>

          <svg
            v-else-if="tab.key === 'home'"
            class="nav-svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2h-4.5v-7h-5v7H5a2 2 0 0 1-2-2V9.5Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <svg
            v-else-if="tab.key === 'history'"
            class="nav-svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M12 7v5l3.5 2"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M5 7.5H2.8V5.3"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <svg
            v-else
            class="nav-svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M5 20a7 7 0 0 1 14 0"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>

          <span
            v-if="tab.key === 'history' && props.historyBadge"
            class="nav-badge"
            aria-hidden="true"
          />
        </span>

        <span
          class="active-dot"
          :class="{ 'active-dot--visible': props.modelValue === tab.key }"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="safe-bottom" />
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

interface TabItem {
  key: string
  label: string
  path: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  historyBadge?: boolean
}>(), {
  modelValue: 'chat',
  historyBadge: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const router = useRouter()
const route = useRoute()

const tabs: TabItem[] = [
  { key: 'chat', label: 'Chat', path: '/dialogue' },
  { key: 'game', label: 'Game', path: '/game/panel' },
  { key: 'home', label: 'Home', path: '/character' },
  { key: 'history', label: 'History', path: '/history' },
  { key: 'profile', label: 'Profile', path: '/settings' },
]

function handlePress(tab: TabItem) {
  emit('update:modelValue', tab.key)

  if (route.path !== tab.path) {
    router.push(tab.path)
  }
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  border-top: 1px solid rgba(125, 211, 252, 0.08);
  background: var(
    --app-bottom-nav-surface,
    linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(8, 13, 24, 0.94) 100%)
  );
  box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}

.nav-inner {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  min-height: 60px;
  padding: 6px 8px 5px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 48px;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: rgba(186, 230, 253, 0.4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s ease;
}

.nav-item:hover {
  color: rgba(240, 249, 255, 0.72);
}

.nav-item:active .icon-wrap {
  animation: tab-bounce 0.28s ease;
}

.nav-item.active {
  color: #7dd3fc;
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 34px;
  border-radius: 5px;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.nav-badge {
  position: absolute;
  top: 3px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 2px var(--app-bottom-nav-badge-ring, rgba(8, 13, 24, 0.96)), 0 0 10px rgba(239, 68, 68, 0.72);
}

.icon-wrap--active {
  background: rgba(255, 255, 255, 0.08);
}

.nav-svg {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

.nav-svg--game {
  width: 24px;
  height: 24px;
  transform: translateY(1px);
}

.active-dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, #38bdf8, #0284c7);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
  opacity: 0;
  transform: translateY(3px) scale(0.4);
  pointer-events: none;
}

.active-dot--visible {
  animation: dot-enter 0.22s ease forwards;
}

.safe-bottom {
  height: env(safe-area-inset-bottom, 0px);
}

@keyframes dot-enter {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.4);
  }

  70% {
    opacity: 1;
    transform: translateY(0) scale(1.1);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes tab-bounce {
  0% {
    transform: scale(1);
  }

  35% {
    transform: scale(0.84);
  }

  75% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

@media (max-width: 480px) {
  .nav-inner {
    padding-left: 4px;
    padding-right: 4px;
  }
}
</style>
