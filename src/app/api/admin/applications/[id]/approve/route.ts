import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { grantResource } from '@/lib/resource-grants'
import { recordOperationLog } from '@/lib/operation-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { user } = authResult
  const { id } = await params

  // Check if user is super admin or department admin
  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const application = await db.resourceApplication.findUnique({
    where: { id },
    include: {
      user: { select: { organizationId: true } }
    }
  })

  if (!application) {
    return NextResponse.json(
      { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
      { status: 404 }
    )
  }

  if (application.status !== 'pending') {
    return NextResponse.json(
      { error: 'Application is not pending', code: 'APPLICATION_NOT_PENDING' },
      { status: 400 }
    )
  }

  const accessScope = await resolveAdminAccessScope(user)

  if (accessScope.managementMode === 'department_admin') {
    let resourceOrganizationId: string | null = null

    if (application.resourceType === 'skill') {
      const skill = await db.skill.findUnique({
        where: { id: application.resourceId },
        select: { organizationId: true }
      })
      resourceOrganizationId = skill?.organizationId ?? null
    } else if (application.resourceType === 'mcp') {
      const mcp = await db.mcp.findUnique({
        where: { id: application.resourceId },
        select: { organizationId: true }
      })
      resourceOrganizationId = mcp?.organizationId ?? null
    }

    if (!resourceOrganizationId || !accessScope.scopedOrganizationIds.includes(resourceOrganizationId)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN_NOT_IN_DEPARTMENT' },
        { status: 403 }
      )
    }
  }

  const approvedAt = new Date()
  const updated = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const result = await tx.resourceApplication.updateMany({
      where: {
        id,
        status: 'pending',
      },
      data: { status: 'approved' },
    })

    if (result.count !== 1) {
      throw new Error('APPLICATION_NOT_PENDING')
    }

    const grant = await grantResource(tx, {
      resourceType: application.resourceType,
      resourceId: application.resourceId,
      userId: application.userId,
      grantedBy: user.id,
      grantedAt: approvedAt,
      sourceApplicationId: application.id,
    })

    const record = await tx.resourceApplication.findUniqueOrThrow({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            organization: { select: { id: true, name: true } }
          }
        }
      }
    })

    return {
      ...record,
      grant,
    }
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'APPLICATION_NOT_PENDING') {
      return null
    }
    throw error
  })

  if (!updated) {
    return NextResponse.json(
      { error: 'Application is not pending', code: 'APPLICATION_NOT_PENDING' },
      { status: 400 }
    )
  }

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'applications',
    action: 'resource_application.approve',
    targetType: 'resource_application',
    targetId: updated.id,
    targetName: `${updated.resourceType}:${updated.resourceId}`,
    targetUserId: updated.userId,
    summary: `审批通过 ${updated.user.name || updated.user.email} 的${updated.resourceType}申请`,
    metadata: {
      resourceType: updated.resourceType,
      resourceId: updated.resourceId,
      userId: updated.userId,
      userEmail: updated.user.email,
      grantId: updated.grant.id,
      grantedAt: updated.grant.grantedAt,
    },
  })

  return NextResponse.json({ data: updated })
}
