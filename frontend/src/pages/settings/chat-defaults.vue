<template>
  <div class="settings-sub-page">
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <h1 class="page-title">{{ $t('聊天默认设置') }}</h1>
      <span class="header-placeholder"></span>
    </header>

    <!-- 当前语言状态 -->
    <div class="lang-status-bar">
      <span class="lang-status-label">{{ $t('语言') }}</span>
      <span class="lang-status-value">{{ currentLanguageNativeName }}</span>
    </div>

    <div class="settings-list">
      <!-- ═══════════════════════════════════════════════ -->
      <!-- LLM 全局默认参数                               -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <h2 class="section-title">{{ $t('全局默认参数') }}</h2>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('默认聊天模式') }}</span>
            <span class="setting-desc">创建角色时的默认对话模式</span>
          </div>
          <select v-model="defaults.mode" class="select-input">
            <option value="free-dialogue">{{ $t('自由对话') }}</option>
            <option value="challenge-dialogue">{{ $t('挑战对话') }}</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('上下文模式') }}</span>
            <span class="setting-desc">正常模式保留完整上下文；快速模式仅保留核心角色字段和最近对话以提升响应速度</span>
          </div>
          <select v-model="defaults.speedMode" class="select-input">
            <option value="normal">{{ $t('正常模式（完整上下文）') }}</option>
            <option value="turbo">{{ $t('快速模式（更快响应）') }}</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('回复长度偏好') }}</span>
            <span class="setting-desc">AI回复的默认长度倾向</span>
          </div>
          <select v-model="defaults.replyLength" class="select-input">
            <option value="short">{{ $t('简短') }}</option>
            <option value="medium">{{ $t('适中') }}</option>
            <option value="long">{{ $t('详细') }}</option>
          </select>
        </div>

        <div class="setting-row slider-row">
          <div class="setting-info">
            <span class="setting-name">Temperature</span>
            <span class="setting-desc">值越高回复越随机创造性，越低越严谨可预测</span>
          </div>
          <div class="slider-group">
            <span class="slider-label-left">{{ $t('严谨') }}</span>
            <input v-model.number="defaults.temperature" type="range" min="0" max="2" step="0.1" class="range-input" />
            <span class="slider-label-right">{{ $t('创造') }}</span>
            <span class="slider-value">{{ defaults.temperature.toFixed(1) }}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">Max Tokens</span>
            <span class="setting-desc">限制AI单次回复的最大长度</span>
          </div>
          <input v-model.number="defaults.maxTokens" type="number" min="1" max="8192" class="number-input" />
        </div>

        <div class="setting-row slider-row">
          <div class="setting-info">
            <span class="setting-name">Top P</span>
            <span class="setting-desc">控制采样多样性，通常保持1.0</span>
          </div>
          <div class="slider-group">
            <input v-model.number="defaults.topP" type="range" min="0" max="1" step="0.01" class="range-input" />
            <span class="slider-value">{{ defaults.topP.toFixed(2) }}</span>
          </div>
        </div>

        <div class="setting-row slider-row">
          <div class="setting-info">
            <span class="setting-name">Presence Penalty</span>
            <span class="setting-desc">惩罚已出现过的token，促使讨论新话题</span>
          </div>
          <div class="slider-group">
            <input v-model.number="defaults.presencePenalty" type="range" min="-2" max="2" step="0.1" class="range-input" />
            <span class="slider-value">{{ defaults.presencePenalty.toFixed(1) }}</span>
          </div>
        </div>

        <div class="setting-row slider-row">
          <div class="setting-info">
            <span class="setting-name">Frequency Penalty</span>
            <span class="setting-desc">惩罚频繁出现的token，减少重复</span>
          </div>
          <div class="slider-group">
            <input v-model.number="defaults.frequencyPenalty" type="range" min="-2" max="2" step="0.1" class="range-input" />
            <span class="slider-value">{{ defaults.frequencyPenalty.toFixed(1) }}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('上下文窗口长度限制') }}</span>
            <span class="setting-desc">对话上下文的最大token数</span>
          </div>
          <div class="number-with-unit">
            <input v-model.number="defaults.contextWindow" type="number" min="1000" max="128000" class="number-input" />
            <span class="unit">tokens</span>
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- 模型自动路由                                   -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <h2 class="section-title">{{ $t('模型自动路由') }}</h2>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('启用自动路由') }}</span>
            <span class="setting-desc">根据对话长度和复杂度自动选择最佳模型</span>
          </div>
          <label class="toggle"><input v-model="defaults.enableModelRouting" type="checkbox" /><span class="slider" /></label>
        </div>

        <div v-if="defaults.enableModelRouting" class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('短对话阈值') }}</span>
            <span class="setting-desc">低于此值时使用轻量模型</span>
          </div>
          <div class="number-with-unit">
            <input v-model.number="defaults.shortConversationThreshold" type="number" min="100" max="5000" step="100" class="number-input" />
            <span class="unit">tokens</span>
          </div>
        </div>

        <div v-if="defaults.enableModelRouting" class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('长对话阈值') }}</span>
            <span class="setting-desc">高于此值时使用强模型</span>
          </div>
          <div class="number-with-unit">
            <input v-model.number="defaults.longConversationThreshold" type="number" min="1000" max="128000" step="1000" class="number-input" />
            <span class="unit">tokens</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('强制使用模型') }}</span>
            <span class="setting-desc">忽略自动路由，始终使用指定模型（留空启用自动路由）</span>
          </div>
          <input v-model="defaults.preferredModel" type="text" class="text-input" :placeholder="$t('例如：gpt-4o-mini')" />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- 显示与交互                                     -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <h2 class="section-title">{{ $t('显示与交互') }}</h2>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('流式输出') }}</span>
            <span class="setting-desc">逐字显示AI回复（而非等全部生成完）</span>
          </div>
          <label class="toggle"><input v-model="defaults.streamOutput" type="checkbox" /><span class="slider" /></label>
        </div>

        <div class="setting-row slider-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('并发请求数') }}</span>
            <span class="setting-desc">将单次请求拆分为 N 个子问题并发处理（1=不拆分）</span>
          </div>
          <div class="slider-group">
            <!-- 限制最大并发数为 3，避免过度消耗 API 额度和触发速率限制 -->
            <input v-model.number="defaults.concurrentRequests" type="range" min="1" max="3" step="1" class="range-input" />
            <span class="slider-value">{{ defaults.concurrentRequests }}</span>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('打字机效果速度') }}</span>
            <span class="setting-desc">流式输出时的文字显示速度</span>
          </div>
          <select v-model="settings.typewriterSpeed" class="select-input">
            <option value="instant">{{ $t('即时') }}</option>
            <option value="fast">{{ $t('快') }}</option>
            <option value="medium">{{ $t('中') }}</option>
            <option value="slow">{{ $t('慢') }}</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('自动发送') }}</span>
            <span class="setting-desc">输入完成后回车直接发送（关闭则需手动点击）</span>
          </div>
          <label class="toggle"><input v-model="settings.autoSend" type="checkbox" /><span class="slider" /></label>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('输入方式') }}</span>
            <span class="setting-desc">默认的输入模式偏好</span>
          </div>
          <select v-model="settings.inputMode" class="select-input">
            <option value="text">{{ $t('纯文字') }}</option>
            <option value="voice">{{ $t('语音输入优先') }}</option>
            <option value="hybrid">{{ $t('混合') }}</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('消息气泡样式') }}</span>
            <span class="setting-desc">聊天界面的消息展示风格</span>
          </div>
          <select v-model="settings.bubbleStyle" class="select-input">
            <option value="classic">{{ $t('经典气泡') }}</option>
            <option value="minimal">{{ $t('简洁模式') }}</option>
            <option value="roleplay">{{ $t('角色扮演模式') }}</option>
          </select>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- 上下文记忆                                     -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <h2 class="section-title">{{ $t('上下文记忆') }}</h2>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('长期记忆') }}</span>
            <span class="setting-desc">角色记住用户的关键信息（生日、喜好等）</span>
          </div>
          <label class="toggle"><input v-model="settings.longTermMemory" type="checkbox" /><span class="slider" /></label>
        </div>

        <div v-if="settings.longTermMemory" class="setting-row textarea-row">
          <div class="setting-info">
            <span class="setting-name">长期记忆编辑</span>
            <span class="setting-desc">手动编辑角色记住的用户信息（key-value格式）</span>
          </div>
          <textarea v-model="settings.longTermMemoryData" class="field-textarea" rows="4" placeholder="例如：&#10;生日: 1月1日&#10;喜好: 阅读、旅行" />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('回溯功能') }}</span>
            <span class="setting-desc">可撤销到任意历史节点重新开始分支对话</span>
          </div>
          <label class="toggle"><input v-model="settings.backtrackEnabled" type="checkbox" /><span class="slider" /></label>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('上下文编辑') }}</span>
            <span class="setting-desc">可手动修改已发送消息重新生成回复</span>
          </div>
          <label class="toggle"><input v-model="settings.contextEditEnabled" type="checkbox" /><span class="slider" /></label>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- 快捷操作                                       -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <h2 class="section-title">{{ $t('快捷操作') }}</h2>

        <div class="setting-row list-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('快捷指令') }}</span>
            <span class="setting-desc">可输入的快捷命令列表</span>
          </div>
          <div class="quick-commands">
            <div v-for="(cmd, idx) in settings.quickCommands" :key="idx" class="command-item">
              <input v-model="cmd.name" type="text" class="cmd-input" placeholder="指令名称" />
              <input v-model="cmd.content" type="text" class="cmd-input wide" placeholder="指令内容" />
              <button type="button" class="icon-btn danger" @click="removeQuickCommand(idx)">
                <svg viewBox="0 0 24 24" width="12" height="12"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <button type="button" class="add-cmd-btn" @click="addQuickCommand">
              <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
              添加快捷指令
            </button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('快捷回复建议') }}</span>
            <span class="setting-desc">开启/关闭AI提供的回复建议</span>
          </div>
          <label class="toggle"><input v-model="settings.replySuggestions" type="checkbox" /><span class="slider" /></label>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-name">{{ $t('快捷角色切换') }}</span>
            <span class="setting-desc">侧边栏最近使用的角色数量</span>
          </div>
          <input v-model.number="settings.recentCharacterCount" type="number" min="1" max="20" class="number-input" />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════ -->
      <!-- 高级参数（折叠）                               -->
      <!-- ═══════════════════════════════════════════════ -->
      <section class="settings-section">
        <button type="button" class="collapse-header" @click="showAdvanced = !showAdvanced">
          <h2 class="section-title">{{ $t('高级参数') }}</h2>
          <svg class="collapse-icon" :class="{ expanded: showAdvanced }" viewBox="0 0 24 24" width="16" height="16">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div v-if="showAdvanced" class="advanced-body">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-name">{{ $t('JSON模式') }}</span>
              <span class="setting-desc">强制AI以JSON格式输出</span>
            </div>
            <label class="toggle"><input v-model="defaults.jsonMode" type="checkbox" /><span class="slider" /></label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-name">Function Calling</span>
              <span class="setting-desc">允许AI调用外部函数</span>
            </div>
            <label class="toggle"><input v-model="defaults.functionCalling" type="checkbox" /><span class="slider" /></label>
          </div>

          <div class="setting-row textarea-row">
            <div class="setting-info">
              <span class="setting-name">{{ $t('System Prompt前缀') }}</span>
              <span class="setting-desc">在每个system prompt前自动添加的前缀内容</span>
            </div>
            <textarea v-model="defaults.systemPromptPrefix" class="field-textarea" rows="3" placeholder="输入前缀内容，将自动添加到每个system prompt之前" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguageStore } from '@/stores/language'
