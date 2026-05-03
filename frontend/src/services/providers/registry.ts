import type { APIProvider } from '@/types/api-config'
import type { ProviderAdapter } from './types'
import { localAdapter } from './local'
import { openaiAdapter, openaiCompatibleAdapter } from './openai'
import { anthropicAdapter } from './anthropic'
import { dashscopeAdapter } from './dashscope'
import { volcengineAdapter } from './volcengine'
import { geminiAdapter } from './gemini'
import { zhipuAdapter } from './zhipu'
import { grokAdapter } from './grok'
import { minimaxAdapter } from './minimax'
import { baiduAdapter } from './baidu'
import { bedrockAdapter } from './bedrock'
import { azureAdapter } from './azure'
import { ollamaAdapter } from './ollama'

const adapters = new Map<APIProvider, ProviderAdapter>()

function register(adapter: ProviderAdapter): void {
  adapters.set(adapter.providerId, adapter)
}

register(localAdapter)
register(ollamaAdapter)
register(openaiAdapter)
register(openaiCompatibleAdapter)
register(anthropicAdapter)
register(geminiAdapter)
register(grokAdapter)
register(azureAdapter)
register(bedrockAdapter)
register(dashscopeAdapter)
register(volcengineAdapter)
register(zhipuAdapter)
register(baiduAdapter)
register(minimaxAdapter)

export function getAdapter(provider: APIProvider): ProviderAdapter {
  const adapter = adapters.get(provider)
  if (!adapter) throw new Error(`Unknown provider: ${provider}`)
  return adapter
}

export function getAdapterOrDefault(provider?: string): ProviderAdapter {
  if (provider) {
    const adapter = adapters.get(provider as APIProvider)
    if (adapter) return adapter
  }
  return openaiCompatibleAdapter
}

export function getRegisteredProviders(): APIProvider[] {
  return Array.from(adapters.keys())
}

export { adapters }
