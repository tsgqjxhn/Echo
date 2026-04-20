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
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.5 8.5h9a4.5 4.5 0 0 1 4.5 4.5v.5A4 4 0 0 1 17 17.5h-1.12l-1.1 1.52a1 1 0 0 1-1.62-.03l-1.05-1.49h-.22l-1.05 1.49a1 1 0 0 1-1.62.03l-1.1-1.52H7A4 4 0 0 1 3 13.5V13a4.5 4.5 0 0 1 4.5-4.5Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8.3 13h3.2M9.9 11.4v3.2"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
            <path
              d="M15.2 12.2h.01M17.2 14.2h.01"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
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
}>(), {
  modelValue: 'chat',
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
  background: #000;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 34px;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
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
  width: 26px;
  height: 26px;
  transform: translateY(-2px);
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
