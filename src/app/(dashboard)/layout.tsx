import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { resolveUserLoginEntryMode } from '@/lib/default-organizations'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

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
    <SidebarProvider>
      <Sidebar user={session.user} />
      <SidebarInset>
        <Header user={session.user} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
