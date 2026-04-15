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
import { LayoutDashboard, Users, Building2, Box, Bot, Cpu, LogOut, CheckSquare, ShieldCheck, Tags, History, AppWindow, Download, ChevronRight, PlugZap, ChevronsUpDown, Ellipsis } from 'lucide-react'

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
    accountType?: 'consumer' | 'enterprise'
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
          title: '接入与客户端',
          items: [
            { href: '/dashboard/oauth-clients', label: '第三方接入', icon: PlugZap },
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

  const roleLabel = isSuperAdmin
    ? '超级管理员'
    : isDeptAdmin
      ? '部门管理员'
      : user.accountType === 'consumer'
        ? '普通用户空间'
        : '企业成员空间'

  return (
    <aside className="sticky top-0 flex h-screen w-[--sidebar-width] shrink-0 flex-col border-r border-sidebar-border bg-sidebar [--sidebar-width:16rem]">
      {/* ── App brand header ── */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-sidebar-foreground">LemonClaw</span>
          <span className="truncate text-[11px] text-muted-foreground">{roleLabel}</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-1 px-2">
          {navSections.map(section => {
            const isOverview = section.id === 'overview'
            const isOpen = openSectionId === section.id
            const hasActiveChild = section.items.some(item => item.href === pathname)

            if (isOverview) {
              return (
                <div key={section.id}>
                  {section.items.map(item => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )
            }

            return (
              <div key={section.id} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors',
                    hasActiveChild
                      ? 'text-sidebar-foreground'
                      : 'text-muted-foreground hover:text-sidebar-foreground'
                  )}
                  aria-expanded={isOpen}
                >
                  <span>{section.title}</span>
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── User footer ── */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-sidebar-foreground">{user.name || '未命名用户'}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
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
    </aside>
  )
}