import { SUPPORTED_LANGUAGES } from '@/services/i18n'
import { useI18n } from '@/composables/useI18n'
import {
  loadGlobalChatDefaults,
  saveGlobalChatDefaults,
  DEFAULT_CHAT_DEFAULTS,
  type ChatDefaults,
} from '@/services/chat-defaults'
import {
  loadGlobalChatSettings,
  saveGlobalChatSettings,
  DEFAULT_CHAT_SETTINGS,
  type ChatSettings,
} from '@/services/chat-settings'

const router = useRouter()
const languageStore = useLanguageStore()
const { t } = useI18n()

const currentLanguageNativeName = computed(() => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === languageStore.currentLanguage)
  return lang?.nativeName ?? languageStore.currentLanguage
})

const defaults = reactive<ChatDefaults>({ ...DEFAULT_CHAT_DEFAULTS })
const settings = reactive<ChatSettings>({ ...DEFAULT_CHAT_SETTINGS })
const showAdvanced = ref(false)
const loaded = ref(false)

onMounted(async () => {
  try {
    const d = await loadGlobalChatDefaults()
    Object.assign(defaults, d)
    const s = await loadGlobalChatSettings()
    Object.assign(settings, s)
  } catch {
    // keep defaults
  }
  loaded.value = true
})

