<template>
  <div class="preview-chat-page">
    <!-- 顶部导航栏 -->
    <header class="preview-header">
      <button type="button" class="preview-back-btn" aria-label="返回" @click="goBack">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
        </svg>
      </button>
      <div class="preview-header-title">
        <span class="preview-char-name">{{ character?.name || '预览' }}</span>
        <span class="preview-badge">预览模式</span>
      </div>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <!-- 消息列表 -->
    <main ref="messageListRef" class="preview-message-list">
      <div v-if="messages.length === 0" class="preview-empty">
        <div class="preview-empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <p>发送消息开始预览对话</p>
      </div>

      <template v-for="(msg, idx) in visibleMessages" :key="idx">
        <!-- 角色消息（左侧） -->
        <div v-if="msg.role === 'assistant'" class="preview-msg-row assistant-row">
          <div class="preview-avatar">
            <img v-if="character?.avatar" :src="character.avatar" alt="头像" />
            <div v-else class="preview-avatar-placeholder">{{ (character?.name || '?').charAt(0) }}</div>
          </div>
          <div class="preview-bubble assistant-bubble">
            <div class="preview-bubble-text" v-html="formatContent(msg.content)"></div>
          </div>
        </div>

        <!-- 用户消息（右侧） -->
        <div v-else-if="msg.role === 'user'" class="preview-msg-row user-row">
          <div class="preview-bubble user-bubble">
            <div class="preview-bubble-text">{{ msg.content }}</div>
          </div>
        </div>
      </template>

      <!-- 流式输出中的占位 -->
      <div v-if="streaming" class="preview-msg-row assistant-row">
        <div class="preview-avatar">
          <img v-if="character?.avatar" :src="character.avatar" alt="头像" />
          <div v-else class="preview-avatar-placeholder">{{ (character?.name || '?').charAt(0) }}</div>
        </div>
        <div class="preview-bubble assistant-bubble streaming">
          <div class="preview-bubble-text" v-html="formatContent(streamingText)"></div>
          <span class="streaming-cursor"></span>
        </div>
      </div>
    </main>

    <!-- 底部输入区 -->
    <footer class="preview-input-area">
      <div class="preview-input-hint" v-if="turnCount >= MAX_TURNS">
        预览轮次已达上限，请保存角色后继续对话
      </div>
      <div v-else class="preview-input-row">
        <textarea
          v-model="inputText"
          class="preview-textarea"
          rows="1"
          :disabled="streaming || loading"
          placeholder="输入消息…"
          @keydown.enter.prevent="handleEnter"
        />
        <button
          type="button"
          class="preview-send-btn"
          :disabled="!inputText.trim() || streaming || loading"
          @click="sendMessage"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9" />
          </svg>
        </button>
      </div>
      <p class="preview-footer-hint">预览模式：对话不会被保存，最多{{ MAX_TURNS }}轮</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ICharacter } from '@/types/character'
import { createLLMAPI } from '@/services/llm-api'
import { apiConfigService } from '@/services/api-config'
import { getActivePrompts } from '@/services/system-prompt'
import { uni } from '@/utils/uni-polyfill'

const route = useRoute()
const router = useRouter()

const MAX_TURNS = 10

interface PreviewMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const character = ref<ICharacter | null>(null)
const messages = ref<PreviewMessage[]>([])
const inputText = ref('')
const streaming = ref(false)
const streamingText = ref('')
const loading = ref(false)
const messageListRef = ref<HTMLElement | null>(null)

// 只展示 user / assistant，过滤掉 system
const visibleMessages = computed(() => messages.value.filter(m => m.role !== 'system'))

// 已完成的对话轮次（user + assistant 各算半轮，合起来一轮）
const turnCount = computed(() => {
  let count = 0
  let hasUser = false
  for (const m of messages.value) {
    if (m.role === 'user') {
      hasUser = true
    } else if (m.role === 'assistant' && hasUser) {
      count++
      hasUser = false
    }
  }
  return count
})

function goBack() {
  uni.navigateBack()
}

function formatContent(text: string): string {
  // 简单的换行转 <br>
  return text.replace(/\n/g, '<br>')
}

function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// 监听消息变化自动滚动
watch(() => messages.value.length, scrollToBottom)
watch(streamingText, scrollToBottom)

