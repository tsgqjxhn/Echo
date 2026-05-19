<template>
  <section class="plot-card" :class="{ filled, collapsed: !expanded }" @click="expanded = !expanded">
    <div class="plot-card-header">
      <span class="plot-card-icon">🎬</span>
      <div class="plot-card-meta">
        <span class="plot-card-title">剧情卡</span>
      </div>
      <svg class="plot-card-arrow" :class="{ expanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div v-if="expanded" class="plot-card-body" @click.stop>
      <div class="plot-tier-tabs" role="tablist" aria-label="剧情卡设定层级">
        <button type="button" class="plot-tier-tab" :class="{ active: tier === 'basic' }" @click="tier = 'basic'">基础设定</button>
        <button type="button" class="plot-tier-tab" :class="{ active: tier === 'advanced' }" @click="tier = 'advanced'">高级设定</button>
      </div>

      <div v-if="showSubCategoryTabs && tier === 'basic'" class="plot-sub-tabs" role="tablist" aria-label="剧情子分类">
        <button
          v-for="tab in plotSubCategoryPanels"
          :key="tab.value"
          type="button"
          class="plot-sub-tab"
          :class="{ active: normalizedSubCategory === tab.value }"
          @click.stop="selectSubCategory(tab.value)"
        >
          <span class="plot-sub-tab-icon">{{ tab.icon }}</span>
          <span class="plot-sub-tab-copy">
            <span class="plot-sub-tab-title">{{ tab.label }}</span>
          </span>
        </button>
      </div>

      <div class="plot-section-list">
        <section
          v-for="section in visibleSections"
          :key="section.key"
          class="plot-section"
          :class="{ collapsed: !isSectionExpanded(section.key) }"
        >
          <button type="button" class="plot-section-head" @click="toggleSection(section.key)">
            <span class="plot-section-icon">{{ sectionIcon(section.key) }}</span>
            <span class="plot-section-title">{{ section.title }}</span>
            <svg class="plot-section-arrow" :class="{ expanded: isSectionExpanded(section.key) }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="isSectionExpanded(section.key)" class="plot-field-grid">
            <label
              v-for="field in section.fields"
              :key="field.path"
              class="plot-field"
              :class="{ 'plot-field--wide': field.wide || field.type === 'textarea' || field.type === 'checkbox' }"
            >
              <span class="plot-field-label">{{ field.label }}</span>

              <textarea
                v-if="field.type === 'textarea'"
                class="plot-textarea"
                :rows="field.rows || 2"
                :placeholder="field.placeholder"
                :value="stringValue(field.path)"
                @input="onTextInput(field.path, $event)"
              />

              <select
                v-else-if="field.type === 'select'"
                class="plot-input"
                :value="stringValue(field.path)"
                @change="onSelectInput(field.path, $event)"
              >
                <option v-for="option in field.options || []" :key="option" :value="option">{{ option }}</option>
              </select>

              <span v-else-if="field.type === 'checkbox'" class="plot-check-row">
                <input
                  type="checkbox"
                  :checked="booleanValue(field.path)"
                  @change="onBooleanInput(field.path, $event)"
                />
                <span>{{ booleanValue(field.path) ? '已开启' : '未开启' }}</span>
              </span>

              <input
                v-else
                class="plot-input"
                :type="field.type === 'number' ? 'number' : 'text'"
                :min="field.min"
                :max="field.max"
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
import type { PlotCardData, PlotSettingTier, PlotSubCategory } from '@/types/plot-card'
import { getPlotCardSections, normalizePlotSubCategory, plotTypeFromSubCategory, subCategoryFromPlotType } from '@/types/plot-card'

defineOptions({ name: 'PlotCard' })

const props = withDefaults(defineProps<{
  modelValue: PlotCardData
  subCategory: string
  filled?: boolean
  showSubCategoryTabs?: boolean
}>(), {
  filled: false,
  showSubCategoryTabs: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: PlotCardData): void
  (event: 'update:subCategory', value: PlotSubCategory): void
}>()

const tier = ref<PlotSettingTier>('basic')
const expanded = ref(false)
const sectionExpanded = reactive<Record<string, boolean>>({})

