import { NextRequest, NextResponse } from 'next/server'
import { buildAppUrl } from '@/lib/app-url'
import { db } from '@/lib/db'
import { matchesAllowedRedirectUri } from '@/lib/oauth-clients'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const scope = searchParams.get('scope') || 'skills:read mcps:read models:read'

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  const client = await db.oAuthClient.findUnique({
    where: { clientId }
  })

  if (!client || !client.isActive) {
    return NextResponse.json(
      { error: 'Invalid client', code: 'AUTH_INVALID_CLIENT' },
      { status: 401 }
    )
  }

  if (!matchesAllowedRedirectUri(client.allowedRedirectUris, redirectUri)) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  // Redirect to login page with OAuth params
  const loginUrl = buildAppUrl('/login', request)
  loginUrl.searchParams.set('client_id', clientId)
  loginUrl.searchParams.set('redirect_uri', redirectUri)
  loginUrl.searchParams.set('state', state || '')
  loginUrl.searchParams.set('scope', scope)
  loginUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(loginUrl.toString())
}
