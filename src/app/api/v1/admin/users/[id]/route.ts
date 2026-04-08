import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { fetchAdminUserById } from '@/lib/admin-user-quota'
import { z } from 'zod'
import { revokeActiveGrants } from '@/lib/resource-grants'
import {
  normalizeUserPermissionInput,
  validateUserPermissionScope,
} from '@/lib/user-role-policy'
import { recordOperationLog } from '@/lib/operation-log'
import { DEFAULT_PRICING_VERSION } from '@/lib/user-claw-quota-policy'
import { isPhoneFormatValid, normalizePhone } from '@/lib/phone'

const PROTECTED_ADMIN_EMAIL = 'admin@local.com'

const updateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).max(32).optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(255).optional(),
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const user = await fetchAdminUserById(id)

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: user })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const existingUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      accountType: true,
      organizationId: true,
      isSuperAdmin: true,
      isDepartmentAdmin: true,
      departmentId: true,
      isActive: true,
    },
  })

  if (!existingUser) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  if (existingUser.email === PROTECTED_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: 'Protected admin account cannot be edited', code: 'CONFLICT_PROTECTED_ADMIN_EDIT' },
      { status: 409 }
    )
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (Object.prototype.hasOwnProperty.call(parsed.data, 'phone')) {
    if (!parsed.data.phone || !isPhoneFormatValid(parsed.data.phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
        { status: 400 }
      )
    }

    updateData.phone = normalizePhone(parsed.data.phone)
  }

  const quotaPatch = {
    creditBalance: parsed.data.creditBalance,
    pricingVersion: parsed.data.pricingVersion,
    quotaExpiresAt: parsed.data.quotaExpiresAt,
  }
  delete updateData.creditBalance
  delete updateData.pricingVersion
  delete updateData.quotaExpiresAt
  if (updateData.password) {
    const bcryptModule = await import('bcryptjs')
    updateData.passwordHash = await bcryptModule.hash(updateData.password as string, 12)
    delete updateData.password
  }

  const hasPermissionFieldUpdate = ['accountType', 'organizationId', 'isSuperAdmin', 'isDepartmentAdmin', 'departmentId']
    .some((key) => Object.prototype.hasOwnProperty.call(parsed.data, key))
  const nextPermissionState = hasPermissionFieldUpdate
    ? normalizeUserPermissionInput({
        accountType: Object.prototype.hasOwnProperty.call(parsed.data, 'accountType')
          ? parsed.data.accountType
          : existingUser.accountType,
        organizationId: Object.prototype.hasOwnProperty.call(parsed.data, 'organizationId')
          ? parsed.data.organizationId
          : existingUser.organizationId,
        isSuperAdmin: Object.prototype.hasOwnProperty.call(parsed.data, 'isSuperAdmin')
          ? parsed.data.isSuperAdmin
          : existingUser.isSuperAdmin,
        isDepartmentAdmin: Object.prototype.hasOwnProperty.call(parsed.data, 'isDepartmentAdmin')
          ? parsed.data.isDepartmentAdmin
          : existingUser.isDepartmentAdmin,
        departmentId: Object.prototype.hasOwnProperty.call(parsed.data, 'departmentId')
          ? parsed.data.departmentId
          : existingUser.departmentId,
      })
    : normalizeUserPermissionInput(existingUser)

  if (hasPermissionFieldUpdate) {
    const [organization, department] = await Promise.all([
      nextPermissionState.organizationId
        ? db.organization.findUnique({
            where: { id: nextPermissionState.organizationId },
            select: { id: true, name: true, type: true },
          })
        : Promise.resolve(null),
      nextPermissionState.departmentId
        ? db.organization.findUnique({
            where: { id: nextPermissionState.departmentId },
            select: { id: true, name: true, type: true },
          })
        : Promise.resolve(null),
    ])

    const validationIssue = validateUserPermissionScope({
      data: nextPermissionState,
      organization,
      department,
    })

    if (validationIssue) {
      return NextResponse.json(validationIssue, { status: 400 })
    }

    updateData.organizationId = nextPermissionState.organizationId
    updateData.accountType = nextPermissionState.accountType
    updateData.isSuperAdmin = nextPermissionState.isSuperAdmin
    updateData.isDepartmentAdmin = nextPermissionState.isDepartmentAdmin
    updateData.departmentId = nextPermissionState.departmentId
  }

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id },
        data: updateData,
      })

      const hasQuotaUpdate = ['creditBalance', 'pricingVersion', 'quotaExpiresAt']
        .some((key) => Object.prototype.hasOwnProperty.call(parsed.data, key))
      const isUnlimitedUser = nextPermissionState.isSuperAdmin || nextPermissionState.isDepartmentAdmin

      if (hasQuotaUpdate && !isUnlimitedUser) {
        await tx.userClawQuota.upsert({
          where: { userId: id },
          update: {
            ...(Object.prototype.hasOwnProperty.call(parsed.data, 'creditBalance')
              ? { creditBalance: quotaPatch.creditBalance ?? 0 }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(parsed.data, 'pricingVersion')
              ? { pricingVersion: quotaPatch.pricingVersion ?? DEFAULT_PRICING_VERSION }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(parsed.data, 'quotaExpiresAt')
              ? { expiresAt: quotaPatch.quotaExpiresAt ? new Date(quotaPatch.quotaExpiresAt) : null }
              : {}),
          },
          create: {
            userId: id,
            creditBalance: quotaPatch.creditBalance ?? 0,
            pricingVersion: quotaPatch.pricingVersion ?? DEFAULT_PRICING_VERSION,
            expiresAt: quotaPatch.quotaExpiresAt ? new Date(quotaPatch.quotaExpiresAt) : null,
          },
        })
      }

      if (updateData.isActive === false) {
        const revokedAt = new Date()
        await revokeActiveGrants(tx, { userId: id, revokedAt })
        await tx.resourceApplication.updateMany({
          where: { userId: id, status: 'approved' },
          data: { status: 'revoked' },
        })
        await tx.oAuthToken.deleteMany({ where: { userId: id } })
      }

    })

    const user = await fetchAdminUserById(id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND_USER' },
        { status: 404 }
      )
    }
  
    await recordOperationLog({
      request,
      actor: authResult,
      module: 'users',
      action: 'user.update',
      targetType: 'user',
      targetId: user.id,
      targetName: user.email,
      targetUserId: user.id,
      summary: `更新用户 ${user.email}`,
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
        updatedFields: Object.keys(parsed.data).filter((key) => key !== 'password'),
        passwordChanged: Boolean(parsed.data.password),
        isUnlimited: user.clawQuota?.isUnlimited ?? false,
        creditBalance: user.clawQuota?.creditBalance ?? null,
        pricingVersion: user.clawQuota?.pricingVersion ?? null,
        quotaExpiresAt: user.clawQuota?.expiresAt ?? null,
      },
    })
  
    return NextResponse.json({ data: user })
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  if (user.email === PROTECTED_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: 'Protected admin account cannot be deleted', code: 'CONFLICT_PROTECTED_ADMIN_DELETE' },
      { status: 409 }
    )
  }

  const deletionSummary = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.resourceGrant.updateMany({
      where: { grantedBy: id },
      data: { grantedBy: null },
    })

    const deletedTokens = await tx.oAuthToken.deleteMany({ where: { userId: id } })
    const deletedAuthCodes = await tx.oAuthAuthorizationCode.deleteMany({ where: { userId: id } })
    const deletedGrants = await tx.resourceGrant.deleteMany({ where: { userId: id } })
    const deletedApplications = await tx.resourceApplication.deleteMany({ where: { userId: id } })
    const deletedSkills = await tx.skill.deleteMany({ where: { ownerId: id } })
    const deletedMcps = await tx.mcp.deleteMany({ where: { ownerId: id } })
    const deletedProviders = await tx.modelProvider.deleteMany({ where: { ownerId: id } })

    await tx.user.delete({ where: { id } })

    return {
      deletedTokens: deletedTokens.count,
      deletedAuthCodes: deletedAuthCodes.count,
      deletedGrants: deletedGrants.count,
      deletedApplications: deletedApplications.count,
      deletedSkills: deletedSkills.count,
      deletedMcps: deletedMcps.count,
      deletedProviders: deletedProviders.count,
    }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'users',
    action: 'user.delete',
    targetType: 'user',
    targetId: user.id,
    targetName: user.email ?? null,
    summary: `删除用户 ${user.email ?? user.id}`,
    metadata: {
      id: user.id,
      email: user.email,
      name: user.name,
      ...deletionSummary,
    },
  })

  return NextResponse.json({ success: true })
}
