<template>
  <div class="history-page">
    <header class="top-bar">
      <button
        type="button"
        class="icon-btn"
        @click="goToMoments"
      >
        <img :src="historySocialIcon" alt="邀请角色进入" class="top-icon" />
      </button>

      <div v-if="showSearch" class="header-search">
        <img :src="searchIcon" alt="搜索" class="search-icon" />
        <input
          ref="searchInputRef"
          v-model="searchKeyword"
          class="search-input"
          type="search"
          :placeholder="searchPlaceholder"
          @keydown.esc="closeSearch"
        />
      </div>
      <div v-else class="tab-switcher">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="switch-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <button
        type="button"
        class="icon-btn"
        :class="{ active: showSearch }"
        @click="toggleSearch"
      >
        <img :src="searchIcon" alt="搜索" class="top-icon" />
      </button>
    </header>

    <section v-if="activeTab === 'friends'" class="card-grid">
      <article
        v-for="character in filteredCollectedCharacters"
        :key="character.id"
        class="friend-card"
        @click="goToChat(character.id)"
      >
        <img :src="character.avatar || defaultAvatar" :alt="character.name" class="friend-avatar" />
        <div class="friend-info">
          <span class="friend-name">{{ character.name }}</span>
          <span class="friend-bio">{{ friendBios[character.id] || '…' }}</span>
        </div>
      </article>
    </section>

    <section v-else class="card-grid session-list">
      <article
        v-for="session in filteredSessionCardsForTab"
        :key="session.id"
        class="session-card"
        @click="goToSession(session)"
        @pointerdown="startLongPress(session)"
        @pointerup="cancelLongPress"
        @pointerleave="cancelLongPress"
        @contextmenu.prevent="openSessionActions(session)"
      >
        <img :src="session.avatar" :alt="session.title" class="card-avatar" />

        <div class="card-copy">
          <div class="card-header">
            <h2>{{ session.title }}</h2>
            <span v-if="session.unreadCount > 0" class="pill unread">{{ session.unreadCount }}</span>
            <span v-else class="pill subtle">{{ formatRelativeTime(session.updatedAt) }}</span>
          </div>

          <p class="card-text">{{ session.preview }}</p>
        </div>
      </article>
    </section>

    <section v-if="isEmpty" class="empty-card">
      <p class="eyebrow">{{ currentMeta.emptyEyebrow }}</p>
      <h2>{{ currentMeta.emptyTitle }}</h2>
      <p>{{ currentMeta.emptyCopy }}</p>
      <button type="button" class="primary-btn" @click="goToCharacters">去主页看看</button>
    </section>

    <input
      ref="importFileInput"
      class="hidden-input"
      type="file"
      accept=".json,.md,.zip,.txt"
      @change="handleImportFile"
    />

    <div v-if="actionSession" class="action-overlay" @click.self="actionSession = null">
      <section class="action-sheet">
        <header class="action-head">
          <strong>{{ actionSession.title }}</strong>
          <button type="button" class="close-btn" @click="actionSession = null">×</button>
        </header>
        <button type="button" class="sheet-action" @click="reportSession">举报</button>
        <button type="button" class="sheet-action" @click="exportSessionItem(actionSession)">导出</button>
        <button type="button" class="sheet-action" @click="triggerImport">导入</button>
        <button type="button" class="sheet-action danger" @click="deleteSession(actionSession)">删除</button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import historySocialIcon from '@/static/images/history-social.svg'
import searchIcon from '@/static/images/search-action.svg'
import defaultAvatar from '@/static/images/default-avatar.svg'
import { getStorageDriver } from '@/services/storage'
import { exportService } from '@/services/export'
import { dataManagementService } from '@/services/data-management'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'
import { ECHO_STORY_CHARACTER_ID, getStoredStoryRuntimeState } from '@/services/story-conversations'
import type { ICharacter } from '@/types/character'
import { MessageType, type IMessage, type IChatSession } from '@/types/chat'
import { uni } from '@/utils/uni-polyfill'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'

type HistoryTab = 'friends' | 'liked' | 'chatted'

interface SessionCard {
  id: string
  title: string
  avatar: string
  preview: string
  updatedAt: number
  unreadCount: number
  characterId: string
  sessionIds: string[]
  representativeSessionId: string
  isStoryAggregate: boolean
}

