import { useRef, useState } from 'react'

interface SoundSettingsProps {
  onAudioFileChange: (src: string, filePath: string) => void
}

export function SoundSettings({ onAudioFileChange }: SoundSettingsProps): React.JSX.Element {
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const filePath = window.api.getFilePath(file)
    const url = URL.createObjectURL(file)
    setCurrentFile(file.name)
    onAudioFileChange(url, filePath)
  }

  return (
    <div>
      <input
        type="file"
        accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,.opus"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button onClick={handleClick}>音声ファイルを選択</button>
      {currentFile && <p>{currentFile}</p>}
    </div>
  )
}
