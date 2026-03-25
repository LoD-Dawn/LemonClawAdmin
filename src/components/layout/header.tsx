'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

const routeNames: Record<string, string> = {
  '/dashboard': '概览',
  '/dashboard/users': '用户管理',
  '/dashboard/organizations': '组织架构',
  '/dashboard/skills': 'Skills',
  '/dashboard/models': '模型管理',
  '/dashboard/mcps': 'MCPs',
  '/dashboard/desktop-auth': '桌面端登录',
  '/dashboard/approvals': '审核管理',
  '/dashboard/grants': '授权管理',
}

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    isSuperAdmin: boolean
    isDepartmentAdmin?: boolean
  }
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const currentPageTitle = routeNames[pathname] || '管理台'
  const roleLabel = user.isSuperAdmin ? '超级管理员' : user.isDepartmentAdmin ? '部门管理员' : '个人用户'
  const roleTone = user.isSuperAdmin
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : user.isDepartmentAdmin
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = routeNames[href] || segment
    return { href, label, isLast: index === pathSegments.length - 1 }
  })

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">管理工作台</div>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{currentPageTitle}</h2>
            <Breadcrumb className="text-slate-500">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard" className="transition-colors hover:text-slate-800">
                    首页
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map(breadcrumb => (
                <BreadcrumbItem key={breadcrumb.href}>
                  <BreadcrumbSeparator className="text-slate-300" />
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage className="text-slate-800">{breadcrumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href} className="transition-colors hover:text-slate-800">
                        {breadcrumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <div className="hidden rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-right shadow-sm sm:block">
            <div className="text-xs text-slate-400">当前账号</div>
            <div className="max-w-[220px] truncate text-sm font-medium text-slate-700">{user.email}</div>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${roleTone}`}>
            {roleLabel}
          </span>
        </div>
      </div>
    </header>
  )
}
