<template>
  <div class="multi-char-field">
    <!-- Mode selector -->
    <select v-model="mode" class="mode-select">
      <option value="simple">简洁输入模式</option>
      <option value="sequential">单角色依次创建模式</option>
    </select>

    <!-- Simple mode: textarea -->
    <div v-if="mode === 'simple'" class="textarea-wrapper">
      <textarea
        v-model="simpleText"
        class="field-textarea"
        :maxlength="maxLength"
        :placeholder="simplePlaceholder"
      />
    </div>

    <!-- Sequential mode: character cards -->
    <div v-else class="sequential-mode">
      <div
        v-for="(card, idx) in cards"
        :key="idx"
        class="character-card"
      >
        <div class="card-header" @click="toggleCard(idx)">
          <span class="card-title">{{ card.name || `角色 ${idx + 1}` }}</span>
          <div class="card-actions">
            <button
              type="button"
              class="card-btn remove-btn"
              @click.stop="removeCard(idx)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
            </button>
            <svg
              class="chevron"
              :class="{ expanded: expandedCards.has(idx) }"
              viewBox="0 0 24 24"
              width="16"
              height="16"
            >
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <div v-if="expandedCards.has(idx)" class="card-body">
          <div class="card-field">
            <label class="card-field-label">姓名</label>
            <input v-model="card.name" type="text" class="card-input" placeholder="角色名称" />
          </div>
          <div class="card-field">
            <label class="card-field-label">性格</label>
            <textarea v-model="card.personality" class="card-textarea" placeholder="如：活泼开朗、沉稳理性" rows="2" />
          </div>
          <div class="card-field">
            <label class="card-field-label">身份</label>
            <input v-model="card.identity" type="text" class="card-input" placeholder="如：大学生、公司职员" />
          </div>
          <div class="card-field">
            <label class="card-field-label">说话风格</label>
            <textarea v-model="card.speakingStyle" class="card-textarea" placeholder="如：爱用感叹号、喜欢反问句" rows="2" />
          </div>

          <!-- TTS -->
          <div class="card-field">
            <label class="card-field-label">TTS音色</label>
            <div class="card-row">
              <input v-model="card.ttsVoice" type="text" class="card-input" placeholder="音色名称，如 alloy、shimmer" />
              <div class="weight-group">
                <label class="card-field-label">权重%</label>
                <input v-model.number="card.ttsWeight" type="number" class="card-input weight-input" min="0" max="100" placeholder="100" />
              </div>
            </div>
          </div>

          <!-- Expandable media settings per card -->
          <div class="card-media-toggle" @click="toggleMedia(idx)">
            <span class="card-field-label">角色媒体设定</span>
            <svg class="chevron small" :class="{ expanded: expandedMedia.has(idx) }" viewBox="0 0 24 24" width="12" height="12">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <div v-if="expandedMedia.has(idx)" class="card-media-body">
            <div class="card-field">
              <label class="card-field-label">角色聊天背景</label>
              <div class="card-row">
                <button type="button" class="card-upload-btn" @click="uploadCardMedia(idx, 'chatBackground')">上传</button>
                <button v-if="card.chatBackground" type="button" class="card-upload-btn remove" @click="card.chatBackground = ''">移除</button>
              </div>
              <div v-if="card.chatBackground" class="card-media-preview"><img :src="card.chatBackground" /></div>
            </div>
            <div class="card-field">
              <label class="card-field-label">角色情感动图</label>
              <button type="button" class="card-upload-btn" @click="addCardEmotion(idx)">
                <svg viewBox="0 0 24 24" width="10" height="10"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
                添加情感
              </button>
              <div v-for="(ea, ei) in card.emotionAnimations" :key="ei" class="card-emotion-row">
                <input v-model="ea.emotion" type="text" class="card-input" placeholder="触发情感状态" />
                <div class="card-row">
                  <button type="button" class="card-upload-btn" @click="uploadCardEmotion(idx, ei)">上传</button>
                  <button type="button" class="card-upload-btn remove" @click="card.emotionAnimations.splice(ei, 1)">
                    <svg viewBox="0 0 24 24" width="10" height="10"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
                  </button>
                </div>
                <div v-if="ea.animationUrl" class="card-media-preview small"><img :src="ea.animationUrl" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" class="add-card-btn" @click="addCard">
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
        <span>添加角色</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { uni } from '@/utils/uni-polyfill'

interface EmotionAnim { emotion: string; animationUrl: string }
interface CharacterCard {
  name: string
  personality: string
  identity: string
  speakingStyle: string
  ttsVoice: string
  ttsWeight: number
  chatBackground: string
  emotionAnimations: EmotionAnim[]
}

