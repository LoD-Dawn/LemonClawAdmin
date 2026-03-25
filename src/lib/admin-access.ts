import { getOrganizationScopeIds } from '@/lib/organizations'

type AdminActor = {
  id: string
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  departmentId: string | null
  organizationId?: string | null
}

type ManagedResource = {
  visibility: string
  organizationId: string | null
  ownerId?: string | null
  owner?: {
    organizationId: string | null
  } | null
}

export type ManagementMode = 'super_admin' | 'department_admin' | 'personal'

export type AdminAccessScope = {
  managementMode: ManagementMode
  scopedOrganizationIds: string[]
}

export function isAdminActor(user: AdminActor, allowDepartmentAdmin = false): boolean {
  if (user.isSuperAdmin) {
    return true
  }

  return allowDepartmentAdmin && user.isDepartmentAdmin
}

export function canManageDepartmentScope(user: AdminActor): boolean {
  return user.isDepartmentAdmin && !user.isSuperAdmin && Boolean(user.departmentId)
}

export async function resolveAdminAccessScope(user: AdminActor): Promise<AdminAccessScope> {
  if (user.isSuperAdmin) {
    return {
      managementMode: 'super_admin',
      scopedOrganizationIds: [],
    }
  }

  if (!canManageDepartmentScope(user)) {
    return {
      managementMode: 'personal',
      scopedOrganizationIds: [],
    }
  }

  return {
    managementMode: 'department_admin',
    scopedOrganizationIds: await getOrganizationScopeIds(user.departmentId),
  }
}

export function getManagementMode(user: AdminActor): ManagementMode {
  if (user.isSuperAdmin) {
    return 'super_admin'
  }

  if (canManageDepartmentScope(user)) {
    return 'department_admin'
  }

  return 'personal'
}

function getResolvedScopeIds(user: AdminActor, scopedOrganizationIds?: string[]): string[] {
  if (user.isSuperAdmin) {
    return []
  }

  if (!canManageDepartmentScope(user)) {
    return []
  }

  if (scopedOrganizationIds) {
    return scopedOrganizationIds
  }

  return user.departmentId ? [user.departmentId] : []
}

export function canViewResource(
  user: AdminActor,
  resource: ManagedResource,
  options?: { scopedOrganizationIds?: string[] }
): boolean {
  if (canManageResource(user, resource, options)) {
    return true
  }

  if (!canManageDepartmentScope(user)) {
    return false
  }

  const scopedOrganizationIds = getResolvedScopeIds(user, options?.scopedOrganizationIds)
  const ownerOrganizationId = resource.owner?.organizationId

  if (resource.visibility !== 'personal' || !ownerOrganizationId) {
    return false
  }

  return scopedOrganizationIds.includes(ownerOrganizationId)
}

export function canManageResource(
  user: AdminActor,
  resource: ManagedResource,
  options?: { scopedOrganizationIds?: string[] }
): boolean {
  if (user.isSuperAdmin) {
    return true
  }

  if (resource.visibility === 'personal' && resource.ownerId === user.id) {
    return true
  }

  if (!canManageDepartmentScope(user)) {
    return false
  }

  const scopedOrganizationIds = getResolvedScopeIds(user, options?.scopedOrganizationIds)
  const resourceOrganizationId = resource.organizationId

  if (resource.visibility !== 'department' || !resourceOrganizationId) {
    return false
  }

  return scopedOrganizationIds.includes(resourceOrganizationId)
}

export function getViewableResourceFilter(
  user: AdminActor,
  options?: { scopedOrganizationIds?: string[] }
) {
  if (user.isSuperAdmin) {
    return {}
  }

  if (canManageDepartmentScope(user)) {
    const scopedOrganizationIds = getResolvedScopeIds(user, options?.scopedOrganizationIds)

    return {
      OR: [
        {
          visibility: 'department',
          organizationId: { in: scopedOrganizationIds },
        },
        {
          visibility: 'personal',
          owner: {
            is: {
              organizationId: { in: scopedOrganizationIds },
            },
          },
        },
      ],
    }
  }

  return {
    visibility: 'personal',
    ownerId: user.id,
  }
}

export function getManagedResourceFilter(
  user: AdminActor,
  options?: { scopedOrganizationIds?: string[] }
) {
  if (user.isSuperAdmin) {
    return {}
  }

  if (canManageDepartmentScope(user)) {
    const scopedOrganizationIds = getResolvedScopeIds(user, options?.scopedOrganizationIds)

    return {
      visibility: 'department',
      organizationId: { in: scopedOrganizationIds },
    }
  }

  return {
    visibility: 'personal',
    ownerId: user.id,
  }
}
