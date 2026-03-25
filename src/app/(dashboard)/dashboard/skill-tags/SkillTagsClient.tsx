'use client'

import { useCallback, useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillTagsTable } from '@/components/skill-tags/skill-tags-table'
import type { SkillTagOption } from '@/lib/skill-tags'

type SkillTagRow = SkillTagOption & {
  sortOrder: number
  isActive: boolean
}

export function SkillTagsClient({ initialTags }: { initialTags: SkillTagRow[] }) {
  const [tags, setTags] = useState<SkillTagRow[]>(initialTags)
  const [isLoading, setIsLoading] = useState(false)

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
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return <SkillTagsTable tags={tags} onRefresh={fetchTags} />
}
