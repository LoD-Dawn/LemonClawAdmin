import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateAuthCode, AUTH_CODE_EXPIRY } from '@/lib/oauth'
import { matchesAllowedRedirectUri } from '@/lib/oauth-clients'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { client_id, redirect_uri, scope } = body

  const client = await db.oAuthClient.findUnique({
    where: { clientId: client_id }
  })

  if (!client || !client.isActive) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 })
  }

  if (!matchesAllowedRedirectUri(client.allowedRedirectUris, redirect_uri)) {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }

  const code = generateAuthCode()

  await db.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId: client.id,
      userId: session.user.id,
      redirectUri: redirect_uri,
      scope,
      expiresAt: new Date(Date.now() + AUTH_CODE_EXPIRY * 1000)
    }
  })

  return NextResponse.json({ code })
}
