/** 脱敏占位符：保存时若未修改 Key 则保留原值 */
export const MASKED_API_KEY_PLACEHOLDER = '••••••••'

export function maskApiKey(apiKey: string | undefined | null): string {
  const key = (apiKey || '').trim()
  if (!key) return ''
  if (key.length <= 8) return MASKED_API_KEY_PLACEHOLDER
  const head = key.slice(0, 4)
  const tail = key.slice(-4)
  return `${head}${'•'.repeat(Math.min(12, key.length - 8))}${tail}`
}

export function isMaskedApiKey(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim()
  return v === MASKED_API_KEY_PLACEHOLDER || (v.includes('•') && v.length >= 8)
}
