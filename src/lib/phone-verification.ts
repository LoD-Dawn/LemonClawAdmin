import 'server-only'

import { createHash, randomInt } from 'crypto'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { normalizePhone } from '@/lib/phone'
import {
  SMS_VERIFICATION_CODE_EXPIRES_MINUTES,
  SMS_VERIFICATION_CODE_RESEND_SECONDS,
  sendBindPhoneSmsCode,
  sendLoginSmsCode,
  sendRegisterSmsCode,
} from '@/lib/sms'

export const PHONE_VERIFICATION_CODE_LENGTH = 6
export const PHONE_VERIFICATION_PURPOSE_LOGIN = 'consumer_login'
export const PHONE_VERIFICATION_PURPOSE_REGISTER = 'consumer_register'
export const PHONE_VERIFICATION_PURPOSE_BIND = 'consumer_bind_phone'

type PhoneVerificationPurpose =
  | typeof PHONE_VERIFICATION_PURPOSE_LOGIN
  | typeof PHONE_VERIFICATION_PURPOSE_REGISTER
  | typeof PHONE_VERIFICATION_PURPOSE_BIND

const MINUTE_IN_MS = 60 * 1000
const SECOND_IN_MS = 1000

function getVerificationSecret() {
  return process.env.PHONE_VERIFICATION_SECRET?.trim()
    || process.env.AUTH_SECRET?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()
    || 'local-phone-verification-secret'
}

function hashVerificationCode(phone: string, purpose: PhoneVerificationPurpose, code: string) {
  return createHash('sha256')
    .update(`${phone}:${purpose}:${code}:${getVerificationSecret()}`)
    .digest('hex')
}

function generateVerificationCode() {
  const min = 10 ** (PHONE_VERIFICATION_CODE_LENGTH - 1)
  const max = 10 ** PHONE_VERIFICATION_CODE_LENGTH
  return String(randomInt(min, max))
}

function getVerificationExpiry(now = new Date()) {
  return new Date(now.getTime() + SMS_VERIFICATION_CODE_EXPIRES_MINUTES * MINUTE_IN_MS)
}

export function isPhoneVerificationCodeFormatValid(code: string) {
  return new RegExp(`^\\d{${PHONE_VERIFICATION_CODE_LENGTH}}$`).test(code.trim())
}

export function getPhoneVerificationCooldownRemaining(lastSentAt: Date, now = new Date()) {
  const diffMs = now.getTime() - lastSentAt.getTime()
  return Math.max(0, SMS_VERIFICATION_CODE_RESEND_SECONDS - Math.floor(diffMs / SECOND_IN_MS))
}

export function getPhoneVerificationCodeErrorMessage(code: string) {
  if (!isPhoneVerificationCodeFormatValid(code)) {
    return `验证码需为 ${PHONE_VERIFICATION_CODE_LENGTH} 位数字。`
  }

  return ''
}

async function upsertPhoneVerificationCode(
  phone: string,
  purpose: PhoneVerificationPurpose,
  now: Date,
  sendCode: (code: string) => Promise<void>
) {
  const existingRecord = await db.phoneVerificationCode.findUnique({
    where: {
      phone_purpose: {
        phone,
        purpose,
      },
    },
    select: {
      id: true,
      lastSentAt: true,
    },
  })

  if (existingRecord) {
    const cooldownRemaining = getPhoneVerificationCooldownRemaining(existingRecord.lastSentAt, now)
    if (cooldownRemaining > 0) {
      const error = new Error('PHONE_VERIFICATION_CODE_RESEND_COOLDOWN')
      ;(error as Error & { cooldownRemaining: number }).cooldownRemaining = cooldownRemaining
      throw error
    }
  }

  const code = generateVerificationCode()
  const codeHash = hashVerificationCode(phone, purpose, code)
  const expiresAt = getVerificationExpiry(now)

  await db.phoneVerificationCode.upsert({
    where: {
      phone_purpose: {
        phone,
        purpose,
      },
    },
    update: {
      codeHash,
      expiresAt,
      lastSentAt: now,
      consumedAt: null,
    },
    create: {
      phone,
      purpose,
      codeHash,
      expiresAt,
      lastSentAt: now,
    },
  })

  try {
    await sendCode(code)
  } catch (error) {
    await db.phoneVerificationCode.delete({
      where: {
        phone_purpose: {
          phone,
          purpose,
        },
      },
    }).catch(() => undefined)

    throw error
  }

  return {
    sent: true,
    expiresInSeconds: SMS_VERIFICATION_CODE_EXPIRES_MINUTES * 60,
    resendInSeconds: SMS_VERIFICATION_CODE_RESEND_SECONDS,
  }
}

