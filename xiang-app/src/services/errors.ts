export class AppError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  details: string[]

  constructor(message: string, details: string[] = []) {
    super('VALIDATION_ERROR', message)
    this.details = details
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message)
    this.name = 'NotFoundError'
  }
}

export class APIError extends AppError {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super('API_ERROR', message)
    this.statusCode = statusCode
    this.name = 'APIError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super('NETWORK_ERROR', message)
    this.name = 'NetworkError'
  }
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error)
  }

  return new Error('发生未知错误，请稍后重试')
}

export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message
}
