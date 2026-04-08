import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { fetchAdminUsersPage, fetchAdminUserById } from '@/lib/admin-user-quota'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import {
  normalizeUserPermissionInput,
  validateUserPermissionScope,
} from '@/lib/user-role-policy'
import { recordOperationLog } from '@/lib/operation-log'
import { DEFAULT_PRICING_VERSION } from '@/lib/user-claw-quota-policy'
import { isPhoneFormatValid, normalizePhone } from '@/lib/phone'

const createSchema = z.object({
  email: z.string().email(),
  phone: z.string().trim().min(1).max(32),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  accountType: z.enum(['consumer', 'enterprise']).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  isSuperAdmin: z.boolean().optional(),
  isDepartmentAdmin: z.boolean().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  creditBalance: z.number().int().min(0).optional(),
  pricingVersion: z.string().trim().min(1).max(64).optional(),
  quotaExpiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const result = await fetchAdminUsersPage({ page, pageSize, search })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (!isPhoneFormatValid(parsed.data.phone)) {
    return NextResponse.json(
      { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
      { status: 400 }
    )
  }

  const { password, creditBalance, pricingVersion, quotaExpiresAt, ...userData } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)
  const normalizedData = {
    ...userData,
    phone: normalizePhone(userData.phone),
    ...normalizeUserPermissionInput(userData),
  }
  const isUnlimitedUser = normalizedData.isSuperAdmin || normalizedData.isDepartmentAdmin

  const [organization, department] = await Promise.all([
    normalizedData.organizationId
      ? db.organization.findUnique({
          where: { id: normalizedData.organizationId },
          select: { id: true, name: true, type: true },
        })
      : Promise.resolve(null),
    normalizedData.departmentId
      ? db.organization.findUnique({
          where: { id: normalizedData.departmentId },
          select: { id: true, name: true, type: true },
        })
      : Promise.resolve(null),
  ])

  const validationIssue = validateUserPermissionScope({
    data: normalizedData,
    organization,
    department,
  })

  if (validationIssue) {
    return NextResponse.json(
      validationIssue,
      { status: 400 }
    )
  }

  try {
    const createdUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...normalizedData, passwordHash },
        select: { id: true },
      })

      if (!isUnlimitedUser) {
        await tx.userClawQuota.create({
          data: {
            userId: user.id,
            creditBalance: creditBalance ?? 0,
            pricingVersion: pricingVersion ?? DEFAULT_PRICING_VERSION,
            expiresAt: quotaExpiresAt ? new Date(quotaExpiresAt) : null,
          },
        })
      }

      return user
    })

    const user = await fetchAdminUserById(createdUser.id)
    if (!user) {
      throw new Error('Created user not found')
    }

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'users',
      action: 'user.create',
      targetType: 'user',
      targetId: user.id,
      targetName: user.email,
      targetUserId: user.id,
      summary: `创建用户 ${user.email}`,
      metadata: {
        email: user.email,
        phone: user.phone,
        name: user.name,
        accountType: user.accountType,
        organizationId: user.organizationId,
        isSuperAdmin: user.isSuperAdmin,
        isDepartmentAdmin: user.isDepartmentAdmin,
        departmentId: user.departmentId,
        isActive: user.isActive,
        isUnlimited: user.clawQuota?.isUnlimited ?? false,
        creditBalance: user.clawQuota?.creditBalance ?? 0,
        pricingVersion: user.clawQuota?.pricingVersion ?? null,
        quotaExpiresAt: user.clawQuota?.expiresAt ?? null,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError
    if (prismaError?.code === 'P2002') {
      const targets = Array.isArray(prismaError.meta?.target) ? prismaError.meta?.target.join(',') : ''
      if (targets.includes('phone')) {
        return NextResponse.json(
          { error: '该手机号已绑定其他账号。', code: 'CONFLICT_PHONE_EXISTS' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: '该邮箱已被其他账号使用。', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
