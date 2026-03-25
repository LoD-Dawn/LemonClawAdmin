import type {
  Prisma,
  ResourceApplication,
  Visibility,
} from '@prisma/client'
import { db } from '@/lib/db'
import { parseJsonStringArray } from '@/lib/mcp-config'
import { getOrganizationScopeIds } from '@/lib/organizations'

export type ResourceType = 'skill' | 'mcp'
export type ApplicationStatus = ResourceApplication['status'] | null
export type GrantStatus = 'granted' | 'not_granted'
export type ResourceAccessState = 'granted' | 'pending' | 'available' | 'reapply'

type ResourceRow = {
  id: string
  name: string
  identifier: string
  description: string | null
  descriptionEn: string | null
  descriptionZh: string | null
  tagsJson: string | null
  packageUrl: string | null
  version: string | null
  sourceFrom: string | null
  sourceUrl: string | null
  sourceAuthor: string | null
  category: string | null
  visibility: Visibility
  ownerId: string | null
  organizationId: string | null
  transportType: string | null
  command: string | null
  defaultArgs: string[]
  requiredEnvKeys: string[]
  optionalEnvKeys: string[]
  isActive: boolean
  organization: {
    id: string
    name: string
  } | null
}

export type ResourceCatalogItem = ResourceRow & {
  applicationStatus: ApplicationStatus
  grantStatus: GrantStatus
  accessState: ResourceAccessState
  isOwner: boolean
  canUse: boolean
  canApply: boolean
  sensitiveFieldsHidden: boolean
}

export async function getActiveGrantResourceIdSet(
  userId: string,
  resourceType: ResourceType,
  resourceIds?: string[]
): Promise<Set<string>> {
  if (resourceIds && resourceIds.length === 0) {
    return new Set()
  }

  const grants = await db.resourceGrant.findMany({
    where: {
      userId,
      resourceType,
      revokedAt: null,
      ...(resourceIds ? { resourceId: { in: resourceIds } } : {}),
    },
    select: { resourceId: true },
  })

  return new Set(grants.map((grant) => grant.resourceId))
}

