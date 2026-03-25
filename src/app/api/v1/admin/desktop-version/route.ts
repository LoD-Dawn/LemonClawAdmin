import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import {
  getDesktopVersionReleaseConfig,
  toDesktopVersionReleaseDbInput,
} from '@/lib/desktop-version'
import { recordOperationLog } from '@/lib/operation-log'

const updateDesktopVersionSchema = z.object({
  version: z.string().trim().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  changeLog: z.object({
    ch: z.object({
      title: z.string().trim().min(1).max(120),
      content: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
    }),
    en: z.object({
      title: z.string().trim().min(1).max(120),
      content: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
    }),
  }),
  macIntel: z.object({
    url: z.string().trim().url().max(2048),
  }),
  macArm: z.object({
    url: z.string().trim().url().max(2048),
  }),
  windowsX64: z.object({
    url: z.string().trim().url().max(2048),
  }),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const config = await getDesktopVersionReleaseConfig()
  return NextResponse.json({ data: config })
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = updateDesktopVersionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const current = await getDesktopVersionReleaseConfig()
  const updated = await db.desktopVersionRelease.update({
    where: { id: current.id },
    data: toDesktopVersionReleaseDbInput(parsed.data),
  })

  const nextConfig = {
    id: updated.id,
    version: updated.version,
    date: updated.releaseDate,
    changeLog: parsed.data.changeLog,
    macIntel: parsed.data.macIntel,
    macArm: parsed.data.macArm,
    windowsX64: parsed.data.windowsX64,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }

  await recordOperationLog({
    request,
    actor: authResult,
    module: 'desktop',
    action: 'desktop.version_update',
    targetType: 'desktop_version_release',
    targetId: updated.id,
    targetName: parsed.data.version,
    summary: `更新桌面端版本配置 ${parsed.data.version}`,
    metadata: parsed.data,
  })

  return NextResponse.json({ data: nextConfig })
}
