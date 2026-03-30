import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { DEFAULT_CONSUMER_ORGANIZATION_ID } from '@/lib/default-organizations'
import {
  consumeRegisterVerificationCode,
  getRegisterVerificationCodeErrorMessage,
} from '@/lib/email-verification'
import { recordOperationLog } from '@/lib/operation-log'
import { createSelfServiceConsumerRegistrationQuota } from '@/lib/user-claw-quota-policy'

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  verificationCode: z.string().trim(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '注册信息不完整或格式不正确。', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const verificationCodeError = getRegisterVerificationCodeErrorMessage(parsed.data.verificationCode)
  if (verificationCodeError) {
    return NextResponse.json(
      { error: verificationCodeError, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const name = parsed.data.name.trim()
  const email = parsed.data.email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const registrationQuota = createSelfServiceConsumerRegistrationQuota()

  try {
    const user = await db.$transaction(async (tx) => {
      const defaultOrganization = await tx.organization.findUnique({
        where: { id: DEFAULT_CONSUMER_ORGANIZATION_ID },
        select: { id: true, name: true },
      })

      if (!defaultOrganization) {
        throw new Error('DEFAULT_CONSUMER_ORGANIZATION_MISSING')
      }

      await consumeRegisterVerificationCode(tx, email, parsed.data.verificationCode)

      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          accountType: 'consumer',
          organizationId: defaultOrganization.id,
          isSuperAdmin: false,
          isDepartmentAdmin: false,
          departmentId: null,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          accountType: true,
          organizationId: true,
        },
      })

      await tx.userClawQuota.create({
        data: {
          userId: createdUser.id,
          creditBalance: registrationQuota.creditBalance,
          pricingVersion: registrationQuota.pricingVersion,
          expiresAt: registrationQuota.expiresAt,
        },
      })

      return createdUser
    })

    await recordOperationLog({
      request,
      actor: user,
      module: 'auth',
      action: 'auth.register',
      targetType: 'user',
      targetId: user.id,
      targetName: user.email,
      targetUserId: user.id,
      summary: `用户自助注册 ${user.email}`,
      metadata: {
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        organizationId: user.organizationId,
        source: 'self_service_register',
        registrationCredits: registrationQuota.creditBalance,
        quotaExpiresAt: registrationQuota.expiresAt.toISOString(),
      },
    })

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.accountType,
          organizationId: user.organizationId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: '该邮箱已注册，请直接登录。', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'DEFAULT_CONSUMER_ORGANIZATION_MISSING') {
      return NextResponse.json(
        { error: '默认普通用户组织不存在，请先执行项目初始化。', code: 'DEFAULT_CONSUMER_ORG_MISSING' },
        { status: 500 }
      )
    }

    if (error instanceof Error && error.message === 'VERIFICATION_CODE_INVALID') {
      return NextResponse.json(
        { error: '邮箱验证码错误，请重新输入。', code: 'VERIFICATION_CODE_INVALID' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'VERIFICATION_CODE_EXPIRED') {
      return NextResponse.json(
        { error: '邮箱验证码已过期，请重新获取。', code: 'VERIFICATION_CODE_EXPIRED' },
        { status: 400 }
      )
    }

    throw error
  }
}
