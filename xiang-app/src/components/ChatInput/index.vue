<!--
  聊天输入组件
  支持文字输入、图片选择、语音录制
  集成 STT 语音转文本功能
-->
<template>
  <view class="chat-input-container">
    <!-- 工具栏 -->
    <view v-if="showToolbar" class="toolbar">
      <button class="toolbar-btn" @click="handleChooseImage">
        <text class="toolbar-icon">📷</text>
        <text class="toolbar-text">图片</text>
      </button>
      <button
        class="toolbar-btn"
        :class="{ recording: isRecording }"
        @click="toggleRecording"
      >
        <text class="toolbar-icon">{{ isRecording ? '⏹️' : '🎤' }}</text>
        <text class="toolbar-text">
          {{ isRecording ? '停止录音' : '语音' }}
        </text>
      </button>
      <button class="toolbar-btn" @click="handleGameMenu">
        <text class="toolbar-icon">🎮</text>
        <text class="toolbar-text">游戏</text>
      </button>
    </view>

    <!-- 输入区域 -->
    <view class="input-wrapper">
      <!-- 文本输入框 -->
      <input
        v-model="inputText"
        class="text-input"
        placeholder="输入消息..."
        :disabled="isRecording"
        :confirm-type="confirmType"
        @confirm="handleSend"
      />

      <!-- 发送按钮 -->
      <button
        v-if="inputText.trim()"
        class="send-btn"
        :disabled="isSending"
        @click="handleSend"
      >
        发送
      </button>

      <!-- 语音录制按钮 -->
      <button
        v-else-if="isRecording"
        class="recording-btn"
        @click="stopRecording"
      >
        停止
      </button>

      <!-- 语音输入按钮 -->
      <button
        v-else
        class="voice-btn"
        @click="startRecording"
      >
        🎤
      </button>
    </view>

    <!-- 录音状态提示 -->
    <view v-if="isRecording" class="recording-status">
      <view class="recording-wave">
        <view class="wave-bar" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.1}s` }"></view>
      </view>
      <text class="recording-text">正在录音... {{ recordingTime }}s</text>
      <text v-if="sttText" class="recording-stt">{{ sttText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { STTService } from '@/services/stt'
import { loadSTTConfig } from '@/services/voice-settings'

// Props
const props = defineProps<{
  showToolbar?: boolean
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done'
  disabled?: boolean
}>()

// Emits
const emit = defineEmits<{
  send: [text: string]
  image: [imagePath: string]
  voice: [audioPath: string, text: string, duration: number]
  gameMenu: []
}>()

// 状态
const inputText = ref('')
const isSending = ref(false)
const isRecording = ref(false)
const recordingTime = ref(0)
const recordingTimer = ref<number | null>(null)
const sttService = ref<STTService | null>(null)
const sttText = ref('')

// 计算属性
const showToolbar = computed(() => props.showToolbar !== false)
const confirmType = computed(() => props.confirmType || 'send')

// 监听禁用状态
watch(() => props.disabled, (newVal) => {
  if (newVal && isRecording.value) {
    stopRecording()
  }
})

// 方法
function handleSend() {
  if (!inputText.value.trim() || isSending.value || props.disabled) return

  const text = inputText.value.trim()
  inputText.value = ''
  isSending.value = true

  emit('send', text)

  // 重置发送状态
  setTimeout(() => {
    isSending.value = false
  }, 500)
}

async function handleChooseImage() {
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })

    if (res.tempFilePaths && res.tempFilePaths.length > 0) {
      emit('image', res.tempFilePaths[0])
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    uni.showToast({
      title: '选择图片失败',
      icon: 'none'
    })
  }
}

/**
 * 切换录音状态
 */
function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

/**
 * 开始录音
 */
async function startRecording() {
  if (props.disabled) return

  try {
    const sttConfig = await loadSTTConfig()

    // 创建 STT 服务实例
    sttService.value = new STTService({
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'mp3',
      language: sttConfig.language
    })

    // 设置结果回调（实时显示识别结果）
    sttService.value.onResult((text, _isFinal) => {
      if (text) {
        sttText.value = text
      }
    })

    // 设置错误回调
    sttService.value.onError((error) => {
      console.error('STT 错误:', error)
      stopRecording()
      uni.showToast({
        title: error.message || '语音识别失败',
        icon: 'none'
      })
    })

    // 开始录音
    await sttService.value.startRecording()
    
    isRecording.value = true
    recordingTime.value = 0
    sttText.value = ''

    // 开始计时
    recordingTimer.value = setInterval(() => {
      recordingTime.value++
    }, 1000) as unknown as number

  } catch (error) {
    console.error('开始录音失败:', error)
    uni.showToast({
      title: '录音权限未开启',
      icon: 'none'
    })
  }
}

/**
 * 停止录音
 */
async function stopRecording() {
  if (!sttService.value || !isRecording.value) return

  try {
    // 停止录音
    const audioPath = await sttService.value.stopRecording()
    
    // 清除计时器
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }

    // STT 转换
    let text = sttText.value
    if (!text && audioPath) {
      text = await sttService.value.transcribe(audioPath)
    }

    // 发送语音消息
    if (audioPath || text) {
      emit('voice', audioPath || '', text || `语音消息 (${recordingTime.value}秒)`, recordingTime.value)
    }
  } catch (error) {
    console.error('停止录音失败:', error)
  } finally {
    isRecording.value = false
    sttText.value = ''
    
    if (sttService.value) {
      sttService.value.destroy()
      sttService.value = null
    }
  }
}

function handleGameMenu() {
  emit('gameMenu')
}

/**
 * 清理资源
 */
function cleanup() {
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
  if (sttService.value) {
    sttService.value.destroy()
    sttService.value = null
  }
  isRecording.value = false
  sttText.value = ''
}

// 组件卸载时清理
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.chat-input-container {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(1.2);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-around;
  padding: 16rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.10);
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: transparent;
  border: none;
  padding: 8rpx 16rpx;
  margin: 0;
}

.toolbar-btn::after {
  border: none;
}

.toolbar-icon {
  font-size: 40rpx;
}

.toolbar-text {
  font-size: 22rpx;
  color: rgba(186, 230, 253, 0.65);
}

.toolbar-btn.recording .toolbar-icon {
  animation: recordingPulse 1s infinite;
}

@keyframes recordingPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 输入区域 */
.input-wrapper {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.text-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 36rpx;
  font-size: 28rpx;
  line-height: 72rpx;
  color: #ffffff;
}

.send-btn,
.recording-btn,
.voice-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}

.send-btn {
  background: linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%);
  color: #ffffff;
  border: none;
}

.send-btn::after {
  border: none;
}

.send-btn:disabled {
  opacity: 0.6;
}

.recording-btn {
  background: #ff4444;
  color: #ffffff;
  border: none;
  animation: recordingPulse 1s infinite;
}

.recording-btn::after {
  border: none;
}

.voice-btn {
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 36rpx;
}

.voice-btn::after {
  border: none;
}

/* 录音状态 */
.recording-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.06);
}

.recording-wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 32rpx;
}

.wave-bar {
  width: 6rpx;
  height: 16rpx;
  background: linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%);
  border-radius: 3rpx;
  animation: waveAnimation 0.5s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: 0s; }
.wave-bar:nth-child(2) { animation-delay: 0.1s; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; }
.wave-bar:nth-child(4) { animation-delay: 0.3s; }
.wave-bar:nth-child(5) { animation-delay: 0.4s; }

@keyframes waveAnimation {
  0%, 100% {
    height: 16rpx;
  }
  50% {
    height: 32rpx;
  }
}

.recording-text {
  font-size: 26rpx;
  color: rgba(186, 230, 253, 0.65);
}
</style>
