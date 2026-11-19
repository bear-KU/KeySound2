import './assets/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KeyboardSettingsApp } from './KeyboardSettingsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeyboardSettingsApp />
  </StrictMode>
)
