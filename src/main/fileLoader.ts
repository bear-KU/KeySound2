import { ipcMain } from 'electron'
import { readFile } from 'fs/promises'

export function registerFileLoaderIPCHandlers(): void {
  ipcMain.handle('read-audio-file', async (_, filePath: string) => {
    const buffer = await readFile(filePath)
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
  })
}
