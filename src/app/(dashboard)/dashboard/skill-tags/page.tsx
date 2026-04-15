import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { SkillTagsClient } from './SkillTagsClient'
import { Main } from '@/components/layout/main'

export default async function SkillTagsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const tags = await db.skillTag.findMany({
    orderBy: [{ sortOrder: 'asc' }, { zh: 'asc' }, { en: 'asc' }],
  })

  const activeCount = tags.filter((tag) => tag.isActive).length

  return (
    <Main className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <SkillTagsClient initialTags={tags} />
    </Main>
  )
}
