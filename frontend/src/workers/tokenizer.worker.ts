/**
 * Token 计算和 Embedding 计算 Web Worker
 * 
 * 将 CPU 密集型计算移至 Worker 线程，避免阻塞主线程导致 UI 卡顿
 * 
 * 支持的操作：
 * - estimateTokens: 单文本 Token 估算
 * - batchEstimateTokens: 批量文本 Token 估算
 * - localEmbed: 本地 hash-based embedding
 * - batchLocalEmbed: 批量本地 embedding
 */

// ============================================================================
// 消息类型定义
// ============================================================================

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

// ============================================================================
// Token 估算逻辑（从 token-counter.ts 移植）
// ============================================================================

/**
 * 简单 Token 估算:
 * - 中文字符 ≈ 1.5 tokens
 * - 英文单词 ≈ 1.3 tokens
 * - 数字/标点 ≈ 0.5 tokens
 */
function estimateTokens(text: string): number {
  if (!text) return 0
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const otherChars = text.length - chineseChars - englishWords
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5)
}

/**
 * 批量估算 Token
 * 减少 Worker 消息往返，提高性能
 */
function batchEstimateTokens(texts: string[]): number[] {
  return texts.map(text => estimateTokens(text))
}

// ============================================================================
// Local Embedding 逻辑（从 embedding.ts 移植）
// ============================================================================

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

function localEmbed(text: string): number[] {
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

/**
 * 批量计算 Local Embedding
 */
function batchLocalEmbed(texts: string[]): number[][] {
  return texts.map(text => localEmbed(text))
}

// ============================================================================
// Worker 消息处理器
// ============================================================================

/**
 * 处理来自主线程的消息
 * 使用 postMessage 将结果发送回主线程
 */
self.onmessage = (e: MessageEvent<TokenizerRequest>) => {
  const { id, type, payload } = e.data

  try {
    let result: any

    switch (type) {
      case 'estimateTokens':
        result = estimateTokens(payload)
        break
      case 'batchEstimateTokens':
        result = batchEstimateTokens(payload)
        break
      case 'localEmbed':
        result = localEmbed(payload)
        break
      case 'batchLocalEmbed':
        result = batchLocalEmbed(payload)
        break
      default:
        throw new Error(`Unknown request type: ${type}`)
    }

    const response: TokenizerResponse = {
      id,
      type,
      result,
    }

    self.postMessage(response)
  } catch (error) {
    const response: TokenizerResponse = {
      id,
      type,
      error: error instanceof Error ? error.message : String(error),
    }

    self.postMessage(response)
  }
}

// 导出类型供主线程使用（仅类型，无运行时代码）
export type { TokenizerRequest, TokenizerResponse }
