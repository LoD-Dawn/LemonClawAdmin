import Link from 'next/link'
import type { Prisma, ResourceApplicationStatus, ResourceType, Visibility } from '@prisma/client'
import {
  Activity,
  ArrowRight,
  Bot,
  Box,
  Building2,
  Cpu,
  Download,
  KeyRound,
  Layers3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { getManagementMode, getViewableResourceFilter, resolveAdminAccessScope } from '@/lib/admin-access'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { Main } from '@/components/layout/main'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Mode = 'super_admin' | 'department_admin' | 'personal'
type ManagedResourceIds = { skillIds: string[]; mcpIds: string[] }
type TrendPoint = { label: string; skill: number; mcp: number; model: number; total: number }
type SparkPoint = { label: string; value: number }
type QuickAction = { label: string; href: string; description: string; icon: LucideIcon }

const statusMeta: Record<ResourceApplicationStatus, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  approved: { label: '已通过', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  rejected: { label: '已拒绝', className: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  revoked: { label: '已撤销', className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300' },
}

const visibilityMeta: Record<Visibility, { label: string; className: string }> = {
  company: { label: '公共', className: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  department: { label: '部门', className: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  personal: { label: '个人', className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300' },
}

function getModeLabel(mode: Mode) {
  if (mode === 'super_admin') return '超级管理员视图'
  if (mode === 'department_admin') return '部门管理视图'
  return '个人工作台'
}

function getQuickActions(mode: Mode): QuickAction[] {
  if (mode === 'super_admin') {
    return [
      { label: '用户与组织', href: '/dashboard/users', description: '维护成员、组织层级与管理员角色。', icon: Users },
      { label: 'Skill 资产', href: '/dashboard/skills', description: '检查技能上架状态、描述与可见性策略。', icon: Box },
      { label: '模型配置', href: '/dashboard/models', description: '维护模型提供商、默认模型与计费策略。', icon: Bot },
      { label: '授权与审批', href: '/dashboard/approvals', description: '集中处理待审核申请并跟踪授权流转。', icon: ShieldCheck },
    ]
  }
  if (mode === 'department_admin') {
    return [
      { label: '部门申请', href: '/dashboard/approvals', description: '优先处理本部门待审核申请，避免资源阻塞。', icon: ShieldCheck },
      { label: '部门 Skill', href: '/dashboard/skills', description: '维护部门可见 Skill，保持元数据与标签整洁。', icon: Box },
      { label: '部门 MCP', href: '/dashboard/mcps', description: '统一检查连接命令、环境变量与来源配置。', icon: Cpu },
      { label: '部门授权', href: '/dashboard/grants', description: '查看谁已拿到授权，以及授权是否需要回收。', icon: KeyRound },
    ]
  }
  return [
    { label: '我的 Skill', href: '/dashboard/skills', description: '快速查看你维护的 Skill 与最近更新时间。', icon: Box },
    { label: '我的模型', href: '/dashboard/models', description: '维护你自己的模型提供商与默认模型选择。', icon: Bot },
    { label: '我的 MCP', href: '/dashboard/mcps', description: '浏览你的 MCP 连接配置与命令参数。', icon: Cpu },
    { label: '我的授权', href: '/dashboard/grants', description: '查看当前已生效授权与后续可回收项。', icon: KeyRound },
  ]
}

function getDeltaText(current: number, previous: number, suffix: string) {
  const delta = current - previous
  return `${delta > 0 ? '+' : ''}${delta} ${suffix}`
}

function getInitials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.trim()
  return source
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatAbsoluteDate(date: Date) {
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatRelativeTime(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return formatAbsoluteDate(date)
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  next.setHours(0, 0, 0, 0)
  return next
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getWeekKey(date: Date) {
  const start = startOfWeek(date)
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
}

function getRecentMonthBuckets(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    return { key: getMonthKey(date), label: `${date.getMonth() + 1}月`, start: date }
  })
}

function getRecentWeekBuckets(count: number) {
  const currentWeekStart = startOfWeek(new Date())
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(currentWeekStart)
    start.setDate(currentWeekStart.getDate() - (count - 1 - index) * 7)
    return { key: getWeekKey(start), label: `${start.getMonth() + 1}/${start.getDate()}`, start }
  })
}

function createCountMap<T extends { createdAt: Date }>(items: T[], keyGetter: (date: Date) => string) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyGetter(item.createdAt)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

function buildResourceTrend(skills: Array<{ createdAt: Date }>, mcps: Array<{ createdAt: Date }>, models: Array<{ createdAt: Date }>) {
  const months = getRecentMonthBuckets(6)
  const skillMap = createCountMap(skills, getMonthKey)
  const mcpMap = createCountMap(mcps, getMonthKey)
  const modelMap = createCountMap(models, getMonthKey)
  return months.map((month): TrendPoint => {
    const skill = skillMap.get(month.key) ?? 0
    const mcp = mcpMap.get(month.key) ?? 0
    const model = modelMap.get(month.key) ?? 0
    return { label: month.label, skill, mcp, model, total: skill + mcp + model }
  })
}

function buildWeeklyTrend(items: Array<{ createdAt: Date }>) {
  const weeks = getRecentWeekBuckets(8)
  const countMap = createCountMap(items, getWeekKey)
  return weeks.map((week): SparkPoint => ({ label: week.label, value: countMap.get(week.key) ?? 0 }))
}

async function getManagedResourceIds(scopedOrganizationIds: string[]): Promise<ManagedResourceIds> {
  if (scopedOrganizationIds.length === 0) return { skillIds: [], mcpIds: [] }
  const [skills, mcps] = await Promise.all([
    db.skill.findMany({ where: { organizationId: { in: scopedOrganizationIds } }, select: { id: true } }),
    db.mcp.findMany({ where: { organizationId: { in: scopedOrganizationIds } }, select: { id: true } }),
  ])
  return { skillIds: skills.map((item) => item.id), mcpIds: mcps.map((item) => item.id) }
}

function getApplicationScopeWhere(mode: Mode, userId: string, ids: ManagedResourceIds): Prisma.ResourceApplicationWhereInput {
  if (mode === 'super_admin') return {}
  if (mode === 'personal') return { userId }
  const or: Prisma.ResourceApplicationWhereInput[] = []
  if (ids.skillIds.length) or.push({ resourceType: 'skill', resourceId: { in: ids.skillIds } })
  if (ids.mcpIds.length) or.push({ resourceType: 'mcp', resourceId: { in: ids.mcpIds } })
  return or.length ? { OR: or } : { OR: [{ resourceType: 'skill', resourceId: '__forbidden__' }, { resourceType: 'mcp', resourceId: '__forbidden__' }] }
}

function getGrantScopeWhere(mode: Mode, userId: string, ids: ManagedResourceIds): Prisma.ResourceGrantWhereInput {
  if (mode === 'super_admin') return {}
  if (mode === 'personal') return { userId }
  const or: Prisma.ResourceGrantWhereInput[] = []
  if (ids.skillIds.length) or.push({ resourceType: 'skill', resourceId: { in: ids.skillIds } })
  if (ids.mcpIds.length) or.push({ resourceType: 'mcp', resourceId: { in: ids.mcpIds } })
  return or.length ? { OR: or } : { OR: [{ resourceType: 'skill', resourceId: '__forbidden__' }, { resourceType: 'mcp', resourceId: '__forbidden__' }] }
}

function getUserScopeWhere(mode: Mode, userId: string, scopedOrganizationIds: string[]): Prisma.UserWhereInput {
  if (mode === 'super_admin') return { isActive: true }
  if (mode === 'department_admin') return { isActive: true, organizationId: { in: scopedOrganizationIds } }
  return { id: userId }
}

function getOrganizationScopeWhere(mode: Mode, organizationId: string | null, scopedOrganizationIds: string[]): Prisma.OrganizationWhereInput {
  if (mode === 'super_admin') return {}
  if (mode === 'department_admin') return { id: { in: scopedOrganizationIds } }
  return organizationId ? { id: organizationId } : { id: '__forbidden__' }
}

function getReservationScopeWhere(mode: Mode, userId: string, scopedOrganizationIds: string[]): Prisma.ClawSessionReservationWhereInput {
  if (mode === 'super_admin') return {}
  if (mode === 'department_admin') return { user: { is: { organizationId: { in: scopedOrganizationIds } } } }
  return { userId }
}

function getOperationLogScopeWhere(mode: Mode, userId: string, scopedOrganizationIds: string[]): Prisma.OperationLogWhereInput {
  if (mode === 'super_admin') return {}
  if (mode === 'department_admin') {
    return {
      OR: [
        { actorUser: { is: { organizationId: { in: scopedOrganizationIds } } } },
        { targetUser: { is: { organizationId: { in: scopedOrganizationIds } } } },
      ],
    }
  }
  return { OR: [{ actorUserId: userId }, { targetUserId: userId }] }
}

function MetricCard({ label, value, description, delta, icon: Icon }: { label: string; value: string | number; description: string; delta: string; icon: LucideIcon }) {
  return (
    <Card className='overflow-hidden border-border/60 bg-card/95 shadow-sm'>
      <CardContent className='relative p-5'>
        <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent' />
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground'>{label}</p>
            <div className='text-3xl font-semibold tracking-tight'>{value}</div>
            <p className='text-xs leading-5 text-muted-foreground'>{description}</p>
          </div>
          <div className='rounded-2xl border border-border/60 bg-background/80 p-2.5 shadow-sm'>
            <Icon className='h-4 w-4 text-foreground' />
          </div>
        </div>
        <div className='mt-4 inline-flex rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground'>{delta}</div>
      </CardContent>
    </Card>
  )
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center'>
      <p className='text-sm font-medium'>{title}</p>
      <p className='mt-2 text-sm leading-6 text-muted-foreground'>{description}</p>
    </div>
  )
}

function ChartBar({ value, maxValue, className }: { value: number; maxValue: number; className: string }) {
  const pct = maxValue === 0 ? 0 : (value / maxValue) * 100
  return <span className={cn('w-3 rounded-t-[10px]', className)} style={{ height: value === 0 ? '6px' : `${Math.max(pct, 8)}%` }} />
}

function ResourceTrendChart({ data }: { data: TrendPoint[] }) {
  const maxValue = Math.max(...data.map((item) => item.total), 1)
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
        <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100' />Skill</span>
        <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-sky-500' />MCP</span>
        <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-violet-500' />Model</span>
      </div>
      <div className='rounded-3xl border border-border/60 bg-muted/20 p-4'>
        <div className='relative h-72'>
          <div className='absolute inset-0 grid grid-rows-4'>
            {[0, 1, 2, 3].map((line) => <div key={line} className='border-t border-dashed border-border/50 last:border-b' />)}
          </div>
          <div className='relative flex h-full items-end gap-3'>
            {data.map((item) => (
              <div key={item.label} className='flex flex-1 flex-col items-center gap-3'>
                <div className='flex h-full w-full items-end justify-center gap-1.5'>
                  <ChartBar value={item.skill} maxValue={maxValue} className='bg-slate-900/90 dark:bg-slate-100/80' />
                  <ChartBar value={item.mcp} maxValue={maxValue} className='bg-sky-500' />
                  <ChartBar value={item.model} maxValue={maxValue} className='bg-violet-500' />
                </div>
                <div className='space-y-1 text-center'>
                  <p className='text-xs font-medium text-foreground'>{item.label}</p>
                  <p className='text-[11px] text-muted-foreground'>{item.total} 新增</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ApplicationSparkline({ data }: { data: SparkPoint[] }) {
  const width = 360
  const height = 120
  const padding = 12
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const points = data.map((item, index) => {
    const x = padding + index * step
    const y = height - padding - ((item.value / maxValue) * (height - padding * 2) || 0)
    return { ...item, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = points.length ? `M ${points[0].x} ${height - padding} L ${polyline.split(' ').join(' L ')} L ${points[points.length - 1].x} ${height - padding} Z` : ''

  return (
    <div className='rounded-3xl border border-border/60 bg-muted/20 p-4'>
      <svg viewBox={`0 0 ${width} ${height}`} className='h-32 w-full'>
        <defs>
          <linearGradient id='dashboard-sparkline-fill' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='currentColor' stopOpacity='0.22' />
            <stop offset='100%' stopColor='currentColor' stopOpacity='0.01' />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + ((height - padding * 2) / 3) * line
          return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke='currentColor' strokeOpacity='0.08' strokeDasharray='4 6' />
        })}
        {points.length > 0 ? (
          <>
            <path d={area} fill='url(#dashboard-sparkline-fill)' className='text-foreground' />
            <polyline points={polyline} fill='none' stroke='currentColor' strokeWidth='3' className='text-foreground' />
            {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r='4' fill='currentColor' className='text-foreground' />)}
          </>
        ) : null}
      </svg>
      <div className='mt-4 flex justify-between gap-2 text-[11px] text-muted-foreground'>
        {data.map((item) => <span key={item.label} className='truncate'>{item.label}</span>)}
      </div>
    </div>
  )
}

function MiniStat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className='rounded-2xl border border-border/60 bg-background/70 p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <div className='mt-2 text-2xl font-semibold tracking-tight'>{value}</div>
      <p className='mt-1 text-[11px] leading-5 text-muted-foreground'>{hint}</p>
    </div>
  )
}

function DistributionRow({ label, value, total, accent, icon: Icon }: { label: string; value: number; total: number; accent: string; icon: LucideIcon }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className='space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='rounded-2xl border border-border/60 bg-muted/40 p-2'><Icon className='h-4 w-4 text-foreground' /></div>
          <div><p className='text-sm font-medium'>{label}</p><p className='text-xs text-muted-foreground'>{pct}% 占比</p></div>
        </div>
        <div className='text-lg font-semibold'>{value}</div>
      </div>
      <div className='h-2 rounded-full bg-muted'><div className={cn('h-2 rounded-full', accent)} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function ProgressMetric({ label, value, total, accent }: { label: string; value: number; total: number; accent: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className='space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center justify-between gap-3 text-sm'><span className='font-medium'>{label}</span><span className='text-muted-foreground'>{value} / {total}</span></div>
      <div className='h-2 rounded-full bg-muted'><div className={cn('h-2 rounded-full', accent)} style={{ width: `${pct}%` }} /></div>
      <p className='text-xs text-muted-foreground'>{pct}%</p>
    </div>
  )
}

function SnapshotRow({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 p-3'>
      <div className='flex items-center gap-3'><div className='rounded-2xl border border-border/60 bg-muted/40 p-2'><Icon className='h-4 w-4 text-foreground' /></div><span className='text-sm font-medium'>{label}</span></div>
      <span className='text-sm text-muted-foreground'>{value}</span>
    </div>
  )
}

async function getApplicationResourceMap(applications: Array<{ resourceType: ResourceType; resourceId: string }>) {
  const skillIds = applications.filter((item) => item.resourceType === 'skill').map((item) => item.resourceId)
  const mcpIds = applications.filter((item) => item.resourceType === 'mcp').map((item) => item.resourceId)
  const [skills, mcps] = await Promise.all([
    skillIds.length ? db.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true, identifier: true, organization: { select: { name: true } } } }) : Promise.resolve([]),
    mcpIds.length ? db.mcp.findMany({ where: { id: { in: mcpIds } }, select: { id: true, name: true, mcpId: true, organization: { select: { name: true } } } }) : Promise.resolve([]),
  ])
  return new Map<string, { name: string; identifier: string; organizationName: string | null }>([
    ...skills.map((item) => [`skill:${item.id}`, { name: item.name, identifier: item.identifier, organizationName: item.organization?.name ?? null }] as const),
    ...mcps.map((item) => [`mcp:${item.id}`, { name: item.name, identifier: item.mcpId, organizationName: item.organization?.name ?? null }] as const),
  ])
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const mode = getManagementMode(session.user)
  const accessScope = await resolveAdminAccessScope(session.user)
  const scopedOrganizationIds = accessScope.scopedOrganizationIds
  const viewableFilter = getViewableResourceFilter(session.user, { scopedOrganizationIds })
  const skillFilter = viewableFilter as Prisma.SkillWhereInput
  const mcpFilter = viewableFilter as Prisma.McpWhereInput
  const modelProviderFilter = viewableFilter as Prisma.ModelProviderWhereInput
  const managedIds = mode === 'department_admin' ? await getManagedResourceIds(scopedOrganizationIds) : { skillIds: [], mcpIds: [] }
  const appScope = getApplicationScopeWhere(mode, session.user.id, managedIds)
  const grantScope = getGrantScopeWhere(mode, session.user.id, managedIds)
  const userScope = getUserScopeWhere(mode, session.user.id, scopedOrganizationIds)
  const orgScope = getOrganizationScopeWhere(mode, session.user.organizationId ?? null, scopedOrganizationIds)
  const reservationScope = getReservationScopeWhere(mode, session.user.id, scopedOrganizationIds)
  const logScope = getOperationLogScopeWhere(mode, session.user.id, scopedOrganizationIds)

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const sixMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
  const eightWeekStart = getRecentWeekBuckets(8)[0].start

  const [
    userCount,
    orgCount,
    skillCount,
    mcpCount,
    modelCount,
    pendingApplications,
    activeGrants,
    activeSessions,
    monthlyOperations,
    companySkillCount,
    companyMcpCount,
    companyModelCount,
    departmentSkillCount,
    departmentMcpCount,
    departmentModelCount,
    personalSkillCount,
    personalMcpCount,
    personalModelCount,
    recentApplications,
    recentLogs,
    recentSkills,
    recentMcps,
    recentProviders,
    trendSkills,
    trendMcps,
    trendProviders,
    weeklyApplicationsRaw,
  ] = await Promise.all([
    db.user.count({ where: userScope }),
    db.organization.count({ where: orgScope }),
    db.skill.count({ where: { isActive: true, ...skillFilter } }),
    db.mcp.count({ where: { isActive: true, ...mcpFilter } }),
    db.modelProvider.count({ where: { isActive: true, ...modelProviderFilter } }),
    db.resourceApplication.count({ where: { status: 'pending', ...appScope } }),
    db.resourceGrant.count({ where: { revokedAt: null, ...grantScope } }),
    db.clawSessionReservation.count({ where: { closed: false, ...reservationScope } }),
    db.operationLog.count({ where: { createdAt: { gte: currentMonthStart }, ...logScope } }),
    db.skill.count({ where: { ...skillFilter, isActive: true, visibility: 'company' } }),
    db.mcp.count({ where: { ...mcpFilter, isActive: true, visibility: 'company' } }),
    db.modelProvider.count({ where: { ...modelProviderFilter, isActive: true, visibility: 'company' } }),
    db.skill.count({ where: { ...skillFilter, isActive: true, visibility: 'department' } }),
    db.mcp.count({ where: { ...mcpFilter, isActive: true, visibility: 'department' } }),
    db.modelProvider.count({ where: { ...modelProviderFilter, isActive: true, visibility: 'department' } }),
    db.skill.count({ where: { ...skillFilter, isActive: true, visibility: 'personal' } }),
    db.mcp.count({ where: { ...mcpFilter, isActive: true, visibility: 'personal' } }),
    db.modelProvider.count({ where: { ...modelProviderFilter, isActive: true, visibility: 'personal' } }),
    db.resourceApplication.findMany({
      where: appScope,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        user: { select: { name: true, email: true, organization: { select: { name: true } } } },
      },
    }),
    db.operationLog.findMany({
      where: logScope,
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { actorUser: { select: { name: true } }, targetUser: { select: { name: true } } },
    }),
    db.skill.findMany({
      where: { isActive: true, ...skillFilter },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, name: true, identifier: true, visibility: true, createdAt: true, organization: { select: { name: true } } },
    }),
    db.mcp.findMany({
      where: { isActive: true, ...mcpFilter },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, name: true, mcpId: true, visibility: true, createdAt: true, organization: { select: { name: true } } },
    }),
    db.modelProvider.findMany({
      where: { isActive: true, ...modelProviderFilter },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, name: true, providerKey: true, visibility: true, createdAt: true, organization: { select: { name: true } } },
    }),
    db.skill.findMany({ where: { isActive: true, createdAt: { gte: sixMonthStart }, ...skillFilter }, select: { createdAt: true } }),
    db.mcp.findMany({ where: { isActive: true, createdAt: { gte: sixMonthStart }, ...mcpFilter }, select: { createdAt: true } }),
    db.modelProvider.findMany({ where: { isActive: true, createdAt: { gte: sixMonthStart }, ...modelProviderFilter }, select: { createdAt: true } }),
    db.resourceApplication.findMany({ where: { createdAt: { gte: eightWeekStart }, ...appScope }, select: { createdAt: true } }),
  ])

  const appResourceMap = await getApplicationResourceMap(recentApplications)
  const resourceTrend = buildResourceTrend(trendSkills, trendMcps, trendProviders)
  const weeklyTrend = buildWeeklyTrend(weeklyApplicationsRaw)
  const totalResources = skillCount + mcpCount + modelCount
  const latestMonth = resourceTrend[resourceTrend.length - 1]
  const previousMonth = resourceTrend[resourceTrend.length - 2]
  const latestWeek = weeklyTrend[weeklyTrend.length - 1]
  const previousWeek = weeklyTrend[weeklyTrend.length - 2]
  const visibilityRows = [
    { label: '公共可见', value: companySkillCount + companyMcpCount + companyModelCount, accent: 'bg-sky-500' },
    { label: '部门可见', value: departmentSkillCount + departmentMcpCount + departmentModelCount, accent: 'bg-violet-500' },
    { label: '个人私有', value: personalSkillCount + personalMcpCount + personalModelCount, accent: 'bg-zinc-500' },
  ]
  const metrics = mode === 'personal'
    ? [
        { label: '我的资源', value: totalResources, description: `Skill ${skillCount} / MCP ${mcpCount} / Model ${modelCount}`, delta: getDeltaText(latestMonth?.total ?? 0, previousMonth?.total ?? 0, '较上月'), icon: Layers3 },
        { label: '待处理申请', value: pendingApplications, description: '你的申请状态会在这里持续跟踪', delta: getDeltaText(latestWeek?.value ?? 0, previousWeek?.value ?? 0, '较上周'), icon: ShieldCheck },
        { label: '活跃授权', value: activeGrants, description: `当前已生效授权 ${activeGrants} 项`, delta: `${visibilityRows[1].value} 项部门范围资源`, icon: KeyRound },
        { label: '运行中的会话', value: activeSessions, description: `本月累计操作 ${monthlyOperations} 次`, delta: `${orgCount} 个组织上下文`, icon: Activity },
      ]
    : [
        { label: mode === 'super_admin' ? '活跃成员' : '部门成员', value: userCount, description: mode === 'super_admin' ? '全平台已启用账号' : '当前管理范围内的成员数量', delta: `${monthlyOperations} 条本月操作`, icon: Users },
        { label: '可见资源', value: totalResources, description: `Skill ${skillCount} / MCP ${mcpCount} / Model ${modelCount}`, delta: getDeltaText(latestMonth?.total ?? 0, previousMonth?.total ?? 0, '较上月'), icon: Layers3 },
        { label: '待处理申请', value: pendingApplications, description: '待审核授权申请与资源接入请求', delta: getDeltaText(latestWeek?.value ?? 0, previousWeek?.value ?? 0, '较上周'), icon: ShieldCheck },
        { label: '活跃授权', value: activeGrants, description: `当前开放会话 ${activeSessions} 个`, delta: `${orgCount} 个组织节点`, icon: KeyRound },
      ]

  const recentAssets = [
    ...recentSkills.map((item) => ({ kind: 'skill' as const, id: item.id, name: item.name, identifier: item.identifier, visibility: item.visibility, organizationName: item.organization?.name ?? null, createdAt: item.createdAt })),
    ...recentMcps.map((item) => ({ kind: 'mcp' as const, id: item.id, name: item.name, identifier: item.mcpId, visibility: item.visibility, organizationName: item.organization?.name ?? null, createdAt: item.createdAt })),
    ...recentProviders.map((item) => ({ kind: 'model' as const, id: item.id, name: item.name, identifier: item.providerKey, visibility: item.visibility, organizationName: item.organization?.name ?? null, createdAt: item.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8)

  const roleDescription =
    mode === 'super_admin'
      ? '平台总览聚焦资源规模、审批流量与系统活跃度。'
      : mode === 'department_admin'
      ? '这里汇总你负责范围内的资源变化、待办申请与最新活动。'
      : '你的个人工作台聚焦私有资源、授权状态与最近变更。'

  return (
    <Main className='relative space-y-6 overflow-hidden pb-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_right,hsl(var(--foreground)/0.08),transparent_44%)]' />
      <div className='pointer-events-none absolute left-[-6rem] top-28 h-40 w-40 rounded-full bg-[radial-gradient(circle,hsl(var(--foreground)/0.05),transparent_68%)] blur-3xl' />

      <AdminPageHeader
        title='Dashboard'
        description={roleDescription}
        meta={<Badge variant='secondary' className='rounded-full px-3 py-1'>{getModeLabel(mode)}</Badge>}
        actions={<Button asChild size='sm' className='rounded-xl px-4'><Link href='/dashboard/operation-logs'><Download className='mr-2 h-4 w-4' />查看审计</Link></Button>}
      />

      <Tabs defaultValue='overview' className='space-y-5'>
        <div className='overflow-x-auto pb-2'>
          <TabsList className='rounded-xl border border-border/60 bg-background/80 p-1 shadow-sm'>
            <TabsTrigger value='overview' className='rounded-lg'>Overview</TabsTrigger>
            <TabsTrigger value='analytics' className='rounded-lg'>Analytics</TabsTrigger>
            <TabsTrigger value='reports' disabled className='rounded-lg'>Reports</TabsTrigger>
            <TabsTrigger value='notifications' disabled className='rounded-lg'>Notifications</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='overview' className='space-y-5'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
          </div>

          <div className='grid gap-4 xl:grid-cols-7'>
            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader className='flex flex-row items-start justify-between gap-4'>
                <div>
                  <CardTitle>资源增长趋势</CardTitle>
                  <CardDescription>最近 6 个月新增 Skill、MCP 与模型提供商分布。</CardDescription>
                </div>
                <div className='rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-right shadow-sm'>
                  <div className='text-xs text-muted-foreground'>本月新增</div>
                  <div className='text-xl font-semibold tracking-tight'>{latestMonth?.total ?? 0}</div>
                </div>
              </CardHeader>
              <CardContent className='pt-0'><ResourceTrendChart data={resourceTrend} /></CardContent>
            </Card>

            <Card className='xl:col-span-3 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader>
                <CardTitle>最近申请</CardTitle>
                <CardDescription>最近进入当前视图范围的资源申请与审核动态。</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {recentApplications.length === 0 ? (
                  <EmptyPanel title='暂无申请记录' description='新的授权申请出现后，这里会自动展示最新流转情况。' />
                ) : recentApplications.map((application) => {
                  const resource = appResourceMap.get(`${application.resourceType}:${application.resourceId}`)
                  return (
                    <div key={application.id} className='flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3'>
                      <Avatar className='h-10 w-10 border border-border/60'>
                        <AvatarFallback className='bg-muted/70 text-xs'>{getInitials(application.user.name, application.user.email)}</AvatarFallback>
                      </Avatar>
                      <div className='min-w-0 flex-1 space-y-2'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{application.user.name}</p>
                            <p className='truncate text-xs text-muted-foreground'>{application.user.email}</p>
                          </div>
                          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', statusMeta[application.status].className)}>{statusMeta[application.status].label}</span>
                        </div>
                        <div className='rounded-xl bg-muted/40 px-3 py-2'>
                          <p className='truncate text-sm font-medium text-foreground'>{resource?.name ?? '资源已删除'}</p>
                          <p className='mt-1 truncate text-xs text-muted-foreground'>{`${resource?.identifier ?? application.resourceId} · ${resource?.organizationName ?? application.user.organization?.name ?? '未分组'}`}</p>
                        </div>
                        <div className='flex items-center justify-between text-xs text-muted-foreground'>
                          <span>{formatRelativeTime(application.updatedAt)}</span>
                          <span>{application.resourceType.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Button asChild variant='outline' className='w-full justify-between rounded-xl'>
                  <Link href={mode === 'personal' ? '/dashboard/skills' : '/dashboard/approvals'}>查看完整申请列表<ArrowRight className='h-4 w-4' /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 xl:grid-cols-12'>
            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader>
                <CardTitle>申请节奏</CardTitle>
                <CardDescription>最近 8 周申请量变化，便于判断审批压力与资源接入趋势。</CardDescription>
              </CardHeader>
              <CardContent className='space-y-5 pt-0'>
                <ApplicationSparkline data={weeklyTrend} />
                <div className='grid gap-3 sm:grid-cols-3'>
                  <MiniStat label='本周' value={latestWeek?.value ?? 0} hint='最近一周申请数' />
                  <MiniStat label='上周' value={previousWeek?.value ?? 0} hint='用于对比变化' />
                  <MiniStat label='待处理' value={pendingApplications} hint='当前堆积量' />
                </div>
              </CardContent>
            </Card>

            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader>
                <CardTitle>系统活动</CardTitle>
                <CardDescription>最近记录到的后台操作、授权动作与关键配置变更。</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 pt-0'>
                {recentLogs.length === 0 ? <EmptyPanel title='暂无活动日志' description='系统发生新的关键操作后，这里会显示最新记录。' /> : recentLogs.map((log) => (
                  <div key={log.id} className='rounded-2xl border border-border/60 bg-background/70 p-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium'>{log.summary ?? `${log.module} / ${log.action}`}</p>
                        <p className='mt-1 truncate text-xs text-muted-foreground'>{`${log.actorName ?? log.actorUser?.name ?? log.targetUser?.name ?? '系统'} · ${log.module} · ${log.action}`}</p>
                      </div>
                      <span className='shrink-0 text-xs text-muted-foreground'>{formatRelativeTime(log.createdAt)}</span>
                    </div>
                  </div>
                ))}
                <Button asChild variant='outline' className='w-full justify-between rounded-xl'>
                  <Link href='/dashboard/operation-logs'>打开操作审计<ArrowRight className='h-4 w-4' /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader>
                <CardTitle>快捷入口</CardTitle>
                <CardDescription>沿用 shadcn-admin 的信息密度，但内容换成当前平台最常用的管理路径。</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-1'>
                {getQuickActions(mode).map((action) => {
                  const Icon = action.icon
                  return (
                    <Link key={action.label} href={action.href} className='group flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:bg-accent'>
                      <div className='rounded-2xl border border-border/60 bg-muted/40 p-2.5'><Icon className='h-4 w-4 text-foreground' /></div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-sm font-medium'>{action.label}</p>
                          <ArrowRight className='h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                        </div>
                        <p className='mt-1 text-xs leading-5 text-muted-foreground'>{action.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='analytics' className='space-y-5'>
          <div className='grid gap-4 xl:grid-cols-12'>
            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader><CardTitle>资源构成</CardTitle><CardDescription>当前视图下 Skill、MCP 与模型提供商的占比结构。</CardDescription></CardHeader>
              <CardContent className='space-y-4 pt-0'>
                <DistributionRow label='Skill' value={skillCount} total={totalResources} accent='bg-slate-900 dark:bg-slate-100' icon={Box} />
                <DistributionRow label='MCP' value={mcpCount} total={totalResources} accent='bg-sky-500' icon={Cpu} />
                <DistributionRow label='Model' value={modelCount} total={totalResources} accent='bg-violet-500' icon={Bot} />
              </CardContent>
            </Card>

            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader><CardTitle>可见性结构</CardTitle><CardDescription>观察公共、部门、个人资源比例，快速判断资源治理重心。</CardDescription></CardHeader>
              <CardContent className='space-y-4 pt-0'>
                {visibilityRows.map((row) => <ProgressMetric key={row.label} label={row.label} value={row.value} total={Math.max(totalResources, 1)} accent={row.accent} />)}
              </CardContent>
            </Card>

            <Card className='xl:col-span-4 border-border/60 bg-card/95 shadow-sm'>
              <CardHeader><CardTitle>系统快照</CardTitle><CardDescription>用于快速判断当前工作台覆盖范围与运行状态。</CardDescription></CardHeader>
              <CardContent className='space-y-3 pt-0'>
                <SnapshotRow label='组织范围' value={`${orgCount} 个节点`} icon={Building2} />
                <SnapshotRow label='运行中会话' value={`${activeSessions} 个`} icon={Activity} />
                <SnapshotRow label='本月操作' value={`${monthlyOperations} 条`} icon={TrendingUp} />
                <SnapshotRow label='当前模式' value={getModeLabel(mode)} icon={Sparkles} />
              </CardContent>
            </Card>
          </div>

          <Card className='border-border/60 bg-card/95 shadow-sm'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle>最新资源动态</CardTitle>
                <CardDescription>最近创建或更新的 Skill、MCP 与模型提供商清单。</CardDescription>
              </div>
              <Button asChild variant='outline' className='rounded-xl'><Link href='/dashboard/skills'>进入资源管理<ArrowRight className='ml-2 h-4 w-4' /></Link></Button>
            </CardHeader>
            <CardContent className='grid gap-3 pt-0 lg:grid-cols-2'>
              {recentAssets.length === 0 ? <EmptyPanel title='暂无资源更新' description='一旦有新的 Skill、MCP 或模型配置创建，列表会自动出现。' /> : recentAssets.map((asset) => (
                <div key={`${asset.kind}:${asset.id}`} className='rounded-2xl border border-border/60 bg-background/70 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>{asset.kind}</span>
                        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', visibilityMeta[asset.visibility].className)}>{visibilityMeta[asset.visibility].label}</span>
                      </div>
                      <p className='mt-3 truncate text-sm font-medium'>{asset.name}</p>
                      <p className='mt-1 truncate text-xs text-muted-foreground'>{asset.identifier}</p>
                    </div>
                    <span className='shrink-0 text-xs text-muted-foreground'>{formatRelativeTime(asset.createdAt)}</span>
                  </div>
                  <div className='mt-4 flex items-center justify-between text-xs text-muted-foreground'>
                    <span>{asset.organizationName ?? '未分组'}</span>
                    <span>{formatAbsoluteDate(asset.createdAt)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Main>
  )
}
