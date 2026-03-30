import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { pickPreferredProviders } from '@/lib/model-config'
import { ExternalApiError } from '@/lib/external-v1'
import {
  DEFAULT_PRICING_VERSION,
  getEffectiveUserClawCreditBalance,
  isUserClawQuotaExpired,
} from '@/lib/user-claw-quota-policy'
const UNLIMITED_ESTIMATED_MINUTES = 999999999

type ScopedUser = {
  id: string
  organizationId: string | null
  isSuperAdmin?: boolean
  isDepartmentAdmin?: boolean
}

type ScopedProvider = {
  id: string
  providerKey: string
  name: string
  enabled: boolean
  apiKey: string | null
  baseUrl: string | null
  apiFormat: string
  codingPlanEnabled: boolean
  isDefault: boolean
  defaultModelId: string | null
  visibility: 'company' | 'department' | 'personal'
  updatedAt: Date
  organization?: {
    level: number
  } | null
  models: Array<{
    id: string
    modelId: string
    name: string
    supportsImage: boolean
    billingTier: string
    billingTierName: string
    creditPerMinute: number
    maxSessionSeconds: number
    toolPolicy: string
    isActive: boolean
    sortOrder: number
    updatedAt: Date
  }>
}

type SerializableData = Record<string, unknown>

type StoredIdempotencyResponse<T extends SerializableData> = {
  code: string
  message: string
  status: number
  data: T
}

type ModelRuntimeMeta = {
  provider: string
  providerId: string
  model: string
  displayName: string
  enabled: boolean
  billingTier: string
  billingTierName: string
  creditPerMinute: number
  maxSessionSeconds: number
  toolPolicy: string
}

type PrepareSessionInput = {
  clientSessionId: string
  provider: string
  model: string
  entry: string
  workspacePath?: string | null
  estimatedSeconds?: number | null
  idempotencyKey: string
}

type HeartbeatInput = {
  reservationId: string
  clientSessionId: string
  activeSecondsDelta: number
  totalActiveSeconds: number
  status: string
  sentAt?: string | null
  idempotencyKey: string
}

type FinishSessionInput = {
  reservationId: string
  clientSessionId: string
  totalActiveSeconds: number
  finishReason: string
  lastErrorCode?: string | null
  idempotencyKey: string
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function isUnlimitedUser(user: ScopedUser) {
  return Boolean(user.isSuperAdmin || user.isDepartmentAdmin)
}

function remainingClawSeconds(creditBalance: number) {
  return Math.max(0, creditBalance) * 60
}

function creditsForSeconds(activeSeconds: number, creditPerMinute: number) {
  if (activeSeconds <= 0) {
    return 0
  }

  return Math.ceil(activeSeconds / 60) * creditPerMinute
}

function maxAffordableSeconds(availableCredits: number, creditPerMinute: number, maxSessionSeconds: number) {
  const affordableSeconds = Math.floor(Math.max(0, availableCredits) / creditPerMinute) * 60
  return Math.min(maxSessionSeconds, affordableSeconds)
}

function normalizePositiveInteger(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return Math.max(0, Math.floor(value))
}

function sortFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortFingerprintValue(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortFingerprintValue(nestedValue)])
    )
  }

  return value
}

function createRequestFingerprint(payload: Record<string, unknown>) {
  return JSON.stringify(sortFingerprintValue(payload))
}

function parseStoredResponse<T extends SerializableData>(record: {
  responseCode: string
  responseMessage: string
  statusCode: number
  responseDataJson: string
}): StoredIdempotencyResponse<T> {
  return {
    code: record.responseCode,
    message: record.responseMessage,
    status: record.statusCode,
    data: JSON.parse(record.responseDataJson) as T,
  }
}

async function ensureUserClawQuota(userId: string, tx: Prisma.TransactionClient | typeof db = db) {
  const quota = await tx.userClawQuota.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      pricingVersion: DEFAULT_PRICING_VERSION,
    },
  })

  if (isUserClawQuotaExpired(quota) && quota.creditBalance > 0) {
    return tx.userClawQuota.update({
      where: { userId },
      data: {
        creditBalance: 0,
      },
    })
  }

  return quota
}