const plotSubCategoryPanels = [
  { value: '单线剧情' as PlotSubCategory, label: '单线剧情', icon: '🧵' },
  { value: '分支剧情' as PlotSubCategory, label: '多分支剧情', icon: '🌿' },
  { value: '开放剧情' as PlotSubCategory, label: '开放剧情', icon: '🗺️' },
]

const normalizedSubCategory = computed(() => normalizePlotSubCategory(props.subCategory))
const visibleSections = computed(() => getPlotCardSections(tier.value, normalizedSubCategory.value))

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
  }, props.modelValue)
}

function setValue(path: string, value: unknown) {
  const keys = path.split('.')
  const [head, ...tail] = keys
  const root = { ...props.modelValue } as Record<string, unknown>
  const current = { ...((root[head] as Record<string, unknown>) || {}) }
  let target = current

  for (let i = 0; i < tail.length - 1; i += 1) {
    const key = tail[i]
    target[key] = { ...((target[key] as Record<string, unknown>) || {}) }
    target = target[key] as Record<string, unknown>
  }

  target[tail[tail.length - 1]] = value
  root[head] = current
  const next = root as unknown as PlotCardData
  if (path === 'basic.plotType') {
    emit('update:subCategory', subCategoryFromPlotType(String(value || '')))
  }
  emit('update:modelValue', next)
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
  if (el instanceof HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
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

function selectSubCategory(value: PlotSubCategory) {
  setValue('basic.plotType', plotTypeFromSubCategory(value))
  emit('update:subCategory', value)
}

function sectionIcon(key: string): string {
  const icons: Record<string, string> = {
    core: '🎯',
    trigger: '⚡',
    single: '📍',
    branch: '🔀',
    open: '📚',
    narrative: '📝',
  }
  return icons[key] || '📋'
}
</script>

<style scoped lang="scss">
.plot-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background:
    linear-gradient(135deg, rgba(125, 211, 252, 0.10), rgba(52, 211, 153, 0.05)),
    rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &:active {
    transform: scale(0.99);
  }

  &.filled {
    border-color: rgba(125, 211, 252, 0.34);
  }

  &.collapsed {
    background: rgba(255, 255, 255, 0.035);
  }
}

.plot-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.plot-card-icon {
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

.plot-card-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.plot-card-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
}

.plot-card-arrow {
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

.plot-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: default;
}

.plot-tier-tabs,
.plot-sub-tabs {
  display: grid;
  gap: 8px;
}

.plot-tier-tabs {
  grid-template-columns: 1fr 1fr;
}

.plot-sub-tabs {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.plot-sub-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;

  &.active {
    border-color: rgba(125, 211, 252, 0.42);
    background: linear-gradient(135deg, rgba(125, 211, 252, 0.14), rgba(52, 211, 153, 0.08));
  }
}

.plot-sub-tab-icon,
.plot-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 16px;
  line-height: 1;
}

.plot-sub-tab-copy {
  display: flex;
  align-items: center;
  min-width: 0;
}

.plot-sub-tab-title {
  font-size: 13px;
  font-weight: 600;
}

.plot-tier-tab {
  min-height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: transparent;
    color: #fff;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.78));
    box-shadow: 0 6px 18px rgba(56, 189, 248, 0.18);
  }
}

.plot-section-list,
.plot-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plot-section {
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.025);
  overflow: hidden;
}

.plot-section-head {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  display: flex;
  align-items: center;
  text-align: left;
  gap: 8px;
  cursor: pointer;
}

.plot-section-title {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.plot-section-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.plot-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 12px 12px;
}

.plot-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--wide {
    grid-column: 1 / -1;
  }
}

.plot-field-label {
  color: var(--text-tertiary);
  font-size: 12px;
}

.plot-input,
.plot-textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, background 0.2s;

  &:focus {
    border-color: rgba(56, 189, 248, 0.36);
    background: rgba(255, 255, 255, 0.06);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }
}

.plot-input {
  min-height: 38px;
  padding: 0 10px;

  option {
    background: #0a1e2c;
    color: var(--text-primary);
  }
}

.plot-textarea {
  min-height: 72px;
  padding: 10px;
  line-height: 1.5;
  resize: none;
}

.plot-check-row {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;

  input {
    width: 16px;
    height: 16px;
    accent-color: #34d399;
  }
}

@media (max-width: 640px) {
  .plot-field-grid {
    grid-template-columns: 1fr;
  }

  .plot-sub-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
