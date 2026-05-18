import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/character'
  },
  {
    path: '/dialogue',
    component: () => import('./pages/dialogue/feed.vue'),
    meta: { title: '对话' }
  },
  {
    path: '/character',
    component: () => import('./pages/character/list.vue'),
    meta: { title: '主页' }
  },
  {
    path: '/character/edit',
    component: () => import('./pages/character/edit.vue'),
    meta: { title: '编辑角色' }
  },
  {
    path: '/character/create',
    component: () => import('./pages/character/create.vue'),
    meta: { title: '创建角色' }
  },
  {
    path: '/character/preview',
    component: () => import('./pages/character/preview.vue'),
    meta: { title: '预览对话' }
  },
  {
    path: '/chat/:characterId',
    component: () => import('./pages/chat/chat.vue'),
    meta: { title: '聊天' }
  },
  {
    path: '/history',
    component: () => import('./pages/history/history.vue'),
    meta: { title: '会话历史' }
  },
  {
    path: '/settings',
    component: () => import('./pages/settings/settings.vue'),
    meta: { title: '个人中心' }
  },
  {
    path: '/settings/user-info',
    component: () => import('./pages/settings/user-info.vue'),
    meta: { title: '编辑个人资料' }
  },
  {
    path: '/settings/system-prompt',
    component: () => import('./pages/settings/system-prompt.vue'),
    meta: { title: '系统提示词管理' }
  },
  {
    path: '/settings/api-config',
    component: () => import('./pages/settings/api-config.vue'),
    meta: { title: '大模型配置' }
  },
  {
    path: '/settings/export',
    component: () => import('./pages/settings/export.vue'),
    meta: { title: '数据管理' }
  },
  {
    path: '/settings/chat-defaults',
    component: () => import('./pages/settings/chat-defaults.vue'),
    meta: { title: '聊天默认设置' }
  },
  {
    path: '/settings/storage',
    component: () => import('./pages/settings/storage.vue'),
    meta: { title: '存储管理' }
  },
  {
    path: '/settings/network',
    component: () => import('./pages/settings/network.vue'),
    meta: { title: '网络与连接' }
  },
  {
    path: '/settings/about',
    component: () => import('./pages/settings/about.vue'),
    meta: { title: '关于与帮助' }
  },
  {
    path: '/moments',
    component: () => import('./pages/moments/moments.vue'),
    meta: { title: '朋友圈' }
  },
  {
    path: '/game/panel',
    component: () => import('./pages/game/panel.vue'),
    meta: { title: '游戏中心' }
  },
  {
    path: '/game/settings',
    component: () => import('./pages/game/settings.vue'),
    meta: { title: '游戏设置' }
  },
  {
    path: '/game/generate',
    component: () => import('./pages/game/generate.vue'),
    meta: { title: '生成游戏' }
  },
  {
    path: '/game/escape',
    component: () => import('./pages/game/mini/escape.vue'),
    meta: { title: '新故事' }
  },
  {
    path: '/game/play/:id',
    component: () => import('./pages/game/play.vue'),
    meta: { title: '游戏' }
  },
  {
    path: '/world-book/list',
    component: () => import('./pages/world-book/list.vue'),
    meta: { title: '世界书' }
  },
  {
    path: '/world-book/edit',
    component: () => import('./pages/world-book/edit.vue'),
    meta: { title: '编辑世界书' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach(async to => {
  if (typeof document === 'undefined') {
    return
  }

  try {
    // 动态导入语言相关模块（需要 Pinia 初始化后才可用）
    const [{ useLanguageStore }, { t }] = await Promise.all([
      import('@/stores/language'),
      import('@/services/i18n')
    ])
    const langStore = useLanguageStore()
    const lang = langStore?.currentLanguage ?? 'zh-CN'
    const appName = t('AI角色聊天', lang)
    const pageTitle = typeof to.meta.title === 'string' ? `${t(to.meta.title as string, lang)} - ${appName}` : appName
    document.title = pageTitle
  } catch {
    const pageTitle = typeof to.meta.title === 'string' ? `${to.meta.title} - AI角色聊天` : 'AI角色聊天'
    document.title = pageTitle
  }
})

export default router
