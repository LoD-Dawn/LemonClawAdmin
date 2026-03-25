import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, Visibility } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { modelProviderSchema, toModelProviderStorage } from '@/lib/model-config'
import { sanitizeManagementModelProviders, sanitizeManagementModelProvider } from '@/lib/model-provider-presenter'
import { encryptModelProviderApiKey } from '@/lib/model-provider-secrets'
import { recordOperationLog } from '@/lib/operation-log'

export async function GET(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const visibility = searchParams.get('visibility')
  const search = searchParams.get('search') || ''
  const visibilityFilter: Visibility | null =
    visibility === 'company' || visibility === 'department' || visibility === 'personal'
      ? visibility
      : null

  const where: Prisma.ModelProviderWhereInput = {
    isActive: true,
    AND: [
      getViewableResourceFilter(authResult.user, {
        scopedOrganizationIds: accessScope.scopedOrganizationIds,
      }) as Prisma.ModelProviderWhereInput,
      ...(visibilityFilter ? [{ visibility: visibilityFilter }] : []),
      ...(search
        ? [{
            OR: [
              { name: { contains: search } },
              { providerKey: { contains: search } },
              {
                models: {
                  some: {
                    isActive: true,
                    OR: [
                      { modelId: { contains: search } },
                      { name: { contains: search } },
                    ],
                  },
                },
              },
            ],
          }]
        : []),
    ],
  }

  const [providers, total] = await Promise.all([
    db.modelProvider.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, organizationId: true } },
        organization: { select: { id: true, name: true } },
        models: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    }),
    db.modelProvider.count({ where }),
  ])

  const data = sanitizeManagementModelProviders(providers.map((provider) => ({
    ...provider,
    canManage: canManageResource(authResult.user, provider, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  })))

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const body = await request.json()
  const parsed = modelProviderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, organizationId } = parsed.data

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (visibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only create department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !organizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(organizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only create resources in their managed department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = null
  } else if (!authResult.user.isSuperAdmin) {
    if (visibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only create personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = authResult.user.id
    parsed.data.organizationId = null
  } else {
    if (visibility === 'personal') {
      return NextResponse.json(
        { error: 'Personal resources are not created from the management API', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
        { status: 400 }
      )
    }
  }

  const providerData = toModelProviderStorage(parsed.data)

  try {
    const provider = await db.modelProvider.create({
      data: {
        providerKey: providerData.providerKey!,
        name: providerData.name!,
        enabled: providerData.enabled ?? true,
        apiKey: providerData.apiKey ? encryptModelProviderApiKey(providerData.apiKey) : null,
        baseUrl: providerData.baseUrl ?? null,
        apiFormat: providerData.apiFormat ?? 'openai',
        codingPlanEnabled: providerData.codingPlanEnabled ?? false,
        isDefault: providerData.isDefault ?? false,
        defaultModelId: providerData.defaultModelId ?? providerData.models?.[0]?.modelId ?? null,
        visibility: providerData.visibility!,
        ownerId: providerData.ownerId ?? null,
        organizationId: providerData.organizationId ?? null,
        models: {
          create: (providerData.models ?? []).map((model) => ({
            modelId: model.modelId,
            name: model.name,
            supportsImage: model.supportsImage,
            sortOrder: model.sortOrder,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, organizationId: true } },
        organization: { select: { id: true, name: true } },
        models: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'models',
      action: 'model_provider.create',
      targetType: 'model_provider',
      targetId: provider.id,
      targetName: provider.name,
      summary: `创建模型提供商 ${provider.name}`,
      metadata: {
        providerKey: provider.providerKey,
        visibility: provider.visibility,
        organizationId: provider.organizationId,
        ownerId: provider.ownerId,
        enabled: provider.enabled,
        isDefault: provider.isDefault,
        defaultModelId: provider.defaultModelId,
        apiKeyConfigured: Boolean(providerData.apiKey),
        modelIds: provider.models.map((model) => model.modelId),
      },
    })

    return NextResponse.json({ data: sanitizeManagementModelProvider(provider) }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Provider key already exists in this scope', code: 'CONFLICT_PROVIDER_KEY_EXISTS' },
        { status: 409 }
      )
    }

    throw error
  }
}
