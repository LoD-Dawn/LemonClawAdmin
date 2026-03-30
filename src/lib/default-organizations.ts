export const ROOT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'
export const DEFAULT_CONSUMER_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000002'

export const ROOT_ORGANIZATION_NAME = '总公司'
export const DEFAULT_CONSUMER_ORGANIZATION_NAME = '普通用户组织'

export const ROOT_ORGANIZATION_PATH = '/root-company'
export const DEFAULT_CONSUMER_ORGANIZATION_PATH = `${ROOT_ORGANIZATION_PATH}/consumer-users`

export type AccountTypeValue = 'consumer' | 'enterprise'
export type LoginEntryMode = 'consumer' | 'enterprise'

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  consumer: '普通用户',
  enterprise: '企业用户',
}

export function isDefaultConsumerOrganizationId(organizationId: string | null | undefined): boolean {
  return organizationId === DEFAULT_CONSUMER_ORGANIZATION_ID
}

export function resolveUserLoginEntryMode(user: {
  accountType?: AccountTypeValue | null
  organizationId?: string | null
  isSuperAdmin?: boolean
  isDepartmentAdmin?: boolean
}): LoginEntryMode | null {
  if (user.accountType === 'consumer') {
    return 'consumer'
  }

  if (user.accountType === 'enterprise') {
    return 'enterprise'
  }

  if (isDefaultConsumerOrganizationId(user.organizationId)) {
    return 'consumer'
  }

  if (user.organizationId || user.isSuperAdmin || user.isDepartmentAdmin) {
    return 'enterprise'
  }

  return null
}

export function canUserAccessLoginEntryMode(
  user: {
    accountType?: AccountTypeValue | null
    organizationId?: string | null
    isSuperAdmin?: boolean
    isDepartmentAdmin?: boolean
  },
  entryMode: LoginEntryMode
): boolean {
  return resolveUserLoginEntryMode(user) === entryMode
}
