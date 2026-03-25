import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { recordOperationLog } from '@/lib/operation-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['mcps:read'] })
  if (authResult instanceof NextResponse) return authResult
  const user = authResult.user
  const userId = user.id
  const { id } = await params

  const mcp = await db.mcp.findUnique({ where: { id } })
  if (!mcp) {
    return NextResponse.json({ error: 'MCP not found' }, { status: 404 })
  }

  if (!mcp.isActive) {
    return NextResponse.json(
      { error: 'MCP is disabled', code: 'FORBIDDEN_RESOURCE_DISABLED' },
      { status: 403 }
    )
  }

  if (mcp.visibility !== 'department') {
    return NextResponse.json(
      { error: 'Only department resources can be applied', code: 'VALIDATION_RESOURCE_NOT_APPLICABLE' },
      { status: 400 }
    )
  }

  const scopedOrganizationIds = await getOrganizationScopeIds(user.organizationId)
  if (!mcp.organizationId || !scopedOrganizationIds.includes(mcp.organizationId)) {
    return NextResponse.json(
      { error: 'Cannot apply to resource outside your organization scope', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const activeGrant = await db.resourceGrant.findFirst({
    where: {
      resourceType: 'mcp',
      resourceId: id,
      userId,
      revokedAt: null,
    },
    select: { id: true },
  })

  if (activeGrant) {
    return NextResponse.json(
      { error: 'Resource already granted', code: 'CONFLICT_RESOURCE_ALREADY_GRANTED' },
      { status: 409 }
    )
  }

  const existing = await db.resourceApplication.findUnique({
    where: { resourceType_resourceId_userId: { resourceType: 'mcp', resourceId: id, userId } }
  })

  if (existing?.status === 'pending') {
    return NextResponse.json(
      { error: 'Application is already pending', code: 'CONFLICT_APPLICATION_PENDING' },
      { status: 409 }
    )
  }

  if (existing) {
    const application = await db.resourceApplication.update({
      where: { id: existing.id },
      data: { status: 'pending' },
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'applications',
      action: 'resource_application.resubmit',
      targetType: 'resource_application',
      targetId: application.id,
      targetName: mcp.name,
      targetUserId: userId,
      summary: `重新提交 MCP 申请 ${mcp.name}`,
      metadata: {
        resourceType: application.resourceType,
        resourceId: application.resourceId,
        userId,
        status: application.status,
      },
    })

    return NextResponse.json({ message: 'Application resubmitted', data: application })
  }

  const application = await db.resourceApplication.create({
    data: { resourceType: 'mcp', resourceId: id, userId }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'applications',
    action: 'resource_application.create',
    targetType: 'resource_application',
    targetId: application.id,
    targetName: mcp.name,
    targetUserId: userId,
    summary: `提交 MCP 申请 ${mcp.name}`,
    metadata: {
      resourceType: application.resourceType,
      resourceId: application.resourceId,
      userId,
      status: application.status,
    },
  })

  return NextResponse.json({ message: 'Application submitted', data: application }, { status: 201 })
}
