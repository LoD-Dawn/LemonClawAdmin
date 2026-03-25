import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { recordOperationLog } from '@/lib/operation-log'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const organization = await db.organization.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: { select: { users: true, departmentUsers: true } }
    }
  })

  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found', code: 'NOT_FOUND_ORG' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: organization })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const organization = await db.organization.update({
    where: { id },
    data: parsed.data
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'organizations',
    action: 'organization.update',
    targetType: 'organization',
    targetId: organization.id,
    targetName: organization.name,
    summary: `更新组织 ${organization.name}`,
    metadata: {
      updatedFields: Object.keys(parsed.data),
    },
  })

  return NextResponse.json({ data: organization })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const { id } = await params
  const organization = await db.organization.findUnique({
    where: { id },
    select: { id: true, name: true, type: true },
  })

  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found', code: 'NOT_FOUND_ORG' },
      { status: 404 }
    )
  }

  if (organization.type === 'company') {
    return NextResponse.json(
      { error: 'Company organization cannot be deleted', code: 'CONFLICT_PROTECTED_COMPANY_ORG' },
      { status: 409 }
    )
  }

  // Check for children
  const children = await db.organization.count({ where: { parentId: id } })
  if (children > 0) {
    return NextResponse.json(
      { error: 'Cannot delete organization with children', code: 'CONFLICT_HAS_CHILDREN' },
      { status: 409 }
    )
  }

  const memberCount = await db.user.count({
    where: {
      OR: [
        { organizationId: id },
        { departmentId: id },
      ],
    },
  })

  if (memberCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete organization with assigned users', code: 'CONFLICT_HAS_USERS' },
      { status: 409 }
    )
  }

  await db.organization.delete({ where: { id } })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'organizations',
    action: 'organization.delete',
    targetType: 'organization',
    targetId: organization.id,
    targetName: organization.name,
    summary: `删除组织 ${organization.name}`,
    metadata: {
      type: organization.type,
    },
  })

  return NextResponse.json({ success: true })
}
