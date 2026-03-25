import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { skillTagUpdateSchema } from '@/lib/skill-tags'
import { recordOperationLog } from '@/lib/operation-log'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = await request.json()
  const parsed = skillTagUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existingTag = await db.skillTag.findUnique({ where: { id } })
  if (!existingTag) {
    return NextResponse.json(
      { error: 'Tag not found', code: 'NOT_FOUND_TAG' },
      { status: 404 }
    )
  }

  const tag = await db.skillTag.update({
    where: { id },
    data: parsed.data,
  })

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'skill_tags',
    action: 'skill_tag.update',
    targetType: 'skill_tag',
    targetId: tag.id,
    targetName: tag.zh,
    summary: `更新标签 ${tag.zh}`,
    metadata: {
      updatedFields: Object.keys(parsed.data),
      en: tag.en,
      zh: tag.zh,
      sortOrder: tag.sortOrder,
      isActive: tag.isActive,
    },
  })

  return NextResponse.json({ data: tag })
}
