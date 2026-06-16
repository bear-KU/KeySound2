import { useEffect, useRef, useCallback } from 'react'

export function useAudio(src: string): { playSound: () => void } {
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  useEffect(() => {
    const ctx = new AudioContext()
    audioContextRef.current = ctx

    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        audioBufferRef.current = decoded
      })
      .catch((err) => console.error('Failed to load audio:', err))

    return () => {
      ctx.close()
    }
  }, [src])

  const playSound = useCallback((): void => {
    const ctx = audioContextRef.current
    const buffer = audioBufferRef.current
    if (!ctx || !buffer) return

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  }, [])

  return { playSound }
}
