<template>
  <section class="game-card" :class="{ filled, collapsed: !expanded }" @click="expanded = !expanded">
    <div class="game-card-header">
      <span class="game-card-icon">🎮</span>
      <div class="game-card-meta">
        <span class="game-card-title">游戏卡</span>
      </div>
      <svg class="game-card-arrow" :class="{ expanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div v-if="expanded" class="game-card-body" @click.stop>
      <div class="game-tier-tabs" role="tablist" aria-label="游戏卡设定层级">
        <button type="button" class="game-tier-tab" :class="{ active: tier === 'basic' }" @click="tier = 'basic'">基础设定</button>
        <button type="button" class="game-tier-tab" :class="{ active: tier === 'advanced' }" @click="tier = 'advanced'">高级设定</button>
      </div>

      <div class="game-section-list">
        <section
          v-for="section in visibleSections"
          :key="section.key"
          class="game-section"
          :class="{ collapsed: !isSectionExpanded(section.key) }"
        >
          <button type="button" class="game-section-head" @click="toggleSection(section.key)">
            <span class="game-section-icon">{{ section.icon }}</span>
            <span class="game-section-title">{{ section.title }}</span>
            <svg class="game-section-arrow" :class="{ expanded: isSectionExpanded(section.key) }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="isSectionExpanded(section.key)" class="game-field-grid">
            <label
              v-for="field in section.fields"
              :key="field.path"
              class="game-field"
              :class="{ 'game-field--wide': field.type === 'textarea' || field.type === 'checkbox' }"
            >
              <span class="game-field-label">{{ field.label }}</span>
              <textarea
                v-if="field.type === 'textarea'"
                class="game-textarea"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
                :value="stringValue(field.path)"
                @input="onTextInput(field.path, $event)"
              />
              <select
                v-else-if="field.type === 'select'"
                class="game-input"
                :value="stringValue(field.path)"
                @change="onSelectInput(field.path, $event)"
              >
                <option v-for="option in field.options || []" :key="option" :value="option">
                  {{ formatOption(field.path, option) }}
                </option>
              </select>
              <span v-else-if="field.type === 'checkbox'" class="game-check-row">
                <input type="checkbox" :checked="booleanValue(field.path)" @change="onBooleanInput(field.path, $event)" />
                <span>{{ booleanValue(field.path) ? '已开启' : '未开启' }}</span>
              </span>
              <input
                v-else
                class="game-input"
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
import type { GameCardData, GameSettingTier } from '@/types/game-card'
import { createEmptyGameCardData, getGameCardSections, triggerTypeLabel } from '@/types/game-card'

defineOptions({ name: 'GameCard' })

const props = withDefaults(defineProps<{
  modelValue?: GameCardData
  filled?: boolean
}>(), {
  filled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: GameCardData): void
}>()

const tier = ref<GameSettingTier>('basic')
const expanded = ref(false)
const sectionExpanded = reactive<Record<string, boolean>>({})

const cardData = computed({
  get: () => props.modelValue || createEmptyGameCardData(),
  set: value => emit('update:modelValue', value),
})

const visibleSections = computed(() => getGameCardSections(tier.value))

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
  emit('update:modelValue', root as unknown as GameCardData)
}

function stringValue(path: string): string {
  const value = getValue(path)
  return value === null || value === undefined ? '' : String(value)
}

function booleanValue(path: string): boolean {
  return Boolean(getValue(path))
}

function formatOption(path: string, option: string): string {
  if (!option) return '请选择'
  if (path === 'basic.initializationTriggerType') return triggerTypeLabel(option as 'embedded' | 'external')
  return option
}

function onTextInput(path: string, event: Event) {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement
  setValue(path, el.value)
}

function onSelectInput(path: string, event: Event) {
  const el = event.target as HTMLSelectElement
  setValue(path, el.value)
}

function onBooleanInput(path: string, event: Event) {
  const el = event.target as HTMLInputElement
  setValue(path, el.checked)
}
</script>

<style scoped lang="scss">
.game-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.18);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(52, 211, 153, 0.06)),
    rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &.filled {
    border-color: rgba(251, 191, 36, 0.34);
  }
}

.game-card-header,
.game-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-card-meta {
  flex: 1;
  min-width: 0;
  align-items: center;
}

.game-card-icon,
.game-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  line-height: 1;
}

.game-card-icon {
  width: 38px;
  height: 38px;
  font-size: 20px;
}

.game-card-title {
  font-size: 15px;
  font-weight: 600;
}

.game-card-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.game-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.game-tier-tabs {
  display: flex;
  gap: 8px;
}

.game-tier-tab {
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  cursor: pointer;

  &.active {
    color: var(--text-primary);
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.12);
  }
}

.game-section-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-section {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.game-section-head {
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

.game-section-icon {
  width: 32px;
  height: 32px;
  font-size: 16px;
}

.game-section-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.game-section-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.game-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px 14px;
}

.game-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--wide {
    grid-column: 1 / -1;
  }
}

.game-field-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.game-input,
.game-textarea {
  width: 100%;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
  padding: 8px 10px;
  font: inherit;
}

.game-textarea {
  resize: vertical;
  min-height: 64px;
}

.game-check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
}

@media (max-width: 720px) {
  .game-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
