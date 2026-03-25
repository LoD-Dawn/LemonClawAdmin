import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { History, ShieldCheck, Users, FileClock } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseOperationLogMetadata } from '@/lib/operation-log'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { OperationLogsClient } from './OperationLogsClient'

function buildWhere({
  search,
  moduleFilter,
  targetType,
}: {
  search: string
  moduleFilter: string
  targetType: string
}): Prisma.OperationLogWhereInput {
  return {
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
}

export default async function OperationLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; pageSize?: string; search?: string; module?: string; targetType?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = Math.max(parseInt(resolvedSearchParams?.page || '1', 10), 1)
  const pageSize = Math.min(Math.max(parseInt(resolvedSearchParams?.pageSize || '20', 10), 1), 100)
  const search = resolvedSearchParams?.search?.trim() ?? ''
  const moduleFilter = resolvedSearchParams?.module?.trim() ?? 'all'
  const targetType = resolvedSearchParams?.targetType?.trim() ?? 'all'
  const where = buildWhere({ search, moduleFilter, targetType })
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [logs, total, todayCount, recentActors, moduleCount] = await Promise.all([
    db.operationLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.operationLog.count({ where }),
    db.operationLog.count({
      where: {
        ...where,
        createdAt: { gte: last24Hours },
      },
    }),
    db.operationLog.findMany({
      where: {
        actorUserId: { not: null },
        createdAt: { gte: last7Days },
      },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
    }),
    db.operationLog.findMany({
      distinct: ['module'],
      select: { module: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="审计"
        title="操作日志"
        description="集中查看各账号在后台和申请流程中的关键操作记录，便于追踪责任、排查问题与复盘变更。"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="日志总量" value={total} icon={History} hint="当前筛选条件下的记录数" />
        <AdminStatCard label="24 小时新增" value={todayCount} icon={FileClock} tone="sky" hint="最近一天产生的操作" />
        <AdminStatCard label="近 7 天活跃账号" value={recentActors.length} icon={Users} tone="emerald" hint="产生过操作日志的账号" />
        <AdminStatCard label="覆盖模块" value={moduleCount.length} icon={ShieldCheck} tone="amber" hint="已接入日志记录的功能域" />
      </div>
      <OperationLogsClient
        initialLogs={logs.map((log) => ({
          ...log,
          metadata: parseOperationLogMetadata(log.metadataJson),
        }))}
        initialPagination={{
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        }}
        initialFilters={{
          search,
          module: moduleFilter,
          targetType,
        }}
      />
    </div>
  )
}
