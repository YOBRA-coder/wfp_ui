import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './utils/theme.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-updates the app in the background; reloads to the new version the
// next time the user opens it rather than forcing a disruptive mid-session reload.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
