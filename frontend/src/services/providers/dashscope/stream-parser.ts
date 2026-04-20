import type { StreamChunkResult } from '../types'

interface DashScopeChoice {
  message?: { content?: string; role?: string }
  finish_reason?: string
}

export function parseDashScopeStreamLine(line: string): StreamChunkResult | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith('data:')) return null

  const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
  if (!jsonStr || jsonStr === '[DONE]') return { content: '', done: true }

  try {
    const data = JSON.parse(jsonStr) as Record<string, unknown>
    const output = data.output as Record<string, unknown> | undefined
    const choices = (output?.choices || data.choices) as DashScopeChoice[] | undefined

    if (!Array.isArray(choices) || choices.length === 0) return null

    const choice = choices[0]
    const content = choice?.message?.content || ''
    const finishReason = choice?.finish_reason

    const usage = data.usage as Record<string, unknown> | undefined
    const tokenUsage = usage
      ? {
          promptTokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
          completionTokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
          totalTokens: Number(usage.total_tokens ?? 0),
        }
      : undefined

    if (content || finishReason) {
      return {
        content,
        finishReason: finishReason || undefined,
        usage: tokenUsage,
        done: !!finishReason,
      }
    }

    return null
  } catch {
    return null
  }
}
