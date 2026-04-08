'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UsersTable } from '@/components/users/users-table'
import { Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  accountType: 'consumer' | 'enterprise'
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  isActive: boolean
  departmentId?: string | null
  organization?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  clawQuota?: {
    isUnlimited: boolean
    creditBalance: number
    remainingClawSeconds: number | null
    pricingVersion: string
    expiresAt: string | null
    updatedAt: string
  } | null
  usageSummary: {
    consumedCredits: number
    usedClawSeconds: number
    sessions: number
  }
}

interface Organization {
  id: string
  name: string
  type: string
  path: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function UsersClient({ initialUsers, initialOrganizations, initialPagination, currentUserId }: {
  initialUsers: User[]
  initialOrganizations: Organization[]
  initialPagination: PaginationInfo
  currentUserId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState<User[]>(initialUsers)
  const [organizations] = useState<Organization[]>(initialOrganizations)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/admin/users?${params}`)
      const result = await response.json()

      setUsers(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  useEffect(() => {
    setPagination(initialPagination)
  }, [initialPagination])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/dashboard/users?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(newPageSize))
    params.set('page', '1')
    router.push(`/dashboard/users?${params.toString()}`)
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
    <UsersTable
      users={users}
      organizations={organizations}
      onRefresh={fetchUsers}
      pagination={pagination}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      currentUserId={currentUserId}
    />
  )
}
