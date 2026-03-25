import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { OrganizationTree } from '@/components/organizations/organization-tree'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Building2, Users, GitBranch } from 'lucide-react'

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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="组织"
        title="组织架构"
        description="从公司到部门再到小组，统一维护组织树，方便用户归属、审核范围和资源权限同步对齐。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="组织节点" value={organizations.length} icon={Building2} hint="当前组织总数" />
        <AdminStatCard label="层级深度" value={deepestLevel} icon={GitBranch} tone="sky" hint="最长组织层级" />
        <AdminStatCard label="关联用户" value={totalUsers} icon={Users} tone="emerald" hint="节点用户累计数" />
      </div>
      <OrganizationTree organizations={organizations} />
    </div>
  )
}