function buildUnlimitedQuotaSnapshot(userId: string, quota?: Awaited<ReturnType<typeof ensureUserClawQuota>> | null) {
  return {
    userId,
    isUnlimited: true,
    creditBalance: quota?.creditBalance ?? 0,
    remainingClawSeconds: null,
    pricingVersion: quota?.pricingVersion ?? DEFAULT_PRICING_VERSION,
    expiresAt: null,
    updatedAt: (quota?.updatedAt ?? new Date()).toISOString(),
  }
}

function toQuotaSnapshot(quota: Awaited<ReturnType<typeof ensureUserClawQuota>>) {
  const creditBalance = getEffectiveUserClawCreditBalance(quota)

  return {
    userId: quota.userId,
    isUnlimited: false,
    creditBalance,
    remainingClawSeconds: remainingClawSeconds(creditBalance),
    pricingVersion: quota.pricingVersion,
    expiresAt: serializeDate(quota.expiresAt),
    updatedAt: quota.updatedAt.toISOString(),
  }
}

async function listScopedProviders(user: ScopedUser) {
  const scopedOrganizationIds = await getOrganizationScopeIds(user.organizationId)

  return db.modelProvider.findMany({
    where: {
      isActive: true,
      OR: [
        { visibility: 'company' },
        {
          visibility: 'department',
          organizationId: { in: scopedOrganizationIds.length > 0 ? scopedOrganizationIds : ['__forbidden__'] },
        },
        {
          visibility: 'personal',
          ownerId: user.id,
        },
      ],
    },
    select: {
      id: true,
      providerKey: true,
      name: true,
      enabled: true,
      apiKey: true,
      baseUrl: true,
      apiFormat: true,
      codingPlanEnabled: true,
      isDefault: true,
      defaultModelId: true,
      visibility: true,
      updatedAt: true,
      organization: {
        select: {
          level: true,
        },
      },
      models: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          modelId: true,
          name: true,
          supportsImage: true,
          billingTier: true,
          billingTierName: true,
          creditPerMinute: true,
          maxSessionSeconds: true,
          toolPolicy: true,
          isActive: true,
          sortOrder: true,
          updatedAt: true,
        },
      },
    },
  }) as Promise<ScopedProvider[]>
}

async function resolvePreferredProviders(user: ScopedUser) {
  const providers = await listScopedProviders(user)
  return pickPreferredProviders(providers)
}

async function resolveRuntimeModel(user: ScopedUser, providerKey: string, modelId: string) {
  const providers = await resolvePreferredProviders(user)
  const provider = providers.find((entry) => entry.providerKey === providerKey)
  if (!provider) {
    throw new ExternalApiError('MODEL_NOT_FOUND', '当前模型不存在', 404, {
      provider: providerKey,
      model: modelId,
    })
  }

  const model = provider.models.find((entry) => entry.modelId === modelId)
  if (!model) {
    throw new ExternalApiError('MODEL_NOT_FOUND', '当前模型不存在', 404, {
      provider: providerKey,
      model: modelId,
    })
  }

  return {
    provider: provider.providerKey,
    providerId: provider.id,
    model: model.modelId,
    displayName: model.name,
    enabled: provider.enabled && model.isActive,
    billingTier: model.billingTier,
    billingTierName: model.billingTierName,
    creditPerMinute: model.creditPerMinute,
    maxSessionSeconds: model.maxSessionSeconds,
    toolPolicy: model.toolPolicy,
  } satisfies ModelRuntimeMeta
}

async function findIdempotencyRecord(userId: string, scope: string, idempotencyKey: string) {
  return db.externalApiIdempotency.findUnique({
    where: {
      userId_scope_idempotencyKey: {
        userId,
        scope,
        idempotencyKey,
      },
    },
  })
}

async function getExistingIdempotentResponse<T extends SerializableData>(
  userId: string,
  scope: string,
  idempotencyKey: string,
  fingerprint: string
) {
  const record = await findIdempotencyRecord(userId, scope, idempotencyKey)
  if (!record) {
    return null
  }

  if (record.requestFingerprint !== fingerprint) {
    throw new ExternalApiError('IDEMPOTENCY_CONFLICT', '幂等键已被其他请求占用', 409, {
      idempotencyKey,
    })
  }

  return parseStoredResponse<T>(record)
}

async function storeIdempotentResponse<T extends SerializableData>(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    scope: string
    idempotencyKey: string
    fingerprint: string
    response: StoredIdempotencyResponse<T>
    reservationId?: string | null
  }
) {
  await tx.externalApiIdempotency.create({
    data: {
      userId: input.userId,
      scope: input.scope,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.fingerprint,
      responseCode: input.response.code,
      responseMessage: input.response.message,
      responseDataJson: JSON.stringify(input.response.data),
      statusCode: input.response.status,
      reservationId: input.reservationId ?? null,
    },
  })
}

