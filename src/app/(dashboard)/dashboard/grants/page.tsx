import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Prisma, ResourceType } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { Main } from '@/components/layout/main'
import { GrantsClient } from './GrantsClient'

type ResourceTypeFilter = 'all' | ResourceType

async function getScopedGrantWhere(
  resourceType: ResourceType | null,
  scopedOrganizationIds: string[]
): Promise<Prisma.ResourceGrantWhereInput> {
  if (scopedOrganizationIds.length === 0) {
    return {
      OR: [
        { resourceType: 'skill', resourceId: '__forbidden__' },
        { resourceType: 'mcp', resourceId: '__forbidden__' },
      ],
    }
  }

  const [skills, mcps] = await Promise.all([
    resourceType !== 'mcp'
      ? db.skill.findMany({
          where: {
            visibility: 'department',
            organizationId: { in: scopedOrganizationIds },
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
    resourceType !== 'skill'
      ? db.mcp.findMany({
          where: {
            visibility: 'department',
            organizationId: { in: scopedOrganizationIds },
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
  ])

  const orConditions: Prisma.ResourceGrantWhereInput[] = []

  if (skills.length > 0) {
    orConditions.push({
      resourceType: 'skill',
      resourceId: { in: skills.map((skill) => skill.id) },
    })
  }

  if (mcps.length > 0) {
    orConditions.push({
      resourceType: 'mcp',
      resourceId: { in: mcps.map((mcp) => mcp.id) },
    })
  }

  return orConditions.length > 0
    ? { OR: orConditions }
    : {
        OR: [
          { resourceType: 'skill', resourceId: '__forbidden__' },
          { resourceType: 'mcp', resourceId: '__forbidden__' },
        ],
      }
}

function formatDate(value: Date) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function GrantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ resourceType?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin && !session.user.isDepartmentAdmin) {
    redirect('/dashboard')
  }

  const accessScope = await resolveAdminAccessScope(session.user)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedType: ResourceTypeFilter =
    resolvedSearchParams?.resourceType === 'skill' || resolvedSearchParams?.resourceType === 'mcp'
      ? resolvedSearchParams.resourceType
      : 'all'

  const scopedWhere = accessScope.managementMode === 'department_admin'
    ? await getScopedGrantWhere(selectedType === 'all' ? null : selectedType, accessScope.scopedOrganizationIds)
    : {}

  const where: Prisma.ResourceGrantWhereInput = {
    revokedAt: null,
    ...(selectedType !== 'all' ? { resourceType: selectedType } : {}),
    AND: [scopedWhere],
  }

  const [grants, totalCount, skillGrantCount, mcpGrantCount, grantableSkills, grantableMcps, grantableUsers] = await Promise.all([
    db.resourceGrant.findMany({
      where,
      orderBy: [{ grantedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { id: true, name: true } },
          },
        },
        grantor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 50,
    }),
    db.resourceGrant.count({ where }),
    db.resourceGrant.count({
      where: {
        revokedAt: null,
        resourceType: 'skill',
        AND: [scopedWhere],
      },
    }),
    db.resourceGrant.count({
      where: {
        revokedAt: null,
        resourceType: 'mcp',
        AND: [scopedWhere],
      },
    }),
    db.skill.findMany({
      where: {
        isActive: true,
        visibility: 'department',
        ...(accessScope.managementMode === 'department_admin'
          ? { organizationId: { in: accessScope.scopedOrganizationIds } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        identifier: true,
        organization: { select: { name: true } },
      },
    }),
    db.mcp.findMany({
      where: {
        isActive: true,
        visibility: 'department',
        ...(accessScope.managementMode === 'department_admin'
          ? { organizationId: { in: accessScope.scopedOrganizationIds } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        mcpId: true,
        organization: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        organizationId: accessScope.managementMode === 'department_admin'
          ? { in: accessScope.scopedOrganizationIds }
          : { not: null },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        organization: { select: { name: true } },
      },
    }),
  ])

  const skillIds = grants.filter((grant) => grant.resourceType === 'skill').map((grant) => grant.resourceId)
  const mcpIds = grants.filter((grant) => grant.resourceType === 'mcp').map((grant) => grant.resourceId)

  const [skills, mcps] = await Promise.all([
    skillIds.length > 0
      ? db.skill.findMany({
          where: { id: { in: skillIds } },
          select: {
            id: true,
            name: true,
            identifier: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    mcpIds.length > 0
      ? db.mcp.findMany({
          where: { id: { in: mcpIds } },
          select: {
            id: true,
            name: true,
            mcpId: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const skillMap = new Map(skills.map((skill) => [skill.id, skill]))
  const mcpMap = new Map(mcps.map((mcp) => [mcp.id, { ...mcp, identifier: mcp.mcpId }]))
  const uniqueUserCount = new Set(grants.map((grant) => grant.userId)).size

  const grantableResources = [
    ...grantableSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      identifier: skill.identifier,
      resourceType: 'skill' as const,
      organizationName: skill.organization?.name ?? null,
    })),
    ...grantableMcps.map((mcp) => ({
      id: mcp.id,
      name: mcp.name,
      identifier: mcp.mcpId,
      resourceType: 'mcp' as const,
      organizationName: mcp.organization?.name ?? null,
    })),
  ]

  const typeOptions: Array<{ key: ResourceTypeFilter; label: string }> = [
    { key: 'all', label: '全部授权' },
    { key: 'skill', label: 'Skill 授权' },
    { key: 'mcp', label: 'MCP 授权' },
  ]

  const initialGrants = grants.map((grant) => {
    const resource = grant.resourceType === 'skill'
      ? skillMap.get(grant.resourceId) ?? null
      : mcpMap.get(grant.resourceId) ?? null

    return {
      id: grant.id,
      resourceType: grant.resourceType as 'skill' | 'mcp',
      resourceId: grant.resourceId,
      resourceName: resource?.name ?? null,
      resourceIdentifier: resource?.identifier ?? null,
      resourceOrgName: resource?.organization?.name ?? null,
      userId: grant.userId,
      userName: grant.user.name,
      userEmail: grant.user.email,
      userOrgName: grant.user.organization?.name ?? null,
      grantedAt: grant.grantedAt.toISOString(),
      source: (grant.sourceApplicationId ? 'application' : 'manual') as 'application' | 'manual',
      grantorName: grant.grantor?.name ?? null,
    }
  })

  return (
    <Main className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <GrantsClient
        initialGrants={initialGrants}
        grantableResources={grantableResources}
        grantableUsers={grantableUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          organizationName: u.organization?.name ?? null,
        }))}
      />
    </Main>
  )
}
