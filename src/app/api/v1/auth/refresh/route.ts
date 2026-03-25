import { NextRequest, NextResponse } from 'next/server'
import { refreshAccessTokenByRefreshToken } from '@/lib/oauth-refresh'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { refresh_token } = body

  if (!refresh_token) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  const result = await refreshAccessTokenByRefreshToken(refresh_token)
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status })
  }

  return NextResponse.json(result.body)
}
