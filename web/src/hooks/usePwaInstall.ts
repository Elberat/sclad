import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIosDevice() {
  if (typeof window === 'undefined') return false

  const { userAgent, platform, maxTouchPoints } = window.navigator

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode)
  const [isIos] = useState(isIosDevice)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const canInstall = useMemo(() => Boolean(deferredPrompt) && !isInstalled, [deferredPrompt, isInstalled])

  const promptInstall = async () => {
    if (!deferredPrompt) return { outcome: 'dismissed' as const, platform: 'unknown' }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)

    return choice
  }

  return {
    canInstall,
    deferredPrompt,
    isInstalled,
    isIos,
    promptInstall,
  }
}
