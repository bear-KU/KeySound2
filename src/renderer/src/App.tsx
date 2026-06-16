import { useEffect, useState } from 'react'
import { useAudio } from './hooks/useAudio'
import { SoundSettings } from './components/SoundSettings'
import mechanic from '../../../resources/audio/mechanic.mp3'

function App(): React.JSX.Element {
  const [audioSrc, setAudioSrc] = useState<string>(mechanic)
  const { playSound } = useAudio(audioSrc)

  useEffect(() => {
    window.api.onKeyDown(() => {
      playSound()
    })
  }, [playSound])

  return (
    <>
      <SoundSettings onAudioFileChange={setAudioSrc} />
    </>
  )
}

export default App
