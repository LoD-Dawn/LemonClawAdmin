import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GuestPricingGrid } from '@/components/client/guest-pricing-grid'
import { PricingHeaderAuthActions } from '@/components/client/pricing-header-auth-actions'
import {
  BrainCircuit,
  CircuitBoard,
  ExternalLink,
  LogIn,
  Orbit,
  Sparkles,
} from 'lucide-react'

export const runtime = 'nodejs'

const guestModelPills = [
  {
    label: 'DeepSeek-v3.2',
    icon: Sparkles,
    iconClassName: 'text-violet-500',
  },
  {
    label: 'MiniMax-M2.7',
    icon: BrainCircuit,
    iconClassName: 'text-rose-500',
  },
  {
    label: 'Doubao-Seed-2.0-mini',
    icon: CircuitBoard,
    iconClassName: 'text-sky-500',
  },
  {
    label: 'Doubao-Seed-2.0-pro',
    icon: Orbit,
    iconClassName: 'text-amber-500',
  },
] satisfies Array<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconClassName: string
}>

const guestEntryPlans = [
  {
    title: '个人体验版',
    marker: '0',
    unit: '元',
    quota: '新用户 100 积分',
    subtitle: '默认注册即开通',
    description: '默认注册的新用户直接进入个人体验版，用于快速体验平台基础能力。',
    cta: '立即注册',
    href: '/login?callbackUrl=%2Fprofile',
    loginHref: '/login?callbackUrl=%2Fprofile',
    tone: 'default' as const,
    points: ['默认注册的用户就是这个版本', '新用户赠送 100 积分', '限制时间 7 天'],
  },
  {
    title: '个人专业版',
    marker: '10',
    unit: '元',
    quota: '1000 积分',
    subtitle: '长期独立使用',
    description: '适合需要长期稳定使用的个人用户，按积分方案开通后独立生效。',
    cta: '立即购买',
    href: '/login?callbackUrl=%2Fprofile',
    loginHref: '/login?callbackUrl=%2Fclient%3Fpurchase%3Dpersonal-pro',
    purchaseKey: 'personal-pro',
    tone: 'featured' as const,
    points: ['有效期 365 天', '无需订阅，独立使用', '订阅套餐可叠加'],
  },
  {
    title: '专业 Pro 版',
    marker: '50',
    unit: '元',
    quota: '5000 积分',
    subtitle: '更高阶长期方案',
    description: '适合高频使用场景，保留和专业版一致的有效期与叠加方式，但积分档位更高。',
    cta: '立即购买',
    href: '/login?callbackUrl=%2Fprofile',
    loginHref: '/login?callbackUrl=%2Fclient%3Fpurchase%3Dpro',
    purchaseKey: 'pro',
    tone: 'default' as const,
    points: ['有效期 365 天', '无需订阅，独立使用', '订阅套餐可叠加'],
  },
] satisfies Array<{
  title: string
  marker: string
  unit: string
  quota: string
  subtitle: string
  description: string
  cta: string
  href: string
  loginHref: string
  purchaseKey?: string
  tone: 'default' | 'featured'
  points: string[]
}>

function PricingLanding({
  currentUserLabel,
}: {
  currentUserLabel?: string | null
}) {
  const isLoggedIn = Boolean(currentUserLabel)

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-white/75 bg-white/70 px-5 py-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-[#fff] shadow-[0_16px_24px_-18px_rgba(249,115,22,0.85)]">
            <Image
              src="/images/Logo.png"
              alt="LemonClaw logo"
              fill
              priority
              sizes="44px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">LemonClaw</p>
            <p className="text-xs text-slate-500">统一资源入口</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className="rounded-full border border-slate-200 bg-white px-4 text-slate-900 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] hover:bg-white"
            variant="outline"
          >
            <Link href="/client">定价</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full px-4 text-slate-600 hover:bg-white/80">
            <Link href="/docs">
              文档
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {isLoggedIn && currentUserLabel ? (
            <PricingHeaderAuthActions currentUserLabel={currentUserLabel} />
          ) : (
            <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
              <Link href="/login?callbackUrl=%2Fprofile">
                登录
                <LogIn className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <section className="px-2 pb-4 pt-6 text-center sm:px-4 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.42)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            新用户注册，可 0 元获取 100 积分体验
          </div>

          <h1 className="mt-8 font-client-serif text-5xl leading-[1.06] text-slate-950 sm:text-6xl lg:text-[4.7rem]">
            LemonClawAI 加油包
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            充值积分可直接使用国内顶级模型，免配置、更省心。
            <br className="hidden sm:block" />
            LemonClawAI 用户享更大公司折扣优惠，比自己买更划算。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
            {guestModelPills.map((pill) => {
              const Icon = pill.icon

              return (
                <div key={pill.label} className="inline-flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', pill.iconClassName)} />
                  <span>{pill.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <GuestPricingGrid plans={guestEntryPlans} isAuthenticated={isLoggedIn} />
      </section>
    </div>
  )
}

export default async function ClientPage() {
  const session = await auth()
  const currentUserLabel = session?.user?.name || session?.user?.email || null

  return (
    <>
      <PricingLanding currentUserLabel={currentUserLabel} />
    </>
  )
}
