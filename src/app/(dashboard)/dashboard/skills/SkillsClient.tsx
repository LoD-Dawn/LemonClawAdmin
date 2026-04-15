'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SkillsTable } from '@/components/skills/skills-table'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { SkillFormDialog } from '@/components/skills/skill-form-dialog'
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
  const [open, setOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null)

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
      <div className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const pageTitle = managementMode === 'super_admin'
    ? 'Skills'
    : managementMode === 'department_admin'
    ? '部门 Skills'
    : '我的 Skills'
  const pageDescription = managementMode === 'super_admin'
    ? '集中维护全局 Skill 资产，确保标识符与可见范围一致。'
    : managementMode === 'department_admin'
    ? '查看并维护部门范围内的 Skill 资产。'
    : '浏览你可访问的 Skill 资源汇总。'

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <AdminPageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button onClick={() => { setEditingSkill(null); setOpen(true) }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            新建 Skill
          </Button>
        }
      />
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

      <SkillFormDialog
        open={open}
        onOpenChange={setOpen}
        skill={editingSkill}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onSuccess={fetchSkills}
      />
    </div>
  )
}
