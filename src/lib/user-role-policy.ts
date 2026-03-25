export type UserRoleValue = 'user' | 'department_admin' | 'super_admin'

export type OrganizationOption = {
  id: string
  name: string
  type: string
}

export type UserPermissionInput = {
  organizationId?: string | null
  isSuperAdmin?: boolean
  isDepartmentAdmin?: boolean
  departmentId?: string | null
}

export type NormalizedUserPermissionInput = {
  organizationId: string | null
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  departmentId: string | null
}

export type UserPermissionValidationIssue = {
  error: string
  code: string
}

export function getOrganizationById(
  organizations: OrganizationOption[],
  organizationId: string | null | undefined
): OrganizationOption | null {
  if (!organizationId) {
    return null
  }

  return organizations.find((organization) => organization.id === organizationId) ?? null
}

export function isDepartmentOrganization(
  organization: Pick<OrganizationOption, 'type'> | null | undefined
): boolean {
  return organization?.type === 'department'
}

export function getAllowedUserRoles(
  organization: Pick<OrganizationOption, 'type'> | null | undefined
): UserRoleValue[] {
  if (isDepartmentOrganization(organization)) {
    return ['user', 'department_admin']
  }

  return ['user', 'department_admin', 'super_admin']
}

export function getAssignableDepartments(
  organizations: OrganizationOption[],
  organizationId: string | null | undefined
): OrganizationOption[] {
  const selectedOrganization = getOrganizationById(organizations, organizationId)

  if (isDepartmentOrganization(selectedOrganization)) {
    return selectedOrganization ? [selectedOrganization] : []
  }

  return organizations.filter((organization) => organization.type === 'department')
}

export function normalizeRoleForOrganization(
  role: UserRoleValue,
  organization: Pick<OrganizationOption, 'type'> | null | undefined
): UserRoleValue {
  if (isDepartmentOrganization(organization) && role === 'super_admin') {
    return 'user'
  }

  return role
}

export function normalizeUserPermissionInput(
  input: UserPermissionInput
): NormalizedUserPermissionInput {
  const isSuperAdmin = input.isSuperAdmin ?? false
  const isDepartmentAdmin = isSuperAdmin ? false : (input.isDepartmentAdmin ?? false)
  const departmentId = isSuperAdmin || !isDepartmentAdmin ? null : (input.departmentId ?? null)

  return {
    organizationId: input.organizationId ?? null,
    isSuperAdmin,
    isDepartmentAdmin,
    departmentId,
  }
}

export function validateUserPermissionScope({
  data,
  organization,
  department,
}: {
  data: NormalizedUserPermissionInput
  organization: OrganizationOption | null
  department: OrganizationOption | null
}): UserPermissionValidationIssue | null {
  if (data.organizationId && !organization) {
    return {
      error: '所选组织不存在',
      code: 'NOT_FOUND_ORGANIZATION',
    }
  }

  if (data.isDepartmentAdmin && !data.departmentId) {
    return {
      error: '部门管理员必须选择管理部门',
      code: 'VALIDATION_MISSING_DEPARTMENT',
    }
  }

  if (data.departmentId && !department) {
    return {
      error: '所选管理部门不存在',
      code: 'NOT_FOUND_DEPARTMENT',
    }
  }

  if (department && department.type !== 'department') {
    return {
      error: '管理范围必须是部门类型组织',
      code: 'VALIDATION_INVALID_DEPARTMENT',
    }
  }

  if (isDepartmentOrganization(organization) && data.isSuperAdmin) {
    return {
      error: '所属组织为部门时，角色不能是超级管理员',
      code: 'VALIDATION_DEPARTMENT_SUPER_ADMIN_FORBIDDEN',
    }
  }

  if (isDepartmentOrganization(organization) && data.isDepartmentAdmin && data.departmentId !== organization?.id) {
    return {
      error: '部门管理员只能管理自己的部门',
      code: 'VALIDATION_DEPARTMENT_SCOPE_MISMATCH',
    }
  }

  return null
}
