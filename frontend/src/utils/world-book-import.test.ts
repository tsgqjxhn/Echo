import { describe, expect, it } from 'vitest'
import { parseWorldBookFromJSON } from './world-book-import'

describe('parseWorldBookFromJSON', () => {
  it('parses entries array', () => {
    const result = parseWorldBookFromJSON({
      name: '测试书',
      entries: [{ keywords: ['剑'], content: '一把剑' }],
    })
    expect(result?.name).toBe('测试书')
    expect(result?.entries).toHaveLength(1)
    expect(result?.entries[0].keywords).toEqual(['剑'])
  })

  it('returns null for invalid input', () => {
    expect(parseWorldBookFromJSON(null)).toBeNull()
    expect(parseWorldBookFromJSON('text')).toBeNull()
  })
})
