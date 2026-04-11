import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { resolveUserLoginEntryMode } from '@/lib/default-organizations'

export const runtime = 'nodejs'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login/enterprise?callbackUrl=%2Fdashboard')
  }

  if (resolveUserLoginEntryMode(session.user) === 'consumer') {
    redirect('/profile')
  }

  return (
    <div className="admin-app-shell">
      <div className="admin-shell-grid pointer-events-none absolute inset-0" />
      <div className="relative flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
        <Sidebar user={session.user} />
        <div className="admin-main-shell">
          <Header user={session.user} />
          <main className="admin-main-surface">
            <div className="admin-page">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
