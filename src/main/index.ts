import { app, shell, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerStoreIpcHandlers, store } from './store'
import { registerFileLoaderIpcHandlers } from './fileLoader'
import { detectKeyboards, registerKeyboardIpcHandlers, setupKeyListener } from './keyboard'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

let keyboardSettingsWindow: BrowserWindow | null = null
let keyListener: ReturnType<typeof setupKeyListener> | null = null

function stopKeyListener(): void {
  const currentListener = keyListener
  keyListener = null
  currentListener?.kill()
}

function restartKeyListener(): void {
  stopKeyListener()
  if (!mainWindow || mainWindow.isDestroyed()) return

  const selectedNames: string[] = store.get('selectedKeyboards')
  const devicePaths = detectKeyboards()
    .filter((keyboard) => selectedNames.includes(keyboard.name))
    .map((keyboard) => keyboard.path)

  keyListener = setupKeyListener(mainWindow, devicePaths)
}

async function openKeyboardSettingsWindow(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (keyboardSettingsWindow && !keyboardSettingsWindow.isDestroyed()) {
    keyboardSettingsWindow.show()
    keyboardSettingsWindow.focus()
    return
  }

  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: mainWindow,
    modal: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  keyboardSettingsWindow = settingsWindow

  settingsWindow.once('ready-to-show', () => {
    if (!settingsWindow.isDestroyed()) settingsWindow.show()
  })

  settingsWindow.on('closed', () => {
    if (keyboardSettingsWindow === settingsWindow) {
      keyboardSettingsWindow = null
    }
  })

  try {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && rendererUrl) {
      await settingsWindow.loadURL(new URL('/keyboardSettings.html', rendererUrl).toString())
    } else {
      await settingsWindow.loadFile(join(__dirname, '../renderer/keyboardSettings.html'))
    }
  } catch (error) {
    if (!settingsWindow.isDestroyed()) settingsWindow.destroy()
    throw error
  }
}

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

  mainWindow.on('closed', () => {
    mainWindow = null
    keyboardSettingsWindow?.destroy()
    stopKeyListener()
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
  registerStoreIpcHandlers()
  registerFileLoaderIpcHandlers()
  registerKeyboardIpcHandlers()

  ipcMain.handle('open-keyboard-settings', () => openKeyboardSettingsWindow())

  ipcMain.handle('restart-key-listener', () => restartKeyListener())

  ipcMain.handle('close-keyboard-settings', (event) => {
    if (keyboardSettingsWindow?.webContents === event.sender) {
      keyboardSettingsWindow.close()
    }
  })

  restartKeyListener()

  // For macOS
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      restartKeyListener()
    }
  })

  app.on('will-quit', () => {
    // Clean up resources if needed
    stopKeyListener()
    tray?.destroy()
  })
})

// For non-macOS platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
