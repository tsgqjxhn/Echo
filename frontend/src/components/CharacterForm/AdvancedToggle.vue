<template>
  <button type="button" class="advanced-toggle" @click="emit('update:modelValue', !modelValue)">
    <span class="toggle-label">{{ modelValue ? labelOn : labelOff }}</span>
    <span class="toggle-arrow" :class="{ open: modelValue }">&#9662;</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  labelOn?: string
  labelOff?: string
}>(), {
  labelOn: '收起高级设定',
  labelOff: '展开高级设定',
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style lang="scss" scoped>
.advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 6px 0;
  margin-top: 6px;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-top-color: rgba(56, 189, 248, 0.2);
  }
}

.toggle-label {
  color: var(--text-tertiary);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.toggle-arrow {
  color: var(--text-tertiary);
  font-size: 8px;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}
</style>
