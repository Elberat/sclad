import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createActionClassName(className?: ClassValue) {
  return cn(
    'border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-300 hover:bg-teal-100 hover:text-teal-900',
    className,
  )
}

export function createEditActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800',
    className,
  )
}

export function createArchiveActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800',
    className,
  )
}

export function createCancelActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-xl border-border bg-secondary px-5 text-sm font-medium tracking-normal text-secondary-foreground hover:border-border hover:bg-muted hover:text-foreground',
    className,
  )
}

export function createSubmitActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-xl border-emerald-700 bg-emerald-600 px-5 text-sm font-medium tracking-normal text-white hover:border-emerald-800 hover:bg-emerald-700',
    className,
  )
}
