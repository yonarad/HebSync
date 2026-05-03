import { useEffect, useState } from 'react'

export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const updateInstalledState = () => {
      setIsInstalled(mediaQuery.matches || window.navigator.standalone === true)
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    updateInstalledState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    mediaQuery.addEventListener('change', updateInstalledState)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', updateInstalledState)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome !== 'accepted') {
      return false
    }

    setDeferredPrompt(null)
    return true
  }

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    promptInstall,
  }
}
