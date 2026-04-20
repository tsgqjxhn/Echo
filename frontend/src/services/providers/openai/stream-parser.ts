import type { StreamChunkResult } from '../types'
import type { TokenUsage } from '@/types/chat'

function normalizeUsage(usage: unknown): TokenUsage | undefined {
  if (!usage || typeof usage !== 'object') return undefined

  const u = usage as Record<string, unknown>
  const promptTokens = Number(u.prompt_tokens ?? u.promptTokens)
  const completionTokens = Number(u.completion_tokens ?? u.completionTokens)
  const totalTokens = Number(u.total_tokens ?? u.totalTokens)

  if (![promptTokens, completionTokens, totalTokens].some(Number.isFinite)) return undefined

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
  }
}

export function parseOpenAIStreamLine(line: string): StreamChunkResult | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith('data: ')) return null
  if (trimmed === 'data: [DONE]') return { content: '', done: true }

  try {
    const data = JSON.parse(trimmed.slice(6))
    const choice = data.choices?.[0]
    const content = choice?.delta?.content || ''
    const finishReason = choice?.finish_reason

    if (content || finishReason) {
      return {
        content,
        finishReason: finishReason || undefined,
        usage: normalizeUsage(data.usage),
        done: !!finishReason,
      }
    }

    return null
  } catch {
    return null
  }
}

export function extractMessageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part =>
        part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string'
          ? (part as Record<string, unknown>).text as string
          : ''
      )
      .join('')
  }
  return ''
}

export { normalizeUsage }
