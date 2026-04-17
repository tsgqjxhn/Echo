<template>
  <div class="favorites-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">收藏夹</p>
        <h1>把最常聊的角色留在手边</h1>
        <p class="hero-copy">
          收藏页会聚合你最常回访的角色，适合快速继续剧情或反复测试设定。
        </p>
      </div>

      <div class="hero-count">
        <span>当前收藏</span>
        <strong>{{ favoriteCharacters.length }}</strong>
      </div>
    </section>

    <section class="toolbar">
      <input
        v-model="searchKeyword"
        class="search-input"
        type="search"
        placeholder="搜索收藏角色"
      />
    </section>

    <section v-if="filteredCharacters.length > 0" class="favorites-grid">
      <article
        v-for="character in filteredCharacters"
        :key="character.id"
        class="favorite-card"
        @click="goToDetail(character.id)"
      >
        <img :src="character.avatar || defaultAvatar" :alt="character.name" class="avatar" />

        <div class="card-copy">
          <div class="card-header">
            <h2>{{ character.name }}</h2>
            <span class="favorite-badge">已收藏</span>
          </div>

          <p>{{ character.description }}</p>
        </div>

        <div class="card-actions">
          <button type="button" class="action-btn" @click.stop="toggleFavorite(character.id)">
            取消收藏
          </button>
          <button type="button" class="action-btn primary" @click.stop="goToChat(character.id)">
            继续聊天
          </button>
        </div>
      </article>
    </section>

    <section v-else class="empty-card">
      <p class="eyebrow">还没有收藏</p>
      <h2>{{ searchKeyword ? '没有找到匹配收藏' : '收藏夹还是空的' }}</h2>
      <p>
        {{ searchKeyword ? '换个关键词试试，或者返回角色页继续筛选。' : '在角色页把常用角色加入收藏，下次就能更快回到这里。' }}
      </p>
      <button type="button" class="browse-btn" @click="goToCharacters">去角色页看看</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { ECHO_STORY_CHARACTER_ID } from '@/services/story-conversations'

const router = useRouter()
const characterStore = useCharacterStore()

const searchKeyword = ref('')
const defaultAvatar = '/src/static/images/default-avatar.svg'

const favoriteCharacters = computed(() =>
  [...characterStore.favoriteCharacters].sort((a, b) => b.updatedAt - a.updatedAt)
)

const filteredCharacters = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return favoriteCharacters.value
  }

  return favoriteCharacters.value.filter(character =>
    [character.name, character.description, character.background || '']
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

onMounted(async () => {
  await characterStore.loadCharacters({ favorite: true, sortBy: 'updatedAt', sortOrder: 'desc' })
})

function goToDetail(id: string) {
  router.push(`/character/detail/${id}`)
}

function goToChat(id: string) {
  const character = favoriteCharacters.value.find(item => item.id === id)
  if (character?.sourceType === 'builtin-story' || id === ECHO_STORY_CHARACTER_ID) {
    router.push('/dialogue')
    return
  }

  router.push(`/chat/${id}`)
}

function goToCharacters() {
  router.push('/character')
}

async function toggleFavorite(id: string) {
  await characterStore.toggleFavorite(id)
}
</script>

<style lang="scss" scoped>
.favorites-page {
  min-height: 100vh;
  padding: 24px 24px 120px;
  background: var(--page-backdrop-soft);
}

.hero-card,
.toolbar,
.favorite-card,
.empty-card {
  border: 1px solid var(--border-color);
  background: var(--surface-gradient);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(var(--backdrop-blur));
}

.hero-card {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 32px;
  background: var(--hero-gradient);
  animation: rise-in 0.5s ease both;
}

.eyebrow {
  color: var(--primary-color);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.hero-card h1 {
  margin: 12px 0 10px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 40px);
}

.hero-copy {
  max-width: 700px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.hero-count {
  min-width: 120px;
  padding: 18px 20px;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);

  span {
    display: block;
    margin-bottom: 8px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  strong {
    color: var(--text-primary);
    font-size: 30px;
  }
}

.toolbar {
  margin-top: 18px;
  padding: 16px;
  border-radius: 24px;
  animation: rise-in 0.62s ease both;
}

.search-input {
  width: 100%;
  height: 50px;
  padding: 0 18px;
  border: 1px solid var(--input-border);
  border-radius: 18px;
  background: var(--ghost-gradient);
  color: var(--text-primary);
  font: inherit;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);

  &:focus {
    outline: none;
    transform: translateY(-1px);
    border-color: var(--accent-strong);
    box-shadow: var(--focus-ring);
  }
}

.favorites-grid {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.favorite-card {
  display: grid;
  grid-template-columns: var(--record-avatar-size) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: var(--record-card-min-height);
  padding: var(--record-card-padding-y) var(--record-card-padding-x);
  border-radius: 16px;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
  background: linear-gradient(180deg, rgba(46, 51, 57, 0.24), rgba(16, 18, 21, 0.94));
  animation: rise-in 0.78s ease both;

  &:hover {
    transform: translateY(-6px);
    border-color: var(--accent-strong);
    box-shadow: var(--shadow-xl);
  }
}

.avatar {
  width: var(--record-avatar-size);
  height: var(--record-avatar-size);
  border-radius: var(--record-avatar-radius);
  object-fit: cover;
  border: 1px solid var(--border-light);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow: var(--shadow-sm);
}

.card-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: var(--record-avatar-size);
  min-width: 0;
  gap: 4px;

  p {
    color: var(--text-secondary);
    line-height: 1.45;
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h2 {
    color: var(--text-primary);
    font-size: 17px;
    line-height: 1.35;
  }
}

.favorite-badge {
  padding: 4px 8px;
  border: 1px solid var(--accent-strong);
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--primary-color);
  font-size: 11px;
}

.card-actions {
  display: grid;
  gap: 6px;
  align-content: center;
}

.action-btn,
.browse-btn {
  min-height: var(--record-action-height);
  padding: 0 12px;
  border-radius: 10px;
  cursor: pointer;
}

.action-btn {
  border: 1px solid var(--border-color);
  background: var(--ghost-gradient);
  color: var(--text-primary);
  font-size: 12px;
  transition: transform var(--transition-base), border-color var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    border-color: var(--border-light);
  }

  &.primary {
    border: none;
    background: var(--interactive-gradient);
    color: #f7fbff;
  }
}

.empty-card {
  margin-top: 18px;
  padding: 30px;
  border-radius: 32px;
  animation: rise-in 0.86s ease both;

  h2 {
    margin: 12px 0 10px;
    color: var(--text-primary);
    font-size: 28px;
  }

  p {
    margin-bottom: 18px;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.browse-btn {
  border: none;
  background: var(--interactive-gradient);
  color: #f7fbff;
  font-weight: 600;
  box-shadow: 0 18px 40px rgba(113, 129, 146, 0.24);
}

@media (max-width: 760px) {
  .favorites-page {
    padding: 16px 16px 118px;
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-count {
    width: 100%;
  }

  .favorite-card {
    grid-template-columns: 1fr;
  }

  .avatar {
    margin-bottom: 4px;
  }

  .card-actions {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
