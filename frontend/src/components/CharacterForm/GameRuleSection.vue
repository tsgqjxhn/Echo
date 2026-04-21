<template>
  <section class="game-section">
    <h3 class="section-title">游戏规则与玩法</h3>
    <div class="field-grid" :class="{ dual: fields.length > 1 }">
      <TemplateFieldRenderer
        v-for="field in fields"
        :key="field.key"
        :field="field"
        :model-value="modelValue[field.key] ?? ''"
        @update:model-value="updateField(field.key, $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TemplateFieldDef } from '@/data/character-templates'
import TemplateFieldRenderer from './TemplateFieldRenderer.vue'

const props = defineProps<{
  fields: TemplateFieldDef[]
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

function updateField(key: string, value: string | string[]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style lang="scss" scoped>
.section-title {
  margin: 0 0 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  &.dual {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 720px) {
  .field-grid.dual {
    grid-template-columns: 1fr;
  }
}
</style>
