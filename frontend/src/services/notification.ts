export interface AppNotificationPayload {
  title: string
  body?: string
  route?: string
  kind?: 'message' | 'game' | 'system'
}

interface NotificationSettings {
  newMsgNotify?: boolean
  friendNotify?: boolean
  dndEnabled?: boolean
  dndStart?: string
  dndEnd?: string
  soundEnabled?: boolean
}

export const APP_NOTIFICATION_EVENT = 'echo:app-notification'

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem('echo_notification_settings')
    return raw ? JSON.parse(raw) as NotificationSettings : {}
  } catch {
    return {}
  }
}

function minutesOfDay(value: string | undefined, fallback: string): number {
  const [hour, minute] = (value || fallback).split(':').map(item => Number.parseInt(item, 10))
  return Math.max(0, Math.min(23, Number.isFinite(hour) ? hour : 0)) * 60
    + Math.max(0, Math.min(59, Number.isFinite(minute) ? minute : 0))
}

function isDoNotDisturb(settings: NotificationSettings): boolean {
  if (!settings.dndEnabled) return false

  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const start = minutesOfDay(settings.dndStart, '23:00')
  const end = minutesOfDay(settings.dndEnd, '08:00')

  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

function emitInAppNotification(payload: AppNotificationPayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AppNotificationPayload>(APP_NOTIFICATION_EVENT, { detail: payload }))
}

function playNotificationSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) return

    const ctx = new AudioContextCtor()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.035
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.12)
    window.setTimeout(() => ctx.close().catch(() => undefined), 220)
  } catch {
    // Sound is best-effort only.
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }

  return Notification.permission
}

export async function notifyApp(payload: AppNotificationPayload): Promise<void> {
  if (typeof window === 'undefined') return

  const settings = loadSettings()
  if (payload.kind === 'message' && settings.newMsgNotify === false) return
  if (isDoNotDisturb(settings)) return

  emitInAppNotification(payload)

  if (settings.soundEnabled !== false) {
    playNotificationSound()
  }

  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const notification = new Notification(payload.title, {
    body: payload.body || '',
    tag: payload.route || payload.title,
  })

  notification.onclick = () => {
    window.focus()
    if (payload.route) {
      window.location.hash = payload.route.startsWith('#') ? payload.route : `#${payload.route}`
    }
    notification.close()
  }
}

/**
 * 发送游戏通知
 * 仅在游戏消息推送开启且用户已订阅该类型时触发
 * 通过直接读取 localStorage 避免循环依赖
 */
export function sendGameNotification(type: string, title: string, body: string): void {
  if (typeof window === 'undefined') return

  try {
    const raw = localStorage.getItem('xiang_game_settings')
    if (!raw) return
    const gameSettings = JSON.parse(raw) as {
      gameNotificationsEnabled?: boolean
      gameNotifications?: string[]
    }
    if (!gameSettings.gameNotificationsEnabled) return
    if (!gameSettings.gameNotifications?.includes(type)) return
  } catch {
    return
  }

  notifyApp({ title, body, kind: 'game' })
}
