import type { Prisma, ResourceGrant, ResourceType } from '@prisma/client'

type GrantClient = Prisma.TransactionClient

type GrantIdentity = {
  resourceType: ResourceType
  resourceId: string
  userId: string
}

type GrantSelectResult = Pick<
  ResourceGrant,
  'id' | 'resourceType' | 'resourceId' | 'userId' | 'grantedAt' | 'revokedAt' | 'sourceApplicationId'
>

type GrantMutationParams = GrantIdentity & {
  grantedBy: string | null
  sourceApplicationId?: string | null
  grantedAt?: Date
}

export function buildActiveGrantKey(params: GrantIdentity): string {
  return [params.resourceType, params.resourceId, params.userId].join(':')
}

const grantSelect = {
  id: true,
  resourceType: true,
  resourceId: true,
  userId: true,
  grantedAt: true,
  revokedAt: true,
  sourceApplicationId: true,
} satisfies Prisma.ResourceGrantSelect

export async function grantResource(
  tx: GrantClient,
  params: GrantMutationParams
): Promise<GrantSelectResult> {
  const grantedAt = params.grantedAt ?? new Date()
  const activeKey = buildActiveGrantKey(params)

  const activeGrant = await tx.resourceGrant.findFirst({
    where: {
      activeKey,
      revokedAt: null,
    },
    select: grantSelect,
  })

  if (activeGrant) {
    return activeGrant
  }

  const revokedGrant = await tx.resourceGrant.findFirst({
    where: {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      userId: params.userId,
      revokedAt: { not: null },
    },
    orderBy: [
      { grantedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
    },
  })

  const data = {
    grantedBy: params.grantedBy,
    grantedAt,
    revokedAt: null,
    activeKey,
    sourceApplicationId: params.sourceApplicationId ?? null,
  }

  try {
    if (revokedGrant) {
      return await tx.resourceGrant.update({
        where: { id: revokedGrant.id },
        data,
        select: grantSelect,
      })
    }

    return await tx.resourceGrant.create({
      data: {
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.userId,
        ...data,
      },
      select: grantSelect,
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      const concurrentGrant = await tx.resourceGrant.findFirst({
        where: {
          activeKey,
          revokedAt: null,
        },
        select: grantSelect,
      })

      if (concurrentGrant) {
        return concurrentGrant
      }
    }

    throw error
  }
}

export async function revokeGrantById(
  tx: GrantClient,
  params: {
    grantId: string
    revokedAt?: Date
  }
) {
  const revokedAt = params.revokedAt ?? new Date()

  return tx.resourceGrant.update({
    where: { id: params.grantId },
    data: {
      revokedAt,
      activeKey: null,
    },
    select: grantSelect,
  })
}

export async function revokeActiveGrants(
  tx: GrantClient,
  params: Partial<GrantIdentity> & {
    revokedAt?: Date
  }
) {
  const revokedAt = params.revokedAt ?? new Date()

  return tx.resourceGrant.updateMany({
    where: {
      revokedAt: null,
      ...(params.resourceType ? { resourceType: params.resourceType } : {}),
      ...(params.resourceId ? { resourceId: params.resourceId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    },
    data: {
      revokedAt,
      activeKey: null,
    },
  })
}

export async function revokeApprovedApplicationsForGrant(
  tx: GrantClient,
  params: GrantIdentity
) {
  return tx.resourceApplication.updateMany({
    where: {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      userId: params.userId,
      status: 'approved',
    },
    data: {
      status: 'revoked',
    },
  })
}
