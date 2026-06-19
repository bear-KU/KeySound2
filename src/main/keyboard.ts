import { BrowserWindow, ipcMain } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'
import { loadNativeAddon } from './nativeBindings'
import { KeyboardDevice } from '../shared/types'

const ignoredKey = ['MOUSE LEFT', 'MOUSE RIGHT', 'MOUSE MIDDLE', 'MOUSE BUTTON4', 'MOUSE BUTTON5']

export function detectKeyboards(): KeyboardDevice[] {
  try {
    const keyFinder = loadNativeAddon('keyfinder') as {
      findKeyboards: () => KeyboardDevice[]
    }
    return keyFinder.findKeyboards()
  } catch (error) {
    console.error('Failed to load KeyFinder addon:', error)
    return []
  }
}

export function registerKeyboardIpcHandlers(): void {
  ipcMain.handle('detect-keyboards', () => {
    return detectKeyboards()
  })
}

export function setupKeyListener(
  mainWindow: BrowserWindow,
  devicePaths: string[]
): { kill: () => void } {
  const isWayland = process.platform === 'linux' && process.env['XDG_SESSION_TYPE'] === 'wayland'

  const listeners: { kill: () => void }[] = []

  if (isWayland) {
    console.log('Environment: Wayland')
    for (const devicePath of devicePaths) {
      try {
        const keyListenerWayland = loadNativeAddon('keylistener') as {
          KeyListener: new (path: string) => {
            start: (callback: (event: { type: string; error?: string }) => void) => void
            stop: () => void
          }
        }

        const nativeListener = new keyListenerWayland.KeyListener(devicePath)

        const listener = {
          addListener: (callback: (e: { state: string; name?: string }) => void) => {
            nativeListener.start((event) => {
              if (event.type === 'error') {
                console.error('KeyListener error:', event.error)
              } else {
                callback(event as unknown as { state: string; name: string })
              }
            })
          },
          kill: () => {
            nativeListener.stop()
          }
        }

        listener.addListener((e) => {
          if (e.state === 'DOWN' && e.name && !ignoredKey.includes(e.name)) {
            mainWindow.webContents.send('key-down')
          }
        })

        listeners.push(listener)
      } catch (error) {
        console.error(`Failed to load Wayland key listener for ${devicePath}:`, error)
      }
    }
  } else {
    console.log('Environment: X11 or non-Linux')
    const keyListener = new GlobalKeyboardListener()
    keyListener.addListener((e: { state: string; name?: string }) => {
      if (e.state === 'DOWN' && e.name && !ignoredKey.includes(e.name)) {
        mainWindow.webContents.send('key-down')
      }
    })
    listeners.push({ kill: () => keyListener.kill() })
  }

  return {
    kill: () => {
      for (const listener of listeners) {
        listener.kill()
      }
    }
  }
}
