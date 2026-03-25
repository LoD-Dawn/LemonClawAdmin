import { redirect } from 'next/navigation'
import { Tags, Languages, ToggleRight } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { SkillTagsClient } from './SkillTagsClient'

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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="标签"
        title="标签管理"
        description="集中维护 Skill 标签字典，让新增 Skill 时的标签选择来源统一、命名一致。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="标签总数" value={tags.length} icon={Tags} hint="当前字典条目数" />
        <AdminStatCard label="启用标签" value={activeCount} icon={ToggleRight} tone="emerald" hint="可供 Skill 选择" />
        <AdminStatCard label="双语字段" value="EN / 中文" icon={Languages} tone="sky" hint="前后台命名统一维护" />
      </div>
      <SkillTagsClient initialTags={tags} />
    </div>
  )
}
