import { storageDriver } from './storage'

export interface NetworkSettings {
  proxyEnabled: boolean
  proxyType: 'http' | 'https' | 'socks5'
  proxyHost: string
  proxyPort: number
  proxyUsername?: string
  proxyPassword?: string
  timeout: number
  concurrentLimit: number
  customHeaders: Array<{ key: string; value: string }>
  retryCount: number
  retryBackoff: 'fixed' | 'exponential' | 'linear'
  retryInitialDelay: number
}

const NETWORK_SETTINGS_KEY = 'network_settings'

export const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  proxyEnabled: false,
  proxyType: 'http',
  proxyHost: '',
  proxyPort: 7890,
  proxyUsername: '',
  proxyPassword: '',
  timeout: 60,
  concurrentLimit: 5,
  customHeaders: [],
  retryCount: 2,
  retryBackoff: 'exponential',
  retryInitialDelay: 1000,
}

export async function loadNetworkSettings(): Promise<NetworkSettings> {
  try {
    const raw = await storageDriver.getUserSetting(NETWORK_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_NETWORK_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<NetworkSettings>
    return {
      ...DEFAULT_NETWORK_SETTINGS,
      ...parsed,
      customHeaders: Array.isArray(parsed.customHeaders)
        ? parsed.customHeaders
        : DEFAULT_NETWORK_SETTINGS.customHeaders,
    }
  } catch {
    return { ...DEFAULT_NETWORK_SETTINGS }
  }
}

export async function saveNetworkSettings(settings: NetworkSettings): Promise<void> {
  await storageDriver.saveUserSetting(NETWORK_SETTINGS_KEY, JSON.stringify(settings))
}

let cachedNetworkSettings: NetworkSettings | null = null

export async function getEffectiveNetworkSettings(): Promise<NetworkSettings> {
  if (!cachedNetworkSettings) {
    cachedNetworkSettings = await loadNetworkSettings()
  }
  return cachedNetworkSettings
}

export function invalidateNetworkSettingsCache(): void {
  cachedNetworkSettings = null
}

export function buildProxyURL(settings: NetworkSettings): string | undefined {
  if (!settings.proxyEnabled || !settings.proxyHost) return undefined
  const protocol = settings.proxyType === 'https' ? 'https' : 'http'
  let url = `${protocol}://`
  if (settings.proxyUsername) {
    url += encodeURIComponent(settings.proxyUsername)
    if (settings.proxyPassword) {
      url += `:${encodeURIComponent(settings.proxyPassword)}`
    }
    url += '@'
  }
  url += settings.proxyHost
  if (settings.proxyPort) {
    url += `:${settings.proxyPort}`
  }
  return url
}

export function getCustomHeaders(settings: NetworkSettings): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const h of settings.customHeaders) {
    if (h.key.trim()) {
      headers[h.key.trim()] = h.value
    }
  }
  return headers
}

export function getRetryDelay(settings: NetworkSettings, attempt: number): number {
  const base = settings.retryInitialDelay
  switch (settings.retryBackoff) {
    case 'fixed':
      return base
    case 'exponential':
      return base * Math.pow(2, attempt)
    case 'linear':
      return base * (attempt + 1)
    default:
      return base
  }
}
