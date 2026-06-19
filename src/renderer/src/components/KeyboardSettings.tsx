import { useEffect, useState } from 'react'
import { KeyboardDevice } from '../../../shared/types'

export function KeyboardSettings(): React.JSX.Element {
  const [keyboards, setKeyboards] = useState<KeyboardDevice[]>([])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const load = async (): Promise<void> => {
      const detected = await window.api.detectKeyboards()
      setKeyboards(detected)

      const settings = await window.api.getSettings()
      setSelected(settings.selectedKeyboards)
    }
    load()
  }, [])

  const handleToggle = async (name: string): Promise<void> => {
    const newSelected = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name]

    setSelected(newSelected)
    await window.api.setSelectedKeyboards(newSelected)
  }

  return (
    <div>
      <h3>キーボード選択</h3>
      {keyboards.map((kb) => (
        <label key={kb.path} style={{ display: 'block' }}>
          <input
            type="checkbox"
            checked={selected.includes(kb.name)}
            onChange={() => handleToggle(kb.name)}
          />
          {kb.name} ({kb.path})
        </label>
      ))}
    </div>
  )
}