function buildSystemPrompt(char: ICharacter): string {
  const parts: string[] = []
  if (char.settings?.trim()) parts.push(char.settings.trim())
  if (char.persona) {
    const p = char.persona
    const personaParts: string[] = []
    if (p.anchor?.trim()) personaParts.push(`身份锚点：${p.anchor.trim()}`)
    if (p.traits?.length) personaParts.push(`性格特质：${p.traits.join('、')}`)
    if (p.voice?.trim()) personaParts.push(`交流风格：${p.voice.trim()}`)
    if (personaParts.length) parts.push('【角色人设】\n' + personaParts.join('\n'))
  }
  if (char.scenario?.trim()) parts.push('【场景设定】\n' + char.scenario.trim())
  if (char.depthPrompt?.prompt?.trim()) {
    parts.push(`【深度提示】\n${char.depthPrompt.prompt.trim()}`)
  }
  // Lorebook
  if (char.lorebook?.entries?.length) {
    const enabled = char.lorebook.entries.filter(e => e.enabled)
    if (enabled.length) {
      parts.push('【世界知识】\n' + enabled.map(e => `· ${e.content}`).join('\n'))
    }
  }
  // World Books
  if (char.worldBooks?.length) {
    for (const wb of char.worldBooks) {
      const enabled = wb.entries?.filter(e => e.enabled) || []
      if (!enabled.length) continue
      parts.push(`【世界书 · ${wb.name || '未命名'}】\n` + enabled.map(e => `· ${e.content}`).join('\n'))
    }
  }

  // 追加系统提示词
  try {
    const activePrompts = getActivePrompts()
    for (const prompt of activePrompts) {
      const pos = prompt.injectionPosition
      if (pos === 'system-top' || pos === 'system-middle' || pos === 'system-bottom') {
        const text = prompt.useAdvanced ? prompt.advancedPrompt : prompt.basicPrompt
        const resolved = text
          .replace(/\{\{char\.name\}\}/g, char.name || '')
          .replace(/\{\{char\.desc\}\}/g, char.description || '')
          .replace(/\{\{char\.description\}\}/g, char.description || '')
          .replace(/\{\{user\.name\}\}/g, '用户')
        if (resolved.trim()) {
          parts.push(resolved)
        }
      }
    }
  } catch {
    // 向后兼容：系统提示词加载失败时不影响现有功能
  }

  return parts.join('\n\n')
}

function parseCharacterFromQuery(): ICharacter | null {
  const data = route.query.data as string | undefined
  if (!data) return null
  try {
    const json = decodeURIComponent(atob(decodeURIComponent(data)))
    return JSON.parse(json) as ICharacter
  } catch {
    uni.showToast({ title: '角色数据解析失败', icon: 'none' })
    return null
  }
}

onMounted(() => {
  const char = parseCharacterFromQuery()
  if (!char) {
    uni.showToast({ title: '缺少角色数据', icon: 'none' })
    router.back()
    return
  }
  character.value = char

  // 开场白作为第一条 assistant 消息
  const greeting = char.greeting?.trim()
  if (greeting) {
    messages.value.push({ role: 'assistant', content: greeting })
  }
})

function handleEnter() {
  if (!inputText.value.trim() || streaming.value || loading.value) return
  sendMessage()
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || !character.value) return
  if (turnCount.value >= MAX_TURNS) {
    uni.showToast({ title: '预览轮次已达上限', icon: 'none' })
    return
  }

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  loading.value = true
  streaming.value = true
  streamingText.value = ''

  try {
    const config = await apiConfigService.getDefaultConfig('text')
    if (!config) {
      uni.showToast({ title: '请先在设置中配置 API', icon: 'none' })
      streaming.value = false
      loading.value = false
      return
    }

    const systemPrompt = buildSystemPrompt(character.value)
    const api = createLLMAPI(config)

    const contextMessages = messages.value.filter(m => m.role !== 'system')

    const abortable = api.chatStreamAbortable({
      systemPrompt,
      messages: contextMessages,
    })

    let fullContent = ''
    for await (const chunk of abortable.stream) {
      if (chunk.content) {
        fullContent += chunk.content
        streamingText.value = fullContent
      }
    }

    // 流式结束，将完整内容加入消息数组
    messages.value.push({ role: 'assistant', content: fullContent })
  } catch (e) {
    const msg = (e as Error).message || '请求失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    streaming.value = false
    streamingText.value = ''
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.preview-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--page-backdrop);
  color: var(--text-primary);
}

/* ── 顶部导航栏 ── */
.preview-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  background: linear-gradient(180deg, rgba(5, 13, 20, 0.98), rgba(5, 13, 20, 0.92));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.preview-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.back-icon {
  width: 20px;
  height: 20px;
}

.preview-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.preview-char-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.18));
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: #fbbf24;
  font-size: 11px;
  font-weight: 500;
}

.header-placeholder {
  width: 36px;
}

/* ── 消息列表 ── */
.preview-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 14px;

  .preview-empty-icon {
    color: rgba(255, 255, 255, 0.12);
  }
}

.preview-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;

  &.user-row {
    justify-content: flex-end;
  }

  &.assistant-row {
    justify-content: flex-start;
  }
}

.preview-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.preview-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 600;
}

.preview-bubble {
  max-width: min(72%, 520px);
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;

  &.user-bubble {
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
    border-bottom-right-radius: 4px;
  }

  &.assistant-bubble {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    border-bottom-left-radius: 4px;
  }

  &.streaming {
    .streaming-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: var(--primary-color);
      margin-left: 2px;
      vertical-align: middle;
      animation: blink 1s step-end infinite;
    }
  }
}

.preview-bubble-text {
  white-space: pre-wrap;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── 底部输入区 ── */
.preview-input-area {
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(transparent, rgba(5, 13, 20, 0.95) 30%);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.preview-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  &:focus {
    border-color: rgba(56, 189, 248, 0.4);
  }

  &:disabled {
    opacity: 0.5;
  }
}

.preview-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary-light, $primary-color, $primary-dark);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.15s;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.preview-footer-hint {
  margin-top: 6px;
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
}

.preview-input-hint {
  text-align: center;
  font-size: 13px;
  color: #fbbf24;
  padding: 10px 0;
}
</style>
