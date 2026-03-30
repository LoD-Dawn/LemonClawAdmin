'use client'

import { usePathname } from 'next/navigation'
import { ClientSidebar } from '@/components/layout/client-sidebar'

interface ClientLayoutShellProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
    organizationName?: string | null
  }
}

export function ClientLayoutShell({ children, user }: ClientLayoutShellProps) {
  const pathname = usePathname()
  const isClientLanding = pathname === '/client'
  const isProfilePage = pathname === '/profile'

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
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
