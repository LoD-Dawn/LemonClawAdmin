import type { Visibility } from '@prisma/client'
import { db } from '@/lib/db'
import { parseJsonStringArray } from '@/lib/mcp-config'
import type { ResourceType } from '@/lib/resource-access'

type RuntimeResource = {
  id: string
  name: string
  identifier: string
  description: string | null
  visibility: Visibility
  ownerId: string | null
  organizationId: string | null
  packageUrl: string | null
  category: string | null
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

export class RuntimeAccessError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND_RESOURCE'
      | 'FORBIDDEN_RESOURCE_DISABLED'
      | 'FORBIDDEN_RESOURCE_NOT_GRANTED',
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

async function findRuntimeResource(
  resourceType: ResourceType,
  resourceId: string
): Promise<RuntimeResource | null> {
  if (resourceType === 'skill') {
    const skill = await db.skill.findUnique({
      where: { id: resourceId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return skill
      ? {
          ...skill,
          packageUrl: skill.packageUrl ?? null,
          category: null,
          transportType: null,
          command: null,
          defaultArgs: [],
          requiredEnvKeys: [],
          optionalEnvKeys: [],
        }
      : null
  }

  const mcp = await db.mcp.findUnique({
    where: { id: resourceId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return mcp
    ? {
        ...mcp,
        identifier: mcp.mcpId,
        description: mcp.descriptionZh ?? mcp.descriptionEn ?? null,
        packageUrl: null,
        category: mcp.category,
        transportType: mcp.transportType,
        command: mcp.command,
        defaultArgs: parseJsonStringArray(mcp.defaultArgsJson),
        requiredEnvKeys: parseJsonStringArray(mcp.requiredEnvKeysJson),
        optionalEnvKeys: parseJsonStringArray(mcp.optionalEnvKeysJson),
      }
    : null
}

export async function resolveRuntimeResourceAccess(params: {
  userId: string
  resourceType: ResourceType
  resourceId: string
}) {
  const resource = await findRuntimeResource(params.resourceType, params.resourceId)

  if (!resource) {
    throw new RuntimeAccessError(
      'NOT_FOUND_RESOURCE',
      404,
      'The requested resource does not exist.'
    )
  }

  if (!resource.isActive) {
    throw new RuntimeAccessError(
      'FORBIDDEN_RESOURCE_DISABLED',
      403,
      'The requested resource is disabled.'
    )
  }

  if (resource.visibility === 'company') {
    return { resource, grantId: null }
  }

  if (resource.visibility === 'personal') {
    if (resource.ownerId !== params.userId) {
      throw new RuntimeAccessError(
        'FORBIDDEN_RESOURCE_NOT_GRANTED',
        403,
        'You do not have permission to use this personal resource.'
      )
    }

    return { resource, grantId: null }
  }

  const activeGrant = await db.resourceGrant.findFirst({
    where: {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      userId: params.userId,
      revokedAt: null,
    },
    select: {
      id: true,
    },
  })

  if (!activeGrant) {
    throw new RuntimeAccessError(
      'FORBIDDEN_RESOURCE_NOT_GRANTED',
      403,
      'You do not have an active grant for this department resource.'
    )
  }

  return {
    resource,
    grantId: activeGrant.id,
  }
}
