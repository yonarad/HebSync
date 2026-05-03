import React from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useInstallPrompt from '../hooks/useInstallPrompt'

export default function InstallAppButton({ className = '' }) {
  const { i18n } = useTranslation()
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) {
    return null
  }

  return (
    <button onClick={promptInstall} className={className} type="button">
      <Download className="w-4 h-4" />
      <span>{i18n.language === 'he' ? 'התקן אפליקציה' : 'Install App'}</span>
    </button>
  )
}
