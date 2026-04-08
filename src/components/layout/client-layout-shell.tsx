'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { ClientSidebar } from '@/components/layout/client-sidebar'
import { Button } from '@/components/ui/button'

interface ClientLayoutShellProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    phone?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
    organizationName?: string | null
    requiresPhoneBinding?: boolean
  }
}

export function ClientLayoutShell({ children, user }: ClientLayoutShellProps) {
  const pathname = usePathname()
  const isClientLanding = pathname === '/client'
  const isProfilePage = pathname === '/profile'
  const shouldBlockWorkspace = user.accountType === 'consumer' && user.requiresPhoneBinding && !isProfilePage

  if (isClientLanding) {
    return (
      <div className="login-shell relative min-h-screen overflow-hidden">
        <div className="login-grid-overlay absolute inset-0" />
        <div className="login-orb login-orb-primary absolute left-[-7rem] top-[-5rem]" />
        <div className="login-orb login-orb-secondary absolute right-[-9rem] top-28" />
        <div className="login-orb login-orb-accent absolute bottom-[-10rem] left-1/3" />

        <main className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-5 sm:px-8 lg:px-10 lg:py-6 xl:px-12">
          {children}
        </main>
      </div>
    )
  }

  if (isProfilePage) {
    return (
      <div className="login-shell relative min-h-screen overflow-hidden">
        <div className="login-grid-overlay absolute inset-0" />
        <div className="login-orb login-orb-primary absolute left-[-7rem] top-[-5rem]" />
        <div className="login-orb login-orb-secondary absolute right-[-9rem] top-28" />
        <div className="login-orb login-orb-accent absolute bottom-[-10rem] left-1/3" />

        <main className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-8 lg:px-10 lg:py-8 xl:px-12">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <ClientSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="client-workspace"
            className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 xl:px-6"
          >
            <div className="client-panel min-h-[calc(100vh-1.5rem)] rounded-[24px] border border-white/70 px-4 py-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
              {shouldBlockWorkspace ? (
                <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
                  <div className="w-full rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))] p-8 text-center shadow-[0_28px_70px_-48px_rgba(245,158,11,0.45)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">先完成手机号绑定</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                      当前账号是历史普通用户，尚未绑定手机号。根据新的登录规则，绑定成功后才能继续使用普通用户工作台。
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Button asChild className="rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800">
                        <Link href="/profile">前往个人概览绑定手机号</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