async function storeStandaloneIdempotentResponse<T extends SerializableData>(input: {
  userId: string
  scope: string
  idempotencyKey: string
  fingerprint: string
  response: StoredIdempotencyResponse<T>
  reservationId?: string | null
}) {
  await db.$transaction(async (tx) => {
    await storeIdempotentResponse(tx, input)
  })
}

function buildStoredResponse<T extends SerializableData>(data: T, code = 'OK', message = '', status = 200) {
  return {
    code,
    message,
    status,
    data,
  } satisfies StoredIdempotencyResponse<T>
}

function computeAcceptedHeartbeatTotal(input: {
  currentTotal: number
  requestedTotal: number
  activeSecondsDelta: number
  maxSessionSeconds: number
}) {
  const requestedTotal = Math.min(
    input.maxSessionSeconds,
    Math.max(input.currentTotal, normalizePositiveInteger(input.requestedTotal) ?? input.currentTotal)
  )
  const delta = normalizePositiveInteger(input.activeSecondsDelta) ?? 0
  const deltaBoundedTotal = Math.min(input.maxSessionSeconds, input.currentTotal + delta)

  return Math.max(input.currentTotal, Math.min(requestedTotal, deltaBoundedTotal))
}

function buildPrepareSuccessData(input: {
  reservationId: string
  clientSessionId: string
  model: ModelRuntimeMeta
  grantedSeconds: number
  quota: Awaited<ReturnType<typeof ensureUserClawQuota>>
}) {
  return {
    allowed: true,
    reservationId: input.reservationId,
    clientSessionId: input.clientSessionId,
    provider: input.model.provider,
    model: input.model.model,
    billingTier: input.model.billingTier,
    billingTierName: input.model.billingTierName,
    creditPerMinute: input.model.creditPerMinute,
    maxSessionSeconds: input.model.maxSessionSeconds,
    toolPolicy: input.model.toolPolicy,
    grantedSeconds: input.grantedSeconds,
    creditBalance: input.quota.creditBalance,
    remainingClawSeconds: remainingClawSeconds(input.quota.creditBalance),
    pricingVersion: input.quota.pricingVersion,
  }
}

function buildFinishResponse(reservation: {
  id: string
  provider: string
  model: string
  billingTier: string
  finalConsumedCredits: number
  serverAcceptedTotalActiveSeconds: number
  closed: boolean
}, quota: Awaited<ReturnType<typeof ensureUserClawQuota>>) {
  return {
    reservationId: reservation.id,
    provider: reservation.provider,
    model: reservation.model,
    billingTier: reservation.billingTier,
    finalConsumedCredits: reservation.finalConsumedCredits,
    finalActiveSeconds: reservation.serverAcceptedTotalActiveSeconds,
    creditBalance: quota.creditBalance,
    remainingClawSeconds: remainingClawSeconds(quota.creditBalance),
    closed: reservation.closed,
  }
}

function applyUsageRange(range: string) {
  const match = /^(\d{1,3})d$/.exec(range.trim())
  if (!match) {
    throw new ExternalApiError('INVALID_PARAMS', 'range 仅支持类似 7d 的格式', 400, {
      range,
    })
  }

  const days = Number.parseInt(match[1], 10)
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new ExternalApiError('INVALID_PARAMS', 'range 超出允许范围', 400, {
      range,
    })
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  return { days, since }
}

export async function getCurrentUserQuotaSnapshot(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isSuperAdmin: true,
      isDepartmentAdmin: true,
    },
  })

  if (user?.isSuperAdmin || user?.isDepartmentAdmin) {
    const quota = await db.userClawQuota.findUnique({ where: { userId } })
    return buildUnlimitedQuotaSnapshot(userId, quota)
  }

  const quota = await ensureUserClawQuota(userId)
  return toQuotaSnapshot(quota)
}

