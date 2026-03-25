import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'
import { mcpConfigSchema, parseJsonStringArray, toMcpConfigPayload, toMcpStorageFields } from '@/lib/mcp-config'
import { canManageResource, canViewResource, resolveAdminAccessScope } from '@/lib/admin-access'
import { revokeActiveGrants } from '@/lib/resource-grants'
import { recordOperationLog } from '@/lib/operation-log'

const updateSchema = mcpConfigSchema.partial().extend({
  visibility: z.enum(['company', 'department', 'personal']).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const mcp = await db.mcp.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, organizationId: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  if (!mcp) {
    return NextResponse.json(
      { error: 'MCP not found', code: 'NOT_FOUND_MCP' },
      { status: 404 }
    )
  }

  if (!canViewResource(authResult.user, mcp, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    data: {
      ...mcp,
      config: toMcpConfigPayload(mcp),
    },
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const existingMcp = await db.mcp.findUnique({
    where: { id },
    select: {
      id: true,
      mcpId: true,
      name: true,
      descriptionZh: true,
      descriptionEn: true,
      category: true,
      transportType: true,
      command: true,
      defaultArgsJson: true,
      requiredEnvKeysJson: true,
      optionalEnvKeysJson: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      owner: { select: { organizationId: true } },
    },
  })

  if (!existingMcp) {
    return NextResponse.json(
      { error: 'MCP not found', code: 'NOT_FOUND_MCP' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingMcp, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const nextVisibility = parsed.data.visibility ?? existingMcp.visibility
  const nextOrganizationId = Object.prototype.hasOwnProperty.call(parsed.data, 'organizationId')
    ? parsed.data.organizationId ?? null
    : existingMcp.organizationId

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (nextVisibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only manage department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !nextOrganizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(nextOrganizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only manage resources in their department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else if (!authResult.user.isSuperAdmin) {
    if (nextVisibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only manage personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else if (nextVisibility !== 'personal' && !nextOrganizationId) {
    return NextResponse.json(
      { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
      { status: 400 }
    )
  }

  const configUpdates = toMcpStorageFields({
    id: parsed.data.id ?? existingMcp.mcpId,
    name: parsed.data.name ?? existingMcp.name,
    description_zh: parsed.data.description_zh ?? existingMcp.descriptionZh ?? undefined,
    description_en: parsed.data.description_en ?? existingMcp.descriptionEn ?? undefined,
    category: parsed.data.category ?? existingMcp.category,
    transportType: parsed.data.transportType ?? existingMcp.transportType,
    command: parsed.data.command ?? existingMcp.command,
    defaultArgs: parsed.data.defaultArgs ?? parseJsonStringArray(existingMcp.defaultArgsJson),
    requiredEnvKeys: parsed.data.requiredEnvKeys ?? parseJsonStringArray(existingMcp.requiredEnvKeysJson),
    optionalEnvKeys: parsed.data.optionalEnvKeys ?? parseJsonStringArray(existingMcp.optionalEnvKeysJson),
  })

  try {
    const mcp = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedMcp = await tx.mcp.update({
        where: { id },
        data: {
          ...configUpdates,
          ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
          ...(Object.prototype.hasOwnProperty.call(parsed.data, 'organizationId')
            ? { organizationId: nextVisibility === 'personal' ? null : nextOrganizationId }
            : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      })

      if (parsed.data.isActive === false) {
        const revokedAt = new Date()
        await revokeActiveGrants(tx, { resourceType: 'mcp', resourceId: id, revokedAt })
        await tx.resourceApplication.updateMany({
          where: {
            resourceType: 'mcp',
            resourceId: id,
            status: 'approved',
          },
          data: { status: 'revoked' },
        })
      }

      return updatedMcp
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'mcps',
      action: 'mcp.update',
      targetType: 'mcp',
      targetId: mcp.id,
      targetName: mcp.name,
      summary: `更新 MCP ${mcp.name}`,
      metadata: {
        mcpId: mcp.mcpId,
        visibility: mcp.visibility,
        ownerId: mcp.ownerId,
        organizationId: mcp.organizationId,
        transportType: mcp.transportType,
        category: mcp.category,
        isActive: mcp.isActive,
        updatedFields: Object.keys(parsed.data),
      },
    })

    return NextResponse.json({
      data: {
        ...mcp,
        config: toMcpConfigPayload(mcp),
      },
    })
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params

  const existingMcp = await db.mcp.findUnique({
    where: { id },
    select: {
      id: true,
      mcpId: true,
      name: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      owner: { select: { organizationId: true } },
    },
  })

  if (!existingMcp) {
    return NextResponse.json(
      { error: 'MCP not found', code: 'NOT_FOUND_MCP' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingMcp, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const revokedAt = new Date()
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.mcp.update({
      where: { id },
      data: { isActive: false }
    })
    await revokeActiveGrants(tx, { resourceType: 'mcp', resourceId: id, revokedAt })
    await tx.resourceApplication.updateMany({
      where: { resourceType: 'mcp', resourceId: id, status: 'approved' },
      data: { status: 'revoked' },
    })
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'mcps',
    action: 'mcp.delete',
    targetType: 'mcp',
    targetId: existingMcp.id,
    targetName: existingMcp.name,
    summary: `停用 MCP ${existingMcp.name}`,
    metadata: {
      mcpId: existingMcp.mcpId,
      visibility: existingMcp.visibility,
      ownerId: existingMcp.ownerId,
      organizationId: existingMcp.organizationId,
    },
  })

  return NextResponse.json({ success: true })
}