function addQuickCommand() {
  settings.quickCommands.push({ name: '', content: '' })
}

function removeQuickCommand(idx: number) {
  settings.quickCommands.splice(idx, 1)
}

watch(
  () => ({ ...defaults }),
  async () => {
    if (!loaded.value) return
    await saveGlobalChatDefaults({ ...defaults })
  },
  { deep: true },
)

watch(
  () => ({ ...settings }),
  async () => {
    if (!loaded.value) return
    await saveGlobalChatSettings({ ...settings })
  },
  { deep: true },
)

</script>

<style lang="scss" scoped>
.settings-sub-page { min-height: 100vh; background: var(--page-backdrop-soft); }

.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  height: 48px;
  padding: calc(env(safe-area-inset-top, 0px) + 0) 12px 0;
  border-bottom: 1px solid var(--top-bar-border);
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px) saturate(1.45);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.page-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
}

/* ── 语言状态栏 ─────────────────────────────── */
.lang-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(255, 255, 255, 0.02);
}

.lang-status-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.lang-status-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.settings-list { padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; }

.settings-section {
  display: flex; flex-direction: column;
  padding: 12px 0;
}

.section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  width: 100%;
}

.collapse-icon {
  color: var(--text-tertiary);
  transition: transform 0.2s;
  &.expanded { transform: rotate(180deg); }
}

