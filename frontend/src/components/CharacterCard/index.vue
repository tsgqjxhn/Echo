<template>
  <view class="character-card" @click="handleClick" @contextmenu.prevent="handleContextMenu">
    <view class="card-topline">
      <view class="card-avatar">
        <image v-if="character.avatar" :src="character.avatar" class="avatar-image" mode="aspectFill" />
        <text v-else class="avatar-placeholder">{{ getAvatarText(character.name) }}</text>
      </view>
      <view class="card-tags" v-if="tags.length">
        <text v-for="(tag, idx) in tags" :key="idx" class="meta-chip">{{ tag }}</text>
      </view>
    </view>
    <view class="card-copy">
      <text class="card-name">{{ character.name }}</text>
      <text class="card-description">{{ truncateText(character.description, 50) }}</text>
      <text class="card-time" v-if="showTime">{{ formatTime(character.updatedAt) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ICharacter } from '@/types/character'

interface Props {
  /** 角色数据 */
  character: ICharacter
  /** 是否显示时间 */
  showTime?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showTime: false
})

const emit = defineEmits<{
  click: []
  longpress: []
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

/**
 * 处理长按/右键菜单
 */
function handleContextMenu() {
  emit('longpress')
}

const tags = computed(() => {
  const list: string[] = []
  if (props.character.mode === 'group-chat') list.push('群聊')
  else if (props.character.mode === 'group-challenge') list.push('群聊闯关')
  else if (props.character.mode === 'challenge-dialogue') list.push('闯关式对话')
  else list.push('自由对话')

  if (props.character.category) list.push(props.character.category)
  if (props.character.subCategory) list.push(props.character.subCategory)
  return list
})
</script>

<style lang="scss" scoped>
.character-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 104px;
  padding: 7px 6px 8px;
  border: none;
  border-radius: 0;
  background: rgba(8, 17, 28, 0.96);
  box-shadow: none;
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition-base);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;

  &:hover {
    transform: none;
    border-color: rgba(255, 255, 255, 0.98);
    box-shadow: none;
  }
}

.card-topline {
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.card-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.card-tags {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  min-width: 0;
}

.meta-chip {
  padding: 2px 6px;
  border-radius: 0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.92);
  font-size: 10px;
}

.card-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  width: 100%;
  margin-top: 4px;
}

.card-name {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-time {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
