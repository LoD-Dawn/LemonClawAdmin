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
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Crown,
  History,
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

function DashboardMetricCard({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: string | number
  suffix?: string
}) {
  return (
    <Card className="border-none bg-white/50 shadow-none ring-1 ring-slate-200/80 transition-all hover:ring-emerald-200/50 hover:bg-white">
      <CardContent className="p-4 space-y-2.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tighter text-slate-950">{value}</span>
          {suffix && <span className="text-[11px] font-bold text-slate-400 uppercase">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, unit = '', icon: Icon }: { label: string; value: string | number; unit?: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 transition-all hover:border-emerald-200/50 hover:shadow-sm group">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="h-3 w-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black text-slate-950 tracking-tight">{value}</span>
        {unit && <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[11px] font-black text-slate-900 tracking-tight">{value}</span>
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
      description: '拥有管理级权限，不受普通配额限制。',
      actionHref: '/dashboard',
      actionLabel: '进入后台',
    }
    : user.accountType === 'enterprise'
      ? {
        label: '企业成员',
        description: '通过企业入口使用资源。',
        actionHref: '/profile',
        actionLabel: '查看额度',
      }
      : {
        label: '普通用户',
        description: '基础功能已开通。',
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12 font-sans antialiased">
      {/* User Header Card */}
      <Card id="overview" className="border-none shadow-none ring-1 ring-slate-200/80 overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 text-slate-600 font-black text-xl">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-black text-slate-950 leading-none tracking-tight">{user.email}</p>
                <div className="flex items-center gap-2 pt-1.5">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-none h-5 px-1.5 text-[10px] font-black uppercase tracking-wider">
                    {tierMeta.label}
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest">UID: {user.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <input type="hidden" name="callbackUrl" value="/login" />
              <Button type="submit" variant="outline" className="h-9 border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition-all font-black text-[11px] px-4 rounded-xl">
                <LogOut className="h-3.5 w-3.5 mr-2" />
                退出登录
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="总会话数"
          value={totalSessions}
          suffix="次"
        />
        <DashboardMetricCard
          label="近 7 日会话"
          value={weeklySessions}
          suffix="次"
        />
        <DashboardMetricCard
          label="今日用量"
          value={isUnlimited ? '无限制' : formatCredits(todayConsumedCredits)}
          suffix={isUnlimited ? '' : '积分'}
        />
        <DashboardMetricCard
          label="剩余额度"
          value={isUnlimited ? '无限制' : formatCredits(remainingCredits)}
          suffix={isUnlimited ? '' : '积分'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch pt-2">
        {/* Left: Quota Overview */}
        <Card id="subscription" className="lg:col-span-12 xl:col-span-7 border-none shadow-none ring-1 ring-slate-200/80 flex flex-col scroll-mt-20 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-black text-slate-950 uppercase tracking-wide">额度与套餐总览</CardTitle>
                <p className="text-[11px] font-bold text-slate-400">Resource Quota & Subscription</p>
              </div>
            </div>
            <Button asChild size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 font-black rounded-lg text-[11px]">
              <Link href={tierMeta.actionHref}>{tierMeta.actionLabel}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">{tierMeta.label}</h3>
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-none px-2 py-0.5 h-auto text-[10px] font-black">
                    {pricingVersion}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 font-bold">{quotaNote}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">当前余额</p>
                <p className="text-3xl font-black text-slate-950 tracking-tight">
                  {isUnlimited ? '无限制' : formatCredits(remainingCredits)}
                  {!isUnlimited && <span className="text-[11px] font-bold ml-1 text-slate-400 uppercase">Credits</span>}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  Usage Progress
                </div>
                <span className="text-[10px] font-black text-slate-400">
                  {quotaProgress}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  style={{ width: `${quotaProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="今日次数" value={todayUsage._count.id ?? 0} unit="次" icon={History} />
              <MiniStat label="今日用量" value={formatCredits(todayConsumedCredits)} unit="积分" icon={Wallet} />
              <MiniStat label="总计用量" value={formatCredits(totalConsumedCredits)} unit="积分" icon={BadgeCheck} />
            </div>
          </CardContent>
        </Card>

        {/* Right: Identity/Org Info */}
        <Card className="lg:col-span-12 xl:col-span-5 border-none shadow-none ring-1 ring-slate-200/80 flex flex-col bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                <BriefcaseBusiness className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-[13px] font-black text-slate-950 uppercase tracking-wide">组织身份归属</CardTitle>
                <p className="text-[11px] font-bold text-slate-400">Identity & Team</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
              <DetailRow label="账号类型" value={user.accountType === 'enterprise' ? '企业成员' : '普通用户'} />
              <DetailRow label="组织名称" value={user.organization?.name || '未绑定组织'} />
              <DetailRow label="所属部门" value={user.department?.name || '无'} />
              <DetailRow label="成员权限" value={user.isSuperAdmin ? '超级管理员' : user.isDepartmentAdmin ? '部门管理员' : '标准使用者'} />
              <DetailRow label="创建时间" value={formatDateTime(user.createdAt)} />
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck className="h-3.5 w-3.5" />
                安全验证状态
              </div>
              <div className={cn(
                "inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm",
                needsPhoneBinding ? 'bg-amber-100/60 text-amber-700 ring-1 ring-amber-200/50' : 'bg-emerald-500 text-white'
              )}>
                {needsPhoneBinding ? '待绑定手机号' : '已完成强验证'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Section */}
      {needsPhoneBinding && (
        <div className="grid grid-cols-1 gap-6 pt-2">
          <PhoneBindingCard initialPhone={user.phone} required={session.user.requiresPhoneBinding} />
        </div>
      )}

      {/* Usage Logs */}
      <Card id="usage" className="border-none shadow-none ring-1 ring-slate-200/80 overflow-hidden scroll-mt-20 bg-white/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
          <CardTitle className="text-[13px] font-black flex items-center gap-2 text-slate-950 uppercase tracking-wide">
            <History className="h-4 w-4 text-emerald-500" />
            最近调用记录
          </CardTitle>
          <Badge className="bg-slate-950 text-white border-none font-black text-[10px] h-5 px-2">RECENT 8</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="px-5 h-10 font-black text-slate-400 text-[10px] uppercase tracking-widest">会话名称/ID</TableHead>
                <TableHead className="h-10 font-black text-slate-400 text-[10px] uppercase tracking-widest">时间</TableHead>
                <TableHead className="h-10 font-black text-slate-400 text-[10px] uppercase tracking-widest">模型信息</TableHead>
                <TableHead className="px-5 h-10 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">消耗积分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.length > 0 ? (
                recentSessions.map((s) => {
                  const label = s.workspacePath ? s.workspacePath.split(/[\\/]/).pop() : s.entry === 'desktop' ? '桌面端' : '在线调用'
                  return (
                    <TableRow key={s.id} className="border-slate-100 hover:bg-white/80 transition-all duration-200">
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-[13px] tracking-tight">{label || '会话'}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter opacity-70">JSID-{s.clientSessionId.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-[11px] text-slate-500 font-bold">
                        {formatDateTime(s.closedAt || s.createdAt)}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-[11px] leading-tight tracking-tight">{s.model}</span>
                          <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-1 opacity-80">{s.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <span className="font-black text-slate-950 text-[15px] tabular-nums tracking-tight">
                          {formatCredits(s.finalConsumedCredits)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-slate-300">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Clock3 className="h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Active Sessions</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
