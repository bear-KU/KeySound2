import { app, shell, BrowserWindow, Tray, nativeImage, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readFile } from 'fs/promises'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
import { GlobalKeyboardListener } from 'node-global-key-listener'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  let trayIcon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 22, height: 22 })
  } else if (process.platform === 'linux') {
    trayIcon = trayIcon.resize({ width: 32, height: 32 })
  }
  tray = new Tray(trayIcon)
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac'] }]
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('read-audio-file', async (_, filePath: string) => {
    const buffer = await readFile(filePath)
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
  })

  // ======== KeyFinder の呼び出しテスト ==========
  try {
    const bindings = require('bindings')
    const keyFinder = bindings({
      module_root: join(__dirname, '../../native'),
      bindings: 'keyfinder'
    })

    const keyboards = keyFinder.findKeyboards()
    console.log('=== Detected keyboards ===')
    for (const k of keyboards) {
      console.log(`Name: ${k.name}, Path: ${k.path}`)
    }
  } catch (error) {
    console.error('Failed to load KeyFinder addon:', error)
  }
  // ===============================================

  let keyListener
  const isWayland = process.platform === 'linux' && process.env['XDG_SESSION_TYPE'] === 'wayland'

  if (isWayland) {
    console.log('Environment: Wayland')
    try {
      const bindings = require('bindings')
      const keyListenerWayland = bindings({
        module_root: join(__dirname, '../../native'),
        bindings: 'keylistener'
      })

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

  const ignoredKey = ['MOUSE LEFT', 'MOUSE RIGHT', 'MOUSE MIDDLE', 'MOUSE BUTTON4', 'MOUSE BUTTON5']

  keyListener.addListener((e) => {
    if (e.state === 'DOWN' && e.name && !ignoredKey.includes(e.name)) {
      mainWindow?.webContents.send('key-down')
    }
  })

  // For macOS
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('will-quit', () => {
    // Clean up resources if needed
    keyListener.kill()
    tray?.destroy()
  })
})

// For non-macOS platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
