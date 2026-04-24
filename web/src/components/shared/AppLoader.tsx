import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type AppLoaderProps = {
  className?: string
  fullScreen?: boolean
  label?: string
}

export function AppLoader({ className, fullScreen = false, label = 'Загрузка данных' }: AppLoaderProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        fullScreen ? 'min-h-dvh bg-[radial-gradient(circle_at_top,rgba(120,113,108,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,242,0.94))] px-6 py-10' : 'min-h-[240px] py-10',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative flex size-20 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-[0_24px_60px_-24px_rgba(24,24,27,0.35)] backdrop-blur">
          <div className="absolute inset-2 rounded-full border border-primary/15" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(24,24,27,0.06),transparent_62%)]" />
          <LoaderCircle className="size-8 animate-spin text-primary" strokeWidth={1.6} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">Sclad</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
