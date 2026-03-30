import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PRICING_VERSION,
  SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS,
  getEffectiveUserClawCreditBalance,
  isUserClawQuotaExpired,
} from '@/lib/user-claw-quota-policy'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Clock3,
  Crown,
  CreditCard,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'

export const runtime = 'nodejs'

function formatCredits(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return '暂无记录'
  }

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return '0 分钟'
  }

  if (seconds < 60) {
    return `${seconds} 秒`
  }

  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  return restSeconds > 0 ? `${minutes} 分 ${restSeconds} 秒` : `${minutes} 分钟`
}

function SummaryCard({
  label,
  value,
  suffix,
  note,
  icon,
}: {
  label: string
  value: string
  suffix?: string
  note: string
  icon: React.ReactNode
}) {
  return (
    <Card className="rounded-[24px] border-slate-200/80 bg-white/88 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.28)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-3 flex items-end gap-2">
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
              {suffix ? <span className="pb-1 text-sm text-slate-400">{suffix}</span> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">{icon}</div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">{note}</p>
      </CardContent>
    </Card>
  )
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=%2Fprofile')
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
        accountType: true,
        isSuperAdmin: true,
        isDepartmentAdmin: true,
        createdAt: true,
        organization: {
          select: {
            name: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.userClawQuota.findUnique({
      where: { userId: session.user.id },
      select: {
        creditBalance: true,
        pricingVersion: true,
        expiresAt: true,
      },
    }),
    db.clawSessionReservation.aggregate({
      where: {
        userId: session.user.id,
        closed: true,
      },
      _count: {
        id: true,
      },
      _sum: {
        finalConsumedCredits: true,
      },
    }),
    db.clawSessionReservation.aggregate({
      where: {
        userId: session.user.id,
        closed: true,
        closedAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        finalConsumedCredits: true,
      },
    }),
    db.clawSessionReservation.aggregate({
      where: {
        userId: session.user.id,
        closed: true,
        closedAt: {
          gte: todayStart,
        },
      },
      _sum: {
        finalConsumedCredits: true,
      },
    }),
    db.clawSessionReservation.findMany({
      where: {
        userId: session.user.id,
        closed: true,
      },
      orderBy: [
        {
          closedAt: 'desc',
        },
        {
          updatedAt: 'desc',
        },
      ],
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

  if (!user) {
    redirect('/login?callbackUrl=%2Fprofile')
  }

  const isUnlimited = user.isSuperAdmin || user.isDepartmentAdmin
  const remainingCredits = isUnlimited ? quota?.creditBalance ?? 0 : getEffectiveUserClawCreditBalance(quota)
  const totalConsumedCredits = totalUsage._sum.finalConsumedCredits ?? 0
  const weeklyConsumedCredits = weeklyUsage._sum.finalConsumedCredits ?? 0
  const todayConsumedCredits = todayUsage._sum.finalConsumedCredits ?? 0
  const totalSessions = totalUsage._count.id ?? 0
  const weeklySessions = weeklyUsage._count.id ?? 0
  const pricingVersion = quota?.pricingVersion ?? DEFAULT_PRICING_VERSION
  const quotaExpired = !isUnlimited && isUserClawQuotaExpired(quota)
  const quotaCap = isUnlimited
    ? null
    : Math.max(
        SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS,
        remainingCredits + totalConsumedCredits,
        quota?.creditBalance ?? 0
      )
  const quotaProgress = quotaCap ? Math.min(100, Math.max(0, (remainingCredits / quotaCap) * 100)) : 100
  const tierMeta = isUnlimited
    ? {
        label: '管理席位',
        note: user.isSuperAdmin ? '超级管理员' : '部门管理员',
        description: '当前账号拥有管理特权，使用记录仍会展示，但不受普通积分配额限制。',
        badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
        progressClassName: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500',
        actionHref: '/dashboard',
        actionLabel: '进入管理控制台',
        icon: <Crown className="h-4 w-4" />,
      }
    : user.accountType === 'enterprise'
      ? {
          label: '企业成员',
          note: '当前套餐',
          description: '当前账号通过企业入口使用平台资源，可查看个人额度与最近调用情况。',
          badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
          progressClassName: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400',
          actionHref: '/client',
          actionLabel: '查看资源首页',
          icon: <ShieldCheck className="h-4 w-4" />,
        }
      : {
          label: '免费版',
          note: '当前套餐',
          description: `基础功能已开通，默认赠送 ${SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS} 积分额度，适合体验用户。`,
          badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
          progressClassName: 'bg-slate-900',
          actionHref: '/client',
          actionLabel: '升级套餐',
          icon: <Sparkles className="h-4 w-4" />,
        }

  const quotaNote = isUnlimited
    ? '当前账号无限制使用'
    : quotaExpired
      ? '额度已过期，如需继续使用请联系管理员'
      : quota?.expiresAt
        ? `有效期至 ${new Date(quota.expiresAt).toLocaleDateString('zh-CN')}`
        : '当前额度未设置到期时间'

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <div className="flex items-center">
        <Button
          asChild
          variant="ghost"
          className="h-auto rounded-full px-2 text-slate-500 hover:bg-transparent hover:text-slate-800"
        >
          <Link href="/client">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[30px] border-white/85 bg-white/78 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.28)]">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-client-serif text-3xl text-slate-950 sm:text-[2rem]">{tierMeta.label}</h1>
                    <Badge className="border-slate-200 bg-slate-100 px-3 py-1 text-slate-600">{tierMeta.note}</Badge>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{tierMeta.description}</p>
                </div>
                <Badge className="border-slate-200 bg-white/80 px-3 py-1 text-sm text-slate-500">{quotaNote}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>剩余额度</span>
                  {!isUnlimited && quotaCap ? (
                    <span className="font-medium text-slate-700">
                      {formatCredits(remainingCredits)} / {formatCredits(quotaCap)} 积分
                    </span>
                  ) : (
                    <span className="font-medium text-slate-700">当前账号无限制</span>
                  )}
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', tierMeta.progressClassName)}
                    style={{ width: `${quotaProgress}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-slate-950">
                      {isUnlimited ? '无限制' : formatCredits(remainingCredits)}
                      {!isUnlimited ? <span className="ml-2 text-base font-medium text-slate-400">积分</span> : null}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">定价版本 {pricingVersion}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800">
                      <Link href={tierMeta.actionHref}>
                        {tierMeta.actionLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-2xl border-slate-200 bg-white/90 px-6 text-slate-700 hover:bg-white"
                    >
                      <Link href="/client">资源首页</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="总会话数"
            value={String(totalSessions)}
            note="当前账号累计完成的调用会话数"
            icon={<UserRound className="h-5 w-5" />}
          />
          <SummaryCard
            label="近 7 日会话"
            value={String(weeklySessions)}
            note={`近 7 日共消耗 ${formatCredits(weeklyConsumedCredits)} 积分`}
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <SummaryCard
            label="今日用量"
            value={isUnlimited ? '无限制' : formatCredits(todayConsumedCredits)}
            suffix={isUnlimited ? undefined : '积分'}
            note={isUnlimited ? '管理席位不受普通积分限制' : '按今日已结束会话计算'}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <SummaryCard
            label="剩余额度"
            value={isUnlimited ? '无限制' : formatCredits(remainingCredits)}
            suffix={isUnlimited ? undefined : '积分'}
            note={quotaNote}
            icon={<Wallet className="h-5 w-5" />}
          />
        </section>

        <Card className="rounded-[30px] border-white/85 bg-white/78 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.28)]">
          <CardContent className="p-0">
            <div className="border-b border-slate-200/80 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">调用记录</h2>
                  <p className="mt-1 text-sm text-slate-500">展示最近 8 条已结束会话</p>
                </div>
                <Badge className="border-slate-200 bg-white/80 px-3 py-1 text-slate-500">最近更新</Badge>
              </div>
            </div>

            {recentSessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200/80">
                    <TableHead className="h-12 px-6 text-slate-500">消息</TableHead>
                    <TableHead className="text-slate-500">时间</TableHead>
                    <TableHead className="text-slate-500">模型</TableHead>
                    <TableHead className="text-slate-500">输入/输出</TableHead>
                    <TableHead className="px-6 text-right text-slate-500">消耗积分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((sessionItem) => {
                    const sessionLabel = sessionItem.workspacePath
                      ? sessionItem.workspacePath.split(/[\\/]/).filter(Boolean).pop()
                      : sessionItem.entry === 'desktop'
                        ? '桌面端会话'
                        : '在线调用'

                    return (
                      <TableRow key={sessionItem.id} className="border-slate-100/90">
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{sessionLabel || '会话记录'}</p>
                            <p className="text-xs text-slate-500">{sessionItem.finishReason || sessionItem.clientSessionId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-slate-600">
                          {formatDateTime(sessionItem.closedAt ?? sessionItem.createdAt)}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{sessionItem.model}</p>
                            <p className="text-xs text-slate-500">{sessionItem.provider}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-slate-600">
                          {formatDuration(sessionItem.serverAcceptedTotalActiveSeconds)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-semibold text-slate-900">
                          {formatCredits(sessionItem.finalConsumedCredits)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Clock3 className="h-6 w-6" />
                </div>
                <p className="mt-6 text-2xl font-medium text-slate-950">暂无使用记录</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">所选时间段内无使用记录</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