const props = defineProps<{
  modelValue: unknown
  maxLength?: number
  simplePlaceholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const mode = ref<'simple' | 'sequential'>('simple')
const expandedCards = ref(new Set<number>())
const expandedMedia = ref(new Set<number>())

function emptyCard(): CharacterCard {
  return { name: '', personality: '', identity: '', speakingStyle: '', ttsVoice: '', ttsWeight: 100, chatBackground: '', emotionAnimations: [] }
}

const cards = ref<CharacterCard[]>([])

const simpleText = computed({
  get: () => {
    if (mode.value !== 'simple') return ''
    return typeof props.modelValue === 'string' ? props.modelValue : ''
  },
  set: (v: string) => {
    emit('update:modelValue', v)
  },
})

watch(cards, (newCards) => {
  if (mode.value !== 'sequential') return
  const lines = newCards
    .filter(c => c.name.trim())
    .map(c => {
      const parts = [c.name]
      if (c.identity.trim()) parts.push(c.identity)
      if (c.personality.trim()) parts.push(c.personality)
      if (c.speakingStyle.trim()) parts.push(`说话风格：${c.speakingStyle}`)
      if (c.ttsVoice.trim()) parts.push(`TTS音色：${c.ttsVoice}${c.ttsWeight !== 100 ? `(${c.ttsWeight}%)` : ''}`)
      if (c.chatBackground) parts.push('[已配置聊天背景]')
      if (c.emotionAnimations.length) parts.push(`[情感动图×${c.emotionAnimations.length}]`)
      return parts.join('——')
    })
  emit('update:modelValue', lines.join('\n'))
}, { deep: true })

watch(mode, (newMode) => {
  if (newMode === 'sequential') {
    if (cards.value.length === 0) {
      cards.value = [emptyCard()]
      expandedCards.value = new Set([0])
    }
  }
})

function addCard() {
  cards.value = [...cards.value, emptyCard()]
  const newIdx = cards.value.length - 1
  expandedCards.value = new Set([...expandedCards.value, newIdx])
}

function removeCard(idx: number) {
  const next = [...cards.value]
  next.splice(idx, 1)
  cards.value = next
  const newExpanded = new Set<number>()
  for (const i of expandedCards.value) {
    if (i < idx) newExpanded.add(i)
    else if (i > idx) newExpanded.add(i - 1)
  }
  expandedCards.value = newExpanded
}

function toggleCard(idx: number) {
  const next = new Set(expandedCards.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedCards.value = next
}

function toggleMedia(idx: number) {
  const next = new Set(expandedMedia.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedMedia.value = next
}

function uploadCardMedia(idx: number, key: 'chatBackground') {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        cards.value[idx][key] = res.tempFilePaths[0]
      }
    },
  })
}

function addCardEmotion(idx: number) {
  cards.value[idx].emotionAnimations.push({ emotion: '', animationUrl: '' })
}

function uploadCardEmotion(cardIdx: number, emotionIdx: number) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: { tempFilePaths: string[] }) => {
      if (res.tempFilePaths?.[0]) {
        cards.value[cardIdx].emotionAnimations[emotionIdx].animationUrl = res.tempFilePaths[0]
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.multi-char-field {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.mode-select {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 16px;
  margin-bottom: 8px;
  transition: border-color 0.2s;

  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.textarea-wrapper {
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: border-color 0.2s;
  &:focus-within { border-bottom-color: rgba(56, 189, 248, 0.4); }
}

.field-textarea {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  resize: none;
  min-height: 4.2em;
  max-height: 8em;
  overflow-y: auto;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
}

.sequential-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(255, 255, 255, 0.03); }
}

.card-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border: none; border-radius: 2px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  padding: 0;
  &:hover { color: rgba(248, 113, 113, 0.8); background: rgba(248, 113, 113, 0.08); }
}

.chevron {
  color: var(--text-tertiary);
  transition: transform 0.2s;
  flex-shrink: 0;
  &.expanded { transform: rotate(180deg); }
  &.small { width: 12px; height: 12px; }
}

.card-body {
  padding: 4px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.card-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-field-label {
  color: var(--text-tertiary);
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1;
}

.card-input {
  width: 100%;
  padding: 5px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.15); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
}

.card-textarea {
  width: 100%;
  padding: 5px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.15); }
  &:focus { border-bottom-color: rgba(56, 189, 248, 0.4); }
}

.card-row {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.weight-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.weight-input {
  width: 56px;
  text-align: center;
}

.card-media-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  cursor: pointer;
  color: rgba(56, 189, 248, 0.6);
  &:hover { color: rgba(56, 189, 248, 0.8); }
}

.card-media-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.card-upload-btn {
  padding: 3px 8px;
  border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: 2px;
  background: transparent;
  color: var(--text-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  &:hover { border-color: rgba(52, 211, 153, 0.3); color: #6ee7b7; }
  &.remove {
    border-color: rgba(248, 113, 113, 0.15);
    &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); }
  }
}

.card-media-preview {
  margin-top: 4px;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
  max-height: 80px;
  &.small { max-height: 60px; }
  img {
    width: 100%;
    max-height: 80px;
    object-fit: cover;
    display: block;
  }
}

.card-emotion-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 2px;
}

.add-card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border: 1px dashed rgba(56, 189, 248, 0.2);
  border-radius: 4px;
  background: transparent;
  color: rgba(56, 189, 248, 0.6);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: rgba(56, 189, 248, 0.4); color: rgba(56, 189, 248, 0.8); background: rgba(56, 189, 248, 0.04); }
}
</style>