const router = useRouter()
const chatStore = useChatStore()
const characterStore = useCharacterStore()
const storage = getStorageDriver()

const activeTab = ref<HistoryTab>('chatted')
const showSearch = ref(false)
const friendBios = reactive<Record<string, string>>({})
const searchKeyword = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const previewMap = ref<Record<string, IMessage | null>>({})
const likedPreviewMap = ref<Record<string, IMessage>>({})
const sessionFullTextMap = ref<Record<string, string>>({})
const actionSession = ref<SessionCard | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const longPressTimer = ref<number | null>(null)
const storyRuntimeSnapshot = ref(getStoredStoryRuntimeState())
const suppressSessionClick = ref(false)

const tabs = [
  { key: 'friends', label: '好友' },
  { key: 'liked', label: '赞过' },
  { key: 'chatted', label: '聊过' }
] as const

const tabMeta: Record<HistoryTab, { eyebrow: string; title: string; emptyEyebrow: string; emptyTitle: string; emptyCopy: string }> = {
  friends: {
    eyebrow: '我的好友',
    title: '添加好友后，好友会在这里出现',
    emptyEyebrow: '暂无好友',
    emptyTitle: '还没有添加好友',
    emptyCopy: '在聊天页点击头像，选择"添加好友"即可。'
  },
  liked: {
    eyebrow: '赞过内容',
    title: '你真正点过赞的消息会收在这里',
    emptyEyebrow: '暂无点赞',
    emptyTitle: '还没有点赞记录',
    emptyCopy: '去聊天里点个赞，喜欢的消息就会在这里留下入口。'
  },
  chatted: {
    eyebrow: '聊过内容',
    title: '从这里继续你最近的对话',
    emptyEyebrow: '暂无会话',
    emptyTitle: '还没有聊天记录',
    emptyCopy: '回到主页开启一段新对话，后面就能直接从这里续上。'
  }
}

const collectedCharacters = computed(() =>
  [...characterStore.characters]
    .filter(character => character.isFriend)
    .sort((left, right) => right.updatedAt - left.updatedAt)
)

const likedSessions = computed(() => {
  return [...chatStore.sessions]
    .filter(session => Boolean(likedPreviewMap.value[session.id]))
    .sort((left, right) => {
      const leftTimestamp = likedPreviewMap.value[left.id]?.timestamp || 0
      const rightTimestamp = likedPreviewMap.value[right.id]?.timestamp || 0
      return rightTimestamp - leftTimestamp
    })
})

const chattedSessions = computed(() =>
  [...chatStore.sessions].sort((left, right) => right.updatedAt - left.updatedAt)
)

function isStorySession(session: IChatSession): boolean {
  const character = getCharacterById(session.characterId)
  return session.mode === 'story' || character?.sourceType === 'builtin-story'
}

function getStoryThreadTitle(character: ICharacter | undefined, fallbackSession: IChatSession): string {
  return (
    character?.sourceName?.trim() ||
    character?.background?.trim() ||
    fallbackSession.title?.trim() ||
    character?.name ||
    '回声'
  )
}

function getPreviewText(message: IMessage | null | undefined): string {
  if (!message) {
    return '暂时还没有消息内容'
  }

  if (message.contentType === MessageType.IMAGE) {
    return '发送了一张图片'
  }

  if (message.contentType === MessageType.AUDIO) {
    try {
      const parsed = JSON.parse(message.content) as { text?: string }
      return parsed.text?.trim() || '发送了一条语音'
    } catch {
      return '发送了一条语音'
    }
  }

  return message.content.trim() || '暂时还没有消息内容'
}

function getUnreadCountForSessionIds(sessionIds: string[]): number {
  const states = storyRuntimeSnapshot.value.states || {}
  const targetIds = new Set(sessionIds)
  let total = 0

  for (const state of Object.values(states)) {
    if (state?.sessionId && targetIds.has(state.sessionId)) {
      total += state.unreadCount || 0
    }
  }

  return total
}

