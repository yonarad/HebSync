import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      const registration = await navigator.serviceWorker.register('/sw.js')
      let hasPendingRefresh = false
      const updatePrompt = 'יש גרסה חדשה זמינה. האם לרענן את הדף?'

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasPendingRefresh) {
          window.location.reload()
        }
      })

      await registration.update()

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller && window.confirm(updatePrompt)) {
            hasPendingRefresh = true
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })

      if (registration.waiting && window.confirm(updatePrompt)) {
        hasPendingRefresh = true
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      return
    }

    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  })
}

// Sync authentication state across tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'gcal_auth_state') {
    if (!event.newValue) {
      // Session was removed (logout in another tab)
      window.dispatchEvent(new CustomEvent('gcal-auth-expired'))
    } else if (!event.oldValue) {
      // Session was added (login in another tab)
      window.location.reload()
    }
  }
})
