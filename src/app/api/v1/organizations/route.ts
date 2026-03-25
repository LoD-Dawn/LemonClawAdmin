import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { buildOrganizationPath } from '@/lib/organizations'
import { z } from 'zod'
import { recordOperationLog } from '@/lib/operation-log'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['company', 'department', 'team']),
  parentId: z.string().uuid().nullable()
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const organizations = await db.organization.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { users: true, departmentUsers: true } }
    }
  })

  // Transform to tree structure
  const buildTree = (orgs: typeof organizations, parentId: string | null): unknown[] => {
    return orgs
      .filter((org: typeof orgs[number]) => org.parentId === parentId)
      .map((org: typeof orgs[number]) => ({
        ...org,
        children: buildTree(orgs, org.id)
      }))
  }

  return NextResponse.json({ data: buildTree(organizations, null) })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, type, parentId } = parsed.data

  if (parentId) {
    const parent = await db.organization.findUnique({ where: { id: parentId } })
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent organization not found', code: 'NOT_FOUND_PARENT' },
        { status: 404 }
      )
    }
  }

  const { path, level } = await buildOrganizationPath(parentId, name)

  const organization = await db.organization.create({
    data: {
      name,
      type,
      parentId,
      path,
      level
    }
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'organizations',
    action: 'organization.create',
    targetType: 'organization',
    targetId: organization.id,
    targetName: organization.name,
    summary: `创建组织 ${organization.name}`,
    metadata: {
      type: organization.type,
      parentId: organization.parentId,
      path: organization.path,
      level: organization.level,
    },
  })

  return NextResponse.json({ data: organization }, { status: 201 })
}
