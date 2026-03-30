export const DEFAULT_PRICING_VERSION = '2026-03-v2'
export const SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS = 100
export const SELF_SERVICE_CONSUMER_REGISTRATION_VALIDITY_DAYS = 7

const DAY_IN_MS = 24 * 60 * 60 * 1000

type UserClawQuotaLike = {
  creditBalance: number
  expiresAt: Date | null
}

export function createSelfServiceConsumerRegistrationQuota(now = new Date()) {
  return {
    creditBalance: SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS,
    pricingVersion: DEFAULT_PRICING_VERSION,
    expiresAt: new Date(now.getTime() + SELF_SERVICE_CONSUMER_REGISTRATION_VALIDITY_DAYS * DAY_IN_MS),
  }
}

export function isUserClawQuotaExpired(
  quota: Pick<UserClawQuotaLike, 'expiresAt'> | null | undefined,
  now = new Date()
) {
  return Boolean(quota?.expiresAt && quota.expiresAt.getTime() <= now.getTime())
}

export function getEffectiveUserClawCreditBalance(
  quota: Pick<UserClawQuotaLike, 'creditBalance' | 'expiresAt'> | null | undefined,
  now = new Date()
) {
  if (!quota) {
    return 0
  }

  return isUserClawQuotaExpired(quota, now) ? 0 : quota.creditBalance
}
