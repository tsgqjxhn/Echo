/**
 * Embedding 服务: 将文本转为向量
 * 支持两种模式:
 * 1. API embedding (OpenAI / DashScope 兼容接口)
 * 2. 本地 hash-based fallback (无需网络, 精度较低但可用)
 */

const VECTOR_DIMENSION = 128

export interface EmbeddingProvider {
  name: string
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

// ── Local hash-based embedding (fallback) ──

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

export class LocalHashEmbeddingProvider implements EmbeddingProvider {
  name = 'local-hash'
  async embed(text: string): Promise<number[]> {
    return localEmbed(text)
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(t => localEmbed(t))
  }
}

// ── API-based embedding (OpenAI-compatible /v1/embeddings) ──

export class APIEmbeddingProvider implements EmbeddingProvider {
  name = 'api'
  private baseURL: string
  private apiKey: string
  private model: string

  constructor(baseURL: string, apiKey: string, model = 'text-embedding-3-small') {
    this.baseURL = baseURL.replace(/\/+$/, '')
    this.apiKey = apiKey
    this.model = model
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const url = `${this.baseURL}/v1/embeddings`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    })

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`)
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>
    }

    return data.data
      .sort((a, b) => 0) // preserve order
      .map(d => d.embedding)
  }
}

// ── Singleton provider management ──

let activeProvider: EmbeddingProvider = new LocalHashEmbeddingProvider()

export function getEmbeddingProvider(): EmbeddingProvider {
  return activeProvider
}

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  activeProvider = provider
}

export function configureAPIEmbedding(baseURL: string, apiKey: string, model?: string): void {
  activeProvider = new APIEmbeddingProvider(baseURL, apiKey, model)
}

export function resetToLocalEmbedding(): void {
  activeProvider = new LocalHashEmbeddingProvider()
}

// ── Similarity utilities ──

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}
