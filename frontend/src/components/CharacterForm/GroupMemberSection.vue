<template>
  <section class="group-section">
    <h3 class="section-title">群成员配置</h3>

    <div class="group-meta">
      <TemplateFieldRenderer
        v-for="field in metaFields"
        :key="field.key"
        :field="field"
        :model-value="modelValue[field.key] ?? ''"
        @update:model-value="updateField(field.key, $event)"
      />
    </div>

    <div class="members-header">
      <span class="members-label">成员列表（{{ members.length }} 人）</span>
      <div class="members-actions">
        <button v-if="!hasNarrator" type="button" class="add-btn narrator-btn" @click="addNarrator">+ 添加旁白</button>
        <button type="button" class="add-btn" @click="addMember">+ 添加成员</button>
      </div>
    </div>

    <div class="member-list">
      <div v-for="(member, idx) in members" :key="member.id" class="member-item" :class="{ narrator: member.isNarrator }">
        <div class="member-header">
          <div class="member-title">
            <span class="member-index">{{ idx + 1 }}</span>
            <span class="member-name-tag">{{ member.name || (member.isNarrator ? '旁白' : '未命名') }}</span>
            <span v-if="member.isNarrator" class="narrator-badge">旁白</span>
          </div>
          <button type="button" class="remove-btn" @click="removeMember(idx)">&times;</button>
        </div>

        <!-- 简单/深度配置切换 -->
        <div v-if="!member.isNarrator" class="config-mode-toggle">
          <button type="button" class="mode-btn" :class="{ active: member.configMode !== 'deep' }" @click="setConfigMode(idx, 'simple')">简单</button>
          <button type="button" class="mode-btn" :class="{ active: member.configMode === 'deep' }" @click="setConfigMode(idx, 'deep')">深度</button>
        </div>

        <!-- 简单配置 -->
        <div v-if="member.configMode !== 'deep' || member.isNarrator" class="member-fields simple">
          <div class="field-item">
            <label class="field-label">名字</label>
            <input v-model="member.name" type="text" class="field-input" maxlength="20" placeholder="成员名字" @input="emitMembers" />
          </div>
          <div v-if="!member.isNarrator" class="field-item">
            <label class="field-label">性格标签</label>
            <input v-model="member.personality" type="text" class="field-input" maxlength="100" placeholder="例如：开朗、傲娇、冷静" @input="emitMembers" />
          </div>
          <div v-if="!member.isNarrator" class="field-item">
            <label class="field-label">一句话描述</label>
            <input v-model="member.description" type="text" class="field-input" maxlength="200" placeholder="例如：喜欢捉弄人的毒舌学姐" @input="emitMembers" />
          </div>
          <div v-if="member.isNarrator" class="field-item">
            <label class="field-label">旁白风格</label>
            <input v-model="member.speakingStyle" type="text" class="field-input" maxlength="200" placeholder="例如：冷静客观、富有诗意" @input="emitMembers" />
          </div>
        </div>

        <!-- 深度配置 -->
        <div v-else class="member-fields deep">
          <div class="field-item">
            <label class="field-label">名字</label>
            <input v-model="member.name" type="text" class="field-input" maxlength="20" placeholder="成员名字" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">性格</label>
            <textarea v-model="member.personality" class="field-textarea" maxlength="500" placeholder="详细描述角色的性格特征、行为模式和心理状态" @input="emitMembers"></textarea>
          </div>
          <div class="field-item">
            <label class="field-label">说话风格</label>
            <textarea v-model="member.speakingStyle" class="field-textarea" maxlength="500" placeholder="例如：喜欢用网络用语、说话简洁、爱用反问句" @input="emitMembers"></textarea>
          </div>
          <div class="field-item">
            <label class="field-label">角色设定</label>
            <textarea v-model="member.settings" class="field-textarea" maxlength="2000" placeholder="完整的角色设定，包括背景故事、动机、人际关系等" @input="emitMembers"></textarea>
          </div>
        </div>
      </div>

      <div v-if="members.length === 0" class="empty-hint">
        点击上方"添加成员"按钮创建群成员，建议至少添加 2-3 个角色
      </div>
    </div>

    <div v-if="advancedFields.length > 0" class="advanced-fields">
      <TemplateFieldRenderer
        v-for="field in advancedFields"
        :key="field.key"
        :field="field"
        :model-value="modelValue[field.key] ?? ''"
        @update:model-value="updateField(field.key, $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TemplateFieldDef } from '@/data/character-templates'
