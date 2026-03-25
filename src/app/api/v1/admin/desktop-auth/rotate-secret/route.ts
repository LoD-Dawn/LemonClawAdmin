import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { generateDesktopClientSecret, getDesktopOAuthClientConfig } from '@/lib/oauth-clients'
import { recordOperationLog } from '@/lib/operation-log'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const client = await getDesktopOAuthClientConfig()
  const plainSecret = generateDesktopClientSecret()
  const clientSecretHash = await bcrypt.hash(plainSecret, 12)

  const updatedClient = await db.oAuthClient.update({
    where: { id: client.id },
    data: { clientSecretHash }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'auth',
    action: 'auth.desktop_secret_rotate',
    targetType: 'oauth_client',
    targetId: updatedClient.id,
    targetName: updatedClient.name,
    summary: `重置桌面端登录客户端密钥 ${updatedClient.name}`,
    metadata: {
      clientId: updatedClient.clientId,
    },
  })

  return NextResponse.json({
    data: {
      clientId: updatedClient.clientId,
      clientSecret: plainSecret,
      updatedAt: updatedClient.updatedAt,
    },
  })
}
