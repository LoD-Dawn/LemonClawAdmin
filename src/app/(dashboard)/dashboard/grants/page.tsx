import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Prisma, ResourceType } from '@prisma/client'
import { Box, Cpu, ShieldCheck, ShieldPlus, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GrantCreatePanel } from './GrantCreatePanel'
import { GrantRevokeButton } from './GrantRevokeButton'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Main } from '@/components/layout/main'
import { cn } from '@/lib/utils'

type ResourceTypeFilter = 'all' | ResourceType

async function getScopedGrantWhere(
  resourceType: ResourceType | null,
  scopedOrganizationIds: string[]
): Promise<Prisma.ResourceGrantWhereInput> {
  if (scopedOrganizationIds.length === 0) {
    return {
      OR: [
        { resourceType: 'skill', resourceId: '__forbidden__' },
        { resourceType: 'mcp', resourceId: '__forbidden__' },
      ],
    }
  }

  const [skills, mcps] = await Promise.all([
    resourceType !== 'mcp'
      ? db.skill.findMany({
          where: {
            visibility: 'department',
            organizationId: { in: scopedOrganizationIds },
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
    resourceType !== 'skill'
      ? db.mcp.findMany({
          where: {
            visibility: 'department',
            organizationId: { in: scopedOrganizationIds },
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
  ])

  const orConditions: Prisma.ResourceGrantWhereInput[] = []

  if (skills.length > 0) {
    orConditions.push({
      resourceType: 'skill',
      resourceId: { in: skills.map((skill) => skill.id) },
    })
  }

  if (mcps.length > 0) {
    orConditions.push({
      resourceType: 'mcp',
      resourceId: { in: mcps.map((mcp) => mcp.id) },
    })
  }

  return orConditions.length > 0
    ? { OR: orConditions }
    : {
        OR: [
          { resourceType: 'skill', resourceId: '__forbidden__' },
          { resourceType: 'mcp', resourceId: '__forbidden__' },
        ],
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

export default async function GrantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ resourceType?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin && !session.user.isDepartmentAdmin) {
    redirect('/dashboard')
  }

  const accessScope = await resolveAdminAccessScope(session.user)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedType: ResourceTypeFilter =
    resolvedSearchParams?.resourceType === 'skill' || resolvedSearchParams?.resourceType === 'mcp'
      ? resolvedSearchParams.resourceType
      : 'all'

  const scopedWhere = accessScope.managementMode === 'department_admin'
    ? await getScopedGrantWhere(selectedType === 'all' ? null : selectedType, accessScope.scopedOrganizationIds)
    : {}

  const where: Prisma.ResourceGrantWhereInput = {
    revokedAt: null,
    ...(selectedType !== 'all' ? { resourceType: selectedType } : {}),
    AND: [scopedWhere],
  }

  const [grants, totalCount, skillGrantCount, mcpGrantCount, grantableSkills, grantableMcps, grantableUsers] = await Promise.all([
    db.resourceGrant.findMany({
      where,
      orderBy: [{ grantedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { id: true, name: true } },
          },
        },
        grantor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 50,
    }),
    db.resourceGrant.count({ where }),
    db.resourceGrant.count({
      where: {
        revokedAt: null,
        resourceType: 'skill',
        AND: [scopedWhere],
      },
    }),
    db.resourceGrant.count({
      where: {
        revokedAt: null,
        resourceType: 'mcp',
        AND: [scopedWhere],
      },
    }),
    db.skill.findMany({
      where: {
        isActive: true,
        visibility: 'department',
        ...(accessScope.managementMode === 'department_admin'
          ? { organizationId: { in: accessScope.scopedOrganizationIds } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        identifier: true,
        organization: { select: { name: true } },
      },
    }),
    db.mcp.findMany({
      where: {
        isActive: true,
        visibility: 'department',
        ...(accessScope.managementMode === 'department_admin'
          ? { organizationId: { in: accessScope.scopedOrganizationIds } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        mcpId: true,
        organization: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        organizationId: accessScope.managementMode === 'department_admin'
          ? { in: accessScope.scopedOrganizationIds }
          : { not: null },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        organization: { select: { name: true } },
      },
    }),
  ])

  const skillIds = grants.filter((grant) => grant.resourceType === 'skill').map((grant) => grant.resourceId)
  const mcpIds = grants.filter((grant) => grant.resourceType === 'mcp').map((grant) => grant.resourceId)

  const [skills, mcps] = await Promise.all([
    skillIds.length > 0
      ? db.skill.findMany({
          where: { id: { in: skillIds } },
          select: {
            id: true,
            name: true,
            identifier: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    mcpIds.length > 0
      ? db.mcp.findMany({
          where: { id: { in: mcpIds } },
          select: {
            id: true,
            name: true,
            mcpId: true,
            organization: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const skillMap = new Map(skills.map((skill) => [skill.id, skill]))
  const mcpMap = new Map(mcps.map((mcp) => [mcp.id, { ...mcp, identifier: mcp.mcpId }]))
  const uniqueUserCount = new Set(grants.map((grant) => grant.userId)).size

  const grantableResources = [
    ...grantableSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      identifier: skill.identifier,
      resourceType: 'skill' as const,
      organizationName: skill.organization?.name ?? null,
    })),
    ...grantableMcps.map((mcp) => ({
      id: mcp.id,
      name: mcp.name,
      identifier: mcp.mcpId,
      resourceType: 'mcp' as const,
      organizationName: mcp.organization?.name ?? null,
    })),
  ]

  const typeOptions: Array<{ key: ResourceTypeFilter; label: string }> = [
    { key: 'all', label: '全部授权' },
    { key: 'skill', label: 'Skill 授权' },
    { key: 'mcp', label: 'MCP 授权' },
  ]

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title="授权管理"
        description="管理用户与 Skill / MCP 的映射关系，支持手工授权与及时撤销。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="有效授权" value={totalCount} icon={ShieldCheck} hint="当前未撤销授权" />
        <AdminStatCard label="Skill 授权" value={skillGrantCount} icon={Box} hint="Skill 生命周期授权" />
        <AdminStatCard label="MCP 授权" value={mcpGrantCount} icon={Cpu} hint="MCP 资源访问授权" />
        <AdminStatCard label="涉及用户" value={uniqueUserCount} icon={Users} hint="拥有授权的用户数" />
      </div>

      <GrantCreatePanel
        resources={grantableResources}
        users={grantableUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          organizationName: user.organization?.name ?? null,
        }))}
      />

      <div className="flex flex-wrap gap-2">
        {typeOptions.map((option) => {
          const isActive = option.key === selectedType
          return (
            <Link
              key={option.key}
              href={option.key === 'all' ? '/dashboard/grants' : `/dashboard/grants?resourceType=${option.key}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              {option.key === 'skill' ? <Box className="h-4 w-4" /> : option.key === 'mcp' ? <Cpu className="h-4 w-4" /> : <ShieldPlus className="h-4 w-4" />}
              {option.label}
            </Link>
          )
        })}
      </div>

      {grants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-base font-medium">当前条件下还没有有效授权</p>
            <p className="mt-1 text-sm text-muted-foreground">可以在上方发起手工授权，或者从审核页批准申请。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {grants.map((grant) => {
            const resource = grant.resourceType === 'skill'
              ? skillMap.get(grant.resourceId) ?? null
              : mcpMap.get(grant.resourceId) ?? null

            return (
              <Card key={grant.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="shrink-0 rounded-lg bg-muted p-2.5">
                        {grant.resourceType === 'skill' ? (
                          <Box className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Cpu className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-bold tracking-tight">
                            {resource?.name || '资源已删除'}
                          </h3>
                          <Badge variant={grant.resourceType === 'skill' ? 'outline' : 'secondary'}>
                            {grant.resourceType === 'skill' ? 'Skill' : 'MCP'}
                          </Badge>
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white">已授权</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground font-mono bg-muted/30 w-fit px-1.5 rounded">
                          {resource?.identifier || grant.resourceId}
                        </p>
                      </div>
                    </div>
                    <GrantRevokeButton grantId={grant.id} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">被授权人</p>
                      <p className="mt-1.5 font-medium">{grant.user.name || grant.user.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{grant.user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">用户所属组织</p>
                      <p className="mt-1.5 font-medium">{grant.user.organization?.name || '未分配'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">资源管理归属</p>
                      <p className="mt-1.5 font-medium">{resource?.organization?.name || '未分配'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">生效时间</p>
                      <p className="mt-1.5 font-medium">{formatDate(grant.grantedAt)}</p>
                    </div>
                    <div>
                       <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">授权来源</p>
                       <p className="mt-1.5 font-medium">{grant.sourceApplicationId ? '审批流转' : '手工授权'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">授权操作人</p>
                      <p className="mt-1.5 font-medium">{grant.grantor?.name || grant.grantor?.email || '系统'}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                     <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase mb-1">Authorization Identifier</p>
                     <p className="text-[11px] font-mono text-muted-foreground/60 break-all">{grant.id}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </Main>
  )
}
