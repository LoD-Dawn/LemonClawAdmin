import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { canManageResource, canViewResource, resolveAdminAccessScope } from '@/lib/admin-access'
import { revokeActiveGrants } from '@/lib/resource-grants'
import { buildSkillMetadataData, skillMetadataUpdateSchema } from '@/lib/skill-metadata'
import { parseTagsJson } from '@/lib/skill-catalog'
import { findUnknownSkillTagIds } from '@/lib/skill-tag-validation'
import { recordOperationLog } from '@/lib/operation-log'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const skill = await db.skill.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, organizationId: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  if (!skill) {
    return NextResponse.json(
      { error: 'Skill not found', code: 'NOT_FOUND_SKILL' },
      { status: 404 }
    )
  }

  if (!canViewResource(authResult.user, skill, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  return NextResponse.json({ data: skill })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params
  const body = await request.json()
  const parsed = skillMetadataUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const existingSkill = await db.skill.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      identifier: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      tagsJson: true,
      owner: { select: { organizationId: true } },
    },
  })

  if (!existingSkill) {
    return NextResponse.json(
      { error: 'Skill not found', code: 'NOT_FOUND_SKILL' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingSkill, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  if (parsed.data.tags) {
    const unknownTagIds = await findUnknownSkillTagIds(parsed.data.tags, parseTagsJson(existingSkill.tagsJson))
    if (unknownTagIds.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown skill tags: ${unknownTagIds.join(', ')}`,
          code: 'VALIDATION_UNKNOWN_TAGS',
        },
        { status: 400 }
      )
    }
  }

  const skill = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const { tags, ...persistedInput } = parsed.data
    const updatedSkill = await tx.skill.update({
      where: { id },
      data: {
        ...persistedInput,
        ...buildSkillMetadataData({
          description: persistedInput.description,
          descriptionEn: persistedInput.descriptionEn,
          descriptionZh: persistedInput.descriptionZh,
          tags,
          packageUrl: persistedInput.packageUrl,
          version: persistedInput.version,
          sourceFrom: persistedInput.sourceFrom,
          sourceUrl: persistedInput.sourceUrl,
          sourceAuthor: persistedInput.sourceAuthor,
        }),
      }
    })

    if (parsed.data.isActive === false) {
      const revokedAt = new Date()
      await revokeActiveGrants(tx, { resourceType: 'skill', resourceId: id, revokedAt })
      await tx.resourceApplication.updateMany({
        where: { resourceType: 'skill', resourceId: id, status: 'approved' },
        data: { status: 'revoked' },
      })
    }

    return updatedSkill
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'skills',
    action: 'skill.update',
    targetType: 'skill',
    targetId: skill.id,
    targetName: skill.name,
    summary: `更新 Skill ${skill.name}`,
    metadata: {
      identifier: skill.identifier,
      visibility: skill.visibility,
      ownerId: skill.ownerId,
      organizationId: skill.organizationId,
      isActive: skill.isActive,
      updatedFields: Object.keys(parsed.data),
      tags: parsed.data.tags ?? null,
    },
  })

  return NextResponse.json({ data: skill })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const { id } = await params

  // Soft delete
  const existingSkill = await db.skill.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      identifier: true,
      visibility: true,
      organizationId: true,
      ownerId: true,
      owner: { select: { organizationId: true } },
    },
  })

  if (!existingSkill) {
    return NextResponse.json(
      { error: 'Skill not found', code: 'NOT_FOUND_SKILL' },
      { status: 404 }
    )
  }

  if (!canManageResource(authResult.user, existingSkill, { scopedOrganizationIds: accessScope.scopedOrganizationIds })) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_SCOPE' },
      { status: 403 }
    )
  }

  const revokedAt = new Date()
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.skill.update({
      where: { id },
      data: { isActive: false }
    })
    await revokeActiveGrants(tx, { resourceType: 'skill', resourceId: id, revokedAt })
    await tx.resourceApplication.updateMany({
      where: { resourceType: 'skill', resourceId: id, status: 'approved' },
      data: { status: 'revoked' },
    })
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'skills',
    action: 'skill.delete',
    targetType: 'skill',
    targetId: existingSkill.id,
    targetName: existingSkill.name,
    summary: `停用 Skill ${existingSkill.name}`,
    metadata: {
      identifier: existingSkill.identifier,
      visibility: existingSkill.visibility,
      ownerId: existingSkill.ownerId,
      organizationId: existingSkill.organizationId,
    },
  })

  return NextResponse.json({ success: true })
}
