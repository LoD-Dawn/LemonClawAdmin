import { NextRequest, NextResponse } from 'next/server'
import { getDesktopOAuthClientConfig, matchesAllowedRedirectUri } from '@/lib/oauth-clients'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const redirectUri = searchParams.get('redirect_uri')
  const expiresIn = searchParams.get('expires_in') || '3600'
  const state = searchParams.get('state')

  if (!accessToken || !refreshToken || !redirectUri) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  const client = await getDesktopOAuthClientConfig()
  const allowedRedirectUris = client.allowedRedirectUris
  if (
    !client.isActive ||
    allowedRedirectUris.length === 0 ||
    !matchesAllowedRedirectUri(allowedRedirectUris, redirectUri)
  ) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const desktopCallbackUrl = new URL(redirectUri)
  desktopCallbackUrl.searchParams.set('access_token', accessToken)
  desktopCallbackUrl.searchParams.set('refresh_token', refreshToken)
  desktopCallbackUrl.searchParams.set('expires_in', expiresIn)
  if (state) {
    desktopCallbackUrl.searchParams.set('state', state)
  }

  return NextResponse.redirect(desktopCallbackUrl.toString())
}
