import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { buildAppUrl } from '@/lib/app-url'
import { ensureDesktopOAuthClient, matchesAllowedRedirectUri } from '@/lib/oauth-clients'
import { ACCESS_TOKEN_EXPIRY, createAccessToken, createRefreshToken } from '@/lib/oauth'
import { recordOperationLog } from '@/lib/operation-log'

const DEFAULT_DESKTOP_SCOPE = 'skills:read mcps:read models:read'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : ''
  const state = typeof body.state === 'string' ? body.state.trim() : ''
  const scope = typeof body.scope === 'string' && body.scope.trim() ? body.scope.trim() : DEFAULT_DESKTOP_SCOPE

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const client = await ensureDesktopOAuthClient()
  if (!client.isActive || !matchesAllowedRedirectUri(client.allowedRedirectUris, redirectUri)) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive', code: 'AUTH_USER_INACTIVE' },
      { status: 401 }
    )
  }

  const accessToken = await createAccessToken(user.id, client.id, scope)
  const refreshToken = await createRefreshToken(user.id, client.id)

  await db.oAuthToken.create({
    data: {
      clientId: client.id,
      userId: user.id,
      scope,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000)
    }
  })

  await recordOperationLog({
    request,
    actor: user,
    module: 'auth',
    action: 'auth.desktop_authorize',
    targetType: 'auth_session',
    targetId: user.id,
    targetName: user.email,
    targetUserId: user.id,
    summary: `${user.name || user.email} 完成桌面端登录授权`,
    metadata: {
      clientId: client.clientId,
      redirectUri,
      scope,
      state,
    },
  })

  const callbackUrl = buildAppUrl('/api/v1/auth/desktop-callback', request)
  callbackUrl.searchParams.set('access_token', accessToken)
  callbackUrl.searchParams.set('refresh_token', refreshToken)
  callbackUrl.searchParams.set('expires_in', String(ACCESS_TOKEN_EXPIRY))
  callbackUrl.searchParams.set('redirect_uri', redirectUri)
  if (state) {
    callbackUrl.searchParams.set('state', state)
  }

  return NextResponse.json({
    callback_url: callbackUrl.toString(),
    expires_in: ACCESS_TOKEN_EXPIRY,
    token_type: 'Bearer'
  })
}
