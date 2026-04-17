<template>
  <view class="voice-recorder" :class="{ 'is-recording': isRecording }">
    <!-- 录音按钮 -->
    <view 
      class="record-btn" 
      :class="{ 'recording': isRecording, 'disabled': disabled }"
      @touchstart="startRecord"
      @touchend="endRecord"
      @touchcancel="cancelRecord"
    >
      <view class="record-icon">
        <view v-if="!isRecording" class="mic-icon">🎤</view>
        <view v-else class="wave-container">
          <view 
            v-for="i in 5" 
            :key="i" 
            class="wave-bar"
            :style="{
              animationDelay: `${i * 0.1}s`,
              height: `${Math.random() * 20 + 10}px`
            }"
          ></view>
        </view>
      </view>
      <text class="record-text">{{ recordText }}</text>
    </view>

    <!-- 录音时长显示 -->
    <view v-if="isRecording" class="recording-timer">
      <text class="timer-text">{{ formatDuration(duration) }}</text>
      <text class="timer-hint">松开发送</text>
    </view>

    <!-- 录音波形 canvas（H5 环境） -->
    <canvas 
      v-if="showWaveform && isRecording" 
      ref="waveformCanvas"
      class="waveform-canvas"
      type="2d"
    ></canvas>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { STTService } from '@/services/stt'
import { loadSTTConfig } from '@/services/voice-settings'

/**
 * 属性定义
 */
interface Props {
  disabled?: boolean           // 是否禁用
  showWaveform?: boolean       // 是否显示波形
  autoSend?: boolean           // 是否自动发送（录音结束后自动发送）
  maxDuration?: number         // 最大录音时长（秒）
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showWaveform: false,
  autoSend: true,
  maxDuration: 60
})

/**
 * 事件定义
 */
const emit = defineEmits<{
  start: []                    // 开始录音
  end: [path: string, text: string, duration: number]  // 结束录音
  cancel: []                   // 取消录音
  error: [error: Error]        // 录音错误
  durationChange: [duration: number]  // 时长变化
}>()

/**
 * 状态变量
 */
const isRecording = ref(false)
const duration = ref(0)
const sttService = ref<STTService | null>(null)
const timerInterval = ref<number | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)
const animationFrameId = ref<number | null>(null)

/**
 * 录音按钮文字
 */
const recordText = computed(() => {
  if (isRecording.value) {
    return '松开 发送'
  }
  return '按住 说话'
})

/**
 * 格式化时长
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 开始录音
 */
async function startRecord() {
  if (props.disabled || isRecording.value) {
    return
  }

  try {
    const sttConfig = await loadSTTConfig()

    // 创建 STT 服务实例
    sttService.value = new STTService({
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'mp3',
      language: sttConfig.language
    })

    // 设置结果回调
    sttService.value.onResult((text, isFinal) => {
      if (isFinal && text) {
        // 实时显示识别结果（可选）
        console.log('识别结果:', text)
      }
    })

    // 设置错误回调
    sttService.value.onError((error) => {
      emit('error', error)
      stopRecording()
    })

    // 开始录音
    await sttService.value.startRecording()
    
    isRecording.value = true
    duration.value = 0
    emit('start')

    // 启动计时器
    startTimer()

    // 如果显示波形，启动波形绘制
    if (props.showWaveform) {
      startWaveformAnimation()
    }
  } catch (error) {
    emit('error', error as Error)
    isRecording.value = false
  }
}

/**
 * 结束录音
 */
async function endRecord() {
  if (!isRecording.value || !sttService.value) {
    return
  }

  try {
    // 停止录音
    const audioPath = await sttService.value.stopRecording()
    
    // 停止计时器
    stopTimer()
    
    // 停止波形动画
    stopWaveformAnimation()

    // 如果自动发送，进行 STT 转换
    if (props.autoSend && audioPath) {
      const text = await sttService.value.transcribe(audioPath)
      emit('end', audioPath, text || '', duration.value)
    } else {
      emit('end', audioPath || '', '', duration.value)
    }
  } catch (error) {
    emit('error', error as Error)
  } finally {
    stopRecording()
  }
}

/**
 * 取消录音
 */
function cancelRecord() {
  if (!isRecording.value || !sttService.value) {
    return
  }

  // 取消录音
  sttService.value.cancel()
  stopTimer()
  stopWaveformAnimation()
  stopRecording()
  emit('cancel')
}

/**
 * 停止录音清理
 */
function stopRecording() {
  isRecording.value = false
  duration.value = 0
  
  if (sttService.value) {
    sttService.value.destroy()
    sttService.value = null
  }
}

/**
 * 启动计时器
 */
function startTimer() {
  timerInterval.value = window.setInterval(() => {
    duration.value++
    emit('durationChange', duration.value)

    // 检查是否超过最大时长
    if (duration.value >= props.maxDuration) {
      endRecord()
    }
  }, 1000)
}

/**
 * 停止计时器
 */
function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

/**
 * 启动波形动画
 */
function startWaveformAnimation() {
  if (!waveformCanvas.value || !props.showWaveform) {
    return
  }

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  let offset = 0

  function draw() {
    if (!isRecording.value || !ctx) return

    ctx.clearRect(0, 0, width, height)
    
    // 绘制波形
    ctx.fillStyle = '#4CAF50'
    const barWidth = 4
    const barGap = 2
    const barCount = Math.floor(width / (barWidth + barGap))

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + barGap)
      // 使用随机高度模拟波形（实际项目中应该使用音频分析数据）
      const barHeight = Math.sin((i + offset) * 0.2) * 20 + Math.random() * 15 + 10
      const y = (height - barHeight) / 2
      
      ctx.fillRect(x, y, barWidth, barHeight)
    }

    offset += 0.5
    animationFrameId.value = requestAnimationFrame(draw)
  }

  draw()
}

/**
 * 停止波形动画
 */
function stopWaveformAnimation() {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
}

/**
 * 监听组件卸载
 */
onUnmounted(() => {
  stopTimer()
  stopWaveformAnimation()
  if (sttService.value) {
    sttService.value.destroy()
  }
})
</script>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
}

.record-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
  cursor: pointer;
}

.record-btn:active {
  transform: scale(0.95);
}

.record-btn.recording {
  background: linear-gradient(135deg, #ff5252, #ff1744);
  box-shadow: 0 4rpx 20rpx rgba(255, 82, 82, 0.4);
  animation: pulse 1s infinite;
}

.record-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.record-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.record-text {
  font-size: 24rpx;
  color: rgba(186, 230, 253, 0.65);
}

.recording .record-text {
  color: #fff;
}

/* 录音时长显示 */
.recording-timer {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff5252;
  font-family: monospace;
}

.timer-hint {
  font-size: 24rpx;
  color: rgba(186, 230, 253, 0.55);
  margin-top: 8rpx;
}

/* 波形动画 */
.wave-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 40rpx;
}

.wave-bar {
  width: 6rpx;
  background: #fff;
  border-radius: 3rpx;
  animation: wave 0.5s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1.5);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 波形 Canvas */
.waveform-canvas {
  width: 100%;
  height: 80rpx;
  margin-top: 20rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.06);
}
</style>
