import { useEffect, useState } from 'react'
import { useAudio } from './hooks/useAudio'
import { SoundSettings } from './components/SoundSettings'
import mechanic from '../../../resources/audio/mechanic.mp3'

function App(): React.JSX.Element {
  const [audioSrc, setAudioSrc] = useState<string>(mechanic)
  const [error, setError] = useState<string | null>(null)
  const { playSound } = useAudio(audioSrc)

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const settings = await window.api.getSettings()
      if (settings.defaultSound) {
        const buffer = await window.api.readAudioFile(settings.defaultSound)
        const blob = new Blob([buffer])
        setAudioSrc(URL.createObjectURL(blob))
      }
    }

    void loadSettings().catch((error: unknown) => {
      console.error(error)
      setError('設定の読み込みに失敗しました．')
    })
  }, [])

  useEffect(() => {
    return window.api.onKeyDown(playSound)
  }, [playSound])

  const handleAudioFileChange = async (src: string, filePath: string): Promise<void> => {
    setAudioSrc(src)
    try {
      await window.api.setDefaultSound(filePath)
      setError(null)
    } catch (error) {
      console.error(error)
      setError('音声ファイルの設定保存に失敗しました．')
    }
  }

  const handleOpenSettings = async (): Promise<void> => {
    setError(null)
    try {
      await window.api.openKeyboardSettingsWindow()
    } catch (error) {
      console.error(error)
      setError('キーボード設定を開けませんでした．')
    }
  }

  return (
    <>
      <SoundSettings onAudioFileChange={handleAudioFileChange} />
      <button onClick={handleOpenSettings}>キーボード設定</button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}

export default App
