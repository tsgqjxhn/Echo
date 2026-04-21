<template>
  <div class="field-item">
    <label class="field-label">{{ field.label }}</label>

    <input
      v-if="field.type === 'text'"
      v-model="localValue"
      type="text"
      class="field-input"
      :maxlength="field.maxLength"
      :placeholder="field.placeholder"
    />

    <textarea
      v-else-if="field.type === 'textarea'"
      v-model="localValue"
      class="field-textarea"
      :maxlength="field.maxLength"
      :placeholder="field.placeholder"
      @focus="onTextareaFocus"
      @blur="onTextareaBlur"
    />

    <select v-else-if="field.type === 'select'" v-model="localValue" class="field-select">
      <option value="" disabled>-- 请选择 --</option>
      <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
    </select>

    <div v-else-if="field.type === 'chip-select'" class="chip-row">
      <button
        v-for="opt in field.options"
        :key="opt"
        type="button"
        class="chip"
        :class="{ active: selectedChips.includes(opt) }"
        @click="toggleChip(opt)"
      >
        {{ opt }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TemplateFieldDef } from '@/data/character-templates'

const props = defineProps<{
  field: TemplateFieldDef
  modelValue: unknown
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

const textareaFocused = ref(false)

const localValue = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : ''),
  set: (v: string) => emit('update:modelValue', v),
})

const selectedChips = computed<string[]>({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue : []),
  set: (v: string[]) => emit('update:modelValue', v),
})

function toggleChip(opt: string) {
  const current = selectedChips.value
  const next = current.includes(opt)
    ? current.filter(c => c !== opt)
    : [...current, opt]
  selectedChips.value = next
}

function onTextareaFocus() { textareaFocused.value = true }
function onTextareaBlur() { textareaFocused.value = false }
</script>

<style lang="scss" scoped>
.field-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-label {
  display: block;
  padding: 0 2px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 4px;
}

.field-input,
.field-select {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}

.field-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 16px;
}

.field-textarea {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  resize: none;
  overflow: hidden;
  min-height: 1.4em;
  max-height: 6em;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  &:focus {
    border-bottom-color: rgba(56, 189, 248, 0.4);
  }
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}

.chip {
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 6px;
  background: rgba(52, 211, 153, 0.04);
  color: var(--text-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(52, 211, 153, 0.08);
    color: var(--text-secondary);
  }

  &.active {
    background: rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.3);
    color: #7dd3fc;
  }
}
</style>
