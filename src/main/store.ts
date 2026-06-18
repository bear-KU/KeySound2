import { ipcMain } from 'electron'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const Store = require('electron-store').default

export interface StoreSchema {
  defaultSound: string
  keySounds: Record<string, string>
}

export const store = new Store({
  defaults: {
    defaultSound: '',
    keySounds: {}
  }
})

export function registerStoreIPCHandlers(): void {
  ipcMain.handle('get-settings', async () => {
    return store.store
  })

  ipcMain.handle('set-default-sound', (_, soundPath: string) => {
    store.set('defaultSound', soundPath)
  })
}
