import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchAdminUsersPage } from '@/lib/admin-user-quota'
import { UsersClient } from './UsersClient'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { Main } from '@/components/layout/main'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const page = 1
  const pageSize = 10

  const [userPage, organizations, activeCount] = await Promise.all([
    fetchAdminUsersPage({ page, pageSize }),
    db.organization.findMany({ orderBy: { path: 'asc' } }),
    db.user.count({ where: { isActive: true } }),
  ])

  return (
    <Main className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <UsersClient
        initialUsers={userPage.data}
        initialOrganizations={organizations}
        initialPagination={userPage.pagination}
        currentUserId={session.user.id}
      />
    </Main>
  )
}
