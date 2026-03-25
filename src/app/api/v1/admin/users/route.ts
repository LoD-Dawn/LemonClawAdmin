import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import {
  normalizeUserPermissionInput,
  validateUserPermissionScope,
} from '@/lib/user-role-policy'
import { recordOperationLog } from '@/lib/operation-log'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  organizationId: z.string().uuid().nullable().optional(),
  isSuperAdmin: z.boolean().optional(),
  isDepartmentAdmin: z.boolean().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true,
        organizationId: true, isSuperAdmin: true, isDepartmentAdmin: true, departmentId: true, isActive: true,
        organization: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        createdAt: true
      }
    }),
    db.user.count({ where })
  ])

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total
    }
  })
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

  const { password, ...userData } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)
  const normalizedData = {
    ...userData,
    ...normalizeUserPermissionInput(userData),
  }

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
    const user = await db.user.create({
      data: { ...normalizedData, passwordHash },
      select: {
        id: true, email: true, name: true, organizationId: true,
        isSuperAdmin: true, isDepartmentAdmin: true, departmentId: true, isActive: true,
        organization: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        createdAt: true
      }
    })

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
        name: user.name,
        organizationId: user.organizationId,
        isSuperAdmin: user.isSuperAdmin,
        isDepartmentAdmin: user.isDepartmentAdmin,
        departmentId: user.departmentId,
        isActive: user.isActive,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
