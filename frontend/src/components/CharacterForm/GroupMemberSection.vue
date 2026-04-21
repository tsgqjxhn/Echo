<template>
  <section class="group-section">
    <h3 class="section-title">群聊设定</h3>

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
      <span class="members-label">群成员</span>
      <button type="button" class="add-btn" @click="addMember">+ 添加成员</button>
    </div>

    <div class="member-list">
      <div v-for="(member, idx) in members" :key="idx" class="member-item">
        <div class="member-header">
          <span class="member-index">{{ idx + 1 }}</span>
          <button type="button" class="remove-btn" @click="removeMember(idx)">&times;</button>
        </div>

        <div class="member-fields">
          <div class="field-item">
            <label class="field-label">名字</label>
            <input v-model="member.name" type="text" class="field-input" maxlength="20" placeholder="成员名字" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">性格</label>
            <textarea v-model="member.personality" class="field-textarea" maxlength="300" placeholder="例如：开朗、话多" @input="emitMembers"></textarea>
          </div>
          <div class="field-item">
            <label class="field-label">说话风格</label>
            <textarea v-model="member.speakingStyle" class="field-textarea" maxlength="300" placeholder="例如：喜欢用网络用语" @input="emitMembers"></textarea>
          </div>
        </div>
      </div>

      <div v-if="members.length === 0" class="empty-hint">
        点击上方"添加成员"按钮创建群成员
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
import { ref, watch } from 'vue'
import type { TemplateFieldDef } from '@/data/character-templates'
import type { GroupMember } from '@/types/character'
import { createEmptyGroupMember } from '@/data/character-templates'
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

const members = ref<GroupMember[]>(props.initialMembers?.length ? [...props.initialMembers] : [])

watch(() => props.initialMembers, (next) => {
  if (next && next.length > 0) members.value = [...next]
}, { deep: true })

function updateField(key: string, value: string | string[]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function addMember() {
  members.value.push(createEmptyGroupMember())
  emitMembers()
}

function removeMember(idx: number) {
  members.value.splice(idx, 1)
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

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.member-index {
  color: rgba(56, 189, 248, 0.5);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
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

.member-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
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
  margin-bottom: 2px;
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
