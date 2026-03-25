import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { canManageResource, canViewResource, resolveAdminAccessScope } from '@/lib/admin-access'
import { modelProviderUpdateSchema, normalizeModelEntries, toModelProviderStorage } from '@/lib/model-config'
import { sanitizeManagementModelProvider } from '@/lib/model-provider-presenter'
import { encryptModelProviderApiKey } from '@/lib/model-provider-secrets'
import { recordOperationLog } from '@/lib/operation-log'

function resolveDefaultModelId(
  requestedDefaultModelId: string | null | undefined,
  models: Array<{ modelId: string }>
) {
  if (requestedDefaultModelId && models.some((model) => model.modelId === requestedDefaultModelId)) {
    return requestedDefaultModelId
  }

  return models[0]?.modelId ?? null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const provider = await db.modelProvider.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, organizationId: true } },
      organization: { select: { id: true, name: true } },
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!provider) {
    return NextResponse.json(
      { error: 'Model provider not found', code: 'NOT_FOUND_MODEL_PROVIDER' },
      { status: 404 }
    )
  }

  if (!canViewResource(authResult.user, provider, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  return NextResponse.json({ data: sanitizeManagementModelProvider(provider) })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const body = await request.json()
  const parsed = modelProviderUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existingProvider = await db.modelProvider.findUnique({
    where: { id },
    select: {
      id: true,
      providerKey: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      defaultModelId: true,
      owner: { select: { organizationId: true } },
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          modelId: true,
          name: true,
          supportsImage: true,
          billingTier: true,
          billingTierName: true,
          creditPerMinute: true,
          maxSessionSeconds: true,
          toolPolicy: true,
          sortOrder: true,
        },
      },
    },
  })

  if (!existingProvider) {
    return NextResponse.json(
      { error: 'Model provider not found', code: 'NOT_FOUND_MODEL_PROVIDER' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingProvider, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const nextVisibility = existingProvider.visibility
  const nextOrganizationId = Object.prototype.hasOwnProperty.call(parsed.data, 'organizationId')
    ? parsed.data.organizationId ?? null
    : existingProvider.organizationId

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (nextVisibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only manage department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !nextOrganizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(nextOrganizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only manage resources in their department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else if (!authResult.user.isSuperAdmin) {
    if (nextVisibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only manage personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else if (nextVisibility !== 'personal' && !nextOrganizationId) {
    return NextResponse.json(
      { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
      { status: 400 }
    )
  }

  const providerData = toModelProviderStorage(parsed.data)
  const nextModels = parsed.data.models
    ? normalizeModelEntries(parsed.data.models)
    : existingProvider.models.map((model) => ({
      modelId: model.modelId,
      name: model.name,
      supportsImage: model.supportsImage,
      billingTier: model.billingTier,
      billingTierName: model.billingTierName,
      creditPerMinute: model.creditPerMinute,
      maxSessionSeconds: model.maxSessionSeconds,
      toolPolicy: model.toolPolicy,
      sortOrder: model.sortOrder,
    }))

  const requestedDefaultModelId = Object.prototype.hasOwnProperty.call(parsed.data, 'defaultModelId')
    ? providerData.defaultModelId ?? null
    : existingProvider.defaultModelId
  const nextDefaultModelId = resolveDefaultModelId(requestedDefaultModelId, nextModels)

  try {
    const provider = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedProvider = await tx.modelProvider.update({
        where: { id },
        data: {
          ...(providerData.name !== undefined ? { name: providerData.name } : {}),
          ...(providerData.enabled !== undefined ? { enabled: providerData.enabled } : {}),
          ...(providerData.clearApiKey ? { apiKey: null } : {}),
          ...(providerData.apiKey !== undefined
            ? {
                apiKey: providerData.apiKey
                  ? encryptModelProviderApiKey(providerData.apiKey)
                  : null,
              }
            : {}),
          ...(providerData.baseUrl !== undefined ? { baseUrl: providerData.baseUrl } : {}),
          ...(providerData.apiFormat !== undefined ? { apiFormat: providerData.apiFormat } : {}),
          ...(providerData.codingPlanEnabled !== undefined ? { codingPlanEnabled: providerData.codingPlanEnabled } : {}),
          ...(providerData.isDefault !== undefined ? { isDefault: providerData.isDefault } : {}),
          defaultModelId: nextDefaultModelId,
          ...(Object.prototype.hasOwnProperty.call(parsed.data, 'organizationId')
            ? { organizationId: nextVisibility === 'personal' ? null : nextOrganizationId }
            : {}),
          ...(providerData.isActive !== undefined ? { isActive: providerData.isActive } : {}),
        },
      })

      if (parsed.data.models) {
        const nextModelIds = nextModels.map((model) => model.modelId)
        await tx.aiModel.updateMany({
          where: {
            providerId: id,
            ...(nextModelIds.length > 0 ? { modelId: { notIn: nextModelIds } } : {}),
          },
          data: { isActive: false },
        })

        for (const model of nextModels) {
          await tx.aiModel.upsert({
            where: {
              providerId_modelId: {
                providerId: id,
                modelId: model.modelId,
              },
            },
            create: {
              providerId: id,
              modelId: model.modelId,
              name: model.name,
              supportsImage: model.supportsImage,
              billingTier: model.billingTier,
              billingTierName: model.billingTierName,
              creditPerMinute: model.creditPerMinute,
              maxSessionSeconds: model.maxSessionSeconds,
              toolPolicy: model.toolPolicy,
              sortOrder: model.sortOrder,
              isActive: true,
            },
            update: {
              name: model.name,
              supportsImage: model.supportsImage,
              billingTier: model.billingTier,
              billingTierName: model.billingTierName,
              creditPerMinute: model.creditPerMinute,
              maxSessionSeconds: model.maxSessionSeconds,
              toolPolicy: model.toolPolicy,
              sortOrder: model.sortOrder,
              isActive: true,
            },
          })
        }
      }

      if (providerData.isActive === false) {
        await tx.aiModel.updateMany({
          where: { providerId: id },
          data: { isActive: false },
        })
      }

      return updatedProvider
    })

    const hydratedProvider = await db.modelProvider.findUnique({
      where: { id: provider.id },
      include: {
        owner: { select: { id: true, name: true, email: true, organizationId: true } },
        organization: { select: { id: true, name: true } },
        models: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    const responseProvider = hydratedProvider ? sanitizeManagementModelProvider(hydratedProvider) : null

    if (responseProvider) {
      await recordOperationLog({
        request,
        actor: authResult,
        module: 'models',
        action: 'model_provider.update',
        targetType: 'model_provider',
        targetId: responseProvider.id,
        targetName: responseProvider.name,
        summary: `更新模型提供商 ${responseProvider.name}`,
        metadata: {
          providerKey: responseProvider.providerKey,
          visibility: responseProvider.visibility,
          organizationId: responseProvider.organizationId,
          ownerId: responseProvider.ownerId,
          enabled: responseProvider.enabled,
          isDefault: responseProvider.isDefault,
          defaultModelId: responseProvider.defaultModelId,
          updatedFields: Object.keys(parsed.data),
          apiKeyConfigured: providerData.apiKey !== undefined ? Boolean(providerData.apiKey) : undefined,
          apiKeyCleared: providerData.clearApiKey ?? false,
          modelIds: responseProvider.models.map((model) => model.modelId),
        },
      })
    }

    return NextResponse.json({ data: responseProvider })
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const existingProvider = await db.modelProvider.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      providerKey: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      owner: { select: { organizationId: true } },
    },
  })

  if (!existingProvider) {
    return NextResponse.json(
      { error: 'Model provider not found', code: 'NOT_FOUND_MODEL_PROVIDER' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingProvider, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.modelProvider.update({
      where: { id },
      data: { isActive: false },
    })
    await tx.aiModel.updateMany({
      where: { providerId: id },
      data: { isActive: false },
    })
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'models',
    action: 'model_provider.delete',
    targetType: 'model_provider',
    targetId: existingProvider.id,
    targetName: existingProvider.name,
    summary: `停用模型提供商 ${existingProvider.name}`,
    metadata: {
      providerKey: existingProvider.providerKey,
      visibility: existingProvider.visibility,
      organizationId: existingProvider.organizationId,
      ownerId: existingProvider.ownerId,
    },
  })

  return NextResponse.json({ success: true })
}
