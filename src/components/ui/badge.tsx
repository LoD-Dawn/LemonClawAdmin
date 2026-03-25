import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:ring-offset-2 focus:ring-offset-white',
  {
    variants: {
      variant: {
        default: 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80',
        secondary: 'border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100',
        destructive: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
        outline: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