export async function getCurrentUserModelCatalog(user: ScopedUser) {
  const [quota, providers] = await Promise.all([
    isUnlimitedUser(user)
      ? db.userClawQuota.findUnique({ where: { userId: user.id } })
      : ensureUserClawQuota(user.id),
    resolvePreferredProviders(user),
  ])
  const unlimited = isUnlimitedUser(user)

  const updatedAt = providers.reduce<Date | null>((latest, provider) => {
    const providerLatest = provider.models.reduce<Date>(
      (modelLatest, model) => (model.updatedAt > modelLatest ? model.updatedAt : modelLatest),
      provider.updatedAt
    )

    if (!latest || providerLatest > latest) {
      return providerLatest
    }

    return latest
  }, quota?.updatedAt ?? null)
  const effectiveCreditBalance = unlimited ? quota?.creditBalance ?? 0 : getEffectiveUserClawCreditBalance(quota)

  return {
    providers: providers.map((provider) => ({
      provider: provider.providerKey,
      apiKey: provider.apiKey ?? '',
      models: provider.models.map((model) => ({
        model: model.modelId,
        displayName: model.name,
        enabled: provider.enabled && model.isActive,
        usageMeta: {
          billingTier: model.billingTier,
          billingTierName: model.billingTierName,
          creditPerMinute: model.creditPerMinute,
          maxSessionSeconds: model.maxSessionSeconds,
          toolPolicy: model.toolPolicy,
          estimatedRemainingMinutes: unlimited
            ? UNLIMITED_ESTIMATED_MINUTES
            : Math.floor(effectiveCreditBalance / model.creditPerMinute),
          isUnlimited: unlimited,
        },
      })),
    })),
    updatedAt: (updatedAt ?? quota?.updatedAt ?? new Date()).toISOString(),
  }
}

export async function prepareClawSession(user: ScopedUser, input: PrepareSessionInput) {
  const fingerprint = createRequestFingerprint(input)
  const existing = await getExistingIdempotentResponse<ReturnType<typeof buildPrepareSuccessData>>(
    user.id,
    'claw.prepare',
    input.idempotencyKey,
    fingerprint
  )

  if (existing) {
    return existing
  }

  const model = await resolveRuntimeModel(user, input.provider, input.model)
  const unlimited = isUnlimitedUser(user)
  const quota = unlimited
    ? await db.userClawQuota.findUnique({ where: { userId: user.id } })
    : await ensureUserClawQuota(user.id)

  if (!model.enabled) {
    const disabledResponse = buildStoredResponse(
      {
        allowed: false,
        provider: input.provider,
        model: input.model,
      },
      'MODEL_DISABLED',
      '当前模型暂不可用',
      409
    )

    await storeStandaloneIdempotentResponse({
      userId: user.id,
      scope: 'claw.prepare',
      idempotencyKey: input.idempotencyKey,
      fingerprint,
      response: disabledResponse,
    })

    return disabledResponse
  }

  if (!unlimited && (quota?.creditBalance ?? 0) < model.creditPerMinute) {
    const insufficientResponse = buildStoredResponse(
      {
        allowed: false,
        provider: input.provider,
        model: input.model,
        creditBalance: quota?.creditBalance ?? 0,
        remainingClawSeconds: remainingClawSeconds(quota?.creditBalance ?? 0),
      },
      'QUOTA_NOT_ENOUGH',
      '当前配额不足，无法启动 Claw',
      409
    )

    await storeStandaloneIdempotentResponse({
      userId: user.id,
      scope: 'claw.prepare',
      idempotencyKey: input.idempotencyKey,
      fingerprint,
      response: insufficientResponse,
    })

    return insufficientResponse
  }

  const grantedSeconds = unlimited
    ? model.maxSessionSeconds
    : maxAffordableSeconds(
        quota?.creditBalance ?? 0,
        model.creditPerMinute,
        model.maxSessionSeconds
      )

  const reservationId = `rsv_${randomUUID().replace(/-/g, '')}`

  const response = await db.$transaction(async (tx) => {
    const latestQuota = unlimited
      ? await tx.userClawQuota.findUnique({ where: { userId: user.id } })
      : await ensureUserClawQuota(user.id, tx)

    if (!unlimited && (latestQuota?.creditBalance ?? 0) < model.creditPerMinute) {
      const insufficientResponse = buildStoredResponse(
        {
          allowed: false,
          provider: input.provider,
          model: input.model,
          creditBalance: latestQuota?.creditBalance ?? 0,
          remainingClawSeconds: remainingClawSeconds(latestQuota?.creditBalance ?? 0),
        },
        'QUOTA_NOT_ENOUGH',
        '当前配额不足，无法启动 Claw',
        409
      )

      await storeIdempotentResponse(tx, {
        userId: user.id,
        scope: 'claw.prepare',
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        response: insufficientResponse,
      })

      return insufficientResponse
    }

    await tx.clawSessionReservation.create({
      data: {
        id: reservationId,
        userId: user.id,
        clientSessionId: input.clientSessionId,
        provider: model.provider,
        model: model.model,
        entry: input.entry,
        workspacePath: input.workspacePath ?? null,
        estimatedSeconds: normalizePositiveInteger(input.estimatedSeconds) ?? null,
        billingTier: model.billingTier,
        billingTierName: model.billingTierName,
        creditPerMinute: model.creditPerMinute,
        maxSessionSeconds: model.maxSessionSeconds,
        toolPolicy: model.toolPolicy,
        grantedSeconds,
        status: 'prepared',
      },
    })

    const successData = unlimited
      ? {
          allowed: true,
          reservationId,
          clientSessionId: input.clientSessionId,
          provider: model.provider,
          model: model.model,
          billingTier: model.billingTier,
          billingTierName: model.billingTierName,
          creditPerMinute: model.creditPerMinute,
          maxSessionSeconds: model.maxSessionSeconds,
          toolPolicy: model.toolPolicy,
          grantedSeconds,
          creditBalance: null,
          remainingClawSeconds: null,
          pricingVersion: latestQuota?.pricingVersion ?? DEFAULT_PRICING_VERSION,
          isUnlimited: true,
        }
      : buildPrepareSuccessData({
          reservationId,
          clientSessionId: input.clientSessionId,
          model,
          grantedSeconds,
          quota: latestQuota as Awaited<ReturnType<typeof ensureUserClawQuota>>,
        })
    const storedResponse = buildStoredResponse(successData)

    await storeIdempotentResponse(tx, {
      userId: user.id,
      scope: 'claw.prepare',
      idempotencyKey: input.idempotencyKey,
      fingerprint,
      response: storedResponse,
      reservationId,
    })

    return storedResponse
  })

  return response
}

