import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json(
      { error: 'Token required', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  await db.oAuthToken.deleteMany({
    where: {
      OR: [
        { accessToken: token },
        { refreshToken: token }
      ]
    }
  })

  return NextResponse.json({ success: true })
}
