import type { APIProvider } from '@/types/api-config'
import type { ProviderAdapter } from './types'
import { openaiAdapter, openaiCompatibleAdapter } from './openai'
import { anthropicAdapter } from './anthropic'
import { dashscopeAdapter } from './dashscope'
import { volcengineAdapter } from './volcengine'
import { geminiAdapter } from './gemini'
import { zhipuAdapter } from './zhipu'

const adapters = new Map<APIProvider, ProviderAdapter>()

function register(adapter: ProviderAdapter): void {
  adapters.set(adapter.providerId, adapter)
}

register(openaiAdapter)
register(openaiCompatibleAdapter)
register(anthropicAdapter)
register(dashscopeAdapter)
register(volcengineAdapter)
register(geminiAdapter)
register(zhipuAdapter)

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
