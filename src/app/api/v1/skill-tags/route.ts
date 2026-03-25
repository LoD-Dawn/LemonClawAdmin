import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireManagementAuth } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { skillTagSchema } from '@/lib/skill-tags'
import { recordOperationLog } from '@/lib/operation-log'

export async function GET(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const includeInactive = authResult.user.isSuperAdmin && searchParams.get('includeInactive') === 'true'
  const search = searchParams.get('search')?.trim() ?? ''

  const tags = await db.skillTag.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { id: { contains: search } },
              { en: { contains: search } },
              { zh: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { zh: 'asc' }, { en: 'asc' }],
  })

  return NextResponse.json({ data: tags })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = skillTagSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const tag = await db.skillTag.create({
      data: parsed.data,
    })

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'skill_tags',
      action: 'skill_tag.create',
      targetType: 'skill_tag',
      targetId: tag.id,
      targetName: tag.zh,
      summary: `创建标签 ${tag.zh}`,
      metadata: {
        en: tag.en,
        zh: tag.zh,
        sortOrder: tag.sortOrder,
        isActive: tag.isActive,
      },
    })

    return NextResponse.json({ data: tag }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag id already exists', code: 'CONFLICT_TAG_EXISTS' },
        { status: 409 }
      )
    }

    throw error
  }
}
