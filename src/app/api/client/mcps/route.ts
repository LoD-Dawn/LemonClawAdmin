import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { listDiscoverableResources } from '@/lib/resource-access'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['mcps:read'] })
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const data = await listDiscoverableResources({
    userId: user.id,
    organizationId: user.organizationId,
    resourceType: 'mcp',
  })

  return NextResponse.json({ data })
}
