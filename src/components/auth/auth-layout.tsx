import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type AuthLayoutProps = {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const commandStyle = { '--terminal-width': '23ch' } as CSSProperties

  return (
    <div className="min-h-screen bg-[#fcfcfb] text-neutral-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden min-h-screen overflow-hidden bg-[#09090b] text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(127,29,29,0.22),transparent_38%),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.22))]" />
          <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.72)_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative flex min-h-screen items-center justify-center px-10 py-12 xl:px-14">
            <div className="w-full max-w-[44rem] text-center">
              <div className="mb-6 flex items-center justify-center gap-4">
                <Link href="/" className="contents">
                  <div className="relative h-24 w-24 overflow-hidden rounded-[2rem] bg-white/[0.08] shadow-[0_34px_70px_-42px_rgba(0,0,0,0.82)]">
                    <Image src="/images/Logo.png" alt="LemonClaw" fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[5.25rem] font-semibold tracking-[-0.06em] text-white [text-shadow:0_18px_40px_rgba(255,255,255,0.08)] xl:text-[6rem]">
                      LemonClaw
                    </span>
                    <div className="ml-1 mt-2 flex items-center gap-3">
                      <span className="h-px w-8 bg-white/25" />
                      <span className="text-[0.95rem] font-semibold tracking-[0.18em] text-white/82">
                        柠檬虾
                      </span>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="login-terminal mx-auto mt-10 w-full max-w-[42rem] text-left">
                <div className="login-terminal-header">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="text-[11px] tracking-[0.22em] text-white/45">AUTH TERMINAL</span>
                </div>

                <div className="login-terminal-body">
                  <div className="login-terminal-line">
                    <span className="login-terminal-prompt">admin@lemonclaw</span>
                    <span className="text-white/45">:</span>
                    <span className="text-white">~</span>
                    <span className="text-white/45">$</span>
                    <span className="login-terminal-typing" style={commandStyle}>
                      lc auth login --phone
                    </span>
                  </div>
                  <div className="login-terminal-output login-terminal-output-1">
                    connecting identity gateway...
                  </div>
                  <div className="login-terminal-output login-terminal-output-2">
                    issuing verification code to +86 138••••5678
                  </div>
                  <div className="login-terminal-output login-terminal-output-3">
                    session ready. waiting for user input.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen flex-col bg-[#fcfcfb]">
          <div className="px-6 pb-4 pt-6 sm:px-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-black/10">
                <Image src="/images/Logo.png" alt="LemonClaw logo" fill sizes="36px" className="object-cover" />
              </div>
              <span className="text-base font-semibold text-neutral-950">LemonClaw Admin</span>
            </Link>
          </div>

          <div className="pointer-events-none absolute right-10 top-10 hidden h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-sm text-neutral-500 shadow-sm lg:flex">
            ?
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
            <div className="w-full max-w-[430px]">
              <div className="mb-8 space-y-3 text-center lg:hidden">
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">{title}</h1>
                {subtitle ? (
                  <p className="text-sm leading-6 text-neutral-500">{subtitle}</p>
                ) : null}
              </div>

              {children}

              <p className="mt-6 px-2 text-center text-sm leading-7 text-neutral-500">
                通过登录，您同意我们的{' '}
                <Link
                  href="/terms"
                  className="underline decoration-black/20 underline-offset-4 transition-colors hover:text-red-700"
                >
                  服务条款
                </Link>{' '}
                和{' '}
                <Link
                  href="/privacy"
                  className="underline decoration-black/20 underline-offset-4 transition-colors hover:text-red-700"
                >
                  隐私政策
                </Link>
                。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
