import { NextRequest, NextResponse } from 'next/server'
import { getClawSessionState } from '@/lib/claw-quota'
import { externalErrorFromUnknown, externalOk } from '@/lib/external-v1'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ reservationId: string }> }) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['claw:sessions:write'] })
  if (authResult instanceof NextResponse) return authResult

  try {
    const { reservationId } = await params
    const data = await getClawSessionState(authResult.user.id, reservationId)
    return externalOk(data)
  } catch (error) {
    return externalErrorFromUnknown(error)
  }
}
