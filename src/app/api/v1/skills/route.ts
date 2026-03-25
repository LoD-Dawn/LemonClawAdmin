import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, Visibility } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import {
  canManageResource,
  getViewableResourceFilter,
  resolveAdminAccessScope,
} from '@/lib/admin-access'
import { buildSkillMetadataData, skillMetadataSchema } from '@/lib/skill-metadata'
import { findUnknownSkillTagIds } from '@/lib/skill-tag-validation'
import { recordOperationLog } from '@/lib/operation-log'

export async function GET(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const visibility = searchParams.get('visibility')
  const search = searchParams.get('search') || ''
  const visibilityFilter: Visibility | null =
    visibility === 'company' || visibility === 'department' || visibility === 'personal'
      ? visibility
      : null

  const where: Prisma.SkillWhereInput = {
    isActive: true,
    AND: [
      getViewableResourceFilter(authResult.user, {
        scopedOrganizationIds: accessScope.scopedOrganizationIds,
      }) as Prisma.SkillWhereInput,
      ...(visibilityFilter ? [{ visibility: visibilityFilter }] : []),
      ...(search ? [{
        OR: [
          { name: { contains: search } },
          { identifier: { contains: search } },
        ],
      }] : []),
    ],
  }

  const [skills, total] = await Promise.all([
    db.skill.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, organizationId: true } },
        organization: { select: { id: true, name: true } }
      }
    }),
    db.skill.count({ where })
  ])

  const data = skills.map((skill: typeof skills[number]) => ({
    ...skill,
    canManage: canManageResource(authResult.user, skill, {
      scopedOrganizationIds: accessScope.scopedOrganizationIds,
    }),
  }))

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total
    }
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const body = await request.json()
  const parsed = skillMetadataSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, organizationId } = parsed.data

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (visibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only create department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !organizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(organizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only create resources in their managed department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = null
  } else if (!authResult.user.isSuperAdmin) {
    if (visibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only create personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    parsed.data.ownerId = authResult.user.id
    parsed.data.organizationId = null
  } else {
    if (visibility === 'personal') {
      return NextResponse.json(
        { error: 'Personal resources are not created from the management API', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
        { status: 400 }
      )
    }
  }

  try {
    const { tags, ...persistedInput } = parsed.data
    const unknownTagIds = await findUnknownSkillTagIds(tags)

    if (unknownTagIds.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown skill tags: ${unknownTagIds.join(', ')}`,
          code: 'VALIDATION_UNKNOWN_TAGS',
        },
        { status: 400 }
      )
    }

    const skill = await db.skill.create({
      data: {
        ...buildSkillMetadataData({ ...persistedInput, tags }),
        name: persistedInput.name,
        identifier: persistedInput.identifier,
        visibility: persistedInput.visibility,
        ownerId: persistedInput.ownerId,
        organizationId: persistedInput.organizationId,
      } as Prisma.SkillUncheckedCreateInput,
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'skills',
      action: 'skill.create',
      targetType: 'skill',
      targetId: skill.id,
      targetName: skill.name,
      summary: `创建 Skill ${skill.name}`,
      metadata: {
        identifier: skill.identifier,
        visibility: skill.visibility,
        ownerId: skill.ownerId,
        organizationId: skill.organizationId,
        isActive: skill.isActive,
        tags,
      },
    })

    return NextResponse.json({ data: skill }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Identifier already exists in this scope', code: 'CONFLICT_IDENTIFIER_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
