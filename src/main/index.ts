import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
import { GlobalKeyboardListener } from 'node-global-key-listener'

import { SoundManager } from './SoundManager'
import defaultAudioPath from '../../resources/audio/mechanic.mp3?asset'
const currentAudioPath = defaultAudioPath

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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  const soundManager = new SoundManager(currentAudioPath)

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

      const devicePath = '/dev/input/event2' // TODO: Add logic to dynamically find the keyboard device
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
      soundManager.playSound()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
