<template>
  <view class="character-card" @click="handleClick">
    <!-- 头像 -->
    <view class="card-avatar">
      <image 
        v-if="character.avatar" 
        :src="character.avatar" 
        class="avatar-image"
        mode="aspectFill"
      />
      <text v-else class="avatar-placeholder">
        {{ getAvatarText(character.name) }}
      </text>
    </view>
    
    <!-- 内容 -->
    <view class="card-content">
      <!-- 名称 -->
      <view class="card-header">
        <text class="card-name">{{ character.name }}</text>
      </view>
      
      <!-- 描述 -->
      <text class="card-description" :title="character.description">
        {{ truncateText(character.description, 50) }}
      </text>
      
      <!-- 更新时间 -->
      <text class="card-time" v-if="showTime">
        {{ formatTime(character.updatedAt) }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ICharacter } from '@/types/character'

interface Props {
  /** 角色数据 */
  character: ICharacter
  /** 是否显示时间 */
  showTime?: boolean
}

withDefaults(defineProps<Props>(), {
  showTime: false
})

const emit = defineEmits<{
  click: []
}>()

/**
 * 获取头像文字
 */
function getAvatarText(name: string): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

/**
 * 截断文本
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  // 今天内显示时分
  if (diff < 24 * 60 * 60 * 1000) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 显示日期
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 处理点击
 */
function handleClick() {
  emit('click')
}

</script>

<style lang="scss" scoped>
.character-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  margin-bottom: 12px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);

  &:hover,
  &:active {
    transform: translateY(-2px);
    border-color: var(--accent-strong);
    box-shadow: var(--shadow-lg);
  }
}

.card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 20px;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-secondary);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.card-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}


.card-description {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-time {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
