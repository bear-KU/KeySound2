import { useState } from 'react'

interface SoundSettingsProps {
  onAudioFileChange: (filePath: string) => void
}

export function SoundSettings({ onAudioFileChange }: SoundSettingsProps): React.JSX.Element {
  const [currentFile, setCurrentFile] = useState<string | null>(null)

  const handleSelectFile = async (): Promise<void> => {
    const filePath = await window.api.selectAudioFile()
    if (filePath) {
      setCurrentFile(filePath)
      onAudioFileChange(filePath)
    }
  }

  return (
    <div>
      <button onClick={handleSelectFile}>音声ファイルを選択</button>
      {currentFile && <p>{currentFile}</p>}
    </div>
  )
}
