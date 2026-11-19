import { useEffect, useState } from 'react'
import { KeyboardSettings } from './components/KeyboardSettings'

export function KeyboardSettingsApp(): React.JSX.Element {
  const [selected, setSelected] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async (): Promise<void> => {
      try {
        const settings = await window.api.getSettings()
        if (!active) return
        setSelected(settings.selectedKeyboards)
        setReady(true)
      } catch (error) {
        console.error(error)
        if (active) {
          setError('設定の読み込みに失敗しました．画面を開き直してください．')
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const handleApply = async (closeAfterApply = false): Promise<void> => {
    if (!ready || busy) return
    setBusy(true)
    setError(null)

    try {
      await window.api.setSelectedKeyboards(selected)
      await window.api.restartKeyListener()
      if (closeAfterApply) {
        await window.api.closeKeyboardSettingsWindow()
      }
    } catch (error) {
      console.error(error)
      setError('設定の保存・反映または画面の終了に失敗しました．')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async (): Promise<void> => {
    if (busy) return
    try {
      await window.api.closeKeyboardSettingsWindow()
    } catch (error) {
      console.error(error)
      setError('設定画面を閉じられませんでした．')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px' }}>
        <p style={{ margin: 0 }}>キーボード設定</p>
        <button onClick={handleCancel} disabled={busy}>
          ×
        </button>
      </div>

      <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
        {!ready && !error && <p>読み込み中…</p>}
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={!ready || busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <KeyboardSettings selected={selected} onSelectionChange={setSelected} />
        </fieldset>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 18px' }}>
        <button onClick={handleCancel} disabled={busy}>
          キャンセル
        </button>
        <button onClick={() => void handleApply()} disabled={!ready || busy}>
          適用
        </button>
        <button onClick={() => void handleApply(true)} disabled={!ready || busy}>
          OK
        </button>
      </div>
    </div>
  )
}
