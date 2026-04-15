'use client'

import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { AdminPageHeader } from '@/components/layout/admin-page-header'

type OperationLogRow = {
  id: string
  actorType: 'user' | 'api_key' | 'system'
  actorUserId: string | null
  actorName: string | null
  actorEmail: string | null
  actorClientId: string | null
  targetType: string
  targetId: string | null
  targetName: string | null
  targetUserId: string | null
  module: string
  action: string
  summary: string | null
  method: string | null
  path: string | null
  ipAddress: string | null
  userAgent: string | null
  metadataJson: string | null
  metadata: unknown
  createdAt: string | Date
}

type PaginationInfo = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

const moduleOptions = [
  { value: 'all', label: '全部模块' },
  { value: 'auth', label: '登录认证' },
  { value: 'users', label: '用户管理' },
  { value: 'organizations', label: '组织架构' },
  { value: 'skills', label: 'Skills' },
  { value: 'mcps', label: 'MCPs' },
  { value: 'models', label: '模型管理' },
  { value: 'skill_tags', label: '标签管理' },
  { value: 'applications', label: '申请审批' },
  { value: 'grants', label: '授权管理' },
]

const targetTypeOptions = [
  { value: 'all', label: '全部对象' },
  { value: 'user', label: '账号' },
  { value: 'organization', label: '组织' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'model_provider', label: '模型提供商' },
  { value: 'skill_tag', label: '标签' },
  { value: 'resource_application', label: '申请记录' },
  { value: 'resource_grant', label: '授权记录' },
  { value: 'auth_session', label: '登录会话' },
]

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function renderPageNumbers(page: number, pageCount: number, onPageChange: (nextPage: number) => void) {
  const items: ReactNode[] = []

  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i += 1) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(event) => {
              event.preventDefault()
              onPageChange(i)
            }}
            isActive={i === page}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  items.push(
    <PaginationItem key={1}>
      <PaginationLink
        href="#"
        onClick={(event) => {
          event.preventDefault()
          onPageChange(1)
        }}
        isActive={page === 1}
      >
        1
      </PaginationLink>
    </PaginationItem>
  )

  if (page > 3) {
    items.push(<PaginationEllipsis key="start-ellipsis" />)
  }

  for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i += 1) {
    items.push(
      <PaginationItem key={i}>
        <PaginationLink
          href="#"
          onClick={(event) => {
            event.preventDefault()
            onPageChange(i)
          }}
          isActive={i === page}
        >
          {i}
        </PaginationLink>
      </PaginationItem>
    )
  }

  if (page < pageCount - 2) {
    items.push(<PaginationEllipsis key="end-ellipsis" />)
  }

  items.push(
    <PaginationItem key={pageCount}>
      <PaginationLink
        href="#"
        onClick={(event) => {
          event.preventDefault()
          onPageChange(pageCount)
        }}
        isActive={page === pageCount}
      >
        {pageCount}
      </PaginationLink>
    </PaginationItem>
  )

  return items
}

