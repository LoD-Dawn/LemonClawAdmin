import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface ProfileSettingsSectionProps {
  id: string
  title: string
  description?: string
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
    <section id={id} className={cn('scroll-mt-24', className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator className="my-4" />
      <div className="space-y-4">{children}</div>
    </section>
  )
}
