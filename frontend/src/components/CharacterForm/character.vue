<template>
  <div class="character">
    <slot name="top" />

    <CategoryCard
      v-model:expanded="categoryExpanded"
      :filled="hasClassificationTags"
      :status="hasClassificationTags ? '已设置' : '未设置'"
    >
      <slot name="classification" />
    </CategoryCard>

    <section class="config-grid" :class="{ 'free-character-mode': isFreeDialogueCategory }">
      <section class="role-card" :class="{ filled: hasRoleContent, collapsed: !roleExpanded }" @click="roleExpanded = !roleExpanded">
        <div class="role-card-head">
          <span class="role-create-icon">🧩</span>
          <div class="role-create-copy">
            <span class="role-create-title">角色卡</span>
            <span class="role-create-desc">基础设定与高级设定集中配置</span>
          </div>
          <span class="role-card-status">{{ roleStatus }}</span>
          <svg class="role-card-arrow" :class="{ expanded: roleExpanded }" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <div v-if="roleExpanded" class="role-card-body" @click.stop>
          <div class="role-tier-tabs" role="tablist" aria-label="角色创建设定层级">
            <button type="button" class="role-tier-tab" :class="{ active: tier === 'basic' }" @click.stop="emit('update:tier', 'basic')">基础设定</button>
            <button type="button" class="role-tier-tab" :class="{ active: tier === 'advanced' }" @click.stop="emit('update:tier', 'advanced')">高级设定</button>
          </div>

          <template v-if="!isFreeDialogueCategory">
            <slot name="basic" />
            <slot name="advanced" />
          </template>
          <slot v-else-if="tier === 'basic'" name="basic" />
          <slot v-else name="advanced" />
        </div>
      </section>

      <slot name="plot" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CategoryCard from './CategoryCard.vue'

defineOptions({ name: 'character' })

type CharacterSettingTier = 'basic' | 'advanced'

const props = defineProps<{
  tier: CharacterSettingTier
  isFreeDialogueCategory: boolean
  hasClassificationTags: boolean
  hasRoleContent: boolean
}>()

const emit = defineEmits<{
  (event: 'update:tier', value: CharacterSettingTier): void
}>()

const categoryExpanded = ref(true)
const roleExpanded = ref(true)
const roleStatus = computed(() => {
  const tierText = props.tier === 'basic' ? '基础设定' : '高级设定'
  return props.hasRoleContent ? `已填写 · ${tierText}` : `未填写 · ${tierText}`
})
</script>

<style scoped lang="scss">
.character {
  display: flex;
  flex-direction: column;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.role-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.20);
  background:
    linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(52, 211, 153, 0.10)),
    rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;

  &:active {
    transform: scale(0.99);
  }

  &.filled {
    border-color: rgba(56, 189, 248, 0.34);
  }

  &.collapsed {
    background: rgba(255, 255, 255, 0.035);
  }
}

.role-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-create-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.10);
  font-size: 22px;
  flex-shrink: 0;
}

.role-create-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.role-create-title {
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 700;
}

.role-create-desc {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.role-card-status {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.role-card-arrow {
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

.role-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: default;
}

.role-tier-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.role-tier-tab {
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: transparent;
    color: #fff;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(52, 211, 153, 0.78));
    box-shadow: 0 6px 18px rgba(56, 189, 248, 0.20);
  }
}

.free-character-mode {
  gap: 10px;

  :deep(.config-card) {
    min-height: auto;
    cursor: default;
    border-color: rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.025);
    box-shadow: none;

    &:active {
      transform: none;
    }
  }

  :deep(.card-header) {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  :deep(.card-emoji) {
    font-size: 20px;
  }

  :deep(.card-meta) {
    flex: 1;
    min-width: 0;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  :deep(.card-title) {
    font-size: 14px;
  }

  :deep(.card-status) {
    white-space: nowrap;
  }

  :deep(.card-body) {
    margin-top: 12px;
    padding-top: 12px;
  }
}
</style>
