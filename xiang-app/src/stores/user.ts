import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { UserInfo } from '@/types/user'
import { userService } from '@/services/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const userName = computed(() => userInfo.value?.name?.trim() || '未命名')
  const userAvatar = computed(() => userInfo.value?.avatar || '')
  const globalPrompt = computed(() => userInfo.value?.globalPrompt || '')
  const fortuneCoins = computed(() => userInfo.value?.fortuneCoins ?? 0)
  const chatLevel = computed(() => userInfo.value?.chatLevel ?? 1)
  const gameLevel = computed(() => userInfo.value?.gameLevel ?? 1)
  const hasGlobalPrompt = computed(() => !!userInfo.value?.globalPrompt?.trim())

  async function loadUserInfo() {
    loading.value = true
    error.value = null

    try {
      userInfo.value = await userService.getUserInfo()
      return userInfo.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载用户信息失败'
      console.error('加载用户信息失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUserInfo(info: Partial<UserInfo>) {
    loading.value = true
    error.value = null

    try {
      await userService.updateUserInfo(info)
      await loadUserInfo()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新用户信息失败'
      console.error('更新用户信息失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUserName(name: string) {
    await updateUserInfo({ name })
  }

  async function updateUserAvatar(avatar: string) {
    await updateUserInfo({ avatar })
  }

  async function updateGlobalPrompt(prompt: string) {
    await updateUserInfo({ globalPrompt: prompt })
  }

  async function hasAPIKey(): Promise<boolean> {
    return userService.hasAPIKey()
  }

  async function clearAllData() {
    loading.value = true
    error.value = null

    try {
      await userService.clearAllData()
      userInfo.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : '清空数据失败'
      console.error('清空数据失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    userInfo,
    loading,
    error,
    userName,
    userAvatar,
    globalPrompt,
    fortuneCoins,
    chatLevel,
    gameLevel,
    hasGlobalPrompt,
    loadUserInfo,
    updateUserInfo,
    updateUserName,
    updateUserAvatar,
    updateGlobalPrompt,
    hasAPIKey,
    clearAllData,
    clearError
  }
})
