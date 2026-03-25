import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { revokeApprovedApplicationsForGrant, revokeGrantById } from '@/lib/resource-grants'
import { recordOperationLog } from '@/lib/operation-log'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request, { allowDepartmentAdmin: true })
  if (authResult instanceof NextResponse) return authResult

  const accessScope = await resolveAdminAccessScope(authResult.user)
  const { id } = await params

  const grant = await db.resourceGrant.findUnique({
    where: { id },
    select: {
      id: true,
      resourceType: true,
      resourceId: true,
      userId: true,
      revokedAt: true,
    },
  })

  if (!grant || grant.revokedAt) {
    return NextResponse.json(
      { error: 'Grant not found', code: 'NOT_FOUND_GRANT' },
      { status: 404 }
    )
  }

  if (accessScope.managementMode === 'department_admin') {
    const resourceOrganization = grant.resourceType === 'skill'
      ? await db.skill.findUnique({
          where: { id: grant.resourceId },
          select: { organizationId: true },
        })
      : await db.mcp.findUnique({
          where: { id: grant.resourceId },
          select: { organizationId: true },
        })

    if (
      !resourceOrganization?.organizationId
      || !accessScope.scopedOrganizationIds.includes(resourceOrganization.organizationId)
    ) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  }

  const revokedAt = new Date()
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await revokeGrantById(tx, { grantId: id, revokedAt })
    await revokeApprovedApplicationsForGrant(tx, {
      resourceType: grant.resourceType,
      resourceId: grant.resourceId,
      userId: grant.userId,
    })
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'grants',
    action: 'resource_grant.revoke',
    targetType: 'resource_grant',
    targetId: grant.id,
    targetName: `${grant.resourceType}:${grant.resourceId}`,
    targetUserId: grant.userId,
    summary: `撤销授权 ${grant.resourceType}:${grant.resourceId}`,
    metadata: {
      resourceType: grant.resourceType,
      resourceId: grant.resourceId,
      userId: grant.userId,
      revokedAt,
    },
  })

  return NextResponse.json({ success: true })
}
