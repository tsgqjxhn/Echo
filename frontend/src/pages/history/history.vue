<template>
  <div class="history-page">
    <header class="top-bar">
      <button
        type="button"
        class="icon-btn"
        @click="goToMoments"
      >
        <img :src="historySocialIcon" alt="邀请角色进入" class="top-icon" />
        <span v-if="momentsBadge" class="entry-badge" aria-hidden="true"></span>
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
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
          <span v-if="getTabBadge(tab.key)" class="tab-badge" aria-hidden="true"></span>
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

    <div v-if="activeTab === 'contacts'" class="contacts-sub-tabs">
      <button
        type="button"
        class="sub-tab"
        :class="{ active: contactsSubTab === 'friends' }"
        @click="selectContactsSubTab('friends')"
      >
        好友
        <span v-if="friendsBadge" class="tab-badge" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        class="sub-tab"
        :class="{ active: contactsSubTab === 'groups' }"
        @click="selectContactsSubTab('groups')"
      >
        群聊
        <span v-if="groupsBadge" class="tab-badge" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        class="sub-tab-add"
        :title="contactsSubTab === 'groups' ? '搜索群聊' : '搜索联系人'"
        @click="openContactSearch"
      >
        +
      </button>
    </div>

    <Teleport to="body">
      <div v-if="showContactSearch" class="contact-search-page">
        <header class="contact-search-topbar">
          <button type="button" class="contact-topbar-back" @click="closeContactSearch">
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path d="M768 112.512L718.016 64 256 512l462.016 448 49.984-48.512L355.968 512z" fill="currentColor"/>
            </svg>
          </button>
          <div class="contact-search-input-wrap">
            <svg viewBox="0 0 24 24" width="15" height="15" class="contact-search-icon">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
            <input
              ref="contactSearchInputRef"
              v-model="contactSearchKeyword"
              class="contact-search-input"
              type="search"
              placeholder="搜索用户/群聊"
              @keydown.esc="closeContactSearch"
            />
          </div>
        </header>

        <div class="contact-search-body">
          <button type="button" class="create-group-btn" @click="openGroupCreateSheet">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
            </svg>
            创建群聊
          </button>

          <div class="contact-search-results">
            <template v-if="contactSearchKeyword.trim()">
              <template v-if="contactSearchFriends.length > 0">
                <p class="contact-search-section">好友</p>
                <article
                  v-for="c in contactSearchFriends"
                  :key="c.id"
                  class="contact-search-item"
                  @click="goToChat(c.id); closeContactSearch()"
                >
                  <img :src="c.avatar || defaultAvatar" :alt="c.name" class="contact-search-avatar" />
                  <div class="contact-search-info">
                    <span class="contact-search-name">{{ c.name }}</span>
                    <span class="contact-search-bio">{{ friendBios[c.id] || c.description?.slice(0, 40) || '暂无签名' }}</span>
                  </div>
                </article>
              </template>

              <template v-if="contactSearchGroups.length > 0">
                <p class="contact-search-section">群聊</p>
                <article
                  v-for="c in contactSearchGroups"
                  :key="c.id"
                  class="contact-search-item"
                >
                  <img :src="c.avatar || defaultAvatar" :alt="c.name" class="contact-search-avatar" />
                  <div class="contact-search-info">
                    <span class="contact-search-name">{{ c.name }}</span>
                    <span class="contact-search-bio">{{ c.description?.slice(0, 40) || '暂无公告' }}</span>
                  </div>
                  <button type="button" class="join-group-btn" @click.stop="openJoinDialog(c)">申请加入</button>
                </article>
              </template>

              <div v-if="contactSearchFriends.length === 0 && contactSearchGroups.length === 0" class="contact-search-empty">
                未找到匹配的联系人
              </div>
            </template>

            <div v-else class="contact-search-hint">
              输入用户名或群聊名搜索
            </div>
          </div>
        </div>

        <div v-if="joinGroupTarget" class="join-overlay" @click.self="joinGroupTarget = null">
          <section class="join-modal">
            <strong class="join-modal-title">申请加入「{{ joinGroupTarget.name }}」</strong>
            <p class="join-modal-hint">验证消息会被评测，通过后即可加入群聊。</p>
            <textarea v-model="joinVerifyText" class="join-verify-input" placeholder="填写验证消息…"></textarea>
            <div class="join-modal-actions">
              <button type="button" class="join-cancel-btn" @click="joinGroupTarget = null">取消</button>
              <button type="button" class="join-submit-btn" :disabled="!joinVerifyText.trim()" @click="submitJoinGroup">发送申请</button>
            </div>
          </section>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showGroupCreateSheet" class="group-create-overlay" @click.self="closeGroupCreateSheet">
        <section class="group-create-sheet">
          <header class="group-create-head">
            <button type="button" class="contact-topbar-back" @click="closeGroupCreateSheet">
              <svg viewBox="0 0 1024 1024" width="20" height="20">
                <path d="M768 112.512L718.016 64 256 512l462.016 448 49.984-48.512L355.968 512z" fill="currentColor"/>
              </svg>
            </button>
            <strong>创建群聊</strong>
            <button type="button" class="group-create-submit" :disabled="creatingGroup" @click="submitGroupChat">
              {{ creatingGroup ? '创建中' : '完成' }}
            </button>
          </header>

          <div class="group-create-body">
            <label class="group-avatar-editor">
              <img :src="groupForm.avatar.trim() || groupAvatarPreview" alt="群头像" />
              <span>群头像</span>
              <input v-model="groupForm.avatar" placeholder="可粘贴图片地址" />
            </label>

            <label class="group-field">
              <span>群聊名称</span>
              <input v-model="groupForm.name" maxlength="30" placeholder="例如：深夜频道" />
            </label>

            <label class="group-field">
              <span>群公告</span>
              <textarea v-model="groupForm.announcement" rows="3" maxlength="300" placeholder="写给群成员看的公告" />
            </label>

            <section class="invite-panel">
              <div class="invite-panel-head">
                <span>邀请角色</span>
                <small>已选 {{ selectedMemberIds.length }}</small>
              </div>
              <div class="invite-member-list">
                <button
                  v-for="member in inviteCandidates"
                  :key="member.id"
                  type="button"
                  class="invite-member-item"
                  :class="{ active: selectedMemberIds.includes(member.id) }"
                  @click="toggleGroupMember(member.id)"
                >
                  <img :src="member.avatar || defaultAvatar" :alt="member.name" />
                  <span>{{ member.name }}</span>
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Teleport>

    <section v-if="activeTab === 'contacts'" class="card-grid">
      <article
        v-for="req in pendingFriendRequests"
        :key="req.id"
        class="friend-card friend-request-card"
      >
        <img :src="req.characterAvatar || defaultAvatar" :alt="req.characterName" class="friend-avatar" />
        <div class="friend-info">
          <span class="friend-name">{{ req.characterName }}</span>
          <span class="friend-bio">请求添加你为好友</span>
        </div>
        <button type="button" class="friend-accept-btn" @click.stop="acceptFriendReq(req.characterId)">通过</button>
      </article>
      <article
        v-for="character in filteredCollectedCharacters"
        :key="character.id"
        class="friend-card"
        :class="{ 'friend-card--group': isGroupCharacter(character) }"
        @click="goToChat(character.id)"
      >
        <img
          :src="character.avatar || defaultAvatar"
          :alt="character.name"
          class="friend-avatar"
          @click.stop="isGroupCharacter(character) ? openGroupSheet(character) : undefined"
        />
        <div class="friend-info">
          <span class="friend-name">{{ character.name }}</span>
          <span v-if="isGroupCharacter(character)" class="friend-bio">
            {{ character.members?.length || 0 }} 位成员<template v-if="friendBios[character.id]"> · {{ friendBios[character.id] }}</template>
          </span>
          <span v-else class="friend-bio">{{ friendBios[character.id] || '…' }}</span>
        </div>
        <div v-if="isGroupCharacter(character) && character.members?.length" class="group-member-cluster">
          <img
            v-for="memberId in (character.members || []).slice(0, 4)"
            :key="memberId"
            :src="getCharacterAvatar(memberId)"
            :alt="getCharacterName(memberId)"
            class="group-member-thumb"
            @click.stop="openGroupSheet(character)"
          />
        </div>
      </article>
    </section>

    <Teleport to="body">
      <div v-if="groupSheetTarget" class="group-sheet-overlay" @click.self="groupSheetTarget = null">
        <section class="group-sheet">
          <div class="group-sheet-head">
            <img :src="groupSheetTarget.avatar || defaultAvatar" :alt="groupSheetTarget.name" class="group-sheet-avatar" />
            <div class="group-sheet-info">
              <strong>{{ groupSheetTarget.name }}</strong>
              <span>{{ groupSheetTarget.members?.length || 0 }} 位成员</span>
            </div>
          </div>
          <button type="button" class="group-sheet-btn" @click="groupSheetTarget && enterGroup(groupSheetTarget)">进入该群</button>
        </section>
      </div>
    </Teleport>

    <section v-if="activeTab === 'liked'" class="card-grid">
      <article
        v-for="character in filteredLikedCharacters"
        :key="character.id"
        class="friend-card"
        @click="goToChat(character.id)"
      >
        <img :src="character.avatar || defaultAvatar" :alt="character.name" class="friend-avatar" />
        <div class="friend-info">
          <span class="friend-name">{{ character.name }}</span>
          <span class="friend-bio">{{ character.description?.slice(0, 40) || '…' }}</span>
        </div>
      </article>
    </section>

    <section v-if="activeTab === 'chatted'" class="card-grid session-list">
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
            <span v-if="session.hasUnread" class="session-unread-dot" aria-hidden="true"></span>
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
import { computed, nextTick, onActivated, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import historySocialIcon from '@/static/images/history-social.svg'
import searchIcon from '@/static/images/search-action.svg'
import defaultAvatar from '@/static/images/default-avatar.svg'
import { getStorageDriver } from '@/services/storage'
import { exportService } from '@/services/export'
import { dataManagementService } from '@/services/data-management'
import { useCharacterStore } from '@/stores/character'
import { useFriendRequestStore } from '@/stores/friend-requests'
import { useChatStore } from '@/stores/chat'
import { useMomentsStore } from '@/stores/moments'
import {
  ECHO_STORY_CHARACTER_ID,
  getStoredStoryRuntimeState,
  loadStoryLibrary,
  loadStoryRuntimeState,
  saveStoryRuntimeState,
} from '@/services/story-conversations'
import {
  HISTORY_READ_EVENT,
  hasUnreadContacts,
  hasUnreadLiked,
  hasUnreadMoments,
  hasUnreadSession,
  loadHistoryReadState,
  markContactsRead,
  markLikedRead,
  markMomentsRead,
  markSessionsRead,
} from '@/services/history-unread'
import type { ICharacter } from '@/types/character'
import { MessageType, type IMessage, type IChatSession } from '@/types/chat'
import { uni } from '@/utils/uni-polyfill'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'
import { createSilverAvatarDataUrl } from '@/utils/silver-art'
import { generateUUID } from '@/utils/uuid'

type HistoryTab = 'contacts' | 'liked' | 'chatted'
type ContactsSubTab = 'friends' | 'groups'

interface SessionCard {
  id: string
  title: string
  avatar: string
  preview: string
  updatedAt: number
  hasUnread: boolean
  characterId: string
  sessionIds: string[]
  representativeSessionId: string
  isStoryAggregate: boolean
}

const router = useRouter()
const chatStore = useChatStore()
const characterStore = useCharacterStore()
const momentsStore = useMomentsStore()
const friendRequestStore = useFriendRequestStore()
const storage = getStorageDriver()

const activeTab = ref<HistoryTab>('chatted')
const contactsSubTab = ref<ContactsSubTab>('friends')
const showSearch = ref(false)
const showContactSearch = ref(false)
const contactSearchKeyword = ref('')
const contactSearchInputRef = ref<HTMLInputElement | null>(null)
const groupSheetTarget = ref<ICharacter | null>(null)
const joinGroupTarget = ref<ICharacter | null>(null)
const joinVerifyText = ref('')
const showGroupCreateSheet = ref(false)
const creatingGroup = ref(false)
const selectedMemberIds = ref<string[]>([])
const groupForm = ref({
  name: '',
  avatar: '',
  announcement: '',
})
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
const readState = ref(loadHistoryReadState())

const tabs = [
  { key: 'contacts', label: '联系人' },
  { key: 'liked', label: '赞过' },
  { key: 'chatted', label: '聊过' }
] as const

const tabMeta: Record<HistoryTab, { eyebrow: string; title: string; emptyEyebrow: string; emptyTitle: string; emptyCopy: string }> = {
  contacts: {
    eyebrow: '我的联系人',
    title: '好友和群聊都在这里',
    emptyEyebrow: '暂无联系人',
    emptyTitle: '还没有添加好友',
    emptyCopy: '在聊天页点击头像，选择"添加好友"即可。'
  },
  liked: {
    eyebrow: '赞过角色',
    title: '你点过赞的角色会在这里',
    emptyEyebrow: '暂无点赞',
    emptyTitle: '还没有点赞记录',
    emptyCopy: '去聊天里点个赞，角色就会在这里留下。'
  },
  chatted: {
    eyebrow: '聊过内容',
    title: '从这里继续你最近的对话',
    emptyEyebrow: '暂无会话',
    emptyTitle: '还没有聊天记录',
    emptyCopy: '回到主页开启一段新对话，后面就能直接从这里续上。'
  }
}

function isGroupCharacter(character: ICharacter): boolean {
  return character.mode === 'group-chat' || character.mode === 'group-challenge'
}

const friendCharacters = computed(() =>
  [...characterStore.characters]
    .filter(c => c.isFriend && !isGroupCharacter(c))
    .sort((a, b) => b.updatedAt - a.updatedAt)
)

const groupCharacters = computed(() =>
  [...characterStore.characters]
    .filter(c => isGroupCharacter(c))
    .sort((a, b) => b.updatedAt - a.updatedAt)
)

const inviteCandidates = computed(() =>
  characterStore.characters.filter(character =>
    character.sourceType !== 'builtin-story' &&
    !isGroupCharacter(character)
  )
)

const groupAvatarPreview = computed(() =>
  createSilverAvatarDataUrl(groupForm.value.name.trim() || '群')
)

const likedCharacters = computed(() =>
  [...characterStore.characters]
    .filter(c => c.isLiked)
    .sort((a, b) => b.updatedAt - a.updatedAt)
)

const contactsCharacters = computed(() =>
  contactsSubTab.value === 'friends' ? friendCharacters.value : groupCharacters.value
)

const collectedCharacters = computed(() => contactsCharacters.value)

const contactSearchFriends = computed(() => {
  const keyword = contactSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return []
  return characterStore.characters
    .filter(c => c.isFriend && !isGroupCharacter(c) && c.name.toLowerCase().includes(keyword))
    .slice(0, 10)
})

const contactSearchGroups = computed(() => {
  const keyword = contactSearchKeyword.value.trim().toLowerCase()
  if (!keyword) return []
  return characterStore.characters
    .filter(c => isGroupCharacter(c) && c.name.toLowerCase().includes(keyword))
    .slice(0, 10)
})

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
  [...chatStore.sessions].sort((left, right) => getSessionDisplayTime(right) - getSessionDisplayTime(left))
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

function getMessageTime(message: IMessage | null | undefined): number {
  return typeof message?.timestamp === 'number' ? message.timestamp : 0
}

function getSessionDisplayTime(session: IChatSession): number {
  return getMessageTime(previewMap.value[session.id]) || session.updatedAt
}

function getSessionCardUnread(sessionIds: string[], latestTimestamp: number): boolean {
  return hasUnreadSession(sessionIds, latestTimestamp, readState.value)
}

function buildSessionCards(sourceSessions: IChatSession[]): SessionCard[] {
  const cards: SessionCard[] = []
  const storySessions = sourceSessions.filter(isStorySession)
  const normalSessions = sourceSessions.filter(session => !isStorySession(session))

  if (storySessions.length > 0) {
    const sortedStorySessions = [...storySessions].sort(
      (left, right) => getSessionDisplayTime(right) - getSessionDisplayTime(left)
    )
    const representative = sortedStorySessions[0]
    const character = getCharacterById(representative.characterId)
    const latestPreviewMessage =
      sortedStorySessions
        .map(session => previewMap.value[session.id])
        .filter((message): message is IMessage => Boolean(message))
        .sort((left, right) => right.timestamp - left.timestamp)[0] || null

    const sessionIds = sortedStorySessions.map(session => session.id)
    const latestMessageTimestamp = getMessageTime(latestPreviewMessage)

    cards.push({
      id: `aggregate-story-${representative.characterId}`,
      title: getStoryThreadTitle(character, representative),
      avatar: character?.avatar || defaultAvatar,
      preview: getPreviewText(latestPreviewMessage),
      updatedAt: latestMessageTimestamp || getSessionDisplayTime(representative),
      hasUnread: getSessionCardUnread(sessionIds, latestMessageTimestamp),
      characterId: representative.characterId,
      sessionIds,
      representativeSessionId: representative.id,
      isStoryAggregate: true,
    })
  }

  for (const session of normalSessions) {
    const previewSource = previewMap.value[session.id]

    cards.push({
      id: session.id,
      title: session.title?.trim() || getCharacterName(session.characterId),
      avatar: getCharacterAvatar(session.characterId),
      preview: getPreviewText(previewSource),
      updatedAt: getMessageTime(previewSource) || session.updatedAt,
      hasUnread: getSessionCardUnread([session.id], getMessageTime(previewSource)),
      characterId: session.characterId,
      sessionIds: [session.id],
      representativeSessionId: session.id,
      isStoryAggregate: false,
    })
  }

  cards.sort((left, right) => right.updatedAt - left.updatedAt)
  return cards
}

function filterCharacters(list: ICharacter[]) {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return list
  return list.filter(c =>
    [c.name, c.description, c.category || '', c.subCategory || '']
      .join(' ').toLowerCase().includes(keyword)
  )
}

const filteredCollectedCharacters = computed(() => filterCharacters(collectedCharacters.value))
const filteredLikedCharacters = computed(() => filterCharacters(likedCharacters.value))
const pendingFriendRequests = computed(() => friendRequestStore.pendingRequests)

const filteredSessionCardsForTab = computed(() => {
  const source = chattedSessions.value
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
const currentCount = computed(() => {
  if (activeTab.value === 'contacts') return filteredCollectedCharacters.value.length
  if (activeTab.value === 'liked') return filteredLikedCharacters.value.length
  return filteredSessionCardsForTab.value.length
})
const isEmpty = computed(() => currentCount.value === 0)
const momentsBadge = computed(() => hasUnreadMoments(momentsStore.posts, readState.value))
const friendsBadge = computed(() => hasUnreadContacts(characterStore.characters, 'friends', readState.value))
const groupsBadge = computed(() => hasUnreadContacts(characterStore.characters, 'groups', readState.value))
const likedBadge = computed(() => hasUnreadLiked(characterStore.characters, readState.value))
const chattedBadge = computed(() => filteredSessionCardsForTab.value.some(session => session.hasUnread))

const searchPlaceholder = computed(() =>
  activeTab.value === 'contacts' ? '搜索联系人' : '搜索角色名或聊天内容'
)

function getTabBadge(tab: HistoryTab): boolean {
  if (tab === 'contacts') {
    return friendsBadge.value || groupsBadge.value
  }

  if (tab === 'liked') {
    return likedBadge.value
  }

  return chattedBadge.value
}

function refreshReadState() {
  readState.value = loadHistoryReadState()
}

function selectContactsSubTab(tab: ContactsSubTab) {
  contactsSubTab.value = tab
  readState.value = markContactsRead(tab)
}

function selectTab(tab: HistoryTab) {
  activeTab.value = tab

  if (tab === 'contacts') {
    selectContactsSubTab(contactsSubTab.value)
  } else if (tab === 'liked') {
    readState.value = markLikedRead()
  }
}

onMounted(async () => {
  await Promise.all([characterStore.loadCharacters(), loadSessions()])
  window.addEventListener(HISTORY_READ_EVENT, refreshReadState)
  void generateFriendBios()
})

onUnmounted(() => {
  window.removeEventListener(HISTORY_READ_EVENT, refreshReadState)
})

async function generateFriendBios() {
  const apiConfig = await apiConfigService.getDefaultConfig('text')
  const contacts = [...friendCharacters.value, ...groupCharacters.value]
  if (contacts.length === 0) return

  for (const f of contacts) {
    const cached = localStorage.getItem(`echo_friend_bio_${f.id}`)
    if (cached) friendBios[f.id] = cached
  }

  if (!apiConfig) return
  const llm = new LLMAPIService(apiConfig)

  for (const f of contacts) {
    if (friendBios[f.id]) continue
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
  refreshReadState()
  void loadSessions()
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
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`

  const d = new Date(timestamp)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function goToDetail(characterId: string) {
  router.push(`/character/detail/${characterId}`)
}

function markStorySessionsRead(sessionIds: string[]) {
  const targetIds = new Set(sessionIds)
  const library = loadStoryLibrary()
  const runtime = loadStoryRuntimeState(library.conversations)
  let changed = false

  for (const state of Object.values(runtime.states || {})) {
    if (state.sessionId && targetIds.has(state.sessionId)) {
      state.unreadCount = 0
      state.lastUpdatedAt = Date.now()
      changed = true
    }
  }

  if (changed) {
    saveStoryRuntimeState(runtime)
    storyRuntimeSnapshot.value = runtime
  }
}

function acceptFriendReq(characterId: string) {
  characterStore.toggleFriend(characterId)
  friendRequestStore.acceptRequest(characterId)
}

function goToChat(characterId: string) {
  if (activeTab.value === 'contacts') {
    readState.value = markContactsRead(contactsSubTab.value)
  } else if (activeTab.value === 'liked') {
    readState.value = markLikedRead()
  }

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
    readState.value = markSessionsRead(session.sessionIds)
    markStorySessionsRead(session.sessionIds)
    router.push({
      path: '/dialogue',
      query: {
        from: 'history'
      }
    })
    return
  }

  readState.value = markSessionsRead(session.sessionIds)
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
  readState.value = markMomentsRead()
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

async function openContactSearch() {
  showContactSearch.value = true
  contactSearchKeyword.value = ''
  await nextTick()
  contactSearchInputRef.value?.focus()
}

function closeContactSearch() {
  showContactSearch.value = false
  contactSearchKeyword.value = ''
  joinGroupTarget.value = null
  joinVerifyText.value = ''
}

function openGroupSheet(group: ICharacter) {
  groupSheetTarget.value = group
}

function enterGroup(group: ICharacter) {
  groupSheetTarget.value = null
  goToChat(group.id)
}

function openJoinDialog(group: ICharacter) {
  joinGroupTarget.value = group
  joinVerifyText.value = ''
}

function submitJoinGroup() {
  if (!joinGroupTarget.value || !joinVerifyText.value.trim()) return
  const target = joinGroupTarget.value
  joinGroupTarget.value = null
  joinVerifyText.value = ''
  closeContactSearch()
  uni.showToast({ title: '申请已发送，请稍候', icon: 'none' })
  window.setTimeout(() => {
    goToChat(target.id)
  }, 1200)
}

function openGroupCreateSheet() {
  closeContactSearch()
  contactsSubTab.value = 'groups'
  groupForm.value = { name: '', avatar: '', announcement: '' }
  selectedMemberIds.value = []
  showGroupCreateSheet.value = true
}

function closeGroupCreateSheet() {
  showGroupCreateSheet.value = false
}

function toggleGroupMember(id: string) {
  selectedMemberIds.value = selectedMemberIds.value.includes(id)
    ? selectedMemberIds.value.filter(item => item !== id)
    : [...selectedMemberIds.value, id]
}

async function submitGroupChat() {
  const name = groupForm.value.name.trim()
  if (!name) {
    uni.showToast({ title: '请填写群聊名称', icon: 'none' })
    return
  }

  creatingGroup.value = true
  try {
    const members = characterStore.characters.filter(item => selectedMemberIds.value.includes(item.id))
    const id = await characterStore.createCharacter({
      id: generateUUID(),
      name,
      avatar: groupForm.value.avatar.trim() || createSilverAvatarDataUrl(name),
      background: '多人 / 普通群聊',
      description: groupForm.value.announcement.trim() || `${name} 的群聊`,
      greeting: `你创建了群聊「${name}」。`,
      settings: [
        '【群聊规则】',
        '这是一个类似手机 QQ 的群聊。用户本人始终在群里。',
        '群成员按排队模式依次发言，避免所有角色同时抢话。',
        groupForm.value.announcement.trim() ? `群公告：${groupForm.value.announcement.trim()}` : '',
        members.length ? `已邀请角色：${members.map(item => item.name).join('、')}` : '当前只有用户本人，可继续邀请角色加入。',
      ].filter(Boolean).join('\n'),
      mode: 'group-chat',
      category: '多人',
      subCategory: '普通群聊',
      memberIds: members.map(item => item.id),
      members: members.map(item => item.name),
      groupAnnouncement: groupForm.value.announcement.trim(),
      groupChatMode: 'queue',
      sourceType: 'manual',
      tags: ['多人', '普通群聊', '群聊'],
      isFriend: true,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    closeGroupCreateSheet()
    await characterStore.loadCharacters({ sortBy: 'updatedAt', sortOrder: 'desc' })
    contactsSubTab.value = 'groups'
    router.push(`/chat/${id}`)
  } catch {
    uni.showToast({ title: '创建群聊失败', icon: 'none' })
  } finally {
    creatingGroup.value = false
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
  position: relative;
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

.entry-badge,
.tab-badge {
  position: absolute;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(5, 13, 20, 0.92), 0 0 10px rgba(239, 68, 68, 0.62);
  pointer-events: none;
}

.entry-badge {
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
}

.tab-badge {
  top: 9px;
  right: 10px;
  width: 7px;
  height: 7px;
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
  position: relative;
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

.contacts-sub-tabs {
  position: sticky;
  top: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  z-index: 15;
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0 16px;
  min-height: 44px;
  background: var(--top-bar-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--top-bar-border);
}

.contacts-sub-tabs::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.sub-tab {
  position: relative;
  flex: none;
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: color var(--transition-base), box-shadow var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: inset 0 -2px 0 rgba(125, 211, 252, 0.72);
  }
}

.sub-tab-add {
  margin-left: auto;
  align-self: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-size: 18px;
  line-height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
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

.friend-request-card {
  border-color: rgba(56, 189, 248, 0.30);
  background: rgba(56, 189, 248, 0.08);
}

.friend-accept-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.25);
  color: #e0f2fe;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--transition-base);

  &:hover { background: rgba(56, 189, 248, 0.40); }
}

.friend-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
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

.session-unread-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 2px rgba(5, 13, 20, 0.92), 0 0 10px rgba(239, 68, 68, 0.62);
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
  z-index: 10000;
  display: flex;
  align-items: center;
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

// ── contact search page ──────────────────────────────────────────────
.contact-search-page {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.16) 0%, transparent 44%),
    linear-gradient(160deg, #0a0f1a 0%, #0f1626 32%, #141d32 68%, #0d121f 100%);
}

.contact-search-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + var(--top-bar-height));
  background: var(--top-bar-surface);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-bottom: 1px solid var(--top-bar-border);
}

.contact-topbar-back {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 10px;
  transition: color var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }
}

.contact-search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  min-height: 40px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
}

.contact-search-icon {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.contact-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.contact-search-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 40px;
}

.create-group-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  margin: 14px 0 4px;
  padding: 0 18px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.07);
  color: #7dd3fc;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.14);
    border-color: rgba(56, 189, 248, 0.28);
  }

  svg {
    flex-shrink: 0;
  }
}

.group-create-overlay {
  position: fixed;
  inset: 0;
  z-index: 10070;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 18% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    linear-gradient(180deg, #07101a 0%, #0a1724 100%);
}

.group-create-sheet {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: var(--text-primary);
}

.group-create-head {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(5, 13, 20, 0.82);
  backdrop-filter: blur(18px);
}

.group-create-head strong {
  text-align: center;
  font-size: 17px;
}

.group-create-submit {
  min-width: 56px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.92);
  color: #06101a;
  font-weight: 700;
  cursor: pointer;
}

.group-create-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.group-create-body {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 28px);
}

.group-avatar-editor {
  display: grid;
  grid-template-columns: 64px 1fr;
  grid-template-rows: auto auto;
  gap: 6px 14px;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid rgba(56, 189, 248, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
}

.group-avatar-editor img {
  grid-row: 1 / span 2;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
}

.group-avatar-editor span,
.group-field span,
.invite-panel-head span {
  color: var(--text-primary);
  font-weight: 700;
}

.group-avatar-editor input,
.group-field input,
.group-field textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  padding: 11px 12px;
  font: inherit;
  outline: none;
}

.group-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.group-field textarea {
  resize: vertical;
  min-height: 92px;
}

.invite-panel {
  margin-top: 18px;
}

.invite-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.invite-panel-head small {
  color: var(--text-secondary);
}

.invite-member-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.invite-member-item {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  padding: 10px 6px;
  cursor: pointer;
}

.invite-member-item.active {
  border-color: rgba(56, 189, 248, 0.42);
  background: rgba(56, 189, 248, 0.12);
  color: var(--text-primary);
}

.invite-member-item img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  margin: 0 auto 6px;
}

.invite-member-item span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.contact-search-results {
  padding-top: 4px;
}

.contact-search-section {
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
  margin: 20px 0 8px;

  &:first-child {
    margin-top: 8px;
  }
}

.contact-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 8px;
  transition: background var(--transition-base), border-color var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.06);
    border-color: rgba(56, 189, 248, 0.18);
  }
}

.contact-search-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.contact-search-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}

.contact-search-name {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-search-bio {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-search-empty,
.contact-search-hint {
  padding: 48px 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

.join-group-btn {
  flex-shrink: 0;
  padding: 0 14px;
  height: 34px;
  border: 1px solid rgba(56, 189, 248, 0.24);
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.10);
  color: #7dd3fc;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.18);
  }
}

// ── join dialog ───────────────────────────────────────────────────────
.join-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.join-modal {
  width: min(440px, 100%);
  padding: 22px 20px 18px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
}

.join-modal-title {
  display: block;
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: 8px;
}

.join-modal-hint {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 14px;
}

.join-verify-input {
  display: block;
  width: 100%;
  min-height: 88px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  resize: none;
  box-sizing: border-box;
  margin-bottom: 14px;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.28);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.join-modal-actions {
  display: flex;
  gap: 10px;
}

.join-cancel-btn,
.join-submit-btn {
  flex: 1;
  min-height: 44px;
  border-radius: 14px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.join-cancel-btn {
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.join-submit-btn {
  border: none;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.96), rgba(56, 189, 248, 0.96));
  color: #09121f;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

// ── group member cluster ──────────────────────────────────────────────
.group-member-cluster {
  display: flex;
  flex-direction: row-reverse;
  margin-left: auto;
  flex-shrink: 0;
}

.group-member-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(10, 16, 27, 0.9);
  cursor: pointer;
  transition: transform var(--transition-base);

  & + & {
    margin-right: -8px;
  }

  &:hover {
    transform: scale(1.15);
    z-index: 1;
  }
}

// ── group sheet ───────────────────────────────────────────────────────
.group-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 10060;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.group-sheet {
  width: min(480px, 100%);
  padding: 18px 18px calc(env(safe-area-inset-bottom, 0px) + 18px);
  border: 1px solid rgba(56, 189, 248, 0.14);
  border-bottom: none;
  border-radius: 22px 22px 0 0;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98) 0%, rgba(6, 11, 20, 0.98) 100%);
  box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.36);
}

.group-sheet-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.group-sheet-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(56, 189, 248, 0.18);
}

.group-sheet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--text-primary);
    font-size: 16px;
  }

  span {
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.group-sheet-btn {
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(56, 189, 248, 0.18);
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.10);
  color: #7dd3fc;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(56, 189, 248, 0.18);
  }
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
