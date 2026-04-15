import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SkillsClient } from './SkillsClient'
import { Visibility } from '@/types'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Box, Building2, Eye } from 'lucide-react'
import { Main } from '@/components/layout/main'

export default async function SkillsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const page = 1
  const pageSize = 10
  const accessScope = await resolveAdminAccessScope(session.user)
  const managementMode = accessScope.managementMode
  const resourceFilter = getViewableResourceFilter(session.user, {
    scopedOrganizationIds: accessScope.scopedOrganizationIds,
  }) as Prisma.SkillWhereInput
  const organizationsWhere = managementMode === 'super_admin'
    ? {}
    : managementMode === 'department_admin'
    ? { id: { in: accessScope.scopedOrganizationIds.length > 0 ? accessScope.scopedOrganizationIds : ['__forbidden__'] } }
    : { id: '__forbidden__' }

  const [skills, organizations, total] = await Promise.all([
    db.skill.findMany({
      where: { isActive: true, ...resourceFilter },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true, organizationId: true } },
        organization: { select: { id: true, name: true } }
      }
    }),
    db.organization.findMany({ where: organizationsWhere, orderBy: { path: 'asc' } }),
    db.skill.count({ where: { isActive: true, ...resourceFilter } }),
  ])

  const typedSkills = skills.map((skill: any) => ({
    ...skill,
    visibility: skill.visibility as Visibility,
    canManage: canManageResource(session.user!, skill, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  }))

  const pageTitle = managementMode === 'super_admin'
    ? 'Skills'
    : managementMode === 'department_admin'
    ? '部门 Skills'
    : '我的 Skills'
  const pageDescription = managementMode === 'super_admin'
    ? '集中维护全局 Skill 资产，确保标识符与可见范围一致。'
    : managementMode === 'department_admin'
    ? '查看并维护部门范围内的 Skill 资产。'
    : '浏览你可访问的 Skill 资源汇总。'
  const ownershipLabel = managementMode === 'super_admin'
    ? '全局资产池'
    : managementMode === 'department_admin'
    ? '部门范围'
    : '个人可见'

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title={pageTitle}
        description={pageDescription}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="当前总量" value={total} icon={Box} hint="已启用 Skill 数量" />
        <AdminStatCard label="组织范围" value={organizations.length} icon={Building2} hint="可见组织数" />
        <AdminStatCard label="管理视角" value={ownershipLabel} icon={Eye} hint="依据角色调整" />
      </div>
      <SkillsClient
        initialSkills={typedSkills}
        initialOrganizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={session.user.departmentId}
        initialPagination={{
          page: 1,
          pageSize: 10,
          pageCount: Math.ceil(total / 10),
          total,
        }}
      />
    </Main>
  )
}
