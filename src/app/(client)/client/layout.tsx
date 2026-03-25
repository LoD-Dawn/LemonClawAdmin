import { auth } from '@/lib/auth'
import { ClientSidebar } from '@/components/layout/client-sidebar'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-transparent px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 xl:px-6">
        <main className="mx-auto max-w-[1440px]">
          <div className="client-panel min-h-[calc(100vh-1.5rem)] rounded-[24px] border border-white/70 px-4 py-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
            {children}
          </div>
        </main>
      </div>
    )
  }

  const organization = session.user.organizationId
    ? await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <ClientSidebar
          user={{
            ...session.user,
            organizationName: organization?.name ?? null,
          }}
        />
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
