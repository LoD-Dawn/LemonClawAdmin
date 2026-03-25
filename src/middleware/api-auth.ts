import { NextRequest, NextResponse } from 'next/server'
import { hasRequiredScopes, normalizeScopes, verifyAccessToken } from '@/lib/oauth'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

function buildAuthErrorResponse(
  request: NextRequest,
  status: number,
  code: string,
  message: string
) {
  if (request.nextUrl.pathname.startsWith('/api/external/v1/')) {
    return NextResponse.json(
      {
        code,
        message,
        data: {},
      },
      { status }
    )
  }

  return NextResponse.json(
    { error: message, code },
    { status }
  )
}

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
      return buildAuthErrorResponse(request, 401, 'AUTH_INVALID', 'Invalid token')
    }

    if (
      options?.requiredScopes?.length &&
      !hasRequiredScopes(tokenRecord.scope, options.requiredScopes)
    ) {
      return buildAuthErrorResponse(
        request,
        403,
        'UNAUTHORIZED',
        `Missing required scopes: ${options.requiredScopes.join(', ')}`
      )
    }

    const user = tokenRecord.user
    if (!user || !user.isActive) {
      return buildAuthErrorResponse(request, 401, 'AUTH_INVALID', 'User not found or inactive')
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
    return buildAuthErrorResponse(request, 401, 'UNAUTHORIZED', 'Unauthorized')
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })

  if (!user || !user.isActive) {
    return buildAuthErrorResponse(request, 401, 'AUTH_INVALID', 'User not found or inactive')
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
