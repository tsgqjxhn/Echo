/**
 * 设置状态管理
 * 使用 Pinia，负责主题、游戏开关等全局设置
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ThemeType } from '@/types/user'
import { storageDriver } from '@/services/storage'

/**
 * 设置状态接口
 */
export interface SettingsState {
  theme: ThemeType
  loading: boolean
  error: string | null
}

/**
 * 默认主题
 */
const DEFAULT_THEME: ThemeType = 'auto'

/**
 * 设置 Store
 */
export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const theme = ref<ThemeType>(DEFAULT_THEME)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const themeDisplayName = computed(() => {
    const names: Record<ThemeType, string> = {
      auto: '自动',
      light: '浅色',
      dark: '深色'
    }
    return names[theme.value]
  })

  const isDarkMode = computed(() => {
    if (theme.value === 'dark') {
      return true
    }
    if (theme.value === 'light') {
      return false
    }
    // 自动模式，根据系统设置
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // 方法
  /**
   * 加载主题设置
   */
  async function loadTheme() {
    loading.value = true
    error.value = null

    try {
      const savedTheme = await storageDriver.getUserSetting('theme')
      if (savedTheme && ['auto', 'light', 'dark'].includes(savedTheme)) {
        theme.value = savedTheme as ThemeType
      } else {
        theme.value = DEFAULT_THEME
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载主题设置失败'
      console.error('加载主题设置失败:', err)
      theme.value = DEFAULT_THEME
    } finally {
      loading.value = false
    }
  }

  /**
   * 设置主题
   */
  async function setTheme(newTheme: ThemeType) {
    loading.value = true
    error.value = null

    try {
      theme.value = newTheme
      await storageDriver.saveUserSetting('theme', newTheme)
      applyTheme(newTheme)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置主题失败'
      console.error('设置主题失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 应用主题到页面
   */
  function applyTheme(newTheme: ThemeType) {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    const isDark = newTheme === 'dark' || 
      (newTheme === 'auto' && typeof window !== 'undefined' && 
       window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      html.setAttribute('data-theme', 'dark')
      html.classList.add('dark')
    } else {
      html.setAttribute('data-theme', 'light')
      html.classList.remove('dark')
    }
  }

  /**
   * 切换主题
   */
  async function toggleTheme() {
    const themes: ThemeType[] = ['auto', 'light', 'dark']
    const currentIndex = themes.indexOf(theme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    await setTheme(themes[nextIndex])
  }

  /**
   * 初始化主题
   */
  async function initTheme() {
    await loadTheme()
    applyTheme(theme.value)

    // 监听系统主题变化（仅在自动模式下）
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (theme.value === 'auto') {
          applyTheme('auto')
        }
      })
    }
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  return {
    // 状态
    theme,
    loading,
    error,
    // 计算属性
    themeDisplayName,
    isDarkMode,
    // 方法
    loadTheme,
    setTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    clearError
  }
})
