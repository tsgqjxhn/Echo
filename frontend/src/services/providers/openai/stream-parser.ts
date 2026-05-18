import type { StreamChunkResult } from '../types'
import type { TokenUsage } from '@/types/chat'

function normalizeUsage(usage: unknown): TokenUsage | undefined {
  if (!usage || typeof usage !== 'object') return undefined

  const u = usage as Record<string, unknown>
  const completionDetails = u.completion_tokens_details && typeof u.completion_tokens_details === 'object'
    ? u.completion_tokens_details as Record<string, unknown>
    : undefined
  const promptTokens = Number(u.prompt_tokens ?? u.promptTokens)
  const completionTokens = Number(u.completion_tokens ?? u.completionTokens)
  const thinkingTokens = Number(
    u.reasoning_tokens ??
    u.reasoningTokens ??
    u.thinking_tokens ??
    u.thinkingTokens ??
    completionDetails?.reasoning_tokens ??
    completionDetails?.reasoningTokens
  )
  const totalTokens = Number(u.total_tokens ?? u.totalTokens)

  if (![promptTokens, completionTokens, thinkingTokens, totalTokens].some(Number.isFinite)) return undefined

  const normalizedPrompt = Number.isFinite(promptTokens) ? promptTokens : 0
  const normalizedCompletion = Number.isFinite(completionTokens) ? completionTokens : 0
  const normalizedThinking = Number.isFinite(thinkingTokens) ? thinkingTokens : 0

  return {
    promptTokens: normalizedPrompt,
    completionTokens: normalizedCompletion,
    thinkingTokens: normalizedThinking,
    totalTokens: Number.isFinite(totalTokens)
      ? totalTokens
      : normalizedPrompt + normalizedCompletion + normalizedThinking,
  }
}

function extractTextFragment(value: unknown): string {
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value.map(part => extractTextFragment(part)).join('')
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  const record = value as Record<string, unknown>
  if (typeof record.text === 'string') {
    return record.text
  }

  if (record.text && typeof record.text === 'object') {
    const nestedText = record.text as Record<string, unknown>
    if (typeof nestedText.value === 'string') {
      return nestedText.value
    }
  }

  if (typeof record.value === 'string') {
    return record.value
  }

  if (record.content !== undefined) {
    return extractTextFragment(record.content)
  }

  if (typeof record.delta === 'string') {
    return record.delta
  }

  return ''
}

export function parseOpenAIStreamLine(line: string): StreamChunkResult | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith('data:')) return null
  const payload = trimmed.slice(5).trim()
  if (payload === '[DONE]') return { content: '', done: true }

  try {
    const data = JSON.parse(payload) as Record<string, unknown>
    const eventType = typeof data.type === 'string' ? data.type : ''

    if (eventType === 'response.output_text.delta') {
      const content = extractTextFragment(data.delta)
      return content ? { content, done: false, usage: normalizeUsage(data.usage) } : null
    }

    if (eventType === 'response.completed') {
      return {
        content: '',
        done: true,
        usage: normalizeUsage(
          data.response && typeof data.response === 'object'
            ? (data.response as Record<string, unknown>).usage
            : data.usage
        ),
      }
    }

    const choice = Array.isArray(data.choices)
      ? data.choices[0] as Record<string, unknown> | undefined
      : undefined
    const delta = choice?.delta as Record<string, unknown> | undefined
    const message = choice?.message as Record<string, unknown> | undefined
    const content = extractTextFragment(delta?.content ?? message?.content ?? choice?.text)
    const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined

    if (content || finishReason) {
      return {
        content,
        finishReason,
        usage: normalizeUsage(data.usage),
        done: Boolean(finishReason),
      }
    }

    return null
  } catch {
    return null
  }
}

export function extractMessageText(content: unknown): string {
  return extractTextFragment(content)
}

export { normalizeUsage }
