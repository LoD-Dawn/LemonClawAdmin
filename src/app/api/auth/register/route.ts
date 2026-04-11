import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { DEFAULT_CONSUMER_ORGANIZATION_ID } from '@/lib/default-organizations'
import {
  consumePhoneVerificationCode,
  getPhoneVerificationCodeErrorMessage,
  PHONE_VERIFICATION_PURPOSE_REGISTER,
} from '@/lib/phone-verification'
import { isPhoneFormatValid, maskPhone } from '@/lib/phone'
import { recordOperationLog } from '@/lib/operation-log'
import { createSelfServiceConsumerRegistrationQuota } from '@/lib/user-claw-quota-policy'
import { resolveLoginClientBinding } from '@/lib/login-client-binding'

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  phone: z.string().trim().min(1).max(32),
  smsCode: z.string().trim(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  clientId: z.string().trim().min(1).max(64).optional(),
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

  if (!isPhoneFormatValid(parsed.data.phone)) {
    return NextResponse.json(
      { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
      { status: 400 }
    )
  }

  const verificationCodeError = getPhoneVerificationCodeErrorMessage(parsed.data.smsCode)
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
  let boundOrganizationId: string | null = null
  let boundOrganizationName: string | null = null

  try {
    const user = await db.$transaction(async (tx) => {
      const binding = await resolveLoginClientBinding(tx, parsed.data.clientId)

      const normalizedPhone = await consumePhoneVerificationCode(
        tx,
        parsed.data.phone,
        PHONE_VERIFICATION_PURPOSE_REGISTER,
        parsed.data.smsCode
      )

      const conflictUser = await tx.user.findFirst({
        where: {
          OR: [
            { email },
            { phone: normalizedPhone },
          ],
        },
        select: {
          id: true,
          email: true,
          phone: true,
        },
      })

      if (conflictUser?.email === email) {
        const error = new Error('CONFLICT_EMAIL_EXISTS')
        ;(error as Error & { code?: string }).code = 'CONFLICT_EMAIL_EXISTS'
        throw error
      }

      if (conflictUser?.phone === normalizedPhone) {
        const error = new Error('CONFLICT_PHONE_EXISTS')
        ;(error as Error & { code?: string }).code = 'CONFLICT_PHONE_EXISTS'
        throw error
      }

      let organizationId = DEFAULT_CONSUMER_ORGANIZATION_ID
      if (binding) {
        organizationId = binding.organizationId
        boundOrganizationId = binding.organizationId
        boundOrganizationName = binding.organizationName
      } else {
        const defaultOrganization = await tx.organization.findUnique({
          where: { id: DEFAULT_CONSUMER_ORGANIZATION_ID },
          select: { id: true },
        })

        if (!defaultOrganization) {
          throw new Error('DEFAULT_CONSUMER_ORGANIZATION_MISSING')
        }

        organizationId = defaultOrganization.id
      }

      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          phone: normalizedPhone,
          passwordHash,
          accountType: 'consumer',
          organizationId,
          isSuperAdmin: false,
          isDepartmentAdmin: false,
          departmentId: null,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          phone: true,
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
      summary: `用户自助注册 ${user.email} / ${maskPhone(user.phone ?? parsed.data.phone)}`,
      metadata: {
        email: user.email,
        phone: user.phone,
        name: user.name,
        accountType: user.accountType,
        organizationId: user.organizationId,
        source: 'self_service_register',
        registrationCredits: registrationQuota.creditBalance,
        quotaExpiresAt: registrationQuota.expiresAt.toISOString(),
        loginClientId: parsed.data.clientId ?? null,
        boundOrganizationId,
        boundOrganizationName,
      },
    })

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          accountType: user.accountType,
          organizationId: user.organizationId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError

    if (prismaError?.code === 'P2002') {
      const targets = Array.isArray(prismaError.meta?.target) ? prismaError.meta?.target.join(',') : ''
      if (targets.includes('phone')) {
        return NextResponse.json(
          { error: '该手机号已注册，请直接登录。', code: 'CONFLICT_PHONE_EXISTS' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '该邮箱已注册，请直接登录。', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'CONFLICT_EMAIL_EXISTS') {
      return NextResponse.json(
        { error: '该邮箱已被其他账号使用。', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'CONFLICT_PHONE_EXISTS') {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录。', code: 'CONFLICT_PHONE_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'DEFAULT_CONSUMER_ORGANIZATION_MISSING') {
      return NextResponse.json(
        { error: '默认普通用户组织不存在，请先执行项目初始化。', code: 'DEFAULT_CONSUMER_ORG_MISSING' },
        { status: 500 }
      )
    }

    if (error instanceof Error && error.message === 'LOGIN_CLIENT_BINDING_ORGANIZATION_NOT_FOUND') {
      return NextResponse.json(
        { error: '登录来源绑定的组织不存在，请检查 OAuth 客户端配置。', code: 'LOGIN_CLIENT_BINDING_ORGANIZATION_NOT_FOUND' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_VERIFICATION_CODE_INVALID') {
      return NextResponse.json(
        { error: '短信验证码错误，请重新输入。', code: 'PHONE_VERIFICATION_CODE_INVALID' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_VERIFICATION_CODE_EXPIRED') {
      return NextResponse.json(
        { error: '短信验证码已过期，请重新获取。', code: 'PHONE_VERIFICATION_CODE_EXPIRED' },
        { status: 400 }
      )
    }

    throw error
  }
}
