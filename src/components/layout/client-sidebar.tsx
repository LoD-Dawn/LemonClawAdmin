'use client'

import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, Cpu, Layers3, LogOut, ShieldCheck } from 'lucide-react'

interface ClientSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
    organizationName?: string | null
  }
}

export function ClientSidebar({ user }: ClientSidebarProps) {
  const pathname = usePathname()
  const canManage = user.isSuperAdmin || user.isDepartmentAdmin
  const navItems = canManage
    ? [
        {
          href: '/dashboard',
          label: '管理控制台',
          description: '处理审批、授权与资源维护',
          icon: ShieldCheck,
        },
      ]
    : []

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name.slice(0, 2).toUpperCase()
  }

  const roleLabel = user.isSuperAdmin
    ? '超级管理员'
    : user.isDepartmentAdmin
      ? '部门管理员'
      : user.accountType === 'enterprise'
        ? '企业成员'
        : '普通用户'

  return (
    <aside className="relative flex w-full flex-col overflow-hidden border-b border-slate-800/40 bg-slate-950 text-slate-50 lg:min-h-screen lg:w-[276px] lg:border-b-0 lg:border-r">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.22),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]" />
      <div className="absolute inset-0 client-grid opacity-20" />

      <div className="relative space-y-5 p-4 sm:p-5">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.75)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-sky-300 to-cyan-400 text-slate-950 shadow-lg shadow-sky-500/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Client Portal</p>
              <h1 className="font-client-serif text-xl text-white">资源工作台</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            面向使用者的资源入口，集中查看已开通能力、可申请服务与审批进度。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="border-white/15 bg-white/8 px-3 py-1 text-slate-100">{roleLabel}</Badge>
            <Badge className="border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100">
              {user.organizationName ?? '未绑定组织'}
            </Badge>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Workspace</p>
              <p className="mt-2 font-client-serif text-lg text-white">你的资源入口</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">
              <Layers3 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            建议先查看已开通资源，再按部门范围申请需要的能力。
          </p>
        </div>

        {navItems.length > 0 && (
          <>
            <nav className="overflow-x-auto pb-1 lg:flex-1">
              <div className="flex gap-3 lg:flex-col">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group min-w-[220px] rounded-[22px] border px-4 py-4 transition-all duration-200 lg:min-w-0',
                        isActive
                          ? 'border-sky-300/30 bg-sky-300/12 text-white shadow-[0_18px_40px_-30px_rgba(125,211,252,0.75)]'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/8'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400 group-hover:text-slate-300">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight
                          className={cn(
                            'mt-1 h-4 w-4 transition-transform duration-200',
                            isActive ? 'text-sky-200' : 'text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                          )}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </nav>

            <Separator className="border-white/10" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/8"
            >
              <Avatar className="h-10 w-10 ring-2 ring-white/10">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback className="bg-slate-700 text-xs text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{user.name ?? '当前用户'}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-slate-200 bg-white">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-slate-900">{user.name}</span>
                <span className="text-xs font-normal text-slate-500">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
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
