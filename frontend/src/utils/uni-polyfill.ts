/**
 * uni-app API Polyfill
 * 用于在非 uni-app 环境中模拟 uni API
 */

interface ToastOptions {
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
  duration?: number
  mask?: boolean
}

interface NavigateToOptions {
  url: string
  success?: () => void
  fail?: (err: any) => void
}

interface NavigateBackOptions {
  delta?: number
}

interface ChooseImageOptions {
  count?: number
  sizeType?: Array<'original' | 'compressed'>
  sourceType?: Array<'album' | 'camera'>
  success?: (res: {
    tempFilePaths: string[]
    tempFiles: Array<{
      path: string
      size: number
    }>
  }) => void
  fail?: (err: any) => void
}

interface ShowModalOptions {
  title: string
  content: string
  showCancel?: boolean
  cancelText?: string
  cancelColor?: string
  confirmText?: string
  confirmColor?: string
  success?: (res: { confirm: boolean; cancel: boolean }) => void
}

/**
 * 显示提示框
 */
export function showToast(options: ToastOptions): void {
  console.log('[Toast]', options.title)
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
    `
    toast.textContent = options.title
    document.body.appendChild(toast)
    setTimeout(() => {
      document.body.removeChild(toast)
    }, options.duration || 1500)
  }
}

/**
 * 显示模态框
 */
export function showModal(options: ShowModalOptions): void {
  if (typeof window !== 'undefined') {
    const result = window.confirm(options.content)
    options.success?.({ confirm: result, cancel: !result })
  }
}

/**
 * 页面跳转
 */
export function navigateTo(options: NavigateToOptions): void {
  console.log('[NavigateTo]', options.url)
  if (typeof window !== 'undefined') {
    window.location.hash = options.url.replace('/', '')
    options.success?.()
  }
}

/**
 * 页面返回
 */
export function navigateBack(_options?: NavigateBackOptions): void {
  console.log('[NavigateBack]')
  if (typeof window !== 'undefined') {
    window.history.back()
  }
}

/**
 * 选择图片（带权限请求弹窗）
 */
export function chooseImage(options: ChooseImageOptions): void {
  console.log('[ChooseImage]', options)
  if (typeof window === 'undefined') return

  import('../services/permissions').then(({ requestPermission }) => {
    requestPermission('storage').then(result => {
      if (!result.granted) {
        options.fail?.({ errMsg: '存储权限被拒绝' })
        return
      }

      const needsCamera = options.sourceType?.includes('camera')
      const openPicker = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.multiple = options.count ? options.count > 1 : false
        if (needsCamera) {
          input.capture = 'environment'
        }
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement
          const files = target.files
          if (files && files.length > 0) {
            const tempFilePaths = Array.from(files).map(f => URL.createObjectURL(f as Blob))
            const tempFiles = Array.from(files).map(f => ({
              path: URL.createObjectURL(f as Blob),
              size: f.size
            }))
            options.success?.({ tempFilePaths, tempFiles })
          }
        }
        input.click()
      }

      if (needsCamera) {
        requestPermission('camera').then(camResult => {
          if (!camResult.granted) {
            options.fail?.({ errMsg: '相机权限被拒绝' })
            return
          }
          openPicker()
        })
      } else {
        openPicker()
      }
    })
  })
}

/**
 * 设置存储
 */
export function setStorageSync(key: string, data: any): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

/**
 * 获取存储
 */
export function getStorageSync(key: string): any {
  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }
  return null
}

// 导出 uni 对象
export const uni = {
  showToast,
  showModal,
  navigateTo,
  navigateBack,
  chooseImage,
  setStorageSync,
  getStorageSync
}

// 全局注册
if (typeof window !== 'undefined') {
  (window as any).uni = uni
}
