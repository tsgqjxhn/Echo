import { registerPlugin } from '@capacitor/core'
import { isNativeRuntime } from './runtime-http'

interface NativePermissionResult {
  granted: boolean
  state: 'granted' | 'denied' | 'prompt'
}

interface NativePermissionPlugin {
  check(options: { alias: string }): Promise<NativePermissionResult>
  request(options: { alias: string }): Promise<NativePermissionResult>
}

const NativePermission = registerPlugin<NativePermissionPlugin>('NativePermission')

export type PermissionAlias = 'microphone' | 'camera' | 'storage'

const DIALOG_MESSAGES: Record<PermissionAlias, { title: string; message: string }> = {
  microphone: {
    title: '需要麦克风权限',
    message: '语音录制需要使用您的麦克风，允许后将开始录音。',
  },
  camera: {
    title: '需要相机权限',
    message: '拍照需要使用您的相机，允许后将打开相机。',
  },
  storage: {
    title: '需要存储权限',
    message: '选择文件需要访问您的相册/存储，允许后将打开文件选择器。',
  },
}

export async function checkPermission(alias: PermissionAlias): Promise<NativePermissionResult> {
  if (isNativeRuntime()) {
    return NativePermission.check({ alias })
  }

  if (alias === 'microphone' && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return {
        granted: status.state === 'granted',
        state: status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt',
      }
    } catch {
      return { granted: false, state: 'prompt' }
    }
  }

  if (alias === 'camera' && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return {
        granted: status.state === 'granted',
        state: status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt',
      }
    } catch {
      return { granted: false, state: 'prompt' }
    }
  }

  return { granted: false, state: 'prompt' }
}

function showPermissionDialog(alias: PermissionAlias): Promise<boolean> {
  const config = DIALOG_MESSAGES[alias]

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(true)
      return
    }

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
    `

    const dialog = document.createElement('div')
    dialog.style.cssText = `
      background: linear-gradient(145deg, #1a2a3a, #0f1f2f);
      border: 1px solid rgba(52,211,153,0.2);
      border-radius: 18px; padding: 28px 24px 20px;
      max-width: 320px; width: calc(100% - 48px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `

    const iconMap: Record<PermissionAlias, string> = {
      microphone: '&#127908;',
      camera: '&#128247;',
      storage: '&#128193;',
    }

    dialog.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;font-size:36px">${iconMap[alias]}</div>
      <div style="text-align:center;color:#e2e8f0;font-size:17px;font-weight:600;margin-bottom:12px">${config.title}</div>
      <div style="text-align:center;color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px">${config.message}</div>
      <div style="display:flex;gap:10px">
        <button id="perm-deny" style="
          flex:1;padding:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05);color:#94a3b8;font-size:15px;cursor:pointer;
        ">拒绝</button>
        <button id="perm-allow" style="
          flex:1;padding:12px 0;border-radius:12px;border:none;
          background:linear-gradient(135deg,#7dd3fc,#38bdf8,#0284c7);color:#fff;
          font-size:15px;font-weight:600;cursor:pointer;
          box-shadow:0 4px 14px rgba(56,189,248,0.3);
        ">允许</button>
      </div>
    `

    overlay.appendChild(dialog)
    document.body.appendChild(overlay)

    const cleanup = () => {
      document.body.removeChild(overlay)
    }

    dialog.querySelector('#perm-deny')!.addEventListener('click', () => {
      cleanup()
      resolve(false)
    })

    dialog.querySelector('#perm-allow')!.addEventListener('click', () => {
      cleanup()
      resolve(true)
    })

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    })
  })
}

export async function requestPermission(alias: PermissionAlias): Promise<NativePermissionResult> {
  const current = await checkPermission(alias)
  if (current.granted) {
    return current
  }

  // Web Permissions API can report a stale "denied" state after users changed
  // site settings. For microphone/camera, the authoritative check is the real
  // getUserMedia request below, so do not block before trying it.
  if (current.state === 'denied' && (isNativeRuntime() || alias === 'storage')) {
    const config = DIALOG_MESSAGES[alias]
    if (typeof window !== 'undefined') {
      alert(`${config.title}\n\n${config.message}\n\n请在系统设置中手动开启权限。`)
    }
    return { granted: false, state: 'denied' }
  }

  if (isNativeRuntime()) {
    // On native, request directly (system dialog handles the prompt)
    try {
      const result = await NativePermission.request({ alias })
      if (!result.granted) {
        const config = DIALOG_MESSAGES[alias]
        alert(`${config.title}\n\n${config.message}\n\n请在系统设置中手动开启权限。`)
      }
      return result
    } catch {
      return { granted: false, state: 'denied' }
    }
  }

  const userConfirmed = await showPermissionDialog(alias)
  if (!userConfirmed) {
    return { granted: false, state: 'denied' }
  }

  if (alias === 'microphone') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return { granted: true, state: 'granted' }
    } catch {
      const config = DIALOG_MESSAGES[alias]
      alert(`${config.title}\n\n${config.message}\n\n请在浏览器设置中允许麦克风访问。`)
      return { granted: false, state: 'denied' }
    }
  }

  if (alias === 'camera') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      return { granted: true, state: 'granted' }
    } catch {
      return { granted: false, state: 'denied' }
    }
  }

  return { granted: true, state: 'granted' }
}
