'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ModelFormDialog } from './model-form-dialog'
import { VISIBILITY_LABELS, Visibility } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, PlusCircle, ImageIcon, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

export function ModelsTable({
  providers,
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
  providers: ModelProviderRow[]
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
  const [editingProvider, setEditingProvider] = useState<ModelProviderRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const columns: ColumnDef<ModelProviderRow>[] = [
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-900">{row.original.name}</div>
          <div className="text-xs text-slate-500">
            {row.original.owner?.name ? `维护人：${row.original.owner.name}` : '平台维护'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'providerKey',
      header: 'Provider',
      cell: ({ row }) => (
        <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
          {row.original.providerKey}
        </code>
      ),
    },
    {
      accessorKey: 'visibility',
      header: '可见性',
      cell: ({ row }) => <Badge variant="outline">{VISIBILITY_LABELS[row.original.visibility]}</Badge>,
    },
    {
      accessorKey: 'defaultModelId',
      header: '默认模型',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 font-medium text-slate-800">
            {row.original.isDefault ? <Star className="h-3.5 w-3.5 text-amber-500" /> : null}
            {row.original.defaultModelId || row.original.models[0]?.modelId || '-'}
          </div>
          <div className="text-xs text-slate-500">{row.original.models.length} 个模型</div>
        </div>
      ),
    },
    {
      accessorKey: 'apiFormat',
      header: '协议',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium text-slate-800">{row.original.apiFormat}</div>
          <div className="text-xs text-slate-500">{row.original.enabled ? '已启用' : '已停用'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'models',
      header: '能力',
      cell: ({ row }) => {
        const imageCount = row.original.models.filter((model) => model.supportsImage).length

        return (
          <div className="space-y-1">
            <div className="text-sm text-slate-700">{row.original.codingPlanEnabled ? '支持 Coding Plan' : '普通模式'}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ImageIcon className="h-3.5 w-3.5" />
              {imageCount} 个支持图片
            </div>
          </div>
        )
      },
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
              <DropdownMenuItem onClick={() => { setEditingProvider(row.original); setOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive"
                disabled={deletingId === row.original.id}
                onClick={async () => {
                  setDeletingId(row.original.id)
                  try {
                    const res = await fetch(`/api/v1/models/${row.original.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast({ title: '模型提供商已删除' })
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
                <Trash2 className="mr-2 h-4 w-4" />
                删除
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
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">模型配置</div>
          <p className="text-sm leading-6 text-slate-600">
            在同一个视图里维护提供商、默认模型和模型清单，方便直接生成客户端需要的配置结构。
          </p>
        </div>
        <Button onClick={() => { setEditingProvider(null); setOpen(true) }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新建模型提供商
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={providers}
        searchKey="name"
        searchPlaceholder="搜索名称或 Provider Key..."
        pageCount={pagination?.pageCount ?? 1}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        totalCount={pagination?.total ?? 0}
      />
      <ModelFormDialog
        open={open}
        onOpenChange={setOpen}
        provider={editingProvider}
        organizations={organizations}
        managementMode={managementMode}
        managedDepartmentId={managedDepartmentId}
        onSuccess={onRefresh}
      />
    </div>
  )
}
