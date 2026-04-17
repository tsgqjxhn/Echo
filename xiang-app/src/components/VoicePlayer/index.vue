<template>
  <view class="voice-player" :class="{ 'playing': isPlaying, 'paused': isPaused }">
    <!-- 播放按钮 -->
    <view 
      class="play-btn" 
      :class="{ 'playing': isPlaying, 'paused': isPaused, 'disabled': disabled }"
      @click="togglePlay"
    >
      <view v-if="!isPlaying && !isPaused" class="play-icon">▶</view>
      <view v-else-if="isPlaying" class="pause-icon">⏸</view>
      <view v-else class="play-icon">▶</view>
    </view>

    <!-- 播放进度 -->
    <view class="progress-container" @click="seekProgress">
      <view class="progress-bar">
        <view 
          class="progress-fill" 
          :style="{ width: `${progressPercent}%` }"
        >
          <view class="progress-thumb" :style="{ left: `${progressPercent}%` }"></view>
        </view>
      </view>
      <text class="time-text">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</text>
    </view>

    <!-- TTS 播放按钮（用于朗读 AI 回复） -->
    <view 
      v-if="enableTTS && text" 
      class="tts-btn"
      :class="{ 'playing': isTTSSpeaking }"
      @click="toggleTTSSpeak"
    >
      <view class="tts-icon">
        <text v-if="!isTTSSpeaking">🔊</text>
        <text v-else>🔇</text>
      </view>
      <text class="tts-text">{{ ttsSpeaking ? '朗读中...' : '朗读' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { TTSService } from '@/services/tts'
import { loadTTSConfig } from '@/services/voice-settings'

/**
 * 属性定义
 */
interface Props {
  audioSrc?: string              // 音频文件路径
  text?: string                  // 要朗读的文本（TTS）
  disabled?: boolean             // 是否禁用
  enableTTS?: boolean            // 是否启用 TTS
  autoPlay?: boolean             // 是否自动播放
}

const props = withDefaults(defineProps<Props>(), {
  audioSrc: '',
  text: '',
  disabled: false,
  enableTTS: true,
  autoPlay: false
})

/**
 * 事件定义
 */
const emit = defineEmits<{
  play: []                       // 开始播放
  pause: []                      // 暂停播放
  end: []                        // 播放结束
  error: [error: Error]          // 播放错误
  ttsStart: []                   // TTS 开始
  ttsEnd: []                     // TTS 结束
}>()

/**
 * 状态变量
 */
const isPlaying = ref(false)
const isPaused = ref(false)
const isTTSSpeaking = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressPercent = ref(0)
const audioContext = ref<any>(null)
const ttsService = ref<TTSService | null>(null)
const timerInterval = ref<number | null>(null)

/**
 * 是否正在 TTS 朗读
 */
const ttsSpeaking = computed(() => {
  return isTTSSpeaking.value
})

/**
 * 初始化音频播放器
 */
function initAudioPlayer() {
  if (!props.audioSrc) return

  try {
    audioContext.value = uni.createInnerAudioContext()
    
    audioContext.value.src = props.audioSrc
    audioContext.value.autoplay = false
    audioContext.value.loop = false
    audioContext.value.obeyMuteSwitch = true

    // 监听播放
    audioContext.value.onPlay(() => {
      isPlaying.value = true
      isPaused.value = false
      emit('play')
      startProgressTimer()
    })

    // 监听暂停
    audioContext.value.onPause(() => {
      isPlaying.value = false
      isPaused.value = true
      emit('pause')
      stopProgressTimer()
    })

    // 监听继续播放
    audioContext.value.onResume(() => {
      isPlaying.value = true
      isPaused.value = false
      emit('play')
      startProgressTimer()
    })

    // 监听播放结束
    audioContext.value.onEnded(() => {
      isPlaying.value = false
      isPaused.value = false
      currentTime.value = 0
      progressPercent.value = 0
      stopProgressTimer()
      emit('end')
    })

    // 监听错误
    audioContext.value.onError((error: any) => {
      isPlaying.value = false
      isPaused.value = false
      stopProgressTimer()
      emit('error', new Error(error.errMsg || '音频播放错误'))
    })

    // 监听时长
    audioContext.value.onTimeUpdate(() => {
      currentTime.value = audioContext.value.currentTime
      duration.value = audioContext.value.duration
      
      if (duration.value > 0) {
        progressPercent.value = (currentTime.value / duration.value) * 100
      }
    })
  } catch (error) {
    emit('error', error as Error)
  }
}

/**
 * 切换播放/暂停
 */
function togglePlay() {
  if (props.disabled || !props.audioSrc) return

  if (isPlaying.value) {
    pause()
  } else if (isPaused.value) {
    resume()
  } else {
    play()
  }
}

/**
 * 播放
 */
function play() {
  if (!audioContext.value) {
    initAudioPlayer()
  }
  
  if (audioContext.value) {
    audioContext.value.play()
  }
}

/**
 * 暂停
 */
function pause() {
  if (audioContext.value) {
    audioContext.value.pause()
  }
}

/**
 * 继续播放
 */
function resume() {
  if (audioContext.value) {
    audioContext.value.resume()
  }
}

/**
 * 停止播放
 */
function stop() {
  if (audioContext.value) {
    audioContext.value.stop()
    currentTime.value = 0
    progressPercent.value = 0
    isPlaying.value = false
    isPaused.value = false
  }
}

/**
 * 跳转进度
 */
function seekProgress(event: any) {
  if (!audioContext.value || !duration.value) return

  const rect = event.currentTarget.getBoundingClientRect()
  const touchX = event.touches ? event.touches[0].clientX : event.clientX
  const percent = (touchX - rect.left) / rect.width
  
  const seekTime = percent * duration.value
  audioContext.value.seek(seekTime)
  currentTime.value = seekTime
  progressPercent.value = percent * 100
}

/**
 * 格式化时间
 */
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 启动进度定时器
 */
function startProgressTimer() {
  stopProgressTimer()
  timerInterval.value = window.setInterval(() => {
    if (audioContext.value) {
      currentTime.value = audioContext.value.currentTime
      duration.value = audioContext.value.duration
      
      if (duration.value > 0) {
        progressPercent.value = (currentTime.value / duration.value) * 100
      }
    }
  }, 500)
}

/**
 * 停止进度定时器
 */
function stopProgressTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

/**
 * TTS 朗读文本
 */
async function startTTSSpeak() {
  if (!props.text || !props.enableTTS) return

  try {
    const ttsConfig = await loadTTSConfig()

    // 停止当前 TTS
    if (ttsService.value) {
      ttsService.value.stop()
    }

    // 创建 TTS 服务
    ttsService.value = new TTSService({
      rate: ttsConfig.rate ?? 1,
      pitch: ttsConfig.pitch ?? 1,
      volume: ttsConfig.volume ?? 1,
      language: ttsConfig.language ?? 'zh-CN'
    })

    // 设置回调
    ttsService.value.onEnd(() => {
      isTTSSpeaking.value = false
      emit('ttsEnd')
    })

    ttsService.value.onError((error) => {
      isTTSSpeaking.value = false
      emit('error', error)
    })

    isTTSSpeaking.value = true
    emit('ttsStart')

    // 开始朗读
    await ttsService.value.speak(props.text)
  } catch (error) {
    isTTSSpeaking.value = false
    emit('error', error as Error)
  }
}

/**
 * 停止 TTS 朗读
 */
function stopTTSSpeak() {
  if (ttsService.value) {
    ttsService.value.stop()
  }
  isTTSSpeaking.value = false
}

/**
 * 切换 TTS 朗读
 */
function toggleTTSSpeak() {
  if (isTTSSpeaking.value) {
    stopTTSSpeak()
  } else {
    startTTSSpeak()
  }
}

/**
 * 设置 TTS 参数
 */
function setTTSConfig(config: { rate?: number; pitch?: number; volume?: number }) {
  if (ttsService.value) {
    ttsService.value.setVoice(config)
  }
}

/**
 * 监听属性变化
 */
watch(() => props.audioSrc, (newSrc) => {
  if (newSrc && newSrc !== props.audioSrc) {
    // 音频源变化，重新初始化
    stop()
    if (audioContext.value) {
      audioContext.value.destroy()
      audioContext.value = null
    }
    initAudioPlayer()
  }
})

/**
 * 组件卸载
 */
onUnmounted(() => {
  stop()
  stopProgressTimer()
  stopTTSSpeak()
  
  if (audioContext.value) {
    audioContext.value.destroy()
    audioContext.value = null
  }
  
  if (ttsService.value) {
    ttsService.value.destroy()
    ttsService.value = null
  }
})

/**
 * 暴露方法
 */
defineExpose({
  play,
  pause,
  stop,
  togglePlay,
  startTTSSpeak,
  stopTTSSpeak,
  toggleTTSSpeak,
  setTTSConfig
})
</script>

<style scoped>
.voice-player {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
}

/* 播放按钮 */
.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  box-shadow: 0 4rpx 12rpx rgba(76, 175, 80, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn.playing {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  animation: pulse 1s infinite;
}

.play-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-icon,
.pause-icon {
  font-size: 32rpx;
  color: #fff;
}

/* 进度条容器 */
.progress-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4rpx;
  position: relative;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 4rpx;
  position: relative;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
  width: 24rpx;
  height: 24rpx;
  background: #4CAF50;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.time-text {
  font-size: 22rpx;
  color: rgba(186, 230, 253, 0.55);
  margin-top: 8rpx;
  font-family: monospace;
}

/* TTS 按钮 */
.tts-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 20rpx;
  margin-left: 20rpx;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(33, 150, 243, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tts-btn:active {
  transform: scale(0.95);
}

.tts-btn.playing {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  animation: pulse 1s infinite;
}

.tts-icon {
  font-size: 36rpx;
}

.tts-text {
  font-size: 20rpx;
  color: #fff;
  margin-top: 4rpx;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>