function buildSessionCards(sourceSessions: IChatSession[]): SessionCard[] {
  const cards: SessionCard[] = []
  const storySessions = sourceSessions.filter(isStorySession)
  const normalSessions = sourceSessions.filter(session => !isStorySession(session))

  if (storySessions.length > 0) {
    const sortedStorySessions = [...storySessions].sort((left, right) => right.updatedAt - left.updatedAt)
    const representative = sortedStorySessions[0]
    const character = getCharacterById(representative.characterId)
    const latestPreviewMessage =
      sortedStorySessions
        .map(session => previewMap.value[session.id])
        .filter((message): message is IMessage => Boolean(message))
        .sort((left, right) => right.timestamp - left.timestamp)[0] || null

    cards.push({
      id: `aggregate-story-${representative.characterId}`,
      title: getStoryThreadTitle(character, representative),
      avatar: character?.avatar || defaultAvatar,
      preview: getPreviewText(latestPreviewMessage),
      updatedAt: representative.updatedAt,
      unreadCount: getUnreadCountForSessionIds(sortedStorySessions.map(session => session.id)),
      characterId: representative.characterId,
      sessionIds: sortedStorySessions.map(session => session.id),
      representativeSessionId: representative.id,
      isStoryAggregate: true,
    })
  }

  for (const session of normalSessions) {
    const previewSource =
      activeTab.value === 'liked'
        ? likedPreviewMap.value[session.id] || previewMap.value[session.id]
        : previewMap.value[session.id]

    cards.push({
      id: session.id,
      title: session.title?.trim() || getCharacterName(session.characterId),
      avatar: getCharacterAvatar(session.characterId),
      preview: getPreviewText(previewSource),
      updatedAt: session.updatedAt,
      unreadCount: 0,
      characterId: session.characterId,
      sessionIds: [session.id],
      representativeSessionId: session.id,
      isStoryAggregate: false,
    })
  }

  cards.sort((left, right) => right.updatedAt - left.updatedAt)
  return cards
}

const filteredCollectedCharacters = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return collectedCharacters.value
  }

  return collectedCharacters.value.filter(character =>
    [character.name, character.description, character.category || '', character.subCategory || '']
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

const filteredSessionCardsForTab = computed(() => {
  const source = activeTab.value === 'liked' ? likedSessions.value : chattedSessions.value
  const cards = buildSessionCards(source)
  const keyword = searchKeyword.value.trim().toLowerCase()

  if (!keyword) {
    return cards
  }

  return cards.filter(session => {
    const allText = session.sessionIds
      .map(id => sessionFullTextMap.value[id] || '')
      .join(' ')
    const content = [
      session.title,
      getCharacterCategory(session.characterId),
      session.preview,
      allText,
    ]
      .join(' ')
      .toLowerCase()
    return content.includes(keyword)
  })
})

const currentMeta = computed(() => tabMeta[activeTab.value])
const currentCount = computed(() =>
  activeTab.value === 'friends' ? filteredCollectedCharacters.value.length : filteredSessionCardsForTab.value.length
)
const isEmpty = computed(() => currentCount.value === 0)

const searchPlaceholder = computed(() =>
  activeTab.value === 'friends' ? '搜索好友角色' : '搜索角色名或聊天内容'
)

onMounted(async () => {
  await Promise.all([characterStore.loadCharacters(), loadSessions()])
  void generateFriendBios()
})

async function generateFriendBios() {
  const apiConfig = await apiConfigService.getDefaultConfig('text')
  const friends = characterStore.friendCharacters
  if (friends.length === 0) return

  // Load cached bios from localStorage first
  for (const f of friends) {
    const cached = localStorage.getItem(`echo_friend_bio_${f.id}`)
    if (cached) friendBios[f.id] = cached
  }

  if (!apiConfig) return
  const llm = new LLMAPIService(apiConfig)

  for (const f of friends) {
    if (friendBios[f.id]) continue  // already cached
    try {
      const bio = await llm.chat({
        systemPrompt: (f.settings || '').trim(),
        messages: [{ role: 'user', content: '用一句话写你的个性签名，15字以内，不要解释，只输出签名正文。' }],
      })
      if (bio.trim()) {
        friendBios[f.id] = bio.trim()
        localStorage.setItem(`echo_friend_bio_${f.id}`, bio.trim())
      }
    } catch {
      // silently skip
    }
  }
}

onActivated(() => {
  showSearch.value = false
  searchKeyword.value = ''
})

async function loadSessions() {
  await chatStore.loadSessions()

  const previews = await Promise.all(
    chatStore.sessions.map(async session => {
      const sessionMessages = await storage.getMessages(session.id)
      const latestMessage = sessionMessages[sessionMessages.length - 1] || null
      const latestLikedMessage =
        [...sessionMessages]
          .filter(message => message.isLiked)
          .sort((left, right) => right.timestamp - left.timestamp)[0] || null

      const fullText = sessionMessages.map(m => {
        if (m.contentType === MessageType.AUDIO) {
          try { return (JSON.parse(m.content) as { text?: string }).text || '' }
          catch { return '' }
        }
        return m.contentType === MessageType.TEXT ? m.content : ''
      }).join(' ')

      return {
        sessionId: session.id,
        latestMessage,
        latestLikedMessage,
        fullText,
      }
    })
  )

  previewMap.value = Object.fromEntries(
    previews.map(item => [item.sessionId, item.latestMessage])
  )
  likedPreviewMap.value = Object.fromEntries(
    previews
      .filter(item => item.latestLikedMessage)
      .map(item => [item.sessionId, item.latestLikedMessage as IMessage])
  )
  sessionFullTextMap.value = Object.fromEntries(
    previews.map(item => [item.sessionId, item.fullText])
  )
  storyRuntimeSnapshot.value = getStoredStoryRuntimeState()
}

function getCharacterById(characterId: string) {
  return characterStore.characters.find(character => character.id === characterId)
}

function getCharacterName(characterId: string): string {
  return getCharacterById(characterId)?.name || '未知角色'
}

function getCharacterAvatar(characterId: string): string {
  return getCharacterById(characterId)?.avatar || defaultAvatar
}

function getCharacterCategory(characterId: string): string {
  const character = getCharacterById(characterId)
  if (!character) {
    return '未分类'
  }

  return [character.category, character.subCategory].filter(Boolean).join(' / ') || '未分类'
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp

  if (diff < 60_000) {
    return '刚刚'
  }

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} 分钟前`
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} 小时前`
  }

  if (diff < 604_800_000) {
    return `${Math.floor(diff / 86_400_000)} 天前`
  }

  return formatDate(timestamp)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

