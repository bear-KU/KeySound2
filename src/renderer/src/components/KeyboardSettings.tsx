import { useEffect, useState } from 'react'
import { KeyboardDevice } from '../../../shared/types'

interface KeyboardSettingsProps {
  selected: string[]
  onSelectionChange: (selected: string[]) => void
}

export function KeyboardSettings({
  selected,
  onSelectionChange
}: KeyboardSettingsProps): React.JSX.Element {
  const [keyboards, setKeyboards] = useState<KeyboardDevice[]>([])

  const loadKeyboards = async (): Promise<void> => {
    const detected = await window.api.detectKeyboards()
    setKeyboards(detected)
  }

  useEffect(() => {
    loadKeyboards()
  }, [])

  const handleToggle = (name: string): void => {
    const newSelected = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name]

    onSelectionChange(newSelected)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3>検出されたキーボード</h3>
        <button onClick={loadKeyboards}>再検出</button>
      </div>
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
