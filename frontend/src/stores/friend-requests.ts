import { defineStore } from 'pinia'

export interface FriendRequest {
  id: string
  characterId: string
  characterName: string
  characterAvatar: string | null
  status: 'pending' | 'accepted' | 'declined'
  requestedAt: number
  acceptedAt?: number
}

const STORAGE_KEY = 'echo_friend_requests'

function loadRequests(): FriendRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FriendRequest[]) : []
  } catch {
    return []
  }
}

function saveRequests(requests: FriendRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
}

export const useFriendRequestStore = defineStore('friend-requests', {
  state: () => ({
    requests: loadRequests(),
  }),

  getters: {
    pendingRequests(state): FriendRequest[] {
      return state.requests.filter(r => r.status === 'pending')
    },
  },

  actions: {
    addRequest(request: Omit<FriendRequest, 'status'>): void {
      if (this.requests.some(r => r.characterId === request.characterId)) {
        return
      }
      this.requests.push({ ...request, status: 'pending' })
      saveRequests(this.requests)
    },

    acceptRequest(characterId: string): void {
      const req = this.requests.find(r => r.characterId === characterId && r.status === 'pending')
      if (!req) return
      req.status = 'accepted'
      req.acceptedAt = Date.now()
      saveRequests(this.requests)
    },

    hasPendingFrom(characterId: string): boolean {
      return this.requests.some(r => r.characterId === characterId && r.status === 'pending')
    },

    isAccepted(characterId: string): boolean {
      return this.requests.some(r => r.characterId === characterId && r.status === 'accepted')
    },
  },
})
