import { db } from '@/lib/db'
import { buildClientModelConfig } from '@/lib/model-config'
import {
  type ApplicationStatus,
  type GrantStatus,
  type ResourceAccessState,
  listConsumableResources,
} from '@/lib/resource-access'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { buildClientSkillDtos } from '@/lib/skill-catalog-server'

type CurrentUserRecord = Awaited<ReturnType<typeof fetchCurrentUserRecord>>

export type ExternalCurrentUserProfile = {
  id: string
  email: string
  name: string
  isActive: boolean
  roles: {
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
  }
  organization: {
    id: string
    name: string
    type: string
    path: string
    level: number
  } | null
  department: {
    id: string
    name: string
    type: string
    path: string
    level: number
  } | null
  createdAt: string
  updatedAt: string
}

export type ExternalMcpDto = {
  id: string
  resourceId: string
  name: string
  description: {
    en: string | null
    zh: string | null
  }
  category: string
  transport: {
    type: string
    command: string | null
    defaultArgs: string[]
  }
  env: {
    requiredKeys: string[]
    optionalKeys: string[]
  }
  permission: {
    accessState: ResourceAccessState
    canUse: boolean
    canApply: boolean
    grantStatus: GrantStatus
    applicationStatus: ApplicationStatus
    sensitiveFieldsHidden: boolean
  }
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parsePositiveInt(searchParams.get('page'), 1, 100000)
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100)
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}

function parsePositiveInt(raw: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.min(parsed, max)
}

async function fetchCurrentUserRecord(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      isSuperAdmin: true,
      isDepartmentAdmin: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          type: true,
          path: true,
          level: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          type: true,
          path: true,
          level: true,
        },
      },
    },
  })
}

function serializeCurrentUserProfile(user: NonNullable<CurrentUserRecord>): ExternalCurrentUserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    roles: {
      isSuperAdmin: user.isSuperAdmin,
      isDepartmentAdmin: user.isDepartmentAdmin,
    },
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
          path: user.organization.path,
          level: user.organization.level,
        }
      : null,
    department: user.department
      ? {
          id: user.department.id,
          name: user.department.name,
          type: user.department.type,
          path: user.department.path,
          level: user.department.level,
        }
      : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function toExternalMcpDto(resource: Awaited<ReturnType<typeof listConsumableResources>>[number]): ExternalMcpDto {
  return {
    id: resource.identifier,
    resourceId: resource.id,
    name: resource.name,
    description: {
      en: resource.descriptionEn,
      zh: resource.descriptionZh,
    },
    category: resource.category ?? 'developer',
    transport: {
      type: resource.transportType ?? 'stdio',
      command: resource.command,
      defaultArgs: resource.defaultArgs,
    },
    env: {
      requiredKeys: resource.requiredEnvKeys,
      optionalKeys: resource.optionalEnvKeys,
    },
    permission: {
      accessState: resource.accessState,
      canUse: resource.canUse,
      canApply: resource.canApply,
      grantStatus: resource.grantStatus,
      applicationStatus: resource.applicationStatus,
      sensitiveFieldsHidden: resource.sensitiveFieldsHidden,
    },
  }
}

export async function getCurrentUserProfile(userId: string) {
  const user = await fetchCurrentUserRecord(userId)
  return user ? serializeCurrentUserProfile(user) : null
}

export async function getCurrentUserModelConfig(user: {
  id: string
  organizationId: string | null
}) {
  const scopedOrganizationIds = await getOrganizationScopeIds(user.organizationId)
  const providers = await db.modelProvider.findMany({
    where: {
      isActive: true,
      OR: [
        { visibility: 'company' },
        {
          visibility: 'department',
          organizationId: { in: scopedOrganizationIds.length > 0 ? scopedOrganizationIds : ['__forbidden__'] },
        },
        {
          visibility: 'personal',
          ownerId: user.id,
        },
      ],
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          level: true,
        },
      },
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  return buildClientModelConfig(providers)
}

export async function getCurrentUserSkills(userId: string, page: number, pageSize: number) {
  const allSkills = await listConsumableResources({
    targetUserId: userId,
    includePersonal: true,
    resourceType: 'skill',
  })
  const total = allSkills.length
  const pageSkills = allSkills.slice((page - 1) * pageSize, page * pageSize)
  const data = await buildClientSkillDtos(pageSkills)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  }
}

export async function getCurrentUserMcps(userId: string, page: number, pageSize: number) {
  const allMcps = await listConsumableResources({
    targetUserId: userId,
    includePersonal: true,
    resourceType: 'mcp',
  })
  const total = allMcps.length
  const data = allMcps
    .slice((page - 1) * pageSize, page * pageSize)
    .map(toExternalMcpDto)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  }
}