import type { GroupMember } from '@/types/character'
import { createEmptyGroupMember, createNarratorMember } from '@/data/character-templates'
import TemplateFieldRenderer from './TemplateFieldRenderer.vue'

const props = defineProps<{
  metaFields: TemplateFieldDef[]
  advancedFields: TemplateFieldDef[]
  modelValue: Record<string, unknown>
  initialMembers?: GroupMember[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'update:members': [value: GroupMember[]]
}>()

const members = ref<GroupMember[]>(props.initialMembers?.length ? [...props.initialMembers] : [createNarratorMember(), createEmptyGroupMember()])

watch(() => props.initialMembers, (next) => {
  if (next && next.length > 0) members.value = [...next]
}, { deep: true })

const hasNarrator = computed(() => members.value.some(m => m.isNarrator))

function updateField(key: string, value: string | string[]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function addMember() {
  members.value.push(createEmptyGroupMember())
  emitMembers()
}

function addNarrator() {
  members.value.unshift(createNarratorMember())
  emitMembers()
}

function removeMember(idx: number) {
  members.value.splice(idx, 1)
  emitMembers()
}

function setConfigMode(idx: number, mode: 'simple' | 'deep') {
  members.value[idx].configMode = mode
  emitMembers()
}

function emitMembers() {
  emit('update:members', [...members.value])
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

.group-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.members-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.members-label {
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.members-actions {
  display: flex;
  gap: 6px;
}

.add-btn {
  padding: 3px 10px;
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 4px;
  background: transparent;
  color: rgba(56, 189, 248, 0.6);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(56, 189, 248, 0.35);
    color: #7dd3fc;
  }
}

.narrator-btn {
  border-color: rgba(52, 211, 153, 0.2);
  color: rgba(52, 211, 153, 0.6);

  &:hover {
    border-color: rgba(52, 211, 153, 0.4);
    color: #6ee7b7;
  }
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s;

  &.narrator {
    border-color: rgba(52, 211, 153, 0.12);
    background: rgba(52, 211, 153, 0.03);
  }
}

.member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.member-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-index {
  color: rgba(56, 189, 248, 0.5);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.member-name-tag {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.narrator-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.15);
  color: rgba(52, 211, 153, 0.8);
  font-size: 10px;
}

.remove-btn {
  padding: 0 6px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: #f87171;
  }
}

.config-mode-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
  width: fit-content;
}

.mode-btn {
  padding: 3px 10px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
  }

  &.active {
    background: rgba(56, 189, 248, 0.15);
    color: #7dd3fc;
  }

  & + .mode-btn {
    border-left: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.member-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;

  &.deep {
    gap: 8px;
  }
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.field-label {
  display: block;
  padding: 0 2px;
  color: var(--text-tertiary);
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: 3px;
}

.field-input {
  width: 100%;
  padding: 5px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.3;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder { color: rgba(255, 255, 255, 0.14); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.35); }
}

.field-textarea {
  width: 100%;
  padding: 5px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.3;
  box-sizing: border-box;
  outline: none;
  resize: none;
  overflow: hidden;
  min-height: 1.3em;
  max-height: 5em;
  transition: border-color 0.2s;

  &::placeholder { color: rgba(255, 255, 255, 0.14); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.35); }
}

.empty-hint {
  padding: 12px 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 11px;
}

.advanced-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 720px) {
  .group-meta {
    grid-template-columns: 1fr;
  }
}
</style>
