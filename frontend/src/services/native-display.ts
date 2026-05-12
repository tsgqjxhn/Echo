import { Capacitor, registerPlugin } from '@capacitor/core'

interface NativeDisplayPlugin {
  setLandscapeMode?(options: { enabled: boolean }): Promise<{ enabled: boolean }>
  setSurvivorMode(options: { enabled: boolean }): Promise<{ enabled: boolean }>
}

const NativeDisplay = registerPlugin<NativeDisplayPlugin>('NativeDisplay')

function isNativeRuntime(): boolean {
  try {
    if (typeof Capacitor.isNativePlatform === 'function') {
      return Capacitor.isNativePlatform()
    }
    return Capacitor.getPlatform() !== 'web'
  } catch {
    return false
  }
}

export async function setLandscapeDisplayMode(enabled: boolean): Promise<void> {
  if (!isNativeRuntime()) return

  try {
    if (typeof NativeDisplay.setLandscapeMode === 'function') {
      await NativeDisplay.setLandscapeMode({ enabled })
    } else {
      await NativeDisplay.setSurvivorMode({ enabled })
    }
  } catch (error) {
    console.warn('[native-display] failed to update landscape display mode', error)
  }
}

export const setSurvivorDisplayMode = setLandscapeDisplayMode
