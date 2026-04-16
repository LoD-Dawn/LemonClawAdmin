'use client'

import { useCallback, useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillTagsTable } from '@/components/skill-tags/skill-tags-table'
import type { SkillTagOption } from '@/lib/skill-tags'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { SkillTagFormDialog } from '@/components/skill-tags/skill-tag-form-dialog'

type SkillTagRow = SkillTagOption & {
  sortOrder: number
  isActive: boolean
}

export function SkillTagsClient({ initialTags }: { initialTags: SkillTagRow[] }) {
  const [tags, setTags] = useState<SkillTagRow[]>(initialTags)
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<SkillTagRow | null>(null)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/skill-tags?includeInactive=true')
      const result = await response.json()
      setTags(result.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setTags(initialTags)
  }, [initialTags])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <AdminPageHeader
        title="标签管理"
        description="集中维护 Skill 标签字典，确保全站标签命名一致与双语映射。"
        actions={
          <Button
            onClick={() => {
              setEditingTag(null)
              setOpen(true)
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            新建标签
          </Button>
        }
      />
      
      <SkillTagsTable tags={tags} onRefresh={fetchTags} />

      <SkillTagFormDialog
        open={open}
        onOpenChange={setOpen}
        tag={editingTag}
        onSuccess={fetchTags}
      />
    </div>
  )
}
