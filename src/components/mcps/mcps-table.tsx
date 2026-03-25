'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { McpFormDialog } from './mcp-form-dialog'
import { MCP_TRANSPORT_LABELS, VISIBILITY_LABELS, Visibility } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, PlusCircle, TerminalSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

interface OrganizationOption {
  id: string
  name: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function McpsTable({
  mcps,
  organizations,
  managementMode,
  managedDepartmentId,
  onRefresh,
  pagination,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  mcps: McpRow[]
  organizations: OrganizationOption[]
  managementMode: 'super_admin' | 'department_admin' | 'personal'
  managedDepartmentId: string | null
  onRefresh: () => Promise<void>
  pagination: PaginationInfo
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<McpRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const columns: ColumnDef<McpRow>[] = [
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-900">{row.original.name}</div>
          <div className="text-xs text-slate-500">{row.original.owner?.name ? `维护人：${row.original.owner.name}` : '平台维护'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'mcpId',
      header: 'MCP ID',
      cell: ({ row }) => (
        <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{row.original.mcpId}</code>
      ),
    },
    {
      accessorKey: 'visibility',
      header: '可见性',
      cell: ({ row }) => (
        <Badge variant="outline">{VISIBILITY_LABELS[row.original.visibility]}</Badge>
      ),
    },
    {
      accessorKey: 'transportType',
      header: '传输',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <TerminalSquare className="h-3 w-3" />
          {MCP_TRANSPORT_LABELS[row.original.transportType] ?? row.original.transportType}
        </div>
      ),
    },
    {
      accessorKey: 'command',
      header: '命令',
      cell: ({ row }) => (
        <div className="max-w-[260px]">
          <div className="truncate font-medium text-slate-900">{row.original.command || '未配置'}</div>
          <div className="truncate text-xs text-slate-500">
            {row.original.defaultArgs.length > 0 ? row.original.defaultArgs.join(' ') : '无默认参数'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: '分类',
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">
          {row.original.category}
        </div>
      ),
    },
    {
      accessorKey: 'organization.name',
      header: '所属',
      cell: ({ row }) => row.original.organization?.name || row.original.owner?.name || '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!row.original.canManage) {
          return <span className="text-xs text-muted-foreground">只读</span>
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingMcp(row.original); setOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" />编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                disabled={deletingId === row.original.id}
                onClick={async () => {
                  setDeletingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/mcps/${row.original.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast({ title: 'MCP 已删除' })
                      await onRefresh()
                    } else {
                      const error = await res.json()
                      toast({ title: '错误', description: error.error, variant: 'destructive' })
                    }
                  } catch {
                    toast({ title: '错误', description: '删除失败', variant: 'destructive' })
                  } finally {
                    setDeletingId(null)
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="admin-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">连接列表</div>
          <p className="text-sm leading-6 text-slate-600">用统一字段查看 MCP 资源，方便核对来源、归属和当前管理权限。</p>
        </div>
        <Button onClick={() => { setEditingMcp(null); setOpen(true) }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新建 MCP
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={mcps}
        searchKey="name"
        searchPlaceholder="搜索名称或标识符..."
        pageCount={pagination?.pageCount ?? 1}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination?.total ?? 0}
      />
      <McpFormDialog
        open={open}
        onOpenChange={setOpen}
        mcp={editingMcp}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onSuccess={onRefresh}
      />
    </div>
  )
}
