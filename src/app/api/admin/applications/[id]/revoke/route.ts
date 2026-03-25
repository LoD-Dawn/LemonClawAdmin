import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { revokeApprovedApplicationsForGrant, revokeGrantById } from '@/lib/resource-grants'
import { recordOperationLog } from '@/lib/operation-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult.user
  const { id } = await params

  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const application = await db.resourceApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!application) {
    return NextResponse.json(
      { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
      { status: 404 }
    )
  }

  const accessScope = await resolveAdminAccessScope(user)

  if (accessScope.managementMode === 'department_admin') {
    let resourceOrganizationId: string | null = null

    if (application.resourceType === 'skill') {
      const skill = await db.skill.findUnique({
        where: { id: application.resourceId },
        select: { organizationId: true },
      })
      resourceOrganizationId = skill?.organizationId ?? null
    } else if (application.resourceType === 'mcp') {
      const mcp = await db.mcp.findUnique({
        where: { id: application.resourceId },
        select: { organizationId: true },
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

  const activeGrant = await db.resourceGrant.findFirst({
    where: {
      resourceType: application.resourceType,
      resourceId: application.resourceId,
      userId: application.userId,
      revokedAt: null,
    },
    select: { id: true },
  })

  if (!activeGrant) {
    return NextResponse.json(
      { error: 'Active grant not found', code: 'ACTIVE_GRANT_NOT_FOUND' },
      { status: 404 }
    )
  }

  const revokedAt = new Date()
  const data = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await revokeGrantById(tx, {
      grantId: activeGrant.id,
      revokedAt,
    })

    await revokeApprovedApplicationsForGrant(tx, {
      resourceType: application.resourceType,
      resourceId: application.resourceId,
      userId: application.userId,
    })

    const updatedApplication = await tx.resourceApplication.findUniqueOrThrow({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
    })

    return {
      ...updatedApplication,
      grantId: activeGrant.id,
      revokedAt,
    }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'applications',
    action: 'resource_application.revoke',
    targetType: 'resource_application',
    targetId: data.id,
    targetName: `${data.resourceType}:${data.resourceId}`,
    targetUserId: data.userId,
    summary: `撤销 ${data.user.name || data.user.email} 的${data.resourceType}授权`,
    metadata: {
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      userId: data.userId,
      userEmail: data.user.email,
      grantId: data.grantId,
      revokedAt: data.revokedAt,
    },
  })

  return NextResponse.json({ data })
}
