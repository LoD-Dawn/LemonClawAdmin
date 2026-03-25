import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { parseOperationLogMetadata } from '@/lib/operation-log'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1), 100)
  const search = searchParams.get('search')?.trim() ?? ''
  const moduleFilter = searchParams.get('module')?.trim() ?? ''
  const targetType = searchParams.get('targetType')?.trim() ?? ''

  const where: Prisma.OperationLogWhereInput = {
    AND: [
      ...(moduleFilter && moduleFilter !== 'all' ? [{ module: moduleFilter }] : []),
      ...(targetType && targetType !== 'all' ? [{ targetType }] : []),
      ...(search
        ? [{
            OR: [
              { actorName: { contains: search } },
              { actorEmail: { contains: search } },
              { targetName: { contains: search } },
              { summary: { contains: search } },
              { action: { contains: search } },
              { path: { contains: search } },
            ],
          }]
        : []),
    ],
  }

  const [logs, total] = await Promise.all([
    db.operationLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.operationLog.count({ where }),
  ])

  return NextResponse.json({
    data: logs.map((log) => ({
      ...log,
      metadata: parseOperationLogMetadata(log.metadataJson),
    })),
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  })
}
