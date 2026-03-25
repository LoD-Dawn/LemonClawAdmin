import { NextRequest, NextResponse } from 'next/server'
import { hasRequiredScopes, normalizeScopes, verifyAccessToken } from '@/lib/oauth'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function requireApiAuth(
  request: NextRequest,
  options?: { requiredScopes?: string[] }
) {
  // Try Bearer token first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = await verifyAccessToken(token)

    const tokenRecord = await db.oAuthToken.findFirst({
      where: {
        accessToken: token,
        expiresAt: { gt: new Date() },
      },
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            name: true,
          },
        },
        user: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (
      !payload ||
      !tokenRecord ||
      tokenRecord.userId !== payload.userId ||
      tokenRecord.clientId !== payload.clientId
    ) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' },
        { status: 401 }
      )
    }

    if (
      options?.requiredScopes?.length &&
      !hasRequiredScopes(tokenRecord.scope, options.requiredScopes)
    ) {
      return NextResponse.json(
        {
          error: `Missing required scopes: ${options.requiredScopes.join(', ')}`,
          code: 'FORBIDDEN_RESOURCE_SCOPE_REQUIRED',
        },
        { status: 403 }
      )
    }

    const user = tokenRecord.user
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive', code: 'AUTH_USER_INACTIVE' },
        { status: 401 }
      )
    }

    return {
      user,
      payload: {
        ...payload,
        scope: tokenRecord.scope,
      },
      authType: 'bearer' as const,
      scopes: normalizeScopes(tokenRecord.scope),
      client: tokenRecord.client,
      accessTokenExpiresAt: tokenRecord.expiresAt,
    }
  }

  // Fallback to NextAuth session
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_MISSING_TOKEN' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive', code: 'AUTH_USER_INACTIVE' },
      { status: 401 }
    )
  }

  return {
    user,
    payload: null,
    authType: 'session' as const,
    scopes: [],
    client: null,
    accessTokenExpiresAt: null,
  }
}
