import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium tracking-[0.08em] whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: 'border-emerald-200 bg-emerald-50 text-emerald-700 [a]:hover:text-emerald-800',
        secondary: 'border-border bg-muted text-muted-foreground [a]:hover:text-foreground',
        destructive: 'border-rose-200 bg-rose-50 text-rose-700 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:text-rose-800',
        outline: 'border-border bg-background text-foreground [a]:hover:text-foreground/70',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
