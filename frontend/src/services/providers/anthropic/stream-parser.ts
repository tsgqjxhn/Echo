import type { StreamChunkResult } from '../types'

interface AnthropicDelta {
  type?: string
  text?: string
  stop_reason?: string
}

interface AnthropicStreamEvent {
  type: string
  delta?: AnthropicDelta
  message?: {
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  usage?: { output_tokens?: number }
}

let pendingEventType = ''

export function parseAnthropicStreamLine(line: string): StreamChunkResult | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('event: ')) {
    pendingEventType = trimmed.slice(7).trim()
    return null
  }

  if (!trimmed.startsWith('data: ')) return null
  if (pendingEventType === 'message_stop') {
    pendingEventType = ''
    return { content: '', done: true }
  }

  try {
    const data: AnthropicStreamEvent = JSON.parse(trimmed.slice(6))

    if (data.type === 'content_block_delta' || pendingEventType === 'content_block_delta') {
      const text = data.delta?.text || ''
      if (text) {
        return { content: text, done: false }
      }
    }

    if (data.type === 'message_delta') {
      const stopReason = data.delta?.stop_reason
      if (stopReason) {
        return {
          content: '',
          finishReason: stopReason,
          usage: data.usage?.output_tokens
            ? { promptTokens: 0, completionTokens: data.usage.output_tokens, totalTokens: data.usage.output_tokens }
            : undefined,
          done: true,
        }
      }
    }

    return null
  } catch {
    return null
  } finally {
    if (trimmed.startsWith('data: ')) pendingEventType = ''
  }
}
