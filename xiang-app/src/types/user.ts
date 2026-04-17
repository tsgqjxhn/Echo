export interface UserInfo {
  name?: string
  avatar?: string
  globalPrompt?: string
  fortuneCoins?: number
  chatLevel?: number
  gameLevel?: number
}

export type ThemeType = 'auto' | 'light' | 'dark'

export const THEME_DISPLAY_NAMES: Record<ThemeType, string> = {
  auto: '自动',
  light: '浅色',
  dark: '深色'
}