function goToDetail(characterId: string) {
  router.push(`/character/detail/${characterId}`)
}

function goToChat(characterId: string) {
  const character = getCharacterById(characterId)
  if (character?.sourceType === 'builtin-story' || characterId === ECHO_STORY_CHARACTER_ID) {
    router.push({
      path: '/dialogue',
      query: {
        from: 'history'
      }
    })
    return
  }

  router.push({
    path: `/chat/${characterId}`,
    query: {
      from: 'history'
    }
  })
}

function goToSession(session: SessionCard) {
  if (suppressSessionClick.value) {
    suppressSessionClick.value = false
    return
  }

  if (session.isStoryAggregate) {
    router.push({
      path: '/dialogue',
      query: {
        from: 'history'
      }
    })
    return
  }

  router.push({
    path: `/chat/${session.characterId}`,
    query: {
      sessionId: session.representativeSessionId,
      from: 'history'
    }
  })
}

function goToCharacters() {
  router.push('/character')
}

function goToMoments() {
  router.push('/moments')
}

async function toggleSearch() {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    await nextTick()
    searchInputRef.value?.focus()
  } else {
    searchKeyword.value = ''
  }
}

function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
}

async function deleteSession(session: SessionCard) {
  if (!window.confirm('确认删除这段聊天记录吗？')) {
    return
  }

  for (const sessionId of session.sessionIds) {
    await chatStore.deleteSession(sessionId)
    delete previewMap.value[sessionId]
  }
  actionSession.value = null
  storyRuntimeSnapshot.value = getStoredStoryRuntimeState()
}

function startLongPress(session: SessionCard) {
  cancelLongPress()
  longPressTimer.value = window.setTimeout(() => {
    openSessionActions(session)
  }, 420)
}

function cancelLongPress() {
  if (longPressTimer.value) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

function openSessionActions(session: SessionCard) {
  cancelLongPress()
  suppressSessionClick.value = true
  actionSession.value = session
}

function reportSession() {
  actionSession.value = null
  uni.showToast({
    title: '已记录举报',
    icon: 'none'
  })
}

async function exportSessionItem(session: SessionCard) {
  try {
    const task = await exportService.exportSession(session.representativeSessionId)
    await exportService.downloadTask(task)
    actionSession.value = null
    uni.showToast({
      title: '会话已导出',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '导出失败',
      icon: 'none'
    })
  }
}

function triggerImport() {
  importFileInput.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    await dataManagementService.importFromFile(file)
    await Promise.all([characterStore.loadCharacters(), loadSessions()])
    uni.showToast({
      title: '导入完成',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '导入失败',
      icon: 'none'
    })
  } finally {
    input.value = ''
    actionSession.value = null
  }
}
</script>

