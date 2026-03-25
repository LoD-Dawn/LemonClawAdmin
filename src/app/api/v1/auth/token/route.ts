import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createAccessToken, createRefreshToken } from '@/lib/oauth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { grant_type, code, client_id, client_secret, redirect_uri } = body

  if (grant_type === 'authorization_code') {
    if (!code || !client_id || !client_secret || !redirect_uri) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
        { status: 400 }
      )
    }

    const authCode = await db.oAuthAuthorizationCode.findUnique({
      where: { code },
      include: { client: true }
    })

    if (!authCode || authCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired code', code: 'AUTH_INVALID_CODE' },
        { status: 401 }
      )
    }

    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json(
        { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
        { status: 400 }
      )
    }

    const client = authCode.client
    const isValidSecret = await bcrypt.compare(client_secret, client.clientSecretHash)
    if (!isValidSecret) {
      return NextResponse.json(
        { error: 'Invalid client_secret', code: 'AUTH_INVALID_CLIENT' },
        { status: 401 }
      )
    }

    // Delete used auth code
    await db.oAuthAuthorizationCode.delete({ where: { id: authCode.id } })

    // Create tokens
    const accessToken = await createAccessToken(authCode.userId, client.id, authCode.scope)
    const refreshToken = await createRefreshToken(authCode.userId, client.id)

    await db.oAuthToken.create({
      data: {
        clientId: client.id,
        userId: authCode.userId,
        scope: authCode.scope,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }
    })

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    })
  }

  return NextResponse.json(
    { error: 'Unsupported grant_type', code: 'VALIDATION_UNSUPPORTED_GRANT' },
    { status: 400 }
  )
}
