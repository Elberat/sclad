import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createActionClassName(className?: ClassValue) {
  return cn(
    'border-primary bg-primary text-white hover:border-[color:var(--primary-hover)] hover:bg-[color:var(--primary-hover)]',
    className,
  )
}

export function createEditActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-primary bg-transparent text-primary hover:border-[color:var(--primary-hover)] hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--primary-hover)]',
    className,
  )
}

export function createArchiveActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
    className,
  )
}

export function createCancelActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-xl border-border bg-card px-5 text-sm font-medium tracking-normal text-secondary-foreground hover:border-primary/20 hover:bg-muted hover:text-foreground',
    className,
  )
}

export function createSubmitActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-xl border-primary bg-primary px-5 text-sm font-medium tracking-normal text-white hover:border-[color:var(--primary-hover)] hover:bg-[color:var(--primary-hover)]',
    className,
  )
}

export function createOperationSubmitActionClassName(type: 'receipt' | 'sale' | 'transfer', className?: ClassValue) {
  if (type === 'receipt') {
    return cn(
      'h-12 rounded-xl border-transparent bg-[color:var(--success)] px-5 text-sm font-medium tracking-normal text-white hover:brightness-95',
      className,
    )
  }

  if (type === 'sale') {
    return cn(
      'h-12 rounded-xl border-transparent bg-destructive px-5 text-sm font-medium tracking-normal text-destructive-foreground hover:bg-destructive/90',
      className,
    )
  }

  return cn(
    'h-12 rounded-xl border-transparent bg-[color:var(--warning)] px-5 text-sm font-medium tracking-normal text-zinc-950 hover:brightness-95 dark:text-zinc-950',
    className,
  )
}

export function getOperationBadgeClassName(type: 'receipt' | 'sale' | 'transfer') {
  if (type === 'receipt') return 'operation-badge operation-badge--receipt'
  if (type === 'sale') return 'operation-badge operation-badge--sale'
  return 'operation-badge operation-badge--transfer'
}

export function getOperationActionClassName(type: 'receipt' | 'sale' | 'transfer') {
  if (type === 'receipt') {
    return '!border-transparent !bg-[color:var(--success)] !text-white hover:!bg-[color:var(--success)]/90'
  }

  if (type === 'sale') {
    return '!border-transparent !bg-[color:var(--danger)] !text-white hover:!bg-[color:var(--danger)]/90'
  }

  return '!border-transparent !bg-[color:var(--warning)] !text-zinc-950 hover:!bg-[color:var(--warning)]/90 dark:!text-zinc-950'
}

export function getOperationIconClassName(type: 'receipt' | 'sale' | 'transfer') {
  if (type === 'receipt') return 'icon-receipt'
  if (type === 'sale') return 'icon-sale'
  return 'icon-transfer'
}
