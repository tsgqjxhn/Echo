/**
 * 语言管理 Store
 *
 * 管理用户界面语言切换、系统语言检测和持久化存储。
 * 语言优先级：手动选择 > 系统语言 > 默认(zh-CN)
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { uni } from '@/utils/uni-polyfill'
import {
  t,
  detectSystemLanguage,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/services/i18n'

/** localStorage 存储键 */
const LANG_STORAGE_KEY = 'echo_app_language'

/**
 * 获取存储的用户语言选择
 */
function getStoredLanguage(): SupportedLanguage | null {
  try {
    const stored = uni.getStorageSync(LANG_STORAGE_KEY)
    if (stored && isSupportedLanguage(stored)) {
      return stored as SupportedLanguage
    }
  } catch {
    // 使用浏览器 localStorage 回退
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY)
      if (stored && isSupportedLanguage(stored)) {
        return stored as SupportedLanguage
      }
    } catch {
      // 忽略
    }
  }
  return null
}

/**
 * 持久化语言选择
 */
function persistLanguage(lang: SupportedLanguage): void {
  try {
    uni.setStorageSync(LANG_STORAGE_KEY, lang)
  } catch {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // 忽略存储失败
    }
  }
}

export const useLanguageStore = defineStore('language', () => {
  // ==================== 状态 ====================

  /** 用户手动选择的语言（null = 未手动选择） */
  const manualLanguage = ref<SupportedLanguage | null>(getStoredLanguage())

  /** 系统检测到的语言 */
  const systemLanguage = ref<SupportedLanguage>(detectSystemLanguage())

  /** 是否已完成初始化 */
  const initialized = ref(false)

  // ==================== 计算属性 ====================

  /**
   * 当前生效的语言
   * 优先级：手动选择 > 系统语言 > 默认(zh-CN)
   */
  const currentLanguage = computed<SupportedLanguage>(() => {
    return manualLanguage.value ?? systemLanguage.value ?? DEFAULT_LANGUAGE
  })

  /** 用户是否手动选择了语言 */
  const isManualSelection = computed(() => manualLanguage.value !== null)

  // ==================== 方法 ====================

  /**
   * 设置语言（用户手动选择）
   */
  function setLanguage(lang: string): void {
    if (!isSupportedLanguage(lang)) {
      console.warn(`[language] 不支持的语言代码: ${lang}，回退到 ${FALLBACK_LANGUAGE}`)
      lang = FALLBACK_LANGUAGE
    }
    manualLanguage.value = lang as SupportedLanguage
    persistLanguage(lang as SupportedLanguage)
    applyLanguageToDOM(lang as SupportedLanguage)
  }

  /**
   * 重置为系统语言（清除手动选择）
   */
  function resetToSystemLanguage(): void {
    manualLanguage.value = null
    try {
      uni.removeStorageSync?.(LANG_STORAGE_KEY)
    } catch {
      try {
        localStorage.removeItem(LANG_STORAGE_KEY)
      } catch {
        // 忽略
      }
    }
    systemLanguage.value = detectSystemLanguage()
    applyLanguageToDOM(systemLanguage.value)
  }

  /**
   * 重新检测系统语言
   */
  function refreshSystemLanguage(): void {
    systemLanguage.value = detectSystemLanguage()
    // 如果没有手动选择，应用新的系统语言到 DOM
    if (!isManualSelection.value) {
      applyLanguageToDOM(systemLanguage.value)
    }
  }

  /**
   * 将语言设置应用到 DOM (设置 lang 属性)
   */
  function applyLanguageToDOM(lang: SupportedLanguage): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang)
      // 对于阿拉伯语，设置 dir="rtl"（保留以备后用）
      if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl')
      } else {
        document.documentElement.setAttribute('dir', 'ltr')
      }
    }
  }

  /**
   * 翻译函数（绑定当前语言）
   * 用于在组件中通过 store 调用
   */
  function translate(key: string): string {
    return t(key, currentLanguage.value)
  }

  /**
   * 初始化语言 Store
   * 在 App.vue onMounted 中调用
   */
  function init(): void {
    if (initialized.value) return

    // 检测系统语言
    systemLanguage.value = detectSystemLanguage()

    // 如果没有手动选择，则使用系统语言
    const effectiveLang = currentLanguage.value
    applyLanguageToDOM(effectiveLang)

    initialized.value = true
  }

  return {
    // 状态
    manualLanguage,
    systemLanguage,
    initialized,
    // 计算属性
    currentLanguage,
    isManualSelection,
    // 方法
    setLanguage,
    resetToSystemLanguage,
    refreshSystemLanguage,
    translate,
    init,
  }
})
