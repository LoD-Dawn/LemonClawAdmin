import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserMcps, parsePaginationParams } from '@/lib/external-api'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['mcps:read'] })
  if (authResult instanceof NextResponse) return authResult

  const { page, pageSize } = parsePaginationParams(request.nextUrl.searchParams)
  const result = await getCurrentUserMcps(authResult.user.id, page, pageSize)

  return NextResponse.json(result)
}
