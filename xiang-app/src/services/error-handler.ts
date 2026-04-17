import { uni } from '@/utils/uni-polyfill'
import { APIError, AppError, normalizeError } from './errors'

export class ErrorHandler {
  static handle(error: unknown): void {
    if (error instanceof APIError) {
      this.handleAPIError(error)
      return
    }

    if (error instanceof AppError) {
      this.handleAppError(error)
      return
    }

    this.handleUnknownError(normalizeError(error))
  }

  private static handleAppError(error: AppError): void {
    console.error(`[AppError] ${error.code}: ${error.message}`)

    uni.showToast({
      title: error.message,
      icon: 'none',
      duration: 2200
    })
  }

  private static handleAPIError(error: APIError): void {
    console.error(`[APIError] ${error.statusCode}: ${error.message}`)

    let message = error.message

    if (error.statusCode === 401) {
      message = 'API 密钥无效，请检查配置'
    } else if (error.statusCode === 429) {
      message = '请求过于频繁，请稍后重试'
    } else if (error.statusCode >= 500) {
      message = '服务暂时不可用，请稍后再试'
    }

    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2800
    })
  }

  private static handleUnknownError(error: Error): void {
    console.error('[UnknownError]', error)

    uni.showToast({
      title: error.message || '发生未知错误，请重试',
      icon: 'none',
      duration: 2200
    })
  }
}

export const handleError = ErrorHandler.handle.bind(ErrorHandler)
