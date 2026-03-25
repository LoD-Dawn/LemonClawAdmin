import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApproveButton } from './approve-button'
import { RejectButton } from './reject-button'
import { RevokeButton } from './revoke-button'
import { Box, CheckCircle2, Clock, Cpu, History, ShieldCheck, XCircle } from 'lucide-react'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'revoked'
type ResourceType = 'skill' | 'mcp'

interface Application {
  id: string
  resourceType: ResourceType
  resourceId: string
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    email: string
    name: string | null
    organization: { id: string; name: string } | null
  }
  resource: {
    id: string
    name: string
    identifier: string
    visibility: string
    organization: { id: string; name: string } | null
  } | null
  grant: {
    id: string
    grantedAt: Date
    revokedAt: Date | null
  } | null
}

interface StatusOption {
  key: ApplicationStatus
  label: string
  emptyTitle: string
  emptyDescription: string
  Icon: typeof Clock
}

const statusOptions: StatusOption[] = [
  {
    key: 'pending',
    label: '待审核',
    emptyTitle: '暂无待审核申请',
    emptyDescription: '新的技能或 MCP 申请会显示在这里。',
    Icon: Clock,
  },
  {
    key: 'approved',
    label: '已通过',
    emptyTitle: '暂无已通过记录',
    emptyDescription: '通过后的申请会作为审核历史保留在这里。',
    Icon: CheckCircle2,
  },
  {
    key: 'rejected',
    label: '已拒绝',
    emptyTitle: '暂无已拒绝记录',
    emptyDescription: '被拒绝的技能或 MCP 申请会显示在这里。',
    Icon: XCircle,
  },
  {
    key: 'revoked',
    label: '已撤销',
    emptyTitle: '暂无已撤销记录',
    emptyDescription: '已撤销授权的申请会显示在这里。',
    Icon: History,
  },
]

const statusMeta: Record<ApplicationStatus, { badgeVariant: 'warning' | 'success' | 'destructive' | 'outline'; label: string }> = {
  pending: { badgeVariant: 'warning', label: '待审核' },
  approved: { badgeVariant: 'success', label: '已通过' },
  rejected: { badgeVariant: 'destructive', label: '已拒绝' },
  revoked: { badgeVariant: 'outline', label: '已撤销' },
}

const visibilityLabelMap: Record<string, string> = {
  company: '公共',
  department: '部门',
  personal: '个人',
}

function getSelectedStatus(status?: string): ApplicationStatus {
  if (status === 'approved' || status === 'rejected' || status === 'revoked') {
    return status
  }
  return 'pending'
}

async function getDepartmentResourceIds(departmentId: string | null) {
  const scopedOrganizationIds = await getOrganizationScopeIds(departmentId)
  if (scopedOrganizationIds.length === 0) {
    return {
      skillIds: [] as string[],
      mcpIds: [] as string[],
    }
  }

  const [skills, mcps] = await Promise.all([
    db.skill.findMany({
      where: { organizationId: { in: scopedOrganizationIds } },
      select: { id: true },
    }),
    db.mcp.findMany({
      where: { organizationId: { in: scopedOrganizationIds } },
      select: { id: true },
    }),
  ])

  return {
    skillIds: skills.map((skill: { id: string }) => skill.id),
    mcpIds: mcps.map((mcp: { id: string }) => mcp.id),
  }
}

async function getApplications(params: {
  isSuperAdmin: boolean
  departmentId: string | null
  status: ApplicationStatus
}): Promise<{ applications: Application[]; counts: Record<ApplicationStatus, number> }> {
  const { isSuperAdmin, departmentId, status } = params
  const { skillIds, mcpIds } = !isSuperAdmin
    ? await getDepartmentResourceIds(departmentId)
    : { skillIds: [] as string[], mcpIds: [] as string[] }

  const scopeFilter: Prisma.ResourceApplicationWhereInput = !isSuperAdmin
    ? {
        OR: [
          { resourceType: 'skill', resourceId: { in: skillIds } },
          { resourceType: 'mcp', resourceId: { in: mcpIds } },
        ],
      }
    : {}

  const where: Prisma.ResourceApplicationWhereInput = {
    status,
    ...scopeFilter,
  }

  const [applications, pendingCount, approvedCount, rejectedCount, revokedCount] = await Promise.all([
    db.resourceApplication.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.resourceApplication.count({ where: { status: 'pending', ...scopeFilter } }),
    db.resourceApplication.count({ where: { status: 'approved', ...scopeFilter } }),
    db.resourceApplication.count({ where: { status: 'rejected', ...scopeFilter } }),
    db.resourceApplication.count({ where: { status: 'revoked', ...scopeFilter } }),
  ])

  const data = await Promise.all(
    applications.map(async (application: typeof applications[number]): Promise<Application> => {
      const [resource, grant] = await Promise.all([
        application.resourceType === 'skill'
          ? db.skill.findUnique({
              where: { id: application.resourceId },
              select: {
                id: true,
                name: true,
                identifier: true,
                visibility: true,
                organization: { select: { id: true, name: true } },
              },
            })
          : db.mcp.findUnique({
              where: { id: application.resourceId },
              select: {
                id: true,
                name: true,
                mcpId: true,
                visibility: true,
                organization: { select: { id: true, name: true } },
              },
            }),
        db.resourceGrant.findFirst({
          where: {
            sourceApplicationId: application.id,
          },
          select: {
            id: true,
            grantedAt: true,
            revokedAt: true,
          },
          orderBy: { grantedAt: 'desc' },
        }),
      ])

      return {
        ...application,
        status: application.status as ApplicationStatus,
        resourceType: application.resourceType as ResourceType,
        resource: resource
          ? 'mcpId' in resource
            ? {
                id: resource.id,
                name: resource.name,
                identifier: resource.mcpId,
                visibility: resource.visibility,
                organization: resource.organization,
              }
            : resource
          : null,
        grant,
      }
    })
  )

  return {
    applications: data,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      revoked: revokedCount,
    },
  }
}

