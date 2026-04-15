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
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PhoneBindingCard } from '@/components/client/phone-binding-card'
import { ProfileSettingsNav } from '@/components/client/profile-settings-nav'
import { ProfileSettingsSection } from '@/components/client/profile-settings-section'
import { ArrowRight, CalendarClock, Clock3, Crown, CreditCard, ShieldCheck, Sparkles, UserRound, Wallet } from 'lucide-react'

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
    <Card className="rounded-[24px] border-slate-200/80 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.2)]">
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
    redirect('/login/consumer?callbackUrl=%2Fprofile')
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
          actionHref: '/profile',
          actionLabel: '查看个人概览',
          icon: <ShieldCheck className="h-4 w-4" />,
        }
      : {
          label: '免费版',
          note: '当前套餐',
          description: `基础功能已开通，默认赠送 ${SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS} 积分额度，适合体验用户。`,
          badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
          progressClassName: 'bg-slate-900',
          actionHref: '/profile',
          actionLabel: '查看当前额度',
          icon: <Sparkles className="h-4 w-4" />,
        }

  const quotaNote = isUnlimited
    ? '当前账号无限制使用'
    : quotaExpired
      ? '额度已过期，如需继续使用请联系管理员'
      : quota?.expiresAt
        ? `有效期至 ${new Date(quota.expiresAt).toLocaleDateString('zh-CN')}`
        : '当前额度未设置到期时间'
  const needsPhoneBinding = session.user.requiresPhoneBinding || !user.phone

  return (
    <div className="mx-auto max-w-[1380px] space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Client Settings</p>
        <h1 className="font-client-serif text-4xl text-slate-950 sm:text-[2.7rem]">个人设置</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
          用 settings 的结构整理当前账号信息，统一查看额度、组织身份、手机号绑定状态与最近调用记录。
        </p>
      </div>

      <Separator className="bg-slate-200/80" />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <ProfileSettingsNav />
        </aside>

        <div className="space-y-6">
          <ProfileSettingsSection
            id="overview"
            eyebrow="Overview"
            title="额度与套餐总览"
            description="这一部分对齐 settings 首页的核心概览区，保留当前账号的额度进度、套餐身份和关键使用统计。"
          >
            <Card className="rounded-[28px] border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] shadow-none">
              <CardContent className="p-6 sm:p-7">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-client-serif text-3xl text-slate-950">{tierMeta.label}</h3>
                        <Badge className={cn('px-3 py-1', tierMeta.badgeClassName)}>
                          {tierMeta.note}
                        </Badge>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{tierMeta.description}</p>
                    </div>
                    <Badge className="border-slate-200 bg-white/90 px-3 py-1 text-sm text-slate-500">{quotaNote}</Badge>
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
                      <Button asChild className="rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800">
                        <Link href={tierMeta.actionHref}>
                          {tierMeta.actionLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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
            </div>
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="account"
            eyebrow="Account"
            title="登录与联系信息"
            description="参考 settings 的 profile/account 分组，把用户最常查看的登录方式和联系资料集中展示。"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={needsPhoneBinding ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                {needsPhoneBinding ? '待绑定手机号' : '手机号已绑定'}
              </Badge>
              <Badge className="border-slate-200 bg-slate-100 text-slate-600">
                {user.accountType === 'enterprise' ? '邮箱 + 密码登录' : '手机号 + 验证码登录'}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">邮箱</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{user.email}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">邮箱保留为通知与资料字段，可用于接收系统说明和登录辅助信息。</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">手机号</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{user.phone ?? '未绑定'}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {needsPhoneBinding
                    ? '普通用户入口已切换为手机号登录，请先完成绑定后再继续使用工作台。'
                    : '手机号已作为普通用户入口的默认验证方式。'}
                </p>
              </div>
            </div>
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="organization"
            eyebrow="Organization"
            title="组织与身份归属"
            description="展示账号归属、管理权限与当前访问范围，方便判断资源可见性与审批路径。"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <Card className="rounded-[26px] border-slate-200/80 shadow-none">
                <CardContent className="grid gap-4 p-6 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <div className="text-slate-400">姓名</div>
                    <div className="mt-1 font-medium text-slate-950">{user.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">账号类型</div>
                    <div className="mt-1 font-medium text-slate-950">{user.accountType === 'enterprise' ? '企业成员' : '普通用户'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">组织</div>
                    <div className="mt-1 font-medium text-slate-950">{user.organization?.name ?? '未绑定组织'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">部门</div>
                    <div className="mt-1 font-medium text-slate-950">{user.department?.name ?? '无'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">创建时间</div>
                    <div className="mt-1 font-medium text-slate-950">{formatDateTime(user.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">权限级别</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {user.isSuperAdmin ? '超级管理员' : user.isDepartmentAdmin ? '部门管理员' : '标准使用者'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[26px] border-slate-200/80 bg-slate-950 text-white shadow-none">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Access Note</p>
                  <h3 className="mt-3 text-2xl font-semibold">当前访问说明</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {isUnlimited
                      ? '你当前拥有管理级权限，平台仍记录会话和消耗，但不会按普通积分额度进行限制。'
                      : user.accountType === 'enterprise'
                        ? '企业成员的资源可见性受组织、部门和资源授权共同控制。'
                        : '普通用户默认进入个人工作台，资源访问以个人额度和已获授权为准。'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="security"
            eyebrow="Security"
            title="手机号绑定与安全校验"
            description="保留现有绑定能力，但把它并入 settings 的安全分区里，避免独立块状页面割裂。"
          >
            {needsPhoneBinding ? (
              <PhoneBindingCard
                initialPhone={user.phone}
                required={session.user.requiresPhoneBinding}
              />
            ) : (
              <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge className="border-emerald-200 bg-white/85 text-emerald-700">校验通过</Badge>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">手机号已完成绑定</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      当前账号已经具备普通用户入口所需的手机号校验条件。后续登录会默认走手机号 + 验证码流程。
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    已绑定号码：<span className="font-semibold text-slate-950">{user.phone}</span>
                  </div>
                </div>
              </div>
            )}
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="usage"
            eyebrow="Usage"
            title="最近调用记录"
            description="延续原有调用明细，但使用 settings 右侧内容区的单栏展示方式，阅读路径更稳定。"
          >
            <Card className="rounded-[28px] border-slate-200/80 shadow-none">
              <CardContent className="p-0">
                <div className="border-b border-slate-200/80 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">最近 8 条已结束会话</h3>
                      <p className="mt-1 text-sm text-slate-500">包含模型、时长和最终消耗积分。</p>
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
          </ProfileSettingsSection>
        </div>
      </div>
    </div>
  )
}
