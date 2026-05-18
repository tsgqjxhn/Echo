export const APP_NOTIFICATION_EVENT = 'echo-app-notification'

export interface AppNotificationPayload {
  title: string
  body?: string
  route?: string
  icon?: string
}

/**
 * 派发应用内通知事件。
 * 任何模块都可以调用此函数来向 App 层发送通知卡片。
 */
export function emitAppNotification(payload: AppNotificationPayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AppNotificationPayload>(APP_NOTIFICATION_EVENT, {
        detail: payload,
      })
    )
  }
}