.advanced-body {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.setting-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 4px; gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.slider-row { flex-direction: column; align-items: stretch; gap: 8px; }
.textarea-row { flex-direction: column; align-items: stretch; gap: 8px; }
.list-row { flex-direction: column; align-items: stretch; gap: 10px; }

.setting-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.setting-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-tertiary); }

.select-input {
  padding: 6px 24px 6px 10px; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px; background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary); font: inherit; font-size: 13px;
  outline: none; appearance: none; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
  &:focus { border-color: rgba(56, 189, 248, 0.4); }
  option { background: #0a1e2c; color: var(--text-primary); }
}

.number-input {
  width: 90px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
  text-align: right;
  &:focus { border-color: rgba(56, 189, 248, 0.4); }
}

.number-with-unit {
  display: flex;
  align-items: center;
  gap: 6px;
  .unit { font-size: 12px; color: var(--text-tertiary); }
}

.slider-group { display: flex; align-items: center; gap: 10px; }

.range-input {
  flex: 1; height: 4px; appearance: none; background: rgba(255, 255, 255, 0.1);
  border-radius: 1px; outline: none;
  &::-webkit-slider-thumb {
    appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: rgba(56, 189, 248, 0.6); cursor: pointer;
  }
}

.slider-value { font-size: 13px; color: rgba(56, 189, 248, 0.7); min-width: 36px; text-align: right; }
.slider-label-left { font-size: 11px; color: var(--text-tertiary); }
.slider-label-right { font-size: 11px; color: var(--text-tertiary); }

.toggle {
  position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
}

.slider {
  position: absolute; cursor: pointer; inset: 0;
  background: rgba(255, 255, 255, 0.1); border-radius: 12px; transition: 0.2s;
  &::before {
    content: ''; position: absolute; width: 18px; height: 18px;
    left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s;
  }
  input:checked + & { background: rgba(56, 189, 248, 0.5); }
  input:checked + &::before { transform: translateX(20px); }
}

.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-color: rgba(56, 189, 248, 0.35); }
}

.quick-commands {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cmd-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
  &.wide { flex: 2; }
  &::placeholder { color: rgba(255, 255, 255, 0.18); }
  &:focus { border-color: rgba(56, 189, 248, 0.35); }
}

.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 3px;
  background: transparent; color: var(--text-tertiary); cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: rgba(56, 189, 248, 0.3); color: var(--text-secondary); }
  &.danger { border-color: rgba(248, 113, 113, 0.1);
    &:hover { border-color: rgba(248, 113, 113, 0.3); color: rgba(248, 113, 113, 0.8); }
  }
}

.add-cmd-btn {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border: 1px dashed rgba(52, 211, 153, 0.25);
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: rgba(52, 211, 153, 0.45); color: #6ee7b7; }
}

.inline {
  justify-content: flex-start;
  gap: 16px;
}
</style>
