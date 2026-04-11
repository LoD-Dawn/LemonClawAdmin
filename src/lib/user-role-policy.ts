import {
  DEFAULT_CONSUMER_ORGANIZATION_ID,
  type AccountTypeValue,
  isDefaultConsumerOrganizationId,
} from '@/lib/default-organizations'

export type UserRoleValue = 'user' | 'department_admin' | 'super_admin'

export type OrganizationOption = {
  id: string
  name: string
  type: string
}

export type UserPermissionInput = {
  accountType?: AccountTypeValue
  organizationId?: string | null
  isSuperAdmin?: boolean
  isDepartmentAdmin?: boolean
  departmentId?: string | null
}

export type NormalizedUserPermissionInput = {
  accountType: AccountTypeValue
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
  organization: Pick<OrganizationOption, 'id' | 'type'> | null | undefined,
  accountType: AccountTypeValue = 'enterprise'
): UserRoleValue[] {
  if (accountType === 'consumer' || isDefaultConsumerOrganizationId(organization?.id)) {
    return ['user']
  }

  if (isDepartmentOrganization(organization)) {
    return ['user', 'department_admin']
  }

  return ['user', 'department_admin', 'super_admin']
}

export function getAssignableDepartments(
  organizations: OrganizationOption[],
  organizationId: string | null | undefined,
  accountType: AccountTypeValue = 'enterprise'
): OrganizationOption[] {
  if (accountType === 'consumer') {
    return []
  }

  const selectedOrganization = getOrganizationById(organizations, organizationId)

  if (isDepartmentOrganization(selectedOrganization)) {
    return selectedOrganization ? [selectedOrganization] : []
  }

  return organizations.filter((organization) => organization.type === 'department')
}

export function normalizeRoleForOrganization(
  role: UserRoleValue,
  organization: Pick<OrganizationOption, 'id' | 'type'> | null | undefined,
  accountType: AccountTypeValue = 'enterprise'
): UserRoleValue {
  if (accountType === 'consumer' || isDefaultConsumerOrganizationId(organization?.id)) {
    return 'user'
  }

  if (isDepartmentOrganization(organization) && role === 'super_admin') {
    return 'user'
  }

  return role
}

export function normalizeUserPermissionInput(
  input: UserPermissionInput
): NormalizedUserPermissionInput {
  const accountType = input.accountType ?? 'enterprise'
  const isSuperAdmin = input.isSuperAdmin ?? false
  const isDepartmentAdmin = isSuperAdmin ? false : (input.isDepartmentAdmin ?? false)
  const departmentId = isSuperAdmin || !isDepartmentAdmin ? null : (input.departmentId ?? null)
  const organizationId = input.organizationId ?? (accountType === 'consumer' ? DEFAULT_CONSUMER_ORGANIZATION_ID : null)

  return {
    accountType,
    organizationId,
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

  if (isDefaultConsumerOrganizationId(data.organizationId)) {
    if (data.accountType !== 'consumer') {
      return {
        error: '默认普通用户组织只能用于普通用户账号',
        code: 'VALIDATION_CONSUMER_ORG_ACCOUNT_TYPE_REQUIRED',
      }
    }

    if (data.isSuperAdmin || data.isDepartmentAdmin) {
      return {
        error: '默认普通用户组织下的账号只能是普通员工',
        code: 'VALIDATION_CONSUMER_ORG_ROLE_FORBIDDEN',
      }
    }

    if (data.departmentId) {
      return {
        error: '默认普通用户组织下的账号不能配置管理部门',
        code: 'VALIDATION_CONSUMER_ORG_DEPARTMENT_FORBIDDEN',
      }
    }
  }

  if (data.accountType === 'consumer' && (data.isSuperAdmin || data.isDepartmentAdmin)) {
    return {
      error: '普通用户账号不能配置管理员角色',
      code: 'VALIDATION_CONSUMER_ACCOUNT_ROLE_FORBIDDEN',
    }
  }

  if (data.accountType === 'consumer' && data.departmentId) {
    return {
      error: '普通用户账号不能配置管理部门',
      code: 'VALIDATION_CONSUMER_ACCOUNT_DEPARTMENT_FORBIDDEN',
    }
  }

  if (data.accountType === 'enterprise' && isDefaultConsumerOrganizationId(data.organizationId)) {
    return {
      error: '企业账号不能归属默认普通用户组织',
      code: 'VALIDATION_ENTERPRISE_ACCOUNT_CONSUMER_ORG_FORBIDDEN',
    }
  }

  return null
}
