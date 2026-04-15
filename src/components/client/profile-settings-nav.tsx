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
    description: '额度、套餐与整体使用情况',
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
    description: '账号类型、组织归属与权限说明',
    icon: BriefcaseBusiness,
  },
  {
    id: 'security',
    title: '安全验证',
    description: '手机号绑定与登录安全状态',
    icon: Shield,
  },
  {
    id: 'usage',
    title: '调用记录',
    description: '最近结束会话与资源消耗',
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
  const [activeId, setActiveId] = useState(defaultId)

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
        rootMargin: '-24% 0px -55% 0px',
        threshold: [0.15, 0.35, 0.6],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      observer.disconnect()
    }
  }, [sectionIds])

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/88 p-3 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.2)]">
      <div className="px-3 pb-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Profile Settings</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          参考 settings 的信息分区，按模块查看与管理当前账号状态。
        </p>
      </div>

      <div className="px-1 pb-3 md:hidden">
        <Select value={activeId} onValueChange={scrollToSection}>
          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white text-left">
            <SelectValue placeholder="选择一个模块" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => {
              const Icon = item.icon

              return (
                <SelectItem key={item.id} value={item.id} className="rounded-xl py-2">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span>{item.title}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <nav className="hidden space-y-1 px-1 md:block">
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
                'h-auto w-full justify-start rounded-[22px] px-3 py-3 text-left transition-all duration-200',
                isActive
                  ? 'bg-slate-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)] hover:bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                    isActive
                      ? 'border-slate-200 bg-white text-slate-900'
                      : 'border-transparent bg-slate-100/70 text-slate-500'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
