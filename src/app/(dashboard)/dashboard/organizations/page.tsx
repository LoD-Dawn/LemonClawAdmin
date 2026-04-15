import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { OrganizationTree } from '@/components/organizations/organization-tree'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Building2, Users, GitBranch } from 'lucide-react'
import { Main } from '@/components/layout/main'

export default async function OrganizationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const organizations = await db.organization.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { users: true, departmentUsers: true } } }
  })
  const totalUsers = organizations.reduce((sum, organization) => sum + organization._count.users, 0)
  const deepestLevel = organizations.reduce((max, organization) => Math.max(max, organization.level), 0) + 1

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title="组织架构"
        description="维护公司、部门与小组层级，管理用户归属与资源权限范围。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="组织节点" value={organizations.length} icon={Building2} hint="当前总节点数" />
        <AdminStatCard label="层级深度" value={deepestLevel} icon={GitBranch} hint="最深组织层级" />
        <AdminStatCard label="关联用户" value={totalUsers} icon={Users} hint="全组织成员总数" />
      </div>
      <OrganizationTree organizations={organizations} />
    </Main>
  )
}
