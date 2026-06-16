import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onKeyDown: (callback: () => void) => {
    ipcRenderer.on('key-down', () => callback())
  },
  selectAudioFile: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-audio-file')
  },
  readAudioFile: (filePath: string): Promise<ArrayBuffer> => {
    return ipcRenderer.invoke('read-audio-file', filePath)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
