import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AdminPageHeaderProps {
  title: string
  description: string
  eyebrow?: string
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function AdminPageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-2', className)}>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {meta}
        </div>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  )
}
