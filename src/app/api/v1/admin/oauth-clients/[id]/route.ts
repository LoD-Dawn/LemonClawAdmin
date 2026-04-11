import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { recordOperationLog } from '@/lib/operation-log'
import {
  DEFAULT_DESKTOP_CLIENT_ID,
  isValidOAuthRedirectUri,
  parseAllowedRedirectUris,
  serializeAllowedRedirectUris,
} from '@/lib/oauth-clients'

const updateOAuthClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean(),
  allowedRedirectUris: z.array(z.string().trim().min(1)).min(1).max(20),
})

function serializeClient(client: {
  id: string
  clientId: string
  name: string
  isActive: boolean
  allowedRedirectUris: string | string[] | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    isActive: client.isActive,
    allowedRedirectUris: parseAllowedRedirectUris(client.allowedRedirectUris),
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await context.params
  const existingClient = await db.oAuthClient.findUnique({
    where: { id },
  })

  if (!existingClient || existingClient.clientId === DEFAULT_DESKTOP_CLIENT_ID) {
    return NextResponse.json(
      { error: 'OAuth client not found', code: 'AUTH_CLIENT_NOT_FOUND' },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = updateOAuthClientSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const invalidRedirectUri = parsed.data.allowedRedirectUris.find((uri) => !isValidOAuthRedirectUri(uri))
  if (invalidRedirectUri) {
    return NextResponse.json(
      { error: `Invalid redirect URI: ${invalidRedirectUri}`, code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const updatedClient = await db.oAuthClient.update({
    where: { id },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
      allowedRedirectUris: serializeAllowedRedirectUris(parsed.data.allowedRedirectUris),
    },
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'auth',
    action: 'auth.oauth_client_update',
    targetType: 'oauth_client',
    targetId: updatedClient.id,
    targetName: updatedClient.name,
    summary: `更新第三方 OAuth 客户端 ${updatedClient.name}`,
    metadata: {
      clientId: updatedClient.clientId,
      isActive: updatedClient.isActive,
      allowedRedirectUris: parsed.data.allowedRedirectUris,
    },
  })

  return NextResponse.json({
    data: serializeClient(updatedClient),
  })
}
