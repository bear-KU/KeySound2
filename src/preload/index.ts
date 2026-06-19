import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { KeyboardDevice, StoreSchema } from '../shared/types'

const api = {
  onKeyDown: (callback: () => void): void => {
    ipcRenderer.on('key-down', () => callback())
  },
  getFilePath: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
  readAudioFile: (filePath: string): Promise<ArrayBuffer> => {
    return ipcRenderer.invoke('read-audio-file', filePath)
  },
  getSettings: (): Promise<StoreSchema> => {
    return ipcRenderer.invoke('get-settings')
  },
  setDefaultSound: (soundPath: string): Promise<void> => {
    return ipcRenderer.invoke('set-default-sound', soundPath)
  },
  setSelectedKeyboards: (keyboards: string[]): Promise<void> => {
    return ipcRenderer.invoke('set-selected-keyboards', keyboards)
  },
  detectKeyboards: (): Promise<KeyboardDevice[]> => {
    return ipcRenderer.invoke('detect-keyboards')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
