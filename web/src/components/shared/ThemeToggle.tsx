import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const activeTheme = resolvedTheme ?? 'light'

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Тема</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="theme-toggle-segment"
          data-active={activeTheme === 'light'}
          onClick={() => setTheme('light')}
          aria-pressed={activeTheme === 'light'}
        >
          <Sun className="mr-2 size-4" />
          Light
        </button>
        <button
          type="button"
          className="theme-toggle-segment"
          data-active={activeTheme === 'dark'}
          onClick={() => setTheme('dark')}
          aria-pressed={activeTheme === 'dark'}
        >
          <Moon className="mr-2 size-4" />
          Dark
        </button>
      </div>
    </div>
  )
}
