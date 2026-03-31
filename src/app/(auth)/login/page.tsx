import { Suspense } from 'react'
import Image from 'next/image'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { ShieldCheck, Sparkles } from 'lucide-react'

const featureList = [
  {
    icon: Sparkles,
    title: '普通用户可直接进入',
    description: '登录后直达资源工作台，没有账号时也能在右侧直接注册。',
  },
  {
    icon: ShieldCheck,
    title: '企业账号统一访问',
    description: '企业成员使用统一账号进入管理工作区，继续处理审批和组织配置。',
  },
]

const highlightPills = [
  '普通用户可在线注册',
  '企业用户统一入口',
]

function LoginSkeleton() {
  return (
    <div className="login-shell flex min-h-screen overflow-hidden">
      <div className="login-grid-overlay absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-5 sm:px-8 lg:h-screen lg:px-10 lg:py-4 xl:px-12">
        <div className="h-14 w-56 animate-pulse rounded-full bg-white/60" />
        <div className="flex flex-1 items-center lg:min-h-0">
          <div className="grid w-full gap-8 lg:grid-cols-[380px_620px] lg:justify-between lg:gap-12 xl:grid-cols-[420px_640px]">
            <div className="hidden animate-pulse space-y-5 lg:block">
              <div className="h-14 w-2/5 rounded-3xl bg-white/70" />
              <div className="h-6 w-2/5 rounded-full bg-white/60" />
              <div className="space-y-3 pt-4">
                <div className="h-24 rounded-[2rem] bg-white/70" />
                <div className="h-24 rounded-[2rem] bg-white/70" />
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.28)] lg:justify-self-end lg:w-full lg:max-w-[640px]">
              <div className="mb-5 h-5 w-32 animate-pulse rounded-full bg-slate-100" />
              <div className="mb-4 h-10 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
              <div className="space-y-3">
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <div className="login-shell relative min-h-screen overflow-hidden">
        <div className="login-grid-overlay absolute inset-0" />
        <div className="login-orb login-orb-primary absolute left-[-7rem] top-[-4rem]" />
        <div className="login-orb login-orb-secondary absolute right-[-8rem] top-24" />
        <div className="login-orb login-orb-accent absolute bottom-[-9rem] left-1/3" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-5 sm:px-8 lg:h-screen lg:px-10 lg:py-3 xl:px-12">
          <header className="flex items-center justify-between gap-4 py-2">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur">
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-[rgb(255,228,196)] shadow-[0_16px_24px_-18px_rgba(249,115,22,0.85)]">
                <Image src="/images/Logo.png" alt="LemonClaw logo" fill sizes="40px" className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">LemonClaw</p>
                <p className="text-xs text-slate-500">统一资源与企业访问入口</p>
              </div>
            </div>

            <div className="hidden rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm text-amber-800 lg:block">
              Dual Entry Access
            </div>
          </header>

          <main className="flex flex-1 items-center py-4 lg:min-h-0 lg:py-3">
            <div className="grid w-full items-center gap-8 lg:grid-cols-[360px_620px] lg:justify-between lg:gap-10 xl:grid-cols-[390px_640px]">
              <section className="space-y-4 lg:max-w-[24rem] lg:justify-self-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.42)] backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    普通用户与企业用户双登录入口
                  </div>

                  <div className="max-w-lg space-y-2.5">
                    <h1 className="font-client-serif text-4xl leading-[1.05] text-slate-950 sm:text-5xl xl:text-[4.15rem]">
                      登录入口
                    </h1>
                    <p className="max-w-md text-[15px] leading-6 text-slate-600">
                      左侧保留最少说明，主要操作集中在右侧，尽量首屏完成登录。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {highlightPills.map((pill) => (
                      <div
                        key={pill}
                        className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.48)]"
                      >
                        {pill}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {featureList.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.title}
                        className="login-info-card flex items-start gap-4 rounded-[2rem] p-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 text-white shadow-[0_16px_30px_-22px_rgba(249,115,22,0.85)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="relative lg:justify-self-end lg:w-full lg:max-w-[640px]">
                <LoginFormClient />
              </section>
            </div>
          </main>

          <footer className="pt-2 text-center text-[11px] text-slate-400 lg:hidden">
            LemonClaw Admin Portal · 普通用户注册与企业访问统一登录页
          </footer>
        </div>
      </div>
    </Suspense>
  )
}
