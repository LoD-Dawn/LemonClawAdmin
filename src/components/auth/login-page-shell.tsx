import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export function LoginSkeleton() {
  return (
    <div className="login-shell flex min-h-screen overflow-hidden">
      <div className="login-grid-overlay absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-6 py-6 sm:px-8 lg:px-10">
        <div className="h-14 w-56 animate-pulse rounded-full bg-white/80" />
        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(360px,480px)_minmax(460px,1fr)] lg:gap-16 lg:py-10">
          <div className="w-full max-w-[460px]">
            <div className="space-y-4">
              <div className="h-8 w-28 animate-pulse rounded-full bg-red-100" />
              <div className="h-20 w-80 animate-pulse rounded-[2rem] bg-white/90" />
              <div className="h-6 w-72 animate-pulse rounded-full bg-white/70" />
            </div>
            <div className="mt-8 max-w-[390px] rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.14)]">
              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-950/10" />
              </div>
            </div>
          </div>

          <div className="hidden min-h-[620px] rounded-[2rem] border border-black/10 bg-white/82 p-12 lg:block">
            <div className="h-full animate-pulse rounded-[1.5rem] bg-slate-100/80" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoginPageShell({
  modeLabel,
  title,
  description,
  showcaseTitle,
  showcaseDescription,
  footerText,
  children,
}: {
  modeLabel: string
  title: string
  description?: string
  showcaseTitle: string
  showcaseDescription?: string
  footerText: string
  children: ReactNode
}) {
  return (
    <div className="login-shell relative min-h-screen overflow-hidden">
      <div className="login-grid-overlay absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/92 px-4 py-2.5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.32)] backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2"
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-[#fff] shadow-[0_16px_24px_-18px_rgba(127,29,29,0.4)]">
              <Image src="/images/Logo.png" alt="LemonClaw logo" fill sizes="40px" className="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">LemonClaw</p>
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium leading-none text-red-800">
                  v0.2.3
                </span>
              </div>
              <p className="text-xs text-slate-500">柠檬虾</p>
            </div>
          </Link>

          <div className="hidden lg:block">
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white/92 px-4 py-2 text-xs font-medium text-slate-600 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.25)]">
              统一认证
            </div>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(360px,480px)_minmax(460px,1fr)] lg:gap-16 lg:py-10">
          <section className="mx-auto w-full max-w-[460px] lg:mx-0">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-red-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.24)]">
                {modeLabel}
              </div>
              <div className="space-y-3">
                <h1 className="font-client-serif text-[3rem] leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-[3.8rem] lg:text-[4.6rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-[30rem] text-base leading-7 text-slate-600 sm:text-lg">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <section className="relative mt-8 max-w-[390px]">
              {children}
            </section>

            <footer className="pt-5 text-left text-[11px] text-slate-400">
              {footerText}
            </footer>
          </section>

          <section className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] border border-black/10 bg-white/82 p-8 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.24)] backdrop-blur lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-red-700" />
              Authentication
            </div>

            <div className="mx-auto flex max-w-[36rem] flex-1 items-center justify-center py-8 text-center">
              <h2 className="font-client-serif text-[4rem] leading-[0.96] tracking-[-0.05em] text-slate-950 xl:text-[5.3rem]">
                {showcaseTitle}
              </h2>
            </div>

            {showcaseDescription ? (
              <p className="max-w-[20rem] text-sm leading-6 text-slate-500">
                {showcaseDescription}
              </p>
            ) : (
              <div />
            )}
          </section>
        </main>

        <footer className="pb-1 text-center text-[11px] text-slate-400 lg:hidden">
          {footerText}
        </footer>
      </div>
    </div>
  )
}
