import type { ChatMessage } from '@/types/chat'
import { generateUUID } from '@/utils/uuid'

// ============================================================================
// 同步计算函数（保留作为 Worker 不可用时的回退）
// ============================================================================

/**
 * Simple token estimation:
 * - Chinese characters ≈ 1.5 tokens
 * - English words ≈ 1.3 tokens
 * - Numbers/punctuation ≈ 0.5 tokens
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const otherChars = text.length - chineseChars - englishWords
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5)
}

/**
 * 本地 hash-based embedding 计算（仅内部使用）
 */
function localEmbedSync(text: string): number[] {
  const VECTOR_DIMENSION = 128

  function hashString(str: string, seed: number): number {
    let h = seed
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995)
      h ^= h >>> 15
    }
    return h
  }

  function textToNgrams(text: string, n: number): string[] {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
    if (normalized.length < n) return [normalized]
    const ngrams: string[] = []
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.push(normalized.slice(i, i + n))
    }
    return ngrams
  }

  const ngrams = textToNgrams(text, 3)
  const vec = new Float64Array(VECTOR_DIMENSION)

  for (const ngram of ngrams) {
    const bucket = Math.abs(hashString(ngram, 0)) % VECTOR_DIMENSION
    const sign = hashString(ngram, 1) % 2 === 0 ? 1 : -1
    vec[bucket] += sign
  }

  // L2 normalize
  let norm = 0
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    norm += vec[i] * vec[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vec[i] /= norm
    }
  }

  return Array.from(vec)
}

// ============================================================================
// Web Worker 池管理
// 异步计算 Token，避免阻塞主线程
// ============================================================================

/** Worker 消息类型定义 */
interface TokenizerRequest {
  id: string
  type: 'estimateTokens' | 'batchEstimateTokens' | 'localEmbed' | 'batchLocalEmbed'
  payload: any
}

interface TokenizerResponse {
  id: string
  type: string
  result?: any
  error?: string
}

/**
 * Tokenizer Worker 池
 * 单例模式管理 Worker 实例，懒加载创建
 * 包含优雅降级机制：Worker 不可用时回退到同步计算
 */
class TokenizerWorkerPool {
  private worker: Worker | null = null
  private workerSupported = typeof Worker !== 'undefined'

  /**
   * 获取 Worker 实例（懒加载）
   * @throws 如果 Worker 不支持或创建失败
   */
  private getWorker(): Worker {
    if (!this.workerSupported) {
      throw new Error('Web Worker not supported')
    }

    if (!this.worker) {
      try {
        // Vite 特有 Worker 创建方式：使用 new URL + import.meta.url
        this.worker = new Worker(
          new URL('../workers/tokenizer.worker.ts', import.meta.url),
          { type: 'module' }
        )
      } catch (error) {
        this.workerSupported = false
        throw error
      }
    }

    return this.worker
  }

  /**
   * 发送请求到 Worker 并等待响应
   */
  private async request<T>(
    type: TokenizerRequest['type'],
    payload: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const worker = this.getWorker()
        const id = generateUUID()

        const messageHandler = (e: MessageEvent<TokenizerResponse>) => {
          if (e.data.id === id) {
            worker.removeEventListener('message', messageHandler)
            worker.removeEventListener('error', errorHandler)

            if (e.data.error) {
              reject(new Error(e.data.error))
            } else {
              resolve(e.data.result as T)
            }
          }
        }

        const errorHandler = (error: ErrorEvent) => {
          worker.removeEventListener('message', messageHandler)
          worker.removeEventListener('error', errorHandler)
          reject(new Error(`Worker error: ${error.message}`))
        }

        worker.addEventListener('message', messageHandler)
        worker.addEventListener('error', errorHandler)

        const request: TokenizerRequest = { id, type, payload }
        worker.postMessage(request)
      } catch {
        // Worker 创建失败，回退到同步计算
        reject(new Error('Worker unavailable'))
      }
    })
  }

  /**
   * 异步估算 Token（带自动降级）
   * 如果 Worker 不可用，回退到同步计算
   */
  async estimateTokens(text: string): Promise<number> {
    try {
      return await this.request<number>('estimateTokens', text)
    } catch {
      // 降级到同步计算
      return estimateTokens(text)
    }
  }

  /**
   * 批量异步估算 Token
   */
  async batchEstimateTokens(texts: string[]): Promise<number[]> {
    try {
      return await this.request<number[]>('batchEstimateTokens', texts)
    } catch {
      // 降级到同步计算
      return texts.map(t => estimateTokens(t))
    }
  }

  /**
   * 异步计算 Local Embedding
   */
  async localEmbed(text: string): Promise<number[]> {
    try {
      return await this.request<number[]>('localEmbed', text)
    } catch {
      // 降级到同步计算
      return localEmbedSync(text)
    }
  }

  /**
   * 批量异步计算 Local Embedding
   */
  async batchLocalEmbed(texts: string[]): Promise<number[][]> {
    try {
      return await this.request<number[][]>('batchLocalEmbed', texts)
    } catch {
      // 降级到同步计算
      return texts.map(t => localEmbedSync(t))
    }
  }

  /**
   * 手动销毁 Worker 实例
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

/** 全局单例 Worker 池 */
export const tokenizerWorker = new TokenizerWorkerPool()

export interface TokenBreakdown {
  systemTokens: number
  historyTokens: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number
}

export function estimateChatTokens(
  messages: ChatMessage[],
  systemPrompt?: string
): TokenBreakdown {
  let systemTokens = 0
  let historyTokens = 0
  let inputTokens = 0
  let outputTokens = 0

  if (systemPrompt?.trim()) {
    systemTokens = estimateTokens(systemPrompt.trim())
  }

  const lastUserIndex = messages.length - 1
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    const tokens = estimateTokens(content)

    if (msg.role === 'system') {
      systemTokens += tokens
    } else if (msg.role === 'user') {
      if (i === lastUserIndex) {
        inputTokens += tokens
      } else {
        historyTokens += tokens
      }
    } else if (msg.role === 'assistant') {
      historyTokens += tokens
    }
  }

  // Add overhead for message formatting (~4 tokens per message)
  const overhead = messages.length * 4
  systemTokens += overhead

  const totalTokens = systemTokens + historyTokens + inputTokens + outputTokens

  return {
    systemTokens,
    historyTokens,
    inputTokens,
    outputTokens,
    totalTokens,
  }
}

// Rough model pricing (USD per 1K tokens) for cost estimation
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'qwen-turbo': { input: 0.0005, output: 0.002 },
  'qwen-plus': { input: 0.0008, output: 0.002 },
  'qwen-max': { input: 0.002, output: 0.006 },
  'doubao-pro': { input: 0.0008, output: 0.002 },
  'doubao-lite': { input: 0.0003, output: 0.0006 },
  'glm-4': { input: 0.001, output: 0.002 },
  'glm-4-flash': { input: 0.0001, output: 0.0001 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(MODEL_PRICING).find(k => model.toLowerCase().includes(k.toLowerCase()))
  if (!key) return 0
  const pricing = MODEL_PRICING[key]
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

export function estimateCostForBreakdown(breakdown: TokenBreakdown, model?: string): number {
  if (!model) return 0
  // Assume output is ~60% of input for estimation
  const estimatedOutput = Math.round(breakdown.inputTokens * 0.6)
  return estimateCost(model, breakdown.totalTokens, estimatedOutput)
}