export async function heartbeatClawSession(userId: string, input: HeartbeatInput) {
  const fingerprint = createRequestFingerprint(input)
  const existing = await getExistingIdempotentResponse<{
    allowed: boolean
    reservationId: string
    serverAcceptedTotalActiveSeconds?: number
    creditBalance: number
    remainingClawSeconds: number
    shouldStop: boolean
  }>(
    userId,
    'claw.heartbeat',
    input.idempotencyKey,
    fingerprint
  )

  if (existing) {
    return existing
  }

  const response = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        isDepartmentAdmin: true,
      },
    })
    const unlimited = Boolean(user?.isSuperAdmin || user?.isDepartmentAdmin)
    const reservation = await tx.clawSessionReservation.findFirst({
      where: {
        id: input.reservationId,
        userId,
        clientSessionId: input.clientSessionId,
      },
    })

    if (!reservation) {
      const notFoundResponse = buildStoredResponse(
        {
          reservationId: input.reservationId,
        },
        'RESERVATION_NOT_FOUND',
        '会话预占记录不存在',
        404
      )

      await storeIdempotentResponse(tx, {
        userId,
        scope: 'claw.heartbeat',
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        response: notFoundResponse,
      })

      return notFoundResponse
    }

    if (reservation.closed) {
      const closedResponse = buildStoredResponse(
        {
          reservationId: reservation.id,
        },
        'RESERVATION_CLOSED',
        '当前会话已关闭',
        409
      )

      await storeIdempotentResponse(tx, {
        userId,
        scope: 'claw.heartbeat',
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        response: closedResponse,
        reservationId: reservation.id,
      })

      return closedResponse
    }

    const quota = unlimited
      ? await tx.userClawQuota.findUnique({ where: { userId } })
      : await ensureUserClawQuota(userId, tx)
    const candidateTotal = computeAcceptedHeartbeatTotal({
      currentTotal: reservation.serverAcceptedTotalActiveSeconds,
      requestedTotal: input.totalActiveSeconds,
      activeSecondsDelta: input.activeSecondsDelta,
      maxSessionSeconds: reservation.maxSessionSeconds,
    })
    const affordableTotal = unlimited
      ? reservation.maxSessionSeconds
      : maxAffordableSeconds(
          reservation.chargedCredits + (quota?.creditBalance ?? 0),
          reservation.creditPerMinute,
          reservation.maxSessionSeconds
        )
    const nextAcceptedTotal = Math.min(candidateTotal, affordableTotal)
    const nextChargedCredits = unlimited ? 0 : creditsForSeconds(nextAcceptedTotal, reservation.creditPerMinute)
    const additionalCredits = unlimited ? 0 : Math.max(0, nextChargedCredits - reservation.chargedCredits)
    const nextQuotaBalance = unlimited
      ? quota?.creditBalance ?? 0
      : (quota?.creditBalance ?? 0) - additionalCredits
    const stopByQuota = unlimited
      ? false
      : nextAcceptedTotal < candidateTotal || affordableTotal <= reservation.serverAcceptedTotalActiveSeconds
    const stopBySessionLimit = nextAcceptedTotal >= reservation.maxSessionSeconds

    if (!unlimited) {
      await tx.userClawQuota.update({
        where: { userId },
        data: {
          creditBalance: nextQuotaBalance,
        },
      })
    }

    await tx.clawSessionReservation.update({
      where: { id: reservation.id },
      data: {
        serverAcceptedTotalActiveSeconds: nextAcceptedTotal,
        chargedCredits: nextChargedCredits,
        finalConsumedCredits: nextChargedCredits,
        status: input.status,
        lastClientStatus: input.status,
        lastHeartbeatAt: input.sentAt ? new Date(input.sentAt) : new Date(),
      },
    })

    const shouldStop = stopByQuota || stopBySessionLimit
    const baseData = unlimited
      ? {
          allowed: true,
          reservationId: reservation.id,
          serverAcceptedTotalActiveSeconds: nextAcceptedTotal,
          creditBalance: null,
          remainingClawSeconds: null,
          shouldStop,
          isUnlimited: true,
        }
      : null
    const data = stopByQuota
      ? {
          allowed: false,
          reservationId: reservation.id,
          creditBalance: nextQuotaBalance,
          remainingClawSeconds: remainingClawSeconds(nextQuotaBalance),
          shouldStop: true,
        }
      : (baseData ?? {
          allowed: true,
          reservationId: reservation.id,
          serverAcceptedTotalActiveSeconds: nextAcceptedTotal,
          creditBalance: nextQuotaBalance,
          remainingClawSeconds: remainingClawSeconds(nextQuotaBalance),
          shouldStop,
        })

    const storedResponse = buildStoredResponse(
      data,
      stopByQuota ? 'QUOTA_EXHAUSTED' : 'OK',
      stopByQuota ? '配额已用尽，请结束当前会话' : '',
      stopByQuota ? 409 : 200
    )

    await storeIdempotentResponse(tx, {
      userId,
      scope: 'claw.heartbeat',
      idempotencyKey: input.idempotencyKey,
      fingerprint,
      response: storedResponse,
      reservationId: reservation.id,
    })

    return storedResponse
  })

  return response
}

