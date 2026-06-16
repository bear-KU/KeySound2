import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onKeyDown: (callback: () => void) => void
      selectAudioFile: () => Promise<string | null>
      readAudioFile: (filePath: string) => Promise<ArrayBuffer>
    }
  }
}
