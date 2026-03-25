import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { getCurrentUserModelConfig } from '@/lib/external-api'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['models:read'] })
  if (authResult instanceof NextResponse) return authResult
  const data = await getCurrentUserModelConfig(authResult.user)
  return NextResponse.json(data)
}