export function OperationLogsClient({
  initialLogs,
  initialPagination,
  initialFilters,
}: {
  initialLogs: OperationLogRow[]
  initialPagination: PaginationInfo
  initialFilters: {
    search: string
    module: string
    targetType: string
  }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<OperationLogRow[]>(initialLogs)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [searchDraft, setSearchDraft] = useState(initialFilters.search)
  const [moduleDraft, setModuleDraft] = useState(initialFilters.module)
  const [targetTypeDraft, setTargetTypeDraft] = useState(initialFilters.targetType)

  const page = Math.max(parseInt(searchParams.get('page') || String(initialPagination.page), 10), 1)
  const pageSize = Math.max(parseInt(searchParams.get('pageSize') || String(initialPagination.pageSize), 10), 1)
  const search = searchParams.get('search') || initialFilters.search
  const moduleFilter = searchParams.get('module') || initialFilters.module
  const targetType = searchParams.get('targetType') || initialFilters.targetType

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        module: moduleFilter,
        targetType,
      })

      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/v1/admin/operation-logs?${params.toString()}`)
      const result = await response.json()

      setLogs(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [moduleFilter, page, pageSize, search, targetType])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    setPagination(initialPagination)
  }, [initialPagination])

  useEffect(() => {
    setSearchDraft(search)
    setModuleDraft(moduleFilter)
    setTargetTypeDraft(targetType)
  }, [moduleFilter, search, targetType])

  const pushWithParams = useCallback((updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    router.push(`/dashboard/operation-logs?${params.toString()}`)
  }, [router, searchParams])

  const handlePageChange = (nextPage: number) => {
    pushWithParams((params) => {
      params.set('page', String(nextPage))
    })
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    pushWithParams((params) => {
      params.set('pageSize', String(nextPageSize))
      params.set('page', '1')
    })
  }

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    pushWithParams((params) => {
      params.set('page', '1')
      params.set('module', moduleDraft)
      params.set('targetType', targetTypeDraft)

      if (searchDraft.trim()) {
        params.set('search', searchDraft.trim())
      } else {
        params.delete('search')
      }
    })
  }

  const visiblePageCount = Math.max(pagination.pageCount, 1)
  const hasLogs = logs.length > 0
  const totalLabel = useMemo(() => `${pagination.total} 条记录`, [pagination.total])

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      <AdminPageHeader
        title="操作日志"
        description="追溯全站关键配置变更、登录会话与资源授权，确保审计链条完整。"
      />

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <form className="flex flex-col gap-4" onSubmit={handleFilterSubmit}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="搜索账号、对象、动作"
                className="pl-11 h-10"
              />
            </div>
            <Select value={moduleDraft} onValueChange={setModuleDraft}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="全部模块" />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetTypeDraft} onValueChange={setTargetTypeDraft}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="全部对象" />
              </SelectTrigger>
              <SelectContent>
                {targetTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="h-10">应用筛选</Button>
          </div>
        </form>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="w-[180px]">最后操作时间</TableHead>
              <TableHead className="w-[200px]">操作账号</TableHead>
              <TableHead className="w-[180px]">模块 / 动作</TableHead>
              <TableHead className="w-[200px]">操作对象</TableHead>
              <TableHead>摘要说明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasLogs ? (
              logs.map((log) => (
                <TableRow key={log.id} className="group">
                  <TableCell className="align-top py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{formatDate(log.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">{log.ipAddress || 'IP 未记录'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="space-y-2">
                      <div className="flex">
                        <Badge variant={log.actorType === 'user' ? 'default' : log.actorType === 'api_key' ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1">
                          {log.actorType === 'user' ? '账号' : log.actorType === 'api_key' ? 'API Key' : '系统'}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{log.actorName || log.actorEmail || '未知操作方'}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{log.actorEmail || log.actorClientId || '-'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="space-y-2">
                      <div className="flex">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{moduleOptions.find((option) => option.value === log.module)?.label || log.module}</Badge>
                      </div>
                      <div className="font-medium text-foreground text-sm">{log.action}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground text-sm line-clamp-1">{log.targetName || log.targetId || '未命名对象'}</div>
                      <div className="text-xs text-muted-foreground">
                        {targetTypeOptions.find((option) => option.value === log.targetType)?.label || log.targetType}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="space-y-1">
                      <div className="text-sm text-foreground leading-relaxed">{log.summary || '无补充说明'}</div>
                      {log.userAgent ? <div className="text-xs text-muted-foreground line-clamp-1 opacity-50 group-hover:opacity-100 transition-opacity">UA: {log.userAgent}</div> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-20">
                  <EmptyState
                    title="暂无操作日志"
                    description="当前筛选条件下没有找到任何日志记录，可以调整关键词或模块后再试。"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-4 border-t px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground">
            第 <span className="font-medium text-foreground">{pagination.page}</span> / {visiblePageCount} 页，共 {pagination.total} 条记录
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">每页显示</span>
              <Select value={String(pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                <SelectTrigger className="h-8 w-[76px] text-xs">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Pagination className="mx-0 w-auto justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (pagination.page > 1) handlePageChange(pagination.page - 1)
                    }}
                    className={pagination.page <= 1 ? 'pointer-events-none opacity-50 h-8 px-2' : 'h-8 px-2'}
                  />
                </PaginationItem>
                {renderPageNumbers(pagination.page, visiblePageCount, handlePageChange)}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (pagination.page < visiblePageCount) handlePageChange(pagination.page + 1)
                    }}
                    className={pagination.page >= visiblePageCount ? 'pointer-events-none opacity-50 h-8 px-2' : 'h-8 px-2'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  )
}
