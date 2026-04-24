import { Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'

type InstallAppButtonProps = {
  className?: string
  compact?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function InstallAppButton({ className, compact = false, variant = 'default' }: InstallAppButtonProps) {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()

  if (isInstalled) return null

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => {
        if (!canInstall) {
          toast.message('Установка пока недоступна', {
            description: 'Откройте приложение в Chrome или Edge и дождитесь, пока браузер определит PWA как устанавливаемое.',
          })
          return
        }

        void promptInstall().then((choice) => {
          if (choice.outcome === 'accepted') {
            toast.success('Приложение установлено')
            return
          }

          toast.message('Установка отменена')
        })
      }}
    >
      <Download className="size-4" />
      {compact ? 'Установить' : 'Установить приложение'}
    </Button>
  )
}
