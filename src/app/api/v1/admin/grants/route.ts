import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, ResourceType } from '@prisma/client'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { grantResource } from '@/lib/resource-grants'
import { recordOperationLog } from '@/lib/operation-log'

const createGrantSchema = z.object({
  resourceType: z.enum(['skill', 'mcp']),
  resourceId: z.string().min(1),
  userId: z.string().uuid(),
})

async function getScopedResourceIdFilter(
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

  const shouldLoadSkills = resourceType === null || resourceType === 'skill'
  const shouldLoadMcps = resourceType === null || resourceType === 'mcp'

  const [skillIds, mcpIds] = await Promise.all([
    shouldLoadSkills
      ? db.skill.findMany({
          where: {
            visibility: 'department',
            organizationId: { in: scopedOrganizationIds },
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
    shouldLoadMcps
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

  if (skillIds.length > 0) {
    orConditions.push({
      resourceType: 'skill',
      resourceId: { in: skillIds.map((skill) => skill.id) },
    })
  }

  if (mcpIds.length > 0) {
    orConditions.push({
      resourceType: 'mcp',
      resourceId: { in: mcpIds.map((mcp) => mcp.id) },
    })
  }

  if (orConditions.length === 0) {
    return {
      OR: [
        { resourceType: 'skill', resourceId: '__forbidden__' },
        { resourceType: 'mcp', resourceId: '__forbidden__' },
      ],
    }
  }

  return { OR: orConditions }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request, { allowDepartmentAdmin: true })
  if (authResult instanceof NextResponse) return authResult

  const accessScope = await resolveAdminAccessScope(authResult.user)
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const resourceTypeParam = searchParams.get('resourceType')
  const resourceType: ResourceType | null =
    resourceTypeParam === 'skill' || resourceTypeParam === 'mcp' ? resourceTypeParam : null
  const userId = searchParams.get('userId')
  const resourceId = searchParams.get('resourceId')

  const scopeWhere = accessScope.managementMode === 'department_admin'
    ? await getScopedResourceIdFilter(resourceType, accessScope.scopedOrganizationIds)
    : {}

  const where: Prisma.ResourceGrantWhereInput = {
    revokedAt: null,
    ...(resourceType ? { resourceType } : {}),
    ...(userId ? { userId } : {}),
    ...(resourceId ? { resourceId } : {}),
    AND: [scopeWhere],
  }

  const [grants, total] = await Promise.all([
    db.resourceGrant.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ grantedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organizationId: true,
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
    }),
    db.resourceGrant.count({ where }),
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
            organization: { select: { id: true, name: true } },
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
            organization: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const skillMap = new Map(skills.map((skill) => [skill.id, skill]))
  const mcpMap = new Map(mcps.map((mcp) => [mcp.id, mcp]))

  const data = grants.map((grant) => ({
    ...grant,
    resource: grant.resourceType === 'skill'
      ? skillMap.get(grant.resourceId) ?? null
      : (() => {
          const resource = mcpMap.get(grant.resourceId) ?? null
          return resource ? { ...resource, identifier: resource.mcpId } : null
        })(),
  }))

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request, { allowDepartmentAdmin: true })
  if (authResult instanceof NextResponse) return authResult

  const accessScope = await resolveAdminAccessScope(authResult.user)
  const body = await request.json()
  const parsed = createGrantSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const targetUser = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      isActive: true,
      organizationId: true,
      name: true,
      email: true,
    },
  })

  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json(
      { error: 'Target user is not available', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  const resource = parsed.data.resourceType === 'skill'
    ? await db.skill.findUnique({
        where: { id: parsed.data.resourceId },
        select: {
          id: true,
          name: true,
          identifier: true,
          isActive: true,
          visibility: true,
          organizationId: true,
        },
      })
    : await db.mcp.findUnique({
        where: { id: parsed.data.resourceId },
        select: {
          id: true,
          name: true,
          mcpId: true,
          isActive: true,
          visibility: true,
          organizationId: true,
        },
      })

  if (!resource) {
    return NextResponse.json(
      { error: 'Resource not found', code: 'NOT_FOUND_RESOURCE' },
      { status: 404 }
    )
  }

  if (!resource.isActive) {
    return NextResponse.json(
      { error: 'Resource is disabled', code: 'FORBIDDEN_RESOURCE_DISABLED' },
      { status: 403 }
    )
  }

  if (resource.visibility !== 'department' || !resource.organizationId) {
    return NextResponse.json(
      { error: 'Only active department resources can be manually granted', code: 'VALIDATION_RESOURCE_NOT_GRANTABLE' },
      { status: 400 }
    )
  }

  if (
    accessScope.managementMode === 'department_admin'
    && !accessScope.scopedOrganizationIds.includes(resource.organizationId)
  ) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  if (!targetUser.organizationId) {
    return NextResponse.json(
      { error: 'Target user is not assigned to an organization', code: 'VALIDATION_USER_ORG_REQUIRED' },
      { status: 400 }
    )
  }

  const grantableOrganizationIds = await getOrganizationScopeIds(targetUser.organizationId)
  if (!grantableOrganizationIds.includes(resource.organizationId)) {
    return NextResponse.json(
      { error: 'Target user is outside the resource organization scope', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const grant = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    return grantResource(tx, {
      resourceType: parsed.data.resourceType,
      resourceId: parsed.data.resourceId,
      userId: parsed.data.userId,
      grantedBy: authResult.user.id,
      sourceApplicationId: null,
    })
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'grants',
    action: 'resource_grant.create',
    targetType: 'resource_grant',
    targetId: grant.id,
    targetName: `${parsed.data.resourceType}:${parsed.data.resourceId}`,
    targetUserId: parsed.data.userId,
    summary: `手工授权 ${parsed.data.resourceType} 给用户 ${targetUser.email}`,
    metadata: {
      resourceType: parsed.data.resourceType,
      resourceId: parsed.data.resourceId,
      userId: parsed.data.userId,
      userEmail: targetUser.email,
      grantId: grant.id,
    },
  })

  return NextResponse.json({ data: grant }, { status: 201 })
}
