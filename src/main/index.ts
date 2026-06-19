import { app, shell, BrowserWindow, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerStoreIpcHandlers, store } from './store'
import { registerFileLoaderIpcHandlers } from './fileLoader'
import { detectKeyboards, registerKeyboardIpcHandlers, setupKeyListener } from './keyboard'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

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
  registerStoreIpcHandlers()
  registerFileLoaderIpcHandlers()
  registerKeyboardIpcHandlers()

  console.log('[ Searching for event devices in /dev/input/ ]')
  const keyboards = detectKeyboards()
  console.log('=== Detected keyboards ===')
  for (const k of keyboards) {
    console.log(`Name: ${k.name}, Path: ${k.path}`)
  }

  const selectedNames: string[] = store.get('selectedKeyboards')
  const devicePaths = keyboards.filter((k) => selectedNames.includes(k.name)).map((k) => k.path)

  const keyListener = setupKeyListener(mainWindow!, devicePaths)

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
