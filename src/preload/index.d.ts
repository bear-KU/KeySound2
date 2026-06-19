import { ElectronAPI } from '@electron-toolkit/preload'
import { KeyboardDevice, StoreSchema } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onKeyDown: (callback: () => void) => void
      getFilePath: (file: File) => string
      readAudioFile: (filePath: string) => Promise<ArrayBuffer>
      getSettings: () => Promise<StoreSchema>
      setDefaultSound: (soundPath: string) => Promise<void>
      setSelectedKeyboards: (keyboards: string[]) => Promise<void>
      detectKeyboards: () => Promise<KeyboardDevice[]>
    }
  }
}
