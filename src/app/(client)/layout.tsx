import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ClientLayoutShell } from '@/components/layout/client-layout-shell'

export const runtime = 'nodejs'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
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

  const organization = session.user.organizationId
    ? await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null

  return (
    <ClientLayoutShell
      user={{
        ...session.user,
        organizationName: organization?.name ?? null,
      }}
    >
      {children}
    </ClientLayoutShell>
  )
}
