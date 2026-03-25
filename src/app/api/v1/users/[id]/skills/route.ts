import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { listConsumableResources } from '@/lib/resource-access'
import { getOrganizationScopeIds } from '@/lib/organizations'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['skills:read'] })
  if (authResult instanceof NextResponse) return authResult

  const { id: targetUserId } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  // Get target user
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    include: { organization: true }
  })

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  const isSelf = authResult.user.id === targetUserId
  const isAdmin = authResult.user.isSuperAdmin || authResult.user.isDepartmentAdmin
  if (!isSelf && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    const scopedOrganizationIds = await getOrganizationScopeIds(authResult.user.departmentId)
    if (!targetUser.organizationId || !scopedOrganizationIds.includes(targetUser.organizationId)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  }

  const allSkills = await listConsumableResources({
    targetUserId,
    includePersonal: isSelf,
    resourceType: 'skill',
  })
  const total = allSkills.length
  const skills = allSkills.slice((page - 1) * pageSize, page * pageSize)

  return NextResponse.json({ data: skills, pagination: { page, pageSize, total } })
}