function formatDate(value: Date) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTimelineLabel(application: Application) {
  if (application.status === 'approved') {
    return {
      label: '审核通过',
      value: formatDate(application.grant?.grantedAt ?? application.updatedAt),
    }
  }

  if (application.status === 'rejected') {
    return {
      label: '拒绝时间',
      value: formatDate(application.updatedAt),
    }
  }

  if (application.status === 'revoked') {
    return {
      label: '撤销时间',
      value: formatDate(application.grant?.revokedAt ?? application.updatedAt),
    }
  }

  return {
    label: '申请时间',
    value: formatDate(application.createdAt),
  }
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const isSuperAdmin = session.user.isSuperAdmin
  const isDepartmentAdmin = session.user.isDepartmentAdmin

  if (!isSuperAdmin && !isDepartmentAdmin) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedStatus = getSelectedStatus(resolvedSearchParams?.status)
  const currentOption = statusOptions.find((option) => option.key === selectedStatus) ?? statusOptions[0]

  const { applications, counts } = await getApplications({
    isSuperAdmin,
    departmentId: session.user.departmentId,
    status: selectedStatus,
  })

  const totalHistory = counts.approved + counts.rejected + counts.revoked

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="审核"
        title="审核管理"
        description="统一审核 Skill 和 MCP 提交申请，待处理事项与历史记录都集中在这里查看。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="待审核" value={counts.pending} icon={Clock} hint="需要尽快处理" />
        <AdminStatCard label="已通过" value={counts.approved} icon={CheckCircle2} tone="emerald" hint="已完成授权创建" />
        <AdminStatCard label="已拒绝" value={counts.rejected} icon={XCircle} tone="rose" hint="历史拒绝记录" />
        <AdminStatCard label="历史合计" value={totalHistory} icon={History} tone="sky" hint="已归档审核事项" />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => {
          const isActive = option.key === selectedStatus
          const count = counts[option.key]
          return (
            <Link
              key={option.key}
              href={`/dashboard/approvals?status=${option.key}`}
              className={[
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800',
              ].join(' ')}
            >
              <option.Icon className="h-4 w-4" />
              <span>{option.label}</span>
              <span className={isActive ? 'text-gray-200' : 'text-gray-400'}>{count}</span>
            </Link>
          )
        })}
      </div>

      {applications.length === 0 ? (
        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <currentOption.Icon className="mb-4 h-12 w-12 text-gray-400" />
            <p className="text-base font-medium text-gray-700">{currentOption.emptyTitle}</p>
            <p className="mt-1 text-sm text-gray-500">{currentOption.emptyDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => {
            const ResourceIcon = application.resourceType === 'skill' ? Box : Cpu
            const timeline = getTimelineLabel(application)
            const meta = statusMeta[application.status]
            const isPending = application.status === 'pending'

            return (
              <Card
                key={application.id}
                className="border-gray-200 bg-gradient-to-br from-white to-gray-50"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="shrink-0 rounded-lg bg-gray-100 p-2">
                        <ResourceIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-gray-800">
                            {application.resource?.name || '资源已删除'}
                          </h3>
                          <Badge variant={application.resourceType === 'skill' ? 'secondary' : 'outline'}>
                            {application.resourceType === 'skill' ? 'Skill' : 'MCP'}
                          </Badge>
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          {application.resource?.visibility && (
                            <Badge variant="secondary">
                              {visibilityLabelMap[application.resource.visibility] || application.resource.visibility}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-sm text-gray-500">
                          {application.resource?.identifier || '该资源标识已不可用'}
                        </p>
                      </div>
                    </div>
                    {isPending ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <ApproveButton applicationId={application.id} />
                        <RejectButton applicationId={application.id} />
                      </div>
                    ) : application.status === 'approved' && !application.grant?.revokedAt ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <RevokeButton applicationId={application.id} />
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                        <History className="h-3.5 w-3.5" />
                        已归档到审核历史
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-400">申请人</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {application.user.name || application.user.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">申请人部门</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {application.user.organization?.name || '未分配'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">资源归属</p>
                      <p className="mt-1 font-medium text-gray-800">
                        {application.resource?.organization?.name || '公共 / 个人资源'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{timeline.label}</p>
                      <p className="mt-1 font-medium text-gray-800">{timeline.value}</p>
                    </div>
                  </div>

                  {application.status === 'approved' && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        {application.grant?.revokedAt
                          ? '该申请曾通过，但对应授权已被撤销。'
                          : '该申请已通过，授权关系已创建。'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
