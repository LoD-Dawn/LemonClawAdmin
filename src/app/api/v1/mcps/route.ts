import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, Visibility } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'
import { mcpConfigSchema, parseJsonStringArray, toMcpStorageFields } from '@/lib/mcp-config'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { recordOperationLog } from '@/lib/operation-log'

const createSchema = mcpConfigSchema.extend({
  visibility: z.enum(['company', 'department', 'personal']),
  ownerId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const visibility = searchParams.get('visibility')
  const search = searchParams.get('search') || ''
  const visibilityFilter: Visibility | null =
    visibility === 'company' || visibility === 'department' || visibility === 'personal'
      ? visibility
      : null

  const where: Prisma.McpWhereInput = {
    isActive: true,
    AND: [
      getViewableResourceFilter(authResult.user, {
        scopedOrganizationIds: accessScope.scopedOrganizationIds,
      }) as Prisma.McpWhereInput,
      ...(visibilityFilter ? [{ visibility: visibilityFilter }] : []),
      ...(search ? [{
        OR: [
          { name: { contains: search } },
          { mcpId: { contains: search } },
        ],
      }] : []),
    ],
  }

  const [mcps, total] = await Promise.all([
    db.mcp.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, organizationId: true } },
        organization: { select: { id: true, name: true } }
      }
    }),
    db.mcp.count({ where })
  ])

  const data = mcps.map((mcp: typeof mcps[number]) => ({
    id: mcp.id,
    mcpId: mcp.mcpId,
    name: mcp.name,
    descriptionZh: mcp.descriptionZh,
    descriptionEn: mcp.descriptionEn,
    category: mcp.category,
    transportType: mcp.transportType,
    command: mcp.command,
    defaultArgs: parseJsonStringArray(mcp.defaultArgsJson),
    requiredEnvKeys: parseJsonStringArray(mcp.requiredEnvKeysJson),
    optionalEnvKeys: parseJsonStringArray(mcp.optionalEnvKeysJson),
    visibility: mcp.visibility,
    isActive: mcp.isActive,
    owner: mcp.owner,
    organization: mcp.organization,
    canManage: canManageResource(authResult.user, mcp, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  }))

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total
    }
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, organizationId, ...config } = parsed.data
  const storageFields = toMcpStorageFields(config)

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (visibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only create department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !organizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(organizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only create resources in their managed department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = null
  } else if (!authResult.user.isSuperAdmin) {
    if (visibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only create personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = authResult.user.id
    parsed.data.organizationId = null
  } else {
    if (visibility === 'personal') {
      return NextResponse.json(
        { error: 'Personal resources are not created from the management API', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
        { status: 400 }
      )
    }
  }

  try {
    const mcp = await db.mcp.create({
      data: {
        ...storageFields,
        visibility,
        ownerId: parsed.data.ownerId ?? null,
        organizationId: parsed.data.organizationId ?? null,
      },
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'mcps',
      action: 'mcp.create',
      targetType: 'mcp',
      targetId: mcp.id,
      targetName: mcp.name,
      summary: `创建 MCP ${mcp.name}`,
      metadata: {
        mcpId: mcp.mcpId,
        visibility: mcp.visibility,
        ownerId: mcp.ownerId,
        organizationId: mcp.organizationId,
        transportType: mcp.transportType,
        category: mcp.category,
        isActive: mcp.isActive,
      },
    })

    return NextResponse.json({ data: mcp }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Identifier already exists in this scope', code: 'CONFLICT_IDENTIFIER_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
