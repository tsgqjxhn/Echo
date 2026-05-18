<template>
  <section class="category-card" :class="{ filled, collapsed: !innerExpanded }" @click="toggle">
    <div class="category-card-header">
      <span class="category-card-icon">🏷️</span>
      <div class="category-card-meta">
        <span class="category-card-title">{{ title }}</span>
        <span class="category-card-status">{{ status }}</span>
      </div>
      <svg class="category-card-arrow" :class="{ expanded: innerExpanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div v-if="innerExpanded" class="category-card-body" @click.stop>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'CategoryCard' })

const props = withDefaults(defineProps<{
  expanded?: boolean
  title?: string
  status?: string
  filled?: boolean
}>(), {
  expanded: true,
  title: '分类卡',
  status: '未设置',
  filled: false,
})

const emit = defineEmits<{
  (event: 'update:expanded', value: boolean): void
}>()

const innerExpanded = computed({
  get: () => props.expanded,
  set: value => emit('update:expanded', value),
})

function toggle() {
  innerExpanded.value = !innerExpanded.value
}
</script>

<style scoped lang="scss">
.category-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid rgba(52, 211, 153, 0.16);
  background:
    linear-gradient(135deg, rgba(52, 211, 153, 0.10), rgba(56, 189, 248, 0.06)),
    rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &:active {
    transform: scale(0.99);
  }

  &.filled {
    border-color: rgba(52, 211, 153, 0.30);
  }

  &.collapsed {
    background: rgba(255, 255, 255, 0.035);
  }
}

.category-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 20px;
  flex-shrink: 0;
}

.category-card-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.category-card-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
}

.category-card-status {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.category-card-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  transition: transform 0.2s, color 0.2s;
  flex-shrink: 0;

  &.expanded {
    color: var(--text-secondary);
    transform: rotate(180deg);
  }
}

.category-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: default;
}
</style>
