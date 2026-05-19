import { describe, expect, it } from 'vitest'
import { escapeHTML, formatMessageBubbleHtml, formatTextWithLineBreaks } from './escape-html'

describe('escapeHTML', () => {
  it('escapes script tags', () => {
    expect(escapeHTML('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b')
  })
})

describe('formatTextWithLineBreaks', () => {
  it('converts newlines after escaping', () => {
    expect(formatTextWithLineBreaks('line1\n<script>')).toBe('line1<br>&lt;script&gt;')
  })
})

describe('formatMessageBubbleHtml', () => {
  it('highlights action spans when enabled', () => {
    const html = formatMessageBubbleHtml('你好（微笑）', { highlightActions: true })
    expect(html).toContain('<span class="action-text">（微笑）</span>')
    expect(html).not.toContain('<script')
  })
})
