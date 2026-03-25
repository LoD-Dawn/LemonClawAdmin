import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { user } = authResult

  // Check if user is super admin or department admin
  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const rawStatus = searchParams.get('status')
  const status: Prisma.ResourceApplicationWhereInput['status'] =
    rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'revoked'
      ? rawStatus
      : 'pending'

  // Build where clause based on user role
  let resourceFilter: Prisma.ResourceApplicationWhereInput = {}

  const accessScope = await resolveAdminAccessScope(user)

  if (accessScope.managementMode === 'department_admin') {
    const scopedOrganizationIds = accessScope.scopedOrganizationIds

    const [skillIds, mcpIds] = await Promise.all([
      db.skill.findMany({
        where: { organizationId: { in: scopedOrganizationIds } },
        select: { id: true }
      }),
      db.mcp.findMany({
        where: { organizationId: { in: scopedOrganizationIds } },
        select: { id: true }
      })
    ])

    const allowedResourceIds: Prisma.ResourceApplicationWhereInput[] = [
      ...skillIds.map((s: { id: string }) => ({ resourceType: 'skill' as const, resourceId: s.id })),
      ...mcpIds.map((m: { id: string }) => ({ resourceType: 'mcp' as const, resourceId: m.id }))
    ]

    resourceFilter = {
      OR: allowedResourceIds
    }
  }

  const where: Prisma.ResourceApplicationWhereInput = {
    status,
    ...(Object.keys(resourceFilter).length > 0 && resourceFilter)
  }

  const [applications, total] = await Promise.all([
    db.resourceApplication.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    db.resourceApplication.count({ where })
  ])

  // Fetch resource info for each application
  const applicationsWithResource = await Promise.all(
    applications.map(async (app: typeof applications[number]) => {
      let resource = null
      const activeGrant = await db.resourceGrant.findFirst({
        where: {
          resourceType: app.resourceType,
          resourceId: app.resourceId,
          userId: app.userId,
          revokedAt: null,
        },
        select: {
          id: true,
          grantedAt: true,
        },
      })

      if (app.resourceType === 'skill') {
        resource = await db.skill.findUnique({
          where: { id: app.resourceId },
          select: { id: true, name: true, identifier: true, visibility: true, organization: { select: { id: true, name: true } } }
        })
      } else if (app.resourceType === 'mcp') {
        resource = await db.mcp.findUnique({
          where: { id: app.resourceId },
          select: { id: true, name: true, mcpId: true, visibility: true, organization: { select: { id: true, name: true } } }
        })
      }

      return {
        ...app,
        resource: resource
          ? 'mcpId' in resource
            ? {
                id: resource.id,
                name: resource.name,
                identifier: resource.mcpId,
                visibility: resource.visibility,
                organization: resource.organization,
              }
            : resource
          : null,
        grantStatus: activeGrant ? 'granted' : 'not_granted',
        grant: activeGrant,
      }
    })
  )

  return NextResponse.json({
    data: applicationsWithResource,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total
    }
  })
}
