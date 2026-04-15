import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseJsonStringArray } from '@/lib/mcp-config'
import { McpsClient } from './McpsClient'
import { Visibility } from '@/types'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Cpu, Building2, Radar } from 'lucide-react'
import { Main } from '@/components/layout/main'

export default async function McpsPage() {
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
  }) as Prisma.McpWhereInput
  const organizationsWhere = managementMode === 'super_admin'
    ? {}
    : managementMode === 'department_admin'
    ? { id: { in: accessScope.scopedOrganizationIds.length > 0 ? accessScope.scopedOrganizationIds : ['__forbidden__'] } }
    : { id: '__forbidden__' }

  const [mcps, organizations, total] = await Promise.all([
    db.mcp.findMany({
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
    db.mcp.count({ where: { isActive: true, ...resourceFilter } }),
  ])

  const typedMcps = mcps.map((mcp: any) => ({
    id: mcp.id,
    mcpId: mcp.mcpId,
    name: mcp.name,
    descriptionZh: mcp.descriptionZh,
    descriptionEn: mcp.descriptionEn,
    category: mcp.category,
    transportType: mcp.transportType,
    command: mcp.command,
    defaultArgs: parseJsonStringArray(mcp.defaultArgsJson),
    requiredEnvKeys: parseJsonStringArray(mcp.requiredEnvKeysJson),
    optionalEnvKeys: parseJsonStringArray(mcp.optionalEnvKeysJson),
    visibility: mcp.visibility as Visibility,
    isActive: mcp.isActive,
    owner: mcp.owner,
    organization: mcp.organization,
    canManage: canManageResource(session.user!, mcp, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  }))

  const pageTitle = managementMode === 'super_admin'
    ? 'MCPs'
    : managementMode === 'department_admin'
    ? '部门 MCPs'
    : '我的 MCPs'
  const pageDescription = managementMode === 'super_admin'
    ? '管理 MCP 资源及其来源，确保平台连接项可控。'
    : managementMode === 'department_admin'
    ? '查看并维护部门可见的 MCP 资源。'
    : '查看你当前可访问的 MCP 资源池。'
  const ownershipLabel = managementMode === 'super_admin'
    ? '全局连接池'
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
        <AdminStatCard label="MCP 总量" value={total} icon={Cpu} hint="已启用记录" />
        <AdminStatCard label="组织范围" value={organizations.length} icon={Building2} hint="当前可见组织" />
        <AdminStatCard label="管理视角" value={ownershipLabel} icon={Radar} hint="依据角色调整" />
      </div>
      <McpsClient
        initialMcps={typedMcps}
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