export async function getApplicationStatusMap(
  userId: string,
  resourceType: ResourceType,
  resourceIds?: string[]
): Promise<Map<string, ApplicationStatus>> {
  if (resourceIds && resourceIds.length === 0) {
    return new Map()
  }

  const applications = await db.resourceApplication.findMany({
    where: {
      userId,
      resourceType,
      ...(resourceIds ? { resourceId: { in: resourceIds } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      resourceId: true,
      status: true,
    },
  })

  const statusMap = new Map<string, ApplicationStatus>()
  for (const application of applications) {
    if (!statusMap.has(application.resourceId)) {
      statusMap.set(application.resourceId, application.status)
    }
  }

  return statusMap
}

export function getGrantStatus(grantedResourceIds: Set<string>, resourceId: string): GrantStatus {
  return grantedResourceIds.has(resourceId) ? 'granted' : 'not_granted'
}

export function resolveResourceAccessState({
  isPublic,
  isOwner,
  grantStatus,
  applicationStatus,
}: {
  isPublic?: boolean
  isOwner: boolean
  grantStatus: GrantStatus
  applicationStatus: ApplicationStatus
}): ResourceAccessState {
  if (isPublic || isOwner || grantStatus === 'granted') {
    return 'granted'
  }

  if (applicationStatus === 'pending') {
    return 'pending'
  }

  if (applicationStatus === 'rejected' || applicationStatus === 'revoked') {
    return 'reapply'
  }

  return 'available'
}

function getDiscoveryWhere(
  userId: string,
  scopedOrganizationIds: string[]
): Record<string, unknown> {
  const orConditions: Record<string, unknown>[] = [
    { visibility: 'company' },
    { visibility: 'personal', ownerId: userId },
  ]

  if (scopedOrganizationIds.length > 0) {
    orConditions.push({
      visibility: 'department',
      organizationId: { in: scopedOrganizationIds },
    })
  }

  return {
    isActive: true,
    OR: orConditions,
  }
}

function getConsumableWhere(
  targetUserId: string,
  grantedResourceIds: string[],
  includePersonal: boolean
): Record<string, unknown> {
  const orConditions: Record<string, unknown>[] = [
    { visibility: 'company' },
  ]

  if (grantedResourceIds.length > 0) {
    orConditions.push({
      visibility: 'department',
      id: { in: grantedResourceIds },
    })
  }

  if (includePersonal) {
    orConditions.push({
      visibility: 'personal',
      ownerId: targetUserId,
    })
  }

  return {
    isActive: true,
    OR: orConditions,
  }
}

async function findResourceRows(
  resourceType: ResourceType,
  where: Record<string, unknown>
): Promise<ResourceRow[]> {
  if (resourceType === 'skill') {
    const skills = await db.skill.findMany({
      where: where as Prisma.SkillWhereInput,
      orderBy: [{ visibility: 'asc' }, { name: 'asc' }],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return skills.map((skill) => ({
      ...skill,
      category: null,
      transportType: null,
      command: null,
      defaultArgs: [],
      requiredEnvKeys: [],
      optionalEnvKeys: [],
    }))
  }

  const mcps = await db.mcp.findMany({
    where: where as Prisma.McpWhereInput,
    orderBy: [{ visibility: 'asc' }, { name: 'asc' }],
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return mcps.map((mcp) => ({
    ...mcp,
    identifier: mcp.mcpId,
    description: mcp.descriptionZh ?? mcp.descriptionEn ?? null,
    descriptionEn: mcp.descriptionEn,
    descriptionZh: mcp.descriptionZh,
    tagsJson: null,
    packageUrl: null,
    version: null,
    sourceFrom: null,
    sourceUrl: null,
    sourceAuthor: null,
    category: mcp.category,
    transportType: mcp.transportType,
    command: mcp.command,
    defaultArgs: parseJsonStringArray(mcp.defaultArgsJson),
    requiredEnvKeys: parseJsonStringArray(mcp.requiredEnvKeysJson),
    optionalEnvKeys: parseJsonStringArray(mcp.optionalEnvKeysJson),
  }))
}

async function buildResourceCatalog(
  subjectUserId: string,
  resourceType: ResourceType,
  resources: ResourceRow[],
  grantedResourceIds?: Set<string>
): Promise<ResourceCatalogItem[]> {
  const resourceIds = resources.map((resource) => resource.id)
  const [resolvedGrantedResourceIds, applicationStatusMap] = await Promise.all([
    grantedResourceIds
      ? Promise.resolve(grantedResourceIds)
      : getActiveGrantResourceIdSet(subjectUserId, resourceType, resourceIds),
    getApplicationStatusMap(subjectUserId, resourceType, resourceIds),
  ])

  return resources.map((resource) => {
    const isOwner = resource.ownerId === subjectUserId
    const grantStatus = getGrantStatus(resolvedGrantedResourceIds, resource.id)
    const applicationStatus = applicationStatusMap.get(resource.id) ?? null
    const accessState = resolveResourceAccessState({
      isPublic: resource.visibility === 'company',
      isOwner,
      grantStatus,
      applicationStatus,
    })
    const canUse = accessState === 'granted'
    const sensitiveFieldsHidden = resource.visibility === 'department' && !canUse

    return {
      ...resource,
      packageUrl: sensitiveFieldsHidden ? null : resource.packageUrl,
      command: sensitiveFieldsHidden ? null : resource.command,
      defaultArgs: sensitiveFieldsHidden ? [] : resource.defaultArgs,
      requiredEnvKeys: sensitiveFieldsHidden ? [] : resource.requiredEnvKeys,
      optionalEnvKeys: sensitiveFieldsHidden ? [] : resource.optionalEnvKeys,
      applicationStatus,
      grantStatus,
      accessState,
      isOwner,
      canUse,
      canApply: resource.visibility === 'department' && !canUse,
      sensitiveFieldsHidden,
    }
  })
}

export async function listDiscoverableResources(params: {
  userId: string
  organizationId: string | null
  resourceType: ResourceType
}): Promise<ResourceCatalogItem[]> {
  const scopedOrganizationIds = await getOrganizationScopeIds(params.organizationId)
  const resources = await findResourceRows(
    params.resourceType,
    getDiscoveryWhere(params.userId, scopedOrganizationIds)
  )

  return buildResourceCatalog(params.userId, params.resourceType, resources)
}

export async function listConsumableResources(params: {
  targetUserId: string
  includePersonal: boolean
  resourceType: ResourceType
}): Promise<ResourceCatalogItem[]> {
  const grantedResourceIds = await getActiveGrantResourceIdSet(params.targetUserId, params.resourceType)
  const grantedResourceIdList = [...grantedResourceIds]
  const resources = await findResourceRows(
    params.resourceType,
    getConsumableWhere(params.targetUserId, grantedResourceIdList, params.includePersonal)
  )

  return buildResourceCatalog(params.targetUserId, params.resourceType, resources, grantedResourceIds)
}

export function groupResourcesByVisibility<T extends { visibility: string }>(resources: T[]) {
  return resources.reduce(
    (groups, resource) => {
      if (resource.visibility === 'company') {
        groups.company.push(resource)
      } else if (resource.visibility === 'department') {
        groups.department.push(resource)
      } else if (resource.visibility === 'personal') {
        groups.personal.push(resource)
      }

      return groups
    },
    {
      company: [] as T[],
      department: [] as T[],
      personal: [] as T[],
    }
  )
}
