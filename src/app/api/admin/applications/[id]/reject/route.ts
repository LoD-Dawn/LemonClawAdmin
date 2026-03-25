import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
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

  const updated = await db.resourceApplication.updateMany({
    where: {
      id,
      status: 'pending',
    },
    data: { status: 'rejected' },
  })

  if (updated.count !== 1) {
    return NextResponse.json(
      { error: 'Application is not pending', code: 'APPLICATION_NOT_PENDING' },
      { status: 400 }
    )
  }

  const record = await db.resourceApplication.findUniqueOrThrow({
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

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'applications',
    action: 'resource_application.reject',
    targetType: 'resource_application',
    targetId: record.id,
    targetName: `${record.resourceType}:${record.resourceId}`,
    targetUserId: record.userId,
    summary: `驳回 ${record.user.name || record.user.email} 的${record.resourceType}申请`,
    metadata: {
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      userId: record.userId,
      userEmail: record.user.email,
      status: record.status,
    },
  })

  return NextResponse.json({ data: record })
}
