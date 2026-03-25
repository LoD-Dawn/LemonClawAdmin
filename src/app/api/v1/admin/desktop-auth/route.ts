import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import {
  getDesktopOAuthClientConfig,
  serializeAllowedRedirectUris,
} from '@/lib/oauth-clients'
import { recordOperationLog } from '@/lib/operation-log'

const updateDesktopAuthSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean(),
  allowedRedirectUris: z.array(z.string().trim().min(1)).min(1).max(20),
})

function isValidRedirectUri(uri: string) {
  try {
    const parsed = new URL(uri)
    return Boolean(parsed.protocol)
  } catch {
    return false
  }
}

function serializeDesktopAuthClient(client: Awaited<ReturnType<typeof getDesktopOAuthClientConfig>>) {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    isActive: client.isActive,
    allowedRedirectUris: client.allowedRedirectUris,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const client = await getDesktopOAuthClientConfig()
  return NextResponse.json({ data: serializeDesktopAuthClient(client) })
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = updateDesktopAuthSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const invalidRedirectUri = parsed.data.allowedRedirectUris.find((uri) => !isValidRedirectUri(uri))
  if (invalidRedirectUri) {
    return NextResponse.json(
      { error: `Invalid redirect URI: ${invalidRedirectUri}`, code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const client = await getDesktopOAuthClientConfig()
  const updatedClient = await db.oAuthClient.update({
    where: { id: client.id },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      allowedRedirectUris: serializeAllowedRedirectUris(parsed.data.allowedRedirectUris),
    }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'auth',
    action: 'auth.desktop_config_update',
    targetType: 'oauth_client',
    targetId: updatedClient.id,
    targetName: updatedClient.name,
    summary: `更新桌面端登录配置 ${updatedClient.name}`,
    metadata: {
      clientId: updatedClient.clientId,
      isActive: updatedClient.isActive,
      allowedRedirectUris: parsed.data.allowedRedirectUris,
    },
  })

  return NextResponse.json({
    data: serializeDesktopAuthClient({
      ...updatedClient,
      allowedRedirectUris: parsed.data.allowedRedirectUris,
    }),
  })
}
