'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SkillsTable } from '@/components/skills/skills-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Visibility } from '@/types'

interface SkillRow {
  id: string
  name: string
  identifier: string
  description?: string | null
  descriptionEn?: string | null
  descriptionZh?: string | null
  tagsJson?: string | null
  packageUrl?: string | null
  version?: string | null
  sourceFrom?: string | null
  sourceUrl?: string | null
  sourceAuthor?: string | null
  visibility: Visibility
  canManage: boolean
  organization?: { id: string; name: string } | null
  owner?: { id: string; name: string } | null
}

interface Organization {
  id: string
  name: string
  path: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function SkillsClient({ initialSkills, initialOrganizations, managementMode, managedDepartmentId, initialPagination }: {
  initialSkills: SkillRow[]
  initialOrganizations: Organization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  initialPagination: PaginationInfo
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [skills, setSkills] = useState<SkillRow[]>(initialSkills)
  const [organizations] = useState<Organization[]>(initialOrganizations)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const fetchSkills = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/skills?${params}`)
      const result = await response.json()

      setSkills(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  useEffect(() => {
    setPagination(initialPagination)
  }, [initialPagination])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/dashboard/skills?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(newPageSize))
    params.set('page', '1')
    router.push(`/dashboard/skills?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
      <SkillsTable
        skills={skills}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onRefresh={fetchSkills}
        pagination={pagination}
        page={page}
        pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
