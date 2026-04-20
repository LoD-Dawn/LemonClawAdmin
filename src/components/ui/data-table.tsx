'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getPageNumbers } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, SlidersHorizontal } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  totalCount?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  pageCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [localPagination, setLocalPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  const isServerPaginated =
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof pageCount === 'number' &&
    typeof totalCount === 'number' &&
    typeof onPageChange === 'function' &&
    typeof onPageSizeChange === 'function'

  const resolvedPageSize = isServerPaginated ? pageSize : localPagination.pageSize
  const resolvedPage = isServerPaginated ? page : localPagination.pageIndex + 1

  const table = useReactTable({
    data,
    columns,
    manualPagination: isServerPaginated,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: { pageIndex: resolvedPage - 1, pageSize: resolvedPageSize },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: isServerPaginated ? undefined : setLocalPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isServerPaginated ? undefined : getPaginationRowModel(),
  })

  const visiblePageCount = isServerPaginated ? Math.max(pageCount ?? 1, 1) : Math.max(table.getPageCount(), 1)
  const currentPage = isServerPaginated
    ? Math.min(Math.max(page ?? 1, 1), visiblePageCount)
    : Math.min(table.getState().pagination.pageIndex + 1, visiblePageCount)
  const currentPageSize = isServerPaginated ? (pageSize ?? 10) : table.getState().pagination.pageSize
  const currentTotalCount = isServerPaginated ? (totalCount ?? 0) : table.getFilteredRowModel().rows.length

  React.useEffect(() => {
    if (!isServerPaginated) {
      setLocalPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
    }
  }, [columnFilters, isServerPaginated])

  React.useEffect(() => {
    if (!isServerPaginated && localPagination.pageIndex > visiblePageCount - 1) {
      setLocalPagination((prev) => ({ ...prev, pageIndex: Math.max(visiblePageCount - 1, 0) }))
    }
  }, [isServerPaginated, localPagination.pageIndex, visiblePageCount])

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), visiblePageCount)
    if (isServerPaginated) {
      onPageChange?.(safePage)
      return
    }
    setLocalPagination((prev) => ({ ...prev, pageIndex: safePage - 1 }))
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    if (isServerPaginated) {
      onPageSizeChange?.(nextPageSize)
      return
    }
    setLocalPagination({ pageIndex: 0, pageSize: nextPageSize })
  }

  const renderPageNumbers = () => {
    return getPageNumbers(currentPage, visiblePageCount).map((pageNumber, index) => {
      if (typeof pageNumber !== 'number') {
        return (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
            ...
          </span>
        )
      }

      return (
        <Button
          key={pageNumber}
          type="button"
          variant={currentPage === pageNumber ? 'default' : 'outline'}
          size="sm"
          className="h-8 min-w-8 px-2"
          onClick={() => handlePageChange(pageNumber)}
        >
          <span className="sr-only">跳转到第 {pageNumber} 页</span>
          {pageNumber}
        </Button>
      )
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 min-w-[200px]">
          {searchKey && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
                className="h-8 pl-9"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-8 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                视图
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <EmptyState
                    title="暂无数据"
                    description="没有找到任何记录"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 overflow-hidden px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={String(currentPageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue placeholder={currentPageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm font-medium">每页显示</p>
          <span className="text-sm text-muted-foreground">共 {currentTotalCount} 条</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
          <div className="text-sm font-medium">
            第 {currentPage} / {visiblePageCount} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1}
            >
              <span className="sr-only">首页</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <span className="sr-only">上一页</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {renderPageNumbers()}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= visiblePageCount}
            >
              <span className="sr-only">下一页</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => handlePageChange(visiblePageCount)}
              disabled={currentPage >= visiblePageCount}
            >
              <span className="sr-only">末页</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
