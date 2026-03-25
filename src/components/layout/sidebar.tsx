'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, Users, Building2, Box, Bot, Cpu, LogOut, CheckSquare, ShieldCheck, Tags, History, AppWindow, Download, ChevronRight } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isSuperAdmin = user.isSuperAdmin
  const isDeptAdmin = user.isDepartmentAdmin

  const navSections = useMemo<NavSection[]>(() => {
    const overviewItem = { href: '/dashboard', label: '概览', icon: LayoutDashboard }

    if (isSuperAdmin) {
      return [
        { id: 'overview', title: '总览', items: [overviewItem] },
        {
          id: 'org',
          title: '组织与成员',
          items: [
            { href: '/dashboard/users', label: '用户管理', icon: Users },
            { href: '/dashboard/organizations', label: '组织架构', icon: Building2 },
            { href: '/dashboard/skill-tags', label: '标签管理', icon: Tags },
          ],
        },
        {
          id: 'resources',
          title: '资源配置',
          items: [
            { href: '/dashboard/skills', label: 'Skills', icon: Box },
            { href: '/dashboard/models', label: '模型管理', icon: Bot },
            { href: '/dashboard/mcps', label: 'MCPs', icon: Cpu },
          ],
        },
        {
          id: 'desktop',
          title: '桌面端',
          items: [
            { href: '/dashboard/desktop-auth', label: '桌面端登录', icon: AppWindow },
            { href: '/dashboard/desktop-version', label: '桌面端版本', icon: Download },
          ],
        },
        {
          id: 'governance',
          title: '治理与审计',
          items: [
            { href: '/dashboard/approvals', label: '审核管理', icon: CheckSquare },
            { href: '/dashboard/grants', label: '授权管理', icon: ShieldCheck },
            { href: '/dashboard/operation-logs', label: '操作日志', icon: History },
          ],
        },
      ]
    }

    if (isDeptAdmin) {
      return [
        { id: 'overview', title: '总览', items: [overviewItem] },
        {
          id: 'approval',
          title: '审批与授权',
          items: [
            { href: '/dashboard/approvals', label: '审核管理', icon: CheckSquare },
            { href: '/dashboard/grants', label: '授权管理', icon: ShieldCheck },
          ],
        },
        {
          id: 'resources',
          title: '资源目录',
          items: [
            { href: '/dashboard/skills', label: '技能管理', icon: Box },
            { href: '/dashboard/models', label: '模型管理', icon: Bot },
            { href: '/dashboard/mcps', label: 'MCP管理', icon: Cpu },
          ],
        },
      ]
    }

    return [
      { id: 'overview', title: '总览', items: [overviewItem] },
      {
        id: 'my-resources',
        title: '我的资源',
        items: [
          { href: '/dashboard/skills', label: '我的技能', icon: Box },
          { href: '/dashboard/models', label: '我的模型', icon: Bot },
          { href: '/dashboard/mcps', label: '我的MCP', icon: Cpu },
        ],
      },
    ]
  }, [isSuperAdmin, isDeptAdmin])

  const activeSectionIds = useMemo(
    () =>
      navSections
        .filter(section => section.id !== 'overview' && section.items.some(item => item.href === pathname))
        .map(section => section.id),
    [navSections, pathname]
  )
  const activeSectionId = activeSectionIds[0] ?? null

  const [openSectionId, setOpenSectionId] = useState<string | null>(() => activeSectionId)

  useEffect(() => {
    if (activeSectionId) {
      setOpenSectionId(activeSectionId)
    }
  }, [activeSectionId])

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name.slice(0, 2).toUpperCase()
  }

  const toggleSection = (sectionId: string) => {
    setOpenSectionId(prev => (prev === sectionId ? null : sectionId))
  }

  const roleLabel = isSuperAdmin ? '超级管理员' : isDeptAdmin ? '部门管理员' : '个人空间'

  return (
    <aside className="admin-sidebar-shell">
      <div className="flex h-full min-h-0 flex-col gap-5 p-4 sm:p-5">
        <div className="admin-surface relative overflow-hidden rounded-[28px] px-4 py-5 sm:px-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-200/30 via-sky-100/10 to-transparent" />
          <div className="relative space-y-3">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_32px_-20px_rgba(15,23,42,0.8)]">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold leading-tight tracking-tight text-slate-900 sm:text-base">LemonClaw</h1>
                <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">
                  更统一、更清晰的管理空间
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              {roleLabel}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-1 pr-2">
            <div className="space-y-3">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">导航</p>

              {navSections.map(section => {
                const isOverview = section.id === 'overview'
                const isOpen = openSectionId === section.id
                const hasActiveChild = section.items.some(item => item.href === pathname)

                if (isOverview) {
                  return (
                    <section key={section.id} className="space-y-2">
                      <nav className="flex flex-wrap gap-2 lg:flex-col">
                        {section.items.map(item => {
                          const Icon = item.icon
                          const isActive = pathname === item.href
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                'admin-nav-item min-w-[calc(50%-0.25rem)] lg:min-w-0',
                                isActive && 'admin-nav-item-active'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </Link>
                          )
                        })}
                      </nav>
                    </section>
                  )
                }

                return (
                  <section key={section.id} className="admin-nav-group">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        'admin-nav-group-trigger',
                        hasActiveChild && 'admin-nav-group-trigger-active'
                      )}
                      aria-expanded={isOpen}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="truncate text-sm font-semibold">{section.title}</span>
                        <span className="rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {section.items.length}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                          isOpen && 'rotate-90 text-slate-700'
                        )}
                      />
                    </button>

                    {isOpen ? (
                      <nav className="mt-2 flex flex-wrap gap-2 pl-2 lg:flex-col">
                        {section.items.map(item => {
                          const Icon = item.icon
                          const isActive = pathname === item.href
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                'admin-nav-item min-w-[calc(50%-0.25rem)] lg:min-w-0',
                                isActive && 'admin-nav-item-active'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </Link>
                          )
                        })}
                      </nav>
                    ) : null}
                  </section>
                )
              })}
            </div>
          </div>

          <div className="mt-4">
            <Separator className="mb-4 bg-slate-200/80" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="admin-surface flex w-full items-center gap-3 rounded-[24px] px-4 py-4 text-left transition hover:-translate-y-0.5"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                      <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                      <AvatarFallback className="bg-slate-900 text-xs text-white">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{user.name || '未命名用户'}</div>
                    <div className="truncate text-xs text-slate-500">{user.email}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-slate-200 bg-white/95 backdrop-blur-xl">
                <DropdownMenuLabel className="bg-slate-50/70">
                  <div className="flex flex-col">
                    <span className="text-slate-800">{user.name}</span>
                    <span className="text-xs font-normal text-slate-500">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem
                  className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                  onClick={async () => {
                    await signOut({ redirect: false })
                    window.location.href = '/login'
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </aside>
  )
}
