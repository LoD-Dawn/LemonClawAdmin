import 'server-only'

import { createHash, randomInt } from 'crypto'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { isMailerConfigured, sendMail } from '@/lib/mailer'

export const REGISTER_EMAIL_VERIFICATION_PURPOSE = 'consumer_register'
export const REGISTER_EMAIL_VERIFICATION_CODE_LENGTH = 6
export const REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES = 10
export const REGISTER_EMAIL_VERIFICATION_RESEND_SECONDS = 60

const MINUTE_IN_MS = 60 * 1000
const SECOND_IN_MS = 1000

function getVerificationSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET?.trim()
    || process.env.AUTH_SECRET?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()
    || 'local-email-verification-secret'
}

function hashVerificationCode(email: string, purpose: string, code: string) {
  return createHash('sha256')
    .update(`${email}:${purpose}:${code}:${getVerificationSecret()}`)
    .digest('hex')
}

function generateVerificationCode() {
  const min = 10 ** (REGISTER_EMAIL_VERIFICATION_CODE_LENGTH - 1)
  const max = 10 ** REGISTER_EMAIL_VERIFICATION_CODE_LENGTH
  return String(randomInt(min, max))
}

function getVerificationExpiry(now = new Date()) {
  return new Date(now.getTime() + REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES * MINUTE_IN_MS)
}

export function normalizeVerificationEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isVerificationCodeFormatValid(code: string) {
  return new RegExp(`^\\d{${REGISTER_EMAIL_VERIFICATION_CODE_LENGTH}}$`).test(code.trim())
}

export function getRegisterVerificationCooldownRemaining(lastSentAt: Date, now = new Date()) {
  const diffMs = now.getTime() - lastSentAt.getTime()
  return Math.max(0, REGISTER_EMAIL_VERIFICATION_RESEND_SECONDS - Math.floor(diffMs / SECOND_IN_MS))
}

export function getRegisterVerificationCodeErrorMessage(code: string) {
  if (!isVerificationCodeFormatValid(code)) {
    return `验证码需为 ${REGISTER_EMAIL_VERIFICATION_CODE_LENGTH} 位数字。`
  }

  return ''
}

export async function sendRegisterVerificationCode(email: string) {
  const normalizedEmail = normalizeVerificationEmail(email)

  if (!isMailerConfigured()) {
    throw new Error('MAILER_CONFIG_MISSING')
  }

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existingUser) {
    throw new Error('EMAIL_ALREADY_REGISTERED')
  }

  const now = new Date()
  const existingRecord = await db.emailVerificationCode.findUnique({
    where: {
      email_purpose: {
        email: normalizedEmail,
        purpose: REGISTER_EMAIL_VERIFICATION_PURPOSE,
      },
    },
    select: {
      id: true,
      lastSentAt: true,
    },
  })

  if (existingRecord) {
    const cooldownRemaining = getRegisterVerificationCooldownRemaining(existingRecord.lastSentAt, now)
    if (cooldownRemaining > 0) {
      const error = new Error('VERIFICATION_CODE_RESEND_COOLDOWN')
      ;(error as Error & { cooldownRemaining: number }).cooldownRemaining = cooldownRemaining
      throw error
    }
  }

  const code = generateVerificationCode()
  const codeHash = hashVerificationCode(normalizedEmail, REGISTER_EMAIL_VERIFICATION_PURPOSE, code)
  const expiresAt = getVerificationExpiry(now)

  await db.emailVerificationCode.upsert({
    where: {
      email_purpose: {
        email: normalizedEmail,
        purpose: REGISTER_EMAIL_VERIFICATION_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      lastSentAt: now,
      consumedAt: null,
    },
    create: {
      email: normalizedEmail,
      purpose: REGISTER_EMAIL_VERIFICATION_PURPOSE,
      codeHash,
      expiresAt,
      lastSentAt: now,
    },
  })

  try {
    await sendMail({
      to: normalizedEmail,
      subject: 'LemonClaw 注册验证码',
      text: `你的注册验证码是 ${code}，${REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES} 分钟内有效。`,
      html: `<div style="font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a">
<p>你正在注册 LemonClaw 账号。</p>
<p>验证码：<strong style="font-size:24px;letter-spacing:6px">${code}</strong></p>
<p>该验证码将在 ${REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES} 分钟后失效，请勿泄露给他人。</p>
</div>`,
    })
  } catch (error) {
    await db.emailVerificationCode.delete({
      where: {
        email_purpose: {
          email: normalizedEmail,
          purpose: REGISTER_EMAIL_VERIFICATION_PURPOSE,
        },
      },
    }).catch(() => undefined)

    throw error
  }

  return {
    sent: true,
    expiresInSeconds: REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES * 60,
    resendInSeconds: REGISTER_EMAIL_VERIFICATION_RESEND_SECONDS,
  }
}

export async function consumeRegisterVerificationCode(
  tx: Prisma.TransactionClient,
  email: string,
  code: string
) {
  const normalizedEmail = normalizeVerificationEmail(email)
  const normalizedCode = code.trim()

  if (!isVerificationCodeFormatValid(normalizedCode)) {
    throw new Error('VERIFICATION_CODE_INVALID')
  }

  const record = await tx.emailVerificationCode.findUnique({
    where: {
      email_purpose: {
        email: normalizedEmail,
        purpose: REGISTER_EMAIL_VERIFICATION_PURPOSE,
      },
    },
  })

  if (!record || record.consumedAt) {
    throw new Error('VERIFICATION_CODE_INVALID')
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new Error('VERIFICATION_CODE_EXPIRED')
  }

  const expectedHash = hashVerificationCode(normalizedEmail, REGISTER_EMAIL_VERIFICATION_PURPOSE, normalizedCode)
  if (record.codeHash !== expectedHash) {
    throw new Error('VERIFICATION_CODE_INVALID')
  }

  await tx.emailVerificationCode.update({
    where: { id: record.id },
    data: {
      consumedAt: new Date(),
    },
  })
}
