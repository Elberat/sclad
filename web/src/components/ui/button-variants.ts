import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium tracking-normal whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out outline-none select-none will-change-transform focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[var(--shadow-sm)] active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]',
        outline:
          'border-primary bg-transparent text-primary hover:border-[color:var(--primary-hover)] hover:bg-[color:var(--surface-strong)] hover:text-[color:var(--primary-hover)] aria-expanded:bg-[color:var(--surface-strong)] aria-expanded:text-[color:var(--primary-hover)]',
        secondary:
          'border-border bg-card text-secondary-foreground hover:border-primary/20 hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground',
        ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/20',
        link: 'text-primary underline underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: 'h-8 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*=\'size-\'])]:size-3.5',
        sm: 'h-10 gap-1.5 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        lg: 'h-12 gap-2 px-6 text-sm has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        icon: 'size-11',
        'icon-xs': "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-10',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
