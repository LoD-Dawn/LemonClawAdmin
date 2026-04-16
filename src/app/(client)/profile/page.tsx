import type { ComponentType } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PRICING_VERSION,
  getEffectiveUserClawCreditBalance,
  isUserClawQuotaExpired,
  SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS,
} from '@/lib/user-claw-quota-policy'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PhoneBindingCard } from '@/components/client/phone-binding-card'
import {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  History,
  Layers3,
  LogOut,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'

export const runtime = 'nodejs'

function formatCredits(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '暂无记录'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return '0 分钟'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.max(1, Math.round((totalSeconds % 3600) / 60))

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分`
  }

  return `${minutes} 分钟`
}

function DashboardMetricCard({
  label,
  value,
  suffix = '',
  icon: Icon,
  accentClassName,
}: {
  label: string
  value: string | number
  suffix?: string
  icon: ComponentType<{ className?: string }>
  accentClassName: string
}) {
  return (
    <Card className="group relative overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">
            {label}
          </p>
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset bg-slate-50/50 ring-slate-200/60', accentClassName)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </span>
          {suffix ? (
            <span className="text-[12px] font-semibold text-slate-500">
              {suffix}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  unit = '',
  icon: Icon,
  accentClassName,
}: {
  label: string
  value: string | number
  unit?: string
  icon: ComponentType<{ className?: string }>
  accentClassName: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 transition-all duration-300 hover:bg-white hover:shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset', accentClassName)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
        {unit ? (
          <span className="text-[10px] font-semibold text-slate-500">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
      <span className="text-[12px] font-semibold text-slate-600">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login/consumer?callbackUrl=%2Fprofile')
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [user, quota, totalUsage, weeklyUsage, todayUsage, recentSessions] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accountType: true,
        isSuperAdmin: true,
        isDepartmentAdmin: true,
        createdAt: true,
        organization: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
    db.userClawQuota.findUnique({
      where: { userId: session.user.id },
      select: { creditBalance: true, pricingVersion: true, expiresAt: true },
    }),
    db.clawSessionReservation.aggregate({
      where: { userId: session.user.id, closed: true },
      _count: { id: true },
      _sum: { finalConsumedCredits: true },
    }),
    db.clawSessionReservation.aggregate({
      where: { userId: session.user.id, closed: true, closedAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      _sum: { finalConsumedCredits: true },
    }),
    db.clawSessionReservation.aggregate({
      where: { userId: session.user.id, closed: true, closedAt: { gte: todayStart } },
      _count: { id: true },
      _sum: { finalConsumedCredits: true },
    }),
    db.clawSessionReservation.findMany({
      where: { userId: session.user.id, closed: true },
      orderBy: [{ closedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        clientSessionId: true,
        provider: true,
        model: true,
        entry: true,
        workspacePath: true,
        serverAcceptedTotalActiveSeconds: true,
        finalConsumedCredits: true,
        finishReason: true,
        closedAt: true,
        createdAt: true,
      },
    }),
  ])

  if (!user) redirect('/login/consumer?callbackUrl=%2Fprofile')

  const isUnlimited = user.isSuperAdmin || user.isDepartmentAdmin
  const remainingCredits = isUnlimited ? (quota?.creditBalance ?? 0) : getEffectiveUserClawCreditBalance(quota)
  const totalConsumedCredits = totalUsage._sum.finalConsumedCredits ?? 0
  const todayConsumedCredits = todayUsage._sum.finalConsumedCredits ?? 0
  const totalSessions = totalUsage._count.id ?? 0
  const weeklySessions = weeklyUsage._count.id ?? 0
  const todaySessions = todayUsage._count.id ?? 0
  const pricingVersion = quota?.pricingVersion ?? DEFAULT_PRICING_VERSION
  const quotaExpired = !isUnlimited && isUserClawQuotaExpired(quota)

  const quotaCap = isUnlimited
    ? null
    : Math.max(
      SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS,
      (remainingCredits + totalConsumedCredits) || 0,
      quota?.creditBalance ?? 0
    )
  const quotaProgress = quotaCap ? Math.min(100, Math.max(0, (remainingCredits / quotaCap) * 100)) : 100

  const tierMeta = isUnlimited
    ? {
      label: '管理席位',
      actionHref: '/dashboard',
      actionLabel: '进入后台',
    }
    : user.accountType === 'enterprise'
      ? {
        label: '企业成员',
        actionHref: '/profile',
        actionLabel: '查看额度',
      }
      : {
        label: '普通用户',
        actionHref: '/profile',
        actionLabel: '查看额度',
      }

  const quotaNote = isUnlimited
    ? '当前账号无限制使用'
    : quotaExpired
      ? '额度已过期'
      : quota?.expiresAt
        ? `有效期至 ${new Date(quota.expiresAt).toLocaleDateString('zh-CN')}`
        : '当前额度永久有效'

  const needsPhoneBinding = session.user.requiresPhoneBinding || !user.phone
  const displayName = user.name?.trim() || user.email || user.phone || '未命名用户'
  const emailOrPhone = user.email || user.phone || '未设置登录标识'
  const securityLabel = needsPhoneBinding ? '待绑定手机号' : '已完成强验证'

  const metricCards = [
    {
      label: '总会话数',
      value: totalSessions,
      suffix: '次',
      icon: Layers3,
      accentClassName: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    },
    {
      label: '近 7 日会话',
      value: weeklySessions,
      suffix: '次',
      icon: Sparkles,
      accentClassName: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    },
    {
      label: '今日用量',
      value: isUnlimited ? '无限制' : formatCredits(todayConsumedCredits),
      suffix: isUnlimited ? '' : '积分',
      icon: Activity,
      accentClassName: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    },
    {
      label: '剩余额度',
      value: isUnlimited ? '无限制' : formatCredits(remainingCredits),
      suffix: isUnlimited ? '' : '积分',
      icon: Wallet,
      accentClassName: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    },
  ]

  return (
    <div className="relative mx-auto w-full max-w-6xl pb-12 antialiased">
      <div className="space-y-6 px-4 sm:px-0">
        <Card
          id="overview"
          className="overflow-hidden border border-slate-200/50 bg-white shadow-none"
        >
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-bold text-white">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {displayName}
                    </h1>
                    <Badge
                      variant="secondary"
                      className="h-6 rounded-full border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-bold tracking-tight text-slate-700"
                    >
                      {tierMeta.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">{emailOrPhone}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold',
                    needsPhoneBinding
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                  )}
                >
                  <ShieldCheck className={cn('mr-1.5 h-3.5 w-3.5', !needsPhoneBinding && 'text-emerald-600')} />
                  {securityLabel}
                </div>

                <div className="h-6 w-px bg-slate-100 hidden sm:block" />

                <form action="/api/auth/signout" method="POST">
                  <input type="hidden" name="callbackUrl" value="/login" />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-none transition-all hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    退出登录
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((item) => (
            <DashboardMetricCard key={item.label} {...item} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <Card
            id="subscription"
            className="overflow-hidden border border-slate-200 bg-white shadow-sm"
          >
            <CardHeader className="border-b border-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white leading-none">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                    订阅 / 余额
                  </CardTitle>
                </div>

                <Button
                  asChild
                  size="sm"
                  className="h-9 rounded-xl bg-slate-900 font-bold text-xs px-4 shadow-sm hover:bg-slate-800"
                >
                  <Link href={tierMeta.actionHref}>{tierMeta.actionLabel}</Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 p-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        {tierMeta.label}
                      </h2>
                      <Badge className="h-6 rounded-full border border-slate-200 bg-slate-100 px-2.5 text-[10px] font-bold tracking-tight text-slate-700">
                        {pricingVersion}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{quotaNote}</p>
                  </div>

                  <div className="space-y-1 lg:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      可用余额
                    </p>
                    <div className="flex items-baseline gap-2 lg:justify-end">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {isUnlimited ? '∞' : formatCredits(remainingCredits)}
                      </span>
                      {!isUnlimited ? (
                        <span className="text-[11px] font-bold text-slate-500">
                          积分
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
                    使用进度
                  </div>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">
                    {quotaProgress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-700 ease-out"
                    style={{ width: `${quotaProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MiniStat
                  label="今日请求"
                  value={todaySessions}
                  unit="次"
                  icon={History}
                  accentClassName="bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                />
                <MiniStat
                  label="今日消耗"
                  value={isUnlimited ? '∞' : formatCredits(todayConsumedCredits)}
                  unit={isUnlimited ? '' : '积分'}
                  icon={Wallet}
                  accentClassName="bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                />
                <MiniStat
                  label="总计消耗"
                  value={isUnlimited ? '∞' : formatCredits(totalConsumedCredits)}
                  unit={isUnlimited ? '' : '积分'}
                  icon={BadgeCheck}
                  accentClassName="bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white leading-none">
                    <span className="text-xs font-bold select-none">ID</span>
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                    账号详情
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <div className="space-y-1">
                  <DetailRow label="账号类型" value={user.accountType === 'enterprise' ? '企业成员' : '普通用户'} />
                  <DetailRow label="组织名称" value={user.organization?.name || '未绑定组织'} />
                  <DetailRow label="所属部门" value={user.department?.name || '无'} />
                  <DetailRow label="成员权限" value={user.isSuperAdmin ? '超级管理员' : user.isDepartmentAdmin ? '部门管理员' : '标准使用者'} />
                  <DetailRow label="创建时间" value={formatDateTime(user.createdAt)} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500">安全验证</span>
                  <div
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold',
                      needsPhoneBinding
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                    )}
                  >
                    {securityLabel}
                  </div>
                </div>
              </CardContent>
            </Card>

            {needsPhoneBinding ? (
              <PhoneBindingCard initialPhone={user.phone} required={session.user.requiresPhoneBinding} />
            ) : null}
          </div>
        </div>

        <Card
          id="usage"
          className="overflow-hidden border border-slate-200 bg-white shadow-sm"
        >
          <CardHeader className="flex flex-col gap-4 border-b border-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white leading-none">
                <History className="h-5 w-5 fill-current" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                最近调用记录
              </CardTitle>
            </div>
            <Badge className="h-7 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold tracking-widest text-slate-600">
              RECENT 8
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    会话详情
                  </TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    调用时间
                  </TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    模型信息
                  </TableHead>
                  <TableHead className="h-10 px-6 text-right text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    消耗积分
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.length > 0 ? (
                  recentSessions.map((sessionItem) => {
                    const label = sessionItem.workspacePath
                      ? sessionItem.workspacePath.split(/[\\/]/).pop()
                      : sessionItem.entry === 'desktop'
                        ? '桌面端'
                        : '在线调用'

                    return (
                      <TableRow key={sessionItem.id} className="border-slate-200 transition-colors hover:bg-slate-50/50">
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-[14px] font-bold text-slate-900 leading-tight">
                              {label || '会话'}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500">
                              ID: {sessionItem.clientSessionId.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-800">
                              {formatDateTime(sessionItem.closedAt || sessionItem.createdAt)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              时长: {formatDuration(sessionItem.serverAcceptedTotalActiveSeconds)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-900">{sessionItem.model}</p>
                            <div className="flex items-center gap-2">
                              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                {sessionItem.provider}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="text-lg font-bold tracking-tight text-slate-950 tabular-nums">
                            {formatCredits(sessionItem.finalConsumedCredits)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-52 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Clock3 className="h-8 w-8" />
                        <p className="text-[11px] font-bold uppercase tracking-widest underline decoration-slate-200">
                          暂无调用记录
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
