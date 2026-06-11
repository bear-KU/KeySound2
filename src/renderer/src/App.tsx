import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { useEffect, useRef } from 'react'
import mechanic from '../../../resources/audio/mechanic.mp3'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  useEffect(() => {
    audioContextRef.current = new AudioContext()

    fetch(mechanic)
      .then((res) => res.arrayBuffer())
      .then((buf) => audioContextRef.current!.decodeAudioData(buf))
      .then((decoded) => {
        audioBufferRef.current = decoded
        console.log('Audio buffer loaded')
      })
      .catch((err) => console.error('Failed to load audio:', err))

    window.api.onKeyDown(() => {
      const ctx = audioContextRef.current
      const buffer = audioBufferRef.current
      if (!ctx || !buffer) return

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
    })

    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions />
    </>
  )
}

export default App
