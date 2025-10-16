import { ExecException } from 'child_process'
import player from 'play-sound'

type PlayerInstance = ReturnType<typeof player>

export class SoundManager {
  private player: PlayerInstance
  private audioPath: string

  constructor(defaultPath: string) {
    this.player = player()
    this.audioPath = defaultPath

    this.player.play(this.audioPath, (err: ExecException | null) => {
      if (err) console.error('Error playing audio:', err)
      else console.log(`Playing audio: ${this.audioPath}`)
    })
  }

  public playSound(): void {
    this.player.play(this.audioPath, (err: ExecException | null) => {
      if (err) console.error('Error playing audio:', err)
      else console.log(`Playing audio: ${this.audioPath}`)
    })
  }

  public setAudioPath(newPath: string): void {
    this.audioPath = newPath
    console.log(`Audio path set to: ${this.audioPath}`)
  }
}
