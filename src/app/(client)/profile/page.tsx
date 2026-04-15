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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PhoneBindingCard } from '@/components/client/phone-binding-card'
import { ProfileSettingsNav } from '@/components/client/profile-settings-nav'
import { ProfileSettingsSection } from '@/components/client/profile-settings-section'
import {
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

function OverviewMetricCard({
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
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            {suffix ? <span className="pb-1 text-sm text-muted-foreground">{suffix}</span> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{note}</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-2.5 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
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
        description: '当前账号拥有管理级权限，不受普通积分配额限制，但仍保留调用记录与消耗统计。',
        badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
        progressClassName: 'bg-amber-500',
        actionHref: '/dashboard',
        actionLabel: '进入管理控制台',
        icon: <Crown className="h-4 w-4" />,
      }
    : user.accountType === 'enterprise'
      ? {
          label: '企业成员',
          note: '当前套餐',
          description: '当前账号通过企业入口使用平台资源，可查看个人额度、组织归属与最近使用情况。',
          badgeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
          progressClassName: 'bg-sky-600',
          actionHref: '/profile',
          actionLabel: '查看个人概览',
          icon: <ShieldCheck className="h-4 w-4" />,
        }
      : {
          label: '免费版',
          note: '当前套餐',
          description: `基础功能已开通，默认赠送 ${SELF_SERVICE_CONSUMER_REGISTRATION_CREDITS} 积分额度，适合普通用户试用。`,
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">个人设置</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          参考 `shadcn-admin` 的 settings 页面重构，统一查看当前账号额度、登录资料、组织身份和最近调用记录。
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="lg:sticky lg:top-6 lg:w-64 lg:self-start">
          <ProfileSettingsNav />
        </aside>

        <div className="min-w-0 flex-1 space-y-10">
          <ProfileSettingsSection
            id="overview"
            eyebrow="Overview"
            title="额度与套餐总览"
            description="这一部分集中展示套餐身份、额度进度和关键使用统计。"
          >
            <Card>
              <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl">{tierMeta.label}</CardTitle>
                    <Badge className={cn('px-2.5 py-0.5', tierMeta.badgeClassName)}>
                      <span className="mr-1 inline-flex">{tierMeta.icon}</span>
                      {tierMeta.note}
                    </Badge>
                  </div>
                  <CardDescription className="max-w-2xl leading-6">
                    {tierMeta.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit">
                  {quotaNote}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>剩余额度</span>
                    {!isUnlimited && quotaCap ? (
                      <span className="font-medium text-foreground">
                        {formatCredits(remainingCredits)} / {formatCredits(quotaCap)} 积分
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">当前账号无限制</span>
                    )}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', tierMeta.progressClassName)}
                      style={{ width: `${quotaProgress}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold tracking-tight text-foreground">
                        {isUnlimited ? '无限制' : formatCredits(remainingCredits)}
                        {!isUnlimited ? (
                          <span className="ml-2 text-base font-medium text-muted-foreground">
                            积分
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">定价版本 {pricingVersion}</p>
                    </div>
                    <Button asChild>
                      <Link href={tierMeta.actionHref}>
                        {tierMeta.actionLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-4">
                    <DetailItem label="账号类型" value={user.accountType === 'enterprise' ? '企业成员' : '普通用户'} />
                    <DetailItem label="组织" value={user.organization?.name ?? '未绑定组织'} />
                    <DetailItem label="部门" value={user.department?.name ?? '无'} />
                    <DetailItem label="创建时间" value={formatDateTime(user.createdAt)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewMetricCard
                label="总会话数"
                value={String(totalSessions)}
                note="当前账号累计完成的调用会话数"
                icon={<UserRound className="h-5 w-5" />}
              />
              <OverviewMetricCard
                label="近 7 日会话"
                value={String(weeklySessions)}
                note={`近 7 日共消耗 ${formatCredits(weeklyConsumedCredits)} 积分`}
                icon={<CalendarClock className="h-5 w-5" />}
              />
              <OverviewMetricCard
                label="今日用量"
                value={isUnlimited ? '无限制' : formatCredits(todayConsumedCredits)}
                suffix={isUnlimited ? undefined : '积分'}
                note={isUnlimited ? '管理席位不受普通积分限制' : '按今日已结束会话计算'}
                icon={<CreditCard className="h-5 w-5" />}
              />
              <OverviewMetricCard
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
            description="参考 settings 的 account/profile 分区，把登录方式和联系资料集中展示。"
          >
            <div className="flex flex-wrap gap-2">
              <Badge
                className={
                  needsPhoneBinding
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }
              >
                {needsPhoneBinding ? '待绑定手机号' : '手机号已绑定'}
              </Badge>
              <Badge variant="outline">
                {user.accountType === 'enterprise' ? '邮箱 + 密码登录' : '手机号 + 验证码登录'}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基本资料</CardTitle>
                  <CardDescription>当前账号的主要识别信息与联系字段。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="姓名" value={user.name ?? '未设置'} />
                  <DetailItem label="邮箱" value={user.email ?? '未设置'} />
                  <DetailItem label="手机号" value={user.phone ?? '未绑定'} />
                  <DetailItem
                    label="登录方式"
                    value={user.accountType === 'enterprise' ? '邮箱 + 密码' : '手机号 + 验证码'}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">登录说明</CardTitle>
                  <CardDescription>当前账号在普通入口或企业入口下的使用规则。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    {user.accountType === 'enterprise'
                      ? '企业成员通过企业入口登录，访问范围由组织、部门和具体授权共同决定。'
                      : '普通用户默认走手机号验证流程，手机号会作为后续登录和安全校验的基础信息。'}
                  </p>
                  <p>
                    {needsPhoneBinding
                      ? '当前账号还需要先完成手机号绑定，绑定成功后工作台限制会自动解除。'
                      : '当前账号已经满足登录校验要求，可以正常继续使用个人工作台。'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="organization"
            eyebrow="Organization"
            title="组织与身份归属"
            description="展示账号归属、管理权限与当前访问范围，便于判断资源可见性和审批路径。"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">组织信息</CardTitle>
                  <CardDescription>当前账号的组织归属和权限级别。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="账号类型" value={user.accountType === 'enterprise' ? '企业成员' : '普通用户'} />
                  <DetailItem
                    label="权限级别"
                    value={
                      user.isSuperAdmin
                        ? '超级管理员'
                        : user.isDepartmentAdmin
                          ? '部门管理员'
                          : '标准使用者'
                    }
                  />
                  <DetailItem label="组织" value={user.organization?.name ?? '未绑定组织'} />
                  <DetailItem label="部门" value={user.department?.name ?? '无'} />
                  <DetailItem label="创建时间" value={formatDateTime(user.createdAt)} />
                  <DetailItem label="用户 ID" value={user.id} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">访问说明</CardTitle>
                  <CardDescription>按当前身份解释资源可见性与额度规则。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    {isUnlimited
                      ? '当前账号拥有管理级权限，平台会记录会话和消耗，但不会按普通积分额度限制访问。'
                      : user.accountType === 'enterprise'
                        ? '企业成员可见资源受组织、部门和资源授权共同控制。'
                        : '普通用户默认进入个人工作台，资源访问以个人额度和已获授权为准。'}
                  </p>
                  <p>
                    部门级资源通常需要审批或授权后才可调用，个人级资源仅所有者可见，组织级资源会在组织树内共享。
                  </p>
                </CardContent>
              </Card>
            </div>
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="security"
            eyebrow="Security"
            title="手机号绑定与安全校验"
            description="保留现有手机号绑定能力，但以标准设置卡片方式接入，不再使用独立的大型视觉模块。"
          >
            {needsPhoneBinding ? (
              <PhoneBindingCard initialPhone={user.phone} required={session.user.requiresPhoneBinding} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">校验通过</CardTitle>
                  <CardDescription>当前账号已经满足普通用户入口所需的手机号校验条件。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="已绑定号码" value={user.phone ?? '未绑定'} />
                  <DetailItem label="状态" value="后续登录默认走手机号 + 验证码流程" />
                </CardContent>
              </Card>
            )}
          </ProfileSettingsSection>

          <ProfileSettingsSection
            id="usage"
            eyebrow="Usage"
            title="最近调用记录"
            description="延续现有调用明细，但用更接近后台 settings 的内容区样式来展示。"
          >
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">最近 8 条已结束会话</CardTitle>
                  <CardDescription>包含模型、时长和最终消耗积分。</CardDescription>
                </div>
                <Badge variant="outline">最近更新</Badge>
              </CardHeader>

              <CardContent className="p-0">
                {recentSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6">消息</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead>模型</TableHead>
                        <TableHead>时长</TableHead>
                        <TableHead className="px-6 text-right">消耗积分</TableHead>
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
                          <TableRow key={sessionItem.id}>
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{sessionLabel || '会话记录'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sessionItem.finishReason || sessionItem.clientSessionId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-sm text-muted-foreground">
                              {formatDateTime(sessionItem.closedAt ?? sessionItem.createdAt)}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{sessionItem.model}</p>
                                <p className="text-xs text-muted-foreground">{sessionItem.provider}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 text-sm text-muted-foreground">
                              {formatDuration(sessionItem.serverAcceptedTotalActiveSeconds)}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right font-medium text-foreground">
                              {formatCredits(sessionItem.finalConsumedCredits)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-medium text-foreground">暂无使用记录</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      所选时间段内无使用记录
                    </p>
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
