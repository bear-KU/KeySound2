import { ipcMain } from 'electron'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const Store = require('electron-store').default

export const store = new Store({
  defaults: {
    defaultSound: '',
    keySounds: {},
    selectedKeyboards: []
  }
})

export function registerStoreIpcHandlers(): void {
  ipcMain.handle('get-settings', async () => {
    return store.store
  })

  ipcMain.handle('set-default-sound', (_, soundPath: string) => {
    store.set('defaultSound', soundPath)
  })

  ipcMain.handle('set-selected-keyboards', (_, keyboards: string[]) => {
    store.set('selectedKeyboards', keyboards)
  })
}
