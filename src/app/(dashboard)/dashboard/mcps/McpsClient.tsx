'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { McpsTable } from '@/components/mcps/mcps-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Visibility } from '@/types'

interface McpRow {
  id: string
  name: string
  mcpId: string
  descriptionZh?: string | null
  descriptionEn?: string | null
  visibility: Visibility
  category: string
  transportType: string
  command: string
  defaultArgs: string[]
  requiredEnvKeys: string[]
  optionalEnvKeys: string[]
  isActive?: boolean
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

export function McpsClient({ initialMcps, initialOrganizations, managementMode, managedDepartmentId, initialPagination }: {
  initialMcps: McpRow[]
  initialOrganizations: Organization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  initialPagination: PaginationInfo
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mcps, setMcps] = useState<McpRow[]>(initialMcps)
  const [organizations] = useState<Organization[]>(initialOrganizations)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const fetchMcps = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/mcps?${params}`)
      const result = await response.json()

      setMcps(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchMcps()
  }, [fetchMcps])

  useEffect(() => {
    setMcps(initialMcps)
  }, [initialMcps])

  useEffect(() => {
    setPagination(initialPagination)
  }, [initialPagination])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/dashboard/mcps?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(newPageSize))
    params.set('page', '1')
    router.push(`/dashboard/mcps?${params.toString()}`)
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
      <McpsTable
        mcps={mcps}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onRefresh={fetchMcps}
        pagination={pagination}
        page={page}
        pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
