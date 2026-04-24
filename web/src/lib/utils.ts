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
