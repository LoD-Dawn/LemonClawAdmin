import type { NextRequest } from 'next/server'
import type { OperationActorType, Prisma } from '@prisma/client'
import { db } from '@/lib/db'

type ActorUserLike = {
  id?: string | null
  name?: string | null
  email?: string | null
}

type ApiKeyClientLike = {
  id?: string | null
  clientId?: string | null
  name?: string | null
}

type AuthActorLike = {
  user: ActorUserLike
  isApiKey?: boolean
  client?: ApiKeyClientLike | null
}

type OperationActorInput = ActorUserLike | AuthActorLike | null | undefined

type OperationLogClient = Prisma.TransactionClient | typeof db

type OperationLogPayload = {
  request?: NextRequest
  actor?: OperationActorInput
  module: string
  action: string
  targetType: string
  targetId?: string | null
  targetName?: string | null
  targetUserId?: string | null
  summary?: string | null
  metadata?: unknown
  client?: OperationLogClient
}

export const OPERATION_LOG_MODULES = [
  { value: 'all', label: '全部模块' },
  { value: 'auth', label: '登录认证' },
  { value: 'desktop', label: '桌面版本' },
  { value: 'users', label: '用户管理' },
  { value: 'organizations', label: '组织架构' },
  { value: 'skills', label: 'Skills' },
  { value: 'mcps', label: 'MCPs' },
  { value: 'models', label: '模型管理' },
  { value: 'skill_tags', label: '标签管理' },
  { value: 'applications', label: '申请审批' },
  { value: 'grants', label: '授权管理' },
] as const

export const OPERATION_LOG_TARGET_LABELS: Record<string, string> = {
  user: '账号',
  organization: '组织',
  skill: 'Skill',
  mcp: 'MCP',
  model_provider: '模型提供商',
  skill_tag: '标签',
  resource_application: '申请记录',
  resource_grant: '授权记录',
  auth_session: '登录会话',
  oauth_client: 'OAuth 客户端',
  desktop_version_release: '桌面版本配置',
}

function isAuthActorLike(actor: OperationActorInput): actor is AuthActorLike {
  return Boolean(actor && typeof actor === 'object' && 'user' in actor)
}

function normalizeActor(actor: OperationActorInput): {
  actorType: OperationActorType
  actorUserId: string | null
  actorName: string | null
  actorEmail: string | null
  actorClientId: string | null
} {
  if (!actor) {
    return {
      actorType: 'system',
      actorUserId: null,
      actorName: 'System',
      actorEmail: null,
      actorClientId: null,
    }
  }

  if (isAuthActorLike(actor)) {
    if (actor.isApiKey) {
      return {
        actorType: 'api_key',
        actorUserId: null,
        actorName: actor.client?.name ?? 'API Key',
        actorEmail: null,
        actorClientId: actor.client?.clientId ?? actor.client?.id ?? null,
      }
    }

    return {
      actorType: 'user',
      actorUserId: actor.user.id ?? null,
      actorName: actor.user.name ?? null,
      actorEmail: actor.user.email ?? null,
      actorClientId: null,
    }
  }

  return {
    actorType: 'user',
    actorUserId: actor.id ?? null,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    actorClientId: null,
  }
}

function serializeMetadata(metadata: unknown) {
  if (metadata === undefined) {
    return null
  }

  try {
    return JSON.stringify(
      metadata,
      (_key, value) => {
        if (value instanceof Date) {
          return value.toISOString()
        }

        return value
      }
    )
  } catch {
    return JSON.stringify({ error: 'UNSERIALIZABLE_METADATA' })
  }
}

function getRequestMetadata(request?: NextRequest) {
  if (!request) {
    return {
      method: null,
      path: null,
      ipAddress: null,
      userAgent: null,
    }
  }

  return {
    method: request.method ?? null,
    path: request.nextUrl?.pathname ?? new URL(request.url).pathname,
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}

export async function recordOperationLog({
  request,
  actor,
  module,
  action,
  targetType,
  targetId,
  targetName,
  targetUserId,
  summary,
  metadata,
  client,
}: OperationLogPayload) {
  const logClient = client ?? db
  const actorData = normalizeActor(actor)
  const requestData = getRequestMetadata(request)

  try {
    await logClient.operationLog.create({
      data: {
        ...actorData,
        module,
        action,
        targetType,
        targetId: targetId ?? null,
        targetName: targetName ?? null,
        targetUserId: targetUserId ?? null,
        summary: summary ?? null,
        method: requestData.method,
        path: requestData.path,
        ipAddress: requestData.ipAddress,
        userAgent: requestData.userAgent,
        metadataJson: serializeMetadata(metadata),
      },
    })
  } catch (error) {
    console.error('Failed to record operation log', error)
  }
}

export function parseOperationLogMetadata(metadataJson: string | null) {
  if (!metadataJson) {
    return null
  }

  try {
    return JSON.parse(metadataJson) as unknown
  } catch {
    return null
  }
}