<style lang="scss" scoped>
.history-page {
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
  padding: 0 0 96px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.22) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.20) 0%, transparent 44%),
    radial-gradient(ellipse at 58% 44%, rgba(103, 232, 249, 0.10) 0%, transparent 52%),
    linear-gradient(160deg, #0a0f1a 0%, #0f1626 32%, #141d32 68%, #0d121f 100%);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.history-page::-webkit-scrollbar {
  display: none;
}

.session-card,
.empty-card {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.20);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 14px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 18px;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.top-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.icon-btn.active,
.icon-btn:hover {
  opacity: 0.78;
}

.top-icon {
  width: 22px;
  height: 22px;
}

.tab-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  border-radius: 0;
  background: transparent;
}

.switch-btn {
  min-height: 42px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  transition: color var(--transition-base), box-shadow var(--transition-base);
}

.switch-btn.active {
  background: transparent;
  border: none;
  box-shadow: inset 0 -2px 0 rgba(125, 211, 252, 0.72);
  color: #ffffff;
  font-weight: 700;
}

.header-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  min-height: 48px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
}

.search-icon {
  width: 18px;
  height: 18px;
  opacity: 0.75;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
}

.search-input:focus {
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.eyebrow {
  color: rgba(226, 232, 240, 0.7);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.card-grid {
  width: min(1080px, calc(100% - 32px));
  display: grid;
  gap: 10px;
  margin: 14px auto 0;
}

// friend card
.friend-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(20px);
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base);

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(56, 189, 248, 0.22);
  }
}

.friend-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
}

.friend-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.friend-name {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-bio {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-card,
.session-card {
  display: grid;
  grid-template-columns: var(--record-avatar-size) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: var(--record-card-min-height);
  padding: var(--record-card-padding-y) var(--record-card-padding-x);
  border-radius: 16px;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base);
}

.session-list .session-card {
  grid-template-columns: var(--record-avatar-size) minmax(0, 1fr);
}

.collection-card:hover,
.session-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.12);
}

.card-avatar {
  width: var(--record-avatar-size);
  height: var(--record-avatar-size);
  border-radius: var(--record-avatar-radius);
  object-fit: cover;
  background: rgba(255, 255, 255, 0.06);
}

.card-copy {
  min-width: 0;
  min-height: var(--record-avatar-size);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header h2 {
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.35;
}

.pill {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 12px;
}

.pill.unread {
  min-width: 24px;
  text-align: center;
  background: rgba(56, 189, 248, 0.30);
  color: #ffffff;
  font-weight: 700;
}

.pill.subtle {
  color: var(--text-secondary);
}

.card-text {
  margin: 4px 0 0;
  color: var(--text-secondary);
  line-height: 1.45;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.card-action,
.primary-btn {
  min-height: var(--record-action-height);
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.card-action.danger {
  background: rgba(255, 139, 139, 0.16);
  color: #ffb0b0;
}

.empty-card {
  width: min(1080px, calc(100% - 32px));
  margin: 14px auto 0;
  padding: 28px;
  border-radius: 18px;
}

.hidden-input {
  display: none;
}

.action-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(10px);
}

.action-sheet {
  width: min(420px, 100%);
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(22, 24, 27, 0.98), rgba(10, 11, 13, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
}

.action-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.action-head strong {
  color: var(--text-primary);
}

.close-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.sheet-action {
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-align: left;
  padding: 0 14px;
  cursor: pointer;
}

.sheet-action.danger {
  color: #ffb6b6;
}

.empty-card h2 {
  margin: 10px 0;
  color: var(--text-primary);
  font-size: 26px;
}

.empty-card p {
  margin-bottom: 18px;
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 720px) {
  .collection-card,
  .session-card {
    grid-template-columns: 1fr;
  }

  .card-action {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .history-page {
    padding: 0 0 92px;
  }

  .top-bar {
    grid-template-columns: 42px minmax(0, 1fr) 42px;
    gap: 10px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .icon-btn {
    width: 42px;
    height: 42px;
  }

  .card-grid,
  .empty-card {
    width: calc(100% - 20px);
  }
}
</style>
