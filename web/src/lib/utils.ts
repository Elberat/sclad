import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createActionClassName(className?: ClassValue) {
  return cn(
    'border-amber-300 bg-amber-50 text-amber-900 shadow-sm hover:border-amber-400 hover:bg-amber-100 hover:text-amber-950',
    className,
  )
}

export function createEditActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800',
    className,
  )
}

export function createArchiveActionClassName(className?: ClassValue) {
  return cn(
    'gap-2 border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800',
    className,
  )
}

export function createCancelActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-md border-slate-300 bg-slate-100 px-5 text-sm font-semibold tracking-[0.12em] text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-200 hover:text-slate-900',
    className,
  )
}

export function createSubmitActionClassName(className?: ClassValue) {
  return cn(
    'h-12 rounded-md border-emerald-700 bg-emerald-600 px-5 text-sm font-semibold tracking-[0.14em] text-white shadow-sm hover:bg-emerald-700',
    className,
  )
}
