import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { ErrorHandler } from './services/error-handler'

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
app.mount('#app')

if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    ErrorHandler.handle(event.error || new Error(event.message))
  })

  window.addEventListener('unhandledrejection', event => {
    ErrorHandler.handle(event.reason)
  })
}
