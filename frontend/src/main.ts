import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { ErrorHandler } from './services/error-handler'
import { t } from './services/i18n'
import { useLanguageStore } from './stores/language'

// 引入全局样式
import './styles/theme.scss'

// 导入 uni-app polyfill
import './utils/uni-polyfill'

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = error => {
  ErrorHandler.handle(error)
}

app.use(pinia)
app.use(router)

// 全局响应式翻译函数 — 依赖语言 store 的 currentLanguage
// 在模板中使用：{{ $t('中文原文') }}
app.config.globalProperties.$t = (key: string): string => {
  try {
    const langStore = useLanguageStore()
    return t(key, langStore.currentLanguage)
  } catch {
    return t(key)
  }
}

app.mount('#app')

if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    ErrorHandler.handle(event.error || new Error(event.message))
  })

  window.addEventListener('unhandledrejection', event => {
    ErrorHandler.handle(event.reason)
  })
}
