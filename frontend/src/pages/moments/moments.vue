<template>
  <div class="moments-page">
    <header class="moments-header">
      <h1>朋友圈</h1>
    </header>

    <!-- no friends -->
    <section v-if="!isLoading && !hasFriends && !hasVisiblePosts" class="empty-state">
      <p class="empty-title">还没有好友</p>
      <p class="empty-hint">在角色详情页添加好友后，好友会在这里发布动态</p>
      <button type="button" class="go-btn" @click="router.push('/character')">去认识角色</button>
    </section>

    <section v-else class="feed-list">
      <!-- generating indicator -->
      <div v-if="generatingCount > 0" class="gen-indicator">
        <span class="gen-dot"></span>
        正在生成新动态…
      </div>

      <!-- friends exist but no posts yet -->
      <div v-else-if="sortedPosts.length === 0" class="empty-state empty-state--inline">
        <p class="empty-title">当前好友暂未发布朋友圈</p>
      </div>

      <article
        v-for="post in sortedPosts"
        :key="post.id"
        class="post-card"
      >
        <!-- header -->
        <div class="post-head">
          <img
            :src="post.characterAvatar || defaultAvatar"
            :alt="post.characterName"
            class="post-avatar"
            @click="enlargeAvatar(post.characterAvatar || defaultAvatar, post.characterName)"
          />
          <div class="post-meta">
            <span class="post-author">{{ post.characterName }}</span>
            <span class="post-time">{{ formatTime(post.postedAt) }}</span>
          </div>
        </div>

        <!-- content -->
        <p class="post-content">{{ post.content }}</p>

        <button
          v-if="post.imageUrl"
          type="button"
          class="post-image-button"
          @click="enlargeImage(post.imageUrl, post.content)"
        >
          <img :src="post.imageUrl" :alt="post.content" class="post-image" />
        </button>

        <!-- action bar -->
        <div class="post-actions">
          <button
            type="button"
            class="action-btn"
            :class="{ active: post.isLikedByMe }"
            @click="momentsStore.toggleLike(post.id)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span v-if="post.likes > 0">{{ post.likes }}</span>
            <span v-else>点赞</span>
          </button>

          <button
            type="button"
            class="action-btn"
            :class="{ active: post.isFavoritedByMe }"
            @click="momentsStore.toggleFavorite(post.id)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            收藏
          </button>

          <button
            type="button"
            class="action-btn"
            @click="handleForward(post)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 17 20 12 15 7"/>
              <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
            </svg>
            <span v-if="post.forwards > 0">{{ post.forwards }}</span>
            <span v-else>转发</span>
          </button>
        </div>

        <!-- comments -->
        <div v-if="post.comments.length > 0" class="comments-list">
          <div
            v-for="comment in post.comments"
            :key="comment.id"
            class="comment-row"
          >
            <span class="comment-author" :class="{ 'comment-author--me': comment.isMe }">
              {{ comment.authorName }}：
            </span>
            <span class="comment-text">{{ comment.text }}</span>
          </div>
        </div>

        <!-- comment input -->
        <div class="comment-input-row" @click.stop>
          <input
            v-model="commentDrafts[post.id]"
            class="comment-input"
            type="text"
            placeholder="留言…"
            maxlength="200"
            @keydown.enter="submitComment(post.id)"
          />
          <button
            type="button"
            class="comment-send"
            :disabled="!commentDrafts[post.id]?.trim()"
            @click="submitComment(post.id)"
          >
            发送
          </button>
        </div>
      </article>
    </section>

    <ImageViewer
      :visible="viewerVisible"
      :src="viewerSrc"
      :alt="viewerAlt"
      :caption="viewerAlt"
      @close="viewerVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { useUserStore } from '@/stores/user'
import { useMomentsStore, type MomentPost } from '@/stores/moments'
import { apiConfigService } from '@/services/api-config'
import { LLMAPIService } from '@/services/llm-api'
import defaultAvatar from '@/static/images/default-avatar.svg'
import ImageViewer from '@/components/ImageViewer/index.vue'
import { ECHO_STORY_CHARACTER_ID } from '@/services/story-conversations'
import { markMomentsRead } from '@/services/history-unread'

const router = useRouter()
const characterStore = useCharacterStore()
const userStore = useUserStore()
const momentsStore = useMomentsStore()

const commentDrafts = reactive<Record<string, string>>({})
const generatingCount = ref(0)
const isLoading = ref(true)
const viewerVisible = ref(false)
const viewerSrc = ref('')
const viewerAlt = ref('')

const hasFriends = computed(() => characterStore.friendCharacters.length > 0)

const sortedPosts = computed(() => {
  const friendIds = new Set(characterStore.friendCharacters.map(f => f.id))
  return [...momentsStore.posts]
    .filter(p => friendIds.has(p.characterId) || p.characterId === ECHO_STORY_CHARACTER_ID)
    .sort((a, b) => b.postedAt - a.postedAt)
})
const hasVisiblePosts = computed(() => sortedPosts.value.length > 0)

onMounted(async () => {
  markMomentsRead()
  await characterStore.loadCharacters()
  isLoading.value = false
  await triggerAutoPost()
  markMomentsRead()
})

