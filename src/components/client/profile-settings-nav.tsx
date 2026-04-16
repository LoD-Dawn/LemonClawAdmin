'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, BadgeCheck, BriefcaseBusiness, Shield, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const items = [
  {
    id: 'overview',
    title: '总览',
    description: '额度、套餐与使用情况',
    icon: UserRound,
  },
  {
    id: 'account',
    title: '账号资料',
    description: '邮箱、手机号与登录方式',
    icon: BadgeCheck,
  },
  {
    id: 'organization',
    title: '组织身份',
    description: '组织归属与权限范围',
    icon: BriefcaseBusiness,
  },
  {
    id: 'security',
    title: '安全验证',
    description: '手机号绑定与校验状态',
    icon: Shield,
  },
  {
    id: 'usage',
    title: '调用记录',
    description: '最近结束会话与消耗',
    icon: Activity,
  },
] as const

function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) {
    return
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.history.replaceState(null, '', `#${id}`)
}

export function ProfileSettingsNav() {
  const defaultId = items[0].id
  const [activeId, setActiveId] = useState<string>(defaultId)

  const sectionIds = useMemo(() => items.map((item) => item.id), [])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (sectionIds.includes(hash as (typeof items)[number]['id'])) {
        setActiveId(hash)
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (visible?.target.id) {
          setActiveId(visible.target.id)
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.2, 0.45, 0.7],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      observer.disconnect()
    }
  }, [sectionIds])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">设置导航</h2>
      </div>

      <div className="md:hidden">
        <Select value={activeId} onValueChange={scrollToSection}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="选择一个模块" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => {
              const Icon = item.icon

              return (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <nav className="hidden space-y-1 md:flex md:flex-col">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeId

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'h-auto justify-start px-3 py-3 text-left',
                isActive
                  ? 'bg-muted text-foreground hover:bg-muted'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
