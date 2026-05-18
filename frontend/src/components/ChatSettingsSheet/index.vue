<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="chat-settings-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="`${characterName || '当前会话'} 的会话设置`"
      @click.self="onClose"
    >
      <section class="chat-settings-sheet" @click.stop>
        <header class="sheet-head">
          <div class="sheet-head-text">
            <strong>会话设置</strong>
            <span>{{ characterName || '当前会话' }}</span>
          </div>
          <button type="button" class="sheet-close" aria-label="关闭" @click="onClose">×</button>
        </header>

        <div class="sheet-body">
          <section class="settings-group">
            <div class="group-title">语音朗读</div>
            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">允许 TTS 朗读</span>
                <span class="row-desc">关闭后，顶部和气泡上的朗读按钮都将隐藏</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.enableTTS" @change="patch({ enableTTS: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>

            <label class="row toggle-row" :class="{ disabled: !model.enableTTS }">
              <div class="row-text">
                <span class="row-name">自动朗读 AI 回复</span>
                <span class="row-desc">每条新消息生成完成后自动朗读</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.autoTTS" :disabled="!model.enableTTS" @change="patch({ autoTTS: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>
          </section>

          <section class="settings-group">
            <div class="group-title">小游戏</div>
            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">允许插入 H5 小游戏</span>
                <span class="row-desc">关闭后，AI 即使触发剧情也不会嵌入小游戏</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.enableMiniGame" @change="patch({ enableMiniGame: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>

            <div class="row slider-row" :class="{ disabled: !model.enableMiniGame }">
              <div class="row-text">
                <span class="row-name">默认通过最低分</span>
                <span class="row-desc">当小游戏开启时，达到该分数即视为通关</span>
              </div>
              <div class="slider-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  :value="model.miniGamePassingScore"
                  :disabled="!model.enableMiniGame"
                  @input="patch({ miniGamePassingScore: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="slider-value">{{ model.miniGamePassingScore }}</span>
              </div>
            </div>
          </section>

          <section class="settings-group">
            <div class="group-title">内容增强</div>
            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">允许自动配图</span>
                <span class="row-desc">关闭后会忽略 AI 写入的 [图片插入:xxx] 标记</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.enableAutoImage" @change="patch({ enableAutoImage: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>

            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">允许 AI 发布动态</span>
                <span class="row-desc">控制是否生成朋友圈/动态推送</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.enableAutoMoments" @change="patch({ enableAutoMoments: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>
          </section>

          <section class="settings-group">
            <div class="group-title">输入与回复</div>
            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">流式输出</span>
                <span class="row-desc">逐字显示 AI 回复，关闭后会等全部生成再展示</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.streamReply" @change="patch({ streamReply: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>

            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">显示语音输入按钮</span>
                <span class="row-desc">关闭后只能键盘输入</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.enableVoiceInput" @change="patch({ enableVoiceInput: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>

            <label class="row toggle-row">
              <div class="row-text">
                <span class="row-name">显示 Token 计数</span>
                <span class="row-desc">在消息气泡和输入框下方显示估算 Token 数</span>
              </div>
              <span class="toggle">
                <input type="checkbox" :checked="model.showTokenCount" @change="patch({ showTokenCount: ($event.target as HTMLInputElement).checked })" />
                <span class="track" />
              </span>
            </label>
          </section>

        </div>

        <footer class="sheet-foot">
          <button type="button" class="btn-reset" :disabled="busy" @click="onReset">恢复默认</button>
          <button type="button" class="btn-done" :disabled="busy" @click="onClose">完成</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  loadChatSettings,
  patchChatSettings,
  resetChatSettings,
  DEFAULT_CHAT_SETTINGS,
  type ChatSettings,
} from '@/services/chat-settings'

interface Props {
  visible: boolean
  characterId: string
  characterName?: string
  mode?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'change', settings: ChatSettings): void
}>()

const busy = ref(false)
const model = ref<ChatSettings>({ ...DEFAULT_CHAT_SETTINGS })

watch(
  () => [props.visible, props.characterId] as const,
  async ([show, id]) => {
    if (!show || !id) return
    busy.value = true
    try {
      model.value = await loadChatSettings(id)
    } finally {
      busy.value = false
    }
  },
  { immediate: true },
)

async function patch(partial: Partial<ChatSettings>) {
  if (!props.characterId) return
  const merged: ChatSettings = { ...model.value, ...partial }
  if (partial.enableTTS === false) merged.autoTTS = false
  model.value = merged
  busy.value = true
  try {
    const saved = await patchChatSettings(props.characterId, merged)
    model.value = saved
    emit('change', saved)
  } finally {
    busy.value = false
  }
}

async function onReset() {
  if (!props.characterId) return
  busy.value = true
  try {
    const saved = await resetChatSettings(props.characterId)
    model.value = saved
    emit('change', saved)
  } finally {
    busy.value = false
  }
}

function onClose() {
  emit('close')
}
</script>

<style lang="scss" scoped>
.chat-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10080;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.chat-settings-sheet {
  width: 100%;
  max-width: 520px;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  margin: 0 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
  border-radius: 22px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.97), rgba(7, 13, 24, 0.97));
  border: 1px solid rgba(56, 189, 248, 0.18);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  color: #f8fafc;
  overflow: hidden;
  font-family: inherit;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sheet-head-text { display: flex; flex-direction: column; gap: 2px; }
.sheet-head-text strong { font-size: 16px; font-weight: 600; }
.sheet-head-text span { font-size: 12px; color: rgba(226, 232, 240, 0.6); }

.sheet-close {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(226, 232, 240, 0.78);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.sheet-body { padding: 8px 4px 4px; overflow-y: auto; flex: 1; }

.settings-group { padding: 8px 14px 4px; }

.group-title {
  font-size: 12px; font-weight: 600;
  color: rgba(125, 211, 252, 0.85);
  letter-spacing: 0.04em;
  margin: 6px 4px 4px;
  text-transform: uppercase;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 14px;
  transition: background 0.15s ease;
}
.row + .row { margin-top: 4px; }
.row.disabled { opacity: 0.42; pointer-events: none; }
.row:hover { background: rgba(255, 255, 255, 0.03); }

.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.row-name { font-size: 14px; font-weight: 500; color: #f8fafc; }
.row-desc { font-size: 12px; color: rgba(148, 163, 184, 0.85); line-height: 1.4; }

.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.toggle .track {
  position: absolute; inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  transition: 0.18s ease;
}
.toggle .track::before {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  left: 3px; top: 3px;
  border-radius: 50%;
  background: #ffffff;
  transition: 0.18s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.toggle input:checked + .track { background: linear-gradient(135deg, #38bdf8, #0ea5e9); }
.toggle input:checked + .track::before { transform: translateX(20px); }
.toggle input:disabled + .track { opacity: 0.42; }

.slider-row { flex-direction: column; align-items: stretch; gap: 10px; }
.slider-group { display: flex; align-items: center; gap: 12px; }
.slider-group input[type='range'] {
  flex: 1;
  height: 4px;
  appearance: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.slider-group input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7dd3fc, #0284c7);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
}
.slider-value { min-width: 36px; text-align: right; font-size: 13px; color: rgba(125, 211, 252, 0.92); font-weight: 600; }

.sheet-foot {
  display: flex;
  gap: 10px;
  padding: 14px 16px calc(env(safe-area-inset-bottom, 0px) + 14px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.btn-reset, .btn-done {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: none;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.btn-reset:disabled, .btn-done:disabled { cursor: not-allowed; opacity: 0.5; }
.btn-reset {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(226, 232, 240, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.btn-reset:not(:disabled):hover { background: rgba(255, 255, 255, 0.08); }
.btn-done {
  background: linear-gradient(135deg, #7dd3fc, #38bdf8 50%, #0284c7);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.32);
}
.btn-done:not(:disabled):hover { filter: brightness(1.08); }
</style>
