import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { recordOperationLog } from '@/lib/operation-log'
import { DEFAULT_DESKTOP_CLIENT_ID, generateOAuthClientSecret } from '@/lib/oauth-clients'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await context.params
  const client = await db.oAuthClient.findUnique({
    where: { id },
  })

  if (!client || client.clientId === DEFAULT_DESKTOP_CLIENT_ID) {
    return NextResponse.json(
      { error: 'OAuth client not found', code: 'AUTH_CLIENT_NOT_FOUND' },
      { status: 404 }
    )
  }

  const plainSecret = generateOAuthClientSecret()
  const clientSecretHash = await bcrypt.hash(plainSecret, 12)

  const updatedClient = await db.oAuthClient.update({
    where: { id },
    data: { clientSecretHash },
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'auth',
    action: 'auth.oauth_client_secret_rotate',
    targetType: 'oauth_client',
    targetId: updatedClient.id,
    targetName: updatedClient.name,
    summary: `重置第三方 OAuth 客户端密钥 ${updatedClient.name}`,
    metadata: {
      clientId: updatedClient.clientId,
    },
  })

  return NextResponse.json({
    data: {
      id: updatedClient.id,
      clientId: updatedClient.clientId,
      clientSecret: plainSecret,
      updatedAt: updatedClient.updatedAt,
    },
  })
}
