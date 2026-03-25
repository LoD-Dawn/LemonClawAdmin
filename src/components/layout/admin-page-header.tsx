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
  eyebrow = '管理端',
  actions,
  meta,
  className,
}: AdminPageHeaderProps) {
  return (
    <section className={cn('admin-page-header', className)}>
      <div className="space-y-3">
        <span className="admin-eyebrow">{eyebrow}</span>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {meta}
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </section>
  )
}
