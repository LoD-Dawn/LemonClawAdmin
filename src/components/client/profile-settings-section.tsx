import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface ProfileSettingsSectionProps {
  id: string
  title: string
  description: string
  eyebrow?: string
  className?: string
  children: React.ReactNode
}

export function ProfileSettingsSection({
  id,
  title,
  description,
  eyebrow,
  className,
  children,
}: ProfileSettingsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-24 rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.2)] sm:p-7',
        className
      )}
    >
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{description}</p>
      </div>
      <Separator className="my-5 bg-slate-200/80" />
      <div className="space-y-5">{children}</div>
    </section>
  )
}