export async function finishClawSession(userId: string, input: FinishSessionInput) {
  const fingerprint = createRequestFingerprint(input)
  const existing = await getExistingIdempotentResponse<ReturnType<typeof buildFinishResponse>>(
    userId,
    'claw.finish',
    input.idempotencyKey,
    fingerprint
  )

  if (existing) {
    return existing
  }

  const response = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true,
        isDepartmentAdmin: true,
      },
    })
    const unlimited = Boolean(user?.isSuperAdmin || user?.isDepartmentAdmin)
    const reservation = await tx.clawSessionReservation.findFirst({
      where: {
        id: input.reservationId,
        userId,
        clientSessionId: input.clientSessionId,
      },
    })

    if (!reservation) {
      const notFoundResponse = buildStoredResponse(
        {
          reservationId: input.reservationId,
        },
        'RESERVATION_NOT_FOUND',
        '会话预占记录不存在',
        404
      )

      await storeIdempotentResponse(tx, {
        userId,
        scope: 'claw.finish',
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        response: notFoundResponse,
      })

      return notFoundResponse
    }

    const quota = unlimited
      ? await tx.userClawQuota.findUnique({ where: { userId } })
      : await ensureUserClawQuota(userId, tx)

    if (reservation.closed) {
      const closedData = unlimited
        ? {
            reservationId: reservation.id,
            provider: reservation.provider,
            model: reservation.model,
            billingTier: reservation.billingTier,
            finalConsumedCredits: 0,
            finalActiveSeconds: reservation.serverAcceptedTotalActiveSeconds,
            creditBalance: null,
            remainingClawSeconds: null,
            closed: reservation.closed,
            isUnlimited: true,
          }
        : buildFinishResponse(reservation, quota as Awaited<ReturnType<typeof ensureUserClawQuota>>)
      const closedResponse = buildStoredResponse(closedData)
      await storeIdempotentResponse(tx, {
        userId,
        scope: 'claw.finish',
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        response: closedResponse,
        reservationId: reservation.id,
      })

      return closedResponse
    }

    const requestedTotal = normalizePositiveInteger(input.totalActiveSeconds) ?? reservation.serverAcceptedTotalActiveSeconds
    const affordableTotal = unlimited
      ? reservation.maxSessionSeconds
      : maxAffordableSeconds(
          reservation.chargedCredits + (quota?.creditBalance ?? 0),
          reservation.creditPerMinute,
          reservation.maxSessionSeconds
        )
    const finalAcceptedSeconds = Math.min(
      reservation.maxSessionSeconds,
      Math.max(reservation.serverAcceptedTotalActiveSeconds, Math.min(requestedTotal, affordableTotal))
    )
    const finalConsumedCredits = unlimited ? 0 : creditsForSeconds(finalAcceptedSeconds, reservation.creditPerMinute)
    const additionalCredits = unlimited ? 0 : Math.max(0, finalConsumedCredits - reservation.chargedCredits)
    const nextQuotaBalance = unlimited
      ? quota?.creditBalance ?? 0
      : (quota?.creditBalance ?? 0) - additionalCredits

    const nextReservation = await tx.clawSessionReservation.update({
      where: { id: reservation.id },
      data: {
        serverAcceptedTotalActiveSeconds: finalAcceptedSeconds,
        chargedCredits: finalConsumedCredits,
        finalConsumedCredits,
        status: 'closed',
        closed: true,
        finishReason: input.finishReason,
        lastErrorCode: input.lastErrorCode ?? null,
        lastClientStatus: 'finished',
        closedAt: new Date(),
      },
    })

    const nextQuota = unlimited
      ? quota
      : await tx.userClawQuota.update({
          where: { userId },
          data: {
            creditBalance: nextQuotaBalance,
          },
        })

    const data = unlimited
      ? {
          reservationId: nextReservation.id,
          provider: nextReservation.provider,
          model: nextReservation.model,
          billingTier: nextReservation.billingTier,
          finalConsumedCredits: 0,
          finalActiveSeconds: nextReservation.serverAcceptedTotalActiveSeconds,
          creditBalance: null,
          remainingClawSeconds: null,
          closed: true,
          isUnlimited: true,
        }
      : buildFinishResponse(nextReservation, nextQuota as Awaited<ReturnType<typeof ensureUserClawQuota>>)
    const storedResponse = buildStoredResponse(data)

    await storeIdempotentResponse(tx, {
      userId,
      scope: 'claw.finish',
      idempotencyKey: input.idempotencyKey,
      fingerprint,
      response: storedResponse,
      reservationId: reservation.id,
    })

    return storedResponse
  })

  return response
}

