<template>
  <section class="item-attribute-card" :class="{ filled, collapsed: !expanded }" @click="expanded = !expanded">
    <div class="item-attribute-card-header">
      <span class="item-attribute-card-icon">🎒</span>
      <div class="item-attribute-card-meta">
        <span class="item-attribute-card-title">物品/属性卡</span>
      </div>
      <svg class="item-attribute-card-arrow" :class="{ expanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div v-if="expanded" class="item-attribute-card-body" @click.stop>
      <div class="item-attribute-tier-tabs" role="tablist" aria-label="物品属性卡设定层级">
        <button type="button" class="item-attribute-tier-tab" :class="{ active: tier === 'basic' }" @click="tier = 'basic'">基础设定（物品）</button>
        <button type="button" class="item-attribute-tier-tab" :class="{ active: tier === 'advanced' }" @click="tier = 'advanced'">高级设定（属性）</button>
      </div>

      <div class="item-attribute-section-list">
        <section
          v-for="section in visibleSections"
          :key="section.key"
          class="item-attribute-section"
          :class="{ collapsed: !isSectionExpanded(section.key) }"
        >
          <button type="button" class="item-attribute-section-head" @click="toggleSection(section.key)">
            <span class="item-attribute-section-icon">{{ section.icon }}</span>
            <span class="item-attribute-section-title">{{ section.title }}</span>
            <svg class="item-attribute-section-arrow" :class="{ expanded: isSectionExpanded(section.key) }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div v-if="isSectionExpanded(section.key)" class="item-attribute-field-grid">
            <label
              v-for="field in section.fields"
              :key="field.path"
              class="item-attribute-field"
              :class="{ 'item-attribute-field--wide': field.type === 'textarea' }"
            >
              <span class="item-attribute-field-label">{{ field.label }}</span>
              <textarea
                v-if="field.type === 'textarea'"
                class="item-attribute-textarea"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
                :value="stringValue(field.path)"
                @input="onTextInput(field.path, $event)"
              />
              <select
                v-else-if="field.type === 'select'"
                class="item-attribute-input"
                :value="stringValue(field.path)"
                @change="onSelectInput(field.path, $event)"
              >
                <option v-for="option in field.options || []" :key="option" :value="option">
                  {{ option || '请选择' }}
                </option>
              </select>
              <input
                v-else
                class="item-attribute-input"
                type="text"
                :placeholder="field.placeholder"
                :value="stringValue(field.path)"
                @input="onTextInput(field.path, $event)"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ItemAttributeCardData, ItemAttributeSettingTier } from '@/types/item-attribute-card'
import { createEmptyItemAttributeCardData, getItemAttributeCardSections } from '@/types/item-attribute-card'

defineOptions({ name: 'ItemAttributeCard' })

const props = withDefaults(defineProps<{
  modelValue?: ItemAttributeCardData
  filled?: boolean
}>(), {
  filled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: ItemAttributeCardData): void
}>()

const tier = ref<ItemAttributeSettingTier>('basic')
const expanded = ref(false)
const sectionExpanded = reactive<Record<string, boolean>>({})

const cardData = computed({
  get: () => props.modelValue || createEmptyItemAttributeCardData(),
  set: value => emit('update:modelValue', value),
})

const visibleSections = computed(() => getItemAttributeCardSections(tier.value))

function isSectionExpanded(key: string): boolean {
  return sectionExpanded[key] ?? false
}

function toggleSection(key: string) {
  sectionExpanded[key] = !isSectionExpanded(key)
}

function getValue(path: string): unknown {
  return path.split('.').reduce<unknown>((target, key) => {
    if (!target || typeof target !== 'object') return undefined
    return (target as Record<string, unknown>)[key]
  }, cardData.value)
}

function setValue(path: string, value: unknown) {
  const keys = path.split('.')
  const [head, ...tail] = keys
  const root = { ...cardData.value } as Record<string, unknown>
  const current = { ...((root[head] as Record<string, unknown>) || {}) }
  let target = current

  for (let i = 0; i < tail.length - 1; i += 1) {
    const key = tail[i]
    target[key] = { ...((target[key] as Record<string, unknown>) || {}) }
    target = target[key] as Record<string, unknown>
  }

  target[tail[tail.length - 1]] = value
  root[head] = current
  emit('update:modelValue', root as unknown as ItemAttributeCardData)
}

function stringValue(path: string): string {
  const value = getValue(path)
  return value === null || value === undefined ? '' : String(value)
}

function onTextInput(path: string, event: Event) {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement
  setValue(path, el.value)
}

function onSelectInput(path: string, event: Event) {
  const el = event.target as HTMLSelectElement
  setValue(path, el.value)
}
</script>

<style scoped lang="scss">
.item-attribute-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(52, 211, 153, 0.18);
  background:
    linear-gradient(135deg, rgba(52, 211, 153, 0.10), rgba(125, 211, 252, 0.06)),
    rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &.filled {
    border-color: rgba(52, 211, 153, 0.34);
  }
}

.item-attribute-card-header,
.item-attribute-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-attribute-card-meta {
  flex: 1;
  min-width: 0;
  align-items: center;
}

.item-attribute-card-icon,
.item-attribute-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  line-height: 1;
}

.item-attribute-card-icon {
  width: 38px;
  height: 38px;
  font-size: 20px;
}

.item-attribute-card-title {
  font-size: 15px;
  font-weight: 600;
}

.item-attribute-card-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.item-attribute-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-attribute-tier-tabs {
  display: flex;
  gap: 8px;
}

.item-attribute-tier-tab {
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  cursor: pointer;

  &.active {
    color: var(--text-primary);
    border-color: rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.12);
  }
}

.item-attribute-section-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-attribute-section {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.item-attribute-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.item-attribute-section-icon {
  width: 32px;
  height: 32px;
  font-size: 16px;
}

.item-attribute-section-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.item-attribute-section-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.item-attribute-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px 14px;
}

.item-attribute-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--wide {
    grid-column: 1 / -1;
  }
}

.item-attribute-field-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.item-attribute-input,
.item-attribute-textarea {
  width: 100%;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
  padding: 8px 10px;
  font: inherit;
}

.item-attribute-textarea {
  resize: vertical;
  min-height: 64px;
}

@media (max-width: 720px) {
  .item-attribute-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
