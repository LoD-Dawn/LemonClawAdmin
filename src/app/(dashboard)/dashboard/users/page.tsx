import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchAdminUsersPage } from '@/lib/admin-user-quota'
import { UsersClient } from './UsersClient'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { ShieldCheck, Users, Building2 } from 'lucide-react'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const page = 1
  const pageSize = 10

  const [userPage, organizations, activeCount] = await Promise.all([
    fetchAdminUsersPage({ page, pageSize }),
    db.organization.findMany({ orderBy: { path: 'asc' } }),
    db.user.count({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="用户"
        title="用户管理"
        description="统一维护账号、组织归属与管理角色，让权限边界更清晰，日常维护也更高效。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="活跃账号" value={activeCount} icon={Users} hint="当前已启用用户数" />
        <AdminStatCard label="组织节点" value={organizations.length} icon={Building2} tone="sky" hint="可分配的组织范围" />
        <AdminStatCard label="管理重点" value="角色与归属" icon={ShieldCheck} tone="emerald" hint="控制后台访问边界" />
      </div>
      <UsersClient
        initialUsers={userPage.data}
        initialOrganizations={organizations}
        initialPagination={userPage.pagination}
        currentUserId={session.user.id}
      />
    </div>
  )
}
