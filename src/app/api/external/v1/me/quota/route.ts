import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserQuotaSnapshot } from '@/lib/claw-quota'
import { externalErrorFromUnknown, externalOk } from '@/lib/external-v1'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['quota:read'] })
  if (authResult instanceof NextResponse) return authResult

  try {
    const data = await getCurrentUserQuotaSnapshot(authResult.user.id)
    return externalOk(data)
  } catch (error) {
    return externalErrorFromUnknown(error)
  }
}
