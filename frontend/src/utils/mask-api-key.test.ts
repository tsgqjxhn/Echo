import { describe, expect, it } from 'vitest'
import { isMaskedApiKey, maskApiKey, MASKED_API_KEY_PLACEHOLDER } from './mask-api-key'

describe('maskApiKey', () => {
  it('masks long keys with head and tail', () => {
    const masked = maskApiKey('sk-abcdefghijklmnopqrstuvwxyz')
    expect(masked.startsWith('sk-a')).toBe(true)
    expect(masked.endsWith('wxyz')).toBe(true)
    expect(masked).toContain('•')
  })

  it('uses placeholder for short keys', () => {
    expect(maskApiKey('abc')).toBe(MASKED_API_KEY_PLACEHOLDER)
  })
})

describe('isMaskedApiKey', () => {
  it('detects masked values', () => {
    expect(isMaskedApiKey(maskApiKey('sk-1234567890abcdef'))).toBe(true)
    expect(isMaskedApiKey('sk-live-real-key')).toBe(false)
  })
})
