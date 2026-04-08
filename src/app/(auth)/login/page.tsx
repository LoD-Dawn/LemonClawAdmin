import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LoginFormClient } from '@/components/auth/login-form-client'

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
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-[#fff] shadow-[0_16px_24px_-18px_rgba(249,115,22,0.85)]">
                <Image src="/images/Logo.png" alt="LemonClaw logo" fill sizes="40px" className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">LemonClaw</p>
                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium leading-none text-orange-700">
                    v0.2.3
                  </span>
                </div>
                <p className="text-xs text-slate-500">柠檬虾</p>
              </div>
            </Link>

            <div className="hidden rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm text-amber-800 lg:block">
              Dual Entry Access
            </div>
          </header>

          <main className="flex flex-1 items-center py-4 lg:min-h-0 lg:py-3">
            <div className="grid w-full items-center gap-8 lg:grid-cols-[360px_620px] lg:justify-between lg:gap-10 xl:grid-cols-[390px_640px]">
              <section className="space-y-6 lg:max-w-[28rem] lg:justify-self-start">
                <div className="space-y-4">
                  <div className="inline-flex rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold tracking-[0.12em] text-slate-800 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.42)] backdrop-blur">
                    LemonClawAI
                  </div>

                  <div className="max-w-xl space-y-3">
                    <h1 className="font-client-serif text-4xl leading-[1.08] text-slate-950 sm:text-5xl xl:text-[3.9rem]">
                      一个7×24小时帮你干活的
                      <br />
                      全场景个人助理 Agent
                    </h1>
                    <div className="space-y-3 pt-2 text-[15px] leading-7 text-slate-700">
                      <p>直接交付结果，从想法到落地</p>
                      <p>本地安全运行，数据留在本地</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/80 bg-white/70 px-6 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.38)] backdrop-blur">
                  <p className="text-lg font-semibold tracking-[0.08em] text-slate-900">
                    7×24小时超级个人助理
                  </p>
                </div>
              </section>

              <section className="relative lg:justify-self-end lg:w-full lg:max-w-[640px]">
                <LoginFormClient />
              </section>
            </div>
          </main>

          <footer className="pt-2 text-center text-[11px] text-slate-400 lg:hidden">
            柠檬虾 LemonClaw · 普通用户验证码与企业账号统一登录页
          </footer>
        </div>
      </div>
    </Suspense>
  )
}
