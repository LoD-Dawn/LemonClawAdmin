import { db } from '@/lib/db'

const DEFAULT_PRICING_VERSION = '2026-03-v2'

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  organizationId: true,
  isSuperAdmin: true,
  isDepartmentAdmin: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  clawQuota: {
    select: {
      creditBalance: true,
      pricingVersion: true,
      expiresAt: true,
      updatedAt: true,
    },
  },
} as const

type AdminUserBase = Awaited<ReturnType<typeof fetchAdminUserBaseById>>

type AdminUserUsageSummary = {
  consumedCredits: number
  usedClawSeconds: number
  sessions: number
}

function toUsageSummary(
  item:
    | {
        _sum: {
          finalConsumedCredits: number | null
          serverAcceptedTotalActiveSeconds: number | null
        }
        _count: {
          id: number
        }
      }
    | undefined
): AdminUserUsageSummary {
  return {
    consumedCredits: item?._sum.finalConsumedCredits ?? 0,
    usedClawSeconds: item?._sum.serverAcceptedTotalActiveSeconds ?? 0,
    sessions: item?._count.id ?? 0,
  }
}

function toQuotaSnapshot(
  user: {
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
  },
  quota: {
    creditBalance: number
    pricingVersion: string
    expiresAt: Date | null
    updatedAt: Date
  } | null
) {
  if (user.isSuperAdmin || user.isDepartmentAdmin) {
    return {
      isUnlimited: true,
      creditBalance: quota?.creditBalance ?? 0,
      remainingClawSeconds: null,
      pricingVersion: quota?.pricingVersion ?? DEFAULT_PRICING_VERSION,
      expiresAt: null,
      updatedAt: quota?.updatedAt.toISOString() ?? new Date(0).toISOString(),
    }
  }

  if (!quota) {
    return {
      isUnlimited: false,
      creditBalance: 0,
      remainingClawSeconds: 0,
      pricingVersion: DEFAULT_PRICING_VERSION,
      expiresAt: null,
      updatedAt: new Date(0).toISOString(),
    }
  }

  return {
    isUnlimited: false,
    creditBalance: quota.creditBalance,
    remainingClawSeconds: quota.creditBalance * 60,
    pricingVersion: quota.pricingVersion,
    expiresAt: quota.expiresAt?.toISOString() ?? null,
    updatedAt: quota.updatedAt.toISOString(),
  }
}

async function aggregateUsageForUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, AdminUserUsageSummary>()
  }

  const grouped = await db.clawSessionReservation.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      closed: true,
    },
    _sum: {
      finalConsumedCredits: true,
      serverAcceptedTotalActiveSeconds: true,
    },
    _count: {
      id: true,
    },
  })

  return new Map(
    grouped.map((item) => [
      item.userId,
      toUsageSummary(item),
    ])
  )
}

function enrichAdminUser<T extends NonNullable<AdminUserBase>>(
  user: T,
  usageSummary: AdminUserUsageSummary | undefined
) {
  return {
    ...user,
    clawQuota: toQuotaSnapshot(user, user.clawQuota),
    usageSummary: usageSummary ?? {
      consumedCredits: 0,
      usedClawSeconds: 0,
      sessions: 0,
    },
  }
}

export async function fetchAdminUsersPage(params: {
  page: number
  pageSize: number
  search?: string
}) {
  const search = params.search?.trim() ?? ''
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
      select: adminUserSelect,
    }),
    db.user.count({ where }),
  ])

  const usageMap = await aggregateUsageForUserIds(users.map((user) => user.id))

  return {
    data: users.map((user) => enrichAdminUser(user, usageMap.get(user.id))),
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      pageCount: Math.ceil(total / params.pageSize),
      total,
    },
  }
}

async function fetchAdminUserBaseById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: adminUserSelect,
  })
}

export async function fetchAdminUserById(id: string) {
  const user = await fetchAdminUserBaseById(id)
  if (!user) {
    return null
  }

  const usageMap = await aggregateUsageForUserIds([id])
  return enrichAdminUser(user, usageMap.get(id))
}