async function triggerAutoPost() {
  const friends = characterStore.friendCharacters
  if (friends.length === 0) return

  const apiConfig = await apiConfigService.getDefaultConfig('text')
  if (!apiConfig) return

  const llm = new LLMAPIService(apiConfig)

  for (const character of friends) {
    if (!momentsStore.shouldPost(character.id)) continue

    generatingCount.value++
    momentsStore.scheduleNext(character.id)

    try {
      const content = await llm.chat({
        systemPrompt: (character.settings || '').trim(),
        messages: [
          {
            role: 'user',
            content:
              '请你以角色身份，在朋友圈发一条动态。内容要自然真实，体现你的性格，长度在10到60字之间。只输出动态正文，不要任何前缀、解释或引号。',
          },
        ],
      })

      if (content.trim()) {
        const post: MomentPost = {
          id: crypto.randomUUID(),
          characterId: character.id,
          characterName: character.name,
          characterAvatar: character.avatar || null,
          content: content.trim(),
          postedAt: Date.now(),
          likes: 0,
          isLikedByMe: false,
          isFavoritedByMe: false,
          forwards: 0,
          comments: [],
        }
        momentsStore.addPost(post)
      }
    } catch {
      // silently skip if generation fails
    } finally {
      generatingCount.value--
    }
  }
}

function submitComment(postId: string) {
  const text = commentDrafts[postId]?.trim()
  if (!text) return
  momentsStore.addComment(postId, text, userStore.userName || '我')
  commentDrafts[postId] = ''
}

function handleForward(post: MomentPost) {
  momentsStore.forward(post.id)
  if (navigator.share) {
    void navigator.share({ text: `${post.characterName}：${post.content}` }).catch(() => undefined)
  }
}

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function enlargeAvatar(src: string, name: string) {
  viewerSrc.value = src
  viewerAlt.value = name
  viewerVisible.value = true
}

function enlargeImage(src: string, caption: string) {
  viewerSrc.value = src
  viewerAlt.value = caption
  viewerVisible.value = true
}
</script>

<style scoped lang="scss">
.moments-page {
  min-height: 100vh;
  padding-bottom: 90px;
  background:
    radial-gradient(ellipse at 20% 5%, rgba(52, 211, 153, 0.12) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.10) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 50%, #0a1e2c 100%);
}

.moments-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 16px 20px 12px;
  background: rgba(5, 13, 20, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  h1 {
    margin: 0;
    color: var(--text-primary, #f0f9ff);
    font-size: 20px;
    font-weight: 700;
  }
}

// empty state
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 32px 40px;
  text-align: center;
  gap: 12px;
}

.empty-title {
  margin: 0;
  color: var(--text-primary, #f0f9ff);
  font-size: 17px;
  font-weight: 600;
}

.empty-hint {
  margin: 0;
  color: var(--text-secondary, rgba(186,230,253,0.60));
  font-size: 14px;
  line-height: 1.6;
}

.go-btn {
  margin-top: 8px;
  padding: 10px 24px;
  border: 1px solid rgba(52, 211, 153, 0.30);
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.10);
  color: #6ee7b7;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

// inline empty (friends exist, no posts)
.empty-state--inline {
  padding: 60px 32px;
  text-align: center;
}

// generating indicator
.gen-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: var(--text-secondary, rgba(186,230,253,0.55));
  font-size: 13px;
}

.gen-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6ee7b7;
  animation: pulse 1.2s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

// feed
.feed-list {
  display: flex;
  flex-direction: column;
}

.post-card {
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.12s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.post-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.post-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.10);
  overflow: hidden;
}

.post-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.post-author {
  color: #7dd3fc;
  font-size: 14px;
  font-weight: 600;
}

.post-time {
  color: var(--text-tertiary, rgba(186,230,253,0.38));
  font-size: 12px;
}

.post-content {
  margin: 0 0 12px;
  padding-left: 54px;
  color: var(--text-primary, #f0f9ff);
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-image-button {
  display: block;
  width: min(420px, calc(100% - 54px));
  margin: 0 0 12px 54px;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  cursor: zoom-in;
}

.post-image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

// action bar
.post-actions {
  display: flex;
  gap: 4px;
  padding-left: 54px;
  margin-bottom: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-tertiary, rgba(186,230,253,0.50));
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-secondary, rgba(186,230,253,0.75));
  }

  &.active {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.30);
    background: rgba(248, 113, 113, 0.08);

    svg {
      fill: #f87171;
      stroke: #f87171;
    }
  }
}

// comments
.comments-list {
  margin-left: 54px;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-row {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(186,230,253,0.70));
}

.comment-author {
  font-weight: 600;
  color: #7dd3fc;
}

.comment-author--me {
  color: #6ee7b7;
}

.comment-text {
  color: var(--text-primary, #f0f9ff);
}

// comment input
.comment-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-left: 54px;
  margin-top: 4px;
}

.comment-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #f0f9ff);
  font: inherit;
  font-size: 13px;

  &::placeholder {
    color: var(--text-tertiary, rgba(186,230,253,0.35));
  }

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.30);
  }
}

.comment-send {
  padding: 0 12px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:not(:disabled):hover {
    background: rgba(56, 189, 248, 0.28);
  }
}
</style>
