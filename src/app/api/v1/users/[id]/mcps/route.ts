import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { toMcpConfigPayload } from '@/lib/mcp-config'
import { listConsumableResources } from '@/lib/resource-access'
import { getOrganizationScopeIds } from '@/lib/organizations'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['mcps:read'] })
  if (authResult instanceof NextResponse) return authResult

  const { id: targetUserId } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

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

  const allMcps = await listConsumableResources({
    targetUserId,
    includePersonal: isSelf,
    resourceType: 'mcp',
  })
  const total = allMcps.length
  const mcps = allMcps
    .slice((page - 1) * pageSize, page * pageSize)
    .map((mcp) => toMcpConfigPayload({
      mcpId: mcp.identifier,
      name: mcp.name,
      descriptionZh: mcp.descriptionZh,
      descriptionEn: mcp.descriptionEn,
      category: mcp.category ?? 'developer',
      transportType: mcp.transportType ?? 'stdio',
      command: mcp.command ?? '',
      defaultArgsJson: JSON.stringify(mcp.defaultArgs),
      requiredEnvKeysJson: JSON.stringify(mcp.requiredEnvKeys),
      optionalEnvKeysJson: JSON.stringify(mcp.optionalEnvKeys),
    }))

  return NextResponse.json({ data: mcps, pagination: { page, pageSize, total } })
}
