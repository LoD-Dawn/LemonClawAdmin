'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { ProfileDropdown } from './profile-dropdown'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const routeNames: Record<string, string> = {
  '/dashboard': '概览',
  '/dashboard/users': '用户管理',
  '/dashboard/organizations': '组织架构',
  '/dashboard/skills': 'Skills',
  '/dashboard/models': '模型管理',
  '/dashboard/mcps': 'MCPs',
  '/dashboard/oauth-clients': '第三方接入',
  '/dashboard/desktop-auth': '桌面端登录',
  '/dashboard/desktop-version': '桌面端版本',
  '/dashboard/approvals': '审核管理',
  '/dashboard/grants': '授权管理',
  '/dashboard/skill-tags': '标签管理',
  '/dashboard/operation-logs': '操作日志',
}

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin?: boolean
  }
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = routeNames[href] || segment
    return { href, label, isLast: index === pathSegments.length - 1 }
  })

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-6 lg:px-8 transition-shadow',
        offset > 10 && 'shadow-sm'
      )}
    >
      <Breadcrumb className="hidden md:flex">
        {breadcrumbs.map(breadcrumb => (
          <BreadcrumbItem key={breadcrumb.href}>
            {breadcrumb.href !== breadcrumbs[0]?.href && (
              <BreadcrumbSeparator />
            )}
            {breadcrumb.isLast ? (
              <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={breadcrumb.href}>
                  {breadcrumb.label}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </Breadcrumb>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative hidden w-64 md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-muted/50 pl-9 focus:bg-background"
          />
        </div>
        <ProfileDropdown user={user} />
      </div>
    </header>
  )
}
