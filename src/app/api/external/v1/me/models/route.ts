import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserModelConfig } from '@/lib/external-api'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['models:read'] })
  if (authResult instanceof NextResponse) return authResult

  const data = await getCurrentUserModelConfig(authResult.user)
  return NextResponse.json(data)
}
