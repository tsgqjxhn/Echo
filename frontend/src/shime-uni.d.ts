/**
 * UniApp 类型声明补充
 */

declare module '@dcloudio/uni-app' {
  // uni.setStorageSync
  export function setStorageSync(key: string, data: any): void
  
  // uni.getStorageSync
  export function getStorageSync(key: string): any
  
  // uni.navigateTo
  export function navigateTo(options: { url: string }): void
  
  // uni.navigateBack
  export function navigateBack(options?: { delta?: number }): void
  
  // uni.showToast
  export function showToast(options: {
    title: string
    icon?: 'success' | 'error' | 'loading' | 'none'
    duration?: number
    mask?: boolean
  }): void
  
  // uni.chooseImage
  export function chooseImage(options: {
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
  }): void
  
  // onLoad 生命周期
  export function onLoad(callback: (options: Record<string, string>) => void): void
  
  // onMounted 的别名
  export function onMounted(callback: () => void): void
}

declare const uni: {
  setStorageSync(key: string, data: any): void
  getStorageSync(key: string): any
  navigateTo(options: { url: string }): void
  navigateBack(options?: { delta?: number }): void
  showToast(options: {
    title: string
    icon?: 'success' | 'error' | 'loading' | 'none'
    duration?: number
    mask?: boolean
  }): void
  chooseImage(options: {
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
  }): void
}

export {}
