import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MomentComment {
  id: string
  authorName: string
  isMe: boolean
  text: string
  postedAt: number
}

export interface MomentPost {
  id: string
  characterId: string
  characterName: string
  characterAvatar: string | null
  content: string
  imageUrl?: string
  postedAt: number
  likes: number
  isLikedByMe: boolean
  isFavoritedByMe: boolean
  forwards: number
  comments: MomentComment[]
}

const POSTS_KEY = 'echo_moments_posts'
const SCHEDULE_KEY = 'echo_moments_schedule'
const MIN_INTERVAL_MS = 2 * 60 * 60 * 1000
const MAX_INTERVAL_MS = 10 * 60 * 60 * 1000

function loadPosts(): MomentPost[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY)
    return raw ? (JSON.parse(raw) as MomentPost[]) : []
  } catch {
    return []
  }
}

function persist(posts: MomentPost[]): void {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts))
}

function loadSchedule(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function saveSchedule(schedule: Record<string, number>): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule))
}

export const useMomentsStore = defineStore('moments', () => {
  const posts = ref<MomentPost[]>(loadPosts())

  function addPost(post: MomentPost) {
    posts.value = [post, ...posts.value].slice(0, 300)
    persist(posts.value)
  }

  function toggleLike(id: string) {
    const post = posts.value.find(p => p.id === id)
    if (!post) return
    if (post.isLikedByMe) {
      post.likes = Math.max(0, post.likes - 1)
      post.isLikedByMe = false
    } else {
      post.likes++
      post.isLikedByMe = true
    }
    persist(posts.value)
  }

  function toggleFavorite(id: string) {
    const post = posts.value.find(p => p.id === id)
    if (!post) return
    post.isFavoritedByMe = !post.isFavoritedByMe
    persist(posts.value)
  }

  function forward(id: string) {
    const post = posts.value.find(p => p.id === id)
    if (!post) return
    post.forwards++
    persist(posts.value)
  }

  function addComment(postId: string, text: string, authorName: string) {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    post.comments = [
      ...post.comments,
      {
        id: crypto.randomUUID(),
        authorName,
        isMe: true,
        text: text.trim(),
        postedAt: Date.now(),
      },
    ]
    persist(posts.value)
  }

  function shouldPost(characterId: string): boolean {
    const schedule = loadSchedule()
    const nextAt = schedule[characterId] ?? 0
    return Date.now() >= nextAt
  }

  function scheduleNext(characterId: string) {
    const schedule = loadSchedule()
    schedule[characterId] = Date.now() + MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
    saveSchedule(schedule)
  }

  return { posts, addPost, toggleLike, toggleFavorite, forward, addComment, shouldPost, scheduleNext }
})
