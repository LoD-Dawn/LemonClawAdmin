import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ModelsClient } from './ModelsClient'
import { Visibility } from '@/types'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { sanitizeManagementModelProviders } from '@/lib/model-provider-presenter'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { Main } from '@/components/layout/main'

export default async function ModelsPage() {
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
  }) as Prisma.ModelProviderWhereInput
  const organizationsWhere = managementMode === 'super_admin'
    ? {}
    : managementMode === 'department_admin'
    ? { id: { in: accessScope.scopedOrganizationIds.length > 0 ? accessScope.scopedOrganizationIds : ['__forbidden__'] } }
    : { id: '__forbidden__' }

  const [providers, organizations, total, enabledCount] = await Promise.all([
    db.modelProvider.findMany({
      where: { isActive: true, ...resourceFilter },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true, organizationId: true } },
        organization: { select: { id: true, name: true } },
        models: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    }),
    db.organization.findMany({ where: organizationsWhere, orderBy: { path: 'asc' } }),
    db.modelProvider.count({ where: { isActive: true, ...resourceFilter } }),
    db.modelProvider.count({ where: { isActive: true, enabled: true, ...resourceFilter } }),
  ])

  const typedProviders = sanitizeManagementModelProviders(providers.map((provider) => ({
    ...provider,
    visibility: provider.visibility as Visibility,
    canManage: canManageResource(session.user!, provider, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  })))

  return (
    <Main className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <ModelsClient
        initialProviders={typedProviders}
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
