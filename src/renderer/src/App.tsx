import { useEffect, useState } from 'react'
import { useAudio } from './hooks/useAudio'
import { SoundSettings } from './components/SoundSettings'
import mechanic from '../../../resources/audio/mechanic.mp3'

function App(): React.JSX.Element {
  const [audioSrc, setAudioSrc] = useState<string>(mechanic)
  const { playSound } = useAudio(audioSrc)

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const settings = await window.api.getSettings()
      if (settings.defaultSound) {
        const buffer = await window.api.readAudioFile(settings.defaultSound)
        const blob = new Blob([buffer])
        const url = URL.createObjectURL(blob)
        setAudioSrc(url)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    window.api.onKeyDown(() => {
      playSound()
    })
  }, [playSound])

  const handleAudioFileChange = async (src: string, filePath: string): Promise<void> => {
    setAudioSrc(src)
    await window.api.setDefaultSound(filePath)
  }

  return (
    <>
      <SoundSettings onAudioFileChange={handleAudioFileChange} />
    </>
  )
}

export default App
