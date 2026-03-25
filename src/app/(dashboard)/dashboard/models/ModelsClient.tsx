'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ModelsTable } from '@/components/models/models-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Visibility } from '@/types'

interface ModelItemRow {
  id: string
  modelId: string
  name: string
  supportsImage: boolean
}

interface ModelProviderRow {
  id: string
  providerKey: string
  name: string
  enabled: boolean
  hasApiKey?: boolean
  baseUrl?: string | null
  apiFormat: string
  codingPlanEnabled: boolean
  isDefault: boolean
  defaultModelId?: string | null
  visibility: Visibility
  canManage: boolean
  organization?: { id: string; name: string } | null
  owner?: { id: string; name: string } | null
  models: ModelItemRow[]
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

export function ModelsClient({ initialProviders, initialOrganizations, managementMode, managedDepartmentId, initialPagination }: {
  initialProviders: ModelProviderRow[]
  initialOrganizations: Organization[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  initialPagination: PaginationInfo
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [providers, setProviders] = useState<ModelProviderRow[]>(initialProviders)
  const [organizations] = useState<Organization[]>(initialOrganizations)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const fetchProviders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/models?${params}`)
      const result = await response.json()

      setProviders(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  useEffect(() => {
    setProviders(initialProviders)
  }, [initialProviders])

  useEffect(() => {
    setPagination(initialPagination)
  }, [initialPagination])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/dashboard/models?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(newPageSize))
    params.set('page', '1')
    router.push(`/dashboard/models?${params.toString()}`)
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
    <ModelsTable
      providers={providers}
      organizations={organizations}
      managementMode={managementMode}
      managedDepartmentId={managedDepartmentId}
      onRefresh={fetchProviders}
      pagination={pagination}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
