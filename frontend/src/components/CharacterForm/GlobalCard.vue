<template>
  <section class="global-card" :class="{ filled, collapsed: !expanded }" @click="expanded = !expanded">
    <div class="global-card-header">
      <span class="global-card-icon">🌐</span>
      <div class="global-card-meta">
        <span class="global-card-title">全局卡</span>
      </div>
      <svg class="global-card-arrow" :class="{ expanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div v-if="expanded" class="global-card-body" @click.stop>
      <div class="global-tier-tabs" role="tablist" aria-label="全局卡设定层级">
        <button type="button" class="global-tier-tab" :class="{ active: tier === 'basic' }" @click="tier = 'basic'">基础设定</button>
        <button type="button" class="global-tier-tab" :class="{ active: tier === 'advanced' }" @click="tier = 'advanced'">高级设定</button>
      </div>

      <div class="global-section-list">
        <section
          v-for="section in visibleSections"
          :key="section.key"
          class="global-section"
          :class="{ collapsed: !isSectionExpanded(section.key) }"
        >
          <button type="button" class="global-section-head" @click="toggleSection(section.key)">
            <span class="global-section-icon">{{ section.icon }}</span>
            <span class="global-section-title">{{ section.title }}</span>
            <svg class="global-section-arrow" :class="{ expanded: isSectionExpanded(section.key) }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div v-if="isSectionExpanded(section.key)" class="global-field-grid">
            <label
              v-for="field in section.fields"
              :key="field.path"
              class="global-field"
              :class="{ 'global-field--wide': field.type === 'textarea' || field.type === 'checkbox' }"
            >
              <span class="global-field-label">{{ field.label }}</span>
              <textarea
                v-if="field.type === 'textarea'"
                class="global-textarea"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
                :value="stringValue(field.path)"
                @input="onTextInput(field.path, $event)"
              />
              <span v-else-if="field.type === 'checkbox'" class="global-check-row">
                <input type="checkbox" :checked="booleanValue(field.path)" @change="onBooleanInput(field.path, $event)" />
                <span>{{ booleanValue(field.path) ? '已开启旁白' : '未开启旁白' }}</span>
              </span>
              <input
                v-else
                class="global-input"
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
import type { GlobalCardData, GlobalSettingTier } from '@/types/global-card'
import { createEmptyGlobalCardData, getGlobalCardSections } from '@/types/global-card'

defineOptions({ name: 'GlobalCard' })

const props = withDefaults(defineProps<{
  modelValue?: GlobalCardData
  filled?: boolean
}>(), {
  filled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: GlobalCardData): void
}>()

const tier = ref<GlobalSettingTier>('basic')
const expanded = ref(false)
const sectionExpanded = reactive<Record<string, boolean>>({})

const cardData = computed({
  get: () => props.modelValue || createEmptyGlobalCardData(),
  set: value => emit('update:modelValue', value),
})

const visibleSections = computed(() => getGlobalCardSections(tier.value))

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
  emit('update:modelValue', root as unknown as GlobalCardData)
}

function stringValue(path: string): string {
  const value = getValue(path)
  return value === null || value === undefined ? '' : String(value)
}

function booleanValue(path: string): boolean {
  return Boolean(getValue(path))
}

function onTextInput(path: string, event: Event) {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement
  setValue(path, el.value)
}

function onBooleanInput(path: string, event: Event) {
  const el = event.target as HTMLInputElement
  setValue(path, el.checked)
}
</script>

<style scoped lang="scss">
.global-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background:
    linear-gradient(135deg, rgba(125, 211, 252, 0.10), rgba(52, 211, 153, 0.07)),
    rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &.filled {
    border-color: rgba(125, 211, 252, 0.36);
  }
}

.global-card-header,
.global-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.global-card-meta {
  flex: 1;
  min-width: 0;
}

.global-card-icon,
.global-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  line-height: 1;
}

.global-card-icon {
  width: 38px;
  height: 38px;
  font-size: 20px;
}

.global-card-title {
  font-size: 15px;
  font-weight: 600;
}

.global-card-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.global-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: default;
}

.global-tier-tabs {
  display: flex;
  gap: 8px;
}

.global-tier-tab {
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  cursor: pointer;

  &.active {
    color: var(--text-primary);
    border-color: rgba(125, 211, 252, 0.35);
    background: rgba(125, 211, 252, 0.12);
  }
}

.global-section-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.global-section {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.global-section-head {
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

.global-section-icon {
  width: 32px;
  height: 32px;
  font-size: 16px;
}

.global-section-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.global-section-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.global-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px 14px;
}

.global-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--wide {
    grid-column: 1 / -1;
  }
}

.global-field-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.global-input,
.global-textarea {
  width: 100%;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
  padding: 8px 10px;
  font: inherit;
}

.global-textarea {
  resize: vertical;
  min-height: 64px;
}

.global-check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  color: var(--text-secondary);
}

@media (max-width: 720px) {
  .global-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
