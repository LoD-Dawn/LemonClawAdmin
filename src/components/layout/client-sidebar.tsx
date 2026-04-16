'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'

interface ClientSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    phone?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
    organizationName?: string | null
    requiresPhoneBinding?: boolean
  }
}

export function ClientSidebar({ user }: ClientSidebarProps) {
  const pathname = usePathname()
  const canManage = user.isSuperAdmin || user.isDepartmentAdmin
  const navItems = [
    {
      href: '/profile',
      label: '个人设置',
      description: '额度、资料与调用记录',
      icon: UserRound,
    },
    ...(canManage
      ? [
          {
            href: '/dashboard',
            label: '管理控制台',
            description: '审批、授权与资源维护',
            icon: ShieldCheck,
          },
        ]
      : []),
  ]

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
    <aside className="w-full border-b bg-background lg:h-screen lg:w-72 lg:shrink-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-black/10">
              <Image src="/images/Logo.png" alt="LemonClaw logo" fill sizes="40px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">资源工作台</p>
              <p className="text-xs text-muted-foreground">柠檬虾</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{roleLabel}</Badge>
              <Badge variant="outline">{user.organizationName ?? '未绑定组织'}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              面向使用者的统一资源入口，优先查看个人额度、绑定状态和最近使用记录。
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-auto justify-start px-3 py-3',
                  isActive
                    ? 'bg-muted text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <div className="flex items-start gap-3 text-left">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-accent"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.name ?? '当前用户'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-foreground">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
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
      </div>
    </aside>
  )
}
