import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'

type InstallAppButtonProps = {
  className?: string
  compact?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

const INSTALL_UNAVAILABLE_TOAST_ID = 'pwa-install-unavailable'
const INSTALL_STATUS_TOAST_ID = 'pwa-install-status'

export function InstallAppButton({ className, compact = false, variant = 'default' }: InstallAppButtonProps) {
  const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall()
  const [isPrompting, setIsPrompting] = useState(false)

  if (isInstalled) return null
  if (!canInstall && !isIos) return null

  const handleClick = async () => {
    if (isPrompting) return

    if (isIos) {
      toast.message('Установка недоступна', {
        id: INSTALL_UNAVAILABLE_TOAST_ID,
        description: 'Откройте сайт в Chrome или Edge. На iPhone нажмите "Поделиться" → "На экран Домой".',
      })
      return
    }

    if (!canInstall) return

    setIsPrompting(true)

    try {
      const choice = await promptInstall()

      if (choice.outcome === 'accepted') {
        toast.success('Приложение установлено', { id: INSTALL_STATUS_TOAST_ID })
        return
      }

      toast.message('Установка отменена', { id: INSTALL_STATUS_TOAST_ID })
    } finally {
      setIsPrompting(false)
    }
  }

  return (
    <Button type="button" variant={variant} className={className} disabled={isPrompting} onClick={() => void handleClick()}>
      <Download className="size-4" />
      {compact ? 'Установить' : 'Установить приложение'}
    </Button>
  )
}
