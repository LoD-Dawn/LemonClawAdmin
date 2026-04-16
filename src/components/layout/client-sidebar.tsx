'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  BadgeCheck, 
  Key, 
  FileText, 
  Users,
  ShieldCheck
} from 'lucide-react'

interface ClientSidebarProps {
  user: {
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
  }
}

export function ClientSidebar({ user }: ClientSidebarProps) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('')
  const canManage = user.isSuperAdmin || user.isDepartmentAdmin
  
  const navItems = [
    { href: '#overview', label: '仪表盘', icon: LayoutDashboard },
    { href: '#subscription', label: '订阅管理', icon: BadgeCheck },
    { href: '#usage', label: 'API 日志', icon: FileText },
    ...(canManage ? [{ href: '/dashboard', label: '管理控制台', icon: ShieldCheck }] : []),
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHash(`#${entry.target.id}`)
          }
        })
      },
      { threshold: 0.5, rootMargin: '-80px 0px -50% 0px' }
    )

    const ids = ['overview', 'subscription', 'usage']
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <aside className="w-40 shrink-0 py-2">
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isAnchor = item.href.startsWith('#')
          const isActive = isAnchor 
            ? activeHash === item.href 
            : pathname === item.href

          return (
            <Link
              key={item.href}
              href={isAnchor ? `/profile${item.href}` : item.href}
              onClick={() => isAnchor && setActiveHash(item.href)}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'h-9 justify-start px-2 -ml-2 transition-all duration-200 group relative',
                isActive
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'
                )} />
                <span className="text-[13px] font-bold tracking-tight">{item.label}</span>
              </div>
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-emerald-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
