import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/external-api'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const profile = await getCurrentUserProfile(authResult.user.id)
  if (!profile) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: profile })
}
