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

interface ShowActionSheetOptions {
  title?: string
  itemList: string[]
  itemColor?: string
  success?: (res: { tapIndex: number; content?: string }) => void
  fail?: (err: any) => void
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
 *
 * 使用自定义 DOM 弹窗，避免 window.confirm 在原生 WebView 上的不稳定行为。
 */
export function showModal(options: ShowModalOptions): void {
  if (typeof window === 'undefined') {
    options.success?.({ confirm: false, cancel: true })
    return
  }

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10090;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  `

  const dialog = document.createElement('div')
  dialog.style.cssText = `
    background: linear-gradient(145deg, rgba(15,23,42,0.98), rgba(7,13,24,0.98));
    border: 1px solid rgba(56,189,248,0.18);
    border-radius: 18px;
    padding: 24px 22px 20px;
    width: 100%;
    max-width: 320px;
    color: #f8fafc;
    box-shadow: 0 24px 64px rgba(0,0,0,0.42);
    font-family: inherit;
  `

  const showCancel = options.showCancel !== false
  const cancelText = options.cancelText || '取消'
  const confirmText = options.confirmText || '确定'

  const titleHtml = options.title
    ? `<div style="text-align:center;font-size:17px;font-weight:600;margin-bottom:10px;color:#f8fafc;">${options.title}</div>`
    : ''
  const contentHtml = options.content
    ? `<div style="text-align:center;font-size:14px;line-height:1.6;color:rgba(226,232,240,0.82);margin-bottom:18px;">${options.content}</div>`
    : ''

  dialog.innerHTML = `
    ${titleHtml}
    ${contentHtml}
    <div style="display:flex;gap:10px;">
      ${
        showCancel
          ? `<button type="button" data-action="cancel" style="
              flex:1;padding:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,0.1);
              background:rgba(255,255,255,0.04);color:rgba(226,232,240,0.78);
              font:inherit;font-size:15px;cursor:pointer;
            ">${cancelText}</button>`
          : ''
      }
      <button type="button" data-action="confirm" style="
        flex:1;padding:12px 0;border-radius:12px;border:none;
        background:linear-gradient(135deg,#7dd3fc,#38bdf8,#0284c7);color:#fff;
        font:inherit;font-size:15px;font-weight:600;cursor:pointer;
        box-shadow:0 4px 14px rgba(56,189,248,0.3);
      ">${confirmText}</button>
    </div>
  `

  overlay.appendChild(dialog)
  document.body.appendChild(overlay)

  let resolved = false
  const finish = (confirm: boolean) => {
    if (resolved) return
    resolved = true
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
    options.success?.({ confirm, cancel: !confirm })
  }

  dialog.querySelector<HTMLButtonElement>('button[data-action="confirm"]')?.addEventListener(
    'click',
    () => finish(true),
  )
  dialog
    .querySelector<HTMLButtonElement>('button[data-action="cancel"]')
    ?.addEventListener('click', () => finish(false))
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && showCancel) {
      finish(false)
    }
  })
}

/**
 * 显示操作菜单
 *
 * 在原生 / 非原生环境下使用一致的自定义底部弹层 UI，避免依赖 window.prompt 这种
 * 在 Android WebView 中体验极差、且某些系统下根本不弹出的方案。
 */
export function showActionSheet(options: ShowActionSheetOptions): void {
  if (typeof window === 'undefined') {
    options.fail?.({ errMsg: 'no window' })
    return
  }

  // 过滤掉「取消」选项，单独以底部按钮呈现，符合常见的原生 ActionSheet 体验。
  const cancelLabels = new Set(['取消', 'cancel', 'Cancel'])
  const items = options.itemList || []
  const filtered: { label: string; index: number }[] = []
  items.forEach((label, index) => {
    if (cancelLabels.has(label)) return
    filtered.push({ label, index })
  })

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10100;
    display: flex; align-items: flex-end; justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: action-sheet-fade 160ms ease forwards;
  `

  const sheet = document.createElement('div')
  sheet.style.cssText = `
    width: 100%;
    max-width: 480px;
    margin: 0 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
    border-radius: 18px;
    overflow: hidden;
    font-family: inherit;
    color: #f8fafc;
    transform: translateY(8px);
    opacity: 0;
    transition: transform 180ms ease, opacity 180ms ease;
  `

  const itemColor = options.itemColor || '#38bdf8'

  const titlePart = options.title
    ? `<div style="
          padding: 14px 18px;
          background: linear-gradient(180deg, rgba(15,23,42,0.94), rgba(7,13,24,0.96));
          color: rgba(226,232,240,0.78);
          font-size: 13px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        ">${options.title}</div>`
    : ''

  const itemsHtml = filtered
    .map(
      (item, position) => `
        <button
          type="button"
          data-index="${item.index}"
          style="
            display: block;
            width: 100%;
            padding: 16px 18px;
            border: none;
            ${position === 0 ? '' : 'border-top: 1px solid rgba(255,255,255,0.06);'}
            background: linear-gradient(180deg, rgba(15,23,42,0.94), rgba(7,13,24,0.96));
            color: ${itemColor};
            font-size: 16px;
            text-align: center;
            cursor: pointer;
          "
        >${item.label}</button>
      `,
    )
    .join('')

  const cancelBtnHtml = `
    <button
      type="button"
      data-cancel="1"
      style="
        display: block;
        width: 100%;
        margin-top: 8px;
        padding: 16px 18px;
        border: none;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(15,23,42,0.94), rgba(7,13,24,0.96));
        color: rgba(226,232,240,0.92);
        font-size: 16px;
        text-align: center;
        cursor: pointer;
      "
    >取消</button>
  `

  sheet.innerHTML = `
    <div style="border-radius: 18px; overflow: hidden;">
      ${titlePart}
      ${itemsHtml}
    </div>
    ${cancelBtnHtml}
  `

  overlay.appendChild(sheet)
  document.body.appendChild(overlay)

  // 入场动画
  requestAnimationFrame(() => {
    sheet.style.transform = 'translateY(0)'
    sheet.style.opacity = '1'
  })

  let resolved = false
  const cleanup = () => {
    if (resolved) return
    resolved = true
    sheet.style.transform = 'translateY(12px)'
    sheet.style.opacity = '0'
    overlay.style.opacity = '0'
    overlay.style.transition = 'opacity 140ms ease'
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }, 160)
  }

