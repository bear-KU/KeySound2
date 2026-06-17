import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onKeyDown: (callback: () => void) => void
      getFilePath: (file: File) => string
      readAudioFile: (filePath: string) => Promise<ArrayBuffer>
      getSettings: () => Promise<{ defaultSound: string; keySounds: Record<string, string> }>
      setDefaultSound: (soundPath: string) => Promise<void>
    }
  }
}
