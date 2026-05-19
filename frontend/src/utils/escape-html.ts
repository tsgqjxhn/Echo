/**
 * HTML 转义与安全的消息富文本格式化
 */

export function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 转义后换行转 <br>（预览等简单场景） */
export function formatTextWithLineBreaks(text: string): string {
  return escapeHTML(text).replace(/\n/g, '<br>')
}

/** 消息气泡：转义、可选动作高亮、换行 */
export function formatMessageBubbleHtml(
  text: string,
  options?: { highlightActions?: boolean }
): string {
  const escaped = escapeHTML(text)
  const highlighted =
    options?.highlightActions === false
      ? escaped
      : escaped.replace(/（[^（）\n]+）/g, match => `<span class="action-text">${match}</span>`)
  return highlighted.replace(/\n/g, '<br>')
}