  sheet.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number((btn as HTMLElement).dataset.index || '-1')
      cleanup()
      if (index >= 0 && index < items.length) {
        options.success?.({ tapIndex: index, content: items[index] })
      } else {
        options.fail?.({ errMsg: 'cancel' })
      }
    })
  })

  sheet.querySelector('button[data-cancel]')?.addEventListener('click', () => {
    cleanup()
    options.fail?.({ errMsg: 'cancel' })
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup()
      options.fail?.({ errMsg: 'cancel' })
    }
  })
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
        input.style.display = 'none'
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
          document.body.removeChild(input)
        }
        document.body.appendChild(input)
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

/**
 * 删除存储
 */
export function removeStorageSync(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key)
  }
}

/**
 * 获取系统信息
 */
export function getSystemInfoSync(): { language?: string; platform?: string; windowWidth?: number; windowHeight?: number } {
  if (typeof window === 'undefined') {
    return {}
  }

  return {
    language: window.navigator?.language,
    platform: window.navigator?.platform,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
  }
}

/**
 * 退出应用（仅原生端生效）
 */
export function exitApp(): void {
  if (typeof window !== 'undefined') {
    const cap = (window as any).Capacitor
    if (cap?.Plugins?.App?.exitApp) {
      cap.Plugins.App.exitApp()
    }
  }
}

// 导出 uni 对象
export const uni = {
  showToast,
  showModal,
  showActionSheet,
  navigateTo,
  navigateBack,
  chooseImage,
  setStorageSync,
  getStorageSync,
  removeStorageSync,
  getSystemInfoSync,
  exitApp
}

// 全局注册
if (typeof window !== 'undefined') {
  (window as any).uni = uni
}
