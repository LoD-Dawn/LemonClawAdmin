import { Prisma } from '@prisma/client'
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

const clientIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/

const updateOAuthClientSchema = z.object({
  clientId: z.string().trim().regex(clientIdPattern, '客户端 ID 仅支持字母、数字、点、下划线和中划线，长度 3-64。'),
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean(),
  allowedRedirectUris: z.array(z.string().trim().min(1)).min(1).max(20),
  defaultOrganizationId: z.string().uuid().nullable().optional(),
})

function serializeClient(client: {
  id: string
  clientId: string
  name: string
  isActive: boolean
  allowedRedirectUris: string | string[] | null
  defaultOrganizationId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    isActive: client.isActive,
    allowedRedirectUris: parseAllowedRedirectUris(client.allowedRedirectUris),
    defaultOrganizationId: client.defaultOrganizationId,
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

  if (parsed.data.clientId === DEFAULT_DESKTOP_CLIENT_ID) {
    return NextResponse.json(
      { error: '该客户端 ID 保留给桌面端登录。', code: 'AUTH_RESERVED_CLIENT_ID' },
      { status: 400 }
    )
  }

  if (
    parsed.data.clientId !== existingClient.clientId
    && (existingClient.isActive || parsed.data.isActive)
  ) {
    return NextResponse.json(
      { error: '启用状态下不允许修改客户端 ID，请先停用后再修改。', code: 'AUTH_CLIENT_ID_EDIT_REQUIRES_INACTIVE' },
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

  if (parsed.data.defaultOrganizationId) {
    const organization = await db.organization.findUnique({
      where: { id: parsed.data.defaultOrganizationId },
      select: { id: true },
    })

    if (!organization) {
      return NextResponse.json(
        { error: '默认组织不存在。', code: 'NOT_FOUND_ORGANIZATION' },
        { status: 400 }
      )
    }
  }

  try {
    const updatedClient = await db.oAuthClient.update({
      where: { id },
      data: {
        clientId: parsed.data.clientId,
        name: parsed.data.name,
        isActive: parsed.data.isActive,
        allowedRedirectUris: serializeAllowedRedirectUris(parsed.data.allowedRedirectUris),
        defaultOrganizationId: parsed.data.defaultOrganizationId ?? null,
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
        previousClientId: existingClient.clientId,
        clientId: updatedClient.clientId,
        isActive: updatedClient.isActive,
        allowedRedirectUris: parsed.data.allowedRedirectUris,
        defaultOrganizationId: updatedClient.defaultOrganizationId,
      },
    })

    return NextResponse.json({
      data: serializeClient(updatedClient),
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: '客户端 ID 已存在。', code: 'AUTH_CLIENT_ID_ALREADY_EXISTS' },
        { status: 409 }
      )
    }

    throw error
  }
}
