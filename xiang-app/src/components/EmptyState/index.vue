<template>
  <view class="empty-state" :style="{ padding: padding + 'px' }">
    <!-- 图标 -->
    <view class="empty-icon">
      <text v-if="icon">{{ icon }}</text>
      <text v-else>📭</text>
    </view>
    
    <!-- 消息 -->
    <text class="empty-message">{{ message }}</text>
    
    <!-- 操作按钮 -->
    <button 
      v-if="actionText" 
      class="empty-action"
      @click="handleAction"
    >
      {{ actionText }}
    </button>
  </view>
</template>

<script setup lang="ts">
interface Props {
  /** 图标 */
  icon?: string
  /** 提示消息 */
  message: string
  /** 操作按钮文字 */
  actionText?: string
  /** 内边距 */
  padding?: number
}

withDefaults(defineProps<Props>(), {
  icon: '',
  actionText: '',
  padding: 40
})

const emit = defineEmits<{
  action: []
}>()

/**
 * 处理点击事件
 */
function handleAction() {
  emit('action')
}
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.58;
}

.empty-message {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 24px;
}

.empty-action {
  min-height: 42px;
  padding: 0 32px;
  border: none;
  border-radius: 999px;
  background: var(--interactive-gradient);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 18px 40px rgba(113, 129, 146, 0.24);

  &:active {
    opacity: 0.85;
  }
}
</style>
