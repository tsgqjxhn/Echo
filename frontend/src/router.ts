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
    meta: { title: '回声' }
  },
  {
    path: '/character',
    component: () => import('./pages/character/list.vue'),
    meta: { title: '主页' }
  },
  {
    path: '/character/detail/:id',
    component: () => import('./pages/character/detail.vue'),
    meta: { title: '角色详情' }
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
    path: '/settings/global-prompt',
    component: () => import('./pages/settings/global-prompt.vue'),
    meta: { title: '配置提示词' }
  },
  {
    path: '/settings/api-config',
    component: () => import('./pages/settings/api-config.vue'),
    meta: { title: '配置全局大模型' }
  },
  {
    path: '/settings/export',
    component: () => import('./pages/settings/export.vue'),
    meta: { title: '数据管理' }
  },
  {
    path: '/settings/voice',
    component: () => import('./pages/settings/voice.vue'),
    meta: { title: '语音设置' }
  },
  {
    path: '/settings/notification',
    component: () => import('./pages/settings/notification.vue'),
    meta: { title: '通知/消息' }
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
    path: '/settings/about',
    component: () => import('./pages/settings/about.vue'),
    meta: { title: '关于' }
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
    path: '/game/escape',
    component: () => import('./pages/game/mini/escape.vue'),
    meta: { title: '新故事' }
  },
  {
    path: '/game/play/:id',
    component: () => import('./pages/game/play.vue'),
    meta: { title: '游戏' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach(to => {
  if (typeof document === 'undefined') {
    return
  }

  const pageTitle = typeof to.meta.title === 'string' ? `${to.meta.title} - AI角色聊天` : 'AI角色聊天'
  document.title = pageTitle
})

export default router
