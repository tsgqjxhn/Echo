/**
 * UUID 生成工具
 */

/**
 * 生成 UUID v4
 */
export function generateUUID(): string {
  // 使用 crypto.randomUUID 如果可用
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // 降级实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
