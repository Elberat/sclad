import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  cta?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-center justify-center border-dashed px-6 py-10 text-center sm:px-8">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  )
}
