import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  onKeyDown: (callback: () => void): void => {
    ipcRenderer.on('key-down', () => callback())
  },
  getFilePath: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
  readAudioFile: (filePath: string): Promise<ArrayBuffer> => {
    return ipcRenderer.invoke('read-audio-file', filePath)
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
