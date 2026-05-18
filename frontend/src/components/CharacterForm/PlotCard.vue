<template>
  <section class="plot-card" :class="{ filled, collapsed: !expanded }" @click="expanded = !expanded">
    <div class="plot-card-header">
      <span class="plot-card-icon">🎬</span>
      <div class="plot-card-meta">
        <span class="plot-card-title">剧情卡</span>
        <span class="plot-card-status">{{ statusText }}</span>
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

      <div v-if="showSubCategoryTabs" class="plot-sub-tabs" role="tablist" aria-label="剧情子分类">
        <button
          v-for="tab in PLOT_SUBCATEGORY_TABS"
          :key="tab.value"
          type="button"
          class="plot-sub-tab"
          :class="{ active: normalizedSubCategory === tab.value }"
          @click="selectSubCategory(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="plot-section-list">
        <section v-for="section in visibleSections" :key="section.key" class="plot-section">
          <div class="plot-section-head">
            <span class="plot-section-title">{{ section.title }}</span>
            <span class="plot-section-scope">{{ section.scope === 'common' ? '公共' : '子类特有' }}</span>
          </div>
          <div class="plot-field-grid">
            <label
              v-for="field in section.fields"
              :key="field.path"
              class="plot-field"
              :class="{ 'plot-field--wide': field.type === 'textarea' || field.type === 'checkbox' }"
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
import { computed, ref } from 'vue'
import type { PlotCardData, PlotSettingTier, PlotSubCategory } from '@/types/plot-card'
import { getPlotCardSections, normalizePlotSubCategory, plotTypeFromSubCategory, PLOT_SUBCATEGORY_TABS, subCategoryFromPlotType } from '@/types/plot-card'

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
const expanded = ref(true)

const normalizedSubCategory = computed(() => normalizePlotSubCategory(props.subCategory))
const visibleSections = computed(() => getPlotCardSections(tier.value, normalizedSubCategory.value))
const statusText = computed(() => {
  const tierText = tier.value === 'basic' ? '基础设定' : '高级设定'
  if (!props.showSubCategoryTabs) return tierText
  const typeText = plotTypeFromSubCategory(normalizedSubCategory.value)
  return `${typeText} · ${tierText}`
})

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
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.plot-card-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
}

.plot-card-status {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
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

.plot-tier-tab,
.plot-sub-tab {
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
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.025);
}

.plot-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plot-section-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.plot-section-scope {
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.plot-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
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