export async function getClawSessionState(userId: string, reservationId: string) {
  const reservation = await db.clawSessionReservation.findFirst({
    where: {
      id: reservationId,
      userId,
    },
  })

  if (!reservation) {
    throw new ExternalApiError('RESERVATION_NOT_FOUND', '会话预占记录不存在', 404, {
      reservationId,
    })
  }

  return {
    reservationId: reservation.id,
    status: reservation.status,
    clientSessionId: reservation.clientSessionId,
    provider: reservation.provider,
    model: reservation.model,
    serverAcceptedTotalActiveSeconds: reservation.serverAcceptedTotalActiveSeconds,
    closed: reservation.closed,
  }
}

export async function getClawUsageSummary(userId: string, range: string) {
  const { since } = applyUsageRange(range)
  const sessions = await db.clawSessionReservation.findMany({
    where: {
      userId,
      closed: true,
      closedAt: { gte: since },
    },
    select: {
      finalConsumedCredits: true,
      serverAcceptedTotalActiveSeconds: true,
    },
  })

  return {
    range,
    consumedCredits: sessions.reduce((sum, session) => sum + session.finalConsumedCredits, 0),
    usedClawSeconds: sessions.reduce((sum, session) => sum + session.serverAcceptedTotalActiveSeconds, 0),
    sessions: sessions.length,
  }
}
