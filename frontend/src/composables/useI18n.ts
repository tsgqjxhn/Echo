/**
 * useI18n Composable
 *
 * 在组件中提供翻译功能，响应式跟随当前语言变化。
 * 用法：
 *   const { t, currentLanguage, setLanguage, supportedLanguages } = useI18n()
 *   t('中文原文')  // 返回当前语言的翻译
 */

import { computed } from 'vue'
import { useLanguageStore } from '@/stores/language'
import { t as translate, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/services/i18n'

export function useI18n() {
  const languageStore = useLanguageStore()

  /** 当前语言代码 */
  const currentLanguage = computed(() => languageStore.currentLanguage)

  /** 支持的语言列表 */
  const supportedLanguages = SUPPORTED_LANGUAGES

  /**
   * 翻译函数 - 响应式绑定当前语言
   * @param key 中文原文
   * @returns 翻译后文本
   */
  function t(key: string): string {
    return translate(key, languageStore.currentLanguage)
  }

  /**
   * 设置语言
   */
  function setLanguage(lang: string): void {
    languageStore.setLanguage(lang)
  }

  /**
   * 重置为系统语言
   */
  function resetToSystemLanguage(): void {
    languageStore.resetToSystemLanguage()
  }

  return {
    t,
    currentLanguage,
    setLanguage,
    resetToSystemLanguage,
    supportedLanguages,
    languageStore,
  }
}

/**
 * 全局翻译函数（非组件上下文中使用）
 * 需要在使用前确保 languageStore 已初始化
 */
export function createGlobalT() {
  let store: ReturnType<typeof useLanguageStore> | null = null

  const getStore = () => {
    if (!store) {
      // 延迟加载以避免循环依赖
      store = useLanguageStore()
    }
    return store
  }

  return {
    t(key: string): string {
      return translate(key, getStore().currentLanguage)
    },
    get currentLanguage(): SupportedLanguage {
      return getStore().currentLanguage
    },
  }
}
