import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOrganizationScopeIds } from '@/lib/organizations'
import { Main } from '@/components/layout/main'
import { Clock, CheckCircle2, XCircle, History } from 'lucide-react'
import { ApprovalsClient } from './ApprovalsClient'

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

const statusMeta: Record<ApplicationStatus, { badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { badgeVariant: 'secondary', label: '待审核' },
  approved: { badgeVariant: 'default', label: '已通过' },
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

  const initialApplications = applications.map((app) => {
    const timeline = getTimelineLabel(app)
    return {
      id: app.id,
      resourceType: app.resourceType,
      resourceName: app.resource?.name ?? null,
      resourceIdentifier: app.resource?.identifier ?? null,
      resourceVisibility: app.resource?.visibility ?? null,
      userName: app.user.name,
      userEmail: app.user.email,
      userOrgName: app.user.organization?.name ?? null,
      resourceOrgName: app.resource?.organization?.name ?? null,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      timelineLabel: timeline.label,
      timelineValue: timeline.value,
      isRevocable: app.status === 'approved' && !app.grant?.revokedAt,
    }
  })

  return (
    <Main className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <ApprovalsClient
        initialApplications={initialApplications}
        counts={counts}
        selectedStatus={selectedStatus}
      />
    </Main>
  )
}
