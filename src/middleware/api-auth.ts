import { NextRequest, NextResponse } from 'next/server'
import { hasRequiredScopes, normalizeScopes, verifyAccessToken } from '@/lib/oauth'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const LEGACY_COMPATIBLE_EXTERNAL_AUTH_PATHS = new Set([
  '/api/external/v1/me',
  '/api/external/v1/me/validate',
  '/api/external/v1/me/models',
  '/api/external/v1/me/skills',
  '/api/external/v1/me/mcps',
])

function isLegacyCompatibleExternalAuthPath(pathname: string) {
  return LEGACY_COMPATIBLE_EXTERNAL_AUTH_PATHS.has(pathname)
}

function getLegacyExternalAuthCode(pathname: string, code: string, status: number) {
  if (!isLegacyCompatibleExternalAuthPath(pathname)) {
    return null
  }

  if (code === 'AUTH_USER_INACTIVE') {
    return 'AUTH_USER_INACTIVE'
  }

  if (code === 'AUTH_INVALID') {
    return 'AUTH_INVALID_TOKEN'
  }

  if (code === 'UNAUTHORIZED') {
    return status === 403 ? 'FORBIDDEN_RESOURCE_SCOPE_REQUIRED' : 'AUTH_MISSING_TOKEN'
  }

  return null
}

function buildAuthErrorResponse(
  request: NextRequest,
  status: number,
  code: string,
  message: string
) {
  if (request.nextUrl.pathname.startsWith('/api/external/v1/')) {
    const legacyCode = getLegacyExternalAuthCode(request.nextUrl.pathname, code, status)
    return NextResponse.json(
      {
        code: legacyCode ?? code,
        ...(legacyCode ? { normalizedCode: code } : {}),
        error: message,
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
      const code = isLegacyCompatibleExternalAuthPath(request.nextUrl.pathname)
        ? 'AUTH_USER_INACTIVE'
        : 'AUTH_INVALID'
      return buildAuthErrorResponse(request, 401, code, 'User not found or inactive')
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
    const code = isLegacyCompatibleExternalAuthPath(request.nextUrl.pathname)
      ? 'AUTH_USER_INACTIVE'
      : 'AUTH_INVALID'
    return buildAuthErrorResponse(request, 401, code, 'User not found or inactive')
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
