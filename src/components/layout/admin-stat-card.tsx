import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const toneStyles = {
  default: {
    iconWrap: 'bg-slate-900 text-white shadow-slate-900/10',
    value: 'text-slate-900',
    accent: 'from-slate-900/10 via-slate-900/0 to-transparent',
  },
  sky: {
    iconWrap: 'bg-sky-100 text-sky-700 shadow-sky-200/70',
    value: 'text-sky-800',
    accent: 'from-sky-300/20 via-sky-100/0 to-transparent',
  },
  emerald: {
    iconWrap: 'bg-emerald-100 text-emerald-700 shadow-emerald-200/70',
    value: 'text-emerald-800',
    accent: 'from-emerald-300/20 via-emerald-100/0 to-transparent',
  },
  amber: {
    iconWrap: 'bg-amber-100 text-amber-700 shadow-amber-200/70',
    value: 'text-amber-800',
    accent: 'from-amber-300/20 via-amber-100/0 to-transparent',
  },
  rose: {
    iconWrap: 'bg-rose-100 text-rose-700 shadow-rose-200/70',
    value: 'text-rose-800',
    accent: 'from-rose-300/20 via-rose-100/0 to-transparent',
  },
} as const

interface AdminStatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: keyof typeof toneStyles
  className?: string
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: AdminStatCardProps) {
  const styles = toneStyles[tone]

  return (
    <div className={cn('admin-stat-card', className)}>
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-[inherit] bg-gradient-to-b', styles.accent)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={cn('text-3xl font-semibold tracking-tight', styles.value)}>{value}</p>
          {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-2xl p-3 shadow-sm', styles.iconWrap)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
