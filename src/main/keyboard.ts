import { BrowserWindow } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'
import { loadNativeAddon } from './nativeBindings'

const ignoredKey = ['MOUSE LEFT', 'MOUSE RIGHT', 'MOUSE MIDDLE', 'MOUSE BUTTON4', 'MOUSE BUTTON5']

export function detectKeyboards(): void {
  // ======== KeyFinder の呼び出しテスト ==========
  try {
    const keyFinder = loadNativeAddon('keyfinder') as {
      findKeyboards: () => { name: string; path: string }[]
    }
    const keyboards = keyFinder.findKeyboards()
    console.log('=== Detected keyboards ===')
    for (const k of keyboards) {
      console.log(`Name: ${k.name}, Path: ${k.path}`)
    }
  } catch (error) {
    console.error('Failed to load KeyFinder addon:', error)
  }
  // ===============================================
}

export function setupKeyListener(mainWindow: BrowserWindow): { kill: () => void } {
  let keyListener
  const isWayland = process.platform === 'linux' && process.env['XDG_SESSION_TYPE'] === 'wayland'

  if (isWayland) {
    console.log('Environment: Wayland')
    try {
      const keyListenerWayland = loadNativeAddon('keylistener') as {
        KeyListener: new (path: string) => {
          start: (callback: (event: { type: string; error?: string }) => void) => void
          stop: () => void
        }
      }

      const devicePath = '/dev/input/event12' // TODO: Add logic to dynamically find the keyboard device
      const nativeListener = new keyListenerWayland.KeyListener(devicePath)

      keyListener = {
        addListener: (callback) => {
          nativeListener.start((event) => {
            if (event.type === 'error') {
              console.error('KeyListener error:', event.error)
            } else {
              callback(event)
            }
          })
        },
        kill: () => {
          nativeListener.stop()
        }
      }
    } catch (error) {
      console.error('Failed to load Wayland key listener:', error)
      keyListener = new GlobalKeyboardListener()
    }
  } else {
    console.log('Environment: X11 or non-Linux')
    keyListener = new GlobalKeyboardListener()
  }

  keyListener.addListener((e: { state: string; name: string }) => {
    if (e.state === 'DOWN' && e.name && !ignoredKey.includes(e.name)) {
      mainWindow?.webContents.send('key-down')
    }
  })

  return keyListener
}