export async function sendRegisterPhoneVerificationCode(phoneInput: string) {
  const phone = normalizePhone(phoneInput)
  const existingUser = await db.user.findUnique({
    where: { phone },
    select: { id: true },
  })

  if (existingUser) {
    throw new Error('PHONE_ALREADY_REGISTERED')
  }

  return upsertPhoneVerificationCode(
    phone,
    PHONE_VERIFICATION_PURPOSE_REGISTER,
    new Date(),
    (code) => sendRegisterSmsCode({
      phone,
      code,
      minutes: SMS_VERIFICATION_CODE_EXPIRES_MINUTES,
    })
  )
}

export async function sendLoginPhoneVerificationCode(phoneInput: string) {
  const phone = normalizePhone(phoneInput)
  const existingUser = await db.user.findUnique({
    where: { phone },
    select: {
      id: true,
      accountType: true,
    },
  })

  if (existingUser && existingUser.accountType !== 'consumer') {
    throw new Error('PHONE_LOGIN_NOT_SUPPORTED_FOR_ACCOUNT')
  }

  return upsertPhoneVerificationCode(
    phone,
    PHONE_VERIFICATION_PURPOSE_LOGIN,
    new Date(),
    (code) => sendLoginSmsCode({
      phone,
      code,
      minutes: SMS_VERIFICATION_CODE_EXPIRES_MINUTES,
    })
  )
}

export async function sendBindPhoneVerificationCode(phoneInput: string, currentUserId: string) {
  const phone = normalizePhone(phoneInput)
  const existingUser = await db.user.findUnique({
    where: { phone },
    select: { id: true },
  })

  if (existingUser && existingUser.id !== currentUserId) {
    throw new Error('PHONE_ALREADY_BOUND')
  }

  return upsertPhoneVerificationCode(
    phone,
    PHONE_VERIFICATION_PURPOSE_BIND,
    new Date(),
    (code) => sendBindPhoneSmsCode({
      phone,
      code,
      minutes: SMS_VERIFICATION_CODE_EXPIRES_MINUTES,
    })
  )
}

export async function consumePhoneVerificationCode(
  tx: Prisma.TransactionClient,
  phoneInput: string,
  purpose: PhoneVerificationPurpose,
  code: string
) {
  const phone = normalizePhone(phoneInput)
  const normalizedCode = code.trim()

  if (!isPhoneVerificationCodeFormatValid(normalizedCode)) {
    throw new Error('PHONE_VERIFICATION_CODE_INVALID')
  }

  const record = await tx.phoneVerificationCode.findUnique({
    where: {
      phone_purpose: {
        phone,
        purpose,
      },
    },
  })

  if (!record || record.consumedAt) {
    throw new Error('PHONE_VERIFICATION_CODE_INVALID')
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new Error('PHONE_VERIFICATION_CODE_EXPIRED')
  }

  const expectedHash = hashVerificationCode(phone, purpose, normalizedCode)
  if (record.codeHash !== expectedHash) {
    throw new Error('PHONE_VERIFICATION_CODE_INVALID')
  }

  await tx.phoneVerificationCode.update({
    where: { id: record.id },
    data: {
      consumedAt: new Date(),
    },
  })

  return phone
}
